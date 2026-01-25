// ============================================
// REPORT REQUEST SERVICE - Self-Service Reports API
// ============================================
// Location: src/services/reportRequestService.js

import axios from 'axios';
import { getAuthHeaders } from '../api';

const API_BASE_URL = process.env.REACT_APP_API_URL;

export const reportRequestService = {
  // ============================================
  // TEMPLATES
  // ============================================

  /**
   * Fetch available report templates for current user
   * @returns {Promise<Array>} List of templates user can access
   */
  fetchTemplates: async () => {
    const response = await axios.get(
      `${API_BASE_URL}/api/reports/templates/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Fetch a specific template by ID
   * @param {number} templateId - Template ID
   * @returns {Promise<Object>} Template details with default content
   */
  fetchTemplateById: async (templateId) => {
    const response = await axios.get(
      `${API_BASE_URL}/api/reports/templates/${templateId}/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Prefill a template with employee data
   * GET: Prefill for current user (self-service)
   * POST: Prefill for any employee (admin only)
   *
   * @param {number} templateId - Template ID
   * @param {Object} options - Optional: { targetEmployeeId, customFields }
   * @returns {Promise<Object>} { prefilled_subject, prefilled_body, remaining_placeholders, auto_filled }
   */
  prefillTemplate: async (templateId, options = {}) => {
    const { targetEmployeeId, customFields } = options;

    if (targetEmployeeId) {
      // Admin prefilling for specific employee
      const response = await axios.post(
        `${API_BASE_URL}/api/reports/templates/${templateId}/prefill/`,
        {
          target_employee_id: targetEmployeeId,
          custom_fields: customFields || {},
        },
        { headers: getAuthHeaders() }
      );
      return response.data;
    } else {
      // Self-service: prefill for current user
      const response = await axios.get(
        `${API_BASE_URL}/api/reports/templates/${templateId}/prefill/`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    }
  },

  // ============================================
  // REQUESTS - CRUD
  // ============================================

  /**
   * Create a new report request (DRAFT status)
   * @param {Object} requestData - Request data
   * @returns {Promise<Object>} Created request
   */
  createRequest: async (requestData) => {
    const response = await axios.post(
      `${API_BASE_URL}/api/reports/requests/`,
      requestData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Fetch user's own requests
   * @param {Object} filters - Optional filters: { status }
   * @returns {Promise<Object>} { count, results }
   */
  fetchMyRequests: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/reports/requests/my-requests/${queryString ? `?${queryString}` : ''}`;

    const response = await axios.get(url, { headers: getAuthHeaders() });
    return response.data;
  },

  /**
   * Fetch a specific request by ID
   * @param {string} requestId - Request UUID
   * @returns {Promise<Object>} Full request details
   */
  fetchRequestById: async (requestId) => {
    const response = await axios.get(
      `${API_BASE_URL}/api/reports/requests/${requestId}/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Update a draft request
   * @param {string} requestId - Request UUID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} Updated request
   */
  updateRequest: async (requestId, updateData) => {
    const response = await axios.put(
      `${API_BASE_URL}/api/reports/requests/${requestId}/`,
      updateData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Delete/cancel a request
   * @param {string} requestId - Request UUID
   * @returns {Promise<void>}
   */
  deleteRequest: async (requestId) => {
    await axios.delete(
      `${API_BASE_URL}/api/reports/requests/${requestId}/`,
      { headers: getAuthHeaders() }
    );
  },

  // ============================================
  // REQUESTS - WORKFLOW ACTIONS
  // ============================================

  /**
   * Submit a draft request for approval
   * @param {string} requestId - Request UUID
   * @returns {Promise<Object>} Updated request with SUBMITTED status
   */
  submitRequest: async (requestId) => {
    const response = await axios.post(
      `${API_BASE_URL}/api/reports/requests/${requestId}/submit/`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Cancel a request
   * @param {string} requestId - Request UUID
   * @param {string} reason - Optional cancellation reason
   * @returns {Promise<Object>} Updated request with CANCELLED status
   */
  cancelRequest: async (requestId, reason = '') => {
    const response = await axios.post(
      `${API_BASE_URL}/api/reports/requests/${requestId}/cancel/`,
      { reason },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // ============================================
  // ADMIN - APPROVAL WORKFLOW
  // ============================================

  /**
   * Fetch pending approval requests (Admin only)
   * @param {Object} filters - Optional filters: { priority }
   * @returns {Promise<Object>} { count, results }
   */
  fetchPendingRequests: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.priority) params.append('priority', filters.priority);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/reports/requests/pending/${queryString ? `?${queryString}` : ''}`;

    const response = await axios.get(url, { headers: getAuthHeaders() });
    return response.data;
  },

  /**
   * Fetch all requests with filters (Admin only - for history)
   * @param {Object} filters - { status, limit }
   * @returns {Promise<Object>} { count, results }
   */
  fetchAllRequests: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/reports/requests/${queryString ? `?${queryString}` : ''}`;

    const response = await axios.get(url, { headers: getAuthHeaders() });
    return response.data;
  },

  /**
   * Approve a request (Admin only)
   * @param {string} requestId - Request UUID
   * @param {Object} data - { admin_notes?, priority? }
   * @returns {Promise<Object>} Updated request with APPROVED status
   */
  approveRequest: async (requestId, data = {}) => {
    const response = await axios.post(
      `${API_BASE_URL}/api/reports/requests/${requestId}/approve/`,
      data,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Reject a request (Admin only)
   * @param {string} requestId - Request UUID
   * @param {string} rejectionReason - Required reason for rejection
   * @param {string} adminNotes - Optional internal notes
   * @returns {Promise<Object>} Updated request with REJECTED status
   */
  rejectRequest: async (requestId, rejectionReason, adminNotes = '') => {
    const response = await axios.post(
      `${API_BASE_URL}/api/reports/requests/${requestId}/reject/`,
      { rejection_reason: rejectionReason, admin_notes: adminNotes },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Fetch request statistics (Admin only)
   * @returns {Promise<Object>} { total, pending, approved, rejected, generated, draft }
   */
  fetchStats: async () => {
    const response = await axios.get(
      `${API_BASE_URL}/api/reports/requests/stats/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // ============================================
  // REPORT GENERATION & DOWNLOAD
  // ============================================

  /**
   * Download/generate PDF for an approved request
   * @param {string} requestId - Request UUID
   * @returns {Promise<ArrayBuffer>} PDF file as array buffer
   */
  downloadReport: async (requestId) => {
    const response = await axios.get(
      `${API_BASE_URL}/api/reports/requests/${requestId}/download/`,
      {
        headers: getAuthHeaders(),
        responseType: 'arraybuffer',
      }
    );
    return response.data;
  },
};
