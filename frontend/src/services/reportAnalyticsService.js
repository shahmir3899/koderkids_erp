import axios from 'axios';
import { API_URL, getAuthHeaders } from '../api';

const parseMonthFromDate = (dateValue) => {
  if (!dateValue) return '';
  if (/^\d{4}-\d{2}$/.test(dateValue)) return dateValue;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue.slice(0, 7);
  return '';
};

export const reportAnalyticsService = {
  getStudentReportsUserSummary: async ({ month, schoolId, classId, userId } = {}) => {
    const params = new URLSearchParams();
    const normalizedMonth = parseMonthFromDate(month);
    if (!normalizedMonth) throw new Error('month is required in YYYY-MM format');
    params.append('month', normalizedMonth);
    if (schoolId) params.append('school_id', schoolId);
    if (classId) params.append('class_id', classId);
    if (userId) params.append('user_id', userId);

    const response = await axios.get(
      `${API_URL}/api/reports/analytics/student-reports/user-summary/?${params.toString()}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  getStudentReportsMonthlyBreakdown: async ({ month, schoolId, classId, userId } = {}) => {
    const params = new URLSearchParams();
    const normalizedMonth = parseMonthFromDate(month);
    if (!normalizedMonth) throw new Error('month is required in YYYY-MM format');
    params.append('month', normalizedMonth);
    if (schoolId) params.append('school_id', schoolId);
    if (classId) params.append('class_id', classId);
    if (userId) params.append('user_id', userId);

    const response = await axios.get(
      `${API_URL}/api/reports/analytics/student-reports/monthly-breakdown/?${params.toString()}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  getAdminMonitoring: async ({ from, to } = {}) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const query = params.toString();
    const response = await axios.get(
      `${API_URL}/api/reports/requests/admin-monitoring/${query ? `?${query}` : ''}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },
};

export default reportAnalyticsService;
