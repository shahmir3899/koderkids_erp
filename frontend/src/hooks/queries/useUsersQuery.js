// ============================================
// USERS QUERY HOOKS - React Query Implementation
// ============================================
// Location: frontend/src/hooks/queries/useUsersQuery.js
// Replaces the useUsers hook with React Query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchUsers as fetchUsersAPI,
  fetchUserById,
  createUser as createUserAPI,
  updateUser as updateUserAPI,
  deactivateUser as deactivateUserAPI,
  assignSchools as assignSchoolsAPI,
  resetPassword as resetPasswordAPI,
  fetchUserStats,
  fetchAvailableRoles,
} from '../../services/userService';

// Query Keys - centralized for consistency
export const userKeys = {
  all: ['users'],
  lists: () => [...userKeys.all, 'list'],
  list: (filters) => [...userKeys.lists(), filters],
  details: () => [...userKeys.all, 'detail'],
  detail: (id) => [...userKeys.details(), id],
  stats: ['users', 'stats'],
  roles: ['users', 'roles'],
};

/**
 * Hook to fetch all users with optional filters
 * @param {Object} filters - Filter options (role, school, is_active, search)
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useUsersQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => fetchUsersAPI(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook to fetch a single user by ID
 * @param {number} userId - User ID
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useUserById = (userId, options = {}) => {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => fetchUserById(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch user statistics
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useUserStats = (options = {}) => {
  return useQuery({
    queryKey: userKeys.stats,
    queryFn: fetchUserStats,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch available roles
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useAvailableRoles = (options = {}) => {
  return useQuery({
    queryKey: userKeys.roles,
    queryFn: fetchAvailableRoles,
    staleTime: 30 * 60 * 1000, // 30 minutes - roles rarely change
    ...options,
  });
};

/**
 * Hook to create a user
 * @returns {Object} Mutation result
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData) => createUserAPI(userData),
    onSuccess: () => {
      // Invalidate user queries
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.stats });
    },
  });
};

/**
 * Hook to update a user
 * @returns {Object} Mutation result
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, userData }) => updateUserAPI(userId, userData),
    onSuccess: (_, variables) => {
      // Invalidate specific user detail
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
      // Invalidate user lists
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.stats });
    },
  });
};

/**
 * Hook to deactivate a user
 * @returns {Object} Mutation result
 */
export const useDeactivateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId) => deactivateUserAPI(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.stats });
    },
  });
};

/**
 * Hook to assign schools to a teacher
 * @returns {Object} Mutation result
 */
export const useAssignSchools = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, schoolIds }) => assignSchoolsAPI(userId, schoolIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};

/**
 * Hook to reset user password
 * @returns {Object} Mutation result
 */
export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ userId, passwordData }) => resetPasswordAPI(userId, passwordData),
    // No cache invalidation needed for password reset
  });
};

export default {
  useUsersQuery,
  useUserById,
  useUserStats,
  useAvailableRoles,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
  useAssignSchools,
  useResetPassword,
  userKeys,
};
