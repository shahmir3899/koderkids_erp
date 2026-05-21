// frontend/src/services/onlineStudentDashboardService.js
import { API_URL, getAuthHeaders } from '../api';

const handleResponse = async (response) => {
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${response.status}`);
  }
  return response.json();
};

/**
 * Fetch all dashboard data for the currently logged-in ONLINE student.
 * Returns: student, enrolled_books, continue_learning, learning_streak,
 *          recent_activity, recent_quizzes, fees, badges
 */
export const getOnlineDashboard = async () => {
  const response = await fetch(
    `${API_URL}/api/students/online-dashboard/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};
