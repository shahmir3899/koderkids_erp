// ============================================
// SALARY SERVICE - API calls for salary slips
// ============================================
// Location: src/services/salaryService.js

import axios from 'axios';
import { getAuthHeaders } from '../api';

const API_BASE_URL = process.env.REACT_APP_API_URL;

export const salaryService = {
  // ============================================
  // TEACHER/EMPLOYEE DATA
  // ============================================

  // Fetch all teachers for dropdown
  fetchTeachers: async () => {
    const response = await axios.get(
      `${API_BASE_URL}/employees/teachers/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Fetch default salary period dates
  fetchDefaultDates: async () => {
    const response = await axios.get(
      `${API_BASE_URL}/employees/default-dates/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Fetch specific teacher's profile
  fetchTeacherProfile: async (teacherId) => {
    const response = await axios.get(
      `${API_BASE_URL}/employees/teacher/${teacherId}/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // ============================================
  // SALARY SLIP HISTORY
  // ============================================

  /**
   * Fetch salary slip history (list)
   * @param {Object} filters - Optional filters: { teacher_id, from_date, till_date }
   * @returns {Promise<Array>} List of salary slips
   */
  fetchSalarySlips: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.teacher_id) params.append('teacher_id', filters.teacher_id);
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.till_date) params.append('till_date', filters.till_date);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/employees/salary-slips/${queryString ? `?${queryString}` : ''}`;

    const response = await axios.get(url, { headers: getAuthHeaders() });
    return response.data;
  },

  /**
   * Fetch a specific salary slip by ID
   * @param {number} slipId - Salary slip ID
   * @returns {Promise<Object>} Full salary slip data
   */
  fetchSalarySlipById: async (slipId) => {
    const response = await axios.get(
      `${API_BASE_URL}/employees/salary-slips/${slipId}/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Save salary slip to database
   * Creates new or updates existing slip for same teacher/period
   * @param {Object} slipData - Complete salary slip data
   * @returns {Promise<Object>} Saved salary slip
   */
  saveSalarySlip: async (slipData) => {
    const response = await axios.post(
      `${API_BASE_URL}/employees/salary-slips/`,
      slipData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Delete a salary slip
   * @param {number} slipId - Salary slip ID
   * @returns {Promise<void>}
   */
  deleteSalarySlip: async (slipId) => {
    await axios.delete(
      `${API_BASE_URL}/employees/salary-slips/${slipId}/`,
      { headers: getAuthHeaders() }
    );
  },
};