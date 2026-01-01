import axios from 'axios';
import { API_URL, API_ENDPOINTS, STUDENT_STATUS } from '../utils/constants'; 
import { getAuthHeaders, handleAuthError } from '../utils/authHelpers'; 

// Fallback for API URL if constants aren't loaded
const API_BASE_URL = API_URL || process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ============================================
// 1. STUDENT PROFILE OPERATIONS (Logged-in Student)
// ============================================

/**
 * Get current logged-in student's data
 */
export const getStudentProfile = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/students/my-data/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    handleAuthError(error);
    throw error;
  }
};

/**
 * Get current user account info
 */
export const getStudentUser = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/auth/user/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    handleAuthError(error);
    throw error;
  }
};

/**
 * Update current student's profile (Auth/User data)
 */
export const updateStudentProfile = async (profileData) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/api/auth/user/update/`,
      profileData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    handleAuthError(error);
    throw error;
  }
};

/**
 * Combines Dashboard data and User data into one object
 */
export const getCompleteStudentProfile = async () => {
  try {
    const [dashboardData, userData] = await Promise.all([
      getStudentProfile(),
      getStudentUser()
    ]);

    return {
      // Base info
      id: userData.id,
      username: userData.username,
      email: userData.email,
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      full_name: userData.full_name || `${userData.first_name} ${userData.last_name}`.trim() || userData.username,
      phone: userData.phone || '',
      address: userData.address || '',
      blood_group: userData.blood_group || '',
      profile_photo_url: userData.profile_photo_url || null,
      
      // Academic info from dashboard
      school: dashboardData.school,
      class: dashboardData.student_class || dashboardData.class,
      reg_num: dashboardData.reg_num,
      
      // Merge all other fields
      ...dashboardData,
      ...userData,
    };
  } catch (error) {
    console.error('❌ Error fetching complete profile:', error);
    throw error;
  }
};

// ============================================
// 2. STUDENT MANAGEMENT OPERATIONS (Admin/CRUD)
// ============================================

/**
 * Fetch students with optional filters
 */
export const fetchStudents = async (filters = {}) => {
  try {
    const { schoolId = '', studentClass = '', status = STUDENT_STATUS?.ACTIVE || 'Active' } = filters;
    
    const params = { status };
    if (schoolId) params.school = schoolId;
    if (studentClass && studentClass !== 'All Classes') {
      params.student_class = studentClass;
    }

    const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.STUDENTS}`, {
      headers: getAuthHeaders(),
      params,
    });

    return response.data;
  } catch (error) {
    handleAuthError(error);
    return [];
  }
};

/**
 * Add a new student record
 */
export const addStudent = async (studentData) => {
  try {
    const payload = {
      ...studentData,
      school: parseInt(studentData.school), 
      monthly_fee: parseFloat(studentData.monthly_fee)
    };

    const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.STUDENTS_ADD}`, payload, {
      headers: getAuthHeaders(),
    });

    return response.data;
  } catch (error) {
    handleAuthError(error);
    throw error;
  }
};

/**
 * Update an existing student record
 */
export const updateStudent = async (studentId, studentData) => {
  try {
    const payload = {
      ...studentData,
      school: parseInt(studentData.school),
      monthly_fee: parseFloat(studentData.monthly_fee)
    };

    const response = await axios.put(
      `${API_BASE_URL}${API_ENDPOINTS.STUDENTS}${studentId}/`,
      payload,
      { headers: getAuthHeaders() }
    );

    return response.data;
  } catch (error) {
    handleAuthError(error);
    throw error;
  }
};

/**
 * Delete a student record
 */
export const deleteStudent = async (studentId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}${API_ENDPOINTS.STUDENTS}${studentId}/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleAuthError(error);
    throw error;
  }
};

// ============================================
// EXPORT ALL
// ============================================
const studentService = {
  getStudentProfile,
  getStudentUser,
  updateStudentProfile,
  getCompleteStudentProfile,
  fetchStudents,
  addStudent,
  updateStudent,
  deleteStudent,
};

export default studentService;