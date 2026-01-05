// ============================================
// USER CONTEXT - Global User Profile with Caching
// ============================================
// Location: src/contexts/UserContext.js
//
// PURPOSE: Cache current user profile data to eliminate repeated API calls
// BENEFIT: Teacher ID, student profile, and user data fetched once and cached

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeaders } from '../api';
import { getCachedData, setCachedData, clearCache } from '../utils/cacheUtils';
import { toast } from 'react-toastify';

const API_URL = process.env.REACT_APP_API_URL;

// Create Context
const UserContext = createContext();

/**
 * UserProvider Component
 * Provides current user profile data to all children with caching
 */
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadUserProfile = async () => {
      // Check if user is authenticated
      const token = localStorage.getItem('access');
      if (!token) {
        console.log('⏸️ UserContext: No auth token, skipping fetch');
        if (isMounted) {
          setLoading(false);
          setUser(null);
        }
        return;
      }

      console.log('👤 UserContext: Loading user profile...');

      // Try to load from cache first
      const cachedUser = getCachedData('userProfile');

      if (cachedUser !== null) {
        console.log('⚡ UserContext: Using cached user profile');
        if (isMounted) {
          setUser(cachedUser);
          setLoading(false);
        }
        return;
      }

      // Cache miss - fetch from API
      setLoading(true);
      setError(null);

      try {
        console.log('🌐 UserContext: Fetching fresh user profile from API...');
        const response = await axios.get(`${API_URL}/api/auth/user/`, {
          headers: getAuthHeaders(),
        });

        if (isMounted) {
          console.log('✅ UserContext: User profile loaded:', response.data);
          setUser(response.data);
          setLoading(false);

          // Save to cache (30 minutes)
          setCachedData('userProfile', response.data);
        }
      } catch (err) {
        if (isMounted) {
          // Check if error is 401 (unauthorized)
          if (err.response?.status === 401) {
            console.log('🔒 UserContext: Unauthorized - user not logged in');
            setUser(null);
            setLoading(false);
            return;
          }

          const errorMessage = err.response?.data?.message || 'Failed to fetch user profile';
          console.error('❌ UserContext: Error loading user profile:', errorMessage);
          setError(errorMessage);
          setLoading(false);
        }
      }
    };

    loadUserProfile();

    // Listen for storage events (logout)
    const handleStorageChange = () => {
      const token = localStorage.getItem('access');
      if (!token && isMounted) {
        console.log('🚪 UserContext: User logged out, clearing profile');
        setUser(null);
        setLoading(false);
        clearCache('userProfile');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Refetch function (bypasses cache)
  const refetch = async (bypassCache = true) => {
    const token = localStorage.getItem('access');
    if (!token) {
      console.log('⏸️ UserContext: No auth token, cannot refetch');
      return;
    }

    console.log('🔄 UserContext: Refetching user profile...');

    if (bypassCache) {
      clearCache('userProfile');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/api/auth/user/`, {
        headers: getAuthHeaders(),
      });

      console.log('✅ UserContext: User profile refetched:', response.data);
      setUser(response.data);
      setLoading(false);

      // Update cache
      setCachedData('userProfile', response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('🔒 UserContext: Unauthorized during refetch');
        setUser(null);
        setLoading(false);
        return;
      }

      const errorMessage = err.response?.data?.message || 'Failed to fetch user profile';
      console.error('❌ UserContext: Error refetching user profile:', errorMessage);
      setError(errorMessage);
      setLoading(false);
      toast.error(errorMessage);
    }
  };

  const value = {
    user,
    loading,
    error,
    refetch,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

/**
 * useUser Hook
 * Access current user profile from context
 */
export const useUser = () => {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }

  return context;
};

export default UserContext;
