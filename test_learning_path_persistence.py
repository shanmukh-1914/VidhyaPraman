import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server_django'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillforge_backend.settings')

for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, 'reconfigure'):
        _s.reconfigure(encoding='utf-8')

django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile
from accounts.onboarding_service import generate_learning_path_for_user
from accounts.module_service import get_user_learning_tree

def verify_persistence():
    print("================================================================")
    print("Testing Learning Path Django Persistence & Refresh Synchronization")
    print("================================================================")

    # 1. Setup test user
    user, _ = User.objects.get_or_create(username='verify_persisted_user', email='verify@skillforge.edu')
    profile, _ = UserProfile.objects.get_or_create(user=user)

    # 2. Generate roadmap through Django service
    print("\n[Step 1] Generating roadmap through Django service...")
    path_record = generate_learning_path_for_user(user, target_role='Cloud Native & Kubernetes DevOps Engineer')
    print(f"✓ Generated: {path_record['target_role']} ({path_record['total_modules']} modules)")

    # 3. Simulate page refresh by fetching fresh from database
    print("\n[Step 2] Simulating page refresh by fetching UserProfile directly from SQLite...")
    fresh_profile = UserProfile.objects.get(user=user)
    saved_path = fresh_profile.learning_path
    
    assert saved_path is not None, "Error: learning_path is None in database"
    assert saved_path.get('target_role') == 'Cloud Native & Kubernetes DevOps Engineer', "Target role mismatch"
    assert len(saved_path.get('custom_path', [])) == 3, f"Expected 3 milestones, got {len(saved_path.get('custom_path', []))}"
    print(f"✓ Verified: {len(saved_path['custom_path'])} milestones successfully loaded from database (Survives Refresh!)")

    # 4. Verify Module Studio synchronization
    print("\n[Step 3] Verifying synchronization with Module Studio learning tree...")
    tree = get_user_learning_tree(user)
    matching_courses = [c for c in tree['courses'] if 'Kubernetes' in c['skill_name'] or 'Linux' in c['skill_name'] or 'Docker' in c['skill_name']]
    assert len(matching_courses) == 3, f"Expected 3 courses in tree, got {len(matching_courses)}"
    print(f"✓ Verified: Module Studio tree automatically contains all {len(matching_courses)} roadmap courses.")

    print("\n================================================================")
    print("ALL PERSISTENCE & REFRESH TESTS PASSED (100%)!")
    print("================================================================")

if __name__ == '__main__':
    verify_persistence()
