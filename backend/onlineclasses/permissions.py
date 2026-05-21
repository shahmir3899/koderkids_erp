from rest_framework.permissions import BasePermission


class IsTeacherOrAdmin(BasePermission):
    """Allow only users with role Teacher or Admin."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('Teacher', 'Admin')
        )


class IsSessionTeacherOrAdmin(BasePermission):
    """Object-level: allow only the session's teacher or an Admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'Admin':
            return True
        return obj.teacher_id == request.user.id
