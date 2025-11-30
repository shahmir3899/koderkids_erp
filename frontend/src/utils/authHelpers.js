// ============================================
// AUTH HELPERS - Authentication Utilities
// ============================================

import { STORAGE_KEYS } from './constants';

/**
 * Get authentication headers for API requests
 * @returns {Object} Authorization header or empty object
 */
export const getAuthHeaders = () => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  
  if (!token) {
    console.warn('⚠️ No authentication token found!');
    return {};
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  return !!token;
};

/**
 * Get current user's role
 * @returns {string|null} User role or null
 */
export const getUserRole = () => {
  return localStorage.getItem(STORAGE_KEYS.USER_ROLE);
};

/**
 * Get current user's full name
 * @returns {string} User's full name or 'Unknown'
 */
export const getUserFullName = () => {
  return localStorage.getItem(STORAGE_KEYS.FULL_NAME) || 'Unknown';
};

/**
 * Get current username
 * @returns {string} Username or 'Unknown'
 */
export const getUsername = () => {
  return localStorage.getItem(STORAGE_KEYS.USERNAME) || 'Unknown';
};

/**
 * Check if user has specific role
 * @param {string} role - Role to check (Admin, Teacher, Student)
 * @returns {boolean}
 */
export const hasRole = (role) => {
  const userRole = getUserRole();
  return userRole === role;
};

/**
 * Check if user has any of the specified roles
 * @param {Array<string>} roles - Array of roles to check
 * @returns {boolean}
 */
export const hasAnyRole = (roles) => {
  const userRole = getUserRole();
  return roles.includes(userRole);
};

/**
 * Store authentication data after login
 * @param {Object} data - Login response data
 */
export const storeAuthData = (data) => {
  if (data.access) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access);
  if (data.refresh) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh);
  if (data.role) localStorage.setItem(STORAGE_KEYS.USER_ROLE, data.role);
  if (data.username) localStorage.setItem(STORAGE_KEYS.USERNAME, data.username);
  if (data.fullName) localStorage.setItem(STORAGE_KEYS.FULL_NAME, data.fullName);
  if (data.employee_id) localStorage.setItem(STORAGE_KEYS.EMPLOYEE_ID, data.employee_id);
  
  console.log('✅ Authentication data stored successfully');
};

/**
 * Clear all authentication data and redirect to login
 */
export const logout = () => {
  // Clear localStorage
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear browser cache
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
  
  console.log('✅ User logged out successfully');
  
  // Redirect to login
  window.location.href = '/login';
};

/**
 * Redirect user based on their role
 */
export const redirectByRole = () => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const role = getUserRole();

  if (!token) {
    window.location.href = '/login';
    return;
  }

  switch (role) {
    case 'Admin':
      window.location.href = '/admindashboard';
      break;
    case 'Teacher':
      window.location.href = '/teacherdashboard';
      break;
    case 'Student':
      window.location.href = '/student-dashboard';
      break;
    default:
      window.location.href = '/login';
  }
};

/**
 * Handle API authentication errors (401, 403)
 * @param {Error} error - API error object
 * @returns {boolean} True if handled, false otherwise
 */
export const handleAuthError = (error) => {
  if (error.response) {
    const status = error.response.status;
    
    if (status === 401) {
      console.error('🔒 Unauthorized - Logging out');
      logout();
      return true;
    }
    
    if (status === 403) {
      console.error('🚫 Forbidden - Insufficient permissions');
      return true;
    }
  }
  
  return false;
};

/**
 * Get user data from localStorage
 * @returns {Object} User data object
 */
export const getUserData = () => {
  return {
    role: getUserRole(),
    username: getUsername(),
    fullName: getUserFullName(),
    employeeId: localStorage.getItem(STORAGE_KEYS.EMPLOYEE_ID),
    isAuthenticated: isAuthenticated(),
  };
};

// Export all functions
export default {
  getAuthHeaders,
  isAuthenticated,
  getUserRole,
  getUserFullName,
  getUsername,
  hasRole,
  hasAnyRole,
  storeAuthData,
  logout,
  redirectByRole,
  handleAuthError,
  getUserData,
};