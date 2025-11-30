// ============================================
// useClasses Hook - Fetch Classes by School
// ============================================

import { useState, useEffect } from 'react';
import { fetchClasses } from '../api/services/schoolService';
import { toast } from 'react-toastify';

/**
 * Custom hook to fetch classes for a specific school
 * @param {number|string} schoolId - School ID to fetch classes for
 * @param {boolean} autoFetch - Whether to automatically fetch when schoolId changes (default: true)
 * @returns {Object} Classes data, loading state, error, and refetch function
 */
export const useClasses = (schoolId, autoFetch = true) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch classes from API
   */
  const loadClasses = async () => {
    if (!schoolId) {
      setClasses([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchClasses(schoolId);
      setClasses(data);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch classes';
      setError(errorMessage);
      toast.error(errorMessage);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when schoolId changes (if autoFetch is enabled)
  useEffect(() => {
    if (autoFetch && schoolId) {
      loadClasses();
    } else if (!schoolId) {
      setClasses([]);
    }
  }, [schoolId, autoFetch]);

  return {
    classes,
    loading,
    error,
    refetch: loadClasses,
  };
};

export default useClasses;