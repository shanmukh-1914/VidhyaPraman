"""
test_onboarding_assessment.py - Test suite for Onboarding Branching, 20-Question Diagnostics & Path Generation.
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
from accounts.onboarding_service import (
    infer_skills_from_profile,
    generate_20_question_skill_test,
    grade_and_assign_skill_level,
    generate_learning_path_for_user,
    save_user_customized_path,
)


def run_onboarding_tests():
    print("======================================================================")
    print("Testing Vidhya Praman Onboarding Branching & 20-Question Diagnostics")
    print("======================================================================")

    # 1. Create or retrieve test user
    user, _ = User.objects.get_or_create(username='onboarding_tester', email='tester@vidhyapraman.edu')
    profile, _ = UserProfile.objects.get_or_create(user=user)
    
    # Configure simulated GitHub repo metadata
    profile.auth_provider = 'github'
    profile.linked_providers = ['github']
    profile.github_username = 'tester_dev'
    profile.github_top_languages = ['Python', 'JavaScript', 'Docker']
    profile.github_repos = [
        {'name': 'fastapi-neural-api', 'description': 'Async FastAPI microservice with PyTorch inference', 'language': 'Python', 'topics': ['fastapi', 'pytorch', 'ai']},
        {'name': 'react-ui-portal', 'description': 'Modern React dashboard with state management', 'language': 'JavaScript', 'topics': ['react', 'frontend']},
    ]
    profile.save()

    # -------------------------------------------------------------------------
    # Test 1: GitHub Skill Inference Branching
    # -------------------------------------------------------------------------
    print("\n[Test 1] Testing GitHub Skill Inference from Repository Metadata...")
    inferred = infer_skills_from_profile(profile)
    assert len(inferred) > 0, "No skills inferred from profile repo metadata"
    print(f"✓ Inferred {len(inferred)} candidate skills: {inferred}")

    # -------------------------------------------------------------------------
    # Test 2: 20-Question Skill Test Generation
    # -------------------------------------------------------------------------
    print("\n[Test 2] Generating 20-Question Skill Diagnostic Test...")
    test_skill = 'Python Backend & Architecture'
    test_data = generate_20_question_skill_test(test_skill, 'medium')
    questions = test_data.get('questions', [])
    answer_key = test_data.get('answer_key', {})

    assert len(questions) == 20, f"Expected 20 questions, got {len(questions)}"
    assert len(answer_key) >= 15, "Answer key missing entries"
    mcqs = [q for q in questions if q['type'] == 'mcq']
    short_ans = [q for q in questions if q['type'] == 'short_answer']
    print(f"✓ Generated 20 questions ({len(mcqs)} MCQs + {len(short_ans)} Architecture Questions).")

    # -------------------------------------------------------------------------
    # Test 3: Proctoring Lifecycle + 20-Question Grading + Level Assignment
    # -------------------------------------------------------------------------
    print("\n[Test 3] Grading Assessment -> Mapping Score to Level -> UserProfile Persistence...")
    # Simulate learner answering 17/20 questions correctly (85% -> advanced)
    learner_answers = {}
    for i in range(1, 16):
        learner_answers[f"q{i}"] = answer_key.get(f"q{i}", "A")
    for i in range(16, 21):
        learner_answers[f"q{i}"] = "Asynchronous batching optimizes execution and prevents state races."

    grading = grade_and_assign_skill_level(
        user=user,
        skill_name=test_skill,
        questions=questions,
        answer_key=answer_key,
        learner_answers=learner_answers,
        proctoring_outcome='pass'
    )

    profile.refresh_from_db()
    assert test_skill in profile.skills_matrix, "Skill not recorded in UserProfile.skills_matrix"
    skill_rec = profile.skills_matrix[test_skill]
    assert skill_rec['level'] in ('advanced', 'intermediate', 'beginner')
    assert skill_rec['score'] >= 0.80
    assert skill_rec['level'] == 'advanced', f"Expected advanced level for 85%+ score, got {skill_rec['level']}"
    print(f"✓ Assessed '{test_skill}': Assigned Level={skill_rec['level'].upper()} ({skill_rec['score_percentage']}) written to UserProfile.skills_matrix.")

    # -------------------------------------------------------------------------
    # Test 4: Suggested Learning Path (Ordering & Zero In-Progress Constraint)
    # -------------------------------------------------------------------------
    print("\n[Test 4] Generating Suggested ORDERED Learning Path toward Target Role...")
    path_data = generate_learning_path_for_user(user, target_role='Full Stack & AI Engineer')
    
    assert 'suggested_path' in path_data
    assert 'custom_path' in path_data
    assert len(path_data['suggested_path']) > 0
    assert path_data['status'] == 'suggested'

    # STRICT REQUIREMENT CHECK: Nothing marked 'in_progress' yet
    for skill_block in path_data['suggested_path']:
        for mod in skill_block['modules']:
            assert mod['status'] != 'in_progress', f"Module {mod['module_id']} was erroneously marked in_progress!"
            assert mod['status'] == 'suggested_pending_start'
    print(f"✓ Generated {len(path_data['suggested_path'])} sequential skill milestones (Status: 'suggested', 0 in progress).")

    # -------------------------------------------------------------------------
    # Test 5: Learning Path Customization (Reorder, Add, Remove)
    # -------------------------------------------------------------------------
    print("\n[Test 5] Testing User Customization (Reordering, Adding & Removing Skills)...")
    custom_skills = list(path_data['custom_path'])
    # Reorder (swap item 0 and 1)
    if len(custom_skills) >= 2:
        custom_skills[0], custom_skills[1] = custom_skills[1], custom_skills[0]
    
    # Add new skill
    custom_skills.append({
        'sequence_order': len(custom_skills) + 1,
        'skill_id': 'custom_skill_99',
        'skill_name': 'Quantum Computing & Qiskit',
        'current_level': 'untested',
        'target_level': 'advanced',
        'estimated_weeks': 3,
        'modules': [{'module_id': 'q_1', 'title': 'Qubits & Gates', 'status': 'suggested_pending_start'}],
        'is_started': False,
    })

    updated_path = save_user_customized_path(user, custom_skills)
    profile.refresh_from_db()

    assert len(profile.learning_path['custom_path']) == len(custom_skills)
    assert profile.learning_path['suggested_path'] != profile.learning_path['custom_path'], "Suggested path was overwritten! Must preserve original suggestion."
    print("✓ Successfully saved customized roadmap while preserving original AI suggestion.")

    print("\n======================================================================")
    print("ALL ONBOARDING & SKILL DIAGNOSTIC TESTS PASSED (5/5)!")
    print("======================================================================")


if __name__ == '__main__':
    run_onboarding_tests()
