// ============================================
// SCHOOL SERVICE - School & Class API Calls
// ============================================

import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../../utils/constants';
import { getAuthHeaders, handleAuthError } from '../../utils/authHelpers';

// ============================================
// EXISTING FUNCTIONS (UNCHANGED)
// ============================================

/**
 * Fetch all schools
 * @returns {Promise<Array>} List of schools
 */
export const fetchSchools = async () => {
  try {
    console.log('📡 Fetching schools...');
    
    const response = await axios.get(`${API_URL}${API_ENDPOINTS.SCHOOLS}`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Schools fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching schools:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Fetch classes for a specific school
 * @param {number} schoolId - School ID
 * @returns {Promise<Array>} List of classes
 */
export const fetchClasses = async (schoolId) => {
  try {
    if (!schoolId) {
      console.error('❌ No school ID provided for class fetch!');
      return [];
    }

    console.log(`📡 Fetching classes for school ID: ${schoolId}...`);
    
    const response = await axios.get(`${API_URL}${API_ENDPOINTS.CLASSES}`, {
      headers: getAuthHeaders(),
      params: { school: schoolId },
    });

    console.log('✅ Classes fetched:', response.data);

    // Remove duplicates and sort
    const uniqueSortedClasses = [...new Set(response.data)].sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true })
    );

    return uniqueSortedClasses;
  } catch (error) {
    console.error('❌ Error fetching classes:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

/**
 * Fetch schools with their classes
 * @returns {Promise<Array>} List of schools with classes
 */
export const fetchSchoolsWithClasses = async () => {
  try {
    console.log('📡 Fetching schools with classes...');

    const response = await axios.get(`${API_URL}${API_ENDPOINTS.SCHOOLS_WITH_CLASSES}`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Schools with classes fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching schools with classes:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Fetch school details by ID or name
 * @param {number|null} schoolId - School ID
 * @param {string|null} schoolName - School name
 * @returns {Promise<Object>} School details
 */
export const fetchSchoolDetails = async (schoolId = null, schoolName = null) => {
  try {
    const params = schoolId ? { school_id: schoolId } : { school_name: schoolName };
    console.log('📡 Fetching school details with params:', params);

    const response = await axios.get(`${API_URL}${API_ENDPOINTS.SCHOOL_DETAILS}`, {
      headers: getAuthHeaders(),
      params: params,
    });

    console.log('✅ School details fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching school details:', error.response?.data || error.message);
    handleAuthError(error);
    return null;
  }
};

/**
 * Get unique classes from multiple schools
 * @param {Array} schools - Array of school objects with classes
 * @returns {Array} Sorted unique classes
 */
export const getUniqueClasses = (schools) => {
  if (!schools || !Array.isArray(schools)) return [];
  
  const allClasses = schools.flatMap(school => school.classes || []);
  const uniqueClasses = [...new Set(allClasses)];
  
  return uniqueClasses.sort((a, b) => 
    a.localeCompare(b, undefined, { numeric: true })
  );
};

// ============================================
// NEW FUNCTIONS - SCHOOL CRUD OPERATIONS
// ============================================

/**
 * Create a new school (Admin only)
 * @param {Object} schoolData - School data
 * @returns {Promise<Object>} Created school
 */
export const createSchool = async (schoolData) => {
  try {
    console.log('📡 Creating new school:', schoolData);
    
    const response = await axios.post(
      `${API_URL}${API_ENDPOINTS.SCHOOLS}`,
      schoolData,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ School created:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating school:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Update an existing school (Admin only)
 * @param {number} schoolId - School ID
 * @param {Object} schoolData - Updated school data
 * @returns {Promise<Object>} Updated school
 */
export const updateSchool = async (schoolId, schoolData) => {
  try {
    console.log(`📡 Updating school ${schoolId}:`, schoolData);
    
    const response = await axios.put(
      `${API_URL}${API_ENDPOINTS.SCHOOLS}${schoolId}/`,
      schoolData,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ School updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating school:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Deactivate a school (Soft Delete - Admin only)
 * This will:
 * - Set school is_active to false
 * - Mark all active students as 'Left'
 * - Remove school from all teachers' assigned_schools
 * @param {number} schoolId - School ID
 * @returns {Promise<Object>} Deactivation result with details
 */
export const deleteSchool = async (schoolId) => {
  try {
    console.log(`📡 Deactivating school ${schoolId}...`);

    const response = await axios.delete(`${API_URL}${API_ENDPOINTS.SCHOOLS}${schoolId}/`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ School deactivated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error deactivating school:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Reactivate a deactivated school (Admin only)
 * @param {number} schoolId - School ID
 * @returns {Promise<Object>} Reactivated school data
 */
export const reactivateSchool = async (schoolId) => {
  try {
    console.log(`📡 Reactivating school ${schoolId}...`);

    const response = await axios.post(
      `${API_URL}${API_ENDPOINTS.SCHOOLS}${schoolId}/reactivate/`,
      {},
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ School reactivated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error reactivating school:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Fetch all deactivated schools (Admin only)
 * @returns {Promise<Array>} List of deactivated schools
 */
export const fetchDeactivatedSchools = async () => {
  try {
    console.log('📡 Fetching deactivated schools...');

    const response = await axios.get(
      `${API_URL}${API_ENDPOINTS.SCHOOLS}deactivated/`,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ Deactivated schools fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching deactivated schools:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Get detailed statistics for a specific school
 * @param {number} schoolId - School ID
 * @returns {Promise<Object>} School statistics
 */
export const fetchSchoolStats = async (schoolId) => {
  try {
    console.log(`📡 Fetching stats for school ${schoolId}...`);
    
    const response = await axios.get(
      `${API_URL}${API_ENDPOINTS.SCHOOLS}${schoolId}/stats/`,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ School stats fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching school stats:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Get overview statistics for all schools
 * @returns {Promise<Object>} Overview data with all schools and aggregated stats
 */
export const fetchSchoolsOverview = async () => {
  try {
    console.log('📡 Fetching schools overview...');
    
    const response = await axios.get(
      `${API_URL}${API_ENDPOINTS.SCHOOLS}overview/`,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ Schools overview fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching schools overview:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Upload school logo to Supabase
 * @param {File} file - Image file
 * @param {string} schoolName - School name for filename
 * @returns {Promise<string>} URL of uploaded image
 */
export const uploadSchoolLogo = async (file, schoolName) => {
  try {
    console.log('📡 Uploading school logo...');
    
    // Placeholder - implement based on your Supabase setup
    const formData = new FormData();
    formData.append('file', file);
    formData.append('school_name', schoolName);
    
    // TODO: Replace with your actual Supabase upload endpoint
    // const response = await axios.post(`${API_URL}/api/upload-school-logo/`, formData, {
    //   headers: {
    //     ...getAuthHeaders(),
    //     'Content-Type': 'multipart/form-data',
    //   },
    // });
    // return response.data.url;
    
    console.log('⚠️ Logo upload not implemented yet - returning null');
    return null;
  } catch (error) {
    console.error('❌ Error uploading logo:', error.response?.data || error.message);
    throw error;
  }
};

// ============================================
// EXPORTS - All functions (old + new)
// ============================================

export default {
  // Existing functions
  fetchSchools,
  fetchClasses,
  fetchSchoolsWithClasses,
  fetchSchoolDetails,
  getUniqueClasses,

  // CRUD functions
  createSchool,
  updateSchool,
  deleteSchool,
  fetchSchoolStats,
  fetchSchoolsOverview,
  uploadSchoolLogo,

  // Soft delete functions
  reactivateSchool,
  fetchDeactivatedSchools,
};