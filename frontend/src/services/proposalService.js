// ============================================
// PROPOSAL SERVICE - API calls for proposal offers
// ============================================

import axios from 'axios';
import { getAuthHeaders } from '../api';

const API_BASE_URL = process.env.REACT_APP_API_URL;

export const proposalService = {
  fetchProposals: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.lead) params.append('lead', filters.lead);
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', filters.limit);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/crm/proposals/${queryString ? `?${queryString}` : ''}`;

    const response = await axios.get(url, { headers: getAuthHeaders() });
    return response.data;
  },

  fetchProposalById: async (proposalId) => {
    const response = await axios.get(
      `${API_BASE_URL}/api/crm/proposals/${proposalId}/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  saveProposal: async (proposalData) => {
    const response = await axios.post(
      `${API_BASE_URL}/api/crm/proposals/`,
      proposalData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  deleteProposal: async (proposalId) => {
    await axios.delete(
      `${API_BASE_URL}/api/crm/proposals/${proposalId}/`,
      { headers: getAuthHeaders() }
    );
  },

  fetchRateSlabs: async () => {
    const response = await axios.get(
      `${API_BASE_URL}/api/crm/proposal-rate-slabs/suggestions/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  fetchAllRateSlabs: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.mode) params.append('mode', filters.mode);
    if (typeof filters.is_active !== 'undefined') {
      params.append('is_active', String(filters.is_active));
    }

    const query = params.toString();
    const response = await axios.get(
      `${API_BASE_URL}/api/crm/proposal-rate-slabs/${query ? `?${query}` : ''}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  createRateSlab: async (payload) => {
    const response = await axios.post(
      `${API_BASE_URL}/api/crm/proposal-rate-slabs/`,
      payload,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  updateRateSlab: async (slabId, payload) => {
    const response = await axios.patch(
      `${API_BASE_URL}/api/crm/proposal-rate-slabs/${slabId}/`,
      payload,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  deleteRateSlab: async (slabId) => {
    await axios.delete(
      `${API_BASE_URL}/api/crm/proposal-rate-slabs/${slabId}/`,
      { headers: getAuthHeaders() }
    );
  },
};
