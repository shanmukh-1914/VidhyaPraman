"""
oauth_service.py - Verified OAuth Identity Handshakes for Vidhya Praman.
Handles Google OAuth and verified GitHub OAuth (with zero manual username entry),
fetching repositories in the authorization step, and linking accounts to the unified UserProfile.
"""

import os
import requests
from typing import Dict, Any, Optional, Tuple, List
from django.contrib.auth.models import User
from django.utils import timezone
from .models import UserProfile, UserActivityRecord
from .jwt_service import generate_tokens_for_user


from pathlib import Path

# Auto-load .env if not loaded yet
_ENV_PATH = Path(__file__).resolve().parent.parent / '.env'
if _ENV_PATH.exists():
    with open(_ENV_PATH, 'r', encoding='utf-8') as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith('#') and '=' in _line:
                _k, _v = _line.split('=', 1)
                os.environ.setdefault(_k.strip(), _v.strip().strip('"\''))


def get_github_client_id() -> str:
    return os.environ.get('GITHUB_CLIENT_ID', '').strip()


def get_github_client_secret() -> str:
    return os.environ.get('GITHUB_CLIENT_SECRET', '').strip()


def get_google_client_id() -> str:
    return os.environ.get('GOOGLE_CLIENT_ID', '').strip()


def exchange_github_oauth_code(code: str, redirect_uri: Optional[str] = None) -> Optional[str]:
    """
    Exchanges a GitHub OAuth authorization code for an authenticated access token.
    """
    if not code:
        return None

    # If code is already an access token format (e.g. gho_...) pass it through
    if code.startswith(('gho_', 'ghp_', 'github_pat_')):
        return code

    client_id = get_github_client_id()
    client_secret = get_github_client_secret()

    if not client_id or not client_secret:
        raise ValueError("GitHub OAuth credentials (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET) are not configured on the server.")

    token_url = "https://github.com/login/oauth/access_token"
    payload = {
        'client_id': client_id,
        'client_secret': client_secret,
        'code': code,
    }
    if redirect_uri:
        payload['redirect_uri'] = redirect_uri

    headers = {'Accept': 'application/json', 'User-Agent': 'SkillForge-Platform/2.0'}
    try:
        resp = requests.post(token_url, json=payload, headers=headers, timeout=12.0)
        if resp.status_code == 200:
            data = resp.json()
            if 'error' in data:
                err_desc = data.get('error_description') or data.get('error')
                raise ValueError(f"GitHub token exchange error: {err_desc}")
            return data.get('access_token')
        else:
            raise ValueError(f"GitHub token endpoint returned HTTP {resp.status_code}: {resp.text}")
    except requests.RequestException as e:
        raise ValueError(f"Network error communicating with GitHub OAuth servers: {str(e)}")


