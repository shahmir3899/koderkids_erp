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