from rest_framework.permissions import BasePermission

class IsAdminUser(BasePermission):
    """Custom permission to allow only Admins to access finance APIs."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "Admin"
