// ============================================
// USE USERS HOOK - STATE MANAGEMENT FOR USER MANAGEMENT
// With localStorage caching for performance
// ============================================

import { useState, useCallback, useEffect } from 'react';
import {
  fetchUsers as fetchUsersAPI,
  fetchUserById as fetchUserByIdAPI,
  createUser as createUserAPI,
  updateUser as updateUserAPI,
  deactivateUser as deactivateUserAPI,
  assignSchools as assignSchoolsAPI,
  resetPassword as resetPasswordAPI,
  fetchUserStats as fetchUserStatsAPI,
  fetchAvailableRoles as fetchAvailableRolesAPI,
} from '../services/userService';
import { getCachedData, setCachedData, clearCache } from '../utils/cacheUtils';

// Cache configuration
const USERS_CACHE_KEY = 'users_list';
const STATS_CACHE_KEY = 'users_stats';
const USERS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (users change more frequently than schools)

/**
 * Custom hook for user management
 * Provides state and functions for managing users
 * 
 * @param {Object} options - Hook options
 * @param {boolean} options.loadOnMount - Load users on component mount (default: false)
 * @param {Object} options.initialFilters - Initial filter values
 * @returns {Object} User management state and functions
 */
export const useUsers = (options = {}) => {
  const { loadOnMount = false, initialFilters = {} } = options;

  // ============================================
  // STATE
  // ============================================

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [roles, setRoles] = useState([]);
  
  const [loading, setLoading] = useState({
    users: false,
    stats: false,
    roles: false,
    submit: false,
    delete: false,
    action: false, // For special actions (assign schools, reset password)
  });

  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  // Track if initial load has happened
  const [hasLoaded, setHasLoaded] = useState(false);

  // ============================================
  // FETCH USERS (with caching)
  // ============================================

  const fetchUsers = useCallback(async (filterParams = {}, bypassCache = false) => {
    setLoading(prev => ({ ...prev, users: true }));
    setError(null);

    try {
      const mergedFilters = { ...filters, ...filterParams };
      const hasFilters = Object.keys(mergedFilters).some(k => mergedFilters[k]);

      // Only use cache for unfiltered requests
      if (!hasFilters && !bypassCache) {
        const cachedUsers = getCachedData(USERS_CACHE_KEY, USERS_CACHE_DURATION);
        if (cachedUsers !== null) {
          console.log('⚡ Using cached users data');
          setUsers(cachedUsers);
          setHasLoaded(true);
          setLoading(prev => ({ ...prev, users: false }));
          return cachedUsers;
        }
      }

      console.log('🔄 Fetching users from API...');
      const data = await fetchUsersAPI(mergedFilters);

      setUsers(data);
      setHasLoaded(true);

      // Cache only unfiltered results
      if (!hasFilters) {
        setCachedData(USERS_CACHE_KEY, data);
      }

      console.log('✅ Users loaded:', data.length);
      return data;
    } catch (err) {
      console.error('❌ Error loading users:', err);
      setError(err.response?.data?.error || 'Failed to fetch users');
      setUsers([]);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  }, [filters]);

  // ============================================
  // FETCH USER BY ID
  // ============================================

  const fetchUserById = useCallback(async (userId) => {
    setLoading(prev => ({ ...prev, action: true }));
    setError(null);

    try {
      console.log('🔄 Fetching user details:', userId);
      
      const data = await fetchUserByIdAPI(userId);
      
      setSelectedUser(data);
      console.log('✅ User details loaded');
      return data;
    } catch (err) {
      console.error('❌ Error loading user details:', err);
      setError(err.response?.data?.error || 'Failed to fetch user details');
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  }, []);

  // ============================================
  // CREATE USER
  // ============================================

  const createUser = useCallback(async (userData) => {
    setLoading(prev => ({ ...prev, submit: true }));
    setError(null);

    try {
      console.log('🔄 Creating user:', userData.username);

      const newUser = await createUserAPI(userData);

      // Clear cache since data changed
      clearCache(USERS_CACHE_KEY);
      clearCache(STATS_CACHE_KEY);

      // Add new user to the list
      setUsers(prev => [newUser, ...prev]);

      console.log('✅ User created successfully');
      return newUser;
    } catch (err) {
      console.error('❌ Error creating user:', err);
      const errorMessage = err.response?.data?.error ||
                          JSON.stringify(err.response?.data) ||
                          'Failed to create user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  }, []);

  // ============================================
  // UPDATE USER
  // ============================================

  const updateUser = useCallback(async (userId, userData) => {
    setLoading(prev => ({ ...prev, submit: true }));
    setError(null);

    try {
      console.log('🔄 Updating user:', userId);

      const updatedUser = await updateUserAPI(userId, userData);

      // Clear cache since data changed
      clearCache(USERS_CACHE_KEY);

      // Update user in the list
      setUsers(prev =>
        prev.map(user => (user.id === userId ? updatedUser : user))
      );

      // Update selected user if it's the one being updated
      if (selectedUser?.id === userId) {
        setSelectedUser(updatedUser);
      }

      console.log('✅ User updated successfully');
      return updatedUser;
    } catch (err) {
      console.error('❌ Error updating user:', err);
      const errorMessage = err.response?.data?.error ||
                          JSON.stringify(err.response?.data) ||
                          'Failed to update user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  }, [selectedUser]);

  // ============================================
  // DEACTIVATE USER
  // ============================================

  const deactivateUser = useCallback(async (userId) => {
    setLoading(prev => ({ ...prev, delete: true }));
    setError(null);

    try {
      console.log('🔄 Deactivating user:', userId);

      await deactivateUserAPI(userId);

      // Clear cache since data changed
      clearCache(USERS_CACHE_KEY);
      clearCache(STATS_CACHE_KEY);

      // Update user in the list (set is_active to false)
      setUsers(prev =>
        prev.map(user =>
          user.id === userId ? { ...user, is_active: false } : user
        )
      );

      // Clear selected user if it was deleted
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
      }

      console.log('✅ User deactivated successfully');
    } catch (err) {
      console.error('❌ Error deactivating user:', err);
      const errorMessage = err.response?.data?.error || 'Failed to deactivate user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
    }
  }, [selectedUser]);

  // ============================================
  // ASSIGN SCHOOLS
  // ============================================

  const assignSchools = useCallback(async (userId, schoolIds) => {
    setLoading(prev => ({ ...prev, action: true }));
    setError(null);

    try {
      console.log('🔄 Assigning schools to user:', userId);

      const updatedUser = await assignSchoolsAPI(userId, schoolIds);

      // Clear cache since data changed
      clearCache(USERS_CACHE_KEY);

      // Update user in the list
      setUsers(prev =>
        prev.map(user => (user.id === userId ? updatedUser : user))
      );

      // Update selected user if it's the one being updated
      if (selectedUser?.id === userId) {
        setSelectedUser(updatedUser);
      }

      console.log('✅ Schools assigned successfully');
      return updatedUser;
    } catch (err) {
      console.error('❌ Error assigning schools:', err);
      const errorMessage = err.response?.data?.error || 'Failed to assign schools';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  }, [selectedUser]);

  // ============================================
  // RESET PASSWORD
  // ============================================

  const resetPassword = useCallback(async (userId, passwordData = {}) => {
    setLoading(prev => ({ ...prev, action: true }));
    setError(null);

    try {
      console.log('🔄 Resetting password for user:', userId);
      
      const response = await resetPasswordAPI(userId, passwordData);
      
      console.log('✅ Password reset successfully');
      return response;
    } catch (err) {
      console.error('❌ Error resetting password:', err);
      const errorMessage = err.response?.data?.error || 'Failed to reset password';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  }, []);

  // ============================================
  // FETCH STATISTICS
  // ============================================

  const fetchStats = useCallback(async (bypassCache = false) => {
    setLoading(prev => ({ ...prev, stats: true }));

    try {
      // Check cache first
      if (!bypassCache) {
        const cachedStats = getCachedData(STATS_CACHE_KEY, USERS_CACHE_DURATION);
        if (cachedStats !== null) {
          console.log('⚡ Using cached stats data');
          setStats(cachedStats);
          setLoading(prev => ({ ...prev, stats: false }));
          return cachedStats;
        }
      }

      console.log('🔄 Fetching user statistics from API...');
      const data = await fetchUserStatsAPI();

      setStats(data);
      setCachedData(STATS_CACHE_KEY, data);

      console.log('✅ Statistics loaded');
      return data;
    } catch (err) {
      console.error('❌ Error loading statistics:', err);
      // Don't set error for stats - it's not critical
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  }, []);

  // ============================================
  // FETCH ROLES
  // ============================================

  const fetchRoles = useCallback(async () => {
    setLoading(prev => ({ ...prev, roles: true }));

    try {
      console.log('🔄 Fetching available roles');
      
      const data = await fetchAvailableRolesAPI();
      
      setRoles(data);
      console.log('✅ Roles loaded:', data.length);
      return data;
    } catch (err) {
      console.error('❌ Error loading roles:', err);
      // Don't set error for roles - use fallback
      setRoles([
        { value: 'Admin', label: 'Admin' },
        { value: 'Teacher', label: 'Teacher' },
        { value: 'Student', label: 'Student' },
      ]);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, roles: false }));
    }
  }, []);

  // ============================================
  // FILTER HELPERS
  // ============================================

  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    return fetchUsers(newFilters);
  }, [fetchUsers]);

  const clearFilters = useCallback(() => {
    setFilters({});
    return fetchUsers({});
  }, [fetchUsers]);

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSelectedUser = useCallback(() => {
    setSelectedUser(null);
  }, []);

  const refreshUsers = useCallback(() => {
    // Bypass cache when explicitly refreshing
    return fetchUsers(filters, true);
  }, [fetchUsers, filters]);

  const clearUsersCache = useCallback(() => {
    clearCache(USERS_CACHE_KEY);
    clearCache(STATS_CACHE_KEY);
    console.log('🗑️ Users cache cleared');
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  // Load users on mount if enabled
  useEffect(() => {
    if (loadOnMount && !hasLoaded) {
      fetchUsers();
    }
  }, [loadOnMount, hasLoaded, fetchUsers]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    users,
    selectedUser,
    stats,
    roles,
    loading,
    error,
    filters,
    hasLoaded,

    // User CRUD
    fetchUsers,
    fetchUserById,
    createUser,
    updateUser,
    deactivateUser,

    // Special Actions
    assignSchools,
    resetPassword,

    // Statistics & Metadata
    fetchStats,
    fetchRoles,

    // Filter Helpers
    applyFilters,
    clearFilters,

    // Utilities
    clearError,
    clearSelectedUser,
    refreshUsers,
    setSelectedUser,
    clearUsersCache,
  };
};

export default useUsers;