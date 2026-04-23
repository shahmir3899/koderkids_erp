// ============================================
// MONITORING SERVICE
// ============================================

import axios from 'axios';
import { API_URL } from '../utils/constants';
import { getAuthHeaders, handleAuthError } from '../utils/authHelpers';

const BASE = '/api/monitoring';
const TEMPLATE_CACHE_VERSION_KEY = 'monitoring.templates.version';

export const bumpTemplatesCacheVersion = () => {
  const nextVersion = String(Date.now());
  localStorage.setItem(TEMPLATE_CACHE_VERSION_KEY, nextVersion);
  return nextVersion;
};

export const getTemplatesCacheVersion = () => {
  return localStorage.getItem(TEMPLATE_CACHE_VERSION_KEY) || '0';
};

// ============================================
// VISIT OPERATIONS
// ============================================

export const fetchVisits = async (filters = {}) => {
  try {
    const params = {
      ...filters,
      date_from: filters.date_from ?? filters.dateFrom,
      date_to: filters.date_to ?? filters.dateTo,
    };
    delete params.dateFrom;
    delete params.dateTo;

    const response = await axios.get(`${API_URL}${BASE}/visits/`, {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching visits:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

export const fetchVisitDetail = async (visitId) => {
  try {
    const response = await axios.get(`${API_URL}${BASE}/visits/${visitId}/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching visit detail:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

export const fetchVisitSummary = async (visitId) => {
  try {
    const response = await axios.get(`${API_URL}${BASE}/visits/${visitId}/`, {
      headers: getAuthHeaders(),
      params: { compact: 'true' },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching visit summary:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

export const createVisit = async (data) => {
  try {
    const response = await axios.post(`${API_URL}${BASE}/visits/`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error creating visit:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

export const updateVisit = async (visitId, data) => {
  try {
    const response = await axios.put(`${API_URL}${BASE}/visits/${visitId}/`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error updating visit:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

export const deleteVisit = async (visitId) => {
  try {
    const response = await axios.delete(`${API_URL}${BASE}/visits/${visitId}/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting visit:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

export const startVisit = async (visitId) => {
  try {
    const response = await axios.post(`${API_URL}${BASE}/visits/${visitId}/start/`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error starting visit:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

export const completeVisit = async (visitId) => {
  try {
    const response = await axios.post(`${API_URL}${BASE}/visits/${visitId}/complete/`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error completing visit:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

// ============================================
// SCHOOL WORKING DAYS
// ============================================

export const fetchSchoolWorkingDays = async (schoolId) => {
  try {
    const response = await axios.get(`${API_URL}${BASE}/schools/${schoolId}/working-days/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching working days:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

export const fetchSchoolTeachers = async (schoolId) => {
  try {
    const response = await axios.get(`${API_URL}${BASE}/schools/${schoolId}/teachers/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching school teachers:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

// ============================================
// VISIT TEACHERS
// ============================================

export const fetchVisitTeachers = async (visitId) => {
  try {
    const response = await axios.get(`${API_URL}${BASE}/visits/${visitId}/teachers/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching visit teachers:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

// ============================================
// TEMPLATES
// ============================================

export const fetchTemplates = async (detail = false) => {
  try {
    const params = detail ? { detail: 'true' } : {};
    const response = await axios.get(`${API_URL}${BASE}/templates/`, {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching templates:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

export const fetchTemplateDetail = async (templateId) => {
  try {
    const response = await axios.get(`${API_URL}${BASE}/templates/${templateId}/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching template detail:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

export const createTemplate = async (data) => {
  try {
    const response = await axios.post(`${API_URL}${BASE}/templates/`, data, {
      headers: getAuthHeaders(),
    });
    bumpTemplatesCacheVersion();
    return response.data;
  } catch (error) {
    console.error('Error creating template:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

export const updateTemplate = async (templateId, data) => {
  try {
    const response = await axios.put(`${API_URL}${BASE}/templates/${templateId}/`, data, {
      headers: getAuthHeaders(),
    });
    bumpTemplatesCacheVersion();
    return response.data;
  } catch (error) {
    console.error('Error updating template:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

export const deleteTemplate = async (templateId) => {
  try {
    const response = await axios.delete(`${API_URL}${BASE}/templates/${templateId}/`, {
      headers: getAuthHeaders(),
    });
    bumpTemplatesCacheVersion();
    return response.data;
  } catch (error) {
    console.error('Error deleting template:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

// ============================================
// EVALUATIONS
// ============================================

export const fetchVisitEvaluations = async (visitId) => {
  try {
    const response = await axios.get(`${API_URL}${BASE}/visits/${visitId}/evaluations/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching evaluations:', error.response?.data || error.message);
    handleAuthError(error);
    return [];
  }
};

export const submitEvaluation = async (visitId, data) => {
  try {
    const response = await axios.post(`${API_URL}${BASE}/visits/${visitId}/evaluations/`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting evaluation:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

export const fetchEvaluationDetail = async (evaluationId) => {
  try {
    const response = await axios.get(`${API_URL}${BASE}/evaluations/${evaluationId}/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching evaluation detail:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

export const updateEvaluation = async (evaluationId, data) => {
  try {
    const response = await axios.put(`${API_URL}${BASE}/evaluations/${evaluationId}/`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error updating evaluation:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

export const deleteEvaluation = async (evaluationId) => {
  try {
    const response = await axios.delete(`${API_URL}${BASE}/evaluations/${evaluationId}/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting evaluation:', error.response?.data || error.message);
    handleAuthError(error);
    throw error;
  }
};

// ============================================
// DASHBOARD
// ============================================

export const fetchMonitoringStats = async () => {
  try {
    const response = await axios.get(`${API_URL}${BASE}/dashboard/stats/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching monitoring stats:', error.response?.data || error.message);
    handleAuthError(error);
    return null;
  }
};
