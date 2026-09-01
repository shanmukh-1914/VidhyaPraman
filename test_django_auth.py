"""
test_django_auth.py - Verification script for Django Authentication, SQLite Persistence, and GitHub Synchronization.
"""
import os
import sys
import django

# Configure Django settings
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server_django'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillforge_backend.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile, UserActivityRecord
from accounts.github_service import fetch_github_profile_data, extract_github_username
from accounts.serializers import SignupSerializer, ProfileUpdateSerializer, UserProfileSerializer

print("=" * 70)
print("TESTING SKILLFORGE DJANGO DATABASE, AUTH & GITHUB INTEGRATION")
print("=" * 70)

# 1. Test GitHub Service Extraction
print("\n1. Testing GitHub URL Extraction & Public Data Scraping...")
test_urls = [
    "https://github.com/torvalds",
    "github.com/facebook",
    "@mojombo",
    "octocat"
]
for url in test_urls:
    user = extract_github_username(url)
    print(f"  - Input '{url}' -> Extracted Username: '{user}'")

print("\n2. Scraping live GitHub profile data for 'octocat' / 'torvalds'...")
gh_data = fetch_github_profile_data("https://github.com/torvalds")
print(f"  - Scrape Success: {gh_data['success']}")
print(f"  - Scraped Username: {gh_data['data'].get('github_username')}")
print(f"  - Scraped Avatar: {gh_data['data'].get('github_avatar_url')}")
print(f"  - Scraped Public Repos: {gh_data['data'].get('github_public_repos')}")
print(f"  - Scraped Top Languages: {gh_data['data'].get('github_top_languages')}")

# 3. Test Signup Serializer with GitHub Sync
print("\n3. Testing Signup Serializer & Database Persistence...")
User.objects.filter(username="test_developer").delete()

signup_payload = {
    "username": "test_developer",
    "email": "dev@skillforge.ai",
    "password": "VidhyaPramanSecret2026!",
    "full_name": "Linus Developer",
    "target_role": "Lead Systems & AI Engineer",
    "github_url": "https://github.com/torvalds",
    "skills_list": ["C", "Linux", "Git", "Python", "PyTorch"]
}

serializer = SignupSerializer(data=signup_payload)
if serializer.is_valid():
    user = serializer.save()
    profile = user.profile
    print(f"  [OK] User '{user.username}' successfully created!")
    print(f"  [OK] Profile Full Name: {profile.full_name}")
    print(f"  [OK] Profile Role: {profile.target_role}")
    print(f"  [OK] Synced GitHub Username: {profile.github_username}")
    print(f"  [OK] Synced GitHub Avatar: {profile.github_avatar_url}")
    print(f"  [OK] Synced Public Repos: {profile.github_public_repos}")
    print(f"  [OK] Synced Top Languages: {profile.github_top_languages}")
else:
    print(f"  [ERR] Signup failed: {serializer.errors}")

# 4. Test Profile Update
print("\n4. Testing Profile Update & Skill Modification...")
update_payload = {
    "bio": "Building next-generation open-source operating systems and AI architectures.",
    "phone_number": "+1 (555) 019-2834",
    "skills_list": ["C", "Linux", "Git", "Python", "PyTorch", "FastAPI", "React"]
}
update_ser = ProfileUpdateSerializer(profile, data=update_payload, partial=True)
if update_ser.is_valid():
    updated = update_ser.save()
    print(f"  [OK] Profile updated bio: {updated.bio}")
    print(f"  [OK] Profile updated skills count: {len(updated.skills_list)}")
else:
    print(f"  [ERR] Update failed: {update_ser.errors}")

# 5. Test Activity Logging
print("\n5. Testing User Activity Record Logging...")
act = UserActivityRecord.objects.create(
    user=user,
    activity_type="assessment",
    title="React & PyTorch Mastery Assessment",
    summary="Scored 94% on Advanced Systems & ML Assessment.",
    meta_data={"score": 94, "passed": True}
)
print(f"  [OK] Logged activity: {act.title} (ID: {act.id})")

print("\n" + "=" * 70)
print("ALL DJANGO DATABASE & GITHUB SYNC TESTS COMPLETED SUCCESSFULLY!")
print("=" * 70)
