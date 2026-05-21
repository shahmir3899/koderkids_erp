// frontend/src/services/onlineStudentAdminService.js
import { API_URL, getAuthHeaders } from '../api';

/**
 * Admin service for managing online student course assignments
 */

/**
 * Get list of all ONLINE subtype students with their enrollments
 */
export const getOnlineStudents = async () => {
  const response = await fetch(
    `${API_URL}/api/courses/admin/online-students/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Get detailed info for a specific online student
 */
export const getOnlineStudentDetail = async (studentId) => {
  const response = await fetch(
    `${API_URL}/api/courses/admin/online-students/${studentId}/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Get editable profile data for a specific online student.
 */
export const getOnlineStudentProfile = async (studentId) => {
  const response = await fetch(
    `${API_URL}/api/courses/admin/online-students/${studentId}/profile/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Update editable profile fields for an online student.
 * @param {number} studentId - Student ID
 * @param {object} payload - Partial or full profile payload
 * @param {boolean} partial - Use PATCH when true, PUT when false
 */
export const updateOnlineStudentProfile = async (studentId, payload, partial = true) => {
  const response = await fetch(
    `${API_URL}/api/courses/admin/online-students/${studentId}/profile/`,
    {
      method: partial ? 'PATCH' : 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );
  return handleResponse(response);
};

/**
 * Get all available courses that can be assigned
 */
export const getAvailableCourses = async () => {
  const response = await fetch(
    `${API_URL}/api/courses/admin/online-students/available-courses/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Assign courses to a specific student
 * @param {number} studentId - Student ID
 * @param {array} courseIds - Array of course IDs to assign
 * @param {boolean} skipExisting - Skip courses already enrolled
 */
export const assignCoursesToStudent = async (studentId, courseIds, skipExisting = true) => {
  const response = await fetch(
    `${API_URL}/api/courses/admin/online-students/${studentId}/assign-courses/`,
    {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_ids: courseIds,
        skip_existing: skipExisting
      })
    }
  );
  return handleResponse(response);
};

/**
 * Remove a course enrollment from a student
 * @param {number} studentId - Student ID
 * @param {number} enrollmentId - Enrollment ID to remove
 */
export const removeCourseFromStudent = async (studentId, enrollmentId) => {
  const response = await fetch(
    `${API_URL}/api/courses/admin/online-students/${studentId}/enrollments/${enrollmentId}/`,
    {
      method: 'DELETE',
      headers: getAuthHeaders()
    }
  );
  return handleResponse(response);
};

/**
 * Bulk assign courses to multiple students at once
 * @param {array} studentIds - Array of student IDs
 * @param {array} courseIds - Array of course IDs
 * @param {boolean} skipExisting - Skip courses already enrolled
 */
export const bulkAssignCourses = async (studentIds, courseIds, skipExisting = true) => {
  const response = await fetch(
    `${API_URL}/api/courses/admin/online-students/bulk-assign-courses/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        student_ids: studentIds,
        course_ids: courseIds,
        skip_existing: skipExisting
      })
    }
  );
  return handleResponse(response);
};

/**
 * Create a new ONLINE student.
 * @param {object} payload - { name, reg_num, school, time_slot?, monthly_fee?, gender?, phone?, date_of_birth?, address? }
 */
export const createOnlineStudent = async (payload) => {
  const response = await fetch(`${API_URL}/api/students/add/`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, student_subtype: 'ONLINE' }),
  });
  return handleResponse(response);
};

/**
 * Handle API responses consistently
 */
async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const validationMessage =
      error.email?.[0] ||
      error.name?.[0] ||
      error.phone?.[0];
    throw new Error(validationMessage || error.detail || error.error || 'API request failed');
  }
  return response.json();
}
