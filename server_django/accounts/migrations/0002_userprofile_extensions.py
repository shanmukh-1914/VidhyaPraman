# Generated migration for UserProfile extension points & auth fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='userprofile',
            name='skills_list',
        ),
        migrations.AddField(
            model_name='userprofile',
            name='email',
            field=models.EmailField(blank=True, default='', max_length=254),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='avatar_url',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='auth_provider',
            field=models.CharField(default='local', max_length=50),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='linked_providers',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='google_id',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='google_email',
            field=models.EmailField(blank=True, default='', max_length=254),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='github_id',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='github_repos',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='skills_matrix',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='learning_path',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='module_progress',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='assessment_history',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='badges',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='certifications',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='resume_claims',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='portfolio_resume_data',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AlterField(
            model_name='userprofile',
            name='target_role',
            field=models.CharField(blank=True, default='Full Stack & AI Engineer', max_length=150),
        ),
    ]
