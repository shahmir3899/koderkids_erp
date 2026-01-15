// ============================================
// TRANSACTIONS QUERY HOOKS - React Query Implementation
// ============================================
// Location: frontend/src/hooks/queries/useTransactionsQuery.js
// Replaces manual useState/useEffect data fetching patterns

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '../../services/transactionService';

// Query Keys - centralized for consistency
export const transactionKeys = {
  all: ['transactions'],
  lists: () => [...transactionKeys.all, 'list'],
  list: (type, params) => [...transactionKeys.lists(), type, params],
  accounts: ['accounts'],
  schools: ['schools'],
  categories: (type) => ['categories', type],
};

/**
 * Hook to fetch transactions by type
 * @param {string} type - Transaction type ('income', 'expense', 'transfers')
 * @param {Object} params - Query parameters (limit, offset, ordering)
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useTransactions = (type, params = {}, options = {}) => {
  return useQuery({
    queryKey: transactionKeys.list(type, params),
    queryFn: async () => {
      const response = await transactionService.getTransactions(type, params);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - transactions change more frequently
    ...options,
  });
};

/**
 * Hook to fetch all transaction types at once (for reconciliation)
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result with all transaction types combined
 */
export const useAllTransactions = (options = {}) => {
  return useQuery({
    queryKey: [...transactionKeys.all, 'combined'],
    queryFn: async () => {
      const [incomeRes, expenseRes, transferRes] = await Promise.all([
        transactionService.getTransactions('income', { limit: 50, ordering: '-date' }),
        transactionService.getTransactions('expense', { limit: 50, ordering: '-date' }),
        transactionService.getTransactions('transfers', { limit: 50, ordering: '-date' }),
      ]);

      const incomeTxs = incomeRes.data.results.map((trx) => ({
        ...trx,
        transaction_type: 'Income',
        to_account_name: trx.to_account_name || 'N/A',
        from_account_name: trx.from_account_name || 'N/A',
        school: trx.school_id || null,
        school_name: trx.school_name || 'No School',
      }));

      const expenseTxs = expenseRes.data.results.map((trx) => ({
        ...trx,
        transaction_type: 'Expense',
        to_account_name: trx.to_account_name || 'N/A',
        from_account_name: trx.from_account_name || 'N/A',
        school: trx.school_id || null,
        school_name: trx.school_name || 'No School',
      }));

      const transferTxs = transferRes.data.results.map((trx) => ({
        ...trx,
        transaction_type: 'Transfer',
        to_account_name: trx.to_account_name || 'N/A',
        from_account_name: trx.from_account_name || 'N/A',
        school: trx.school_id || null,
        school_name: trx.school_name || 'No School',
      }));

      const allTransactions = [...incomeTxs, ...expenseTxs, ...transferTxs];
      allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

      return allTransactions;
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch accounts
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useAccounts = (options = {}) => {
  return useQuery({
    queryKey: transactionKeys.accounts,
    queryFn: async () => {
      const response = await transactionService.getAccounts();
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - accounts rarely change
    ...options,
  });
};

/**
 * Hook to fetch schools for transactions
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useTransactionSchools = (options = {}) => {
  return useQuery({
    queryKey: transactionKeys.schools,
    queryFn: async () => {
      const response = await transactionService.getSchools();
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

/**
 * Hook to fetch categories by type
 * @param {string} type - Category type ('income' or 'expense')
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useCategories = (type, options = {}) => {
  return useQuery({
    queryKey: transactionKeys.categories(type),
    queryFn: async () => {
      const response = await transactionService.getCategories(type);
      return response.data.map((c) => c.name);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!type,
    ...options,
  });
};

/**
 * Hook to fetch all categories (income and expense)
 * @param {Object} options - Additional React Query options
 * @returns {Object} Combined categories
 */
export const useAllCategories = (options = {}) => {
  const incomeQuery = useCategories('income', options);
  const expenseQuery = useCategories('expense', options);

  return {
    incomeCategories: incomeQuery.data || [],
    expenseCategories: expenseQuery.data || [],
    isLoading: incomeQuery.isLoading || expenseQuery.isLoading,
    error: incomeQuery.error || expenseQuery.error,
  };
};

/**
 * Hook to create a transaction
 * @returns {Object} Mutation result
 */
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, payload }) => transactionService.createTransaction(type, payload),
    onSuccess: () => {
      // Invalidate all transaction queries
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      // Also invalidate accounts since balances may have changed
      queryClient.invalidateQueries({ queryKey: transactionKeys.accounts });
    },
  });
};

/**
 * Hook to update a transaction
 * @returns {Object} Mutation result
 */
export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, id, payload }) => transactionService.updateTransaction(type, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.accounts });
    },
  });
};

/**
 * Hook to delete a transaction
 * @returns {Object} Mutation result
 */
export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, id }) => transactionService.deleteTransaction(type, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.accounts });
    },
  });
};

/**
 * Hook to add a new category
 * @returns {Object} Mutation result
 */
export const useAddCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => transactionService.addCategory(payload),
    onSuccess: (_, variables) => {
      // Invalidate the specific category type
      queryClient.invalidateQueries({
        queryKey: transactionKeys.categories(variables.category_type)
      });
    },
  });
};

export default {
  useTransactions,
  useAllTransactions,
  useAccounts,
  useTransactionSchools,
  useCategories,
  useAllCategories,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useAddCategory,
  transactionKeys,
};
