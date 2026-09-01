"""
identity_check_model.py - High-Accuracy Facial Identity Verification Model.

================================================================================
ARCHITECTURE & SEPARATION OF CONCERNS:
================================================================================
This module handles BIOMETRIC IDENTITY VERIFICATION (1:1 Face Matching).
- Generates 512-dimensional facial recognition embeddings using InceptionResnetV1
  (pretrained on VGGFace2) combined with MTCNN for high-precision face localization
  and landmark alignment.
- Computes Cosine Similarity between a reference enrolled face and runtime test frames.
- Robust multi-scale preprocessing with contrast normalization and fallback detection.
- Decoupled from proctoring_model.py (which handles presence detection).
- In-memory processing: zero persistent biometric image storage.
================================================================================
"""

import argparse
import base64
import io
import json
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import cv2
import numpy as np
import torch
from facenet_pytorch import MTCNN, InceptionResnetV1
from PIL import Image, ImageEnhance, ImageOps

# Global singletons for lazy-loaded identity verification models
_DEVICE = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
_MTCNN_DETECTOR: Optional[MTCNN] = None
_FACENET_EMBEDDER: Optional[InceptionResnetV1] = None


def get_identity_models() -> Tuple[MTCNN, InceptionResnetV1]:
    """
    Lazily initializes and caches the MTCNN face detector and FaceNet embedder.
    """
    global _MTCNN_DETECTOR, _FACENET_EMBEDDER
    if _MTCNN_DETECTOR is None or _FACENET_EMBEDDER is None:
        # MTCNN for face detection, cropping, and landmark alignment
        _MTCNN_DETECTOR = MTCNN(
            image_size=160,
            margin=14,
            min_face_size=20,
            thresholds=[0.5, 0.6, 0.6],  # Relaxed thresholds for reliable real-world capture
            factor=0.709,
            keep_all=False,  # Returns the primary/highest probability face
            device=_DEVICE,
            post_process=True,
        )
        # Pretrained Inception-ResNet-v1 on VGGFace2 (512-dim embedding)
        _FACENET_EMBEDDER = InceptionResnetV1(pretrained="vggface2").eval().to(_DEVICE)

    return _MTCNN_DETECTOR, _FACENET_EMBEDDER


def _load_image_as_pil(image_input: Union[str, Path, np.ndarray, Image.Image, bytes, Any]) -> Image.Image:
    """
    Converts any input format (Base64 URI, raw base64, bytes, NumPy array, URL, or PIL Image)
    into a standard RGB PIL Image strictly in memory.
    """
    if isinstance(image_input, Image.Image):
        return image_input.convert("RGB")
    
    if isinstance(image_input, (bytes, bytearray)):
        return Image.open(io.BytesIO(image_input)).convert("RGB")

    if isinstance(image_input, np.ndarray):
        # Handle OpenCV BGR -> RGB or grayscale
        if len(image_input.shape) == 2:
            return Image.fromarray(image_input).convert("RGB")
        elif image_input.shape[2] == 3:
            return Image.fromarray(image_input[:, :, ::-1]).convert("RGB")
        elif image_input.shape[2] == 4:
            return Image.fromarray(image_input[:, :, [2, 1, 0, 3]]).convert("RGB")
        return Image.fromarray(image_input).convert("RGB")

    if isinstance(image_input, (str, Path)):
        str_path = str(image_input).strip()

        # Handle Base64 Data URI or raw base64
        if str_path.startswith("data:image") or ";base64," in str_path:
            base64_data = str_path.split(";base64,")[-1]
            image_bytes = base64.b64decode(base64_data)
            return Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Handle pure base64 strings
        if len(str_path) > 200 and not str_path.startswith(("http://", "https://", "/", "C:", "D:")):
            try:
                image_bytes = base64.b64decode(str_path)
                return Image.open(io.BytesIO(image_bytes)).convert("RGB")
            except Exception:
                pass

        # Handle Web URLs
        if str_path.startswith(("http://", "https://")):
            req = urllib.request.Request(
                str_path,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                image_bytes = resp.read()
            return Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Local file path
        return Image.open(str_path).convert("RGB")

    raise ValueError(f"Unsupported image input type for identity verification: {type(image_input)}")


def extract_face_embedding(
    image_path_or_array: Union[str, Path, np.ndarray, Image.Image, Any]
) -> Optional[np.ndarray]:
    """
    Detects a face in the input image and generates a 512-dimensional normalized embedding vector.
    Uses multi-stage adaptive enhancement if initial detection on raw frame fails.
    """
    mtcnn, embedder = get_identity_models()
    try:
        pil_img = _load_image_as_pil(image_path_or_array)
    except Exception as exc:
        print(f"[IdentityModel] Failed to load image: {exc}")
        return None

    # Stage 1: Standard MTCNN inference
    face_tensor = mtcnn(pil_img)
    
    # Stage 2: Adaptive contrast normalization retry if dim/harsh lighting
    if face_tensor is None:
        try:
            # Auto-equalize and slight contrast boost for webcam frames
            enhanced = ImageOps.autocontrast(pil_img, cutoff=2)
            face_tensor = mtcnn(enhanced)
        except Exception:
            pass

    # Stage 3: Fallback crop detection via OpenCV Haar Cascade if MTCNN still misses
    if face_tensor is None:
        try:
            cv_img = np.array(pil_img)
            gray = cv2.cvtColor(cv_img, cv2.COLOR_RGB2GRAY)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.15, minNeighbors=4, minSize=(30, 30))
            if len(faces) > 0:
                # Pick largest face
                faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
                x, y, w, h = faces[0]
                # Add margin
                pad_x = int(w * 0.15)
                pad_y = int(h * 0.15)
                x1 = max(0, x - pad_x)
                y1 = max(0, y - pad_y)
                x2 = min(cv_img.shape[1], x + w + pad_x)
                y2 = min(cv_img.shape[0], y + h + pad_y)
                
                cropped_face = pil_img.crop((x1, y1, x2, y2)).resize((160, 160))
                # Convert to normalized PyTorch tensor (-1 to 1)
                np_face = np.array(cropped_face).astype(np.float32)
                tensor_face = torch.tensor(np_face).permute(2, 0, 1)
                tensor_face = (tensor_face - 127.5) / 128.0
                face_tensor = tensor_face
        except Exception:
            pass

    if face_tensor is None:
        return None

    # Ensure batch dimension (1, 3, 160, 160)
    if len(face_tensor.shape) == 3:
        face_tensor = face_tensor.unsqueeze(0)
    face_tensor = face_tensor.to(_DEVICE)

    with torch.no_grad():
        embedding_tensor = embedder(face_tensor)
        # L2-normalize the embedding vector
        embedding_tensor = torch.nn.functional.normalize(embedding_tensor, p=2, dim=1)
        embedding_np = embedding_tensor.squeeze(0).cpu().numpy()

    return embedding_np


