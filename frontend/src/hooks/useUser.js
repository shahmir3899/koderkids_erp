// ============================================
// useUser Hook - Uses Global User Context
// ============================================
// Location: src/hooks/useUser.js
//
// PURPOSE: Provides easy access to current user profile data
// BENEFIT: Single source of truth for user data, eliminates duplicate API calls

import { useContext } from 'react';
import UserContext from '../contexts/UserContext';

/**
 * Custom hook to access user profile from global context
 * @returns {Object} User data, loading state, error, and refetch function
 * @returns {Object|null} user - Current user profile (id, username, email, role, etc.)
 * @returns {boolean} loading - Loading state
 * @returns {string|null} error - Error message if any
 * @returns {Function} refetch - Function to force refresh user data
 */
export const useUser = () => {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }

  return context;
};

export default useUser;
