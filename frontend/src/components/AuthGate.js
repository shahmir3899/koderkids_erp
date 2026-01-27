// ============================================
// AUTH GATE - Token Validation on App Startup
// ============================================
// Location: src/components/AuthGate.js
//
// PURPOSE: Validate stored JWT token before app initializes
// BENEFIT: Prevents stale tokens from triggering unnecessary API calls
//
// This component:
// 1. Checks if a token exists in localStorage
// 2. Validates it with the backend
// 3. Clears localStorage if token is invalid/expired
// 4. Only renders children (contexts/app) once validation is complete

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

/**
 * AuthGate Component
 * Validates stored token on app startup before contexts mount
 */
const AuthGate = ({ children, loadingComponent }) => {
  const [isValidating, setIsValidating] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('access');

      // No token - skip validation, user needs to login
      if (!token) {
        console.log('🔓 AuthGate: No token found, skipping validation');
        setIsValidating(false);
        setIsReady(true);
        return;
      }

      console.log('🔐 AuthGate: Validating stored token...');

      try {
        // Validate token by calling a lightweight authenticated endpoint
        const response = await axios.get(`${API_URL}/api/auth/user/`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000, // 5 second timeout
        });

        if (response.status === 200) {
          console.log('✅ AuthGate: Token is valid');
          // Optionally update user info from response
          if (response.data) {
            const { role, fullName, username } = response.data;
            if (role) localStorage.setItem('role', role);
            if (fullName) localStorage.setItem('fullName', fullName);
            if (username) localStorage.setItem('username', username);
          }
        }
      } catch (error) {
        // Token is invalid or expired
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('🚫 AuthGate: Token invalid/expired, clearing localStorage');
          clearAuthData();
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          // Network timeout - allow app to proceed, individual API calls will handle auth
          console.log('⚠️ AuthGate: Validation timeout, proceeding anyway');
        } else {
          // Other errors (network down, server error) - allow app to proceed
          console.log('⚠️ AuthGate: Validation error, proceeding anyway:', error.message);
        }
      } finally {
        setIsValidating(false);
        setIsReady(true);
      }
    };

    validateToken();
  }, []);

  /**
   * Clear all authentication data from localStorage
   */
  const clearAuthData = () => {
    // Clear auth tokens
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('fullName');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    localStorage.removeItem('employee_id');

    // Clear all cached data
    const cacheKeys = [
      'schools',
      'userProfile',
      'booksList',
      'finance_summary',
      'finance_loan_summary',
      'inventory_items',
      'inventory_summary',
      'inventory_categories',
      'inventory_schools',
      'inventory_users',
      'inventory_user_context',
    ];

    cacheKeys.forEach(key => {
      localStorage.removeItem(key);
    });

    // Clear any bookDetails_* keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('bookDetails_')) {
        localStorage.removeItem(key);
      }
    });

    console.log('🗑️ AuthGate: Cleared all auth and cache data');
  };

  // Show loading while validating
  if (isValidating || !isReady) {
    // Use custom loading component if provided, otherwise minimal loading
    if (loadingComponent) {
      return loadingComponent;
    }

    // Minimal loading state - the ERPLoader in App.js will handle visual loading
    return null;
  }

  // Token validated (or no token), render the app
  return children;
};

export default AuthGate;
