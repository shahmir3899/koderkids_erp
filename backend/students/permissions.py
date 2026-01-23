# ============================================
# CUSTOM PERMISSIONS FOR FEE MANAGEMENT
# ============================================

from rest_framework import permissions


class IsAdminOrTeacher(permissions.BasePermission):
    """
    Custom permission to allow:
    - Admins: Full access to all schools
    - Teachers: Full access BUT only to their assigned schools
    - Students: No access
    """
    message = "Only administrators and teachers can manage fee records."

    def has_permission(self, request, view):
        # User must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # User must be Admin or Teacher
        return request.user.role in ['Admin', 'Teacher']

    def check_school_access(self, user, school_id):
        """Check if user has access to this school."""
        # Admins can access all schools
        if user.role == 'Admin':
            return True

        # Teachers can only access their assigned schools
        if user.role == 'Teacher':
            return user.assigned_schools.filter(id=school_id).exists()

        return False


class IsAdminOrOwner(permissions.BasePermission):
    """
    Custom permission to allow:
    - Admins and Teachers to view any student fee records
    - Students to view only their own fee records
    """
    message = "You can only view your own fee records."

    def has_permission(self, request, view):
        # User must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Admins and Teachers can view any records
        if request.user.role in ['Admin', 'Teacher']:
            return True

        # Students can only access if viewing their own
        return request.user.role == 'Student'

    def has_object_permission(self, request, view, obj):
        # Admin/Teacher can access any record
        if request.user.role in ['Admin', 'Teacher']:
            return True

        # Students can only access their own records
        if request.user.role == 'Student':
            # Check if the fee belongs to the student
            return obj.student_id == request.user.id

        return False


class IsAdminOnly(permissions.BasePermission):
    """
    DEPRECATED: Use IsAdminOrTeacher with school checks instead.
    Teachers should be able to delete fees in their assigned schools.
    """
    message = "Only administrators can perform this action."

    def has_permission(self, request, view):
        # User must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # User must be Admin
        return request.user.role == 'Admin'


def check_school_access(user, school_id):
    """
    Helper function to check if user has access to a school.
    - Admins: Access to all schools
    - Teachers: Access only to assigned schools
    - Others: No access
    """
    if not user or not user.is_authenticated:
        return False

    if user.role == 'Admin':
        return True

    if user.role == 'Teacher':
        return user.assigned_schools.filter(id=school_id).exists()

    return False
