// ============================================
// CLASSES CONTEXT - Cache Classes by School ID
// ============================================
// Location: src/contexts/ClassesContext.js
//
// PURPOSE: Cache classes data per school to eliminate repeated API calls
// BENEFIT: Classes are fetched once per school and cached

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getClasses } from '../api';
import { getCachedData, setCachedData, clearCache } from '../utils/cacheUtils';
import { toast } from 'react-toastify';

// Create Context
const ClassesContext = createContext();

/**
 * ClassesProvider Component
 * Provides classes data cached by school ID
 */
export const ClassesProvider = ({ children }) => {
  // Map structure: { schoolId: { classes: [...], timestamp: ... } }
  const [classesCache, setClassesCache] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load cached classes from localStorage on mount
    const cachedClassesData = getCachedData('classesCache');
    if (cachedClassesData) {
      console.log('⚡ ClassesContext: Loaded classes cache from localStorage');
      setClassesCache(cachedClassesData);
    }

    // Listen for storage events (logout)
    const handleStorageChange = () => {
      const token = localStorage.getItem('access');
      if (!token) {
        console.log('🚪 ClassesContext: User logged out, clearing classes cache');
        setClassesCache({});
        clearCache('classesCache');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  /**
   * Fetch classes for a specific school
   * Uses cache if available, otherwise fetches from API
   * @param {number|string} schoolId - School ID
   * @returns {Promise<Array>} Array of class names
   */
  const fetchClassesBySchool = useCallback(async (schoolId) => {
    if (!schoolId) {
      console.log('⚠️ ClassesContext: No schoolId provided');
      return [];
    }

    const schoolIdStr = String(schoolId);

    // Check if already in memory cache using functional state access
    // This avoids needing classesCache in dependencies (prevents infinite loop)
    let cachedData = null;
    setClassesCache(prev => {
      if (prev[schoolIdStr]) {
        const cached = prev[schoolIdStr];
        const age = Date.now() - (cached.timestamp || 0);
        const maxAge = 30 * 60 * 1000; // 30 minutes

        if (age < maxAge) {
          console.log(`⚡ ClassesContext: Using cached classes for school ${schoolId}`);
          cachedData = cached.classes || [];
        } else {
          console.log(`🗑️ ClassesContext: Cache expired for school ${schoolId}`);
        }
      }
      return prev; // Don't modify state, just read it
    });

    // If we found valid cached data, return it
    if (cachedData !== null) {
      return cachedData;
    }

    // Cache miss or expired - fetch from API
    console.log(`🌐 ClassesContext: Fetching classes for school ${schoolId}...`);

    setLoading(prev => ({ ...prev, [schoolIdStr]: true }));
    setError(null);

    try {
      const data = await getClasses(schoolId);

      console.log(`✅ ClassesContext: Loaded ${data.length} classes for school ${schoolId}`);

      // Update memory cache using functional update
      setClassesCache(prev => {
        const newCache = {
          ...prev,
          [schoolIdStr]: {
            classes: data,
            timestamp: Date.now(),
          },
        };
        // Save to localStorage
        setCachedData('classesCache', newCache);
        return newCache;
      });

      setLoading(prev => ({ ...prev, [schoolIdStr]: false }));

      return data;
    } catch (err) {
      console.error(`❌ ClassesContext: Error loading classes for school ${schoolId}:`, err);
      setError(err.message || 'Failed to fetch classes');
      setLoading(prev => ({ ...prev, [schoolIdStr]: false }));

      // Return empty array on error
      return [];
    }
  }, []); // No dependencies - function is now stable

  /**
   * Get cached classes for a school (synchronous)
   * Returns null if not cached, use fetchClassesBySchool to fetch
   * @param {number|string} schoolId - School ID
   * @returns {Array|null} Cached classes or null
   */
  const getCachedClasses = useCallback((schoolId) => {
    if (!schoolId) return null;

    const schoolIdStr = String(schoolId);
    const cached = classesCache[schoolIdStr];

    if (!cached) return null;

    const age = Date.now() - (cached.timestamp || 0);
    const maxAge = 30 * 60 * 1000; // 30 minutes

    if (age < maxAge) {
      return cached.classes || [];
    }

    return null; // Expired
  }, [classesCache]);

  /**
   * Clear cache for a specific school
   * @param {number|string} schoolId - School ID
   */
  const clearSchoolCache = (schoolId) => {
    if (!schoolId) return;

    const schoolIdStr = String(schoolId);
    console.log(`🗑️ ClassesContext: Clearing cache for school ${schoolId}`);

    const newCache = { ...classesCache };
    delete newCache[schoolIdStr];

    setClassesCache(newCache);
    setCachedData('classesCache', newCache);
  };

  /**
   * Clear all classes cache
   */
  const clearAllCache = () => {
    console.log('🗑️ ClassesContext: Clearing all classes cache');
    setClassesCache({});
    clearCache('classesCache');
  };

  /**
   * Prefetch classes for multiple schools
   * Useful for preloading data
   * @param {Array} schoolIds - Array of school IDs
   */
  const prefetchClasses = async (schoolIds) => {
    if (!Array.isArray(schoolIds) || schoolIds.length === 0) return;

    console.log(`📦 ClassesContext: Prefetching classes for ${schoolIds.length} schools...`);

    const promises = schoolIds.map(schoolId =>
      fetchClassesBySchool(schoolId).catch(err => {
        console.error(`Failed to prefetch classes for school ${schoolId}:`, err);
        return [];
      })
    );

    await Promise.all(promises);
    console.log('✅ ClassesContext: Prefetch complete');
  };

  const value = {
    classesCache,
    loading,
    error,
    fetchClassesBySchool,
    getCachedClasses,
    clearSchoolCache,
    clearAllCache,
    prefetchClasses,
  };

  return (
    <ClassesContext.Provider value={value}>
      {children}
    </ClassesContext.Provider>
  );
};

/**
 * useClasses Hook
 * Access classes cache and fetching functions
 */
export const useClasses = () => {
  const context = useContext(ClassesContext);

  if (!context) {
    throw new Error('useClasses must be used within ClassesProvider');
  }

  return context;
};

export default ClassesContext;
