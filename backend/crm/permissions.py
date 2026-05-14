# ============================================
# CRM PERMISSIONS
# ============================================

import os

from rest_framework import permissions


class WhatsAppBotKeyPermission(permissions.BasePermission):
    """
    Permission for the WhatsApp WAHA n8n bot.

    Requires the X-Bot-Key request header to match the WHATSAPP_BOT_KEY
    environment variable. If the env var is unset or empty, all requests
    are rejected (fail-closed).
    """

    message = 'Invalid or missing X-Bot-Key.'

    def has_permission(self, request, view):
        expected = (os.getenv('WHATSAPP_BOT_KEY') or '').strip()
        if not expected:
            return False

        provided = request.headers.get('X-Bot-Key', '') or request.META.get(
            'HTTP_X_BOT_KEY', ''
        )
        return bool(provided) and provided == expected


class IsBDMOrAdmin(permissions.BasePermission):
    """
    Permission for BDM or Admin users
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role in ['BDM', 'Admin']


class IsAdminOnly(permissions.BasePermission):
    """
    Permission for Admin users only
    Used for creating/managing targets
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role == 'Admin'


class IsAdminOrOwner(permissions.BasePermission):
    """
    Permission for Admin or object owner (BDM)
    Used for viewing/editing own leads/targets
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role in ['BDM', 'Admin']
    
    def has_object_permission(self, request, view, obj):
        # Admin can access everything
        if request.user.role == 'Admin':
            return True
        
        # BDM can only access their own assigned items
        if request.user.role == 'BDM':
            # Check if object has assigned_to field
            if hasattr(obj, 'assigned_to'):
                return obj.assigned_to == request.user
            # Check if object is a target for this BDM
            if hasattr(obj, 'bdm'):
                return obj.bdm == request.user
        
        return False
