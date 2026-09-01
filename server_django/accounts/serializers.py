from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, UserActivityRecord
from .github_service import fetch_github_profile_data, extract_github_username


class UserActivityRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserActivityRecord
        fields = ['id', 'activity_type', 'title', 'summary', 'meta_data', 'created_at']


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    date_joined = serializers.DateTimeField(source='user.date_joined', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'username',
            'email',
            'date_joined',
            'full_name',
            'avatar_url',
            'bio',
            'phone_number',
            'target_role',
            
            # Auth & Linked Providers
            'auth_provider',
            'linked_providers',
            'google_id',
            'google_email',
            
            # GitHub Verified OAuth & Repository Metadata
            'github_id',
            'github_username',
            'github_url',
            'github_avatar_url',
            'github_bio',
            'github_company',
            'github_location',
            'github_public_repos',
            'github_followers',
            'github_following',
            'github_top_languages',
            'github_top_repos',
            'github_repos',
            'github_last_synced',
            
            # Master Graph Extension Points
            'skills_matrix',
            'learning_path',
            'module_progress',
            'assessment_history',
            'badges',
            'certifications',
            'resume_claims',
            'portfolio_resume_data',
            
            'created_at',
            'updated_at',
        ]


class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    full_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    target_role = serializers.CharField(max_length=150, required=False, allow_blank=True)
    skills_matrix = serializers.JSONField(required=False, default=dict)

    def validate_username(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Username cannot be blank.")
        if User.objects.filter(username__iexact=val).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return val

    def validate_email(self, value):
        val = value.strip().lower()
        if not val:
            raise serializers.ValidationError("Email address cannot be blank.")
        if User.objects.filter(email__iexact=val).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return val

    def create(self, validated_data):
        username = validated_data['username'].strip()
        email = validated_data['email'].strip().lower()
        password = validated_data['password']
        full_name = validated_data.get('full_name', '').strip()
        target_role = validated_data.get('target_role', 'Full Stack & AI Engineer')
        skills_matrix = validated_data.get('skills_matrix', {})

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=full_name.split()[0] if full_name else username,
        )

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.full_name = full_name
        profile.email = email
        profile.target_role = target_role or 'Full Stack & AI Engineer'
        profile.skills_matrix = skills_matrix or {}
        profile.auth_provider = 'local'
        profile.linked_providers = ['local']
        profile.save()
        return user


class ProfileUpdateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False)

    class Meta:
        model = UserProfile
        fields = [
            'full_name',
            'avatar_url',
            'bio',
            'phone_number',
            'target_role',
            'email',
            'skills_matrix',
            'learning_path',
            'module_progress',
            'assessment_history',
            'badges',
            'certifications',
            'resume_claims',
            'portfolio_resume_data',
        ]

    def update(self, instance, validated_data):
        email = validated_data.pop('email', None)
        if email:
            instance.user.email = email
            instance.email = email
            instance.user.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance
