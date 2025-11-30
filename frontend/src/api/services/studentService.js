// ============================================
// STUDENT SERVICE - Student CRUD Operations
// ============================================

import axios from 'axios';
import { API_URL, API_ENDPOINTS, STUDENT_STATUS } from '../../utils/constants';
import { getAuthHeaders, handleAuthError } from '../../utils/authHelpers';

/**
 * Fetch students with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.schoolName - School name (required)
 * @param {string} filters.studentClass - Class name (optional)
 * @param {string} filters.status - Student status (default: 'Active')
 * @returns {Promise<Array>} List of students
 */
export const fetchStudents = async (filters = {}) => {
  try {
    const { schoolName = '', studentClass = '', status = STUDENT_STATUS.ACTIVE } = filters;

    console.log('📡 Requesting students with filters:', { schoolName, studentClass, status });

    if (!schoolName) {
      console.error('❌ No school selected! Request cannot proceed.');
      return [];
    }

    const params = {
      school: schoolName,
      class: studentClass ? String(studentClass) : '',
      status: status,
    };

    const response = await axios.get(`${API_URL}${API_ENDPOINTS.STUDENTS}`, {
      headers: getAuthHeaders(),
      params: params,
    });

    console.log('✅ Students fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching students:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

/**
 * Add a new student
 * @param {Object} studentData - Student data
 * @returns {Promise<Object>} Created student data
 */
export const addStudent = async (studentData) => {
  try {
    console.log('🚀 Adding new student:', studentData);

    const response = await axios.post(`${API_URL}${API_ENDPOINTS.STUDENTS_ADD}`, studentData, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Student added successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error adding student:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Update an existing student
 * @param {number} studentId - Student ID
 * @param {Object} studentData - Updated student data
 * @returns {Promise<Object>} Updated student data
 */
export const updateStudent = async (studentId, studentData) => {
  try {
    console.log(`✏️ Updating student ID: ${studentId}`, studentData);

    const response = await axios.put(
      `${API_URL}${API_ENDPOINTS.STUDENTS}${studentId}/`,
      studentData,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ Student updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating student:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Delete a student
 * @param {number} studentId - Student ID
 * @returns {Promise<Object>} Deletion response
 */
export const deleteStudent = async (studentId) => {
  try {
    console.log(`🗑️ Deleting student ID: ${studentId}`);

    const response = await axios.delete(`${API_URL}${API_ENDPOINTS.STUDENTS}${studentId}/`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Student deleted successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting student:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Fetch student attendance counts
 * @param {Object} params - Query parameters
 * @param {string} params.month - Month in YYYY-MM format
 * @param {number} params.schoolId - School ID
 * @param {string} params.studentClass - Class name
 * @returns {Promise<Array>} Attendance data
 */
export const fetchStudentAttendance = async (params) => {
  try {
    const { month, schoolId, studentClass } = params;
    
    console.log('📡 Fetching student attendance:', params);

    const queryParams = `month=${month}&school_id=${schoolId}&student_class=${studentClass}`;
    const response = await axios.get(
      `${API_URL}${API_ENDPOINTS.STUDENT_ATTENDANCE}?${queryParams}`,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ Attendance data fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching attendance:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

/**
 * Fetch student achieved topics count
 * @param {Object} params - Query parameters
 * @param {string} params.month - Month in YYYY-MM format
 * @param {number} params.schoolId - School ID
 * @param {string} params.studentClass - Class name
 * @returns {Promise<Array>} Topics data
 */
export const fetchStudentTopics = async (params) => {
  try {
    const { month, schoolId, studentClass } = params;
    
    console.log('📡 Fetching student topics:', params);

    const queryParams = `month=${month}&school_id=${schoolId}&student_class=${studentClass}`;
    const response = await axios.get(
      `${API_URL}${API_ENDPOINTS.STUDENT_TOPICS}?${queryParams}`,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ Topics data fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching topics:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

/**
 * Fetch student image uploads count
 * @param {Object} params - Query parameters
 * @param {string} params.month - Month in YYYY-MM format
 * @param {number} params.schoolId - School ID
 * @param {string} params.studentClass - Class name
 * @returns {Promise<Array>} Images data
 */
export const fetchStudentImages = async (params) => {
  try {
    const { month, schoolId, studentClass } = params;
    
    console.log('📡 Fetching student images:', params);

    const queryParams = `month=${month}&school_id=${schoolId}&student_class=${studentClass}`;
    const response = await axios.get(
      `${API_URL}${API_ENDPOINTS.STUDENT_IMAGES}?${queryParams}`,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ Images data fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching images:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

// Export all functions
export default {
  fetchStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  fetchStudentAttendance,
  fetchStudentTopics,
  fetchStudentImages,
};