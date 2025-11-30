// ============================================
// useSchools Hook - Fetch Schools Data
// ============================================

import { useState, useEffect } from 'react';
import { fetchSchools } from '../api/services/schoolService';
import { toast } from 'react-toastify';

/**
 * Custom hook to fetch and manage schools data
 * @param {boolean} fetchOnMount - Whether to fetch on component mount (default: true)
 * @returns {Object} Schools data, loading state, error, and refetch function
 */
export const useSchools = (fetchOnMount = true) => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch schools from API
   */
  const loadSchools = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchSchools();
      setSchools(data);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch schools';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount if enabled
  useEffect(() => {
    if (fetchOnMount) {
      loadSchools();
    }
  }, [fetchOnMount]);

  return {
    schools,
    loading,
    error,
    refetch: loadSchools,
  };
};

export default useSchools;