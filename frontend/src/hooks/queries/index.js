// ============================================
// REACT QUERY HOOKS - Central Export
// ============================================
// Location: frontend/src/hooks/queries/index.js
//
// This file re-exports all React Query hooks for convenient importing.
// Usage: import { useStudents, useTransactions } from '../hooks/queries';

// Students
export {
  useStudents,
  useActiveStudents,
  useUpdateStudent,
  useDeleteStudent,
  usePrefetchStudents,
  studentKeys,
} from './useStudentsQuery';

// Transactions
export {
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
} from './useTransactionsQuery';

// Users
export {
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
} from './useUsersQuery';

// Dashboard
export {
  useStudentsPerSchool,
  useFeePerMonth,
  useFeeSummary,
  useNewRegistrations,
  useStudentData,
  useEssentialDashboardData,
  usePrefetchDashboard,
  dashboardKeys,
  // Phase 3: Combined endpoint hooks
  useAdminDashboardSummary,
  useTransactionsPageData,
  useFinanceDashboard,
  useStudentsPageData,
} from './useDashboardQuery';

// Finance
export {
  useMonthlyTrends,
  useCashFlow,
  useAccountBalanceHistory,
  useExpenseCategories,
  useIncomeCategories,
  financeKeys,
} from './useFinanceQuery';

// Inventory
export {
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
} from './useInventoryQuery';
