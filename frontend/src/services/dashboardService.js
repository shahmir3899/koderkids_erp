/**
 * Dashboard Service - Phase 3 Combined API Endpoints
 *
 * These endpoints replace multiple individual API calls with single combined requests,
 * significantly reducing network overhead and improving page load times.
 *
 * Available endpoints:
 * - getAdminDashboardSummary: Replaces 7+ individual calls on admin dashboard
 * - getTransactionsPageData: Replaces 4 calls on transactions page
 * - getFinanceDashboard: Replaces 3-4 calls on finance dashboard
 * - getStudentsPageData: Replaces multiple calls on students page
 */

import api from '../utils/axiosInterceptor';

const BASE_URL = '/api/dashboards';

/**
 * Get complete admin dashboard data in a single request.
 * Replaces multiple calls to: stats, students per school, recent registrations,
 * schools list, accounts, pending fees, etc.
 *
 * @param {Object} options - Query options
 * @param {string} options.schoolId - Optional filter by school ID
 * @returns {Promise<Object>} Dashboard data containing:
 *   - stats: { total_students, total_teachers, total_schools, total_revenue, etc. }
 *   - recent_registrations: Array of { school, count }
 *   - students_per_school: Array of { school_id, school, total_students }
 *   - schools: Array of school objects
 *   - accounts: Array of account objects
 */
export const getAdminDashboardSummary = async (options = {}) => {
  const params = new URLSearchParams();
  if (options.schoolId) params.append('school_id', options.schoolId);

  const url = `${BASE_URL}/admin-summary/${params.toString() ? '?' + params.toString() : ''}`;
  const response = await api.get(url);
  return response.data;
};

/**
 * Get all reference data needed for transactions page.
 * Replaces multiple calls to: schools, accounts, income categories, expense categories.
 *
 * @returns {Promise<Object>} Reference data containing:
 *   - schools: Array of { id, name, location }
 *   - accounts: Array of { id, account_name, account_type, current_balance }
 *   - categories: { income: string[], expense: string[] }
 */
export const getTransactionsPageData = async () => {
  const response = await api.get(`${BASE_URL}/transactions-page-data/`);
  return response.data;
};

/**
 * Get complete finance dashboard data in a single request.
 * Replaces multiple calls to: finance summary, monthly trends, cash flow, categories.
 *
 * @param {Object} options - Query options
 * @param {string} options.schoolId - Optional filter by school ID
 * @param {string} options.period - '3months' or '6months' (default: '6months')
 * @returns {Promise<Object>} Finance data containing:
 *   - summary: { total_income, total_expense, net_balance, pending_fees, loan_balance }
 *   - monthly_trends: Array of { month_label, income, expenses, net }
 *   - top_expense_categories: Array of { category, total }
 *   - top_income_categories: Array of { category, total }
 *   - accounts: Array of account balances
 *   - period: { type, start_date, end_date }
 */
export const getFinanceDashboard = async (options = {}) => {
  const params = new URLSearchParams();
  if (options.schoolId) params.append('school_id', options.schoolId);
  if (options.period) params.append('period', options.period);

  const url = `${BASE_URL}/finance-dashboard/${params.toString() ? '?' + params.toString() : ''}`;
  const response = await api.get(url);
  return response.data;
};

/**
 * Get data needed for students page.
 * Replaces multiple calls to: schools with classes, student stats.
 *
 * @param {Object} options - Query options
 * @param {string} options.schoolId - Optional filter by school ID
 * @returns {Promise<Object>} Students page data containing:
 *   - schools: Array of { id, name, location, classes: string[] }
 *   - stats: { total_active_students, total_schools }
 *   - class_distribution: Array of { student_class, count }
 */
export const getStudentsPageData = async (options = {}) => {
  const params = new URLSearchParams();
  if (options.schoolId) params.append('school_id', options.schoolId);

  const url = `${BASE_URL}/students-page-data/${params.toString() ? '?' + params.toString() : ''}`;
  const response = await api.get(url);
  return response.data;
};

export default {
  getAdminDashboardSummary,
  getTransactionsPageData,
  getFinanceDashboard,
  getStudentsPageData,
};
