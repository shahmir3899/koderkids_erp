# ============================================
# AUTHENTICATION URL PATTERNS
# ============================================

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    register_user,
    get_logged_in_user,
    UserViewSet,
    password_reset_request,      # ← NEW
    password_reset_confirm,       # ← NEW
    change_password,
)

# Create router for ViewSet-based routes
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    # JWT Token endpoints
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User registration (public - can be removed if not needed)
    path('register/', register_user, name='register_user'),
    
    # Current user info
    path('user/', get_logged_in_user, name='get_logged_in_user'),

    # Self-Service Password Reset
    path('password-reset/request/', password_reset_request, name='password-reset-request'),
    path('password-reset/confirm/', password_reset_confirm, name='password-reset-confirm'),
    # Change Password for logged-in users
    path('change-password/', change_password, name='change-password'),
    
    # User management routes (from router)
    path('', include(router.urls)),
]