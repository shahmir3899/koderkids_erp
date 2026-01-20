// ============================================
// FINANCE DASHBOARD - Complete Enhanced Version
// ============================================
// Location: src/pages/FinanceDashboard.js

import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Design System
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
  LAYOUT,
} from '../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../hooks/useResponsive';

// Common Components
import { CollapsibleSection } from '../components/common/cards/CollapsibleSection';
import { DataTable } from '../components/common/tables/DataTable';
import { ErrorDisplay } from '../components/common/ui/ErrorDisplay';
import { useSchools } from '../hooks/useSchools';
import { IncomeCategoriesPie } from '../components/finance/IncomeCategoriesPie';
import { PageHeader } from '../components/common/PageHeader';

// Finance Components - Existing
import { FinanceSummaryCards } from '../components/finance/FinanceSummaryCards';

// NEW Dashboard Components
import { MonthlyTrendsChart } from '../components/finance/MonthlyTrendsChart';
import { CashFlowChart } from '../components/finance/CashFlowChart';
import { AccountBalanceSelector } from '../components/finance/AccountBalanceSelector';
import { ExpenseCategoriesPie } from '../components/finance/ExpenseCategoriesPie';


// Styles - responsive helper function
const getStyles = (isMobile) => ({
  pageContainer: {
    minHeight: '100vh',
    background: COLORS.background.gradient,
    padding: isMobile ? SPACING.md : SPACING.xl,
    transition: `padding ${TRANSITIONS.normal}`,
  },
  contentWrapper: {
    maxWidth: LAYOUT.maxWidth.md,
    margin: '0 auto',
  },
  pageTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  errorWrapper: {
    marginBottom: SPACING['2xl'],
  },
  chartContainer: {
    height: '320px',
  },
  accountTypeBadge: (type) => ({
    padding: `${SPACING.xs} ${SPACING.md}`,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    backgroundColor: type === 'Bank'
      ? 'rgba(59, 130, 246, 0.2)'
      : type === 'Cash'
        ? 'rgba(16, 185, 129, 0.2)'
        : 'rgba(255, 255, 255, 0.1)',
    color: type === 'Bank'
      ? '#60A5FA'
      : type === 'Cash'
        ? '#34D399'
        : COLORS.text.whiteMedium,
  }),
  balanceValue: (value) => ({
    color: value < 0 ? COLORS.status.error : COLORS.status.success,
    fontWeight: FONT_WEIGHTS.semibold,
  }),
  totalBalanceCard: {
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeft: `4px solid ${COLORS.accent.purple}`,
  },
  totalBalanceAmount: {
    fontSize: FONT_SIZES.lg,
  },
  loanBalance: (value) => ({
    color: value > 0 ? COLORS.status.error : COLORS.status.success,
    fontWeight: FONT_WEIGHTS.semibold,
  }),
  infoBanner: {
    marginTop: SPACING['2xl'],
    padding: SPACING.lg,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
    borderLeft: `4px solid ${COLORS.accent.purple}`,
  },
  infoBannerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
    margin: 0,
    textAlign: 'center',
  },
  tooltipContainer: {
    ...MIXINS.glassmorphicCard,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  tooltipText: {
    margin: 0,
    color: COLORS.text.white,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  tooltipTextSecond: {
    margin: 0,
    color: COLORS.text.white,
    fontWeight: FONT_WEIGHTS.medium,
  },
});

function FinanceDashboard() {
  // ============================================
  // RESPONSIVE HOOK
  // ============================================
  const { isMobile } = useResponsive();

  // Get responsive styles
  const styles = getStyles(isMobile);

  // ============================================
  // FINANCE DATA FROM CONTEXT (CACHED!)
  // ============================================
  const { summary, loanSummary, error, refetch } = useFinance();

  // ============================================
  // LOCAL STATE MANAGEMENT
  // ============================================

  // Retry state for error handling
  const [isRetrying, setIsRetrying] = useState(false);

  // Lazy Loading States - Track which sections have been opened
  const [sectionVisibility, setSectionVisibility] = useState({
    monthlyTrends: true, // Default open
    cashFlow: true, // Default open
    accountBalance: true, // Default open
    incomeCategories: false, // Collapsed by default
    expenseCategories: true, // Default open
    accountBalances: false, // Collapsed by default
    loanSummary: false, // Collapsed by default
  });

  // Handler for section toggle - marks section as viewed
  const handleSectionToggle = (sectionName) => (isOpen) => {
    if (isOpen) {
      setSectionVisibility(prev => ({
        ...prev,
        [sectionName]: true
      }));
    }
  };

  // Use Schools Hook
  const { schools } = useSchools();

  // Handle Retry - uses refetch from context
  const handleRetry = async () => {
    setIsRetrying(true);
    await refetch();
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
        <div style={styles.tooltipContainer}>
          <p style={styles.tooltipText}>
            Income: PKR {payload[0].value.toLocaleString()}
          </p>
          <p style={styles.tooltipTextSecond}>
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
    <div style={styles.pageContainer}>
      <div style={styles.contentWrapper}>
        {/* Page Header */}
        <PageHeader
          icon="📊"
          title="Finance Dashboard"
          subtitle="Track income, expenses, and financial trends"
        />

        {/* Error Display */}
        {error && (
          <div style={styles.errorWrapper}>
            <ErrorDisplay error={error} onRetry={handleRetry} isRetrying={isRetrying} />
          </div>
        )}

        {/* Main Dashboard Content */}
        {!error && (
          <div>
            {/* ============================================ */}
            {/* SUMMARY CARDS */}
            {/* ============================================ */}
            <FinanceSummaryCards summary={summary} loading={false} />
            {/* ============================================ */}
            {/* EXISTING: SIMPLE INCOME VS EXPENSES BAR CHART */}
            {/* ============================================ */}
            <CollapsibleSection title="Quick Summary - Income vs Expenses" defaultOpen={false}>
              <div style={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <XAxis dataKey="name" stroke={COLORS.text.whiteMedium} />
                    <YAxis stroke={COLORS.text.whiteMedium} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ color: COLORS.text.white }}
                      formatter={(value) => <span style={{ color: COLORS.text.whiteMedium }}>{value}</span>}
                    />
                    <Bar dataKey="income" fill="#34D399" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#F87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CollapsibleSection>
            {/* ============================================ */}
            {/* NEW: MONTHLY TRENDS CHART - Lazy Loaded */}
            {/* ============================================ */}
            <CollapsibleSection
              title="Monthly Trends - Income vs Expenses"
              defaultOpen
              onToggle={handleSectionToggle('monthlyTrends')}
            >
              <MonthlyTrendsChart schools={schools} isVisible={sectionVisibility.monthlyTrends} />
            </CollapsibleSection>

            {/* ============================================ */}
            {/* NEW: CASH FLOW ANALYSIS - Lazy Loaded */}
            {/* ============================================ */}
            <CollapsibleSection
              title="Cash Flow Analysis"
              defaultOpen
              onToggle={handleSectionToggle('cashFlow')}
            >
              <CashFlowChart schools={schools} isVisible={sectionVisibility.cashFlow} />
            </CollapsibleSection>

            {/* ============================================ */}
            {/* NEW: ACCOUNT BALANCE HISTORY */}
            {/* ============================================ */}
            <CollapsibleSection title="Account Balance History" defaultOpen>
              <AccountBalanceSelector accounts={summary.accounts} />
            </CollapsibleSection>
            {/* NEW: INCOME CATEGORIES ANALYSIS */}
          <CollapsibleSection title="Income Categories Analysis" defaultOpen={false}>
            <IncomeCategoriesPie schools={schools} />  {/* Pass schools from useSchools hook */}
          </CollapsibleSection>
            {/* ============================================ */}
            {/* NEW: EXPENSE CATEGORIES BREAKDOWN */}
            {/* ============================================ */}
            <CollapsibleSection title="Expense Categories Analysis" defaultOpen>
              <ExpenseCategoriesPie schools={schools} />
            </CollapsibleSection>



            {/* ============================================ */}
            {/* EXISTING: ACCOUNT BALANCES TABLE */}
            {/* ============================================ */}
            <CollapsibleSection title="Account Balances" defaultOpen={false}>
              <DataTable
                data={summary.accounts}
                loading={false}
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
                      <span style={styles.accountTypeBadge(value)}>
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
                      <span style={styles.balanceValue(value)}>
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
                <div style={styles.totalBalanceCard}>
                  <span>Total Balance:</span>
                  <span style={styles.totalBalanceAmount}>
                    PKR {totalBalance.toLocaleString()}
                  </span>
                </div>
              )}
            </CollapsibleSection>

            {/* ============================================ */}
            {/* EXISTING: LOAN SUMMARY TABLE */}
            {/* ============================================ */}
            <CollapsibleSection title="Loan Summary" defaultOpen={false}>
              <DataTable
                data={loanSummary}
                loading={false}
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
                      <span style={styles.loanBalance(value)}>
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
            <div style={styles.infoBanner}>
              <p style={styles.infoBannerText}>
                <strong>Tip:</strong> Use the filters in each section to analyze specific schools or time periods.
                All charts update automatically when you change filters!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FinanceDashboard;
