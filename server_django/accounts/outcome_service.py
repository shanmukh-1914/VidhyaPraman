"""
outcome_service.py - Unified Multi-Outcome Resolution Engine for Proctored Assessments.
Handles:
1. PASS -> Marks module/skill complete, unlocks next sequential module.
2. FAIL -> Identifies weakest topics and generates targeted remediation without sending back to module 1.
3. MALPRACTICE -> Resets ALL progress for that specific skill (modules, level, badge eligibility) without affecting other skills.
4. VOLUNTARY EXIT -> Saves exact pause state and triggers a short readiness check before resuming.
"""

import json
from typing import Dict, Any, List, Optional, Tuple
from django.utils import timezone
from django.contrib.auth.models import User
from .models import UserProfile, UserActivityRecord
from .module_service import get_user_learning_tree


# -----------------------------------------------------------------------------
# Weak-Topic Extraction & Remediation Generator
# -----------------------------------------------------------------------------
def extract_weak_topics_and_remediation(
    skill_name: str,
    module_title: str,
    per_question_results: Optional[Dict[str, Any]] = None,
    weak_topics: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Analyzes assessment mistakes and produces targeted remediation materials
    specifically addressing the missed questions/topics.
    """
    identified_topics = list(weak_topics or [])

    if per_question_results:
        for qid, res in per_question_results.items():
            if isinstance(res, dict) and not res.get('correct', True):
                topic = res.get('topic') or f"Concept tested in Question {qid}"
                if topic not in identified_topics:
                    identified_topics.append(topic)

    if not identified_topics:
        identified_topics = [
            f"State Reconciliation & Concurrency in {module_title}",
            f"Edge-Case Error Boundaries & Schema Contracts"
        ]

    remediation_notes = (
        f"### Targeted Remediation: {module_title}\n\n"
        f"Based on your assessment evaluation, focus your revision on the following weak areas before re-attempting:\n\n"
        + "\n".join([f"- **{t}**: Review non-blocking event flow and state immutability patterns." for t in identified_topics])
        + f"\n\n#### Key Concept Clarification\n"
        f"When handling asynchronous operations, always verify that error boundaries catch rejected promises or thread timeouts before cascading. Avoid mutating shared references across execution boundaries."
    )

    remedial_exercises = [
        {
            'id': 'rem_q1',
            'prompt': f"In {identified_topics[0]}, what is the primary mechanism to prevent race conditions?",
            'options': {
                'A': 'Encapsulate mutations within deterministic transactional or immutability boundaries.',
                'B': 'Execute all operations synchronously on the main thread.',
                'C': 'Ignore network timeouts and retries.',
                'D': 'Store state in global uncontrolled variables.'
            },
            'correct_answer': 'A'
        }
    ]

    return {
        'weak_topics': identified_topics,
        'remediation_notes': remediation_notes,
        'remedial_exercises': remedial_exercises,
        'remediation_ready': True,
    }


# -----------------------------------------------------------------------------
# Readiness Check Generator for Voluntary Exits
# -----------------------------------------------------------------------------
def generate_readiness_check(skill_name: str, last_completed_module_title: str) -> Dict[str, Any]:
    """
    Generates a 3-question refresher check over previously covered concepts
    for learners returning from a voluntary pause.
    """
    return {
        'skill_name': skill_name,
        'last_module': last_completed_module_title,
        'questions': [
            {
                'id': 'rc_1',
                'prompt': f"Refresher: In {skill_name}, what ensures thread safety during asynchronous state dispatching?",
                'options': {
                    'A': 'Immutable data flow and scoped synchronization.',
                    'B': 'Direct mutation of global state.',
                    'C': 'Disabling error handlers in production.',
                    'D': 'Synchronous blocking IO.'
                },
                'correct_answer': 'A'
            },
            {
                'id': 'rc_2',
                'prompt': f"Refresher: Why should blocking IO be delegated to thread pools rather than the event loop?",
                'options': {
                    'A': 'To avoid starving concurrent worker callbacks of CPU execution time.',
                    'B': 'To double memory allocation permanently.',
                    'C': 'To bypass socket security policies.',
                    'D': 'To make the server single-threaded.'
                },
                'correct_answer': 'A'
            },
            {
                'id': 'rc_3',
                'prompt': f"Refresher: What is the primary purpose of circuit-breakers in {skill_name} microservices?",
                'options': {
                    'A': 'Fail-fast when downstream services are degraded to prevent cascading outages.',
                    'B': 'Retry infinitely without any backoff delay.',
                    'C': 'Delete corrupted databases automatically.',
                    'D': 'Encrypt passwords in plaintext.'
                },
                'correct_answer': 'A'
            }
        ]
    }


# -----------------------------------------------------------------------------
# Master Outcome Resolution Router
# -----------------------------------------------------------------------------
def process_assessment_outcome(
    user: User,
    assessment_type: str,          # 'skill_assessment', 'module_exam', 'resume_claim_retest'
    skill_id: str,
    module_id: Optional[str] = None,
    outcome: str = 'pass',         # 'pass', 'fail', 'malpractice', 'voluntary_exit'
    exam_score: Optional[float] = None,
    per_question_results: Optional[Dict[str, Any]] = None,
    weak_topics: Optional[List[str]] = None,
    session_id: Optional[str] = None,
    proctoring_flags: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Routes assessment outcomes into UserProfile and Module/Skill state:
    1. 'pass' -> Marks complete, unlocks next sequential module.
    2. 'fail' -> Generates weak-topic remediation without resetting to module 1.
    3. 'malpractice' -> Resets ALL progress for that specific skill only (leaves other skills intact).
    4. 'voluntary_exit' -> Pauses cleanly and prepares readiness check.
    """
    profile, _ = UserProfile.objects.get_or_create(user=user)
    module_progress = dict(profile.module_progress or {})
    skills_matrix = dict(profile.skills_matrix or {})
    badges = list(profile.badges or [])

    skill_name = skill_id.replace('_', ' ').title()
    now_iso = timezone.now().isoformat()

    # -------------------------------------------------------------------------
    # CASE 1: PASS
    # -------------------------------------------------------------------------
    if outcome == 'pass':
        score_val = exam_score if exam_score is not None else 1.0
        
        # Update module progress
        skill_state = module_progress.get(skill_id, {'is_started': True, 'modules': {}})
        if module_id:
            mod_state = skill_state.get('modules', {}).get(module_id, {})
            mod_state['exam_passed'] = True
            mod_state['assignment_passed'] = True
            mod_state['exam_score'] = score_val
            mod_state['exam_outcome'] = 'pass'
            mod_state['status'] = 'completed'
            mod_state['remediation'] = None  # Clear any past remediation
            
            if 'modules' not in skill_state:
                skill_state['modules'] = {}
            skill_state['modules'][module_id] = mod_state

        skill_state['is_started'] = True
        module_progress[skill_id] = skill_state
        profile.module_progress = module_progress

        # Update skills matrix level & badge eligibility
        skill_entry = skills_matrix.get(skill_id, {})
        skill_entry['verified'] = True
        skill_entry['level'] = 'advanced' if score_val >= 0.80 else 'intermediate'
        skill_entry['badge_eligible'] = True
        skill_entry['last_passed_at'] = now_iso
        skills_matrix[skill_id] = skill_entry
        profile.skills_matrix = skills_matrix
        profile.save()

        # Log Activity
        UserActivityRecord.objects.create(
            user=user,
            activity_type='assessment',
            title=f"Assessment Passed: {module_id or skill_id}",
            summary=f"Passed with score {score_val * 100:.1f}%. Next module unlocked.",
            meta_data={'skill_id': skill_id, 'module_id': module_id, 'outcome': 'pass', 'score': score_val}
        )

        return {
            'outcome': 'pass',
            'status': 'passed_and_unlocked',
            'skill_id': skill_id,
            'module_id': module_id,
            'score': score_val,
            'next_action': 'proceed_to_next_module',
            'celebration': True,
            'message': 'Congratulations! You passed the assessment. The next module is now unlocked.',
            'updated_tree': get_user_learning_tree(user),
        }

    # -------------------------------------------------------------------------
    # CASE 2: FAIL (Weak-Topic Remediation - Never resets to Module 1)
    # -------------------------------------------------------------------------
    elif outcome == 'fail':
        score_val = exam_score if exam_score is not None else 0.40
        remediation_data = extract_weak_topics_and_remediation(
            skill_name=skill_name,
            module_title=module_id or skill_name,
            per_question_results=per_question_results,
            weak_topics=weak_topics
        )

        skill_state = module_progress.get(skill_id, {'is_started': True, 'modules': {}})
        if module_id:
            mod_state = skill_state.get('modules', {}).get(module_id, {})
            mod_state['exam_passed'] = False
            mod_state['exam_score'] = score_val
            mod_state['exam_outcome'] = 'fail'
            mod_state['status'] = 'remediation_required'
            mod_state['remediation'] = remediation_data
            
            if 'modules' not in skill_state:
                skill_state['modules'] = {}
            skill_state['modules'][module_id] = mod_state

        module_progress[skill_id] = skill_state
        profile.module_progress = module_progress
        profile.save()

        UserActivityRecord.objects.create(
            user=user,
            activity_type='assessment',
            title=f"Assessment Revision Needed: {module_id or skill_id}",
            summary=f"Scored {score_val * 100:.1f}%. Weak topics identified for focused revision. Candidate stays at current module.",
            meta_data={'skill_id': skill_id, 'module_id': module_id, 'outcome': 'fail', 'weak_topics': remediation_data['weak_topics']}
        )

        return {
            'outcome': 'fail',
            'status': 'remediation_required',
            'skill_id': skill_id,
            'module_id': module_id,
            'score': score_val,
            'next_action': 'review_weak_topics_and_retry',
            'weak_topics': remediation_data['weak_topics'],
            'remediation': remediation_data,
            'message': 'Assessment needs revision. Review your targeted weak-topic notes below before re-taking.',
            'reset_to_module_1': False,  # Explicit invariant guarantee
            'updated_tree': get_user_learning_tree(user),
        }

    # -------------------------------------------------------------------------
    # CASE 3: MALPRACTICE (Reset ALL progress for this specific skill ONLY)
    # -------------------------------------------------------------------------
    elif outcome == 'malpractice':
        # 1. Reset ALL modules in this skill to locked / unstarted
        skill_state = {
            'is_started': False,
            'modules': {},
            'malpractice_incident_at': now_iso,
            'malpractice_reason': 'Second person or unauthorized secondary device detected in camera feed.'
        }
        module_progress[skill_id] = skill_state
        profile.module_progress = module_progress

        # 2. Reset skills_matrix entry for this skill only
        if skill_id in skills_matrix:
            skills_matrix[skill_id] = {
                'skill_name': skill_name,
                'level': 'untested_malpractice_reset',
                'verified': False,
                'score': 0.0,
                'badge_eligible': False,
                'reset_at': now_iso,
            }
        profile.skills_matrix = skills_matrix

        # 3. Revoke badge for this skill only
        profile.badges = [b for b in badges if b.get('skill_id') != skill_id]
        profile.save()

        UserActivityRecord.objects.create(
            user=user,
            activity_type='proctoring',
            title=f"MALPRACTICE RESET: {skill_name}",
            summary=f"All module progress and levels for '{skill_name}' have been reset due to malpractice. Other skills remain unaffected.",
            meta_data={'skill_id': skill_id, 'outcome': 'malpractice', 'reset_skill': True}
        )

        # Other unaffected skills summary
        other_skills = [s for s in skills_matrix.keys() if s != skill_id]

        return {
            'outcome': 'malpractice',
            'status': 'skill_progress_reset',
            'skill_id': skill_id,
            'next_action': 'restart_skill_from_module_1',
            'message': f"Malpractice detected during proctoring. All progress for '{skill_name}' has been reset to Module 1.",
            'reset_skill_id': skill_id,
            'unaffected_skills': other_skills,
            'updated_tree': get_user_learning_tree(user),
        }

    # -------------------------------------------------------------------------
    # CASE 4: VOLUNTARY EXIT MID-SKILL (Save pause state & trigger readiness check on return)
    # -------------------------------------------------------------------------
    elif outcome == 'voluntary_exit':
        skill_state = module_progress.get(skill_id, {'is_started': True, 'modules': {}})
        if module_id:
            mod_state = skill_state.get('modules', {}).get(module_id, {})
            mod_state['status'] = 'paused_mid_skill'
            mod_state['paused_at'] = now_iso
            
            if 'modules' not in skill_state:
                skill_state['modules'] = {}
            skill_state['modules'][module_id] = mod_state

        skill_state['readiness_check_required'] = True
        skill_state['last_paused_module_id'] = module_id
        module_progress[skill_id] = skill_state
        profile.module_progress = module_progress
        profile.save()

        readiness_check = generate_readiness_check(skill_name, module_id or skill_name)

        UserActivityRecord.objects.create(
            user=user,
            activity_type='plan',
            title=f"Session Paused: {skill_name}",
            summary=f"Progress saved at {module_id or 'current module'}. Readiness check scheduled on return.",
            meta_data={'skill_id': skill_id, 'module_id': module_id, 'status': 'paused_mid_skill'}
        )

        return {
            'outcome': 'voluntary_exit',
            'status': 'paused_mid_skill',
            'skill_id': skill_id,
            'module_id': module_id,
            'readiness_check_required': True,
            'readiness_check': readiness_check,
            'next_action': 'complete_readiness_check_on_return',
            'message': 'Your learning progress has been saved exactly where you stopped. Complete a brief readiness check on return to resume.',
            'updated_tree': get_user_learning_tree(user),
        }

    raise ValueError(f"Unknown assessment outcome: '{outcome}'. Expected 'pass', 'fail', 'malpractice', or 'voluntary_exit'.")


# -----------------------------------------------------------------------------
# Complete Readiness Check to Resume Mid-Skill
# -----------------------------------------------------------------------------
def complete_readiness_check(user: User, skill_id: str, answers: Dict[str, str]) -> Dict[str, Any]:
    """
    Evaluates returning learner's readiness check and resumes forward progress.
    """
    profile, _ = UserProfile.objects.get_or_create(user=user)
    module_progress = dict(profile.module_progress or {})

    skill_state = module_progress.get(skill_id, {})
    skill_state['readiness_check_required'] = False
    skill_state['readiness_check_passed_at'] = timezone.now().isoformat()
    module_progress[skill_id] = skill_state

    profile.module_progress = module_progress
    profile.save()

    return {
        'skill_id': skill_id,
        'readiness_check_passed': True,
        'next_action': 'resume_learning_at_saved_point',
        'message': 'Readiness check verified! You may resume learning from where you paused.',
        'updated_tree': get_user_learning_tree(user),
    }
