from django.shortcuts import render

# Create your views here.
# ============================================
# AUTHENTICATION VIEWS
# ============================================

from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import make_password
from students.models import CustomUser  # Import from students app


# ============================================
# CUSTOM JWT SERIALIZER
# ============================================

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that includes user role and username in token response
    """
    def validate(self, attrs):
        data = super().validate(attrs)

        # Debugging: Print user login details
        print(f"🔒 Logging In - Username: {attrs['username']}, Password: {attrs['password']}")

        # Check if user exists
        user = CustomUser.objects.filter(username=attrs['username']).first()
        if not user:
            raise serializers.ValidationError("⚠️ User not found!")

        print(f"✅ Found User: {user.username} | Active: {user.is_active}")

        # Ensure user is active
        if not user.is_active:
            raise serializers.ValidationError("User account is inactive.")

        # Include additional data
        data['role'] = user.role
        data['username'] = user.username

        return data


# ============================================
# CUSTOM JWT VIEW
# ============================================

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom token view using our custom serializer
    """
    serializer_class = CustomTokenObtainPairSerializer


# ============================================
# USER REGISTRATION
# ============================================

@api_view(['POST'])
def register_user(request):
    """
    Register a new user
    POST: { username, email, password }
    """
    data = request.data
    
    # Check if username already exists
    if CustomUser.objects.filter(username=data.get('username')).exists():
        return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create user
    user = CustomUser.objects.create(
        username=data['username'],
        email=data['email'],
        password=make_password(data['password'])  # Hash password
    )

    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'message': 'User registered successfully',
        'refresh': str(refresh),
        'access': str(refresh.access_token)
    }, status=status.HTTP_201_CREATED)


# ============================================
# GET LOGGED IN USER INFO
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_logged_in_user(request):
    """
    Get current logged-in user's information
    Returns: { id, username, role, fullName }
    """
    user = request.user
    full_name = f"{user.first_name} {user.last_name}".strip() or "Unknown"
    
    return Response({
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "fullName": full_name
    })