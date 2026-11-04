# 📡 Vidhya Praman — API Reference & Schema Documentation

The Vidhya Praman ecosystem provides two primary API surfaces:
1. **FastAPI AI/ML Pipeline Engine** (Default Port: `8000`, Interactive Swagger: `/docs`)
2. **Django Core & Identity Engine** (Default Port: `8001`, REST Endpoints: `/api/`)

---

## 1. FastAPI AI/ML Engine Endpoints (`:8000`)

### 0. Health & Diagnostics
#### `GET /health`
Returns health check status and availability of PyTorch, OpenCV, YOLO, and GPU acceleration.
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "gpu_available": false,
  "active_services": 9
}
```

---

### 1. Biometric Identity Verification (FaceNet)
#### `POST /identity/verify`
Performs 1:1 biometric matching between an enrolled user profile and an incoming verification snapshot.
- **Request Body**:
```json
{
  "reference_image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "candidate_image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "threshold": 0.85
}
```
- **Response `200 OK`**:
```json
{
  "verified": true,
  "distance": 0.5421,
  "similarity_score": 0.8872,
  "face_detected": true
}
```

---

### 2. Intelligent Exam Proctoring (YOLOv8)
#### `POST /proctoring/analyze`
Analyzes an exam frame for security violations in real time.
- **Request Body**:
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "session_id": "proc-sess-88912"
}
```
- **Response `200 OK`**:
```json
{
  "person_count": 1,
  "face_count": 1,
  "violations": [],
  "detected_objects": [
    {"label": "person", "confidence": 0.94, "box": [120, 80, 450, 600]}
  ],
  "head_pose": {
    "yaw": -3.2,
    "pitch": 1.1,
    "status": "center"
  },
  "is_flagged": false
}
```
*Possible violations: `no_face`, `multi_face`, `device_detected`, `gaze_diverted`.*

---

### 3. Developer Skill Confidence Scorer
#### `POST /skill-confidence/score`
Calculates an objective developer trust score using commit frequency, repo volume, and code quality signals.
- **Request Body**:
```json
{
  "skill_name": "Python",
  "features": {
    "repo_count": 18,
    "commits_last_6mo": 140,
    "language_match": 1,
    "endorsement_count": 14,
    "account_age_years": 3.5,
    "readme_quality_score": 0.92
  }
}
```
- **Response `200 OK`**:
```json
{
  "skill_name": "Python",
  "confidence_score": 0.892,
  "level": "Expert",
  "feature_importances": [
    {"feature": "commits_last_6mo", "weight": 0.35},
    {"feature": "repo_count", "weight": 0.25},
    {"feature": "readme_quality_score", "weight": 0.20}
  ]
}
```

---

### 4. Adaptive Assessment & Grading Engine
#### `POST /assessment/generate`
Synthesizes a topic-focused exam containing MCQs and short-answer prompts.
- **Request Body**:
```json
{
  "topic": "FastAPI Dependency Injection",
  "difficulty": "intermediate",
  "num_questions": 5
}
```

#### `POST /assessment/grade`
Executes hybrid evaluation: deterministic key match for MCQs and LLM rubric evaluation for code/short answers.
- **Request Body**:
```json
{
  "questions": [
    {
      "id": 1,
      "type": "short_answer",
      "question": "Explain how yield dependencies manage resource cleanup in FastAPI.",
      "student_answer": "Code after yield is executed when the response finishes."
    }
  ]
}
```
- **Response `200 OK`**:
```json
{
  "total_score": 85.0,
  "max_score": 100.0,
  "feedback": "Clear explanation of post-yield teardown execution. Mention context manager internals for extra credit."
}
```

---

### 5. Learning Plan & Curriculum Generator
#### `POST /learning-plan/generate`
Generates a structured, chronological learning curriculum with resources and milestones.
- **Request Body**:
```json
{
  "target_role": "Full Stack AI Engineer",
  "baseline_skills": ["Python", "JavaScript"],
  "target_skills": ["PyTorch", "FastAPI", "React"],
  "duration_weeks": 8
}
```

---

