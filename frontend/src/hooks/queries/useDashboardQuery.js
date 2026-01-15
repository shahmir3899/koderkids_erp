// ============================================
// DASHBOARD QUERY HOOKS - React Query Implementation
// ============================================
// Location: frontend/src/hooks/queries/useDashboardQuery.js
// Replaces manual caching in AdminDashboard

import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
  'Content-Type': 'application/json',
});

// Query Keys
export const dashboardKeys = {
  all: ['dashboard'],
  studentsPerSchool: ['dashboard', 'studentsPerSchool'],
  feePerMonth: ['dashboard', 'feePerMonth'],
  feeSummary: (month) => ['dashboard', 'feeSummary', month],
  newRegistrations: ['dashboard', 'newRegistrations'],
  studentData: (schoolId, className, month) => ['dashboard', 'studentData', schoolId, className, month],
};

/**
 * Hook to fetch students per school
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useStudentsPerSchool = (options = {}) => {
  return useQuery({
    queryKey: dashboardKeys.studentsPerSchool,
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/students-per-school/`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook to fetch fee per month
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useFeePerMonth = (options = {}) => {
  return useQuery({
    queryKey: dashboardKeys.feePerMonth,
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/fee-per-month/`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch fee summary for a specific month
 * @param {string} month - Month in YYYY-MM format
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useFeeSummary = (month, options = {}) => {
  return useQuery({
    queryKey: dashboardKeys.feeSummary(month),
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/fee-summary/?month=${month}`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!month,
    ...options,
  });
};

/**
 * Hook to fetch new registrations (lazy loaded)
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useNewRegistrations = (options = {}) => {
  return useQuery({
    queryKey: dashboardKeys.newRegistrations,
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/new-registrations/`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch student data (attendance, topics, images)
 * @param {number} schoolId - School ID
 * @param {string} className - Class name
 * @param {string} month - Month in YYYY-MM format
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result with combined data
 */
