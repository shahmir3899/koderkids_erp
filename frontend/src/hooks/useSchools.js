// ============================================
// useSchools Hook - Now Uses Global Context
// ============================================
// UPDATED: This hook now reads from SchoolsContext instead of making API calls
// This eliminates duplicate API requests

import { useContext } from 'react';
import SchoolsContext from '../contexts/SchoolsContext';

/**
 * Custom hook to access schools data from global context
 * @returns {Object} Schools data, loading state, error, and refetch function
 */
export const useSchools = () => {
  const context = useContext(SchoolsContext);
  
  if (!context) {
    throw new Error('useSchools must be used within SchoolsProvider');
  }
  
  return context;
};

export default useSchools;