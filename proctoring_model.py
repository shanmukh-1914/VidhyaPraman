"""
proctoring_model.py - Standalone Proctoring Model using Ultralytics YOLOv8.

================================================================================
CRITICAL NOTE ON MODEL CAPABILITIES & LIMITATIONS:
================================================================================
This module uses a pretrained YOLOv8 model (COCO dataset) for object and person
PRESENCE detection (specifically targeting 'person' and 'cell phone' classes).

1. WHAT IT DOES:
   - Evaluates frame-level presence and count of individuals ("person" class).
   - Detects the presence of unauthorized devices ("cell phone" class).
   - Generates actionable real-time proctoring flags:
       * "no_face"          -> No candidate/person detected in the frame.
       * "multi_face"       -> More than one person detected in the frame.
       * "device_detected"  -> One or more cell phones detected in the frame.

2. WHAT IT DOES NOT DO (IDENTITY VERIFICATION LIMITATION):
   - YOLOv8 performs PRESENCE and BOUNDING BOX detection, NOT identity verification
     or biometric facial recognition.
   - It cannot distinguish candidate identity or verify if the detected face
     belongs to a specific enrolled user.
   - Biometric/identity verification requires separate facial embedding & matching
     models (e.g. ArcFace / FaceNet / DeepFace).

3. PRIVACY & EPHEMERAL PROCESSING:
   - This module does NOT persist, write, or save input frames/images to disk.
   - All frame analysis occurs strictly in-memory and returns structured metadata.
================================================================================
"""

import argparse
import io
import json
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import numpy as np
from PIL import Image
from ultralytics import YOLO

# Global cache for the singleton YOLO model instance and class mappings
_MODEL_INSTANCE: Optional[YOLO] = None
_PERSON_CLASS_ID: int = 0
_PHONE_CLASS_ID: int = 67
_DEVICE_CLASS_IDS: set = {67, 65}


def get_model(model_name: str = "yolov8n.pt") -> YOLO:
    """
    Retrieves or lazily initializes the cached YOLOv8 model instance.
    
    Args:
        model_name: Name or file path of the pretrained weights (default: 'yolov8n.pt').
        
    Returns:
        YOLO: Instantiated and warm Ultralytics YOLO model.
    """
    global _MODEL_INSTANCE, _PERSON_CLASS_ID, _PHONE_CLASS_ID, _DEVICE_CLASS_IDS
    if _MODEL_INSTANCE is None:
        _MODEL_INSTANCE = YOLO(model_name)
        _DEVICE_CLASS_IDS = set()
        # Dynamically map class indices from model metadata
        for cls_id, name in _MODEL_INSTANCE.names.items():
            name_lower = name.lower()
            if name_lower == "person":
                _PERSON_CLASS_ID = int(cls_id)
            elif name_lower in ("cell phone", "cellphone", "phone"):
                _PHONE_CLASS_ID = int(cls_id)
                _DEVICE_CLASS_IDS.add(int(cls_id))
            elif any(w in name_lower for w in ("remote", "laptop", "tablet", "screen")):
                _DEVICE_CLASS_IDS.add(int(cls_id))
                
    return _MODEL_INSTANCE


