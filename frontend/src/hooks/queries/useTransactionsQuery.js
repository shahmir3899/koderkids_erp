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
  const { enabled = true, ...restOptions } = options;
  return useQuery({
    queryKey: transactionKeys.list(type, params),
    queryFn: async () => {
      const response = await transactionService.getTransactions(type, params);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - transactions change more frequently
    enabled: Boolean(enabled),
    ...restOptions,
  });
};

/**
 * Hook to fetch all transaction types at once (for reconciliation)
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result with all transaction types combined
 */
export const useAllTransactions = (options = {}) => {
  const { enabled = true, ...restOptions } = options;
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
    enabled: Boolean(enabled),
    ...restOptions,
  });
};

/**
 * Hook to fetch accounts
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useAccounts = (options = {}) => {
  const { enabled = true, ...restOptions } = options;
  return useQuery({
    queryKey: transactionKeys.accounts,
    queryFn: async () => {
      const response = await transactionService.getAccounts();
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - accounts rarely change
    enabled: Boolean(enabled),
    ...restOptions,
  });
};

/**
 * Hook to fetch schools for transactions
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useTransactionSchools = (options = {}) => {
  const { enabled = true, ...restOptions } = options;
  return useQuery({
    queryKey: transactionKeys.schools,
    queryFn: async () => {
      const response = await transactionService.getSchools();
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: Boolean(enabled),
    ...restOptions,
  });
};

/**
 * Hook to fetch categories by type
 * @param {string} type - Category type ('income' or 'expense')
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useCategories = (type, options = {}) => {
  const { enabled, ...restOptions } = options;
  // Default enabled to true if type exists, but allow override
  const isEnabled = enabled !== undefined ? Boolean(enabled) : !!type;
  return useQuery({
    queryKey: transactionKeys.categories(type),
    queryFn: async () => {
      const response = await transactionService.getCategories(type);
      return response.data.map((c) => c.name);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: isEnabled,
    ...restOptions,
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
 * Hook to create a transaction with optimistic updates
 * @returns {Object} Mutation result
 */
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, payload }) => transactionService.createTransaction(type, payload),

    // Optimistic update: immediately add to cache before server responds
    onMutate: async ({ type, payload }) => {
      // Cancel outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: transactionKeys.lists() });

      // Snapshot previous data for rollback
      const previousQueries = queryClient.getQueriesData({ queryKey: transactionKeys.lists() });

      // Optimistically update matching queries
      queryClient.setQueriesData(
        { queryKey: transactionKeys.lists() },
        (old) => {
          if (!old?.results) return old;
          // Create optimistic transaction with temp ID
          const optimisticTxn = {
            ...payload,
            id: `temp-${Date.now()}`,
            _isOptimistic: true,
          };
          return {
            ...old,
            results: [optimisticTxn, ...old.results],
            count: (old.count || 0) + 1,
          };
        }
      );

      return { previousQueries };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    // Refetch after success to sync with server
    onSuccess: (response, { type }) => {
      // Invalidate only the specific type's list queries
      queryClient.invalidateQueries({
        queryKey: transactionKeys.lists(),
        predicate: (query) => query.queryKey[2] === type || query.queryKey[1] === 'combined',
      });
      // Invalidate accounts for balance updates
      queryClient.invalidateQueries({ queryKey: transactionKeys.accounts });
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
};

/**
 * Hook to update a transaction with optimistic updates
 * @returns {Object} Mutation result
 */
export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, id, payload }) => transactionService.updateTransaction(type, id, payload),

    onMutate: async ({ type, id, payload }) => {
      await queryClient.cancelQueries({ queryKey: transactionKeys.lists() });

      const previousQueries = queryClient.getQueriesData({ queryKey: transactionKeys.lists() });

      // Optimistically update the transaction in cache
      queryClient.setQueriesData(
        { queryKey: transactionKeys.lists() },
        (old) => {
          if (!old?.results) return old;
          return {
            ...old,
            results: old.results.map((txn) =>
              txn.id === id ? { ...txn, ...payload, _isOptimistic: true } : txn
            ),
          };
        }
      );

      return { previousQueries };
    },

    onError: (err, variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSuccess: (response, { type }) => {
      queryClient.invalidateQueries({
        queryKey: transactionKeys.lists(),
        predicate: (query) => query.queryKey[2] === type || query.queryKey[1] === 'combined',
      });
      queryClient.invalidateQueries({ queryKey: transactionKeys.accounts });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
};

/**
 * Hook to delete a transaction with optimistic updates
 * @returns {Object} Mutation result
 */
export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, id }) => transactionService.deleteTransaction(type, id),

    onMutate: async ({ type, id }) => {
      await queryClient.cancelQueries({ queryKey: transactionKeys.lists() });

      const previousQueries = queryClient.getQueriesData({ queryKey: transactionKeys.lists() });

      // Optimistically remove the transaction from cache
      queryClient.setQueriesData(
        { queryKey: transactionKeys.lists() },
        (old) => {
          if (!old?.results) return old;
          return {
            ...old,
            results: old.results.filter((txn) => txn.id !== id),
            count: Math.max((old.count || 0) - 1, 0),
          };
        }
      );

      return { previousQueries };
    },

    onError: (err, variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSuccess: (response, { type }) => {
      queryClient.invalidateQueries({
        queryKey: transactionKeys.lists(),
        predicate: (query) => query.queryKey[2] === type || query.queryKey[1] === 'combined',
      });
      queryClient.invalidateQueries({ queryKey: transactionKeys.accounts });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
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

/**
 * Hook to bulk create transactions
 * Creates multiple transactions in a single API call for better performance.
 *
 * @returns {Object} Mutation result
 *
 * @example
 * const { mutate: bulkCreate } = useBulkCreateTransactions();
 * bulkCreate({
 *   type: 'income',
 *   transactions: [
 *     { date: '2025-01-15', amount: 5000, category: 'Sales', to_account: 1 },
 *     { date: '2025-01-16', amount: 3000, category: 'Sales', to_account: 1 },
 *   ]
 * });
 */
export const useBulkCreateTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, transactions }) =>
      transactionService.bulkCreateTransactions(type, transactions),

    onSuccess: (response, { type }) => {
      // Invalidate all transaction queries for the type
      queryClient.invalidateQueries({
        queryKey: transactionKeys.lists(),
        predicate: (query) => query.queryKey[2] === type || query.queryKey[1] === 'combined',
      });
      // Invalidate accounts for balance updates
      queryClient.invalidateQueries({ queryKey: transactionKeys.accounts });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
};

const transactionHooks = {
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
  useBulkCreateTransactions,
  transactionKeys,
};

export default transactionHooks;
