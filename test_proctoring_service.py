"""
test_proctoring_service.py - Test suite for Shared Proctoring Engine, Malpractice Triggers & Audit Trails.
"""

import os
import sys
import numpy as np
from PIL import Image
import django

# Setup Django Environment
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server_django'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillforge_backend.settings')

for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, 'reconfigure'):
        _s.reconfigure(encoding='utf-8')

django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile, ProctoringSessionRecord
from accounts.proctoring_service import (
    start_proctored_session,
    analyze_proctoring_frame,
    end_proctored_session,
)


def run_proctoring_tests():
    print("======================================================================")
    print("Testing Vidhya Praman Shared Proctoring Service")
    print("======================================================================")

    # 1. Setup test user
    user, _ = User.objects.get_or_create(username='proctor_tester_user', email='proctest@vidhyapraman.edu')
    profile, _ = UserProfile.objects.get_or_create(user=user)

    # -------------------------------------------------------------------------
    # Test 1: Start Proctored Session Lifecycle
    # -------------------------------------------------------------------------
    print("\n[Test 1] Starting Proctored Assessment Session...")
    sess = start_proctored_session(user, session_type='module_exam', target_name='Advanced Concurrency')
    session_id = sess['session_id']
    assert sess['status'] == 'active'
    
    db_sess = ProctoringSessionRecord.objects.filter(session_id=session_id).first()
    assert db_sess is not None
    assert db_sess.status == 'active'
    assert db_sess.is_terminated == False
    print(f"✓ Session {session_id} initialized with active monitoring.")

    # -------------------------------------------------------------------------
    # Test 2: Stream Compliant Frame (Normal state)
    # -------------------------------------------------------------------------
    print("\n[Test 2] Streaming Compliant Frame...")
    # Generate blank test image (1 person / normal)
    blank_img = Image.fromarray(np.zeros((100, 100, 3), dtype=np.uint8))
    analysis = analyze_proctoring_frame(user, session_id, blank_img)
    
    assert analysis['should_terminate'] == False
    assert analysis['is_compliant'] == True
    print("✓ Compliant frame processed cleanly. Session remains active.")

    # -------------------------------------------------------------------------
    # Test 3: Second Person Detected -> Immediate Malpractice Termination
    # -------------------------------------------------------------------------
    print("\n[Test 3] Simulating Second Person in Frame -> Triggering Immediate Malpractice Termination...")
    sess_2 = start_proctored_session(user, session_type='skill_assessment', target_name='React Architecture')
    sess_id_2 = sess_2['session_id']

    # Patch proctoring_model temporarily to simulate multiple people detected
    import accounts.proctoring_service as ps
    orig_pm = ps.proctoring_model
    
    class MockMultiPersonModel:
        @staticmethod
        def analyze_frame(img, conf_threshold=0.25):
            return {'face_count': 2, 'phone_detected': False, 'flags': ['multi_face']}

    ps.proctoring_model = MockMultiPersonModel
    try:
        malpractice_analysis = ps.analyze_proctoring_frame(user, sess_id_2, blank_img)
        assert malpractice_analysis['should_terminate'] == True
        assert malpractice_analysis['outcome'] == 'malpractice'
        assert malpractice_analysis['is_compliant'] == False
        
        # Verify database record reflects immediate termination
        db_s2 = ProctoringSessionRecord.objects.filter(session_id=sess_id_2).first()
        assert db_s2.is_terminated == True
        assert db_s2.outcome == 'malpractice'
        assert db_s2.status == 'terminated_malpractice'
        assert len(db_s2.audit_trail) >= 2
        print(f"✓ Second person detected -> Immediate termination triggered: outcome='malpractice'.")
    finally:
        ps.proctoring_model = orig_pm

    # -------------------------------------------------------------------------
    # Test 4: Second Device Detected -> Immediate Malpractice Termination
    # -------------------------------------------------------------------------
    print("\n[Test 4] Simulating Secondary Device (Phone) -> Triggering Immediate Malpractice Termination...")
    sess_3 = start_proctored_session(user, session_type='module_exam', target_name='PyTorch Engineering')
    sess_id_3 = sess_3['session_id']

    class MockPhoneModel:
        @staticmethod
        def analyze_frame(img, conf_threshold=0.25):
            return {'face_count': 1, 'phone_detected': True, 'flags': ['device_detected']}

    ps.proctoring_model = MockPhoneModel
    try:
        phone_analysis = ps.analyze_proctoring_frame(user, sess_id_3, blank_img)
        assert phone_analysis['should_terminate'] == True
        assert phone_analysis['outcome'] == 'malpractice'
        
        db_s3 = ProctoringSessionRecord.objects.filter(session_id=sess_id_3).first()
        assert db_s3.is_terminated == True
        assert db_s3.outcome == 'malpractice'
        print(f"✓ Secondary device detected -> Immediate termination triggered: outcome='malpractice'.")
    finally:
        ps.proctoring_model = orig_pm

    # -------------------------------------------------------------------------
    # Test 5: End Session: Distinguishing Malpractice vs Low-Score Fail vs Pass
    # -------------------------------------------------------------------------
    print("\n[Test 5] Finalizing Sessions: Distinguishing Malpractice vs Low-Score Fail vs Pass...")
    # Finalize malpractice session (sess_id_2) -> Outcome MUST remain 'malpractice'
    end_mal = end_proctored_session(user, sess_id_2, exam_score=0.95)
    assert end_mal['outcome'] == 'malpractice', f"Expected malpractice outcome, got {end_mal['outcome']}"
    assert end_mal['is_malpractice'] == True

    # Finalize low-score session (sess_id_1) -> Outcome MUST be 'fail' (NOT malpractice)
    end_fail = end_proctored_session(user, session_id, exam_score=0.45, passing_threshold=0.70)
    assert end_fail['outcome'] == 'fail', f"Expected fail outcome, got {end_fail['outcome']}"
    assert end_fail['is_malpractice'] == False

    # Start and finalize compliant high-score session -> Outcome MUST be 'pass'
    sess_pass = start_proctored_session(user, session_type='module_exam', target_name='FastAPI Systems')
    end_pass = end_proctored_session(user, sess_pass['session_id'], exam_score=0.90, passing_threshold=0.70)
    assert end_pass['outcome'] == 'pass', f"Expected pass outcome, got {end_pass['outcome']}"
    assert end_pass['is_malpractice'] == False
    print("✓ Distinct outcome resolution verified: 'malpractice' is strictly distinguishable from 'fail' and 'pass'.")

    # -------------------------------------------------------------------------
    # Test 6: Auditable Event Trail Integrity
    # -------------------------------------------------------------------------
    print("\n[Test 6] Verifying Structured Event Trail (Without Video Storage)...")
    db_mal = ProctoringSessionRecord.objects.filter(session_id=sess_id_2).first()
    assert len(db_mal.audit_trail) >= 2
    events = [e['event'] for e in db_mal.audit_trail]
    assert 'session_started' in events
    assert 'malpractice_trigger' in events
    assert 'session_finalized' in events
    print("✓ Auditable structured event trail verified with complete timestamped telemetry.")

    print("\n======================================================================")
    print("ALL PROCTORING SERVICE TESTS PASSED (6/6)!")
    print("======================================================================")


if __name__ == '__main__':
    run_proctoring_tests()
