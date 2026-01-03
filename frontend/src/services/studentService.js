// ============================================
// STUDENT SERVICE - Complete API calls
// UPDATED: Uses centralized API config
// Location: frontend/src/services/studentService.js
// ============================================

import axios from 'axios';
import { API_URL, getAuthHeaders, getJsonHeaders, getMultipartHeaders } from '../api';

// ============================================
// ADMIN STUDENT MANAGEMENT (for StudentsPage)
// ============================================

/**
 * Fetch all students (for admin)
 * @param {Object} filters - Filter options (schoolId, studentClass, status)
 * @returns {Promise} Array of students
 */
export const fetchStudents = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.schoolId) params.append('school', filters.schoolId);
    if (filters.studentClass) params.append('class', filters.studentClass);
    if (filters.status) params.append('status', filters.status);

    const response = await axios.get(
      `${API_URL}/api/students/?${params.toString()}`,
      {
        headers: getAuthHeaders(),
      }
    );

    return response.data;
  } catch (error) {
    console.error('❌ Error fetching students:', error);
    throw error;
  }
};

/**
 * Update a student (for admin)
 * @param {number} studentId - Student ID
 * @param {Object} studentData - Updated student data
 * @returns {Promise} Updated student
 */
export const updateStudent = async (studentId, studentData) => {
  try {
    const response = await axios.put(
      `${API_URL}/api/students/${studentId}/`,
      studentData,
      {
        headers: getJsonHeaders(),
      }
    );

    return response.data;
  } catch (error) {
    console.error('❌ Error updating student:', error);
    throw error;
  }
};

/**
 * Delete a student (for admin)
 * @param {number} studentId - Student ID
 * @returns {Promise} Success response
 */
export const deleteStudent = async (studentId) => {
  try {
    const response = await axios.delete(
      `${API_URL}/api/students/${studentId}/`,
      {
        headers: getAuthHeaders(),
      }
    );

    return response.data;
  } catch (error) {
    console.error('❌ Error deleting student:', error);
    throw error;
  }
};

// ============================================
// STUDENT PROFILE MANAGEMENT (for StudentDashboard)
// ============================================

/**
 * Get current student's complete profile
 * Uses ViewSet endpoint: /api/students/profile/
 * @returns {Promise} Student profile data including fees and attendance
 */
export const getStudentProfile = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/api/students/profile/`,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ Student profile loaded:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching student profile:', error);
    throw error;
  }
};

/**
 * Update current student's profile
 * Uses PUT to /api/students/profile/
 * @param {Object} profileData - Updated profile data
 * @returns {Promise} Updated profile data
 */
export const updateStudentProfile = async (profileData) => {
  try {
    // Extract only the fields students are allowed to update
    const allowedFields = {
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      phone: profileData.phone,
      address: profileData.address,
    };

    const response = await axios.put(
      `${API_URL}/api/students/profile/`,
      allowedFields,
      {
        headers: getJsonHeaders(),
      }
    );

    console.log('✅ Student profile updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating student profile:', error);
    
    // Handle specific error cases
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to update this profile.');
    } else if (error.response?.status === 404) {
      throw new Error('Student profile not found.');
    } else if (error.response?.data) {
      // Return validation errors from serializer
      throw new Error(JSON.stringify(error.response.data));
    }
    
    throw error;
  }
};

/**
 * Partial update of student profile (PATCH)
 * @param {Object} partialData - Partial profile data to update
 * @returns {Promise} Updated profile data
 */
export const patchStudentProfile = async (partialData) => {
  try {
    const response = await axios.patch(
      `${API_URL}/api/students/profile/`,
      partialData,
      {
        headers: getJsonHeaders(),
      }
    );

    console.log('✅ Student profile patched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error patching student profile:', error);
    throw error;
  }
};

/**
 * Upload student profile photo
 * @param {File} photoFile - Image file to upload
 * @returns {Promise} Updated profile with photo URL
 */
export const uploadStudentPhoto = async (photoFile) => {
  try {
    const formData = new FormData();
    formData.append('photo', photoFile);

    const response = await axios.post(
      `${API_URL}/api/students/profile/photo/`,
      formData,
      {
        headers: getMultipartHeaders(),
      }
    );

    console.log('✅ Student photo uploaded:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error uploading student photo:', error);
    
    if (error.response?.status === 404) {
      throw new Error('Photo upload not yet available. Contact administrator.');
    }
    
    throw error;
  }
};

/**
 * Delete student profile photo
 * @returns {Promise} Success message
 */
export const deleteStudentPhoto = async () => {
  try {
    const response = await axios.delete(
      `${API_URL}/api/students/profile/photo/delete/`,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ Student photo deleted:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting student photo:', error);
    
    if (error.response?.status === 404) {
      throw new Error('Photo delete not yet available. Contact administrator.');
    }
    
    throw error;
  }
};

// ============================================
// LEGACY/DEPRECATED ENDPOINTS
// ============================================

/**
 * DEPRECATED: Legacy endpoint - use getStudentProfile() instead
 * Get current user info (for additional profile data)
 * @returns {Promise} User data
 */
export const getStudentUser = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/api/auth/user/`,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ Student user loaded:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching student user:', error);
    throw error;
  }
};

/**
 * DEPRECATED: Use getStudentProfile() instead
 * Get combined student profile (dashboard data + user data)
 * @returns {Promise} Combined profile data
 */
export const getCompleteStudentProfile = async () => {
  console.warn('⚠️ getCompleteStudentProfile() is deprecated. Use getStudentProfile() instead.');
  return getStudentProfile();
};

export default {
  // Admin CRUD
  fetchStudents,
  updateStudent,
  deleteStudent,
  
  // Student Profile
  getStudentProfile,
  updateStudentProfile,
  patchStudentProfile,
  
  // Photo management
  uploadStudentPhoto,
  deleteStudentPhoto,
  
  // Legacy/Deprecated
  getStudentUser,
  getCompleteStudentProfile,
};