def compute_cosine_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
    """
    Computes cosine similarity between two normalized face embeddings.
    """
    norm1 = np.linalg.norm(embedding1)
    norm2 = np.linalg.norm(embedding2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(embedding1, embedding2) / (norm1 * norm2))


def enroll_face(
    reference_image: Union[str, Path, np.ndarray, Image.Image, Any]
) -> np.ndarray:
    """
    Enrolls a candidate's face from a baseline reference photo.
    """
    embedding = extract_face_embedding(reference_image)
    if embedding is None:
        raise ValueError("Enrollment failed: No face could be detected in the reference photo. Ensure proper lighting and face alignment.")
    return embedding


def verify_face(
    current_image: Union[str, Path, np.ndarray, Image.Image, Any],
    reference_embedding: Union[np.ndarray, List[float], Any],
    threshold: float = 0.6,
) -> Dict[str, Any]:
    """
    Verifies whether the person in current_image matches the enrolled reference embedding.
    """
    if reference_embedding is None:
        return {
            "match": False,
            "similarity": 0.0,
            "threshold": threshold,
            "face_detected": False,
            "message": "Missing reference face embedding.",
        }

    ref_emb = np.array(reference_embedding, dtype=np.float32)
    current_emb = extract_face_embedding(current_image)

    if current_emb is None:
        return {
            "match": False,
            "similarity": 0.0,
            "threshold": threshold,
            "face_detected": False,
            "message": "No face detected in the current verification frame. Ensure you are directly facing the camera with good lighting.",
        }

    raw_similarity = compute_cosine_similarity(ref_emb, current_emb)
    similarity = round(raw_similarity, 4)
    match = bool(similarity >= threshold)

    return {
        "match": match,
        "similarity": similarity,
        "threshold": threshold,
        "face_detected": True,
        "confidence_percentage": f"{max(0.0, similarity * 100):.1f}%",
        "verdict": "Identity Confirmed (Authenticated Match)" if match else "Identity Mismatch (Unauthorized Person)",
    }


def run_test_suite() -> None:
    """
    Runs benchmark face verification evaluation.
    """
    print("=" * 80)
    print("IDENTITY VERIFICATION MODEL TEST SUITE (FaceNet VGGFace2 Embeddings)")
    print("=" * 80)
    get_identity_models()
    print("Models initialized successfully.\n")

    samples = [
        {
            "id": "A",
            "name": "Person 1 - Photo A (Enrollment Baseline)",
            "url": "https://raw.githubusercontent.com/davidsandberg/facenet/master/data/images/Anthony_Hopkins_0001.jpg",
        },
        {
            "id": "B",
            "name": "Person 1 - Photo B (Same Person Verification)",
            "url": "https://raw.githubusercontent.com/davidsandberg/facenet/master/data/images/Anthony_Hopkins_0002.jpg",
        },
        {
            "id": "C",
            "name": "Person 2 - Photo C (Different Person)",
            "url": "https://raw.githubusercontent.com/davidsandberg/facenet/master/data/images/Colin_Powell_0001.jpg",
        },
    ]

    print("--- STEP 1: ENROLLMENT ---")
    ref_emb = enroll_face(samples[0]["url"])
    print(f"Enrolled Person 1 successfully! Embedding shape: {ref_emb.shape}")

    print("\n--- STEP 2: PAIRWISE COMPARISONS ---")
    res1 = verify_face(samples[1]["url"], ref_emb, threshold=0.55)
    print(f"Test 1 (Same Person): Match={res1['match']}, Similarity={res1['similarity']}")

    res2 = verify_face(samples[2]["url"], ref_emb, threshold=0.55)
    print(f"Test 2 (Different Person): Match={res2['match']}, Similarity={res2['similarity']}")

    assert res1["match"] is True, "Same person comparison must match"
    assert res2["match"] is False, "Different person comparison must not match"
    print("\nALL IDENTITY VERIFICATION BENCHMARKS PASSED 100%!")


if __name__ == "__main__":
    run_test_suite()
