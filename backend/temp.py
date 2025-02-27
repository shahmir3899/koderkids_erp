import django
import os

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "school_management.settings")  # Update with your project name
django.setup()

from students.models import CustomUser

# ✅ Function to create a new user
def create_student():
    student, created = CustomUser.objects.get_or_create(
        username="student100",
        defaults={
            "email": "student@koderkids.pk",
            "password": "student123",
            "role": "Student"
        }
    )

    if created:
        print(f"✅ Student '{student.username}' created successfully!")
    else:
        print(f"⚠️ Student '{student.username}' already exists!")

# ✅ Function to list all users
def list_users():
    for user in CustomUser.objects.all():
        print(f"Username: {user.username}, Email: {user.email}, Role: {user.role}, Superuser: {user.is_superuser}")

# Run functions
#create_student()
list_users()
