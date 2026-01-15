// ============================================
// REPORT SERVICE - API calls for custom reports
// ============================================
// Location: src/services/reportService.js

import axios from 'axios';
import { getAuthHeaders } from '../api';

const API_BASE_URL = process.env.REACT_APP_API_URL;

export const reportService = {
  // ============================================
  // CUSTOM REPORT HISTORY
  // ============================================

  /**
   * Fetch custom report history (list)
   * @param {Object} filters - Optional filters: { template_type, recipient, subject, limit }
   * @returns {Promise<Array>} List of custom reports
   */
  fetchCustomReports: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.template_type) params.append('template_type', filters.template_type);
    if (filters.recipient) params.append('recipient', filters.recipient);
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.limit) params.append('limit', filters.limit);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/reports/custom-reports/${queryString ? `?${queryString}` : ''}`;

    const response = await axios.get(url, { headers: getAuthHeaders() });
    return response.data;
  },

  /**
   * Fetch a specific custom report by ID
   * @param {number} reportId - Custom report ID
   * @returns {Promise<Object>} Full custom report data
   */
  fetchCustomReportById: async (reportId) => {
    const response = await axios.get(
      `${API_BASE_URL}/api/reports/custom-reports/${reportId}/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Save custom report to database
   * @param {Object} reportData - Complete report data
   * @returns {Promise<Object>} Saved custom report
   */
  saveCustomReport: async (reportData) => {
    const response = await axios.post(
      `${API_BASE_URL}/api/reports/custom-reports/`,
      reportData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Update existing custom report
   * @param {number} reportId - Report ID
   * @param {Object} reportData - Updated report data
   * @returns {Promise<Object>} Updated custom report
   */
  updateCustomReport: async (reportId, reportData) => {
    const response = await axios.put(
      `${API_BASE_URL}/api/reports/custom-reports/${reportId}/`,
      reportData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Delete a custom report
   * @param {number} reportId - Custom report ID
   * @returns {Promise<void>}
   */
  deleteCustomReport: async (reportId) => {
    await axios.delete(
      `${API_BASE_URL}/api/reports/custom-reports/${reportId}/`,
      { headers: getAuthHeaders() }
    );
  },

  // ============================================
  // REPORT TEMPLATES
  // ============================================

  /**
   * Fetch all available report templates
   * @returns {Promise<Object>} Object with template types as keys
   */
  fetchReportTemplates: async () => {
    const response = await axios.get(
      `${API_BASE_URL}/api/reports/custom-reports/templates/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },
};
