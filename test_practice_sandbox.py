"""
test_practice_sandbox.py - Test suite for Unproctored, Stateless Self-Test Practice Sandbox.
Verifies:
1. Generation across any arbitrary topic.
2. Unproctored configuration.
3. Instant in-memory grading and explanations.
4. STRICT ISOLATION CONTRACT: Zero database writes or profile mutations.
"""

import os
import sys
import copy
import django

# Setup Django Environment
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server_django'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillforge_backend.settings')

for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, 'reconfigure'):
        _s.reconfigure(encoding='utf-8')

django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile, UserActivityRecord, ModuleLessonContent
from accounts.practice_service import (
    generate_stateless_practice_test,
    grade_stateless_practice_test,
)


def run_practice_sandbox_tests():
    print("======================================================================")
    print("Testing Vidhya Praman Self-Test Practice Sandbox (Isolated & Unscored)")
    print("======================================================================")

    # 1. Setup baseline user
    user, _ = User.objects.get_or_create(username='practice_tester_user', email='practicetest@vidhyapraman.edu')
    profile, _ = UserProfile.objects.get_or_create(user=user)
    
    # Establish frozen baseline snapshot
    profile.skills_matrix = {'Python Backend': {'level': 'intermediate', 'verified': True}}
    profile.module_progress = {'cs_101_mem': {'status': 'passed'}}
    profile.assessment_history = [{'session_id': 'proc_baseline', 'outcome': 'pass'}]
    profile.badges = [{'badge_id': 'VP-BADGE-001', 'skill_id': 'py_101'}]
    profile.certifications = [{'cert_id': 'CERT-001', 'is_verified': True}]
    profile.save()

    baseline_skills = copy.deepcopy(profile.skills_matrix)
    baseline_modules = copy.deepcopy(profile.module_progress)
    baseline_history = copy.deepcopy(profile.assessment_history)
    baseline_badges = copy.deepcopy(profile.badges)
    baseline_certs = copy.deepcopy(profile.certifications)
    baseline_activity_count = UserActivityRecord.objects.filter(user=user).count()

    # -------------------------------------------------------------------------
    # Test 1: Arbitrary Topic Question Generation (Independent of Learning Path)
    # -------------------------------------------------------------------------
    print("\n[Test 1] Generating Practice Test for Arbitrary Topics...")
    
    # 1a. Preset Domain: System Design & Distributed Architecture
    test_sys = generate_stateless_practice_test(topic='System Design & Distributed Architecture', num_questions=2)
    assert test_sys['is_proctored'] == False
    assert test_sys['database_persistence'] == False
    assert len(test_sys['questions']) == 2
    assert len(test_sys['answer_key']) == 2
    assert len(test_sys['explanations']) == 2
    print(f"✓ Preset domain generated ({len(test_sys['questions'])} questions) with unproctored flag.")

    # 1b. Completely Arbitrary / Non-Path Domain: Quantum Cryptography & QKD
    test_custom = generate_stateless_practice_test(topic='Quantum Key Distribution Protocols', num_questions=3)
    assert test_custom['is_proctored'] == False
    assert len(test_custom['questions']) == 3
    print(f"✓ Custom arbitrary topic generated ({len(test_custom['questions'])} questions) independently of learning path.")

    # -------------------------------------------------------------------------
    # Test 2: Instant In-Memory Grading & Explanations
    # -------------------------------------------------------------------------
    print("\n[Test 2] Evaluating Answers In-Memory...")
    # Provide 1 correct answer and 1 wrong answer
    q1_id = test_sys['questions'][0]['id']
    q2_id = test_sys['questions'][1]['id']
    correct_q1 = test_sys['answer_key'][q1_id]
    wrong_q2 = 'A' if test_sys['answer_key'][q2_id] != 'A' else 'B'

    grade_res = grade_stateless_practice_test(
        questions=test_sys['questions'],
        answer_key=test_sys['answer_key'],
        explanations=test_sys['explanations'],
        learner_answers={q1_id: correct_q1, q2_id: wrong_q2}
    )

    assert grade_res['total_questions'] == 2
    assert grade_res['correct_count'] == 1
    assert grade_res['score_percentage'] == '50.0%'
    assert grade_res['database_persistence'] == False
    assert len(grade_res['detailed_breakdown']) == 2
    assert grade_res['detailed_breakdown'][0]['is_correct'] == True
    assert grade_res['detailed_breakdown'][1]['is_correct'] == False
    assert 'explanation' in grade_res['detailed_breakdown'][0]
    print(f"✓ Instant score computed ({grade_res['score_percentage']}) with detailed per-question conceptual explanations.")

    # -------------------------------------------------------------------------
    # Test 3: STRICT ISOLATION CONTRACT - Zero Database Writes / Mutations
    # -------------------------------------------------------------------------
    print("\n[Test 3] Verifying Strict Isolation Contract (Zero DB Mutations)...")
    profile.refresh_from_db()

    assert profile.skills_matrix == baseline_skills, "skills_matrix must not be modified by practice test"
    assert profile.module_progress == baseline_modules, "module_progress must not be modified by practice test"
    assert profile.assessment_history == baseline_history, "assessment_history must not be modified by practice test"
    assert profile.badges == baseline_badges, "badges must not be modified by practice test"
    assert profile.certifications == baseline_certs, "certifications must not be modified by practice test"

    current_activity_count = UserActivityRecord.objects.filter(user=user).count()
    assert current_activity_count == baseline_activity_count, "No UserActivityRecord rows should be written"
    print("✓ Strict isolation contract verified: Zero database writes or profile mutations across all tables.")

    print("\n======================================================================")
    print("ALL SELF-TEST PRACTICE SANDBOX TESTS PASSED (3/3)!")
    print("======================================================================")


if __name__ == '__main__':
    run_practice_sandbox_tests()
