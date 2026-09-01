from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from .models import UserProfile, UserActivityRecord, ProctoringSessionRecord
from .serializers import (
    UserProfileSerializer,
    SignupSerializer,
    ProfileUpdateSerializer,
    UserActivityRecordSerializer,
)
from .jwt_service import generate_tokens_for_user, decode_jwt_token, JWTAuthentication
from .oauth_service import handle_google_auth_or_link, handle_github_auth_or_link


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth_view(request):
    """
    Exchanges Google OAuth credential/ID token for a platform JWT session.
    Populates single UserProfile with google_id, email, avatar, and linked_providers.
    """
    credential = request.data.get('credential') or request.data.get('id_token') or request.data.get('token')
    if not credential:
        return Response(
            {"error": "Google credential/id_token is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user, profile, tokens = handle_google_auth_or_link(credential)
        return Response({
            "message": "Google authentication successful!",
            "token": tokens['access_token'],
            "tokens": tokens,
            "user": UserProfileSerializer(profile).data,
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": f"Google authentication failed: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def github_auth_view(request):
    """
    Performs verified GitHub OAuth handshake:
    1. Verifies the authenticated identity is genuinely the GitHub account owner via OAuth.
    2. Fetches user's repository list & metadata in the same authorization step.
    3. Populates single UserProfile and issues platform JWT session.
    """
    code = request.data.get('code') or request.data.get('access_token')
    redirect_uri = request.data.get('redirect_uri')
    
    if not code:
        return Response(
            {"error": "GitHub OAuth code or access token is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user, profile, tokens = handle_github_auth_or_link(code, redirect_uri=redirect_uri)
        return Response({
            "message": "GitHub authentication successful!",
            "token": tokens['access_token'],
            "tokens": tokens,
            "user": UserProfileSerializer(profile).data,
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": f"GitHub OAuth authentication failed: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def github_link_view(request):
    """
    Links a verified GitHub account to an existing user (e.g. Google-signed-in user).
    Performs the same OAuth + repo-fetch + identity verification flow without re-onboarding.
    """
    # Resolve user from JWT or session
    user = request.user if request.user and request.user.is_authenticated else None
    
    # Fallback to token/username in payload if direct header was omitted
    if not user:
        auth_header = request.headers.get('Authorization', '')
        if auth_header:
            try:
                auth = JWTAuthentication()
                res = auth.authenticate(request)
                if res:
                    user = res[0]
            except Exception:
                pass

    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()

    if not user:
        return Response(
            {"error": "Authentication required to link GitHub account."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    code = request.data.get('code') or request.data.get('access_token')
    redirect_uri = request.data.get('redirect_uri')
    
    if not code:
        return Response(
            {"error": "GitHub OAuth authorization code is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user, profile, tokens = handle_github_auth_or_link(code, link_user=user, redirect_uri=redirect_uri)
        repos = profile.github_repos
        repos_count = len(repos) if isinstance(repos, (list, dict)) else 0
        return Response({
            "message": f"Successfully linked GitHub account @{profile.github_username}!",
            "user": UserProfileSerializer(profile).data,
            "repos_synced": repos_count,
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": f"Failed to link GitHub account: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def signup_view(request):
    """
    Registers a new local user, creates unified UserProfile, issues platform JWT session.
    """
    serializer = SignupSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        profile = user.profile
        tokens = generate_tokens_for_user(user)
        
        UserActivityRecord.objects.create(
            user=user,
            activity_type='auth',
            title='Account Created',
            summary=f"Registered on Vidhya Praman as {profile.target_role}.",
            meta_data={'auth_provider': 'local'}
        )

        return Response({
            "message": "Account successfully created!",
            "token": tokens['access_token'],
            "tokens": tokens,
            "user": UserProfileSerializer(profile).data
        }, status=status.HTTP_201_CREATED)
    return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def signin_view(request):
    """
    Authenticates user via username or email + password, issues platform JWT session.
    Supports case-insensitive matching and whitespace trimming.
    """
    login_id = str(request.data.get('username') or request.data.get('email') or '').strip()
    password = str(request.data.get('password') or '')

    if not login_id or not password:
        return Response(
            {"error": "Please provide both username/email and password."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 1. Direct Django authentication attempt
    user = authenticate(username=login_id, password=password)
    
    # 2. Case-insensitive username and email fallback matching
    if not user:
        matched_user = User.objects.filter(username__iexact=login_id).first()
        if not matched_user and '@' in login_id:
            matched_user = User.objects.filter(email__iexact=login_id).first()
        if matched_user:
            user = authenticate(username=matched_user.username, password=password)

    if not user:
        return Response(
            {"error": "Invalid credentials. Please check your username and password."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    tokens = generate_tokens_for_user(user)
    profile, _ = UserProfile.objects.get_or_create(user=user)

    UserActivityRecord.objects.create(
        user=user,
        activity_type='auth',
        title='User Signed In',
        summary="Authenticated JWT session established."
    )

    return Response({
        "message": "Login successful!",
        "token": tokens['access_token'],
        "tokens": tokens,
        "user": UserProfileSerializer(profile).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def profile_view(request):
    """
    Retrieves unified UserProfile by validated JWT token or username query param.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    
    if not user:
        username = request.query_params.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()

    if not user:
        # Fallback to first profile if demo
        user = User.objects.first()

    if not user:
        return Response({"error": "User profile not found."}, status=status.HTTP_404_NOT_FOUND)

    profile, _ = UserProfile.objects.get_or_create(user=user)
    return Response({"user": UserProfileSerializer(profile).data})


@api_view(['PUT', 'PATCH'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def update_profile_view(request):
    """
    Updates user personal details and master graph extension points.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username') or request.query_params.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()

    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User could not be identified."}, status=status.HTTP_404_NOT_FOUND)

    profile, _ = UserProfile.objects.get_or_create(user=user)
    serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        updated_profile = serializer.save()
        return Response({
            "message": "Profile updated successfully!",
            "user": UserProfileSerializer(updated_profile).data
        })
    return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def token_refresh_view(request):
    """
    Exchanges a valid refresh token for a new JWT access token.
    """
    refresh_token = request.data.get('refresh_token')
    if not refresh_token:
        return Response({"error": "refresh_token is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payload = decode_jwt_token(refresh_token)
        if payload.get('token_type') != 'refresh':
            return Response({"error": "Invalid token type for refresh."}, status=status.HTTP_400_BAD_REQUEST)

        user_id = payload.get('user_id')
        user = User.objects.get(id=user_id)
        tokens = generate_tokens_for_user(user)
        return Response({"token": tokens['access_token'], "tokens": tokens})
    except Exception as e:
        return Response({"error": f"Token refresh failed: {str(e)}"}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def activity_view(request):
    """
    Retrieves or logs user activity items on the unified profile timeline.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.query_params.get('username') or request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if request.method == 'POST':
        if not user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = UserActivityRecordSerializer(data=request.data)
        if serializer.is_valid():
            activity = serializer.save(user=user)
            return Response(UserActivityRecordSerializer(activity).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if not user:
        return Response([])

    activities = user.activities.all()[:30]
    return Response(UserActivityRecordSerializer(activities, many=True).data)


# -----------------------------------------------------------------------------
# Onboarding Branching & Skill Testing Views
# -----------------------------------------------------------------------------
from .onboarding_service import (
    infer_skills_from_profile,
    generate_20_question_skill_test,
    grade_and_assign_skill_level,
    generate_learning_path_for_user,
    save_user_customized_path,
)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def onboarding_branch_info_view(request):
    """
    Evaluates sign-in method:
    - GitHub profile -> returns inferred skills from repositories.
    - Google profile -> prompts for manual skills or interests.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.query_params.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User could not be identified."}, status=status.HTTP_404_NOT_FOUND)

    profile = user.profile
    is_github = profile.auth_provider == 'github' or 'github' in (profile.linked_providers or [])
    inferred_skills = infer_skills_from_profile(profile) if is_github or profile.github_repos else []

    return Response({
        "username": user.username,
        "auth_provider": profile.auth_provider,
        "linked_providers": profile.linked_providers,
        "is_github": is_github,
        "inferred_skills": inferred_skills,
        "skills_matrix": profile.skills_matrix or {},
        "has_assessed_skills": bool(profile.skills_matrix),
        "has_learning_path": bool(profile.learning_path),
        "target_role": profile.target_role,
    })


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def generate_skill_test_view(request):
    """
    Generates a rigorous 20-question skill test (15 MCQs + 5 Short-Answers).
    """
    skill_name = request.data.get('skill_name')
    difficulty = request.data.get('difficulty', 'medium')
    api_key = request.data.get('api_key')

    if not skill_name:
        return Response({"error": "skill_name is required."}, status=status.HTTP_400_BAD_REQUEST)

    test_data = generate_20_question_skill_test(skill_name, difficulty=difficulty, api_key=api_key)
    return Response(test_data)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def grade_skill_test_view(request):
    """
    Grades the 20-question skill assessment, maps score to level (beginner/intermediate/advanced),
    and updates UserProfile.skills_matrix.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    skill_name = request.data.get('skill_name')
    questions = request.data.get('questions', [])
    answer_key = request.data.get('answer_key', {})
    learner_answers = request.data.get('learner_answers', {})
    proctoring_outcome = request.data.get('proctoring_outcome', 'pass')
    api_key = request.data.get('api_key')

    if not skill_name or not questions:
        return Response({"error": "skill_name and questions are required."}, status=status.HTTP_400_BAD_REQUEST)

    result = grade_and_assign_skill_level(
        user=user,
        skill_name=skill_name,
        questions=questions,
        answer_key=answer_key,
        learner_answers=learner_answers,
        proctoring_outcome=proctoring_outcome,
        api_key=api_key
    )

    profile = user.profile
    return Response({
        "message": f"Assessed '{skill_name}': Assigned level {result['assigned_level'].upper()} ({result['score_percentage']})",
        "result": result,
        "skills_matrix": profile.skills_matrix,
        "user": UserProfileSerializer(profile).data,
    })


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def generate_learning_path_view(request):
    """
    Produces suggested, ORDERED sequence of skills/modules toward target role.
    Stores both suggested_path and custom_path in UserProfile.learning_path with status='suggested' (NOT in-progress).
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    target_role = request.data.get('target_role')
    interests = request.data.get('interests', [])
    duration_weeks = int(request.data.get('duration_weeks') or request.data.get('weeks') or 8)
    api_key = request.data.get('api_key')

    path_data = generate_learning_path_for_user(
        user,
        target_role=target_role,
        interests=interests,
        duration_weeks=duration_weeks,
        api_key=api_key
    )
    profile = user.profile
    return Response({
        "message": f"Suggested {path_data.get('total_estimated_weeks', duration_weeks)}-week learning path generated.",
        "learning_path": path_data,
        "user": UserProfileSerializer(profile).data,
    })


@api_view(['PUT', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def customize_learning_path_view(request):
    """
    Saves user-customized sequence of skills (reordered, added, or removed)
    before any skill is started, preserving original suggested_path.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    custom_path = request.data.get('custom_path', [])
    if not isinstance(custom_path, list):
        return Response({"error": "custom_path must be a list of skills."}, status=status.HTTP_400_BAD_REQUEST)

    updated_path = save_user_customized_path(user, custom_path)
    profile = user.profile
    return Response({
        "message": "Custom learning roadmap updated successfully.",
        "learning_path": updated_path,
        "user": UserProfileSerializer(profile).data,
    })


# -----------------------------------------------------------------------------
# Proctoring Session Lifecycle Bridge (Single Shared Service)
# -----------------------------------------------------------------------------
from .proctoring_service import (
    start_proctored_session,
    analyze_proctoring_frame,
    end_proctored_session,
)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def proctoring_session_start_view(request):
    """
    Registers start of a proctored assessment session.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    session_type = request.data.get('session_type', 'skill_assessment')
    target_name = request.data.get('target_name') or request.data.get('skill_or_module', 'General Assessment')
    metadata = request.data.get('metadata', {})

    res = start_proctored_session(user, session_type, target_name, metadata)
    return Response(res)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def proctoring_analyze_frame_view(request):
    """
    Streams camera frames for real-time malpractice detection:
    - Second Person in frame -> IMMEDIATE MALPRACTICE TERMINATION
    - Second Device detected -> IMMEDIATE MALPRACTICE TERMINATION
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    session_id = request.data.get('session_id')
    image_data = request.data.get('image') or request.data.get('frame')

    if not session_id or not image_data:
        return Response({"error": "session_id and image data are required."}, status=status.HTTP_400_BAD_REQUEST)

    res = analyze_proctoring_frame(user, session_id, image_data)
    return Response(res)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def proctoring_session_end_view(request):
    """
    Finalizes a proctored assessment session, recording outcome: 'pass', 'fail', or 'malpractice'.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    session_id = request.data.get('session_id')
    exam_score = request.data.get('score') or request.data.get('exam_score')
    score_val = float(exam_score) if exam_score is not None else None
    passing_threshold = float(request.data.get('passing_threshold', 0.70))

    if not session_id:
        return Response({"error": "session_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    res = end_proctored_session(user, session_id, exam_score=score_val, passing_threshold=passing_threshold)
    return Response(res)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def proctoring_audit_trail_view(request):
    """
    Retrieves auditable event trail for a proctored session without raw video.
    """
    session_id = request.query_params.get('session_id')
    if not session_id:
        return Response({"error": "session_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    session = ProctoringSessionRecord.objects.filter(session_id=session_id).first()
    if not session:
        return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        "session_id": session.session_id,
        "session_type": session.session_type,
        "target_name": session.target_name,
        "status": session.status,
        "outcome": session.outcome,
        "integrity_score": session.integrity_score,
        "is_terminated": session.is_terminated,
        "termination_reason": session.termination_reason,
        "audit_trail": session.audit_trail,
        "started_at": session.started_at.isoformat(),
        "finalized_at": session.finalized_at.isoformat() if session.finalized_at else None,
    })



# -----------------------------------------------------------------------------
# Learning Module System & Content Engine Views
# -----------------------------------------------------------------------------
from .module_service import (
    get_user_learning_tree,
    start_skill_course,
    get_or_generate_module_content,
    submit_module_assignment,
    record_module_exam_result,
)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def module_tree_view(request):
    """
    Returns the complete sequential module tree for the learner,
    enforcing locked/unlocked state and injecting global cold-start courses.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.query_params.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User could not be identified."}, status=status.HTTP_404_NOT_FOUND)

    tree = get_user_learning_tree(user)
    return Response(tree)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def module_start_skill_view(request):
    """
    Starts a skill course, unlocking its first module.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    skill_id = request.data.get('skill_id')
    if not skill_id:
        return Response({"error": "skill_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    tree = start_skill_course(user, skill_id)
    return Response({
        "message": f"Skill '{skill_id}' activated. Module 1 unlocked.",
        "tree": tree,
    })


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def module_content_view(request):
    """
    Retrieves persisted long-form lesson content or invokes AI engine to generate
    and persist in database keyed by (user, skill_id, module_id).
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    skill_id = request.data.get('skill_id')
    module_id = request.data.get('module_id')
    title = request.data.get('title')
    api_key = request.data.get('api_key')

    if not skill_id or not module_id:
        return Response({"error": "skill_id and module_id are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        content = get_or_generate_module_content(user, skill_id, module_id, module_title=title, api_key=api_key)
        return Response(content)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return Response({"error": f"Failed to load module content: {str(exc)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def module_assignment_submit_view(request):
    """
    Records assignment submission, enabling the proctored exam confirmation screen.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    skill_id = request.data.get('skill_id')
    module_id = request.data.get('module_id')
    submission_code = request.data.get('submission_code')
    submission_notes = request.data.get('submission_notes')

    if not skill_id or not module_id or not submission_code:
        return Response({"error": "skill_id, module_id, and submission_code are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        res = submit_module_assignment(user, skill_id, module_id, submission_code, submission_notes)
        return Response(res)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def module_exam_outcome_view(request):
    """
    Records proctored exam outcome ('pass', 'fail', 'malpractice') and unlocks
    the next sequential module if passed.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    skill_id = request.data.get('skill_id')
    module_id = request.data.get('module_id')
    outcome = request.data.get('outcome', 'pass')
    score = float(request.data.get('score', 1.0))
    session_id = request.data.get('session_id')
    flags = request.data.get('flags', [])

    if not skill_id or not module_id:
        return Response({"error": "skill_id and module_id are required."}, status=status.HTTP_400_BAD_REQUEST)

    res = record_module_exam_result(user, skill_id, module_id, outcome=outcome, score=score, session_id=session_id, proctoring_flags=flags)
    return Response(res)


# -----------------------------------------------------------------------------
# Unified Assessment Outcome Router Views
# -----------------------------------------------------------------------------
from .outcome_service import (
    process_assessment_outcome,
    generate_readiness_check,
    complete_readiness_check,
)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def process_assessment_outcome_view(request):
    """
    Unified entry point for all assessment outcomes:
    1. 'pass' -> Marks complete, unlocks next sequential module.
    2. 'fail' -> Generates weak-topic remediation without resetting to module 1.
    3. 'malpractice' -> Resets ALL progress for that specific skill only (leaves other skills intact).
    4. 'voluntary_exit' -> Pauses cleanly and prepares readiness check.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    assessment_type = request.data.get('assessment_type', 'module_exam')
    skill_id = request.data.get('skill_id')
    module_id = request.data.get('module_id')
    outcome = request.data.get('outcome', 'pass')
    exam_score = request.data.get('score') or request.data.get('exam_score')
    score_val = float(exam_score) if exam_score is not None else None
    per_question = request.data.get('per_question_results', {})
    weak_topics = request.data.get('weak_topics', [])
    session_id = request.data.get('session_id')
    flags = request.data.get('flags', [])

    if not skill_id:
        return Response({"error": "skill_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        res = process_assessment_outcome(
            user=user,
            assessment_type=assessment_type,
            skill_id=skill_id,
            module_id=module_id,
            outcome=outcome,
            exam_score=score_val,
            per_question_results=per_question,
            weak_topics=weak_topics,
            session_id=session_id,
            proctoring_flags=flags,
        )
        return Response(res)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def readiness_check_view(request):
    """
    Retrieves the 3-question readiness check for learners returning from a pause.
    """
    skill_id = request.query_params.get('skill_id')
    if not skill_id:
        return Response({"error": "skill_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    check_data = generate_readiness_check(skill_id.replace('_', ' ').title(), skill_id)
    return Response(check_data)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def complete_readiness_check_view(request):
    """
    Validates readiness check and resumes forward learning progress.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    skill_id = request.data.get('skill_id')
    answers = request.data.get('answers', {})

    if not skill_id:
        return Response({"error": "skill_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    res = complete_readiness_check(user, skill_id, answers)
    return Response(res)


# -----------------------------------------------------------------------------
# Badges & External Certification Views
# -----------------------------------------------------------------------------
from .badge_service import (
    check_and_award_skill_badge,
    verify_external_certificate,
    get_user_badges_and_certifications,
    CURATED_EXTERNAL_CERTS,
)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def check_award_badge_view(request):
    """
    Awards a mastery badge if all modules for the skill are passed,
    and surfaces curated external certification paths.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    skill_id = request.data.get('skill_id')
    if not skill_id:
        return Response({"error": "skill_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    res = check_and_award_skill_badge(user, skill_id)
    return Response(res)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def verify_certificate_upload_view(request):
    """
    Verifies uploaded certificate proof (issuer, verification ID/URL).
    Unverified certificates do NOT count toward stats or resume eligibility.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    title = request.data.get('title')
    issuer = request.data.get('issuer')
    verification_id = request.data.get('verification_id')
    credential_url = request.data.get('credential_url')
    issue_date = request.data.get('issue_date')
    raw_ocr_text = request.data.get('raw_ocr_text')

    if not title or not issuer:
        return Response({"error": "title and issuer are required."}, status=status.HTTP_400_BAD_REQUEST)

    res = verify_external_certificate(
        user=user,
        cert_title=title,
        issuer=issuer,
        verification_id=verification_id,
        credential_url=credential_url,
        issue_date=issue_date,
        raw_ocr_text=raw_ocr_text,
    )
    return Response(res)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def user_credentials_summary_view(request):
    """
    Returns user badges and verified certifications (filtering out unverified uploads).
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.query_params.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    res = get_user_badges_and_certifications(user)
    return Response(res)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def curated_certifications_view(request):
    """
    Returns curated external certifications for a skill or default list.
    """
    skill_id = request.query_params.get('skill_id', 'default')
    certs = CURATED_EXTERNAL_CERTS.get(skill_id, CURATED_EXTERNAL_CERTS['default'])
    return Response({'skill_id': skill_id, 'certifications': certs})


# -----------------------------------------------------------------------------
# Resume Upload & Independent Claim Verification Views
# -----------------------------------------------------------------------------
from .resume_import_service import (
    parse_resume_content,
    generate_project_verification_qa,
    verify_project_claim_answers,
    verify_resume_certificate_claim,
)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def resume_import_parse_view(request):
    """
    Parses an uploaded resume (PDF file, text file, or plain text) into 3 distinct claim types:
    Skills, Projects, and Certificates.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username') or request.POST.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    resume_text = request.data.get('resume_text') or request.data.get('text') or ''
    file_name = request.data.get('file_name') or 'Uploaded Resume'

    # Check for uploaded file (e.g. PDF or text document)
    uploaded_file = request.FILES.get('file') or request.FILES.get('resume_file')
    if uploaded_file:
        file_name = uploaded_file.name
        content_type = getattr(uploaded_file, 'content_type', '')

        if file_name.lower().endswith('.pdf') or 'pdf' in content_type.lower():
            try:
                import pypdf
                pdf_reader = pypdf.PdfReader(uploaded_file)
                extracted_pages = []
                for page in pdf_reader.pages:
                    txt = page.extract_text()
                    if txt:
                        extracted_pages.append(txt)
                resume_text = "\n\n".join(extracted_pages).strip()
            except Exception as e:
                return Response(
                    {"error": f"Could not extract text from uploaded PDF file: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            try:
                raw_bytes = uploaded_file.read()
                resume_text = raw_bytes.decode('utf-8', errors='ignore').strip()
            except Exception as e:
                return Response(
                    {"error": f"Could not read uploaded file: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

    if not resume_text or len(resume_text.strip()) < 10:
        return Response(
            {"error": "Please provide a valid PDF file, text document, or paste your resume content (minimum 10 characters)."},
            status=status.HTTP_400_BAD_REQUEST
        )

    res = parse_resume_content(user, resume_text, file_name)
    return Response(res)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def resume_import_claims_view(request):
    """
    Returns current parsed resume claims and their independent verification statuses.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.query_params.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    profile = user.profile
    claims = profile.resume_claims or {'skills': [], 'projects': [], 'certificates': []}
    return Response({
        'claims': claims,
        'verified_projects': profile.verified_projects or [],
        'skills_matrix': profile.skills_matrix or {},
        'certifications': profile.certifications or [],
    })


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def resume_project_qa_generate_view(request):
    """
    Generates 3 deep technical verification questions for a project claim,
    utilizing matched GitHub repository context.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    project_claim_id = request.data.get('project_claim_id')
    if not project_claim_id:
        return Response({"error": "project_claim_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    res = generate_project_verification_qa(user, project_claim_id)
    return Response(res)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def resume_project_qa_submit_view(request):
    """
    Evaluates candidate's answers to project verification questions.
    Merges project on pass; drops silently on fail.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    project_claim_id = request.data.get('project_claim_id')
    answers = request.data.get('answers', {})

    if not project_claim_id:
        return Response({"error": "project_claim_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    res = verify_project_claim_answers(user, project_claim_id, answers)
    return Response(res)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def resume_certificate_claim_verify_view(request):
    """
    Verifies a certificate claim extracted from resume via Prompt 6 verification engine.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    cert_claim_id = request.data.get('cert_claim_id')
    verification_id = request.data.get('verification_id')
    credential_url = request.data.get('credential_url')

    res = verify_resume_certificate_claim(user, cert_claim_id, verification_id, credential_url)
    return Response(res)


# -----------------------------------------------------------------------------
# Portfolio / Verified Resume Generation Views
# -----------------------------------------------------------------------------
from .portfolio_service import (
    get_portfolio_verification_status,
    generate_verified_resume_payload,
)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def portfolio_status_view(request):
    """
    Returns current portfolio/resume generation unlock status and verification checklist.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.query_params.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    status_data = get_portfolio_verification_status(user)
    return Response(status_data)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def portfolio_generate_view(request):
    """
    Generates the verified resume data payload and surfaces live rendered templates.
    """
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        username = request.data.get('username')
        if username:
            user = User.objects.filter(username__iexact=username).first()
    if not user:
        user = User.objects.first()

    if not user:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    res = generate_verified_resume_payload(user)
    if not res.get('success'):
        return Response(res, status=status.HTTP_403_FORBIDDEN)

    return Response(res)


# -----------------------------------------------------------------------------
# Stateless Self-Test Practice Sandbox Views (Zero DB Writes)
# -----------------------------------------------------------------------------
from .practice_service import (
    generate_stateless_practice_test,
    grade_stateless_practice_test,
)


@api_view(['POST'])
@permission_classes([AllowAny])
def practice_test_generate_view(request):
    """
    Generates practice questions for any chosen topic.
    GUARANTEE: Purely in-memory generation. Does not write to DB.
    """
    topic = request.data.get('topic') or 'Python Core & Advanced Internals'
    num_questions = int(request.data.get('num_questions', 5))
    difficulty = request.data.get('difficulty', 'medium')

    res = generate_stateless_practice_test(
        topic=topic,
        num_questions=min(max(num_questions, 1), 20),
        difficulty=difficulty
    )
    return Response(res)


@api_view(['POST'])
@permission_classes([AllowAny])
def practice_test_grade_view(request):
    """
    Grades practice test in-memory and returns instant feedback.
    GUARANTEE: Zero database writes or profile mutations.
    """
    questions = request.data.get('questions', [])
    answer_key = request.data.get('answer_key', {})
    explanations = request.data.get('explanations', {})
    learner_answers = request.data.get('learner_answers', {})

    res = grade_stateless_practice_test(
        questions=questions,
        answer_key=answer_key,
        explanations=explanations,
        learner_answers=learner_answers
    )
    return Response(res)







