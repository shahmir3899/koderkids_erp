from datetime import timedelta
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from students.models import CustomUser, School, Student

from .models import Comment, Gallery, Project, Vote


class AiGalaSeedDataMixin:
    """Reusable seed setup for AI Gala API tests."""

    def setUp_seed_data(self):
        self.client = APIClient()

        self.school_alpha = School.objects.create(name='Alpha School')
        self.school_beta = School.objects.create(name='Beta School')

        self.admin_user = CustomUser.objects.create_user(
            username='admin_user',
            password='pass1234',
            role='Admin',
            is_staff=True,
            is_superuser=True,
        )

        self.teacher_user = CustomUser.objects.create_user(
            username='teacher_user',
            password='pass1234',
            role='Teacher',
        )
        self.teacher_user.assigned_schools.add(self.school_alpha)

        self.student_user_1 = CustomUser.objects.create_user(
            username='student_user_1',
            password='pass1234',
            role='Student',
        )
        self.student_user_2 = CustomUser.objects.create_user(
            username='student_user_2',
            password='pass1234',
            role='Student',
        )
        self.student_user_3 = CustomUser.objects.create_user(
            username='student_user_3',
            password='pass1234',
            role='Student',
        )

        self.student_1 = Student.objects.create(
            reg_num='REG-001',
            name='Student One',
            school=self.school_alpha,
            student_class='Level 1',
            user=self.student_user_1,
            status='Active',
        )
        self.student_2 = Student.objects.create(
            reg_num='REG-002',
            name='Student Two',
            school=self.school_alpha,
            student_class='Level 2',
            user=self.student_user_2,
            status='Active',
        )
        self.student_3 = Student.objects.create(
            reg_num='REG-003',
            name='Student Three',
            school=self.school_beta,
            student_class='Level 1',
            user=self.student_user_3,
            status='Active',
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def create_gallery(self, **overrides):
        today = timezone.now().date()
        payload = {
            'title': 'Seed Gala',
            'month_label': 'Jan 2026',
            'theme': 'Imagination',
            'description': 'Seed description',
            'status': 'draft',
            'created_by': self.admin_user,
            'class_date': today,
            'gallery_open_date': today,
            'voting_start_date': today + timedelta(days=1),
            'voting_end_date': today + timedelta(days=3),
            'max_votes_per_user': 3,
        }
        payload.update(overrides)
        target_schools = payload.pop('target_schools', None)
        gallery = Gallery.objects.create(**payload)
        if target_schools:
            gallery.target_schools.set(target_schools)
        return gallery

    def create_project(self, gallery, student, title='Project Title'):
        return Project.objects.create(
            gallery=gallery,
            student=student,
            title=title,
            description='Project description',
            image_url='https://example.com/project.jpg',
            image_path=f'projects/{gallery.id}/{student.id}/project.jpg',
            metadata={},
        )


class GalleryListingTests(AiGalaSeedDataMixin, TestCase):
    def setUp(self):
        self.setUp_seed_data()

    def test_teacher_include_drafts_returns_only_manageable_drafts(self):
        teacher_draft = self.create_gallery(
            title='Teacher Draft',
            status='draft',
            created_by=self.teacher_user,
            target_schools=[self.school_alpha],
        )
        self.create_gallery(
            title='Other Draft',
            status='draft',
            created_by=self.admin_user,
            target_schools=[self.school_beta],
        )
        global_active = self.create_gallery(
            title='Global Active',
            status='active',
            target_schools=[],
        )

        self.authenticate(self.teacher_user)
        response = self.client.get('/api/aigala/galleries/?include_drafts=true')

        self.assertEqual(response.status_code, 200)
        returned_ids = {item['id'] for item in response.data}
        self.assertIn(teacher_draft.id, returned_ids)
        self.assertIn(global_active.id, returned_ids)
        self.assertNotIn(
            Gallery.objects.get(title='Other Draft').id,
            returned_ids,
        )

    def test_list_galleries_auto_transitions_due_gallery(self):
        due_gallery = self.create_gallery(
            title='Due Gallery',
            status='active',
            voting_start_date=timezone.now().date() - timedelta(days=1),
            voting_end_date=timezone.now().date() + timedelta(days=2),
        )

        self.authenticate(self.admin_user)
        response = self.client.get('/api/aigala/galleries/')

        self.assertEqual(response.status_code, 200)
        due_gallery.refresh_from_db()
        self.assertEqual(due_gallery.status, 'voting')


class ProjectUploadTests(AiGalaSeedDataMixin, TestCase):
    def setUp(self):
        self.setUp_seed_data()

    def test_student_can_upload_once_when_gallery_is_active(self):
        gallery = self.create_gallery(status='active')

        self.authenticate(self.student_user_1)
        image = SimpleUploadedFile('art.png', b'fake-image-bytes', content_type='image/png')

        with patch('aigala.views.upload_project_image') as mock_upload:
            mock_upload.return_value = {
                'url': 'https://example.com/uploaded.png',
                'path': 'projects/1/1/uploaded.png',
            }
            response = self.client.post(
                f'/api/aigala/galleries/{gallery.id}/upload/',
                {
                    'title': 'My First Creation',
                    'description': 'A cool AI project',
                    'image': image,
                },
                format='multipart',
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Project.objects.filter(gallery=gallery, student=self.student_1).count(), 1)

    def test_upload_blocked_when_gallery_not_active(self):
        gallery = self.create_gallery(status='draft')

        self.authenticate(self.student_user_1)
        image = SimpleUploadedFile('art.png', b'fake-image-bytes', content_type='image/png')

        response = self.client.post(
            f'/api/aigala/galleries/{gallery.id}/upload/',
            {
                'title': 'Should Fail',
                'description': 'Blocked upload',
                'image': image,
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('not accepting submissions', response.data.get('error', '').lower())


class VotingTests(AiGalaSeedDataMixin, TestCase):
    def setUp(self):
        self.setUp_seed_data()

    def test_student_cannot_vote_for_own_project(self):
        gallery = self.create_gallery(
            status='voting',
            voting_start_date=timezone.now().date() - timedelta(days=1),
            voting_end_date=timezone.now().date() + timedelta(days=1),
        )
        own_project = self.create_project(gallery, self.student_1, title='Own Project')

        self.authenticate(self.student_user_1)
        response = self.client.post(f'/api/aigala/projects/{own_project.id}/vote/')

        self.assertEqual(response.status_code, 400)
        self.assertIn('cannot vote for your own project', response.data.get('error', '').lower())

    def test_student_vote_limit_enforced(self):
        gallery = self.create_gallery(
            status='voting',
            max_votes_per_user=1,
            voting_start_date=timezone.now().date() - timedelta(days=1),
            voting_end_date=timezone.now().date() + timedelta(days=1),
        )
        project_a = self.create_project(gallery, self.student_2, title='Project A')
        project_b = self.create_project(gallery, self.student_3, title='Project B')

        self.authenticate(self.student_user_1)

        with patch('aigala.views.notify_vote_received'):
            first_vote = self.client.post(f'/api/aigala/projects/{project_a.id}/vote/')
            second_vote = self.client.post(f'/api/aigala/projects/{project_b.id}/vote/')

        self.assertEqual(first_vote.status_code, 200)
        self.assertEqual(second_vote.status_code, 400)
        self.assertIn('used all 1 votes', second_vote.data.get('error', '').lower())


class DeleteGalleryTests(AiGalaSeedDataMixin, TestCase):
    def setUp(self):
        self.setUp_seed_data()

    def test_delete_requires_force_when_related_data_exists(self):
        gallery = self.create_gallery(status='closed')
        project = self.create_project(gallery, self.student_1)
        Vote.objects.create(project=project, voter=self.student_2)
        Comment.objects.create(project=project, commenter=self.student_2, content='Great work')

        self.authenticate(self.admin_user)
        response = self.client.delete(f'/api/aigala/galleries/{gallery.id}/delete/')

        self.assertEqual(response.status_code, 409)
        self.assertTrue(response.data.get('requires_force'))
        counts = response.data.get('related_counts', {})
        self.assertEqual(counts.get('projects'), 1)
        self.assertEqual(counts.get('votes'), 1)
        self.assertEqual(counts.get('comments'), 1)

    def test_force_delete_removes_gallery(self):
        gallery = self.create_gallery(status='closed')
        self.create_project(gallery, self.student_1)

        self.authenticate(self.admin_user)
        with patch('aigala.views.delete_image', return_value=True):
            response = self.client.delete(f'/api/aigala/galleries/{gallery.id}/delete/?force=true')

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Gallery.objects.filter(id=gallery.id).exists())
        self.assertTrue(response.data.get('forced'))

    def test_teacher_cannot_delete_gallery(self):
        gallery = self.create_gallery(status='draft')

        self.authenticate(self.teacher_user)
        response = self.client.delete(f'/api/aigala/galleries/{gallery.id}/delete/')

        self.assertEqual(response.status_code, 403)
        self.assertIn('only admins can delete', response.data.get('error', '').lower())
