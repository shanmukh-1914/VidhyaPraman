from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import UserProfile, UserActivityRecord

admin.site.site_header = "Vidhya Praman Administration"
admin.site.site_title = "Vidhya Praman Admin Portal"
admin.site.index_title = "Vidhya Praman Database Control Center"


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'User Profile'
    fk_name = 'user'
    extra = 0
    readonly_fields = ('created_at', 'updated_at', 'github_last_synced')


# Unregister standard User and re-register with UserProfile inline
admin.site.unregister(User)

@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'date_joined')  # type: ignore[assignment]
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'groups')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (  # type: ignore[assignment]
        'user',
        'full_name',
        'target_role',
        'github_username',
        'github_public_repos',
        'github_followers',
        'created_at',
    )
    search_fields = ('user__username', 'user__email', 'full_name', 'github_username', 'target_role')
    list_filter = ('target_role', 'created_at', 'updated_at')
    readonly_fields = ('created_at', 'updated_at', 'github_last_synced')
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'full_name', 'bio', 'phone_number', 'target_role', 'skills_list')
        }),
        ('GitHub Integration', {
            'fields': (
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
                'github_last_synced',
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(UserActivityRecord)
class UserActivityRecordAdmin(admin.ModelAdmin):
    list_display = ('user', 'activity_type', 'title', 'created_at')  # type: ignore[assignment]
    search_fields = ('user__username', 'user__email', 'title', 'summary')
    list_filter = ('activity_type', 'created_at')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    fieldsets = (
        ('Activity Details', {
            'fields': ('user', 'activity_type', 'title', 'summary')
        }),
        ('Metadata & Timestamps', {
            'fields': ('meta_data', 'created_at')
        }),
    )
