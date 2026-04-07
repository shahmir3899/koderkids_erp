// ============================================
// CRM SERVICE - Lead, Activity, Target Operations
// ============================================

import axios from 'axios';
import { API_URL } from '../../utils/constants';
import { getAuthHeaders, handleAuthError } from '../../utils/authHelpers';

const CRM_BASE = '/api/crm';

// ============================================
// LEAD OPERATIONS
// ============================================

/**
 * Fetch leads with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.status - Lead status
 * @param {string} filters.source - Lead source
 * @param {string} filters.search - Search term
 * @param {number} filters.assigned_to - BDM ID (Admin only)
 * @returns {Promise<Array>} List of leads
 */
export const fetchLeads = async (filters = {}) => {
  try {
    console.log('📡 Fetching leads with filters:', filters);

    const response = await axios.get(`${API_URL}${CRM_BASE}/leads/`, {
      headers: getAuthHeaders(),
      params: filters,
    });

    console.log('✅ Leads fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching leads:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

/**
 * Fetch single lead by ID
 * @param {number} leadId - Lead ID
 * @returns {Promise<Object>} Lead details with activities
 */
export const fetchLeadById = async (leadId) => {
  try {
    console.log(`📡 Fetching lead ID: ${leadId}`);

    const response = await axios.get(`${API_URL}${CRM_BASE}/leads/${leadId}/`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Lead fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching lead:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Create a new lead
 * @param {Object} leadData - Lead data
 * @returns {Promise<Object>} Created lead
 */
export const createLead = async (leadData) => {
  try {
    console.log('🚀 Creating new lead:', leadData);

    const response = await axios.post(`${API_URL}${CRM_BASE}/leads/`, leadData, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Lead created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating lead:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Update an existing lead
 * @param {number} leadId - Lead ID
 * @param {Object} leadData - Updated lead data
 * @returns {Promise<Object>} Updated lead
 */
export const updateLead = async (leadId, leadData) => {
  try {
    console.log(`✏️ Updating lead ID: ${leadId}`, leadData);

    const response = await axios.put(`${API_URL}${CRM_BASE}/leads/${leadId}/`, leadData, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Lead updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating lead:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Delete a lead
 * @param {number} leadId - Lead ID
 * @returns {Promise<Object>} Deletion response
 */
export const deleteLead = async (leadId) => {
  try {
    console.log(`🗑️ Deleting lead ID: ${leadId}`);

    const response = await axios.delete(`${API_URL}${CRM_BASE}/leads/${leadId}/`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Lead deleted successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting lead:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Convert lead to school
 * @param {number} leadId - Lead ID
 * @param {Object} conversionData - School data for conversion
 * @returns {Promise<Object>} Conversion response with school data
 */
export const convertLead = async (leadId, conversionData) => {
  try {
    console.log(`🔄 Converting lead ID: ${leadId}`, conversionData);

    const response = await axios.post(
      `${API_URL}${CRM_BASE}/leads/${leadId}/convert/`,
      conversionData,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ Lead converted successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error converting lead:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Assign lead to BDM
 * @param {number} leadId - Lead ID
 * @param {number} bdmId - BDM user ID
 * @returns {Promise<Object>} Updated lead
 */
export const assignLead = async (leadId, bdmId) => {
  try {
    console.log(`👤 Assigning lead ID: ${leadId} to BDM ID: ${bdmId}`);

    const response = await axios.patch(
      `${API_URL}${CRM_BASE}/leads/${leadId}/assign/`,
      { bdm_id: bdmId },
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ Lead assigned successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error assigning lead:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Check for duplicate leads by phone number
 * @param {string} phone - Phone number to check
 * @returns {Promise<Object>} Duplicate check result { found: boolean, leads: Array }
 */
export const checkDuplicateLead = async (phone) => {
  try {
    console.log(`🔍 Checking for duplicate leads with phone: ${phone}`);

    const response = await axios.post(
      `${API_URL}${CRM_BASE}/leads/check-duplicate/`,
      { phone },
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ Duplicate check result:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error checking duplicates:', error.response?.data || error.message);
    handleAuthError(error);
    return { found: false, leads: [] };
  }
};

// ============================================
// ACTIVITY OPERATIONS
// ============================================

/**
 * Fetch activities with optional filters
 * @param {Object} filters - Filter options
 * @param {number} filters.lead - Lead ID
 * @param {string} filters.status - Activity status
 * @param {string} filters.start_date - Start date (YYYY-MM-DD)
 * @param {string} filters.end_date - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} List of activities
 */
export const fetchActivities = async (filters = {}) => {
  try {
    console.log('📡 Fetching activities with filters:', filters);

    const response = await axios.get(`${API_URL}${CRM_BASE}/activities/`, {
      headers: getAuthHeaders(),
      params: filters,
    });

    console.log('✅ Activities fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching activities:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

/**
 * Create a new activity
 * @param {Object} activityData - Activity data
 * @returns {Promise<Object>} Created activity
 */
export const createActivity = async (activityData) => {
  try {
    console.log('🚀 Creating new activity:', activityData);

    const response = await axios.post(`${API_URL}${CRM_BASE}/activities/`, activityData, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Activity created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating activity:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Update an existing activity
 * @param {number} activityId - Activity ID
 * @param {Object} activityData - Updated activity data
 * @returns {Promise<Object>} Updated activity
 */
export const updateActivity = async (activityId, activityData) => {
  try {
    console.log(`✏️ Updating activity ID: ${activityId}`, activityData);

    const response = await axios.put(
      `${API_URL}${CRM_BASE}/activities/${activityId}/`,
      activityData,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ Activity updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating activity:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Mark activity as completed
 * @param {number} activityId - Activity ID
 * @returns {Promise<Object>} Updated activity
 */
export const completeActivity = async (activityId) => {
  try {
    console.log(`✅ Completing activity ID: ${activityId}`);

    const response = await axios.patch(
      `${API_URL}${CRM_BASE}/activities/${activityId}/complete/`,
      {},
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ Activity completed successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error completing activity:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Delete an activity
 * @param {number} activityId - Activity ID
 * @returns {Promise<Object>} Deletion response
 */
export const deleteActivity = async (activityId) => {
  try {
    console.log(`🗑️ Deleting activity ID: ${activityId}`);

    const response = await axios.delete(`${API_URL}${CRM_BASE}/activities/${activityId}/`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Activity deleted successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting activity:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Bulk assign leads to a BDM (Admin only)
 * @param {Array<number>} leadIds - Array of lead IDs
 * @param {number} bdmId - Target BDM user ID
 * @returns {Promise<Object>} Result with updated_count and message
 */
export const bulkAssignLeads = async (leadIds, bdmId) => {
  try {
    console.log(`📦 Bulk assigning ${leadIds.length} leads to BDM ID: ${bdmId}`);

    const response = await axios.post(
      `${API_URL}${CRM_BASE}/leads/bulk-assign/`,
      { lead_ids: leadIds, bdm_id: bdmId },
      { headers: getAuthHeaders() }
    );

    console.log('✅ Bulk assignment result:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error bulk assigning leads:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

// ============================================
// BDM OPERATIONS
// ============================================

/**
 * Fetch list of BDMs (Admin only)
 * @returns {Promise<Array>} List of BDMs with id and full_name
 */
export const fetchBDMs = async () => {
  try {
    console.log('📡 Fetching BDM list');

    const response = await axios.get(`${API_URL}${CRM_BASE}/bdm-list/`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ BDMs fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching BDMs:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

// ============================================
// TARGET OPERATIONS
// ============================================

/**
 * Fetch targets with optional filters
 * @param {Object} filters - Filter options
 * @param {number} filters.bdm - BDM user ID (Admin only)
 * @param {string} filters.period - Period type (Monthly/Quarterly/Yearly)
 * @returns {Promise<Array>} List of targets
 */
export const fetchTargets = async (filters = {}) => {
  try {
    console.log('📡 Fetching targets with filters:', filters);

    const response = await axios.get(`${API_URL}${CRM_BASE}/targets/`, {
      headers: getAuthHeaders(),
      params: filters,
    });

    console.log('✅ Targets fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching targets:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

/**
 * Create a new target (Admin only)
 * @param {Object} targetData - Target data
 * @returns {Promise<Object>} Created target
 */
export const createTarget = async (targetData) => {
  try {
    console.log('🚀 Creating new target:', targetData);

    const response = await axios.post(`${API_URL}${CRM_BASE}/targets/`, targetData, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Target created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating target:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

/**
 * Refresh target actuals
 * @param {number} targetId - Target ID
 * @returns {Promise<Object>} Updated target
 */
export const refreshTarget = async (targetId) => {
  try {
    console.log(`🔄 Refreshing target ID: ${targetId}`);

    const response = await axios.get(`${API_URL}${CRM_BASE}/targets/${targetId}/refresh/`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Target refreshed successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error refreshing target:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

// ============================================
// DASHBOARD OPERATIONS
// ============================================

/**
 * Fetch dashboard statistics
 * @returns {Promise<Object>} Dashboard stats
 */
export const fetchDashboardStats = async () => {
  try {
    console.log('📡 Fetching dashboard stats');

    const response = await axios.get(`${API_URL}${CRM_BASE}/dashboard/stats/`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Dashboard stats fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error.response?.data || error.message);
    handleAuthError(error);
    return null;
  }
};

/**
 * Fetch lead sources breakdown
 * @returns {Promise<Array>} Lead sources data
 */
export const fetchLeadSources = async () => {
  try {
    console.log('📡 Fetching lead sources breakdown');

    const response = await axios.get(`${API_URL}${CRM_BASE}/dashboard/lead-sources/`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Lead sources fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching lead sources:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

/**
 * Fetch conversion metrics over time
 * @returns {Promise<Array>} Conversion rate data
 */
export const fetchConversionMetrics = async () => {
  try {
    console.log('📡 Fetching conversion metrics');

    const response = await axios.get(`${API_URL}${CRM_BASE}/dashboard/conversion-rate/`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Conversion metrics fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching conversion metrics:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

/**
 * Fetch upcoming activities
 * @returns {Promise<Object>} Upcoming activities for today and tomorrow
 */
export const fetchUpcomingActivities = async () => {
  try {
    console.log('📡 Fetching upcoming activities');

    const response = await axios.get(`${API_URL}${CRM_BASE}/dashboard/upcoming/`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Upcoming activities fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching upcoming activities:', error.response?.data || error.message);
    handleAuthError(error);
    return { today: [], tomorrow: [] };
  }
};

/**
 * Fetch target progress
 * @returns {Promise<Array>} Active target progress
 */
export const fetchTargetProgress = async () => {
  try {
    console.log('📡 Fetching target progress');

    const response = await axios.get(`${API_URL}${CRM_BASE}/dashboard/targets/`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Target progress fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching target progress:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

// ============================================
// ADMIN DASHBOARD OPERATIONS
// ============================================

/**
 * Fetch admin dashboard overview (Admin only)
 * @returns {Promise<Object>} Comprehensive dashboard data
 */
export const fetchAdminDashboardOverview = async () => {
  try {
    console.log('📡 Fetching admin dashboard overview');

    const response = await axios.get(`${API_URL}${CRM_BASE}/dashboard/admin/overview/`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Admin dashboard overview fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching admin dashboard overview:', error.response?.data || error.message);
    handleAuthError(error);
    return null;
  }
};

/**
 * Fetch lead distribution across BDMs (Admin only)
 * @returns {Promise<Array>} Lead distribution data
 */
export const fetchAdminLeadDistribution = async () => {
  try {
    console.log('📡 Fetching admin lead distribution');

    const response = await axios.get(`${API_URL}${CRM_BASE}/dashboard/admin/lead-distribution/`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Admin lead distribution fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching admin lead distribution:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

/**
 * Fetch recent activities across all BDMs (Admin only)
 * @returns {Promise<Array>} Recent activities data
 */
export const fetchAdminRecentActivities = async () => {
  try {
    console.log('📡 Fetching admin recent activities');

    const response = await axios.get(`${API_URL}${CRM_BASE}/dashboard/admin/recent-activities/`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ Admin recent activities fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching admin recent activities:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

// Export all functions
export default {
  // Leads
  fetchLeads,
  fetchLeadById,
  createLead,
  updateLead,
  deleteLead,
  convertLead,
  assignLead,
  checkDuplicateLead,

  // Activities
  fetchActivities,
  createActivity,
  updateActivity,
  completeActivity,
  deleteActivity,

  // BDMs
  fetchBDMs,

  // Targets
  fetchTargets,
  createTarget,
  refreshTarget,

  // Dashboard
  fetchDashboardStats,
  fetchLeadSources,
  fetchConversionMetrics,
  fetchUpcomingActivities,
  fetchTargetProgress,
};
