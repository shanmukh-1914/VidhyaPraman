from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    """
    Unified User Profile entity - Single Source of Truth across the entire platform.
    All features (auth, skill assessment, learning paths, module progress, proctoring,
    badges, certifications, resume claims, and portfolio generation) read from and write to this entity.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=150, blank=True, default='')
    email = models.EmailField(max_length=254, blank=True, default='')
    avatar_url = models.CharField(max_length=500, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    phone_number = models.CharField(max_length=30, blank=True, default='')
    target_role = models.CharField(max_length=150, blank=True, default='Full Stack & AI Engineer')
    
    # -------------------------------------------------------------------------
    # Authentication & Identity Graph (Google OAuth + Verified GitHub OAuth)
    # -------------------------------------------------------------------------
    auth_provider = models.CharField(max_length=50, default='local')  # 'google', 'github', 'local'
    linked_providers = models.JSONField(default=list, blank=True)      # e.g., ['google', 'github']
    
    # Google OAuth Metadata
    google_id = models.CharField(max_length=120, blank=True, default='')
    google_email = models.EmailField(max_length=254, blank=True, default='')
    
    # GitHub OAuth Verified Identity & Repositories
    github_id = models.CharField(max_length=120, blank=True, default='')
    github_username = models.CharField(max_length=100, blank=True, default='')
    github_url = models.CharField(max_length=300, blank=True, default='')
    github_avatar_url = models.CharField(max_length=500, blank=True, default='')
    github_bio = models.TextField(blank=True, default='')
    github_company = models.CharField(max_length=150, blank=True, default='')
    github_location = models.CharField(max_length=150, blank=True, default='')
    github_public_repos = models.IntegerField(default=0)
    github_followers = models.IntegerField(default=0)
    github_following = models.IntegerField(default=0)
    github_top_languages = models.JSONField(default=list, blank=True)
    github_top_repos = models.JSONField(default=list, blank=True)
    
    # Stored repository metadata list for project claims & verification
    # [{name, full_name, description, language, stars, forks, url, default_branch, topics, updated_at}]
    github_repos = models.JSONField(default=list, blank=True)
    github_last_synced = models.DateTimeField(null=True, blank=True)
    
    # -------------------------------------------------------------------------
    # Master Graph Extension Points (for downstream prompt features)
    # -------------------------------------------------------------------------
    # Skills Matrix: { skill_name: { level: 'beginner'|'intermediate'|'advanced', score: 0.85, verified: true, assessed_at: '...' } }
    skills_matrix = models.JSONField(default=dict, blank=True)
    
    # Learning Path: { goal: '...', status: 'suggested'|'active', duration_weeks: 6, skills: [...], levels: [...] }
    learning_path = models.JSONField(default=dict, blank=True)
    
    # Module Progress: { module_id: { status: 'locked'|'unlocked'|'in_progress'|'assignment_submitted'|'passed'|'failed', lesson_content: '...', ... } }
    module_progress = models.JSONField(default=dict, blank=True)
    
    # Assessment History: [ { session_id, skill_or_module, score, outcome: 'pass'|'fail'|'malpractice', flags: [...], timestamp } ]
    assessment_history = models.JSONField(default=list, blank=True)
    
    # Badges: [ { badge_id, skill_name, badge_name, badge_image_url, awarded_at } ]
    badges = models.JSONField(default=list, blank=True)
    
    # Certifications: [ { cert_id, title, issuer, credential_id, date, proof_image_url, verification_status: 'verified'|'pending', verified_at } ]
    certifications = models.JSONField(default=list, blank=True)
    
    # Resume Upload Claims: { skills: [...], projects: [...], certificates: [...] }
    resume_claims = models.JSONField(default=dict, blank=True)
    
    # Verified Projects: [ { project_id, title, description, repo_url, technologies: [...], verified_at, score } ]
    verified_projects = models.JSONField(default=list, blank=True)
    
    # Portfolio & Resume Generation State: { is_unlocked: bool, unlocked_at, templates: [...], generated_resumes: [...] }
    portfolio_resume_data = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def skills_list(self):
        return list((self.skills_matrix or {}).keys())

    def __str__(self):
        return f"{self.user.username}'s Profile ({self.full_name or self.user.username}) [Provider: {self.auth_provider}]"


class UserActivityRecord(models.Model):
    """
    Activity history tracking for auth events, assessments, tutor chats, learning plans, and proctoring.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=50)  # 'auth', 'assessment', 'tutoring', 'plan', 'proctoring', 'ocr', 'docs'
    title = models.CharField(max_length=200)
    summary = models.TextField(blank=True, default='')
    meta_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.activity_type}: {self.title}"


class ModuleLessonContent(models.Model):
    """
    Persists AI-generated long-form lesson content, code walkthroughs, assignments,
    and proctored exam questions keyed by (user, skill_id, module_id).
    Ensures generated content is persistent and never regenerated on page reload.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='module_contents')
    skill_id = models.CharField(max_length=100, db_index=True)
    module_id = models.CharField(max_length=100, db_index=True)
    title = models.CharField(max_length=250)
    topic = models.CharField(max_length=200, blank=True, default='')
    
    # Long-form, highly detailed curriculum content
    lesson_markdown = models.TextField()
    learning_objectives = models.JSONField(default=list, blank=True)
    code_examples = models.JSONField(default=list, blank=True)
    key_takeaways = models.JSONField(default=list, blank=True)
    
    # Assignment Specification
    assignment_prompt = models.TextField()
    assignment_starter_code = models.TextField(blank=True, default='')
    assignment_criteria = models.JSONField(default=list, blank=True)
    
    # Proctored Exam Questions (for module verification)
    exam_questions = models.JSONField(default=list, blank=True)
    exam_answer_key = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'skill_id', 'module_id')

    def __str__(self):
        return f"Content for {self.user.username} | {self.skill_id} / {self.module_id} ({self.title})"


class ProctoringSessionRecord(models.Model):
    """
    Persists proctoring session lifecycle, camera monitoring events, and audit trails
    without storing raw video.
    Shared uniformly by skill assessments (Prompt 2), module exams (Prompt 3),
    and resume claim re-tests (Prompt 7).
    """
    session_id = models.CharField(max_length=120, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='proctoring_sessions')
    session_type = models.CharField(max_length=60)  # 'skill_assessment', 'module_exam', 'resume_claim_retest'
    target_name = models.CharField(max_length=200)
    status = models.CharField(max_length=40, default='active')  # 'active', 'terminated_malpractice', 'finalized'
    outcome = models.CharField(max_length=40, default='in_progress')  # 'in_progress', 'pass', 'fail', 'malpractice'
    
    exam_score = models.FloatField(null=True, blank=True)
    integrity_score = models.IntegerField(default=100)
    is_terminated = models.BooleanField(default=False)
    termination_reason = models.CharField(max_length=300, blank=True, default='')
    
    # Auditable lightweight event trail (timestamps & trigger metadata)
    audit_trail = models.JSONField(default=list, blank=True)
    
    started_at = models.DateTimeField(auto_now_add=True)
    finalized_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"Proctoring Session {self.session_id} - {self.user.username} ({self.outcome.upper()})"


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        email = instance.email or ''
        UserProfile.objects.create(
            user=instance,
            full_name=instance.get_full_name() or instance.username,
            email=email,
            auth_provider='local',
            linked_providers=['local'] if not instance.username.startswith('gh_') and not instance.username.startswith('goog_') else []
        )
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()
