// ============================================
// FINANCE DASHBOARD - Complete Enhanced Version
// ============================================
// Location: src/pages/FinanceDashboard.js

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
import { IncomeCategoriesPie } from '../components/finance/IncomeCategoriesPie';

// Finance Components - Existing
import { FinanceSummaryCards } from '../components/finance/FinanceSummaryCards';

// NEW Dashboard Components
import { MonthlyTrendsChart } from '../components/finance/MonthlyTrendsChart';
import { CashFlowChart } from '../components/finance/CashFlowChart';
import { AccountBalanceSelector } from '../components/finance/AccountBalanceSelector';
import { ExpenseCategoriesPie } from '../components/finance/ExpenseCategoriesPie';

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

  // Loading States (Consolidated)
  const [loading, setLoading] = useState({
    initial: true,
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
        💰 Finance Dashboard
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
          {/* ============================================ */}
          {/* SUMMARY CARDS */}
          {/* ============================================ */}
          <FinanceSummaryCards summary={summary} loading={loading.initial} />
          {/* ============================================ */}
          {/* EXISTING: SIMPLE INCOME VS EXPENSES BAR CHART */}
          {/* ============================================ */}
          <CollapsibleSection title="📊 Quick Summary - Income vs Expenses" defaultOpen={false}>
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
          {/* ============================================ */}
          {/* NEW: MONTHLY TRENDS CHART */}
          {/* ============================================ */}
          <CollapsibleSection title="📊 Monthly Trends - Income vs Expenses" defaultOpen>
            <MonthlyTrendsChart schools={schools} />
          </CollapsibleSection>
          
          {/* ============================================ */}
          {/* NEW: CASH FLOW ANALYSIS */}
          {/* ============================================ */}
          <CollapsibleSection title="💰 Cash Flow Analysis" defaultOpen>
            <CashFlowChart schools={schools} />
          </CollapsibleSection>

          {/* ============================================ */}
          {/* NEW: ACCOUNT BALANCE HISTORY */}
          {/* ============================================ */}
          <CollapsibleSection title="📈 Account Balance History" defaultOpen>
            <AccountBalanceSelector accounts={summary.accounts} />
          </CollapsibleSection>
          {/* NEW: INCOME CATEGORIES ANALYSIS */}
        <CollapsibleSection title="📈 Income Categories Analysis" defaultOpen={false}>
          <IncomeCategoriesPie schools={schools} />  {/* Pass schools from useSchools hook */}
        </CollapsibleSection>
          {/* ============================================ */}
          {/* NEW: EXPENSE CATEGORIES BREAKDOWN */}
          {/* ============================================ */}
          <CollapsibleSection title="🎯 Expense Categories Analysis" defaultOpen>
            <ExpenseCategoriesPie schools={schools} />
          </CollapsibleSection>

          

          {/* ============================================ */}
          {/* EXISTING: ACCOUNT BALANCES TABLE */}
          {/* ============================================ */}
          <CollapsibleSection title="💳 Account Balances" defaultOpen={false}>
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
                  key: 'account_type',
                  label: 'Type',
                  sortable: true,
                  render: (value) => (
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        backgroundColor: 
                          value === 'Bank' ? '#DBEAFE' : 
                          value === 'Cash' ? '#D1FAE5' : 
                          '#F3F4F6',
                        color: 
                          value === 'Bank' ? '#1E40AF' : 
                          value === 'Cash' ? '#059669' : 
                          '#374151',
                      }}
                    >
                      {value}
                    </span>
                  ),
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

          {/* ============================================ */}
          {/* EXISTING: LOAN SUMMARY TABLE */}
          {/* ============================================ */}
          <CollapsibleSection title="💳 Loan Summary" defaultOpen={false}>
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
                  render: (value) => (
                    <span style={{ color: value > 0 ? '#DC2626' : '#059669', fontWeight: '600' }}>
                      PKR {(value || 0).toLocaleString()}
                    </span>
                  ),
                },
              ]}
              emptyMessage="No loans to display"
              striped
              hoverable
            />
          </CollapsibleSection>

          {/* ============================================ */}
          {/* INFO BANNER */}
          {/* ============================================ */}
          <div
            style={{
              marginTop: '2rem',
              padding: '1rem',
              backgroundColor: '#EFF6FF',
              borderRadius: '8px',
              border: '1px solid #BFDBFE',
            }}
          >
            <p style={{ fontSize: '0.875rem', color: '#1E40AF', margin: 0, textAlign: 'center' }}>
              💡 <strong>Tip:</strong> Use the filters in each section to analyze specific schools or time periods. 
              All charts update automatically when you change filters!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinanceDashboard;