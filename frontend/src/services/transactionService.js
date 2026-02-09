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

  // ============================================
  // BULK OPERATIONS (Phase 2 Optimization)
  // ============================================

  /**
   * Create multiple transactions in a single request.
   * Uses the unified transaction API for better performance.
   *
   * @param {string} type - Transaction type ('income', 'expense', 'transfer')
   * @param {Array} transactions - Array of transaction objects
   * @returns {Promise} Response with created transactions
   *
   * @example
   * await transactionService.bulkCreateTransactions('income', [
   *   { date: '2025-01-15', amount: 5000, category: 'Sales', to_account: 1 },
   *   { date: '2025-01-16', amount: 3000, category: 'Sales', to_account: 1 },
   * ]);
   */
  bulkCreateTransactions: async (type, transactions) => {
    return await axios.post(
      `${API_URL}/api/transactions/${type}/bulk/`,
      { transactions },
      { headers: getAuthHeaders() }
    );
  },

  /**
   * Get transactions using the unified API endpoint.
   * Alternative to getTransactions with caching benefits.
   *
   * @param {string} type - Transaction type ('income', 'expense', 'transfer')
   * @param {Object} params - Query parameters
   */
  getTransactionsUnified: async (type, params = {}) => {
    return await axios.get(`${API_URL}/api/transactions/${type}/`, {
      headers: getAuthHeaders(),
      params,
    });
  },
};