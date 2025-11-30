// ============================================
// FINANCE DASHBOARD - Refactored Version
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL, getAuthHeaders } from '../api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Common Components
import { CollapsibleSection } from '../components/common/cards/CollapsibleSection';
import { DataTable } from '../components/common/tables/DataTable';
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ui/ErrorDisplay';
import { useSchools } from '../hooks/useSchools';

// Finance Components
import { FinanceSummaryCards } from '../components/finance/FinanceSummaryCards';
import { TransactionFilterPanel } from '../components/finance/TransactionFilterPanel';
import { PivotTableViewer } from '../components/finance/PivotTableViewer';

function FinanceDashboard() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  // Data States
  const [summary, setSummary] = useState({
    income: 0,
    expenses: 0,
    loans: 0,
    accounts: [],
  });
  const [loanSummary, setLoanSummary] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState({
    income: [],
    expense: [],
  });
  const [searchFilters, setSearchFilters] = useState(null);

  // Loading States (Consolidated)
  const [loading, setLoading] = useState({
    initial: true,
    transactions: false,
  });

  // Error States
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Use Schools Hook
  const { schools } = useSchools();

  // ============================================
  // DATA FETCHING
  // ============================================

  // Fetch Initial Data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading((prev) => ({ ...prev, initial: true }));
    setError(null);

    try {
      const [summaryResponse, loanResponse] = await Promise.all([
        axios.get(`${API_URL}/api/finance-summary/`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/loan-summary/`, { headers: getAuthHeaders() }),
      ]);

      setSummary(summaryResponse.data);
      setLoanSummary(loanResponse.data);
    } catch (err) {
      let errorMessage;
      if (err.response && err.response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.response && err.response.status === 404) {
        errorMessage = 'Data not found. Please check the server or try again.';
      } else {
        errorMessage = 'Failed to fetch data. Please try again later.';
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading((prev) => ({ ...prev, initial: false }));
    }
  };

  // Handle Search from TransactionFilterPanel
  const handleSearch = async (filters) => {
    setLoading((prev) => ({ ...prev, transactions: true }));
    setError(null);

    try {
      const [incomeRes, expenseRes, transferRes] = await Promise.all([
        axios.get(`${API_URL}/api/income/`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/expense/`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/transfers/`, { headers: getAuthHeaders() }),
      ]);

      const incomeTxs = incomeRes.data.results.map((tx) => ({
        ...tx,
        transaction_type: 'Income',
      }));
      const expenseTxs = expenseRes.data.results.map((tx) => ({
        ...tx,
        transaction_type: 'Expense',
      }));
      const transferTxs = transferRes.data.results.map((tx) => ({
        ...tx,
        transaction_type: 'Transfer',
      }));

      const allTransactions = [...incomeTxs, ...expenseTxs, ...transferTxs];
      setTransactions(allTransactions);

      // Extract categories
      setCategories({
        income: [...new Set(incomeTxs.map((tx) => tx.category))],
        expense: [...new Set(expenseTxs.map((tx) => tx.category))],
      });

      // Store search filters
      setSearchFilters(filters);
    } catch (err) {
      const errorMessage = 'Failed to load transactions. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading((prev) => ({ ...prev, transactions: false }));
    }
  };

  // Handle Retry
  const handleRetry = async () => {
    setIsRetrying(true);
    await fetchData();
    setIsRetrying(false);
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================

  // Bar Chart Data for Income vs Expenses
  const barChartData = useMemo(
    () => [
      {
        name: 'Summary',
        income: summary.income,
        expenses: summary.expenses,
      },
    ],
    [summary.income, summary.expenses]
  );

  // Total Account Balance
  const totalBalance = useMemo(
    () => summary.accounts.reduce((acc, account) => acc + account.current_balance, 0),
    [summary.accounts]
  );

  // Custom Tooltip for Chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: 'white',
            padding: '0.75rem',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <p style={{ margin: '0 0 0.25rem 0', color: '#374151', fontWeight: '500' }}>
            Income: PKR {payload[0].value.toLocaleString()}
          </p>
          <p style={{ margin: 0, color: '#374151', fontWeight: '500' }}>
            Expenses: PKR {payload[1].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Title */}
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1E40AF',
          marginBottom: '1.5rem',
          textAlign: 'center',
        }}
      >
        Finance Dashboard
      </h1>

      {/* Error Display */}
      {error && (
        <ErrorDisplay error={error} onRetry={handleRetry} isRetrying={isRetrying} />
      )}

      {/* Loading State for Initial Data */}
      {loading.initial && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <LoadingSpinner size="large" message="Loading dashboard data..." />
        </div>
      )}

      {/* Main Dashboard Content */}
      {!loading.initial && !error && (
        <div>
          {/* Summary Cards */}
          <FinanceSummaryCards summary={summary} loading={loading.initial} />

          {/* Income vs Expenses Chart */}
          <CollapsibleSection title="Income vs Expenses">
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <XAxis dataKey="name" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="income" fill="#34D399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#F87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CollapsibleSection>

          {/* Account Balances Table */}
          <CollapsibleSection title="Account Balances">
            <DataTable
              data={summary.accounts}
              loading={loading.initial}
              columns={[
                {
                  key: 'account_name',
                  label: 'Account Name',
                  sortable: true,
                },
                {
                  key: 'current_balance',
                  label: 'Balance',
                  sortable: true,
                  align: 'right',
                  render: (value) => (
                    <span
                      style={{
                        color: value < 0 ? '#DC2626' : '#059669',
                        fontWeight: '600',
                      }}
                    >
                      PKR {value.toLocaleString()}
                    </span>
                  ),
                },
              ]}
              emptyMessage="No accounts available"
              striped
              hoverable
            />

            {/* Total Balance Summary */}
            {summary.accounts.length > 0 && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: '#DBEAFE',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  color: '#1E40AF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Total Balance:</span>
                <span style={{ fontSize: '1.25rem' }}>
                  PKR {totalBalance.toLocaleString()}
                </span>
              </div>
            )}
          </CollapsibleSection>

          {/* Transaction Explorer */}
          <CollapsibleSection title="Transaction Explorer">
            <TransactionFilterPanel
              schools={schools}
              categories={categories}
              onSearch={handleSearch}
              loading={loading.transactions}
            />

            <PivotTableViewer
              transactions={transactions}
              schools={schools}
              filters={searchFilters}
              loading={loading.transactions}
            />
          </CollapsibleSection>

          {/* Loan Summary Table */}
          <CollapsibleSection title="Loan Summary">
            <DataTable
              data={loanSummary}
              loading={loading.initial}
              columns={[
                {
                  key: 'person',
                  label: 'Person',
                  sortable: true,
                },
                {
                  key: 'total_received',
                  label: 'Total Received',
                  sortable: true,
                  align: 'right',
                  render: (value) => `PKR ${(value || 0).toLocaleString()}`,
                },
                {
                  key: 'total_paid',
                  label: 'Total Repaid',
                  sortable: true,
                  align: 'right',
                  render: (value) => `PKR ${(value || 0).toLocaleString()}`,
                },
                {
                  key: 'balance_outstanding',
                  label: 'Balance Outstanding',
                  sortable: true,
                  align: 'right',
                  render: (value) => `PKR ${(value || 0).toLocaleString()}`,
                },
              ]}
              emptyMessage="No loans to display"
              striped
              hoverable
            />
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}

export default FinanceDashboard;