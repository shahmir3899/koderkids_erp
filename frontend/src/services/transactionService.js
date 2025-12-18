// ============================================
// TRANSACTION SERVICE
// ============================================
// Location: src/services/transactionService.js

import axios from 'axios';
import { API_URL, getAuthHeaders } from '../api';

export const transactionService = {
  // Get all transactions for a specific type
  getTransactions: async (type, params = {}) => {
    return await axios.get(`${API_URL}/api/${type}/`, {
      headers: getAuthHeaders(),
      params,
    });
  },

  // Create a new transaction
  createTransaction: async (type, payload) => {
    return await axios.post(`${API_URL}/api/${type}/`, payload, {
      headers: getAuthHeaders(),
    });
  },

  // Update an existing transaction
  updateTransaction: async (type, id, payload) => {
    return await axios.put(`${API_URL}/api/${type}/${id}/`, payload, {
      headers: getAuthHeaders(),
    });
  },

  // Delete a transaction
  deleteTransaction: async (type, id) => {
    return await axios.delete(`${API_URL}/api/${type}/${id}/`, {
      headers: getAuthHeaders(),
    });
  },

  // Get accounts
  getAccounts: async () => {
    return await axios.get(`${API_URL}/api/accounts/`, {
      headers: getAuthHeaders(),
    });
  },

  // Get schools
  getSchools: async () => {
    return await axios.get(`${API_URL}/api/schools/`, {
      headers: getAuthHeaders(),
    });
  },

  // Get categories
  getCategories: async (type) => {
    return await axios.get(`${API_URL}/api/categories/?type=${type}`, {
      headers: getAuthHeaders(),
    });
  },

  // Add a new category
  addCategory: async (payload) => {
    return await axios.post(`${API_URL}/api/categories/`, payload, {
      headers: getAuthHeaders(),
    });
  },
};