"""
test_portfolio_resume.py - Test suite for Configurable Gated Portfolio & Verified Resume Generation.
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
from accounts.portfolio_service import (
    DEFAULT_VERIFICATION_THRESHOLDS,
    get_portfolio_verification_status,
    generate_verified_resume_payload,
)


def run_portfolio_resume_tests():
    print("======================================================================")
    print("Testing Vidhya Praman Gated Portfolio & Verified Resume Generator")
    print("======================================================================")

    # 1. Setup test user
    user, _ = User.objects.get_or_create(username='portfolio_tester_user', email='portfoliotest@vidhyapraman.edu')
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.full_name = "Morgan Freeman"
    profile.target_role = "Principal Systems Architect"
    profile.bio = "Specializing in low-latency distributed engines and verifiable AI inference."
    profile.skills_matrix = {}
    profile.verified_projects = []
    profile.badges = []
    profile.certifications = []
    profile.portfolio_resume_data = {}
    profile.save()

    # -------------------------------------------------------------------------
    # Test 1: Configurable Threshold Check (Locked State with Detailed Checklist)
    # -------------------------------------------------------------------------
    print("\n[Test 1] Testing Verification Gating & Configurable Thresholds...")
    status_locked = get_portfolio_verification_status(user)
    
    assert status_locked['is_unlocked'] == False, "Must be locked for brand-new empty profile"
    assert status_locked['thresholds']['min_verified_skills'] == 2
    assert status_locked['thresholds']['min_verified_projects'] == 1
    assert status_locked['thresholds']['min_verified_credentials'] == 1
    assert len(status_locked['checklist']) == 3
    print(f"✓ Configurable threshold verified: Generator locked with checklist ({status_locked['checklist'][0]['label']}: {status_locked['checklist'][0]['current']}/{status_locked['checklist'][0]['required']}).")

    # -------------------------------------------------------------------------
    # Test 2: Gating Guard - Refuses Generation when Threshold is Unmet
    # -------------------------------------------------------------------------
    print("\n[Test 2] Attempting Resume Generation while Locked...")
    res_rejected = generate_verified_resume_payload(user)
    assert res_rejected['success'] == False
    assert 'remains locked' in res_rejected['error']
    print("✓ Generation securely blocked: Users below verified threshold cannot generate official resumes.")

    # -------------------------------------------------------------------------
    # Test 3: Satisfying Configurable Threshold Across Graph Extension Points
    # -------------------------------------------------------------------------
    print("\n[Test 3] Accumulating Verified Data Across Prompts 2-7 Graph Extension Points...")
    
    # 3a. Add 2 verified skills (from Prompt 2 diagnostic / Prompt 3 modules)
    profile.skills_matrix = {
        'Python Backend & Architecture': {
            'level': 'advanced',
            'score': 0.95,
            'verified': True,
            'assessed_at': '2026-08-30T10:00:00Z',
        },
        'Async API Systems (FastAPI)': {
            'level': 'advanced',
            'score': 0.92,
            'verified': True,
            'assessed_at': '2026-08-30T10:15:00Z',
        },
    }

    # 3b. Add 1 verified technical project (from Prompt 7 GitHub Q&A)
    profile.verified_projects = [
        {
            'project_id': 'proj_001',
            'title': 'High-Throughput Distributed Task Queue',
            'description': 'Engineered a resilient event-driven message queue with Redis streams and bounded concurrency.',
            'technologies': ['Python', 'FastAPI', 'Redis', 'Docker'],
            'repo_url': 'https://github.com/portfolio_tester_user/distributed-queue',
            'is_verified': True,
            'score': 0.95,
        }
    ]

    # 3c. Add 1 verified credential (Mastery Badge from Prompt 6)
    profile.badges = [
        {
            'badge_id': 'VP-BADGE-PY-99201',
            'skill_name': 'Python Systems Engineering',
            'tier': 'Gold Mastery',
            'is_verified': True,
        }
    ]
    profile.save()

    status_unlocked = get_portfolio_verification_status(user)
    assert status_unlocked['is_unlocked'] == True, "Should now be unlocked"
    assert status_unlocked['metrics']['verified_skills_count'] == 2
    assert status_unlocked['metrics']['verified_projects_count'] == 1
    assert status_unlocked['metrics']['total_credentials_count'] == 1
    print("✓ Threshold met across single graph: Generator unlocked successfully!")

    # -------------------------------------------------------------------------
    # Test 4: Generating Live Verified Resume (Templates Revealed Only After Click)
    # -------------------------------------------------------------------------
    print("\n[Test 4] Generating Official Verified Resume Payload...")
    gen_res = generate_verified_resume_payload(user)
    assert gen_res['success'] == True
    assert 'resume_payload' in gen_res
    assert 'templates' in gen_res
    assert len(gen_res['templates']) >= 3

    payload = gen_res['resume_payload']
    assert payload['candidate_name'] == "Morgan Freeman"
    assert payload['target_role'] == "Principal Systems Architect"
    assert len(payload['verified_skills']) == 2
    assert len(payload['verified_projects']) == 1
    assert len(payload['mastery_badges']) == 1
    assert payload['verification_token'].startswith('VP-RESUME-')
    print(f"✓ Verified resume compiled with live profile data and cryptographic token '{payload['verification_token']}'.")

    # -------------------------------------------------------------------------
    # Test 5: Template Switching Invariant
    # -------------------------------------------------------------------------
    print("\n[Test 5] Verifying Multi-Template Switching Invariant...")
    tpl_ids = [t['id'] for t in gen_res['templates']]
    assert 'modern_tech' in tpl_ids
    assert 'executive_lead' in tpl_ids
    assert 'minimalist_developer' in tpl_ids
    print(f"✓ Multi-template switcher available ({len(tpl_ids)} live rendered templates) without re-verifying eligibility.")

    print("\n======================================================================")
    print("ALL PORTFOLIO & VERIFIED RESUME TESTS PASSED (5/5)!")
    print("======================================================================")


if __name__ == '__main__':
    run_portfolio_resume_tests()
