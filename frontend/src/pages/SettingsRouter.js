// ============================================
// SETTINGS ROUTER - Role-Based Settings Page
// Routes to Admin settings (Admin User Management)
// ============================================

import React from 'react';
import { Navigate } from 'react-router-dom';

// Settings Pages
import SettingsPage from './SettingsPage';

/**
 * SettingsRouter Component
 * Renders Admin User Management page for Admin users.
 * Other roles are redirected to their dashboard.
 */
function SettingsRouter() {
  // Get user role from localStorage
  const role = localStorage.getItem('role');

  // Handle different roles
  switch (role) {
    case 'Admin':
      return <SettingsPage />;

    case 'Teacher':
    case 'Student':
    case 'BDM':
      // Non-admin users redirect to home
      return <Navigate to="/" replace />;

    default:
      // No valid role - redirect to login
      console.warn('SettingsRouter: No valid role found, redirecting to login');
      return <Navigate to="/login" replace />;
  }
}

export default SettingsRouter;
