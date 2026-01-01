// ============================================
// USER SERVICE - API CALLS FOR USER MANAGEMENT
// ============================================

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Helper to get auth headers
const getAuthHeaders = () => {
  // Project uses 'access' as the token key
  const token = localStorage.getItem('access');
  
  if (!token) {
    console.error('❌ No authentication token found in localStorage');
    console.log('💡 Available localStorage keys:', Object.keys(localStorage));
    throw new Error('Authentication token not found. Please log in again.');
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// ============================================
// USER CRUD OPERATIONS
// ============================================

/**
 * Fetch all users with optional filters
 * @param {Object} filters - Filter parameters
 * @param {string} filters.role - Filter by role (Admin, Teacher, Student)
 * @param {number} filters.school - Filter by school ID
 * @param {boolean} filters.is_active - Filter by active status
 * @param {string} filters.search - Search by username, email, or name
 * @returns {Promise<Array>} Array of users
 */
export const fetchUsers = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.role && filters.role !== 'All') {
      params.append('role', filters.role);
    }
    if (filters.school) {
      params.append('school', filters.school);
    }
    if (filters.is_active !== undefined && filters.is_active !== null && filters.is_active !== '') {
      params.append('is_active', filters.is_active);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }

    const url = `${API_BASE_URL}/api/auth/users/?${params.toString()}`;
    console.log('📡 Fetching users from:', url);
    console.log('📡 API_BASE_URL:', API_BASE_URL);
    console.log('📡 Has token:', !!localStorage.getItem('access'));

    const response = await axios.get(url, { headers: getAuthHeaders() });

    console.log('✅ Users API response:', response.status);
    console.log('✅ Users fetched:', response.data.length || response.data.results?.length || 0);
    
    // Handle both paginated and non-paginated responses
    return response.data.results || response.data;
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    throw error;
  }
};

/**
 * Fetch a single user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User details
 */
export const fetchUserById = async (userId) => {
  try {
    const url = `${API_BASE_URL}/api/auth/users/${userId}/`;
    console.log('📡 Fetching user details:', userId);

    const response = await axios.get(url, { headers: getAuthHeaders() });

    console.log('✅ User details fetched:', response.data.username);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching user details:', error);
    throw error;
  }
};

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userData.username - Username (required)
 * @param {string} userData.email - Email
 * @param {string} userData.first_name - First name
 * @param {string} userData.last_name - Last name
 * @param {string} userData.role - Role (Admin, Teacher, Student)
 * @param {string} userData.password - Password (optional - auto-generated if not provided)
 * @param {string} userData.confirm_password - Confirm password
 * @param {Array<number>} userData.assigned_schools - School IDs (for teachers)
 * @param {boolean} userData.is_active - Active status
 * @returns {Promise<Object>} Created user with generated_password
 */
export const createUser = async (userData) => {
  try {
    console.log('📤 Creating user:', userData);
    console.log('📧 send_email value:', userData.send_email);
    console.log('📧 send_email type:', typeof userData.send_email);
    
    const token = localStorage.getItem('access');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const API_URL = `${process.env.REACT_APP_API_URL}/api/auth/users/`;
    console.log('🌐 API URL:', API_URL);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response ok:', response.ok);
    
    // Parse response
    const data = await response.json();
    console.log('📥 Response data:', data);

    if (!response.ok) {
      console.error('❌ Backend returned error:', data);
      
      // Create error with response data attached
      const error = new Error('Failed to create user');
      error.response = {
        status: response.status,
        data: data
      };
      throw error;
    }

    console.log('✅ User created successfully:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Error in createUser:', error);
    
    // If it's our custom error with response, throw it as-is
    if (error.response) {
      throw error;
    }
    
    // Otherwise, wrap it
    const wrappedError = new Error(error.message || 'Network error');
    wrappedError.response = null;
    throw wrappedError;
  }
};




































/**
 * Update an existing user
 * @param {number} userId - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} Updated user
 */
