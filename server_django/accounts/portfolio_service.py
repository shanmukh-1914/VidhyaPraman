"""
portfolio_service.py - Portfolio & Verified Resume Generation Engine.
Implements:
1. Configurable minimum verification thresholds (skills, projects, credentials).
2. Visibility-gated eligibility check against the single UserProfile graph.
3. Live data compilation of verified skills, badges, projects, and certifications.
4. Dynamic real-time rendered resume templates (Modern Tech, Minimalist Architect, Executive Lead).
"""

from typing import Dict, Any, List, Optional
from django.utils import timezone
from django.contrib.auth.models import User
from .models import UserProfile, UserActivityRecord


# -----------------------------------------------------------------------------
# Configurable Verification Thresholds (Never Hardcoded Magic Numbers)
# -----------------------------------------------------------------------------
DEFAULT_VERIFICATION_THRESHOLDS = {
    'min_verified_skills': 2,        # Minimum skills verified via proctored assessment
    'min_verified_projects': 1,      # Minimum projects verified via GitHub & technical Q&A
    'min_verified_credentials': 1,   # Minimum badges or authenticated certifications
    'min_total_verified_items': 3,   # Overall minimum verified items across graph
    'description': "Requires at least 2 verified skills, 1 verified technical project, and 1 verified badge/certification to unlock official resume generation."
}


def get_portfolio_verification_status(
    user: User,
    custom_thresholds: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Evaluates the user's verified profile data against the configurable threshold.
    Returns locked/unlocked state, progress metrics, and detailed checklist.
    """
    profile, _ = UserProfile.objects.get_or_create(user=user)
    thresholds = custom_thresholds or DEFAULT_VERIFICATION_THRESHOLDS

    # 1. Count Verified Skills
    skills_matrix = profile.skills_matrix or {}
    verified_skills = [
        {'name': k, **v} for k, v in skills_matrix.items()
        if isinstance(v, dict) and v.get('verified', False)
    ]

    # 2. Count Verified Projects
    verified_projects = [
        p for p in (profile.verified_projects or [])
        if isinstance(p, dict) and p.get('is_verified', False)
    ]

    # 3. Count Verified Credentials (Mastery Badges + Authenticated External Certs)
    badges = [b for b in (profile.badges or []) if isinstance(b, dict) and b.get('is_verified', True)]
    verified_certs = [
        c for c in (profile.certifications or [])
        if isinstance(c, dict) and c.get('is_verified', False)
    ]
    total_credentials = len(badges) + len(verified_certs)

    total_verified_items = len(verified_skills) + len(verified_projects) + total_credentials

    # Criteria checks
    skills_met = len(verified_skills) >= thresholds['min_verified_skills']
    projects_met = len(verified_projects) >= thresholds['min_verified_projects']
    credentials_met = total_credentials >= thresholds['min_verified_credentials']
    total_met = total_verified_items >= thresholds['min_total_verified_items']

    is_unlocked = skills_met and projects_met and credentials_met and total_met

    # Checklist with progress for UI
    checklist = [
        {
            'id': 'skills',
            'label': 'Verified Skills (Proctored Tests)',
            'current': len(verified_skills),
            'required': thresholds['min_verified_skills'],
            'met': skills_met,
            'hint': 'Complete 20-Q proctored diagnostic or module exams.',
        },
        {
            'id': 'projects',
            'label': 'Verified Technical Projects',
            'current': len(verified_projects),
            'required': thresholds['min_verified_projects'],
            'met': projects_met,
            'hint': 'Import from GitHub or verify via technical Q&A.',
        },
        {
            'id': 'credentials',
            'label': 'Mastery Badges / Certifications',
            'current': total_credentials,
            'required': thresholds['min_verified_credentials'],
            'met': credentials_met,
            'hint': 'Earn skill completion badges or authenticate external certificates.',
        },
    ]

    # Stored state on profile
    resume_data = profile.portfolio_resume_data or {}
    was_previously_generated = resume_data.get('has_generated', False)

    return {
        'is_unlocked': is_unlocked,
        'has_generated': was_previously_generated,
        'thresholds': thresholds,
        'checklist': checklist,
        'metrics': {
            'verified_skills_count': len(verified_skills),
            'verified_projects_count': len(verified_projects),
            'verified_badges_count': len(badges),
            'verified_certs_count': len(verified_certs),
            'total_credentials_count': total_credentials,
            'total_verified_items': total_verified_items,
        },
        'verified_data': {
            'skills': verified_skills,
            'projects': verified_projects,
            'badges': badges,
            'certifications': verified_certs,
        }
    }


def generate_verified_resume_payload(user: User) -> Dict[str, Any]:
    """
    Compiles the live verified profile graph into an official resume payload
    and unlocks the live resume template renderer.
    """
    profile, _ = UserProfile.objects.get_or_create(user=user)
    status_info = get_portfolio_verification_status(user)

    if not status_info['is_unlocked']:
        return {
            'success': False,
            'error': 'Portfolio / Resume generator remains locked. You must meet all verification criteria before generating an official resume.',
            'status': status_info,
        }

    # Compile official profile data
    verified_skills = status_info['verified_data']['skills']
    verified_projects = status_info['verified_data']['projects']
    badges = status_info['verified_data']['badges']
    certs = status_info['verified_data']['certifications']

    # Update profile portfolio_resume_data state
    resume_state = dict(profile.portfolio_resume_data or {})
    resume_state['has_generated'] = True
    resume_state['last_generated_at'] = timezone.now().isoformat()
    resume_state['verification_token'] = f"VP-RESUME-{profile.id:04d}-{int(timezone.now().timestamp())}"
    profile.portfolio_resume_data = resume_state
    profile.save()

    UserActivityRecord.objects.create(
        user=user,
        activity_type='docs',
        title="Official Verified Resume Generated",
        summary=f"Compiled verified resume with {len(verified_skills)} skills, {len(verified_projects)} projects, and {len(badges) + len(certs)} credentials.",
        meta_data={'token': resume_state['verification_token']}
    )

    templates = [
        {
            'id': 'modern_tech',
            'name': 'Modern Tech Architecture',
            'description': 'Clean, modern layout with distinct skill matrices, verified badge emblems, and GitHub repository links.',
            'color_theme': '#2563eb',
        },
        {
            'id': 'executive_lead',
            'name': 'Executive Engineering Lead',
            'description': 'Structured 2-column layout highlighting technical leadership, verified projects, and cloud certifications.',
            'color_theme': '#0f172a',
        },
        {
            'id': 'minimalist_developer',
            'name': 'Minimalist Systems Engineer',
            'description': 'Crisp typography-driven layout optimized for technical screening, ATS parsers, and verifiable credentials.',
            'color_theme': '#16a34a',
        }
    ]

    resume_payload = {
        'candidate_name': profile.full_name or user.username,
        'email': profile.email or user.email,
        'phone': profile.phone_number or '',
        'target_role': profile.target_role or 'Full Stack & AI Systems Engineer',
        'bio': profile.bio or 'Software Engineer with rigorous, verified competency across full-stack architectures and distributed systems.',
        'github_username': profile.github_username or '',
        'github_url': profile.github_url or (f"https://github.com/{profile.github_username}" if profile.github_username else ''),
        'verification_token': resume_state['verification_token'],
        'generated_at': resume_state['last_generated_at'],
        'verified_skills': verified_skills,
        'verified_projects': verified_projects,
        'mastery_badges': badges,
        'verified_certifications': certs,
    }

    return {
        'success': True,
        'resume_payload': resume_payload,
        'templates': templates,
        'active_template_id': 'modern_tech',
        'verification_status': status_info,
    }
