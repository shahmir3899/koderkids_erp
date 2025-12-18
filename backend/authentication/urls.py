# ============================================
# AUTHENTICATION URL PATTERNS
# ============================================

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    register_user,
    get_logged_in_user,
)

urlpatterns = [
    # JWT Token endpoints
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User registration
    path('register/', register_user, name='register_user'),
    
    # Current user info
    path('user/', get_logged_in_user, name='get_logged_in_user'),
]