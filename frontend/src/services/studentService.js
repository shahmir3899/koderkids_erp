// ============================================
// STUDENT SERVICE - Student CRUD Operations
// ============================================

import axios from 'axios';
// Adjust these paths to where you saved your files
import { API_URL, API_ENDPOINTS, STUDENT_STATUS } from '../utils/constants'; 
import { getAuthHeaders, handleAuthError } from '../utils/authHelpers'; 

/**
 * Fetch students with optional filters
 * @param {Object} filters - Filter options
 * @param {number|string} filters.schoolId - School ID (optional)
 * @param {string} filters.studentClass - Class name (optional)
 * @param {string} filters.status - Student status (default: 'Active')
 * @returns {Promise<Array>} List of students
 */
export const fetchStudents = async (filters = {}) => {
  try {
    const { schoolId = '', studentClass = '', status = STUDENT_STATUS.ACTIVE } = filters;

    console.log('🔍 DEBUG: Requesting students with raw filters:', { schoolId, studentClass, status });

    const params = { status };

    // Try multiple param variants for school (log which is used)
    if (schoolId) {
      params.school = schoolId;  // Original
      console.log('🔍 DEBUG: Added school param as "school":', schoolId);
      // Alternative: Uncomment one at a time to test
      // params.school_id = schoolId;  // If backend expects school_id
    }

    // Try multiple param variants for class
    if (studentClass && studentClass !== 'All Classes') {
      params.student_class = studentClass;  // Original (recommended)
      console.log('🔍 DEBUG: Added student_class param as:', studentClass);
      // Alternatives: Uncomment one at a time if above fails
      // params.class_name = studentClass;  // If backend expects class_name
      // params['class'] = studentClass;    // If using 'class' (avoid if possible)
    }

    console.log('🔍 DEBUG: Final params object sent to API:', params);

    const response = await axios.get(`${API_URL}${API_ENDPOINTS.STUDENTS}`, {
      headers: getAuthHeaders(),
      params,
    });

    console.log('✅ Students fetched (count):', response.data.length, 'Data sample:', response.data.slice(0, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching students:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

/**
 * Add a new student
 * @param {Object} studentData - Student data payload
 */
export const addStudent = async (studentData) => {
  try {
    console.log('🚀 Adding new student:', studentData);

    // Ensure school is sent as an integer ID
    const payload = {
        ...studentData,
        school: parseInt(studentData.school), 
        monthly_fee: parseFloat(studentData.monthly_fee)
    };

    const response = await axios.post(`${API_URL}${API_ENDPOINTS.STUDENTS_ADD}`, payload, {
      headers: getAuthHeaders(),
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error adding student:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Update an existing student
 * @param {number} studentId - Student ID (primary key)
 * @param {Object} studentData - Updated data
 */
export const updateStudent = async (studentId, studentData) => {
  try {
    console.log(`✏️ Updating student ID: ${studentId}`, studentData);

    // Ensure school is sent as an integer ID
    const payload = {
        ...studentData,
        school: parseInt(studentData.school),
        monthly_fee: parseFloat(studentData.monthly_fee)
    };

    const response = await axios.put(
      `${API_URL}${API_ENDPOINTS.STUDENTS}${studentId}/`,
      payload,
      { headers: getAuthHeaders() }
    );

    return response.data;
  } catch (error) {
    console.error('❌ Error updating student:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Delete a student
 * @param {number} studentId 
 */
export const deleteStudent = async (studentId) => {
  try {
    console.log(`🗑️ Deleting student ID: ${studentId}`);

    const response = await axios.delete(`${API_URL}${API_ENDPOINTS.STUDENTS}${studentId}/`, {
      headers: getAuthHeaders(),
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error deleting student:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

export default {
  fetchStudents,
  addStudent,
  updateStudent,
  deleteStudent,
};