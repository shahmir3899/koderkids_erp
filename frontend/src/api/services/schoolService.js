// ============================================
// SCHOOL SERVICE - School & Class API Calls
// ============================================

import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../../utils/constants';
import { getAuthHeaders, handleAuthError } from '../../utils/authHelpers';

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

// Export all functions
export default {
  fetchSchools,
  fetchClasses,
  fetchSchoolsWithClasses,
  fetchSchoolDetails,
  getUniqueClasses,
};