export const updateUser = async (userId, userData) => {
  try {
    const url = `${API_BASE_URL}/api/auth/users/${userId}/`;
    console.log('📡 Updating user:', userId);

    const response = await axios.patch(url, userData, { headers: getAuthHeaders() });

    console.log('✅ User updated:', response.data.username);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating user:', error.response?.data || error);
    throw error;
  }
};

/**
 * Deactivate a user (soft delete)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Success message
 */
export const deactivateUser = async (userId) => {
  try {
    const url = `${API_BASE_URL}/api/auth/users/${userId}/`;
    console.log('📡 Deactivating user:', userId);

    const response = await axios.delete(url, { headers: getAuthHeaders() });

    console.log('✅ User deactivated');
    return response.data;
  } catch (error) {
    console.error('❌ Error deactivating user:', error.response?.data || error);
    throw error;
  }
};

// ============================================
// SPECIAL ACTIONS
// ============================================

/**
 * Assign schools to a teacher
 * @param {number} userId - User ID (must be a teacher)
 * @param {Array<number>} schoolIds - Array of school IDs
 * @returns {Promise<Object>} Updated user with assigned schools
 */
export const assignSchools = async (userId, schoolIds) => {
  try {
    const url = `${API_BASE_URL}/api/auth/users/${userId}/assign-schools/`;
    console.log('📡 Assigning schools to user:', userId, schoolIds);

    const response = await axios.post(
      url,
      { school_ids: schoolIds },
      { headers: getAuthHeaders() }
    );

    console.log('✅ Schools assigned:', response.data.assigned_schools?.length || 0);
    return response.data;
  } catch (error) {
    console.error('❌ Error assigning schools:', error.response?.data || error);
    throw error;
  }
};

/**
 * Reset user password
 * @param {number} userId - User ID
 * @param {Object} passwordData - Password data
 * @param {string} passwordData.new_password - New password (optional - auto-generated if not provided)
 * @param {string} passwordData.confirm_password - Confirm password (required if new_password provided)
 * @returns {Promise<Object>} Success message with new password
 */
export const resetPassword = async (userId, passwordData = {}) => {
  try {
    const url = `${API_BASE_URL}/api/auth/users/${userId}/reset-password/`;
    console.log('📡 Resetting password for user:', userId);

    const response = await axios.post(url, passwordData, { headers: getAuthHeaders() });

    console.log('✅ Password reset successfully');
    if (response.data.new_password) {
      console.log('🔑 New password:', response.data.new_password);
    }
    return response.data;
  } catch (error) {
    console.error('❌ Error resetting password:', error.response?.data || error);
    throw error;
  }
};

// ============================================
// STATISTICS & METADATA
// ============================================

/**
 * Fetch user statistics
 * @returns {Promise<Object>} User statistics
 */
export const fetchUserStats = async () => {
  try {
    const url = `${API_BASE_URL}/api/auth/users/user-stats/`;
    console.log('📡 Fetching user statistics');

    const response = await axios.get(url, { headers: getAuthHeaders() });

    console.log('✅ User stats fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching user stats:', error);
    throw error;
  }
};

/**
 * Fetch available roles
 * @returns {Promise<Array>} Array of role objects with value and label
 */
export const fetchAvailableRoles = async () => {
  try {
    const url = `${API_BASE_URL}/api/auth/users/available-roles/`;
    console.log('📡 Fetching available roles');

    const response = await axios.get(url, { headers: getAuthHeaders() });

    console.log('✅ Roles fetched:', response.data.roles?.length || 0);
    return response.data.roles || [];
  } catch (error) {
    console.error('❌ Error fetching roles:', error);
    throw error;
  }
};

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

export default {
  fetchUsers,
  fetchUserById,
  createUser,
  updateUser,
  deactivateUser,
  assignSchools,
  resetPassword,
  fetchUserStats,
  fetchAvailableRoles,
};