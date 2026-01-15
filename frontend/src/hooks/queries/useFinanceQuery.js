// ============================================
// FINANCE QUERY HOOKS - React Query Implementation
// ============================================
// Location: frontend/src/hooks/queries/useFinanceQuery.js
// Replaces manual data fetching in FinanceDashboard

import { useQuery } from '@tanstack/react-query';
import { financeDashboardService } from '../../services/financeDashboardService';

// Query Keys
export const financeKeys = {
  all: ['finance'],
  monthlyTrends: (params) => ['finance', 'monthlyTrends', params],
  cashFlow: (months, schoolId) => ['finance', 'cashFlow', months, schoolId],
  accountBalanceHistory: (accountId, timeframe, months) => ['finance', 'accountBalance', accountId, timeframe, months],
  expenseCategories: (params) => ['finance', 'expenseCategories', params],
  incomeCategories: (params) => ['finance', 'incomeCategories', params],
};

/**
 * Hook to fetch monthly trends
 * @param {string} period - Period ('6months', '12months', 'custom')
 * @param {string} startDate - Start date (for custom period)
 * @param {string} endDate - End date (for custom period)
 * @param {number} schoolId - School ID filter
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useMonthlyTrends = (period = '6months', startDate = null, endDate = null, schoolId = null, options = {}) => {
  return useQuery({
    queryKey: financeKeys.monthlyTrends({ period, startDate, endDate, schoolId }),
    queryFn: async () => {
      const response = await financeDashboardService.getMonthlyTrends(period, startDate, endDate, schoolId);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook to fetch cash flow data
 * @param {number} months - Number of months
 * @param {number} schoolId - School ID filter
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useCashFlow = (months = 6, schoolId = null, options = {}) => {
  return useQuery({
    queryKey: financeKeys.cashFlow(months, schoolId),
    queryFn: async () => {
      const response = await financeDashboardService.getCashFlow(months, schoolId);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch account balance history
 * @param {number} accountId - Account ID
 * @param {string} timeframe - Timeframe ('monthly', 'weekly')
 * @param {number} months - Number of months
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useAccountBalanceHistory = (accountId, timeframe = 'monthly', months = 6, options = {}) => {
  return useQuery({
    queryKey: financeKeys.accountBalanceHistory(accountId, timeframe, months),
    queryFn: async () => {
      const response = await financeDashboardService.getAccountBalanceHistory(accountId, timeframe, months);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!accountId,
    ...options,
  });
};

/**
 * Hook to fetch expense categories
 * @param {string} period - Period
 * @param {string} category - Category filter
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {number} schoolId - School ID filter
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useExpenseCategories = (period = '6months', category = 'all', startDate = null, endDate = null, schoolId = null, options = {}) => {
  return useQuery({
    queryKey: financeKeys.expenseCategories({ period, category, startDate, endDate, schoolId }),
    queryFn: async () => {
      const response = await financeDashboardService.getExpenseCategories(period, category, startDate, endDate, schoolId);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch income categories
 * @param {string} period - Period
 * @param {string} category - Category filter
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {number} schoolId - School ID filter
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useIncomeCategories = (period = '6months', category = 'all', startDate = null, endDate = null, schoolId = null, options = {}) => {
  return useQuery({
    queryKey: financeKeys.incomeCategories({ period, category, startDate, endDate, schoolId }),
    queryFn: async () => {
      const response = await financeDashboardService.getIncomeCategories(period, category, startDate, endDate, schoolId);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export default {
  useMonthlyTrends,
  useCashFlow,
  useAccountBalanceHistory,
  useExpenseCategories,
  useIncomeCategories,
  financeKeys,
};
