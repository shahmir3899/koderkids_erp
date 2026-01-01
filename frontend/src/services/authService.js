// ============================================
// AUTH SERVICE - Password Reset API Calls
// NEW FILE: frontend/src/services/authService.js
// ============================================

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ============================================
// PASSWORD RESET FUNCTIONS
// ============================================

/**
 * Request password reset email
 * @param {string} email - User's email address
 * @returns {Promise} Response with success message
 */
export const requestPasswordReset = async (email) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/auth/password-reset/request/`,
      { email: email.toLowerCase().trim() },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Password reset request sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Password reset request failed:', error);
    throw error;
  }
};

/**
 * Confirm password reset with new password
 * @param {Object} data - Reset data
 * @param {string} data.uid - URL-safe base64 encoded user ID
 * @param {string} data.token - Password reset token
 * @param {string} data.new_password - New password
 * @param {string} data.confirm_password - Password confirmation
 * @returns {Promise} Response with success message
 */
export const confirmPasswordReset = async (data) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/auth/password-reset/confirm/`,
      {
        uid: data.uid,
        token: data.token,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Password reset confirmed:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Password reset confirmation failed:', error);
    throw error;
  }
};


// ============================================
// UPDATE: frontend/src/services/authService.js
// ADD this function at the END of the file
// ============================================

/**
 * Change password for authenticated user
 * @param {Object} data - Password change data
 * @param {string} data.current_password - Current password
 * @param {string} data.new_password - New password
 * @param {string} data.confirm_password - Password confirmation
 * @returns {Promise} Response with success message
 */
export const changePassword = async (data) => {
  try {
    // Get auth token from localStorage
    const token = localStorage.getItem('access');
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await axios.post(
      `${API_BASE_URL}/api/auth/change-password/`,
      {
        current_password: data.current_password,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,  // ← Required for authentication
        },
      }
    );

    console.log('✅ Password changed successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Password change failed:', error);
    throw error;
  }
};


// ============================================
// COMPLETE EXAMPLE - What authService.js should look like:
// ============================================

/*
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Existing functions...
export const requestPasswordReset = async (email) => { ... };
export const confirmPasswordReset = async (data) => { ... };

// NEW FUNCTION - ADD THIS:
export const changePassword = async (data) => {
  try {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await axios.post(
      `${API_BASE_URL}/api/auth/change-password/`,
      {
        current_password: data.current_password,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    console.log('✅ Password changed successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Password change failed:', error);
    throw error;
  }
};
*/