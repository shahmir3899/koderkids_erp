# ============================================
# CUSTOM PERMISSIONS FOR USER MANAGEMENT
# ============================================

from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    Custom permission to only allow Admin users to access
    """
    message = "Only administrators can perform this action."
    
    def has_permission(self, request, view):
        # User must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # User must have Admin role
        return request.user.role == 'Admin'


class IsAdminOrSelf(permissions.BasePermission):
    """
    Custom permission to allow:
    - Admins to access any user
    - Users to access their own profile
    """
    message = "You can only view or modify your own profile."
    
    def has_permission(self, request, view):
        # User must be authenticated
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admin can access any user
        if request.user.role == 'Admin':
            return True
        
        # Users can only access their own profile
        return obj.id == request.user.id


class IsSuperAdmin(permissions.BasePermission):
    """
    Custom permission to only allow Super Admin users
    Used for critical operations like deleting admins
    """
    message = "Only super administrators can perform this action."

    def has_permission(self, request, view):
        # User must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # User must be a super admin
        return request.user.is_super_admin


# =============================================================================
# SELF-SERVICE REPORTS PERMISSIONS
# =============================================================================

class IsRequestOwnerOrAdmin(permissions.BasePermission):
    """
    Permission for report requests:
    - Admin: Always has access
    - Others: Only if request.requested_by == user
    """
    message = "You can only access your own report requests."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Admin can access any request
        if request.user.role == 'Admin':
            return True
        # Others can only access their own requests
        return obj.requested_by == request.user


class IsRequestOwnerAndDraft(permissions.BasePermission):
    """
    Permission for editing report requests:
    - Must be request owner
    - Request status must be DRAFT
    """
    message = "You can only edit your own draft requests."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Must be owner
        if obj.requested_by != request.user:
            return False
        # Must be draft status
        return obj.status == 'DRAFT'


class CanRequestForEmployee(permissions.BasePermission):
    """
    Permission to create report requests for employees:
    - Admin: Can request for any employee
    - Teacher: Can request for employees in assigned schools
    - BDM: Can only request for self
    - Student: Can only request for self
    """
    message = "You don't have permission to request reports for this employee."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def check_can_request_for(self, user, target_employee_id):
        """Check if user can request a report for the target employee."""
        # Requesting for self is always allowed
        if target_employee_id is None or target_employee_id == user.id:
            return True

        # Admin can request for anyone
        if user.role == 'Admin':
            return True

        # Teacher can request for employees in their assigned schools
        if user.role == 'Teacher':
            from students.models import CustomUser
            try:
                target = CustomUser.objects.get(id=target_employee_id)
                # Check if target has any school overlap with requester's assigned schools
                user_schools = set(user.assigned_schools.values_list('id', flat=True))
                target_schools = set(target.assigned_schools.values_list('id', flat=True))
                return bool(user_schools & target_schools)
            except CustomUser.DoesNotExist:
                return False

        # BDM and Student can only request for themselves
        return False


class CanUseTemplate(permissions.BasePermission):
    """
    Permission to use a specific report template:
    - User role must be in template.allowed_roles
    - If requesting for self: template.allowed_self_request must be True
    - If requesting for other: template.allowed_other_request must be True
    """
    message = "You don't have permission to use this template."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def check_can_use_template(self, user, template, is_self_request):
        """Check if user can use the template for the request type."""
        # Check if role is allowed
        if user.role not in template.allowed_roles:
            return False

        # Check request type permission
        if is_self_request:
            return template.allowed_self_request
        else:
            return template.allowed_other_request


class IsSelfOrAdmin(permissions.BasePermission):
    """
    Permission for salary slip self-service:
    - Admin: Can access any employee's data
    - Others: Can only access their own data
    """
    message = "You can only access your own salary information."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Admin can access anyone
        if request.user.role == 'Admin':
            return True
        # Others can only access their own
        return obj.id == request.user.id or obj.user_id == request.user.id