"""
api_schemas.py - Comprehensive Pydantic Data Models for Swagger UI & OpenAPI Specification.

This module defines all request and response schemas across the 9 Vidhya Praman AI/ML services:
  1. Identity Check Model (FaceNet VGGFace2 Biometrics)
  2. Proctoring Model (Ultralytics YOLOv8 Object & Presence Detection)
  3. Skill Confidence Model (GradientBoosting Scorer with Developer Signals)
  4. Assessment Model (Claude Sonnet 4.6 MCQ/Short-Answer Generator & Hybrid Grader)
  5. Learning Plan Model (Hierarchical Curriculum Generator)
  6. RAG Retrieval Model (Multi-Tenant Sentence-Transformers Vector Store)
  7. Tutoring Model (Personalized 1:1 AI Tutor with RAG Memory Injection)
  8. Document Generation Model (Verified Resume & LOR Synthesis Engine)
  9. Certificate OCR Model (EasyOCR Extraction & Heuristic Parsing)
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ==============================================================================
# 0. System & Health Schemas
# ==============================================================================

class HealthResponse(BaseModel):
    status: str = Field(default="healthy", description="Current service health status")
    version: str = Field(default="1.0.0", description="API version")
    models_available: List[str] = Field(
        default_factory=lambda: [
            "identity_check (FaceNet + MTCNN)",
            "proctoring (Ultralytics YOLOv8)",
            "skill_confidence (GradientBoosting)",
            "assessment (NVIDIA Meta LLaMA 3.2)",
            "learning_plan (NVIDIA Meta LLaMA 3.2)",
            "rag_retrieval (all-MiniLM-L6-v2)",
            "tutoring (NVIDIA Meta LLaMA 3.2 + RAG)",
            "document_generation (NVIDIA Meta LLaMA 3.2)",
            "certificate_ocr (EasyOCR)",
        ],
        description="List of supported AI/ML pipelines",
    )


class MessageResponse(BaseModel):
    message: str = Field(description="Informational or confirmation message")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Optional extra metadata")


# ==============================================================================
# 1. Identity Check Model (Biometric FaceNet)
# ==============================================================================

class EnrollFaceRequest(BaseModel):
    image_url_or_base64: str = Field(
        ...,
        description="URL, local file path, or Base64 data URI of reference enrollment photo",
        examples=["https://raw.githubusercontent.com/davidsandberg/facenet/master/data/images/Anthony_Hopkins_0001.jpg"],
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "image_url_or_base64": "https://raw.githubusercontent.com/davidsandberg/facenet/master/data/images/Anthony_Hopkins_0001.jpg"
            }
        }
    }


class EnrollFaceResponse(BaseModel):
    success: bool = Field(description="Whether face was detected and enrolled successfully")
    embedding_dimension: int = Field(default=512, description="Dimension of normalized FaceNet vector")
    embedding_preview: List[float] = Field(description="First 5 values of 512-dim embedding")
    full_embedding: Optional[List[float]] = Field(default=None, description="Full 512-dim embedding vector")


class VerifyFaceRequest(BaseModel):
    current_image_url_or_base64: str = Field(
        ...,
        description="URL or Base64 data URI of current webcam test frame",
        examples=["https://raw.githubusercontent.com/davidsandberg/facenet/master/data/images/Anthony_Hopkins_0002.jpg"],
    )
    reference_embedding: Optional[List[float]] = Field(
        default=None,
        description="512-dimensional reference embedding from prior enrollment",
    )
    reference_image_url_or_base64: Optional[str] = Field(
        default=None,
        description="Alternative: Provide reference photo directly to enroll & compare in one step",
        examples=["https://raw.githubusercontent.com/davidsandberg/facenet/master/data/images/Anthony_Hopkins_0001.jpg"],
    )
    threshold: float = Field(
        default=0.60,
        ge=0.0,
        le=1.0,
        description="Cosine similarity threshold for match decision",
    )


class VerifyFaceResponse(BaseModel):
    match: bool = Field(description="True if similarity >= threshold")
    similarity: float = Field(description="Calculated Cosine Similarity score [0.0 - 1.0]")
    threshold: float = Field(description="Similarity threshold used")
    face_detected: bool = Field(description="Whether a face was localized in the current test frame")


# ==============================================================================
# 2. Proctoring Model (YOLOv8 Presence & Device Detection)
# ==============================================================================

class ProctoringAnalyzeRequest(BaseModel):
    image_url_or_base64: str = Field(
        ...,
        description="URL or Base64 data URI of proctoring webcam frame",
        examples=["https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=640&q=80"],
    )
    conf_threshold: float = Field(
        default=0.25,
        ge=0.05,
        le=0.95,
        description="General YOLO confidence threshold",
    )
    phone_conf_threshold: float = Field(
        default=0.15,
        ge=0.05,
        le=0.95,
        description="Lower threshold for detecting cell phones/devices",
    )


class ConfidenceScores(BaseModel):
    persons: List[float] = Field(default_factory=list, description="Per-detection confidence scores for persons")
    phones: List[float] = Field(default_factory=list, description="Per-detection confidence scores for phones")


class ProctoringAnalyzeResponse(BaseModel):
    face_count: int = Field(description="Number of detected persons in frame")
    phone_detected: bool = Field(description="Whether one or more cell phones were detected")
    flags: List[str] = Field(description="Active proctoring violation flags ('no_face', 'multi_face', 'device_detected')")
    is_compliant: bool = Field(description="True if face_count == 1 and phone_detected is False")
    confidence_scores: ConfidenceScores = Field(description="Detection confidence scores for persons and phones")


# ==============================================================================
# 3. Skill Confidence Model (GradientBoosting Scorer)
# ==============================================================================

class SkillFeatures(BaseModel):
    repo_count: int = Field(
        default=18,
        ge=0,
        description="Total public repositories owned or contributed to",
    )
    commits_last_6mo: int = Field(
        default=85,
        ge=0,
        description="Total git commits authored over past 6 months",
    )
    language_match: int = Field(
        default=1,
        ge=0,
        le=1,
        description="1 if candidate repos contain claimed language/framework, else 0",
    )
    endorsement_count: int = Field(
        default=8,
        ge=0,
        description="Number of peer endorsements on LinkedIn / platform",
    )
    account_age_years: float = Field(
        default=3.2,
        ge=0.0,
        description="Years since account creation (developer longevity signal)",
    )
    readme_quality_score: float = Field(
        default=0.82,
        ge=0.0,
        le=1.0,
        description="Automated quality score of documentation & repository READMEs",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "repo_count": 18,
                "commits_last_6mo": 85,
                "language_match": 1,
                "endorsement_count": 8,
                "account_age_years": 3.2,
                "readme_quality_score": 0.82,
            }
        }
    }


class ScoreSkillRequest(BaseModel):
    skill_name: Optional[str] = Field(default="Python", description="Name of claimed skill")
    features: SkillFeatures = Field(description="Developer signal metrics")


class ScoreSkillResponse(BaseModel):
    skill_name: str = Field(description="Name of evaluated skill")
    confidence_score: float = Field(description="Calibrated probability / confidence score [0.0 - 1.0]")
    confidence_percentage: str = Field(description="Human readable percentage (e.g. '84.5%')")
    rating_tier: str = Field(description="Tier classification ('High Confidence', 'Moderate Confidence', 'Low / Unverified')")


class FeatureImportanceItem(BaseModel):
    feature: str = Field(description="Feature metric name")
    importance: float = Field(description="Normalized importance score")
    weight_percentage: str = Field(description="Percentage weight in model decisions")


class FeatureImportanceResponse(BaseModel):
    feature_importances: List[FeatureImportanceItem] = Field(description="Ranked list of feature importances")


# ==============================================================================
# 4. Assessment & Hybrid Grading Model
# ==============================================================================

class AssessmentQuestion(BaseModel):
    id: str = Field(description="Unique question identifier (e.g. 'q1', 'q2')")
    type: str = Field(description="Question type: 'mcq' or 'short_answer'")
    prompt: str = Field(description="The question prompt or problem statement")
    options: Optional[List[str]] = Field(default=None, description="Available choices for MCQ questions")


class GenerateAssessmentRequest(BaseModel):
    module_topic: str = Field(
        default="binary search",
        description="Specific module or skill topic to evaluate",
        examples=["binary search", "AWS IAM & Security", "SQL Multi-Table Joins"],
    )
    difficulty: str = Field(
        default="medium",
        description="Difficulty level ('easy', 'medium', 'hard')",
        examples=["medium"],
    )
    api_key: Optional[str] = Field(
        default=None,
        description="Optional Anthropic API Key (or set ANTHROPIC_API_KEY environment variable)",
    )


class GenerateAssessmentResponse(BaseModel):
    topic: str = Field(description="Assessment topic")
    difficulty: str = Field(description="Difficulty level")
    questions: List[AssessmentQuestion] = Field(description="Generated assessment questions")
    answer_key: Dict[str, str] = Field(description="Authoritative answer key paired with questions")


class GradeSubmissionRequest(BaseModel):
    questions: List[AssessmentQuestion] = Field(description="The original list of questions")
    answer_key: Dict[str, str] = Field(description="The authoritative answer key mapping question IDs to correct answers")
    learner_answers: Dict[str, str] = Field(
        description="Learner's submitted answers mapping question IDs to responses",
        examples=[{
            "q1": "B) The array elements must be sorted in ascending or descending order",
            "q2": "B) O(N)",
            "q3": "If low and high are very large, adding them can exceed 32-bit integer limits causing overflow. We write low + (high - low) // 2 instead.",
            "q4": "It updates the pointer to somewhere in the middle."
        }],
    )
    api_key: Optional[str] = Field(default=None, description="Optional Anthropic API Key for LLM short-answer grading")


class QuestionGradingResult(BaseModel):
    type: str = Field(description="Question type ('mcq' or 'short_answer')")
    score: float = Field(description="Earned points [0.0 - 1.0]")
    learner_answer: str = Field(description="Answer submitted by student")
    correct_answer: str = Field(description="Ground truth correct answer")
    justification: str = Field(description="Detailed rationale explaining the grade awarded")


class GradeSubmissionResponse(BaseModel):
    score: float = Field(description="Normalized overall score [0.0 - 1.0]")
    score_percentage: str = Field(description="Score formatted as percentage string")
    total_questions: int = Field(description="Total question count")
    earned_points: float = Field(description="Total points accumulated")
    passed: bool = Field(description="True if score >= 0.70")
    per_question: Dict[str, QuestionGradingResult] = Field(description="Question-by-question breakdown")


# ==============================================================================
# 5. Learning Plan Model
# ==============================================================================

class CurriculumModule(BaseModel):
    module_id: str = Field(description="Unique module identifier")
    title: str = Field(description="Descriptive module title")
    subtopics: List[str] = Field(description="Key concepts and subtopics covered")
    est_minutes: int = Field(description="Estimated study and hands-on lab duration in minutes")


class CurriculumLevel(BaseModel):
    level_id: str = Field(description="Unique tier identifier (e.g. 'level_1_cloud_concepts')")
    modules: List[CurriculumModule] = Field(description="Sequential modules within this tier")


class GenerateLearningPlanRequest(BaseModel):
    goal: str = Field(
        default="AWS Certified Cloud Practitioner (CLF-C02)",
        description="Target certification, career role, or mastery milestone",
        examples=["AWS Certified Cloud Practitioner (CLF-C02)", "Full-Stack React & FastAPI Engineer"],
    )
    duration_weeks: int = Field(
        default=4,
        ge=1,
        le=52,
        description="Target timeline duration in weeks",
    )
    baseline_skills: Dict[str, float] = Field(
        default_factory=lambda: {"python": 0.6, "linux": 0.3, "cloud": 0.1},
        description="Learner's existing verified skill competency scores [0.0 - 1.0]",
    )
    api_key: Optional[str] = Field(default=None, description="Optional Anthropic API Key")


class GenerateLearningPlanResponse(BaseModel):
    goal: str = Field(description="Target learning goal")
    duration_weeks: int = Field(description="Total curriculum duration in weeks")
    total_modules: int = Field(description="Total number of learning modules")
    total_estimated_hours: float = Field(description="Total estimated study time in hours")
    levels: List[CurriculumLevel] = Field(description="Progressive difficulty tiers and curriculum modules")


# ==============================================================================
# 6. RAG Retrieval Model (Multi-Tenant Vector Store)
# ==============================================================================

class AddMemoryRequest(BaseModel):
    user_id: str = Field(default="user_alice_401", description="Unique learner tenant identifier")
    text: str = Field(
        ...,
        description="Memory text to encode and store (e.g. struggle log, quiz note, preference)",
        examples=["Learner struggled with recursion base cases and stack overflow errors in Python"],
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Optional structured metadata (e.g. {'topic': 'Recursion', 'difficulty': 'hard'})",
    )


class AddBatchMemoriesRequest(BaseModel):
    user_id: str = Field(default="user_alice_401", description="Unique learner tenant identifier")
    memories: List[str] = Field(
        ...,
        description="List of memory strings to ingest into user's vector index",
        examples=[[
            "Learner struggled with recursion base cases and stack overflow errors in Python",
            "Aced arrays, list comprehension, and hash map modules with 98% pass rate",
            "Asked about recursion call stack frames and sys.setrecursionlimit() behavior"
        ]],
    )


class QueryMemoryRequest(BaseModel):
    user_id: str = Field(default="user_alice_401", description="Target learner ID to query against")
    query: str = Field(
        ...,
        description="Search query string (e.g. current topic or question)",
        examples=["explain recursion and call stacks"],
    )
    top_k: int = Field(default=3, ge=1, le=20, description="Maximum number of memories to retrieve")


class ScoredMemoryItem(BaseModel):
    text: str = Field(description="Stored memory snippet")
    similarity_score: float = Field(description="Cosine similarity score [0.0 - 1.0]")
    metadata: Dict[str, Any] = Field(description="Associated metadata")


class QueryMemoryResponse(BaseModel):
    user_id: str = Field(description="Queried learner tenant")
    query: str = Field(description="Search query evaluated")
    results: List[ScoredMemoryItem] = Field(description="Top-K ranked semantic memories")


# ==============================================================================
# 7. Tutoring Model (RAG-Augmented 1:1 AI Tutor)
# ==============================================================================

class TutoringTurnRequest(BaseModel):
    user_id: str = Field(default="user_alice_401", description="Learner tenant ID for memory retrieval & storage")
    module_topic: str = Field(
        default="Recursion & Stack Frames",
        description="Current lesson module topic",
        examples=["Recursion & Stack Frames", "Binary Trees & BST", "Dynamic Programming"],
    )
    learner_message: str = Field(
        default="Can you re-explain how base cases work in recursion? I'm still getting confused.",
        description="Learner's prompt or question to the tutor",
    )
    language: str = Field(default="English", description="Target language of instruction")
    api_key: Optional[str] = Field(default=None, description="Optional Anthropic API Key")


class TutoringTurnResponse(BaseModel):
    user_id: str = Field(description="Learner identifier")
    module_topic: str = Field(description="Active topic")
    tutor_reply: str = Field(description="Generated personalized tutoring explanation (Markdown formatted)")
    retrieved_context: List[str] = Field(description="Historical memories retrieved and injected into prompt")
    committed_summary: str = Field(description="New memory entry committed to learner's vector store")


class GenerateNotesRequest(BaseModel):
    module_topic: str = Field(
        default="React Hooks & Virtual DOM",
        description="Technical topic to generate concise study notes for",
    )
    user_query: Optional[str] = Field(
        default=None,
        description="Specific question or concept the learner asked about",
    )
    language: str = Field(default="English", description="Language of notes")
    api_key: Optional[str] = Field(default=None, description="Optional API Key")


class GenerateNotesResponse(BaseModel):
    module_topic: str = Field(description="Topic name")
    language: str = Field(description="Language of notes")
    notes_markdown: str = Field(description="Structured high-yield revision notes and cheat sheet in Markdown")
    key_takeaways: List[str] = Field(default_factory=list, description="Extracted bullet takeaways")
    created_at: str = Field(description="Timestamp of note generation")


# ==============================================================================
# 8. Document Generation Model (Resume & LOR)
# ==============================================================================

class LearnerTelemetry(BaseModel):
    name: str = Field(default="Samantha Chen", description="Candidate full name")
    skills: List[str] = Field(
        default_factory=lambda: ["Python", "PyTorch", "FastAPI", "Docker", "AWS IAM", "PostgreSQL"],
        description="List of verified skills",
    )
    assessment_scores: Dict[str, str] = Field(
        default_factory=lambda: {
            "Data Structures & Algorithms": "96%",
            "Cloud Security & AWS IAM": "92%",
            "REST API Design with FastAPI": "95%",
        },
        description="Proctored assessment records",
    )
    certifications: List[str] = Field(
        default_factory=lambda: ["AWS Certified Solutions Architect - Associate (Issued 2024)", "Red Hat Certified Engineer"],
        description="Verified credentials and certifications",
    )
    badges: List[str] = Field(
        default_factory=lambda: ["Top 5% Algorithm Mastery", "Proctored Exam Clean Integrity Badge"],
        description="Earned platform achievement badges",
    )


class GenerateResumeRequest(BaseModel):
    verified_data: LearnerTelemetry = Field(description="Verified candidate telemetry")
    api_key: Optional[str] = Field(default=None, description="Optional Anthropic API Key")


class GenerateLORRequest(BaseModel):
    verified_data: LearnerTelemetry = Field(description="Verified candidate telemetry")
    recommender_name: Optional[str] = Field(default="Dr. Arthur Pendelton", description="Name of recommending instructor/lead")
    recommender_title: Optional[str] = Field(default="Lead AI Curriculum Architect", description="Title of recommender")
    organization: Optional[str] = Field(default="Vidhya Praman Technical Academy", description="Recommending institution")
    api_key: Optional[str] = Field(default=None, description="Optional Anthropic API Key")


class GeneratedDocumentResponse(BaseModel):
    document_type: str = Field(description="Type of document ('Resume' or 'Letter of Recommendation')")
    candidate_name: str = Field(description="Candidate name")
    markdown_content: str = Field(description="Clean, grounded Markdown document content")


# ==============================================================================
# 9. Certificate OCR Model (EasyOCR + Heuristics)
# ==============================================================================

class CertificateExtractRequest(BaseModel):
    image_url_or_base64: str = Field(
        ...,
        description="URL, local file path, or Base64 data URI of certificate image to scan",
    )


class CertificateFieldResponse(BaseModel):
    raw_text: str = Field(description="Aggregated full OCR transcription")
    issuer_guess: Optional[str] = Field(description="Identified issuing organization (AWS, Red Hat, Coursera, etc.)")
    name_guess: Optional[str] = Field(description="Candidate name")
    title_guess: Optional[str] = Field(default=None, description="Certificate or credential title")
    date_guess: Optional[str] = Field(default=None, description="Issue / completion date")
    credential_id: Optional[str] = Field(default=None, description="Verification ID or license number")
    skills_covered: List[str] = Field(default_factory=list, description="Extracted technical competencies")
    confidence: float = Field(description="Mean OCR recognition confidence score [0.0 - 1.0]")
    extraction_method: str = Field(default="Deep Neural Vision OCR + LLM Reasoning Parser", description="Extraction engine used")
    total_text_blocks_detected: int = Field(description="Number of OCR bounding boxes found")