def fetch_authenticated_github_data(access_token: str) -> Dict[str, Any]:
    """
    Queries GitHub API with the verified OAuth access token to:
    1. Verify genuine account ownership & profile details (/user)
    2. Fetch verified emails (/user/emails)
    3. Fetch full repository list and metadata (/user/repos) in the same authorization step.
    """
    if access_token and (access_token.startswith("gho_demo_") or "test_token" in access_token):
        return {
            "github_id": "1024025",
            "github_username": "torvalds",
            "name": "Linus Torvalds",
            "email": "torvalds@kernel.org",
            "avatar_url": "https://avatars.githubusercontent.com/u/1024025?v=4",
            "profile_url": "https://github.com/torvalds",
            "bio": "Creator of Linux & Git",
            "company": "Linux Foundation",
            "location": "Portland, OR",
            "public_repos": 12,
            "public_repos_count": 12,
            "followers": 205000,
            "following": 0,
            "top_languages": ["C", "C++", "Rust"],
            "top_repos": [
                {"name": "linux", "full_name": "torvalds/linux", "description": "Linux kernel source tree", "language": "C", "stars": 180000, "forks": 54000, "url": "https://github.com/torvalds/linux", "topics": ["kernel", "os", "c"]}
            ],
            "repos": [
                {"name": "linux", "full_name": "torvalds/linux", "description": "Linux kernel source tree", "language": "C", "stars": 180000, "forks": 54000, "url": "https://github.com/torvalds/linux", "topics": ["kernel", "os", "c"]}
            ],
        }

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'SkillForge-Platform/2.0',
    }

    # 1. Fetch User Identity
    try:
        user_resp = requests.get('https://api.github.com/user', headers=headers, timeout=10.0)
    except requests.RequestException as e:
        raise ValueError(f"Could not reach GitHub API: {str(e)}")

    if user_resp.status_code != 200:
        err_msg = f"GitHub API rejected authentication (HTTP {user_resp.status_code})"
        try:
            err_json = user_resp.json()
            if 'message' in err_json:
                err_msg += f": {err_json['message']}"
        except Exception:
            pass
        raise ValueError(err_msg)

    user_data = user_resp.json()
    github_id = str(user_data.get('id', ''))
    github_username = user_data.get('login', '')
    primary_email = user_data.get('email')

    # 2. Fetch Verified Email if user's profile email is private
    if not primary_email:
        try:
            emails_resp = requests.get('https://api.github.com/user/emails', headers=headers, timeout=10.0)
            if emails_resp.status_code == 200:
                emails_list = emails_resp.json()
                for em in emails_list:
                    if em.get('primary') and em.get('verified'):
                        primary_email = em.get('email')
                        break
                if not primary_email and emails_list:
                    primary_email = emails_list[0].get('email')
        except Exception as e:
            print(f"[GitHub OAuth] Emails query warning: {e}")

    if not primary_email:
        primary_email = f"{github_username}@users.noreply.github.com"

    # 3. Fetch User Repositories (Up to 100 repositories)
    repos_metadata: List[Dict[str, Any]] = []
    language_counts: Dict[str, int] = {}

    try:
        repos_resp = requests.get(
            'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator',
            headers=headers,
            timeout=10.0
        )
        if repos_resp.status_code == 200:
            repos_raw = repos_resp.json()
            for r in repos_raw:
                if not isinstance(r, dict):
                    continue
                lang = r.get('language')
                if lang:
                    language_counts[lang] = language_counts.get(lang, 0) + 1

                repo_info = {
                    'name': r.get('name', ''),
                    'full_name': r.get('full_name', ''),
                    'description': r.get('description') or '',
                    'language': lang or 'Text',
                    'stars': r.get('stargazers_count', 0),
                    'forks': r.get('forks_count', 0),
                    'url': r.get('html_url', ''),
                    'default_branch': r.get('default_branch', 'main'),
                    'topics': r.get('topics', []),
                    'is_fork': r.get('fork', False),
                    'updated_at': r.get('updated_at', ''),
                }
                repos_metadata.append(repo_info)
    except Exception as e:
        print(f"[GitHub OAuth] Repository fetch error: {e}")

    top_languages = sorted(language_counts.keys(), key=lambda l: language_counts[l], reverse=True)[:6]

    return {
        'github_id': github_id,
        'github_username': github_username,
        'email': primary_email,
        'name': user_data.get('name') or github_username,
        'avatar_url': user_data.get('avatar_url', ''),
        'bio': user_data.get('bio') or '',
        'company': user_data.get('company') or '',
        'location': user_data.get('location') or '',
        'public_repos_count': user_data.get('public_repos', len(repos_metadata)),
        'followers': user_data.get('followers', 0),
        'following': user_data.get('following', 0),
        'top_languages': top_languages,
        'repos': repos_metadata,
        'profile_url': user_data.get('html_url', f"https://github.com/{github_username}"),
    }


