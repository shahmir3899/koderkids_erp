// ============================================
// SCHOOLS CONTEXT - Global State with Caching
// ============================================
// Location: src/contexts/SchoolsContext.js
//
// FIXED: Only fetch when authenticated

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchSchools, fetchSchoolsOverview } from '../api/services/schoolService';
import { toast } from 'react-toastify';
import { getCachedData, setCachedData, clearCache } from '../utils/cacheUtils';

// Create Context
const SchoolsContext = createContext();

/**
 * SchoolsProvider Component
 * Wraps the app and provides schools data to all children
 * NOW WITH CLIENT-SIDE CACHING!
 */
export const SchoolsProvider = ({ children }) => {
  const [schools, setSchools] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false); // Changed from true to false
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadSchools = async () => {
      // ✅ FIX: Check if user is authenticated BEFORE fetching
      const token = localStorage.getItem('access');
      if (!token) {
        console.log('⏸️ SchoolsContext: No auth token, skipping fetch');
        if (isMounted) {
          setLoading(false);
          setSchools([]);
        }
        return; // Don't fetch if not authenticated
      }

      console.log('🏫 SchoolsContext: Loading schools...');
      
      // Try to load from cache first
      const cachedSchools = getCachedData('schools');
      
      if (cachedSchools !== null) {
        // Cache hit! Use cached data immediately
        console.log('⚡ SchoolsContext: Using cached schools data');
        if (isMounted) {
          setSchools(cachedSchools);
          setLoading(false);
        }
        return; // Skip API call
      }

      // Cache miss - fetch from API
      setLoading(true);
      setError(null);

      try {
        console.log('🌐 SchoolsContext: Fetching fresh schools from API...');
        const data = await fetchSchools();
        
        if (isMounted) {
          console.log('✅ SchoolsContext: Schools loaded:', data.length);
          setSchools(data);
          setLoading(false);
          
          // Save to cache for next time
          setCachedData('schools', data);
        }
      } catch (err) {
        if (isMounted) {
          // ✅ FIX: Check if error is 401 (unauthorized)
          if (err.response?.status === 401) {
            console.log('🔒 SchoolsContext: Unauthorized - user logged out');
            setSchools([]);
            setLoading(false);
            return; // Don't show error toast for auth issues
          }
          
          const errorMessage = err.response?.data?.message || 'Failed to fetch schools';
          console.error('❌ SchoolsContext: Error loading schools:', errorMessage);
          setError(errorMessage);
          setLoading(false);
          toast.error(errorMessage);
        }
      }
    };

    loadSchools();

    // ✅ FIX: Listen for storage events (logout)
    const handleStorageChange = () => {
      const token = localStorage.getItem('access');
      if (!token && isMounted) {
        console.log('🚪 SchoolsContext: User logged out, clearing schools');
        setSchools([]);
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
    // ✅ FIX: Check auth before refetching
    const token = localStorage.getItem('access');
    if (!token) {
      console.log('⏸️ SchoolsContext: No auth token, cannot refetch');
      return;
    }

    console.log('🔄 SchoolsContext: Refetching schools...');
    
    if (bypassCache) {
      clearCache('schools'); // Clear cache to force fresh fetch
    }
    
    setLoading(true);
    setError(null);

    try {
      const data = await fetchSchools();
      console.log('✅ SchoolsContext: Schools refetched:', data.length);
      setSchools(data);
      setLoading(false);
      
      // Update cache with fresh data
      setCachedData('schools', data);
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('🔒 SchoolsContext: Unauthorized during refetch');
        setSchools([]);
        setLoading(false);
        return;
      }
      
      const errorMessage = err.response?.data?.message || 'Failed to fetch schools';
      console.error('❌ SchoolsContext: Error refetching schools:', errorMessage);
      setError(errorMessage);
      setLoading(false);
      toast.error(errorMessage);
    }
  };

  const value = {
    schools,
    overview,
    loading,
    error,
    refetch,
  };

  return (
    <SchoolsContext.Provider value={value}>
      {children}
    </SchoolsContext.Provider>
  );
};

/**
 * useSchools Hook (Updated)
 * Now reads from context with caching support
 */
export const useSchools = () => {
  const context = useContext(SchoolsContext);
  
  if (!context) {
    throw new Error('useSchools must be used within SchoolsProvider');
  }
  
  return context;
};

export default SchoolsContext;