### 6. Semantic RAG Retrieval Vector Store
#### `POST /rag/add-memory`
Inserts a contextual passage into a tenant-isolated vector store.
- **Request Body**:
```json
{
  "user_id": "usr_9921",
  "topic": "Python AsyncIO",
  "content": "Learner struggled with event loop blocking during Task 3."
}
```

#### `POST /rag/query`
Performs cosine similarity search over a user's isolated knowledge base.
- **Request Body**:
```json
{
  "user_id": "usr_9921",
  "query": "Where did the student face performance bottlenecks?",
  "top_k": 3
}
```

---

### 7. Socratic 1:1 AI Tutor
#### `POST /tutoring/chat`
Conducts pedagogical dialogues with dynamic memory recall.
- **Request Body**:
```json
{
  "user_id": "usr_9921",
  "session_id": "sess_123",
  "message": "Why does my OpenCV frame capture freeze the main thread?"
}
```

---

### 8. Verified Document Generation
#### `POST /documents/resume`
Synthesizes a verified, formatted Markdown resume grounded strictly in confirmed platform telemetry.
- **Request Body**:
```json
{
  "user_id": "usr_9921",
  "target_role": "Senior Computer Vision Engineer"
}
```

---

### 9. Certificate Optical Character Recognition (EasyOCR)
#### `POST /certificate/extract`
Parses an uploaded credential image or PDF certificate.
- **Request Body**:
```json
{
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```
- **Response `200 OK`**:
```json
{
  "title": "AWS Certified Solutions Architect - Associate",
  "recipient_name": "Jane Doe",
  "issuer": "Amazon Web Services",
  "issue_date": "2025-08-15",
  "confidence": 0.96
}
```

---

## 2. Django Platform & Identity Endpoints (`:8001`)

### Authentication & Profile
- `POST /api/auth/register/`: Registers a new local user and initializes `UserProfile`.
- `POST /api/auth/login/`: Issues JWT access & refresh tokens.
- `GET /api/auth/profile/`: Fetches authenticated user's complete profile, skills, badges, and learning path.
- `PUT /api/auth/profile/`: Updates bio, phone, target role, and user metadata.
- `POST /api/auth/refresh/`: Refreshes expired access tokens.

### OAuth 2.0 Integration
- `POST /api/auth/oauth/google/`: Handles Google ID token verification and profile linking.
- `POST /api/auth/oauth/github/`: Exchanges GitHub OAuth code, retrieves verified developer repositories, and calculates initial commit stats.

### Onboarding & Diagnostic Testing
- `GET /api/onboarding/diagnostic-test/?skill=<skill>`: Returns a balanced 20-question diagnostic exam.
- `POST /api/onboarding/submit-diagnostic/`: Evaluates responses, assigns skill tier (`beginner`, `intermediate`, `advanced`), and saves state.
- `POST /api/onboarding/learning-path/`: Updates and activates the learner's multi-track curriculum.

### Learning Modules & Interactive Studio
- `GET /api/modules/list/`: Lists all tracks and modules with unlocked/locked statuses.
- `GET /api/modules/lesson/?skill=<skill>&module_id=<id>`: Retrieves or dynamically synthesizes lesson markdown and code walkthroughs.
- `POST /api/modules/submit-assignment/`: Submits learner assignment code for automated assessment.
- `POST /api/modules/exam-result/`: Records proctored module exam results and unlocks subsequent modules.

### Proctoring Session Lifecycle
- `POST /api/proctoring/start/`: Initiates a new proctoring session token.
- `POST /api/proctoring/analyze-frame/`: Relays webcam frame analysis to FastAPI and updates the real-time integrity score.
- `POST /api/proctoring/finalize/`: Concludes exam session; verifies final integrity score $\ge 70\%$ before awarding credentials.

### Badges & Verifiable Credentials
- `GET /api/badges/list/`: Lists all earned digital badges.
- `GET /api/badges/svg/<badge_id>/`: Renders an immutable SVG badge embedding verified learner cryptographic metadata.
- `GET /api/portfolio/data/`: Returns structured portfolio payload ready for public sharing.
