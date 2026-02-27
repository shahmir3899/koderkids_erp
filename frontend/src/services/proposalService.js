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
};
