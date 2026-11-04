# ⚛️ Vidhya Praman — React 19 Frontend Dashboard

The interactive user interface for **Vidhya Praman**, engineered with **React 19**, **Vite**, **Tailwind CSS**, and **Framer Motion**.

---

## 🛠️ Technology Stack
- **Framework**: React 19 (`react`, `react-dom`)
- **Build Tool**: Vite 8 with Hot Module Replacement (HMR)
- **Styling**: Tailwind CSS 3.4 with custom glassmorphism design tokens
- **Animations**: Framer Motion (`motion`)
- **Icons**: Lucide React (`lucide-react`)
- **Linter**: Oxlint for high-performance static analysis
- **Specialized Components**: `canvas-confetti` (for gamified badge ceremonies), custom camera stream wrappers

---

## 📁 Key Views & Directory Structure

```
frontend/src/
├── assets/          # Static logos, hero artwork, and SVG icons
├── components/      # Reusable UI components
│   ├── blocks/      # Modular UI widgets (analytics, sidebar, navbar)
│   ├── Navbar.jsx   # Top navigation bar with auth status & avatar
│   ├── Sidebar.jsx  # Main application navigation rail
│   └── WebcamCapture.jsx # Ephemeral webcam frame capture component
├── context/
│   └── AuthContext.jsx # Global JWT authentication state & provider
├── services/
│   └── api.js       # Unified Axios/Fetch API client for FastAPI & Django
├── utils/           # OAuth helpers, LocalStorage hooks, PDF export utilities
└── views/           # Full-page feature studios
    ├── AuthPortal.jsx       # Google, GitHub, and local login/signup
    ├── Dashboard.jsx        # Command center with streaks & progress
    ├── AssessmentStudio.jsx # Proctored MCQ & short-answer testing
    ├── ProctoringStudio.jsx # Real-time computer vision security studio
    ├── IdentityCheck.jsx    # 1:1 Biometric facial verification
    ├── LearningPlan.jsx     # Dynamic curriculum roadmap visualization
    ├── ModuleStudio.jsx     # Hierarchical code learning & assignments
    ├── TutorStudio.jsx      # Conversational 1:1 Socratic AI tutor
    ├── CertificateOCR.jsx   # Document & certificate credential parser
    └── DocumentStudio.jsx   # Verified Markdown/PDF resume & LOR generator
```

---

## 🚀 Development Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application runs on `http://localhost:5173`.
Configure API endpoints in `.env` using `VITE_API_URL` (default: `http://localhost:8000`) and `VITE_DJANGO_URL` (default: `http://localhost:8001`).
