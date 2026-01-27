# Generated migration for AI Gala models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('students', '0024_seed_badges'),
    ]

    operations = [
        migrations.CreateModel(
            name='Gallery',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(help_text="e.g., 'My AI Superhero Origins'", max_length=200)),
                ('month_label', models.CharField(help_text="e.g., 'Month 1', 'February 2026'", max_length=50)),
                ('theme', models.CharField(help_text="e.g., 'Superhero', 'Time Machine'", max_length=100)),
                ('description', models.TextField()),
                ('instructions', models.TextField(blank=True, help_text='What students should create')),
                ('cover_image_url', models.URLField(blank=True, null=True)),
                ('cover_image_path', models.CharField(blank=True, max_length=500, null=True)),
                ('class_date', models.DateField(help_text='When the AI Gala class happens')),
                ('gallery_open_date', models.DateField(help_text='When gallery becomes visible')),
                ('voting_start_date', models.DateField(help_text='When voting begins')),
                ('voting_end_date', models.DateField(help_text='When voting closes (Day 10)')),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('active', 'Active - Accepting Submissions'), ('voting', 'Voting Open'), ('closed', 'Closed - Results Announced')], default='draft', max_length=20)),
                ('max_votes_per_user', models.IntegerField(default=3, help_text='How many projects each user can vote for')),
                ('allow_comments', models.BooleanField(default=True)),
                ('allow_downloads', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'AI Gala Gallery',
                'verbose_name_plural': 'AI Gala Galleries',
                'ordering': ['-class_date'],
            },
        ),
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(help_text="e.g., 'Thunder Girl'", max_length=200)),
                ('image_url', models.URLField(help_text='Supabase public URL')),
                ('image_path', models.CharField(help_text='Supabase storage path for deletion', max_length=500)),
                ('thumbnail_url', models.URLField(blank=True, help_text='Optional smaller version', null=True)),
                ('description', models.TextField(blank=True, help_text='Origin story, explanation, etc.')),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('vote_count', models.IntegerField(default=0)),
                ('comment_count', models.IntegerField(default=0)),
                ('view_count', models.IntegerField(default=0)),
                ('is_approved', models.BooleanField(default=True, help_text='Admin can hide inappropriate content')),
                ('is_winner', models.BooleanField(default=False)),
                ('winner_rank', models.IntegerField(blank=True, help_text='1=Champion, 2=Innovator, 3=Creator', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('gallery', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='projects', to='aigala.gallery')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='gala_projects', to='students.student')),
            ],
            options={
                'verbose_name': 'AI Gala Project',
                'verbose_name_plural': 'AI Gala Projects',
                'ordering': ['-vote_count', '-created_at'],
                'unique_together': {('gallery', 'student')},
            },
        ),
        migrations.CreateModel(
            name='Vote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='votes', to='aigala.project')),
                ('voter', models.ForeignKey(help_text='Student account used for voting (parent uses student login)', on_delete=django.db.models.deletion.CASCADE, related_name='gala_votes_cast', to='students.student')),
            ],
            options={
                'verbose_name': 'AI Gala Vote',
                'verbose_name_plural': 'AI Gala Votes',
                'unique_together': {('project', 'voter')},
            },
        ),
        migrations.CreateModel(
            name='Comment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.TextField(max_length=500)),
                ('is_approved', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('commenter', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='gala_comments', to='students.student')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='aigala.project')),
            ],
            options={
                'verbose_name': 'AI Gala Comment',
                'verbose_name_plural': 'AI Gala Comments',
                'ordering': ['-created_at'],
            },
        ),
    ]