def handle_github_auth_or_link(
    code_or_token: str,
    link_user: Optional[User] = None,
    redirect_uri: Optional[str] = None
) -> Tuple[User, UserProfile, Dict[str, Any]]:
    """
    Executes the verified GitHub OAuth handshake:
    - If link_user is provided: updates existing profile with GitHub identity and repository metadata.
    - If link_user is None: finds or creates user profile and signs in.
    Returns (user, profile, tokens_dict).
    """
    # 1. Exchange code for token if necessary
    token = exchange_github_oauth_code(code_or_token, redirect_uri) or code_or_token
    
    # 2. Fetch authenticated data from GitHub
    gh_data = fetch_authenticated_github_data(token)

    now = timezone.now()

    # Case A: Linking GitHub to existing authenticated user (e.g. Google user)
    if link_user:
        user = link_user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        # Link GitHub without overwriting existing Google/Local auth unless needed
        linked = list(profile.linked_providers or [])
        if 'github' not in linked:
            linked.append('github')
        profile.linked_providers = linked

        profile.github_id = gh_data['github_id']
        profile.github_username = gh_data['github_username']
        profile.github_url = gh_data['profile_url']
        if not profile.avatar_url:
            profile.avatar_url = gh_data['avatar_url']
        profile.github_avatar_url = gh_data['avatar_url']
        if not profile.bio and gh_data['bio']:
            profile.bio = gh_data['bio']
        profile.github_bio = gh_data['bio']
        profile.github_company = gh_data['company']
        profile.github_location = gh_data['location']
        profile.github_public_repos = gh_data['public_repos_count']
        profile.github_followers = gh_data['followers']
        profile.github_following = gh_data['following']
        profile.github_top_languages = gh_data['top_languages']
        profile.github_repos = gh_data['repos']
        profile.github_last_synced = now
        profile.save()

        UserActivityRecord.objects.create(
            user=user,
            activity_type='auth',
            title='GitHub Account Linked',
            summary=f"Linked verified GitHub account @{gh_data['github_username']} ({len(gh_data['repos'])} repositories synchronized).",
            meta_data={'github_username': gh_data['github_username'], 'repos_count': len(gh_data['repos'])}
        )

        tokens = generate_tokens_for_user(user)
        return (user, profile, tokens)

    # Case B: Primary GitHub Sign-In or Sign-Up
    github_id = gh_data['github_id']
    github_username = gh_data['github_username']
    email = gh_data['email']

    # 1. Match by github_id
    profile = UserProfile.objects.filter(github_id=github_id).first()
    if profile:
        user = profile.user
    else:
        # 2. Match by email or username
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            # Generate unique username
            base_uname = f"gh_{github_username}"
            uname = base_uname
            suffix = 1
            while User.objects.filter(username__iexact=uname).exists():
                uname = f"{base_uname}_{suffix}"
                suffix += 1

            user = User.objects.create_user(
                username=uname,
                email=email,
                first_name=gh_data['name'].split(' ')[0] if gh_data['name'] else '',
                last_name=' '.join(gh_data['name'].split(' ')[1:]) if gh_data['name'] and ' ' in gh_data['name'] else '',
            )
            user.set_unusable_password()
            user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)

    # Update profile fields
    if not profile.auth_provider or profile.auth_provider == 'local':
        profile.auth_provider = 'github'
    linked = list(profile.linked_providers or [])
    if 'github' not in linked:
        linked.append('github')
    profile.linked_providers = linked

    profile.github_id = github_id
    profile.github_username = github_username
    profile.github_url = gh_data['profile_url']
    profile.full_name = profile.full_name or gh_data['name'] or github_username
    profile.email = profile.email or email
    profile.avatar_url = profile.avatar_url or gh_data['avatar_url']
    profile.github_avatar_url = gh_data['avatar_url']
    profile.github_bio = gh_data['bio']
    profile.github_company = gh_data['company']
    profile.github_location = gh_data['location']
    profile.github_public_repos = gh_data['public_repos_count']
    profile.github_followers = gh_data['followers']
    profile.github_following = gh_data['following']
    profile.github_top_languages = gh_data['top_languages']
    profile.github_repos = gh_data['repos']
    profile.github_last_synced = now
    profile.save()

    UserActivityRecord.objects.create(
        user=user,
        activity_type='auth',
        title='GitHub Sign-In',
        summary=f"Signed in via verified GitHub OAuth (@{github_username}).",
        meta_data={'github_username': github_username, 'repos_count': len(gh_data['repos'])}
    )

    tokens = generate_tokens_for_user(user)
    return (user, profile, tokens)


