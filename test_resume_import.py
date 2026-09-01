"""
test_resume_import.py - Test suite for Resume Upload Ingestion & 3-Way Independent Claim Verification.
"""

import os
import sys
import django

# Setup Django Environment
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server_django'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillforge_backend.settings')

for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, 'reconfigure'):
        _s.reconfigure(encoding='utf-8')

django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile
from accounts.resume_import_service import (
    parse_resume_content,
    generate_project_verification_qa,
    verify_project_claim_answers,
    verify_resume_certificate_claim,
)
from accounts.onboarding_service import generate_skill_test, grade_skill_test


def run_resume_import_tests():
    print("======================================================================")
    print("Testing Vidhya Praman Resume Ingestion & 3-Way Claim Verification")
    print("======================================================================")

    # 1. Setup test user with GitHub repos
    user, _ = User.objects.get_or_create(username='resume_tester_user', email='resumetest@vidhyapraman.edu')
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.github_repos = [
        {
            'name': 'distributed-queue-engine',
            'full_name': 'resume_tester_user/distributed-queue-engine',
            'description': 'High-performance asynchronous queue with Redis and bounded workers.',
            'language': 'Python',
            'url': 'https://github.com/resume_tester_user/distributed-queue-engine',
        }
    ]
    profile.skills_matrix = {}
    profile.verified_projects = []
    profile.certifications = []
    profile.save()

    sample_resume_text = """
    Alex Mercer - Senior Software Engineer
    Email: alex@example.com | GitHub: github.com/resume_tester_user

    SKILLS:
    Python, FastAPI, Docker, React, Redis, PostgreSQL, Distributed Systems

    PROJECTS:
    Distributed Queue Engine
    Architected an event-driven task processing system utilizing Python, FastAPI, and Redis streams.
    Handled 10,000 tasks/sec with guaranteed at-least-once delivery and graceful worker failovers.

    Cloud File Storage Synchronizer
    Developed a multi-tenant client-server file synchronization daemon with chunked hashing.

    CERTIFICATIONS:
    AWS Certified Solutions Architect – Associate (Amazon Web Services)
    Meta Front-End Developer Certificate (Coursera)
    """

    # -------------------------------------------------------------------------
    # Test 1: Parse Resume Content into 3 Distinct Claim Types
    # -------------------------------------------------------------------------
    print("\n[Test 1] Parsing Uploaded Resume Content into 3 Claim Types...")
    parsed = parse_resume_content(user, sample_resume_text, file_name='Alex_Mercer_Resume.pdf')
    
    assert len(parsed['skills']) >= 3, f"Expected >= 3 skill claims, got {len(parsed['skills'])}"
    assert len(parsed['projects']) >= 1, f"Expected >= 1 project claim, got {len(parsed['projects'])}"
    assert len(parsed['certificates']) >= 1, f"Expected >= 1 cert claim, got {len(parsed['certificates'])}"

    # Check GitHub repo matching
    first_proj = parsed['projects'][0]
    assert first_proj['matched_github_repo'] is not None, "Expected matching with user's GitHub repository"
    print(f"✓ Parsed {len(parsed['skills'])} skills, {len(parsed['projects'])} projects, and {len(parsed['certificates'])} cert claims. Matched repo: {first_proj['matched_repo_name']}.")

    # -------------------------------------------------------------------------
    # Test 2: Skill Claim Verification via Mandatory 20-Q Proctored Assessment
    # -------------------------------------------------------------------------
    print("\n[Test 2] Verifying Skill Claim via 20-Q Proctored Diagnostic...")
    skill_claim_name = parsed['skills'][0]['name']
    test_suite = generate_skill_test(skill_claim_name, difficulty='medium')
    assert len(test_suite['questions']) == 20, "Must route into exact same 20-question test"

    # Simulate passing score
    perfect_answers = test_suite['answer_key']
    grade_res = grade_skill_test(
        user=user,
        skill_name=skill_claim_name,
        questions=test_suite['questions'],
        answer_key=test_suite['answer_key'],
        learner_answers=perfect_answers,
        proctoring_outcome='pass'
    )
    assert grade_res['assigned_level'] in ('beginner', 'intermediate', 'advanced')
    assert grade_res['score_ratio'] >= 0.70

    profile.refresh_from_db()
    assert skill_claim_name in profile.skills_matrix
    assert profile.skills_matrix[skill_claim_name]['verified'] == True
    print(f"✓ Skill claim '{skill_claim_name}' verified via 20-Q proctored test and merged into UserProfile.skills_matrix.")

    # -------------------------------------------------------------------------
    # Test 3: Project Claim Technical Q&A Generation & Verification
    # -------------------------------------------------------------------------
    print("\n[Test 3] Generating & Verifying Project Claim Technical Q&A...")
    proj_id = first_proj['id']
    qa_data = generate_project_verification_qa(user, proj_id)
    assert len(qa_data['questions']) == 3

    # 3a. Valid detailed technical answer -> Approved and Merged
    answers_valid = {
        'proj_q1': 'We implemented bounded semaphores and asynchronous asyncio worker pools with Redis Streams for persistent event consumer groups.',
        'proj_q2': 'Circuit breakers were integrated using backoff exponential retries to prevent cascading thread pool starvation on downstream APIs.',
        'proj_q3': 'FastAPI and uvicorn were selected for low-latency asynchronous throughput compared to synchronous WSGI frameworks.'
    }
    proj_res = verify_project_claim_answers(user, proj_id, answers_valid)
    assert proj_res['is_verified'] == True
    assert proj_res['status'] == 'verified_and_merged'

    profile.refresh_from_db()
    assert len(profile.verified_projects) == 1
    assert profile.verified_projects[0]['title'] == first_proj['title']
    print(f"✓ Project claim '{first_proj['title']}' verified via technical Q&A and merged into UserProfile.verified_projects.")

    # 3b. Insufficient / Failed Project Answer -> Dropped Silently (No blocking)
    second_proj_id = parsed['projects'][1]['id'] if len(parsed['projects']) > 1 else 'proj_claim_2'
    answers_invalid = {'proj_q1': 'I built it', 'proj_q2': 'fast', 'proj_q3': 'good'}
    proj_fail_res = verify_project_claim_answers(user, second_proj_id, answers_invalid)
    assert proj_fail_res['is_verified'] == False
    assert proj_fail_res['status'] == 'dropped_silently'

    profile.refresh_from_db()
    # Verified projects remains count 1 (failed one was NOT added)
    assert len(profile.verified_projects) == 1
    print("✓ Failed project claim silently dropped without blocking approved claims.")

    # -------------------------------------------------------------------------
    # Test 4: Certificate Claim Verification via Prompt 6 Engine
    # -------------------------------------------------------------------------
    print("\n[Test 4] Verifying Certificate Claim from Resume...")
    cert_id = parsed['certificates'][0]['id']
    cert_res = verify_resume_certificate_claim(
        user=user,
        cert_claim_id=cert_id,
        verification_id="AWS-PSA-9928100",
        credential_url="https://www.credly.com/badges/aws-architect-9928100"
    )
    assert cert_res['is_verified'] == True

    profile.refresh_from_db()
    assert any(c.get('is_verified') for c in profile.certifications)
    print("✓ Certificate claim authenticated via Prompt 6 engine and merged into UserProfile.certifications.")

    # -------------------------------------------------------------------------
    # Test 5: Independent Verification Invariant
    # -------------------------------------------------------------------------
    print("\n[Test 5] Verifying Independent Merging Invariant...")
    # Profile now contains: 1 verified skill, 1 verified project, 1 verified cert
    assert profile.skills_matrix[skill_claim_name]['verified'] == True
    assert len(profile.verified_projects) == 1
    assert len([c for c in profile.certifications if c.get('is_verified')]) >= 1
    print("✓ All 3 claim types verified and merged completely independently.")

    print("\n======================================================================")
    print("ALL RESUME IMPORT & CLAIM VERIFICATION TESTS PASSED (5/5)!")
    print("======================================================================")


if __name__ == '__main__':
    run_resume_import_tests()
