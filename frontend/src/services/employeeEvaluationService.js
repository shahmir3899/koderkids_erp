// ============================================
// EMPLOYEE EVALUATION SERVICE
// ============================================
// Covers the composite teacher evaluation score system:
//   - /api/employees/teacher-evaluation/        (Admin: all teachers)
//   - /api/employees/teacher-evaluation/<id>/   (Admin or teacher-self)
//   - /api/employees/teacher-evaluation/calculate/  (Admin: trigger recalc)
//   - /api/employees/my-evaluation/             (Teacher self-service)

import axios from 'axios';
import { API_URL } from '../utils/constants';
import { getAuthHeaders, handleAuthError } from '../utils/authHelpers';

const BASE = '/api/employees';

// ============================================
// ADMIN — ALL TEACHERS
// ============================================

/**
 * Fetch all teacher evaluation scores (Admin only).
 * @param {object} filters  Optional: { month, year, rating }
 */
export const fetchAllEvaluations = async (filters = {}) => {
  try {
    const params = {};
    if (filters.month) params.month = filters.month;
    if (filters.year)  params.year  = filters.year;
    if (filters.rating) params.rating = filters.rating;

    const response = await axios.get(`${API_URL}${BASE}/teacher-evaluation/`, {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching evaluations:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Fetch evaluation history for a specific teacher (Admin or self).
 * @param {number} teacherId
 * @param {object} filters  Optional: { month, year }
 */
export const fetchTeacherEvaluation = async (teacherId, filters = {}) => {
  try {
    const params = {};
    if (filters.month) params.month = filters.month;
    if (filters.year)  params.year  = filters.year;

    const response = await axios.get(`${API_URL}${BASE}/teacher-evaluation/${teacherId}/`, {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching teacher evaluation:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Trigger monthly score calculation (Admin only).
 * @param {number} month  1-12
 * @param {number} year   e.g. 2026
 * @param {number|null} teacherId  Omit to recalculate all teachers
 */
export const calculateEvaluations = async (month, year, teacherId = null) => {
  try {
    const payload = { month, year };
    if (teacherId) payload.teacher_id = teacherId;

    const response = await axios.post(`${API_URL}${BASE}/teacher-evaluation/calculate/`, payload, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error calculating evaluations:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

// ============================================
// TEACHER SELF-SERVICE
// ============================================

/**
 * Fetch the currently authenticated teacher's own evaluation scores.
 */
export const fetchMyEvaluation = async () => {
  try {
    const response = await axios.get(`${API_URL}${BASE}/my-evaluation/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching own evaluation:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};