export const useStudentData = (schoolId, className, month, options = {}) => {
  return useQuery({
    queryKey: dashboardKeys.studentData(schoolId, className, month),
    queryFn: async () => {
      const [attendanceRes, topicsRes, imagesRes] = await Promise.all([
        axios.get(
          `${API_BASE_URL}/api/student-attendance/?school=${schoolId}&class=${className}&month=${month}`,
          { headers: getAuthHeaders() }
        ),
        axios.get(
          `${API_BASE_URL}/api/student-topics-achieved/?school=${schoolId}&class=${className}&month=${month}`,
          { headers: getAuthHeaders() }
        ),
        axios.get(
          `${API_BASE_URL}/api/student-images-uploaded/?school=${schoolId}&class=${className}&month=${month}`,
          { headers: getAuthHeaders() }
        ),
      ]);

      return {
        attendance: attendanceRes.data,
        topics: topicsRes.data,
        images: imagesRes.data,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId && !!className && !!month,
    ...options,
  });
};

/**
 * Hook to fetch essential dashboard data in one call
 * Combines students per school and fee per month
 * @param {Array} schools - Schools array (needed for processing)
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result with combined data
 */
export const useEssentialDashboardData = (schools = [], options = {}) => {
  return useQuery({
    queryKey: [...dashboardKeys.all, 'essential'],
    queryFn: async () => {
      const [studentsRes, feeRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/students-per-school/`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/fee-per-month/`, { headers: getAuthHeaders() }),
      ]);

      return {
        studentsPerSchool: studentsRes.data,
        feePerMonth: feeRes.data,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: schools.length > 0,
    ...options,
  });
};

/**
 * Hook to prefetch dashboard data
 */
export const usePrefetchDashboard = () => {
  const queryClient = useQueryClient();

  return {
    prefetchStudentsPerSchool: () => {
      queryClient.prefetchQuery({
        queryKey: dashboardKeys.studentsPerSchool,
        queryFn: async () => {
          const response = await axios.get(
            `${API_BASE_URL}/api/students-per-school/`,
            { headers: getAuthHeaders() }
          );
          return response.data;
        },
      });
    },
    prefetchNewRegistrations: () => {
      queryClient.prefetchQuery({
        queryKey: dashboardKeys.newRegistrations,
        queryFn: async () => {
          const response = await axios.get(
            `${API_BASE_URL}/api/new-registrations/`,
            { headers: getAuthHeaders() }
          );
          return response.data;
        },
      });
    },
  };
};

// ============================================
// PHASE 3: COMBINED ENDPOINT HOOKS
// These hooks use the new combined API endpoints for better performance
// ============================================

/**
 * Hook to fetch complete admin dashboard summary in a single request.
 * Phase 3 Optimization: Replaces 7+ individual API calls.
 *
 * @param {Object} options - Query options
 * @param {string} options.schoolId - Optional filter by school ID
 * @returns {Object} Query result containing:
 *   - stats: Dashboard statistics
 *   - recent_registrations: New student registrations
 *   - students_per_school: Student counts by school
 *   - schools: Schools list
 *   - accounts: Account balances
 */
export const useAdminDashboardSummary = (options = {}) => {
  const { schoolId, ...queryOptions } = options;

  return useQuery({
    queryKey: ['dashboard', 'adminSummary', schoolId || 'all'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (schoolId) params.append('school_id', schoolId);

      const url = `${API_BASE_URL}/api/dashboards/admin-summary/${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url, { headers: getAuthHeaders() });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (dashboard data changes frequently)
    ...queryOptions,
  });
};

/**
 * Hook to fetch all reference data for transactions page in a single request.
 * Phase 3 Optimization: Replaces 4 individual API calls.
 *
 * @param {Object} options - React Query options
 * @returns {Object} Query result containing:
 *   - schools: Schools list
 *   - accounts: Accounts list
 *   - categories: { income: [], expense: [] }
 */
export const useTransactionsPageData = (options = {}) => {
  return useQuery({
    queryKey: ['dashboard', 'transactionsPageData'],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/dashboards/transactions-page-data/`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (reference data rarely changes)
    ...options,
  });
};

/**
 * Hook to fetch complete finance dashboard data in a single request.
 * Phase 3 Optimization: Replaces 3-4 individual API calls.
 *
 * @param {Object} options - Query options
 * @param {string} options.schoolId - Optional filter by school ID
 * @param {string} options.period - '3months' or '6months' (default: '6months')
 * @returns {Object} Query result containing:
 *   - summary: Finance summary stats
 *   - monthly_trends: Monthly income/expense trends
 *   - top_expense_categories: Top expense categories
 *   - top_income_categories: Top income categories
 *   - accounts: Account balances
 *   - period: Date range info
 */
export const useFinanceDashboard = (options = {}) => {
  const { schoolId, period = '6months', ...queryOptions } = options;

  return useQuery({
    queryKey: ['dashboard', 'financeDashboard', schoolId || 'all', period],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (schoolId) params.append('school_id', schoolId);
      if (period) params.append('period', period);

      const url = `${API_BASE_URL}/api/dashboards/finance-dashboard/${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url, { headers: getAuthHeaders() });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
};

/**
 * Hook to fetch students page data in a single request.
 * Phase 3 Optimization: Replaces multiple individual API calls.
 *
 * @param {Object} options - Query options
 * @param {string} options.schoolId - Optional filter by school ID
 * @returns {Object} Query result containing:
 *   - schools: Schools with their classes
 *   - stats: Student statistics
 *   - class_distribution: Student counts by class
 */
export const useStudentsPageData = (options = {}) => {
  const { schoolId, ...queryOptions } = options;

  return useQuery({
    queryKey: ['dashboard', 'studentsPageData', schoolId || 'all'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (schoolId) params.append('school_id', schoolId);

      const url = `${API_BASE_URL}/api/dashboards/students-page-data/${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url, { headers: getAuthHeaders() });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
};

export default {
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
};
