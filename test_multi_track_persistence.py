import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server_django'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillforge_backend.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile
from accounts.onboarding_service import generate_learning_path_for_user
from accounts.module_service import get_user_learning_tree, start_skill_course


def test_multi_learning_path_persistence():
    print("=" * 70)
    print("Testing Multi-Track Learning Path Retention in Content Library")
    print("=" * 70)

    user, _ = User.objects.get_or_create(username='multi_track_learner_test')

    # 1. First Track: Java FullStack Developer
    print("\n[Track 1] Creating 'Java FullStack Developer' Learning Roadmap (8 Weeks)...")
    path_1 = generate_learning_path_for_user(user, target_role="Java FullStack Developer", duration_weeks=8)
    tree_1 = get_user_learning_tree(user)
    print(f"✓ Track 1 Courses ({tree_1['total_courses']} courses):")
    for c in tree_1['courses']:
        print(f"  - {c['skill_name']} [Track: {c.get('track_name')}]")

    # Start Course 1 from Track 1
    track_1_skill_id = tree_1['courses'][0]['skill_id']
    start_skill_course(user, track_1_skill_id)
    print(f"✓ Started Course 1: {track_1_skill_id}")

    # 2. Second Track: Cloud Native & Kubernetes DevOps Engineer
    print("\n[Track 2] Switching & Creating 'Cloud Native & Kubernetes DevOps Engineer' Roadmap (7 Weeks)...")
    path_2 = generate_learning_path_for_user(user, target_role="Cloud Native & Kubernetes DevOps Engineer", duration_weeks=7)
    tree_2 = get_user_learning_tree(user)
    print(f"\n✓ Content Library Tree Now ({tree_2['total_courses']} total courses from both tracks):")
    for c in tree_2['courses']:
        started_str = "STARTED / UNLOCKED" if c['is_started'] else "Pending"
        active_str = "Active Track" if c.get('is_current_track') else "Enrolled Track"
        print(f"  - [{active_str}] {c['skill_name']} ({c['total_modules_count']} modules) -> Status: {started_str}")

    # Verify both tracks are present
    has_java = any('Java' in c['skill_name'] or 'Spring' in c['skill_name'] or 'JPA' in c['skill_name'] for c in tree_2['courses'])
    has_devops = any('Kubernetes' in c['skill_name'] or 'Docker' in c['skill_name'] or 'Linux' in c['skill_name'] or 'Container' in c['skill_name'] for c in tree_2['courses'])

    assert has_java, "Java FullStack courses must be preserved in Content Library!"
    assert has_devops, "DevOps courses must be present in Content Library!"

    # Verify progression state of previously started course was preserved
    prev_course = next((c for c in tree_2['courses'] if c['skill_id'] == track_1_skill_id), None)
    assert prev_course is not None, "Started course must exist in library!"
    assert prev_course['is_started'] == True, "Started course progress must be retained!"
    assert prev_course['modules'][0]['is_unlocked'] == True, "Module 1 of started course must remain unlocked!"

    print("\n" + "=" * 70)
    print("ALL MULTI-TRACK LEARNING PATH RETENTION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == '__main__':
    test_multi_learning_path_persistence()
