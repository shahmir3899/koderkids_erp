// ============================================
// FINANCE CONTEXT - Global State with Caching
// ============================================
// Location: src/contexts/FinanceContext.js
//
// PURPOSE: Cache finance dashboard data to avoid API calls on every page load
// PATTERN: Same as SchoolsContext - Context + localStorage caching

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, getAuthHeaders } from '../api';
import { toast } from 'react-toastify';
import { getCachedData, setCachedData, clearCache } from '../utils/cacheUtils';

// Create Context
const FinanceContext = createContext();

// Cache keys
const CACHE_KEYS = {
  summary: 'finance_summary',
  loanSummary: 'finance_loan_summary',
};

// Cache duration (10 minutes - finance data changes moderately)
const CACHE_DURATION = 10 * 60 * 1000;

/**
 * FinanceProvider Component
 * Wraps the app and provides finance data to all children
 * WITH CLIENT-SIDE CACHING!
 */
export const FinanceProvider = ({ children }) => {
  const [summary, setSummary] = useState({
    income: 0,
    expenses: 0,
    loans: 0,
    accounts: [],
  });
  const [loanSummary, setLoanSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadFinanceData = async () => {
      // Check if user is authenticated BEFORE fetching
      const token = localStorage.getItem('access');
      if (!token) {
        console.log('⏸️ FinanceContext: No auth token, skipping fetch');
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      // Check user role - Only Admin needs finance data
      const userRole = localStorage.getItem('role');
      if (userRole !== 'Admin') {
        console.log('⏸️ FinanceContext: Non-admin role detected, skipping finance data fetch');
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      console.log('💰 FinanceContext: Loading finance data for Admin...');

      // Try to load from cache first
      const cachedSummary = getCachedData(CACHE_KEYS.summary, CACHE_DURATION);
      const cachedLoanSummary = getCachedData(CACHE_KEYS.loanSummary, CACHE_DURATION);

      if (cachedSummary !== null && cachedLoanSummary !== null) {
        // Cache hit! Use cached data immediately
        console.log('⚡ FinanceContext: Using cached finance data');
        if (isMounted) {
          setSummary(cachedSummary);
          setLoanSummary(cachedLoanSummary);
          setLoading(false);
        }
        return; // Skip API call
      }

      // Cache miss - fetch from API
      setLoading(true);
      setError(null);

      try {
        console.log('🌐 FinanceContext: Fetching fresh finance data from API...');

        const [summaryResponse, loanResponse] = await Promise.all([
          axios.get(`${API_URL}/api/finance-summary/`, { headers: getAuthHeaders() }),
          axios.get(`${API_URL}/api/loan-summary/`, { headers: getAuthHeaders() }),
        ]);

        if (isMounted) {
          console.log('✅ FinanceContext: Finance data loaded');
          setSummary(summaryResponse.data);
          setLoanSummary(loanResponse.data);
          setLoading(false);

          // Save to cache for next time
          setCachedData(CACHE_KEYS.summary, summaryResponse.data);
          setCachedData(CACHE_KEYS.loanSummary, loanResponse.data);
        }
      } catch (err) {
        if (isMounted) {
          // Check if error is 401 (unauthorized)
          if (err.response?.status === 401) {
            console.log('🔒 FinanceContext: Unauthorized - user logged out');
            setLoading(false);
            return;
          }

          let errorMessage;
          if (err.response?.status === 404) {
            errorMessage = 'Data not found. Please check the server or try again.';
          } else {
            errorMessage = 'Failed to fetch finance data. Please try again later.';
          }

          console.error('❌ FinanceContext: Error loading finance data:', errorMessage);
          setError(errorMessage);
          setLoading(false);
          toast.error(errorMessage);
        }
      }
    };

    loadFinanceData();

    // Listen for storage events (logout)
    const handleStorageChange = () => {
      const token = localStorage.getItem('access');
      if (!token && isMounted) {
        console.log('🚪 FinanceContext: User logged out, clearing finance data');
        setSummary({ income: 0, expenses: 0, loans: 0, accounts: [] });
        setLoanSummary([]);
        setLoading(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup function
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Refetch function (bypasses cache and forces fresh data)
  const refetch = async (bypassCache = true) => {
    // Check auth before refetching
    const token = localStorage.getItem('access');
    if (!token) {
      console.log('⏸️ FinanceContext: No auth token, cannot refetch');
      return;
    }

    console.log('🔄 FinanceContext: Refetching finance data...');

    if (bypassCache) {
      clearCache(CACHE_KEYS.summary);
      clearCache(CACHE_KEYS.loanSummary);
    }

    setLoading(true);
    setError(null);

    try {
      const [summaryResponse, loanResponse] = await Promise.all([
        axios.get(`${API_URL}/api/finance-summary/`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/loan-summary/`, { headers: getAuthHeaders() }),
      ]);

      console.log('✅ FinanceContext: Finance data refetched');
      setSummary(summaryResponse.data);
      setLoanSummary(loanResponse.data);
      setLoading(false);

      // Update cache with fresh data
      setCachedData(CACHE_KEYS.summary, summaryResponse.data);
      setCachedData(CACHE_KEYS.loanSummary, loanResponse.data);
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('🔒 FinanceContext: Unauthorized during refetch');
        setLoading(false);
        return;
      }

      const errorMessage = err.response?.data?.message || 'Failed to fetch finance data';
      console.error('❌ FinanceContext: Error refetching:', errorMessage);
      setError(errorMessage);
      setLoading(false);
      toast.error(errorMessage);
    }
  };

  const value = {
    summary,
    loanSummary,
    loading,
    error,
    refetch,
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};

/**
 * useFinance Hook
 * Access finance data from global context
 */
export const useFinance = () => {
  const context = useContext(FinanceContext);

  if (!context) {
    throw new Error('useFinance must be used within FinanceProvider');
  }

  return context;
};

export default FinanceContext;
