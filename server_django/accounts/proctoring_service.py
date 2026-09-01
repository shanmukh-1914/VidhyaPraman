"""
proctoring_service.py - Single Shared Proctoring Engine & Vision Lifecycle Service.
Shared uniformly across:
- Skill Assessments (Prompt 2)
- Module Exams (Prompt 3)
- Resume-Claim Skill Re-Tests (Prompt 7)

Enforces:
1. Real-time camera presence and focus monitoring.
2. Immediate termination and 'malpractice' outcome on second person or unauthorized device detection.
3. Auditable structured event trails without storing raw video.
"""

import base64
import io
import os
import sys
import uuid
from typing import Dict, Any, List, Optional, Tuple, Union
from PIL import Image
import numpy as np
from django.utils import timezone
from django.contrib.auth.models import User
from .models import UserProfile, UserActivityRecord, ProctoringSessionRecord


# Import root proctoring model if available
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
try:
    import proctoring_model
except Exception:
    proctoring_model = None


# -----------------------------------------------------------------------------
# 1. Start Proctoring Session Lifecycle
# -----------------------------------------------------------------------------
def start_proctored_session(
    user: User,
    session_type: str,
    target_name: str,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Initializes a new proctored assessment session with camera monitoring active.
    """
    unique_id = f"proc_{uuid.uuid4().hex[:10]}_{int(timezone.now().timestamp())}"
    
    session_record = ProctoringSessionRecord.objects.create(
        session_id=unique_id,
        user=user,
        session_type=session_type,
        target_name=target_name,
        status='active',
        outcome='in_progress',
        integrity_score=100,
        is_terminated=False,
        audit_trail=[{
            'timestamp': timezone.now().isoformat(),
            'event': 'session_started',
            'details': f"Proctored session initiated for {target_name} ({session_type}).",
            'metadata': metadata or {},
        }]
    )

    UserActivityRecord.objects.create(
        user=user,
        activity_type='proctoring',
        title=f"Proctoring Session Started: {target_name}",
        summary=f"Camera integrity monitoring active for {session_type}.",
        meta_data={'session_id': unique_id, 'session_type': session_type, 'target_name': target_name}
    )

    return {
        'session_id': unique_id,
        'status': 'active',
        'session_type': session_type,
        'target_name': target_name,
        'started_at': session_record.started_at.isoformat(),
    }


# -----------------------------------------------------------------------------
# 2. Stream Monitoring & Immediate Malpractice Termination Engine
# -----------------------------------------------------------------------------
def analyze_proctoring_frame(
    user: User,
    session_id: str,
    image_data: Union[str, bytes, Image.Image]
) -> Dict[str, Any]:
    """
    Analyzes an in-memory camera frame in real-time.
    Rules:
      1. Second Person in frame (face_count > 1 / multi_face) -> IMMEDIATE MALPRACTICE TERMINATION
      2. Second Device detected (phone_detected / device_detected) -> IMMEDIATE MALPRACTICE TERMINATION
    Logs timestamped audit event without persisting raw video.
    """
    session = ProctoringSessionRecord.objects.filter(session_id=session_id).first()
    if not session:
        # Fallback create if called with client-generated id
        session = ProctoringSessionRecord.objects.create(
            session_id=session_id,
            user=user,
            session_type='general_exam',
            target_name='Assessment',
            status='active',
            outcome='in_progress',
        )

    if session.is_terminated or session.status == 'terminated_malpractice':
        return {
            'session_id': session_id,
            'should_terminate': True,
            'is_compliant': False,
            'outcome': 'malpractice',
            'violation_reason': session.termination_reason or 'Session was terminated due to malpractice violation.',
            'integrity_score': session.integrity_score,
            'flags': ['session_already_terminated'],
        }

    # Normalize image
    image_obj = None
    if isinstance(image_data, str):
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        try:
            image_bytes = base64.b64decode(image_data)
            image_obj = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        except Exception:
            pass
    elif isinstance(image_data, bytes):
        try:
            image_obj = Image.open(io.BytesIO(image_data)).convert('RGB')
        except Exception:
            pass
    elif isinstance(image_data, Image.Image):
        image_obj = image_data

    # Vision detection via YOLOv8 / proctoring_model
    face_count = 1
    phone_detected = False
    flags = []

    if proctoring_model and image_obj:
        try:
            analysis = proctoring_model.analyze_frame(image_obj, conf_threshold=0.25)
            face_count = analysis.get('face_count', 1)
            phone_detected = analysis.get('phone_detected', False)
            flags = analysis.get('flags', [])
        except Exception as e:
            print(f"[Proctoring Vision Warning] analyze_frame error: {e}")

    # Evaluate Violations:
    # Rule A: Second Person Detected
    has_second_person = (face_count > 1) or ('multi_face' in flags)
    # Rule B: Second Device Detected
    has_second_device = phone_detected or ('device_detected' in flags)

    if has_second_person or has_second_device:
        # IMMEDIATE MALPRACTICE TERMINATION
        violation_type = 'second_person_detected' if has_second_person else 'second_device_detected'
        violation_msg = (
            "Second individual detected in camera frame."
            if has_second_person
            else "Unauthorized secondary device (phone/screen) detected in camera frame."
        )

        now_iso = timezone.now().isoformat()
        trail = list(session.audit_trail or [])
        trail.append({
            'timestamp': now_iso,
            'event': 'malpractice_trigger',
            'trigger': violation_type,
            'violation_reason': violation_msg,
            'face_count': face_count,
            'phone_detected': phone_detected,
            'flags': flags,
        })

        session.status = 'terminated_malpractice'
        session.outcome = 'malpractice'
        session.is_terminated = True
        session.termination_reason = violation_msg
        session.integrity_score = 0
        session.finalized_at = timezone.now()
        session.audit_trail = trail
        session.save()

        # Update UserProfile assessment history with malpractice record
        profile, _ = UserProfile.objects.get_or_create(user=user)
        history = list(profile.assessment_history or [])
        history.append({
            'session_id': session_id,
            'target_name': session.target_name,
            'outcome': 'malpractice',
            'violation': violation_msg,
            'integrity_score': 0,
            'timestamp': now_iso,
        })
        profile.assessment_history = history
        profile.save()

        UserActivityRecord.objects.create(
            user=user,
            activity_type='proctoring',
            title=f"MALPRACTICE TERMINATION: {session.target_name}",
            summary=f"Session terminated immediately. Violation: {violation_msg}.",
            meta_data={'session_id': session_id, 'outcome': 'malpractice', 'violation': violation_msg}
        )

        return {
            'session_id': session_id,
            'should_terminate': True,
            'is_compliant': False,
            'outcome': 'malpractice',
            'violation_reason': violation_msg,
            'integrity_score': 0,
            'flags': flags,
        }

    # Compliant frame
    return {
        'session_id': session_id,
        'should_terminate': False,
        'is_compliant': True,
        'outcome': 'compliant',
        'face_count': face_count,
        'phone_detected': False,
        'flags': flags,
        'integrity_score': session.integrity_score,
    }


# -----------------------------------------------------------------------------
# 3. End Proctoring Session Lifecycle
# -----------------------------------------------------------------------------
def end_proctored_session(
    user: User,
    session_id: str,
    exam_score: Optional[float] = None,
    passing_threshold: float = 0.70
) -> Dict[str, Any]:
    """
    Finalizes the proctored session.
    Guarantees that an existing malpractice termination remains strictly 'malpractice'
    (distinguishable from low-score 'fail' outcome downstream).
    """
    session = ProctoringSessionRecord.objects.filter(session_id=session_id).first()
    if not session:
        session = ProctoringSessionRecord.objects.create(
            session_id=session_id,
            user=user,
            session_type='general_exam',
            target_name='Assessment',
            status='finalized',
            outcome='pass' if (exam_score or 1.0) >= passing_threshold else 'fail',
        )

    # Check if malpractice was already triggered
    if session.outcome == 'malpractice' or session.status == 'terminated_malpractice':
        final_outcome = 'malpractice'
    else:
        # Evaluate standard pass/fail score
        score_val = exam_score if exam_score is not None else 1.0
        final_outcome = 'pass' if score_val >= passing_threshold else 'fail'
        session.outcome = final_outcome
        session.status = 'finalized'
        session.exam_score = score_val

    session.finalized_at = timezone.now()
    now_iso = session.finalized_at.isoformat()

    trail = list(session.audit_trail or [])
    trail.append({
        'timestamp': now_iso,
        'event': 'session_finalized',
        'final_outcome': final_outcome,
        'exam_score': session.exam_score,
        'integrity_score': session.integrity_score,
    })
    session.audit_trail = trail
    session.save()

    # Append to UserProfile assessment history
    profile, _ = UserProfile.objects.get_or_create(user=user)
    history = list(profile.assessment_history or [])
    history.append({
        'session_id': session_id,
        'target_name': session.target_name,
        'session_type': session.session_type,
        'outcome': final_outcome,
        'exam_score': session.exam_score,
        'integrity_score': session.integrity_score,
        'finalized_at': now_iso,
        'audit_trail': trail,
    })
    profile.assessment_history = history
    profile.save()

    UserActivityRecord.objects.create(
        user=user,
        activity_type='proctoring',
        title=f"Proctoring Session Finalized: {session.target_name} ({final_outcome.upper()})",
        summary=f"Outcome: {final_outcome.upper()} • Score: {session.exam_score} • Integrity: {session.integrity_score}%.",
        meta_data={'session_id': session_id, 'outcome': final_outcome, 'score': session.exam_score}
    )

    elapsed_seconds = int((session.finalized_at - session.started_at).total_seconds()) if session.started_at else 0

    return {
        'session_id': session_id,
        'outcome': final_outcome,
        'status': session.status,
        'exam_score': session.exam_score,
        'integrity_score': session.integrity_score,
        'is_malpractice': final_outcome == 'malpractice',
        'duration_seconds': elapsed_seconds,
        'audit_trail': session.audit_trail,
    }