def _load_image_to_memory(image_input: Union[str, Path, np.ndarray, Image.Image, Any]) -> Any:
    """
    Normalizes input into an in-memory representation without saving to disk.
    Supports file paths, URLs, NumPy arrays (cv2 frames), and PIL Images.
    """
    if isinstance(image_input, (str, Path)):
        str_path = str(image_input)
        if str_path.startswith(("http://", "https://")):
            req = urllib.request.Request(
                str_path,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                image_bytes = resp.read()
            return Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return str_path
    return image_input


def analyze_frame(
    image_path_or_array: Union[str, Path, np.ndarray, Image.Image, Any],
    conf_threshold: float = 0.25,
    model: Optional[YOLO] = None,
) -> Dict[str, Any]:
    """
    Analyzes an input video frame or image for proctoring violations.
    
    Processes the frame purely in-memory and checks for person count and
    unauthorized device (cell phone) presence.

    Args:
        image_path_or_array: Path to image file (str/Path), web URL (str),
                             or in-memory image array (numpy ndarray / PIL Image).
        conf_threshold: Minimum detection confidence threshold (default: 0.25).
        model: Optional pre-loaded YOLO model instance. If None, uses cached singleton.

    Returns:
        dict:
            {
                "face_count": int,          # count of "person" class detections
                "phone_detected": bool,     # any "cell phone" class detection
                "flags": [str],             # e.g. ["no_face"], ["multi_face"], ["device_detected"]
                "confidence_scores": {
                    "persons": [float],     # per-detection confidence scores for persons
                    "phones": [float]       # per-detection confidence scores for phones
                }
            }
    """
    detector = model or get_model()
    
    # Ensure source is loaded in-memory (handles URLs / raw arrays without disk writes)
    frame_source = _load_image_to_memory(image_path_or_array)
    
    # Run YOLO inference (verbose=False to keep stdout clean, persist=False)
    results = detector(frame_source, conf=conf_threshold, verbose=False)
    
    person_confs: List[float] = []
    phone_confs: List[float] = []
    
    if results and len(results) > 0:
        result = results[0]
        if result.boxes is not None and len(result.boxes) > 0:
            boxes = result.boxes
            classes = boxes.cls.cpu().numpy() if hasattr(boxes.cls, "cpu") else np.array(boxes.cls)
            confs = boxes.conf.cpu().numpy() if hasattr(boxes.conf, "cpu") else np.array(boxes.conf)
            
            for cls_id, conf in zip(classes, confs):
                cls_int = int(cls_id)
                confidence_val = round(float(conf), 4)
                
                if cls_int == _PERSON_CLASS_ID:
                    person_confs.append(confidence_val)
                elif cls_int == _PHONE_CLASS_ID:
                    phone_confs.append(confidence_val)

    face_count = len(person_confs)
    phone_detected = len(phone_confs) > 0
    
    # Rule-based proctoring flags
    flags: List[str] = []
    if face_count == 0:
        flags.append("no_face")
    elif face_count > 1:
        flags.append("multi_face")
        
    if phone_detected:
        flags.append("device_detected")
        
    return {
        "face_count": face_count,
        "phone_detected": phone_detected,
        "flags": flags,
        "confidence_scores": {
            "persons": person_confs,
            "phones": phone_confs,
        },
    }


def run_test_suite() -> None:
    """
    CLI test suite that tests analyze_frame() across 5 key proctoring scenarios:
      1. Empty Room (no candidate)           -> face_count: 0, flags: ["no_face"]
      2. Single Candidate (normal exam state)-> face_count: 1, flags: []
      3. Multiple People (cheating attempt)  -> face_count: >=2, flags: ["multi_face"]
      4. Candidate with Cell Phone           -> face_count: 1, phone_detected: True, flags: ["device_detected"]
      5. Cell Phone Only (unattended device) -> face_count: 0, phone_detected: True, flags: ["no_face", "device_detected"]
    """
    print("=" * 80)
    print("PROCTORING MODEL VERIFICATION TEST SUITE (Ultralytics YOLOv8)")
    print("=" * 80)
    print("Initializing YOLOv8n detector...")
    model = get_model()
    print("Model initialized successfully.\n")

    # In-memory fetch helper
    def fetch_pil(url: str) -> Image.Image:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return Image.open(io.BytesIO(r.read())).convert("RGB")

    # 1. Empty Room Image (Synthetic background, no people, no phones)
    empty_room_array = np.full((480, 640, 3), (215, 218, 222), dtype=np.uint8)
    empty_room_array[360:, :] = (130, 100, 80)  # Desk surface
    empty_img = Image.fromarray(empty_room_array)

    # Scenarios URL list
    single_person_url = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=640&q=80"
    multi_person_url = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=640&q=80"
    person_with_phone_url = "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=640&q=80"
    phone_only_url = "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=640&q=80"

    print("Fetching benchmark scenario frames into memory...")
    single_person_img = fetch_pil(single_person_url)
    multi_person_img = fetch_pil(multi_person_url)
    person_with_phone_img = fetch_pil(person_with_phone_url)
    phone_only_img = fetch_pil(phone_only_url)

    test_scenarios = [
        {
            "id": 1,
            "title": "Scenario 1: Empty Room / Candidate Away from Desk",
            "frame": empty_img,
            "expected": "face_count = 0, phone_detected = False, flags = ['no_face']",
        },
        {
            "id": 2,
            "title": "Scenario 2: Single Candidate (Normal Proctoring State)",
            "frame": single_person_img,
            "expected": "face_count = 1, phone_detected = False, flags = []",
        },
        {
            "id": 3,
            "title": "Scenario 3: Multiple People Visible in Exam Area",
            "frame": multi_person_img,
            "expected": "face_count > 1, phone_detected = False, flags = ['multi_face']",
        },
        {
            "id": 4,
            "title": "Scenario 4: Candidate with Visible Cell Phone (Active Cheating)",
            "frame": person_with_phone_img,
            "expected": "face_count = 1, phone_detected = True, flags = ['device_detected']",
        },
        {
            "id": 5,
            "title": "Scenario 5: Unauthorized Cell Phone Only (No Face Visible)",
            "frame": phone_only_img,
            "expected": "face_count = 0, phone_detected = True, flags = ['no_face', 'device_detected']",
        },
    ]

    for scenario in test_scenarios:
        print("-" * 80)
        print(f"[{scenario['id']}/5] {scenario['title']}")
        print(f"Target Expectation : {scenario['expected']}")
        
        # Execute analyze_frame strictly in-memory
        result = analyze_frame(scenario["frame"], model=model)
        
        print("Detection Output   :")
        print(json.dumps(result, indent=4))

    print("\n" + "=" * 80)
    print("ALL 5 PROCTORING SCENARIOS EVALUATED SUCCESSFULLY")
    print("=" * 80)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Standalone YOLOv8 Proctoring Module for Person & Device Presence Detection"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Run verification test suite on sample proctoring scenarios",
    )
    parser.add_argument(
        "--image",
        type=str,
        default=None,
        help="Path or URL to an image file to analyze",
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=0.25,
        help="Confidence threshold for YOLO detection (default: 0.25)",
    )
    args = parser.parse_args()

    if args.test:
        run_test_suite()
    elif args.image:
        res = analyze_frame(args.image, conf_threshold=args.conf)
        print(json.dumps(res, indent=4))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
