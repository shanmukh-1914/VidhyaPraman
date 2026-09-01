from django.urls import path
from .views import (
    google_auth_view,
    github_auth_view,
    github_link_view,
    signup_view,
    signin_view,
    profile_view,
    update_profile_view,
    token_refresh_view,
    activity_view,
    onboarding_branch_info_view,
    generate_skill_test_view,
    grade_skill_test_view,
    generate_learning_path_view,
    customize_learning_path_view,
    proctoring_session_start_view,
    proctoring_analyze_frame_view,
    proctoring_session_end_view,
    proctoring_audit_trail_view,
    module_tree_view,
    module_start_skill_view,
    module_content_view,
    module_assignment_submit_view,
    module_exam_outcome_view,
    process_assessment_outcome_view,
    readiness_check_view,
    complete_readiness_check_view,
    check_award_badge_view,
    verify_certificate_upload_view,
    user_credentials_summary_view,
    curated_certifications_view,
    resume_import_parse_view,
    resume_import_claims_view,
    resume_project_qa_generate_view,
    resume_project_qa_submit_view,
    resume_certificate_claim_verify_view,
    portfolio_status_view,
    portfolio_generate_view,
    practice_test_generate_view,
    practice_test_grade_view,
)

urlpatterns = [
    # OAuth Handshakes
    path('google/', google_auth_view, name='auth_google'),
    path('github/', github_auth_view, name='auth_github'),
    path('github/link/', github_link_view, name='auth_github_link'),
    
    # Local Auth & Session
    path('signup/', signup_view, name='auth_signup'),
    path('signin/', signin_view, name='auth_signin'),
    path('login/', signin_view, name='auth_login'),
    path('refresh/', token_refresh_view, name='auth_token_refresh'),
    
    # Single Source of Truth Profile
    path('profile/', profile_view, name='auth_profile'),
    path('me/', profile_view, name='auth_me'),
    path('profile/update/', update_profile_view, name='auth_profile_update'),
    
    # Activity Timeline
    path('activity/', activity_view, name='auth_activity'),

    # Onboarding Branching & 20-Question Skill Assessments
    path('onboarding/branch-info/', onboarding_branch_info_view, name='onboarding_branch_info'),
    path('onboarding/generate-skill-test/', generate_skill_test_view, name='onboarding_gen_test'),
    path('onboarding/grade-skill-test/', grade_skill_test_view, name='onboarding_grade_test'),
    path('onboarding/generate-path/', generate_learning_path_view, name='onboarding_gen_path'),
    path('onboarding/customize-path/', customize_learning_path_view, name='onboarding_customize_path'),

    # Proctoring Session Lifecycle Bridge (Single Shared Service)
    path('proctoring/session/start/', proctoring_session_start_view, name='proctoring_sess_start'),
    path('proctoring/session/analyze-frame/', proctoring_analyze_frame_view, name='proctoring_analyze_frame'),
    path('proctoring/session/end/', proctoring_session_end_view, name='proctoring_sess_end'),
    path('proctoring/session/audit-trail/', proctoring_audit_trail_view, name='proctoring_audit_trail'),

    # Sequential Learning Module System & Content Engine
    path('modules/tree/', module_tree_view, name='module_tree'),
    path('modules/start-skill/', module_start_skill_view, name='module_start_skill'),
    path('modules/content/', module_content_view, name='module_content'),
    path('modules/assignment/submit/', module_assignment_submit_view, name='module_assignment_submit'),
    path('modules/exam/record-outcome/', module_exam_outcome_view, name='module_exam_record_outcome'),

    # Unified Assessment Outcome Router (Pass / Fail-Remediation / Malpractice-Reset / Voluntary-Exit)
    path('outcomes/process/', process_assessment_outcome_view, name='outcomes_process'),
    path('outcomes/readiness-check/', readiness_check_view, name='outcomes_readiness_check'),
    path('outcomes/readiness-check/submit/', complete_readiness_check_view, name='outcomes_complete_readiness_check'),

    # Badges & External Certification Engine
    path('badges/check-award/', check_award_badge_view, name='badges_check_award'),
    path('badges/summary/', user_credentials_summary_view, name='badges_summary'),
    path('certificates/verify-upload/', verify_certificate_upload_view, name='certificates_verify_upload'),
    path('certificates/curated/', curated_certifications_view, name='certificates_curated'),

    # Resume Upload & Independent Claim Verification Engine
    path('resume/import/parse/', resume_import_parse_view, name='resume_import_parse'),
    path('resume/import/claims/', resume_import_claims_view, name='resume_import_claims'),
    path('resume/import/verify-project-qa/', resume_project_qa_generate_view, name='resume_project_qa_generate'),
    path('resume/import/submit-project-qa/', resume_project_qa_submit_view, name='resume_project_qa_submit'),
    path('resume/import/verify-certificate-claim/', resume_certificate_claim_verify_view, name='resume_cert_claim_verify'),

    # Portfolio & Verified Resume Generation Engine
    path('portfolio/status/', portfolio_status_view, name='portfolio_status'),
    path('portfolio/generate/', portfolio_generate_view, name='portfolio_generate'),

    # Self-Test Practice Sandbox (Strictly Stateless & Unpersisted)
    path('practice/generate/', practice_test_generate_view, name='practice_generate'),
    path('practice/grade/', practice_test_grade_view, name='practice_grade'),
]
