"""
test_api.py - Verification script for FastAPI app and endpoints.
"""
import sys
import os
os.environ["LLM_TIMEOUT"] = "25.0"
sys.path.insert(0, r"d:\SkillForge")

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_all():
    print("Testing OpenAPI specification...")
    response = client.get("/openapi.json")
    assert response.status_code == 200, f"OpenAPI failed: {response.text}"
    schema = response.json()
    print(f"OpenAPI Spec generated successfully! Title: '{schema['info']['title']}', Total Paths: {len(schema['paths'])}")

    print("\nTesting GET / (Root)...")
    res = client.get("/")
    assert res.status_code == 200
    print("Root response:", res.json())

    print("\nTesting GET /health...")
    res = client.get("/health")
    assert res.status_code == 200
    print("Health response:", res.json())

    print("\nTesting POST /skill-confidence/score...")
    res = client.post("/skill-confidence/score", json={
        "skill_name": "Python & PyTorch",
        "features": {
            "repo_count": 22,
            "commits_last_6mo": 110,
            "language_match": 1,
            "endorsement_count": 12,
            "account_age_years": 4.0,
            "readme_quality_score": 0.88
        }
    })
    assert res.status_code == 200, f"Skill scoring failed: {res.text}"
    print("Skill Confidence response:", res.json())

    print("\nTesting GET /skill-confidence/feature-importances...")
    res = client.get("/skill-confidence/feature-importances")
    assert res.status_code == 200
    print("Feature Importances count:", len(res.json()["feature_importances"]))

    print("\nTesting POST /assessment/generate...")
    res = client.post("/assessment/generate", json={
        "module_topic": "binary search",
        "difficulty": "medium"
    })
    assert res.status_code == 200, f"Assessment failed: {res.text}"
    assessment_data = res.json()
    print(f"Generated {len(assessment_data['questions'])} questions for '{assessment_data['topic']}'.")

    print("\nTesting POST /assessment/grade...")
    grade_res = client.post("/assessment/grade", json={
        "questions": assessment_data["questions"],
        "answer_key": assessment_data["answer_key"],
        "learner_answers": {
            "q1": "B) The array elements must be sorted in ascending or descending order",
            "q2": "A) O(log N)",
            "q3": "Prevents 32-bit integer overflow when calculating mid point.",
            "q4": "Narrow search range to right half."
        }
    })
    assert grade_res.status_code == 200, f"Grading failed: {grade_res.text}"
    print("Grading score:", grade_res.json()["score_percentage"])

    print("\nTesting POST /learning-plan/generate...")
    res = client.post("/learning-plan/generate", json={
        "goal": "AWS Certified Cloud Practitioner",
        "duration_weeks": 4,
        "baseline_skills": {"python": 0.5, "linux": 0.2}
    })
    assert res.status_code == 200, f"Learning plan failed: {res.text}"
    plan_data = res.json()
    print(f"Generated plan with {plan_data['total_modules']} modules across {len(plan_data['levels'])} levels.")

    print("\nTesting RAG Vector Memory (/rag/memory & /rag/retrieve)...")
    res1 = client.post("/rag/memory", json={
        "user_id": "test_user_99",
        "text": "Learner mastered recursion base cases and binary search algorithms.",
        "metadata": {"topic": "Algorithms"}
    })
    assert res1.status_code == 200
    print("Ingested memory 1.")

    res2 = client.post("/rag/retrieve", json={
        "user_id": "test_user_99",
        "query": "recursion and binary search",
        "top_k": 2
    })
    assert res2.status_code == 200
    print("RAG Retrieval similarity:", res2.json()["results"][0]["similarity_score"])

    print("\nTesting POST /documents/resume...")
    res = client.post("/documents/resume", json={
        "verified_data": {
            "name": "Samantha Chen",
            "skills": ["Python", "FastAPI", "Docker", "PyTorch"],
            "assessment_scores": {"Algorithms": "95%"},
            "certifications": ["AWS Certified Solutions Architect"],
            "badges": ["Top 5% Performer"]
        }
    })
    assert res.status_code == 200
    print("Resume generated successfully! Length:", len(res.json()["markdown_content"]))

    print("\nTesting POST /documents/lor...")
    res = client.post("/documents/lor", json={
        "verified_data": {
            "name": "Samantha Chen",
            "skills": ["Python", "FastAPI"],
            "assessment_scores": {"Algorithms": "95%"},
            "certifications": ["AWS Certified Solutions Architect"],
            "badges": ["Top 5% Performer"]
        },
        "recommender_name": "Dr. Arthur Pendelton",
        "recommender_title": "Lead AI Architect",
        "organization": "SkillForge Academy"
    })
    assert res.status_code == 200
    print("LOR generated successfully! Length:", len(res.json()["markdown_content"]))

    print("\nTesting POST /tutoring/turn...")
    res = client.post("/tutoring/turn", json={
        "user_id": "test_user_99",
        "module_topic": "Recursion & Call Stacks",
        "learner_message": "Can you explain recursion base cases again?",
        "language": "English"
    })
    assert res.status_code == 200
    print("Tutoring response generated successfully! Reply length:", len(res.json()["tutor_reply"]))

    print("\nTesting POST /certificate/generate-synthetic...")
    res = client.post("/certificate/generate-synthetic")
    assert res.status_code == 200
    print("Certificate synthetic generation result:", res.json())

    print("\nTesting POST /proctoring/test-suite...")
    res = client.post("/proctoring/test-suite")
    assert res.status_code == 200
    print("Proctoring test suite:", res.json()["status"])

    print("\nTesting POST /identity/test-suite...")
    res = client.post("/identity/test-suite")
    assert res.status_code == 200
    print("Identity test suite:", res.json()["status"])

    print("\n=======================================================")
    print("ALL API ENDPOINT & SWAGGER UI SCHEMA TESTS PASSED 100%!")
    print("=======================================================")

if __name__ == "__main__":
    test_all()
