"""
jwt_service.py - Provider-Agnostic JWT Session Issuance and Validation for Vidhya Praman.
Downstream services and clients receive and authenticate pure platform JWTs.
"""

import datetime
import jwt
from typing import Dict, Any, Optional, Tuple
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


JWT_SECRET = getattr(settings, 'SECRET_KEY', 'skillforge-neural-auth-key-secret-2026-xyz-987')
JWT_ALGORITHM = 'HS256'
ACCESS_TOKEN_LIFETIME = datetime.timedelta(days=7)
REFRESH_TOKEN_LIFETIME = datetime.timedelta(days=30)


def generate_tokens_for_user(user: User) -> Dict[str, Any]:
    """
    Issues a unified, provider-agnostic JWT Access & Refresh Token pair for a user.
    """
    from .models import UserProfile
    profile = UserProfile.objects.filter(user=user).first() or getattr(user, 'profile', None)
    now = datetime.datetime.now(datetime.timezone.utc)
    
    access_payload = {
        'user_id': user.id,
        'username': user.username,
        'email': user.email or (profile.email if profile else ''),
        'full_name': (profile.full_name if profile else '') or user.get_full_name() or user.username,
        'auth_provider': profile.auth_provider if profile else 'local',
        'linked_providers': profile.linked_providers if profile else ['local'],
        'target_role': profile.target_role if profile else 'Full Stack & AI Engineer',
        'iat': int(now.timestamp()),
        'exp': int((now + ACCESS_TOKEN_LIFETIME).timestamp()),
        'token_type': 'access',
    }
    
    refresh_payload = {
        'user_id': user.id,
        'username': user.username,
        'iat': int(now.timestamp()),
        'exp': int((now + REFRESH_TOKEN_LIFETIME).timestamp()),
        'token_type': 'refresh',
    }
    
    access_token = jwt.encode(access_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    refresh_token = jwt.encode(refresh_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'expires_in': int(ACCESS_TOKEN_LIFETIME.total_seconds()),
        'token_type': 'Bearer',
    }


def decode_jwt_token(token_str: str) -> Dict[str, Any]:
    """
    Decodes and validates a platform JWT token. Raises AuthenticationFailed on failure.
    """
    if not token_str:
        raise AuthenticationFailed("No token provided.")
        
    try:
        payload = jwt.decode(token_str, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationFailed("Session token has expired. Please re-authenticate.")
    except jwt.InvalidTokenError as e:
        raise AuthenticationFailed(f"Invalid authentication token: {str(e)}")


class JWTAuthentication(BaseAuthentication):
    """
    Custom Django REST Framework Authentication class for Vidhya Praman JWTs.
    Supports 'Authorization: Bearer <jwt>' and 'Authorization: JWT <jwt>'.
    Also falls back to TokenAuth for backwards compatibility if needed.
    """
    def authenticate(self, request) -> Optional[Tuple[User, Dict[str, Any]]]:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header:
            return None
            
        parts = auth_header.split(' ')
        if len(parts) != 2:
            return None
            
        scheme, token_str = parts[0].strip(), parts[1].strip()
        
        if scheme.lower() not in ('bearer', 'jwt', 'token'):
            return None
            
        try:
            payload = decode_jwt_token(token_str)
            user_id = payload.get('user_id')
            if not user_id:
                return None
                
            user = User.objects.filter(id=user_id).first()
            if not user or not user.is_active:
                return None
                
            return (user, payload)
        except AuthenticationFailed:
            # Check if token is a legacy Django auth_token
            if scheme.lower() == 'token':
                from rest_framework.authtoken.models import Token
                token_obj = Token.objects.filter(key=token_str).first()
                if token_obj and token_obj.user.is_active:
                    return (token_obj.user, {'user_id': token_obj.user.id, 'username': token_obj.user.username})
            # Return None to allow AllowAny / login / signup endpoints to proceed smoothly
            return None
        except Exception:
            return None