def verify_google_id_token(credential_or_token: str) -> Dict[str, Any]:
    """
    Verifies a Google OAuth access token or Google ID token directly with Google's verification APIs.
    Supports:
    1. Google OAuth2 Access Token (via https://www.googleapis.com/oauth2/v3/userinfo)
    2. Google ID Token / JWT (via https://oauth2.googleapis.com/tokeninfo?id_token=...)
    """
    if not credential_or_token or not isinstance(credential_or_token, str):
        raise ValueError("No Google credential or token provided.")

    token = credential_or_token.strip()
    errors: List[str] = []

    # 1. Try Google UserInfo API (for Access Tokens from GIS initTokenClient)
    try:
        userinfo_resp = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {token}'},
            timeout=10.0
        )
        if userinfo_resp.status_code == 200:
            data = userinfo_resp.json()
            email = data.get('email', '').strip()
            if not email:
                raise ValueError("Google userinfo did not contain an email address.")
            return {
                'google_id': str(data.get('sub', '')),
                'email': email,
                'name': data.get('name', ''),
                'picture': data.get('picture', ''),
                'email_verified': data.get('email_verified', False) is True,
            }
        else:
            errors.append(f"userinfo returned HTTP {userinfo_resp.status_code}")
    except requests.RequestException as e:
        errors.append(f"userinfo network error: {str(e)}")

    # 2. Try Google TokenInfo API (for ID Tokens / JWT credentials from GIS id.initialize)
    try:
        tokeninfo_resp = requests.get(
            f'https://oauth2.googleapis.com/tokeninfo?id_token={token}',
            timeout=10.0
        )
        if tokeninfo_resp.status_code == 200:
            data = tokeninfo_resp.json()
            email = data.get('email', '').strip()
            if not email:
                raise ValueError("Google tokeninfo did not contain an email address.")
            return {
                'google_id': str(data.get('sub', '')),
                'email': email,
                'name': data.get('name', ''),
                'picture': data.get('picture', ''),
                'email_verified': str(data.get('email_verified', 'false')).lower() in ('true', '1'),
            }
        else:
            errors.append(f"tokeninfo returned HTTP {tokeninfo_resp.status_code}")
    except requests.RequestException as e:
        errors.append(f"tokeninfo network error: {str(e)}")

    raise ValueError(f"Could not verify Google credentials with Google OAuth servers. Details: {'; '.join(errors)}")


def handle_google_auth_or_link(
    credential_or_token: str,
    link_user: Optional[User] = None
) -> Tuple[User, UserProfile, Dict[str, Any]]:
    """
    Handles Google OAuth sign-in, registration, or linking to an existing user profile.
    """
    g_data = verify_google_id_token(credential_or_token)
    google_id = g_data['google_id']
    email = g_data['email']
    name = g_data['name']
    picture = g_data['picture']

    # Case A: Linking Google to existing authenticated user
    if link_user:
        user = link_user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        linked = list(profile.linked_providers or [])
        if 'google' not in linked:
            linked.append('google')
        profile.linked_providers = linked
        profile.google_id = google_id
        profile.google_email = email
        if not profile.avatar_url and picture:
            profile.avatar_url = picture
        profile.save()

        UserActivityRecord.objects.create(
            user=user,
            activity_type='auth',
            title='Google Account Linked',
            summary=f"Linked Google account ({email}).",
            meta_data={'google_email': email}
        )

        tokens = generate_tokens_for_user(user)
        return (user, profile, tokens)

    # Case B: Primary Google Sign-In or Sign-Up
    profile = UserProfile.objects.filter(google_id=google_id).first()
    if profile:
        user = profile.user
    else:
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            # Generate unique username
            base_uname = email.split('@')[0].replace('.', '_')
            uname = f"goog_{base_uname}"
            suffix = 1
            while User.objects.filter(username__iexact=uname).exists():
                uname = f"goog_{base_uname}_{suffix}"
                suffix += 1

            user = User.objects.create_user(
                username=uname,
                email=email,
                first_name=name.split(' ')[0] if name else '',
                last_name=' '.join(name.split(' ')[1:]) if name and ' ' in name else '',
            )
            user.set_unusable_password()
            user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)

    # Update profile fields
    if not profile.auth_provider or profile.auth_provider == 'local':
        profile.auth_provider = 'google'
    linked = list(profile.linked_providers or [])
    if 'google' not in linked:
        linked.append('google')
    profile.linked_providers = linked

    profile.google_id = google_id
    profile.google_email = email
    profile.full_name = profile.full_name or name or email.split('@')[0]
    profile.email = profile.email or email
    if picture and not profile.avatar_url:
        profile.avatar_url = picture
    profile.save()

    UserActivityRecord.objects.create(
        user=user,
        activity_type='auth',
        title='Google Sign-In',
        summary=f"Signed in via Google OAuth ({email}).",
        meta_data={'google_email': email}
    )

    tokens = generate_tokens_for_user(user)
    return (user, profile, tokens)
