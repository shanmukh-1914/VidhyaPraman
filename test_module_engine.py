"""
test_module_engine.py - Test suite for Sequential Modules, AI Long-Form Content Persistence & Global Courses.
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
from accounts.models import UserProfile, ModuleLessonContent
from accounts.module_service import (
    get_user_learning_tree,
    start_skill_course,
    get_or_generate_module_content,
    submit_module_assignment,
    record_module_exam_result,
    GLOBAL_BASIC_COURSES,
)


def run_module_engine_tests():
    print("======================================================================")
    print("Testing Vidhya Praman Learning Module System & Content Engine")
    print("======================================================================")

    # 1. Setup test user
    user, _ = User.objects.get_or_create(username='module_tester_user', email='modtester@vidhyapraman.edu')
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.module_progress = {}
    profile.save()

    # -------------------------------------------------------------------------
    # Test 1: Global Basic Courses for Cold-Start Users
    # -------------------------------------------------------------------------
    print("\n[Test 1] Testing Global Basic-Level Unlocked Courses...")
    tree = get_user_learning_tree(user)
    global_courses = [c for c in tree['courses'] if c.get('is_globally_unlocked')]
    assert len(global_courses) >= 3, f"Expected at least 3 global basic courses, found {len(global_courses)}"
    
    first_global = global_courses[0]
    assert first_global['modules'][0]['is_unlocked'] == True, "Module 1 of global course should be accessible"
    assert first_global['modules'][1]['is_unlocked'] == False, "Module 2 must be locked initially"
    print(f"✓ Global basic courses verified ({len(global_courses)} courses). Module 1 accessible, Module 2 locked.")

    # -------------------------------------------------------------------------
    # Test 2: AI Long-Form Content Engine & (user_id, skill_id, module_id) Persistence
    # -------------------------------------------------------------------------
    print("\n[Test 2] Testing Long-Form Lesson Content Generation & Database Persistence...")
    skill_id = 'cs_foundations_101'
    module_id = 'cs_101_mem'

    # Clear any previous content record
    ModuleLessonContent.objects.filter(user=user, skill_id=skill_id, module_id=module_id).delete()

    # First fetch: generates and persists to DB
    content_1 = get_or_generate_module_content(user, skill_id, module_id, "Memory Architecture & Pointers")
    assert len(content_1['lesson_markdown']) > 500, "Lesson content too short, expected thorough long-form curriculum"
    assert 'assignment' in content_1 and len(content_1['assignment']['prompt']) > 50
    assert len(content_1['exam_questions']) == 5, "Expected 5 module certification exam questions"

    db_record = ModuleLessonContent.objects.filter(user=user, skill_id=skill_id, module_id=module_id).first()
    assert db_record is not None, "Content record not persisted to database!"

    # Second fetch: reads from DB (persisted and unchanged)
    content_2 = get_or_generate_module_content(user, skill_id, module_id)
    assert content_2['lesson_markdown'] == content_1['lesson_markdown'], "Persisted content mismatch on revisit!"
    print(f"✓ AI Long-Form Content ({len(content_1['lesson_markdown'])} chars) generated and persisted to database.")

    # -------------------------------------------------------------------------
    # Test 3: Module Assignment Submission -> Unlocks Exam Readiness
    # -------------------------------------------------------------------------
    print("\n[Test 3] Submitting Module Assignment...")
    sample_code = """
class MemoryManager:
    def __init__(self, size=1024):
        self.buffer = bytearray(size)
    def allocate(self, bytes_needed):
        return True
"""
    assign_res = submit_module_assignment(user, skill_id, module_id, sample_code, "Implemented memory allocation buffer")
    assert assign_res['assignment_passed'] == True
    assert assign_res['exam_ready'] == True
    assert assign_res['next_step'] == 'confirm_proctored_exam'
    print("✓ Module assignment submitted successfully. Next step: confirm_proctored_exam.")

    # -------------------------------------------------------------------------
    # Test 4: Proctored Exam Ingestion & Sequential Lock/Unlock
    # -------------------------------------------------------------------------
    print("\n[Test 4] Ingesting Proctored Exam Outcome -> Unlocking Module 2...")
    # Before exam: Module 2 must still be locked
    tree_before = get_user_learning_tree(user)
    course_state = next(c for c in tree_before['courses'] if c['skill_id'] == skill_id)
    assert course_state['modules'][1]['is_unlocked'] == False, "Module 2 should still be locked before exam pass"

    # Pass exam
    exam_res = record_module_exam_result(
        user=user,
        skill_id=skill_id,
        module_id=module_id,
        outcome='pass',
        score=1.0,
        session_id='proc_test_session_123'
    )
    assert exam_res['exam_passed'] == True

    # After exam: Module 2 must now be UNLOCKED!
    tree_after = get_user_learning_tree(user)
    course_state_after = next(c for c in tree_after['courses'] if c['skill_id'] == skill_id)
    assert course_state_after['modules'][0]['exam_passed'] == True, "Module 1 should be marked exam_passed"
    assert course_state_after['modules'][1]['is_unlocked'] == True, "Module 2 should now be UNLOCKED in sequence!"
    print("✓ Proctored exam outcome ingested. Module 1 passed, Module 2 is now UNLOCKED.")

    # -------------------------------------------------------------------------
    # Test 5: Strict Sequential Enforcement (Module 3 remains locked)
    # -------------------------------------------------------------------------
    print("\n[Test 5] Verifying Strict Sequential Gating for Module 3...")
    assert course_state_after['modules'][2]['is_unlocked'] == False, "Module 3 must remain locked until Module 2 is passed!"
    print("✓ Strict sequential gating verified: Module 3 remains locked until Module 2 is completed.")

    print("\n======================================================================")
    print("ALL MODULE SYSTEM & CONTENT ENGINE TESTS PASSED (5/5)!")
    print("======================================================================")


if __name__ == '__main__':
    run_module_engine_tests()
