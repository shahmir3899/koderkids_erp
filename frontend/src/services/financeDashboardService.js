// ============================================
// FINANCE DASHBOARD SERVICE - With Caching
// ============================================
// Location: src/services/financeDashboardService.js
//
// PURPOSE: Cache finance chart API responses to avoid calls on every page load
// CACHE DURATION: 10 minutes (same as FinanceContext)

import axios from 'axios';
import { API_URL, getAuthHeaders } from '../api';

// Cache duration: 10 minutes
const CACHE_DURATION = 10 * 60 * 1000;

/**
 * Generate a cache key from endpoint and params
 */
const getCacheKey = (endpoint, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `finance_${endpoint}_${sortedParams}`;
};

/**
 * Get cached data if still valid
 */
const getCachedData = (cacheKey) => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age > CACHE_DURATION) {
      localStorage.removeItem(cacheKey);
      console.log(`🗑️ Finance cache expired: ${cacheKey}`);
      return null;
    }

    console.log(`⚡ Finance cache hit: ${cacheKey} (age: ${Math.round(age / 1000)}s)`);
    return data;
  } catch (error) {
    console.error('❌ Error reading finance cache:', error);
    return null;
  }
};

/**
 * Save data to cache
 */
const setCachedData = (cacheKey, data) => {
  try {
    const cacheObject = { data, timestamp: Date.now() };
    localStorage.setItem(cacheKey, JSON.stringify(cacheObject));
    console.log(`💾 Finance cached: ${cacheKey}`);
  } catch (error) {
    console.error('❌ Error saving finance cache:', error);
  }
};

/**
 * Fetch with caching - returns cached data or fetches fresh
 */
const fetchWithCache = async (endpoint, params, fetcher) => {
  const cacheKey = getCacheKey(endpoint, params);

  // Try cache first
  const cached = getCachedData(cacheKey);
  if (cached !== null) {
    // Return in same format as axios response
    return { data: cached };
  }

  // Cache miss - fetch fresh
  console.log(`🌐 Finance fetching: ${endpoint}`);
  const response = await fetcher();

  // Cache the response data
  setCachedData(cacheKey, response.data);

  return response;
};

export const financeDashboardService = {
  // Monthly Trends (CACHED)
  getMonthlyTrends: async (period = '6months', startDate = null, endDate = null, schoolId = null) => {
    const params = { period };

    if (period === 'custom' && startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    }

    if (schoolId) {
      params.school = schoolId;
    }

    return fetchWithCache('monthly-trends', params, () =>
      axios.get(`${API_URL}/api/dashboard/monthly-trends/`, {
        headers: getAuthHeaders(),
        params,
      })
    );
  },

  // Cash Flow (CACHED)
  getCashFlow: async (months = 6, schoolId = null) => {
    const params = { months };

    if (schoolId) {
      params.school = schoolId;
    }

    return fetchWithCache('cash-flow', params, () =>
      axios.get(`${API_URL}/api/dashboard/cash-flow/`, {
        headers: getAuthHeaders(),
        params,
      })
    );
  },

  // Account Balance History (CACHED)
  getAccountBalanceHistory: async (accountId, timeframe = 'monthly', months = 6) => {
    const params = { account_id: accountId, timeframe, months };

    return fetchWithCache('account-balance-history', params, () =>
      axios.get(`${API_URL}/api/dashboard/account-balance-history/`, {
        headers: getAuthHeaders(),
        params,
      })
    );
  },

  // Expense Categories (CACHED)
  getExpenseCategories: async (period = '6months', category = 'all', startDate = null, endDate = null, schoolId = null) => {
    const params = { period, category };

    if (period === 'custom' && startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    }

    if (schoolId) {
      params.school = schoolId;
    }

    return fetchWithCache('expense-categories', params, () =>
      axios.get(`${API_URL}/api/dashboard/expense-categories/`, {
        headers: getAuthHeaders(),
        params,
      })
    );
  },

  // Income Categories (CACHED)
  getIncomeCategories: async (period = '6months', category = 'all', startDate = null, endDate = null, schoolId = null) => {
    const params = { period, category };

    if (period === 'custom' && startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    }

    if (schoolId) {
      params.school = schoolId;
    }

    return fetchWithCache('income-categories', params, () =>
      axios.get(`${API_URL}/api/dashboard/income-categories/`, {
        headers: getAuthHeaders(),
        params,
      })
    );
  },

  // Clear all finance dashboard caches
  clearCache: () => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('finance_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🗑️ Cleared ${keysToRemove.length} finance caches`);
  },
};