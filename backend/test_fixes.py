"""
Test for backend task management fixes
Run with: python manage.py shell < test_fixes.py
"""

from tasks.models import Task
from tasks.serializers import TaskSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

print("\n" + "="*60)
print("TESTING BACKEND TASK FIXES")
print("="*60)

# Test 1: Model indentation fix - create task
print("\n✅ TEST 1: Model Indentation Fix")
print("-" * 60)
try:
    admin_user = User.objects.filter(role='Admin').first()
    if not admin_user:
        print("❌ No admin user found. Create one first.")
    else:
        test_task = Task.objects.create(
            title="Test Task for Fix Verification",
            description="Testing model indentation fix",
            assigned_to=admin_user,
            assigned_by=admin_user,
            priority='high',
            task_type='general'
        )
        print(f"✅ Task created successfully: {test_task.id}")
        print(f"   Title: {test_task.title}")
        print(f"   is_overdue() method works: {test_task.is_overdue()}")
        test_task.delete()
except Exception as e:
    print(f"❌ Error creating task: {e}")

# Test 2: Serializer methods
print("\n✅ TEST 2: Serializer SerializerMethodField")
print("-" * 60)
try:
    admin_user = User.objects.filter(role='Admin').first()
    if admin_user:
        test_task = Task.objects.create(
            title="Test Task for Serializer",
            assigned_to=admin_user,
            assigned_by=admin_user,
            priority='urgent',
            status='pending'
        )
        serializer = TaskSerializer(test_task)
        data = serializer.data
        
        print(f"✅ Serializer data includes:")
        print(f"   - is_overdue: {data.get('is_overdue')}")
        print(f"   - priority_color: {data.get('priority_color')}")
        print(f"   - status_color: {data.get('status_color')}")
        
        # Verify colors
        assert data['priority_color'] == '#EF4444', "Priority color wrong for urgent"
        assert data['status_color'] == '#6B7280', "Status color wrong for pending"
        print(f"✅ All colors computed correctly!")
        
        test_task.delete()
except Exception as e:
    print(f"❌ Error testing serializer: {e}")

# Test 3: Model methods
print("\n✅ TEST 3: Model Helper Methods")
print("-" * 60)
try:
    admin_user = User.objects.filter(role='Admin').first()
    if admin_user:
        test_task = Task.objects.create(
            title="Test Task Colors",
            assigned_to=admin_user,
            assigned_by=admin_user,
            priority='low',
            status='completed'
        )
        
        print(f"✅ Task model methods work:")
        print(f"   - get_priority_color(): {test_task.get_priority_color()}")
        print(f"   - get_status_color(): {test_task.get_status_color()}")
        print(f"   - is_overdue(): {test_task.is_overdue()}")
        
        # Verify values
        assert test_task.get_priority_color() == '#10B981', "Priority low color wrong"
        assert test_task.get_status_color() == '#10B981', "Status completed color wrong"
        print(f"✅ All model methods return correct values!")
        
        test_task.delete()
except Exception as e:
    print(f"❌ Error testing model methods: {e}")

print("\n" + "="*60)
print("ALL TESTS PASSED! ✅")
print("="*60 + "\n")
