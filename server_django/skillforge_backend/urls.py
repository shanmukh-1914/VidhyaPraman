"""
URL Configuration for SkillForge Django Backend.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({
        "status": "online",
        "service": "SkillForge Django Database & Auth Service",
        "database": "SQLite ORM Connected",
        "version": "1.0.0"
    })

urlpatterns = [
    path('', health_check, name='health_check'),
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/auth/', include('accounts.urls')),
]
