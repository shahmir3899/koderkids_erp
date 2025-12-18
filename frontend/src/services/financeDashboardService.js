// ============================================
// FINANCE DASHBOARD SERVICE
// ============================================
// Location: src/services/financeDashboardService.js

import axios from 'axios';
import { API_URL, getAuthHeaders } from '../api';

export const financeDashboardService = {
  // Monthly Trends
  getMonthlyTrends: async (period = '6months', startDate = null, endDate = null, schoolId = null) => {
    const params = { period };
    
    if (period === 'custom' && startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    }
    
    if (schoolId) {
      params.school = schoolId;
    }
    
    return await axios.get(`${API_URL}/api/dashboard/monthly-trends/`, {
      headers: getAuthHeaders(),
      params,
    });
  },

  // Cash Flow
  getCashFlow: async (months = 6, schoolId = null) => {
    const params = { months };
    
    if (schoolId) {
      params.school = schoolId;
    }
    
    return await axios.get(`${API_URL}/api/dashboard/cash-flow/`, {
      headers: getAuthHeaders(),
      params,
    });
  },

  // Account Balance History
  getAccountBalanceHistory: async (accountId, timeframe = 'monthly', months = 6) => {
    return await axios.get(`${API_URL}/api/dashboard/account-balance-history/`, {
      headers: getAuthHeaders(),
      params: {
        account_id: accountId,
        timeframe,
        months,
      },
    });
  },

  // Expense Categories
  getExpenseCategories: async (period = '6months', category = 'all', startDate = null, endDate = null, schoolId = null) => {
    const params = { period, category };
    
    if (period === 'custom' && startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    }
    
    if (schoolId) {
      params.school = schoolId;
    }
    
    return await axios.get(`${API_URL}/api/dashboard/expense-categories/`, {
      headers: getAuthHeaders(),
      params,
    });
  },
  // Income Categories
getIncomeCategories: async (period = '6months', category = 'all', startDate = null, endDate = null, schoolId = null) => {
  const params = { period, category };
  
  if (period === 'custom' && startDate && endDate) {
    params.start_date = startDate;
    params.end_date = endDate;
  }
  
  if (schoolId) {
    params.school = schoolId;
  }
  
  return await axios.get(`${API_URL}/api/dashboard/income-categories/`, {
    headers: getAuthHeaders(),
    params,
  });
},

};