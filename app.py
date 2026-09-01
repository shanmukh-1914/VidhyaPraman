"""
app.py - Main entrypoint alias for the SkillForge FastAPI application.
"""
from main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
