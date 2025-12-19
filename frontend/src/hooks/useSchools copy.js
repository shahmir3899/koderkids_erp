// ============================================
// useSchools Hook - Fetch Schools Data
// ============================================

import { useState, useEffect } from 'react';
import { fetchSchools, fetchSchoolsOverview } from '../api/services/schoolService';
import { toast } from 'react-toastify';

/**
 * Custom hook to fetch and manage schools data
 * @param {boolean} fetchOnMount - Whether to fetch on component mount (default: true)
 * @param {boolean} includeStats - Whether to fetch with statistics (default: false)
 * @returns {Object} Schools data, loading state, error, and refetch function
 */
export const useSchools = (fetchOnMount = true, includeStats = false) => {
  const [schools, setSchools] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch schools from API
   */
  const loadSchools = async () => {
    setLoading(true);
    setError(null);

    try {
      if (includeStats) {
        // Fetch schools with overview statistics
        const overviewData = await fetchSchoolsOverview();
        setOverview(overviewData);
        setSchools(overviewData.schools || []);
      } else {
        // Fetch basic schools list (EXISTING BEHAVIOR)
        const data = await fetchSchools();
        setSchools(data);
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOnMount, includeStats]);

  return {
    schools,          // Array of schools
    overview,         // Overview data (only if includeStats=true)
    loading,          // Loading state
    error,            // Error message
    refetch: loadSchools,  // Function to refetch data
  };
};

export default useSchools;