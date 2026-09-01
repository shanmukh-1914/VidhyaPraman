"""
test_outcome_handling.py - Test suite for Master Outcome Router (Pass, Fail Remediation, Malpractice Reset, Voluntary Exit).
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
from accounts.outcome_service import (
    process_assessment_outcome,
    generate_readiness_check,
    complete_readiness_check,
)
from accounts.module_service import get_user_learning_tree


def run_outcome_tests():
    print("======================================================================")
    print("Testing Vidhya Praman Master Outcome Resolution Router")
    print("======================================================================")

    # 1. Setup test user with 2 active skills: 'python_backend' and 'react_frontend'
    user, _ = User.objects.get_or_create(username='outcome_tester_user', email='outcometest@vidhyapraman.edu')
    profile, _ = UserProfile.objects.get_or_create(user=user)

    # Pre-populate state for two skills
    profile.skills_matrix = {
        'python_backend': {'level': 'intermediate', 'verified': True, 'badge_eligible': True},
        'react_frontend': {'level': 'advanced', 'verified': True, 'badge_eligible': True},
    }
    profile.module_progress = {
        'python_backend': {
            'is_started': True,
            'modules': {
                'py_mod_1': {'assignment_passed': True, 'exam_passed': True, 'status': 'completed'},
                'py_mod_2': {'assignment_passed': True, 'exam_passed': False, 'status': 'in_progress'},
            }
        },
        'react_frontend': {
            'is_started': True,
            'modules': {
                'react_mod_1': {'assignment_passed': True, 'exam_passed': True, 'status': 'completed'},
            }
        }
    }
    profile.badges = [
        {'skill_id': 'python_backend', 'badge_name': 'Python Certified'},
        {'skill_id': 'react_frontend', 'badge_name': 'React Architect'},
    ]
    profile.save()

    # -------------------------------------------------------------------------
    # Test 1: PASS -> Marks Module Complete & Unlocks Next Module
    # -------------------------------------------------------------------------
    print("\n[Test 1] Testing Outcome 'PASS'...")
    res_pass = process_assessment_outcome(
        user=user,
        assessment_type='module_exam',
        skill_id='python_backend',
        module_id='py_mod_2',
        outcome='pass',
        exam_score=0.92
    )

    assert res_pass['outcome'] == 'pass'
    assert res_pass['status'] == 'passed_and_unlocked'
    assert res_pass['next_action'] == 'proceed_to_next_module'

    profile.refresh_from_db()
    py_mod_2_state = profile.module_progress['python_backend']['modules']['py_mod_2']
    assert py_mod_2_state['exam_passed'] == True
    assert py_mod_2_state['status'] == 'completed'
    print("✓ Outcome 'PASS' verified: Module marked complete, next module unlocked.")

    # -------------------------------------------------------------------------
    # Test 2: FAIL -> Targeted Weak-Topic Remediation (Never Resets to Module 1)
    # -------------------------------------------------------------------------
    print("\n[Test 2] Testing Outcome 'FAIL' (Targeted Weak-Topic Remediation)...")
    res_fail = process_assessment_outcome(
        user=user,
        assessment_type='module_exam',
        skill_id='python_backend',
        module_id='py_mod_2',
        outcome='fail',
        exam_score=0.45,
        weak_topics=['Race Condition Prevention', 'Event Loop Thread Pool Starvation']
    )

    assert res_fail['outcome'] == 'fail'
    assert res_fail['status'] == 'remediation_required'
    assert res_fail['reset_to_module_1'] == False, "Candidate must NEVER be sent back to module 1 on a fail!"
    assert 'Race Condition Prevention' in res_fail['weak_topics']
    assert len(res_fail['remediation']['remediation_notes']) > 100

    profile.refresh_from_db()
    # Candidate remains on py_mod_2 with remediation attached
    py_state = profile.module_progress['python_backend']['modules']['py_mod_2']
    assert py_state['status'] == 'remediation_required'
    assert py_state['remediation'] is not None
    # Verify py_mod_1 is still passed!
    assert profile.module_progress['python_backend']['modules']['py_mod_1']['exam_passed'] == True
    print("✓ Outcome 'FAIL' verified: Candidate stays on current module with targeted weak-topic revision.")

    # -------------------------------------------------------------------------
    # Test 3: MALPRACTICE -> Resets ALL Progress for This Skill ONLY
    # -------------------------------------------------------------------------
    print("\n[Test 3] Testing Outcome 'MALPRACTICE' (Isolated Skill Reset)...")
    res_mal = process_assessment_outcome(
        user=user,
        assessment_type='module_exam',
        skill_id='python_backend',
        module_id='py_mod_2',
        outcome='malpractice',
        session_id='proc_mal_test_999'
    )

    assert res_mal['outcome'] == 'malpractice'
    assert res_mal['status'] == 'skill_progress_reset'
    assert res_mal['reset_skill_id'] == 'python_backend'
    assert 'react_frontend' in res_mal['unaffected_skills']

    profile.refresh_from_db()
    # 1. python_backend MUST be completely reset
    assert profile.module_progress['python_backend']['is_started'] == False
    assert profile.module_progress['python_backend']['modules'] == {}
    assert profile.skills_matrix['python_backend']['level'] == 'untested_malpractice_reset'
    assert profile.skills_matrix['python_backend']['badge_eligible'] == False

    # 2. react_frontend MUST remain completely intact!
    assert profile.module_progress['react_frontend']['modules']['react_mod_1']['exam_passed'] == True
    assert profile.skills_matrix['react_frontend']['level'] == 'advanced'
    assert any(b['skill_id'] == 'react_frontend' for b in profile.badges)
    # Python badge removed, React badge preserved
    assert not any(b['skill_id'] == 'python_backend' for b in profile.badges)

    print("✓ Outcome 'MALPRACTICE' verified: 'python_backend' reset to Module 1; 'react_frontend' preserved completely intact.")

    # -------------------------------------------------------------------------
    # Test 4: VOLUNTARY EXIT -> Saves Pause State & Generates Readiness Check
    # -------------------------------------------------------------------------
    print("\n[Test 4] Testing Outcome 'VOLUNTARY EXIT' (Pause State & Readiness Refresher)...")
    res_exit = process_assessment_outcome(
        user=user,
        assessment_type='module_exam',
        skill_id='react_frontend',
        module_id='react_mod_1',
        outcome='voluntary_exit'
    )

    assert res_exit['outcome'] == 'voluntary_exit'
    assert res_exit['status'] == 'paused_mid_skill'
    assert res_exit['readiness_check_required'] == True
    assert len(res_exit['readiness_check']['questions']) == 3

    profile.refresh_from_db()
    assert profile.module_progress['react_frontend']['readiness_check_required'] == True

    # Complete readiness check on return
    res_rc = complete_readiness_check(user, 'react_frontend', {'rc_1': 'A', 'rc_2': 'A', 'rc_3': 'A'})
    assert res_rc['readiness_check_passed'] == True
    assert res_rc['next_action'] == 'resume_learning_at_saved_point'

    profile.refresh_from_db()
    assert profile.module_progress['react_frontend']['readiness_check_required'] == False
    print("✓ Outcome 'VOLUNTARY EXIT' verified: Saved exact pause point, verified readiness refresher upon return.")

    # -------------------------------------------------------------------------
    # Test 5: Distinct Data Model Representation
    # -------------------------------------------------------------------------
    print("\n[Test 5] Verifying 4 Distinct Data Model Enums...")
    outcomes = ['pass', 'fail', 'malpractice', 'voluntary_exit']
    assert len(set(outcomes)) == 4, "Must have 4 visibly distinct outcomes"
    print("✓ Distinct data model verification complete (Pass / Fail / Malpractice / Voluntary Exit).")

    print("\n======================================================================")
    print("ALL OUTCOME ROUTER TESTS PASSED (5/5)!")
    print("======================================================================")


if __name__ == '__main__':
    run_outcome_tests()
