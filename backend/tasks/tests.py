from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import datetime, timedelta
import json

from .models import Task

User = get_user_model()


class TaskAPITestCase(TestCase):
    """Comprehensive test suite for Tasks API with JWT authentication"""
    
    def setUp(self):
        """Set up test data with users and tasks"""
        self.client = APIClient()
        
        # Create test users with different roles
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='testpass123',
            first_name='Admin',
            last_name='User',
            role='Admin',
            is_active=True
        )
        
        self.teacher_user = User.objects.create_user(
            username='teacher_test',
            email='teacher@test.com',
            password='testpass123',
            first_name='Teacher',
            last_name='User',
            role='Teacher',
            is_active=True
        )
        
        self.student_user = User.objects.create_user(
            username='student_test',
            email='student@test.com',
            password='testpass123',
            first_name='Student',
            last_name='User',
            role='Student',
            is_active=True
        )
        
        self.bdm_user = User.objects.create_user(
            username='bdm_test',
            email='bdm@test.com',
            password='testpass123',
            first_name='BDM',
            last_name='User',
            role='BDM',
            is_active=True
        )
        
        # Create JWT tokens for each user
        self.admin_token = str(RefreshToken.for_user(self.admin_user).access_token)
        self.teacher_token = str(RefreshToken.for_user(self.teacher_user).access_token)
        self.student_token = str(RefreshToken.for_user(self.student_user).access_token)
        self.bdm_token = str(RefreshToken.for_user(self.bdm_user).access_token)
        
        # Create test tasks with various properties
        self.admin_task = Task.objects.create(
            title='Admin Task',
            description='Task assigned to admin',
            assigned_to=self.admin_user,
            assigned_by=self.admin_user,
            priority='high',
            task_type='administrative',
            status='pending',
            due_date=timezone.now() + timedelta(days=5)
        )
        
        self.teacher_task = Task.objects.create(
            title='Teacher Task',
            description='Task assigned to teacher',
            assigned_to=self.teacher_user,
            assigned_by=self.admin_user,
            priority='medium',
            task_type='academic',
            status='in_progress',
            due_date=timezone.now() + timedelta(days=3)
        )
        
        self.student_task = Task.objects.create(
            title='Student Task',
            description='Task assigned to student',
            assigned_to=self.student_user,
            assigned_by=self.teacher_user,
            priority='low',
            task_type='general',
            status='completed',
            due_date=timezone.now() + timedelta(days=1),
            completed_date=timezone.now(),
            completion_answer='Task completed successfully'
        )
        
        self.bdm_task = Task.objects.create(
            title='BDM Task',
            description='Task assigned to BDM',
            assigned_to=self.bdm_user,
            assigned_by=self.admin_user,
            priority='urgent',
            task_type='administrative',
            status='pending',
            due_date=timezone.now() - timedelta(days=1)  # Overdue
        )
        
        # Tasks for testing business logic
        self.overdue_task = Task.objects.create(
            title='Overdue Task',
            description='This task is overdue',
            assigned_to=self.teacher_user,
            assigned_by=self.admin_user,
            priority='high',
            task_type='general',
            status='pending',
            due_date=timezone.now() - timedelta(days=2)
        )

    def set_auth_header(self, token):
        """Set JWT token in authorization header"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def clear_auth_header(self):
        """Clear authentication header"""
        self.client.credentials()


class AuthenticationTests(TaskAPITestCase):
    """Test JWT authentication requirements"""
    
    def test_no_authentication_required(self):
        """Test that all endpoints require authentication"""
        endpoints = [
            '/api/tasks/',
            f'/api/tasks/{self.admin_task.id}/',
            '/api/tasks/my_tasks/',
            '/api/tasks/stats/',
            f'/api/tasks/{self.admin_task.id}/update_status/',
            '/api/tasks/assign_to_all/'
        ]
        
        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.clear_auth_header()
                response = self.client.get(endpoint)
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_valid_jwt_token(self):
        """Test that valid JWT tokens work"""
        self.set_auth_header(self.admin_token)
        response = self.client.get('/api/tasks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_invalid_jwt_token(self):
        """Test that invalid JWT tokens are rejected"""
        self.set_auth_header('Bearer invalid.token.here')
        response = self.client.get('/api/tasks/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_provided_user_token_works(self):
        """Test the provided user JWT token"""
        # Use the provided token (user_id=1)
        provided_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY3ODc4NjAzLCJpYXQiOjE3Njc3OTIyMDMsImp0aSI6ImJmNzFjYzU4YzcxNTQ5MDNiNWZlMzQ4NWNkNGUzNTkwIiwidXNlcl9pZCI6IjEifQ.cr-bTYEwDY3n-HmlFUBz0JRVEAG4tBexlcvydmbepNI'
        
        # First check if user with ID 1 exists and is an admin
        try:
            admin_user_id_1 = User.objects.get(id=1)
            self.assertEqual(admin_user_id_1.role, 'Admin')
        except User.DoesNotExist:
            # If user ID 1 doesn't exist, skip this test
            self.skipTest("User with ID 1 does not exist in test database")
        
        self.set_auth_header(provided_token)
        response = self.client.get('/api/tasks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CRUDOperationsTests(TaskAPITestCase):
    """Test CRUD operations with role-based permissions"""
    
    def test_list_tasks_admin(self):
        """Test admin can see all tasks"""
        self.set_auth_header(self.admin_token)
        response = self.client.get('/api/tasks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Admin should see all tasks created in setUp (5 tasks)
        self.assertEqual(len(response.data), 5)  # All tasks created in setUp
        
    def test_list_tasks_non_admin(self):
        """Test non-admin users see only their assigned tasks"""
        # Test teacher
        self.set_auth_header(self.teacher_token)
        response = self.client.get('/api/tasks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Teacher should only see tasks assigned to them
        teacher_task_ids = [task['id'] for task in response.data]
        self.assertIn(self.teacher_task.id, teacher_task_ids)
        self.assertIn(self.overdue_task.id, teacher_task_ids)  # Also assigned to teacher
        self.assertEqual(len(teacher_task_ids), 2)
        
        # Test student
        self.set_auth_header(self.student_token)
        response = self.client.get('/api/tasks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Student should only see their task
        student_task_ids = [task['id'] for task in response.data]
        self.assertIn(self.student_task.id, student_task_ids)
        self.assertEqual(len(student_task_ids), 1)
    
    def test_create_task(self):
        """Test task creation"""
        task_data = {
            'title': 'New Test Task',
            'description': 'This is a new test task',
            'assigned_to': self.teacher_user.id,
            'priority': 'medium',
            'task_type': 'general',
            'status': 'pending',
            'due_date': (timezone.now() + timedelta(days=7)).isoformat()
        }
        
        # Test admin can create task
        self.set_auth_header(self.admin_token)
        response = self.client.post('/api/tasks/', task_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify task was created correctly by checking database
        created_task = Task.objects.filter(title='New Test Task').first()
        self.assertIsNotNone(created_task)
        self.assertEqual(created_task.title, 'New Test Task')
        self.assertEqual(created_task.assigned_by, self.admin_user)
        
        # Test teacher can create task
        task_data['title'] = 'Teacher Task Created'
        task_data['assigned_to'] = self.student_user.id
        self.set_auth_header(self.teacher_token)
        response = self.client.post('/api/tasks/', task_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        created_task = Task.objects.filter(title='Teacher Task Created').first()
        self.assertIsNotNone(created_task)
        self.assertEqual(created_task.assigned_by, self.teacher_user)
    
    def test_get_task_details(self):
        """Test getting single task details"""
        # Test admin can get any task
        self.set_auth_header(self.admin_token)
        response = self.client.get(f'/api/tasks/{self.teacher_task.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Teacher Task')
        
        # Test teacher can get their own task
        self.set_auth_header(self.teacher_token)
        response = self.client.get(f'/api/tasks/{self.teacher_task.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test teacher cannot get other's task
        response = self.client.get(f'/api/tasks/{self.student_task.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_update_task(self):
        """Test task update"""
        update_data = {
            'title': 'Updated Task Title',
            'description': 'Updated description',
            'priority': 'urgent',
            'status': 'in_progress'
        }
        
        # Test admin can update any task
        self.set_auth_header(self.admin_token)
        response = self.client.patch(f'/api/tasks/{self.teacher_task.id}/', update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        updated_task = Task.objects.get(id=self.teacher_task.id)
        self.assertEqual(updated_task.title, 'Updated Task Title')
        self.assertEqual(updated_task.priority, 'urgent')
        
        # Test teacher can update their own task
        update_data['title'] = 'Teacher Updated Task'
        self.set_auth_header(self.teacher_token)
        response = self.client.patch(f'/api/tasks/{self.teacher_task.id}/', update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test teacher cannot update other's task
        response = self.client.patch(f'/api/tasks/{self.student_task.id}/', update_data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_delete_task(self):
        """Test task deletion"""
        # Test admin can delete any task
        self.set_auth_header(self.admin_token)
        response = self.client.delete(f'/api/tasks/{self.teacher_task.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        with self.assertRaises(Task.DoesNotExist):
            Task.objects.get(id=self.teacher_task.id)
        
        # Create a new task for teacher to delete
        teacher_task_to_delete = Task.objects.create(
            title='Task to Delete',
            description='This task will be deleted by teacher',
            assigned_to=self.teacher_user,
            assigned_by=self.teacher_user,
            priority='low',
            task_type='general',
            status='pending',
            due_date=timezone.now() + timedelta(days=5)
        )
        
        # Test teacher can delete their own task
        self.set_auth_header(self.teacher_token)
        response = self.client.delete(f'/api/tasks/{teacher_task_to_delete.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Test teacher cannot delete other's task
        response = self.client.delete(f'/api/tasks/{self.student_task.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CustomActionTests(TaskAPITestCase):
    """Test custom action endpoints"""
    
    def test_my_tasks_endpoint(self):
        """Test my_tasks custom action"""
        self.set_auth_header(self.teacher_token)
        response = self.client.get('/api/tasks/my_tasks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should return only teacher's tasks
        task_titles = [task['title'] for task in response.data]
        self.assertIn('Teacher Task', task_titles)
        self.assertIn('Overdue Task', task_titles)
        self.assertEqual(len(task_titles), 2)
        
        # Test with student
        self.set_auth_header(self.student_token)
        response = self.client.get('/api/tasks/my_tasks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        task_titles = [task['title'] for task in response.data]
        self.assertIn('Student Task', task_titles)
        self.assertEqual(len(task_titles), 1)
    
    def test_stats_endpoint(self):
        """Test stats endpoint for admin dashboard"""
        # Test admin can access stats
        self.set_auth_header(self.admin_token)
        response = self.client.get('/api/tasks/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify stats structure
        self.assertIn('status_stats', response.data)
        self.assertIn('priority_stats', response.data)
        
        status_stats = response.data['status_stats']
        self.assertIn('total', status_stats)
        self.assertIn('pending', status_stats)
        self.assertIn('in_progress', status_stats)
        self.assertIn('completed', status_stats)
        self.assertIn('overdue', status_stats)
        
        priority_stats = response.data['priority_stats']
        self.assertIn('low', priority_stats)
        self.assertIn('medium', priority_stats)
        self.assertIn('high', priority_stats)
        self.assertIn('urgent', priority_stats)
        
        # Test non-admin cannot access stats
        self.set_auth_header(self.teacher_token)
        response = self.client.get('/api/tasks/stats/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_update_status_endpoint(self):
        """Test update_status custom action"""
        update_data = {
            'status': 'completed',
            'completion_answer': 'Task has been completed successfully'
        }
        
        # Test admin can update any task status
        self.set_auth_header(self.admin_token)
        response = self.client.patch(f'/api/tasks/{self.teacher_task.id}/update_status/', update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        updated_task = Task.objects.get(id=self.teacher_task.id)
        self.assertEqual(updated_task.status, 'completed')
        self.assertEqual(updated_task.completion_answer, 'Task has been completed successfully')
        self.assertIsNotNone(updated_task.completed_date)
        
        # Test teacher can update their own task status
        self.set_auth_header(self.teacher_token)
        update_data['status'] = 'in_progress'
        response = self.client.patch(f'/api/tasks/{self.teacher_task.id}/update_status/', update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test teacher cannot update other's task status
        response = self.client.patch(f'/api/tasks/{self.student_task.id}/update_status/', update_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_assign_to_all_endpoint(self):
        """Test assign_to_all custom action"""
        due_date = timezone.now() + timedelta(days=10)
        assign_data = {
            'title': 'Bulk Assigned Task',
            'description': 'This task is assigned to all employees',
            'priority': 'medium',
            'task_type': 'general',
            'due_date': due_date.isoformat()
        }
        
        # Test admin can assign to all
        initial_task_count = Task.objects.count()
        self.set_auth_header(self.admin_token)
        response = self.client.post('/api/tasks/assign_to_all/', assign_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify tasks were created for all active employees (Admin, Teacher, BDM)
        self.assertIn('message', response.data)
        self.assertIn('count', response.data)
        
        # Count should be initial + 3 (for Admin, Teacher, BDM)
        final_task_count = Task.objects.count()
        self.assertEqual(final_task_count, initial_task_count + 3)
        
        # Test non-admin cannot assign to all
        self.set_auth_header(self.teacher_token)
        response = self.client.post('/api/tasks/assign_to_all/', assign_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class BusinessLogicTests(TaskAPITestCase):
    """Test business logic and edge cases"""
    
    def test_overdue_detection(self):
        """Test overdue task detection"""
        # The bdm_task and overdue_task are overdue (due_date in the past)
        self.assertTrue(self.bdm_task.is_overdue)
        self.assertTrue(self.overdue_task.is_overdue)
        
        # Other tasks are not overdue
        self.assertFalse(self.admin_task.is_overdue)
        self.assertFalse(self.teacher_task.is_overdue)
        self.assertFalse(self.student_task.is_overdue)
    
    def test_priority_colors(self):
        """Test priority color assignments"""
        self.assertEqual(self.admin_task.priority_color, 'red')    # high priority
        self.assertEqual(self.teacher_task.priority_color, 'yellow')  # medium priority
        self.assertEqual(self.student_task.priority_color, 'green')  # low priority
        self.assertEqual(self.bdm_task.priority_color, 'purple')   # urgent priority
    
    def test_status_colors(self):
        """Test status color assignments"""
        self.assertEqual(self.admin_task.status_color, 'gray')      # pending
        self.assertEqual(self.teacher_task.status_color, 'blue')    # in_progress
        self.assertEqual(self.student_task.status_color, 'green')    # completed
        self.assertEqual(self.bdm_task.status_color, 'red')        # overdue (should be red)
    
    def test_completion_date_auto_set(self):
        """Test completion date is automatically set when status is completed"""
        test_task = Task.objects.create(
            title='Test Completion',
            description='Test task',
            assigned_to=self.teacher_user,
            assigned_by=self.admin_user,
            priority='low',
            task_type='general',
            status='pending',
            due_date=timezone.now() + timedelta(days=5)
        )
        
        # Initially no completion date
        self.assertIsNone(test_task.completed_date)
        
        # Update status to completed
        update_data = {'status': 'completed', 'completion_answer': 'Done!'}
        self.set_auth_header(self.admin_token)
        response = self.client.patch(f'/api/tasks/{test_task.id}/update_status/', update_data)
        
        # Check completion date was set
        updated_task = Task.objects.get(id=test_task.id)
        self.assertIsNotNone(updated_task.completed_date)
        self.assertEqual(updated_task.status, 'completed')
    
    def test_task_serializer_validation(self):
        """Test serializer validation for required fields"""
        # Test missing required fields
        incomplete_data = {
            'description': 'Task without title'
        }
        
        self.set_auth_header(self.admin_token)
        response = self.client.post('/api/tasks/', incomplete_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test invalid priority
        invalid_data = {
            'title': 'Test Task',
            'description': 'Test description',
            'assigned_to': self.teacher_user.id,
            'priority': 'invalid_priority',
            'task_type': 'general',
            'status': 'pending'
        }
        
        response = self.client.post('/api/tasks/', invalid_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class EdgeCaseTests(TaskAPITestCase):
    """Test edge cases and error conditions"""
    
    def test_nonexistent_task(self):
        """Test accessing non-existent task"""
        self.set_auth_header(self.admin_token)
        response = self.client.get('/api/tasks/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_invalid_user_assignment(self):
        """Test assigning task to non-existent user"""
        task_data = {
            'title': 'Invalid Assignment Task',
            'description': 'Task assigned to non-existent user',
            'assigned_to': 99999,
            'priority': 'medium',
            'task_type': 'general',
            'status': 'pending'
        }
        
        self.set_auth_header(self.admin_token)
        response = self.client.post('/api/tasks/', task_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_update_nonexistent_task(self):
        """Test updating non-existent task"""
        update_data = {'title': 'Updated'}
        self.set_auth_header(self.admin_token)
        response = self.client.patch('/api/tasks/99999/', update_data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_empty_tasks_list(self):
        """Test when user has no tasks"""
        # Create a new user with no tasks
        new_user = User.objects.create_user(
            username='new_user',
            email='new@test.com',
            password='testpass123',
            first_name='New',
            last_name='User',
            role='Teacher',
            is_active=True
        )
        
        token = str(RefreshToken.for_user(new_user).access_token)
        self.set_auth_header(token)
        
        response = self.client.get('/api/tasks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
        
        response = self.client.get('/api/tasks/my_tasks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class PerformanceTests(TaskAPITestCase):
    """Test performance and efficiency"""
    
    def test_queryset_optimization(self):
        """Test that querysets use select_related properly"""
        self.set_auth_header(self.admin_token)
        
        # Capture the SQL query
        with self.assertNumQueries(1):  # Should be a single query with select_related
            response = self.client.get('/api/tasks/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_bulk_assignment_efficiency(self):
        """Test that bulk assignment doesn't create N+1 queries"""
        assign_data = {
            'title': 'Performance Test Task',
            'description': 'Testing bulk assignment performance',
            'priority': 'low',
            'task_type': 'general',
            'due_date': (timezone.now() + timedelta(days=5)).isoformat()
        }
        
        self.set_auth_header(self.admin_token)
        
        # This should be efficient, not create queries for each employee
        with self.assertNumQueries(3):  # Reasonable number of queries
            response = self.client.post('/api/tasks/assign_to_all/', assign_data)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)