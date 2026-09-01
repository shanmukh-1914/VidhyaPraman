"""
test_badges_certifications.py - Test suite for Dynamic Badge Generation, Skill Award, and External Certificate Verification.
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
from accounts.badge_service import (
    generate_badge_svg,
    check_and_award_skill_badge,
    verify_external_certificate,
    get_user_badges_and_certifications,
    CURATED_EXTERNAL_CERTS,
)
from accounts.module_service import start_skill_course, submit_module_assignment, record_module_exam_result, GLOBAL_BASIC_COURSES


def run_badge_cert_tests():
    print("======================================================================")
    print("Testing Vidhya Praman Badges & Certification Engine")
    print("======================================================================")

    # 1. Setup test user
    user, _ = User.objects.get_or_create(username='badge_tester_user', email='badgetest@vidhyapraman.edu')
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.badges = []
    profile.certifications = []
    profile.module_progress = {}
    profile.save()

    # -------------------------------------------------------------------------
    # Test 1: Dynamic SVG Badge Generator
    # -------------------------------------------------------------------------
    print("\n[Test 1] Testing Dynamic Templated SVG Badge Generation...")
    svg_out = generate_badge_svg(
        skill_name="Python Systems Engineering",
        badge_id="VP-BADGE-TEST-001",
        recipient_name="Alex Mercer"
    )

    assert "<svg" in svg_out and "</svg>" in svg_out
    assert "VIDHYA PRAMAN VERIFIED" in svg_out
    assert "Python Systems Engineering" in svg_out
    assert "Alex Mercer" in svg_out
    assert "VP-BADGE-TEST-001" in svg_out
    print(f"✓ Dynamic SVG Badge generated ({len(svg_out)} bytes) with brand geometry and rendered skill text.")

    # -------------------------------------------------------------------------
    # Test 2: Incomplete Skill -> Does NOT award badge
    # -------------------------------------------------------------------------
    print("\n[Test 2] Testing Incomplete Skill Completion Guard...")
    skill_id = 'py_core_101'
    start_skill_course(user, skill_id)

    # Complete Module 1 only (Module 2 remains incomplete)
    submit_module_assignment(user, skill_id, 'py_101_model', "class Sol:\n pass")
    record_module_exam_result(user, skill_id, 'py_101_model', 'pass', 1.0)

    res_incomplete = check_and_award_skill_badge(user, skill_id)
    assert res_incomplete['badge_awarded'] == False
    assert res_incomplete['completed_modules'] == 1
    print("✓ Incomplete skill guard verified: Badge withheld when skill modules are incomplete.")

    # -------------------------------------------------------------------------
    # Test 3: Complete ALL Modules of Skill -> Awards Mastery Badge
    # -------------------------------------------------------------------------
    print("\n[Test 3] Completing ALL Skill Modules -> Awarding Official Mastery Badge...")
    # Complete remaining modules for py_core_101
    course_def = next(c for c in GLOBAL_BASIC_COURSES if c['skill_id'] == skill_id)
    for m in course_def['modules']:
        submit_module_assignment(user, skill_id, m['module_id'], "class Sol:\n pass")
        record_module_exam_result(user, skill_id, m['module_id'], 'pass', 1.0)

    res_award = check_and_award_skill_badge(user, skill_id)
    assert res_award['badge_awarded'] == True
    assert 'badge' in res_award
    assert res_award['badge']['skill_id'] == skill_id
    assert res_award['badge']['is_verified'] == True
    assert len(res_award['curated_external_certs']) >= 2

    profile.refresh_from_db()
    assert len(profile.badges) == 1
    assert profile.badges[0]['skill_id'] == skill_id
    print(f"✓ Official Mastery Badge awarded and attached to UserProfile for '{skill_id}'.")

    # -------------------------------------------------------------------------
    # Test 4: Curated External Certification Catalog Surfaced
    # -------------------------------------------------------------------------
    print("\n[Test 4] Surfacing Curated External Certification Links...")
    curated = res_award['curated_external_certs']
    assert any('PCAP' in c['title'] or 'Python' in c['title'] for c in curated)
    print(f"✓ Curated external certifications surfaced ({len(curated)} credentials).")

    # -------------------------------------------------------------------------
    # Test 5: External Certificate Upload Authenticity Verification
    # -------------------------------------------------------------------------
    print("\n[Test 5] Testing External Certificate Authenticity Verification Engine...")
    
    # 5a. Valid External AWS Certificate
    res_valid = verify_external_certificate(
        user=user,
        cert_title="AWS Certified Solutions Architect – Associate",
        issuer="Amazon Web Services (AWS)",
        verification_id="AWS-PSA-9948201",
        credential_url="https://www.credly.com/badges/aws-architect-9948201",
        issue_date="2026-06-15"
    )
    assert res_valid['is_verified'] == True
    assert res_valid['counts_toward_resume'] == True
    assert len(res_valid['rejection_reasons']) == 0
    print("✓ Valid external certificate authenticated successfully and marked verified.")

    # 5b. Invalid / Forged External Certificate (Missing Verification ID & Unknown Issuer)
    res_invalid = verify_external_certificate(
        user=user,
        cert_title="Self-Made Hacker Certification",
        issuer="Unknown Fake Academy",
        verification_id="",  # Missing ID
        credential_url=""    # Missing URL
    )
    assert res_invalid['is_verified'] == False
    assert res_invalid['counts_toward_resume'] == False
    assert len(res_invalid['rejection_reasons']) > 0
    print("✓ Invalid certificate rejected as unverified: safely excluded from resume eligibility.")

    # -------------------------------------------------------------------------
    # Test 6: User Credentials Summary Excludes Unverified Uploads
    # -------------------------------------------------------------------------
    print("\n[Test 6] Verifying User Credentials Summary Statistics...")
    summary = get_user_badges_and_certifications(user)
    assert summary['total_badges_count'] == 1
    assert summary['verified_certs_count'] == 1  # Only the AWS cert, NOT the fake one!
    assert len(summary['unverified_certs']) == 1  # The fake one is categorized under unverified
    assert summary['total_verified_credentials'] == 2  # 1 badge + 1 verified cert
    print("✓ Credential summary confirmed: Unverified uploads strictly excluded from verified metrics.")

    print("\n======================================================================")
    print("ALL BADGES & CERTIFICATION TESTS PASSED (6/6)!")
    print("======================================================================")


if __name__ == '__main__':
    run_badge_cert_tests()
