// ============================================
// INVENTORY QUERY HOOKS - React Query Implementation
// ============================================
// Location: frontend/src/hooks/queries/useInventoryQuery.js
// Replaces manual data fetching in InventoryPage/InventoryDashboard

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchInventoryItems,
  fetchInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  fetchInventorySummary,
  fetchCategories,
  fetchEmployees,
  fetchAvailableUsers,
  fetchAllowedSchools,
  fetchUserInventoryContext,
  bulkUpdateStatus,
  bulkAssign,
  transferInventoryItems,
} from '../../services/inventoryService';

// Query Keys
export const inventoryKeys = {
  all: ['inventory'],
  items: () => [...inventoryKeys.all, 'items'],
  itemList: (filters) => [...inventoryKeys.items(), 'list', filters],
  itemDetail: (id) => [...inventoryKeys.items(), 'detail', id],
  summary: (locationId, location) => [...inventoryKeys.all, 'summary', locationId, location],
  categories: ['inventory', 'categories'],
  employees: ['inventory', 'employees'],
  availableUsers: ['inventory', 'availableUsers'],
  allowedSchools: ['inventory', 'allowedSchools'],
  userContext: ['inventory', 'userContext'],
};

/**
 * Hook to fetch inventory items with filters
 * @param {Object} filters - Filter options
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useInventoryItems = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: inventoryKeys.itemList(filters),
    queryFn: () => fetchInventoryItems(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Hook to fetch a single inventory item
 * @param {number} id - Item ID
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useInventoryItem = (id, options = {}) => {
  return useQuery({
    queryKey: inventoryKeys.itemDetail(id),
    queryFn: () => fetchInventoryItem(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch inventory summary/stats
 * @param {number} locationId - Location ID
 * @param {string} location - Location name
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useInventorySummary = (locationId = null, location = null, options = {}) => {
  return useQuery({
    queryKey: inventoryKeys.summary(locationId, location),
    queryFn: () => fetchInventorySummary(locationId, location),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch inventory categories
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useInventoryCategories = (options = {}) => {
  return useQuery({
    queryKey: inventoryKeys.categories,
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes - categories rarely change
    ...options,
  });
};

/**
 * Hook to fetch employees
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useInventoryEmployees = (options = {}) => {
  return useQuery({
    queryKey: inventoryKeys.employees,
    queryFn: fetchEmployees,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch available users for assignment
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useInventoryAvailableUsers = (options = {}) => {
  return useQuery({
    queryKey: inventoryKeys.availableUsers,
    queryFn: fetchAvailableUsers,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch allowed schools (RBAC)
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useAllowedSchools = (options = {}) => {
  return useQuery({
    queryKey: inventoryKeys.allowedSchools,
    queryFn: fetchAllowedSchools,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch user inventory context (RBAC)
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useUserInventoryContext = (options = {}) => {
  return useQuery({
    queryKey: inventoryKeys.userContext,
    queryFn: fetchUserInventoryContext,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to create an inventory item
 * @returns {Object} Mutation result
 */
export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemData) => createInventoryItem(itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
};

/**
 * Hook to update an inventory item
 * @returns {Object} Mutation result
 */
export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, itemData }) => updateInventoryItem(id, itemData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.itemDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
    },
  });
};

/**
 * Hook to delete an inventory item
 * @returns {Object} Mutation result
 */
export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteInventoryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
};

/**
 * Hook for bulk status update
 * @returns {Object} Mutation result
 */
export const useBulkUpdateStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemIds, newStatus }) => bulkUpdateStatus(itemIds, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
    },
  });
};

/**
 * Hook for bulk assignment
 * @returns {Object} Mutation result
 */
export const useBulkAssign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemIds, userId }) => bulkAssign(itemIds, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
    },
  });
};

/**
 * Hook for transferring inventory items
 * @returns {Object} Mutation result
 */
export const useTransferInventoryItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => transferInventoryItems(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
};

export default {
  useInventoryItems,
  useInventoryItem,
  useInventorySummary,
  useInventoryCategories,
  useInventoryEmployees,
  useInventoryAvailableUsers,
  useAllowedSchools,
  useUserInventoryContext,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
  useBulkUpdateStatus,
  useBulkAssign,
  useTransferInventoryItems,
  inventoryKeys,
};
