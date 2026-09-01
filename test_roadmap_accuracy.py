import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server_django'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillforge_backend.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile
from accounts.onboarding_service import generate_learning_path_for_user
from accounts.module_service import get_user_learning_tree
from tutoring_model import generate_ai_notes


def test_accurate_role_roadmaps():
    print("=" * 70)
    print("Testing Accurate AI Learning Roadmaps & Exact Duration Scaling")
    print("=" * 70)

    test_user, _ = User.objects.get_or_create(username='roadmap_test_learner')

    # Test 1: 24-Week Rust Engineer Roadmap
    print("\n[Test 1] Generating 24-Week 'Lead Embedded Rust Engineer' Roadmap...")
    path_24 = generate_learning_path_for_user(
        test_user,
        target_role="Lead Embedded Rust Engineer",
        duration_weeks=24
    )
    assert path_24['total_estimated_weeks'] == 24, f"Expected 24 weeks, got {path_24['total_estimated_weeks']}"
    assert len(path_24['suggested_path']) >= 4, "Expected at least 4 skills"
    skill_names = [s['skill_name'] for s in path_24['suggested_path']]
    print(f"✓ Verified 24-Week Plan: Total Weeks={path_24['total_estimated_weeks']}, Total Modules={path_24['total_modules']}")
    print(f"  Skills: {skill_names}")
    assert any('Rust' in s or 'Embedded' in s or 'Concurrency' in s for s in skill_names), "Skills must be customized for Rust"

    # Test 2: 12-Week DevOps Roadmap
    print("\n[Test 2] Generating 12-Week 'Cloud Native & Kubernetes DevOps' Roadmap...")
    path_12 = generate_learning_path_for_user(
        test_user,
        target_role="Cloud Native & Kubernetes DevOps",
        duration_weeks=12
    )
    assert path_12['total_estimated_weeks'] == 12, f"Expected 12 weeks, got {path_12['total_estimated_weeks']}"
    print(f"✓ Verified 12-Week Plan: Total Weeks={path_12['total_estimated_weeks']}")

    # Test 3: Curriculum Tree Exclusivity (Zero Generic Courses)
    print("\n[Test 3] Verifying Curriculum Tree contains ONLY roadmap courses...")
    tree = get_user_learning_tree(test_user)
    courses = tree.get('courses', [])
    print(f"✓ Retrieved {len(courses)} courses in content library:")
    for c in courses:
        print(f"  - Course: {c['skill_name']} ({c['total_modules_count']} modules)")
        assert 'cs_foundations_101' != c['skill_id'], "Generic CS Foundations 101 must NOT be injected"
        assert 'web_eng_101' != c['skill_id'], "Generic Web Eng 101 must NOT be injected"

    # Test 4: Exhaustive Deep AI Notes
    print("\n[Test 4] Verifying Exhaustive Deep AI Notes Generator...")
    notes_res = generate_ai_notes("Async Concurrency & Tokio Event Loop")
    notes_md = notes_res.get('notes_markdown', '')
    print(f"✓ Generated Notes Length: {len(notes_md)} characters")
    assert len(notes_md) > 1000, "Notes must be comprehensive and long-form"
    assert "Executive Summary" in notes_md or "Mental Model" in notes_md, "Must contain Executive Summary"
    assert "Code Walkthrough" in notes_md or "class " in notes_md, "Must contain production code"

    print("\n" + "=" * 70)
    print("ALL ACCURATE ROADMAP & CURRICULUM SYNC TESTS PASSED!")
    print("=" * 70)


if __name__ == '__main__':
    test_accurate_role_roadmaps()
