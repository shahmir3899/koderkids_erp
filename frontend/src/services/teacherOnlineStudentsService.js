// frontend/src/services/teacherOnlineStudentsService.js
import { API_URL, getAuthHeaders } from '../api';

const handleResponse = async (response) => {
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${response.status}`);
  }
  return response.json();
};

/**
 * Fetch all ONLINE students for the requesting teacher (via their time slots).
 * Admin can optionally pass teacher_id to filter by a specific teacher.
 * @param {Object} params - { teacher_id? } (Admin only)
 */
export const getMyOnlineStudents = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.teacher_id) query.append('teacher_id', params.teacher_id);
  const response = await fetch(
    `${API_URL}/employees/my-online-students/?${query.toString()}`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};
