// ============================================
// MONTHLY TRENDS CHART COMPONENT - Glassmorphism Design
// ============================================
// Location: src/components/finance/MonthlyTrendsChart.js

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { financeDashboardService } from '../../services/financeDashboardService';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { Button } from '../common/ui/Button';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';

export const MonthlyTrendsChart = ({ schools, isVisible = true }) => {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('6months');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [customDates, setCustomDates] = useState({
    start: '',
    end: '',
  });
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Only fetch data when component becomes visible (lazy loading)
  useEffect(() => {
    if (isVisible && !hasLoadedOnce) {
      fetchData();
      setHasLoadedOnce(true);
    }
  }, [isVisible, hasLoadedOnce]);

  // Refetch when filters change (only if already loaded once)
  useEffect(() => {
    if (hasLoadedOnce) {
      fetchData();
    }
  }, [period, selectedSchool]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let startDate = null;
      let endDate = null;

      if (period === 'custom') {
        if (!customDates.start || !customDates.end) {
          toast.error('Please select both start and end dates');
          setLoading(false);
          return;
        }
        startDate = customDates.start;
        endDate = customDates.end;
      }

      const response = await financeDashboardService.getMonthlyTrends(
        period,
        startDate,
        endDate,
        selectedSchool || null
      );

      setData(response.data.data);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching monthly trends:', error);
      toast.error('Failed to load monthly trends');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodClick = (newPeriod) => {
    if (newPeriod === 'custom') {
      setShowCustomModal(true);
    } else {
      setPeriod(newPeriod);
    }
  };

  const handleCustomDateApply = () => {
    setPeriod('custom');
    setShowCustomModal(false);
    fetchData();
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={styles.tooltip}>
          <p style={styles.tooltipTitle}>
            {payload[0].payload.month_label}
          </p>
          <p style={styles.tooltipIncome}>
            Income: PKR {payload[0].value.toLocaleString()}
          </p>
          <p style={styles.tooltipExpense}>
            Expenses: PKR {payload[1].value.toLocaleString()}
          </p>
          <p style={styles.tooltipNet}>
            Net: PKR {payload[2].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* Controls */}
      <div style={styles.controlsContainer}>
        {/* Period Buttons */}
        <div style={styles.buttonGroup}>
          <Button
            onClick={() => handlePeriodClick('3months')}
            variant={period === '3months' ? 'primary' : 'secondary'}
            size="small"
          >
            3 Months
          </Button>
          <Button
            onClick={() => handlePeriodClick('6months')}
            variant={period === '6months' ? 'primary' : 'secondary'}
            size="small"
          >
            6 Months
          </Button>
          <Button
            onClick={() => handlePeriodClick('custom')}
            variant={period === 'custom' ? 'primary' : 'secondary'}
            size="small"
          >
            Custom Range
          </Button>
        </div>

        {/* School Filter */}
        {schools && schools.length > 0 && (
          <div style={styles.selectContainer}>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              style={styles.select}
            >
              <option value="">All Schools</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {summary && (
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCardGreen}>
            <p style={styles.summaryLabelGreen}>AVG MONTHLY INCOME</p>
            <p style={styles.summaryValueGreen}>
              PKR {summary.avg_monthly_income.toLocaleString()}
            </p>
          </div>

          <div style={styles.summaryCardRed}>
            <p style={styles.summaryLabelRed}>AVG MONTHLY EXPENSE</p>
            <p style={styles.summaryValueRed}>
              PKR {summary.avg_monthly_expense.toLocaleString()}
            </p>
          </div>

          <div style={styles.summaryCardBlue}>
            <p style={styles.summaryLabelBlue}>TOTAL NET</p>
            <p style={styles.summaryValueBlue}>
              PKR {summary.total_net.toLocaleString()}
            </p>
          </div>

          {summary.best_month && (
            <div style={styles.summaryCardPurple}>
              <p style={styles.summaryLabelPurple}>BEST MONTH</p>
              <p style={styles.summaryValuePurple}>
                {summary.best_month.label}
              </p>
              <p style={styles.summarySubPurple}>
                PKR {summary.best_month.net.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <LoadingSpinner message="Loading trends..." />
        </div>
      ) : data.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No data available for selected period</p>
        </div>
      ) : (
        <div style={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="month_label" stroke={COLORS.text.whiteSubtle} tick={{ fontSize: 12 }} />
              <YAxis stroke={COLORS.text.whiteSubtle} tick={{ fontSize: 12 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '1rem' }}
                formatter={(value) => <span style={{ color: COLORS.text.whiteMedium }}>{value}</span>}
              />
              <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Income" />
              <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Expenses" />
              <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={3} name="Net" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Custom Date Modal */}
      {showCustomModal && (
        <div onClick={() => setShowCustomModal(false)} style={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Select Custom Date Range</h3>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Start Date</label>
              <input
                type="date"
                value={customDates.start}
                onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                style={styles.formInput}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>End Date</label>
              <input
                type="date"
                value={customDates.end}
                onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                style={styles.formInput}
              />
            </div>

            <div style={styles.modalButtons}>
              <Button onClick={() => setShowCustomModal(false)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleCustomDateApply} variant="primary">
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// STYLES - Glassmorphism Design
// ============================================
const styles = {
  controlsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  buttonGroup: {
    display: 'flex',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  selectContainer: {
    minWidth: '200px',
  },
  select: {
    width: '100%',
    padding: SPACING.sm,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    outline: 'none',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  summaryCardGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(16, 185, 129, 0.3)',
    backdropFilter: 'blur(8px)',
  },
  summaryLabelGreen: {
    fontSize: FONT_SIZES.xs,
    color: '#34D399',
    margin: `0 0 ${SPACING.xs} 0`,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  summaryValueGreen: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#10B981',
    margin: 0,
  },
  summaryCardRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(239, 68, 68, 0.3)',
    backdropFilter: 'blur(8px)',
  },
  summaryLabelRed: {
    fontSize: FONT_SIZES.xs,
    color: '#F87171',
    margin: `0 0 ${SPACING.xs} 0`,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  summaryValueRed: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#EF4444',
    margin: 0,
  },
  summaryCardBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(59, 130, 246, 0.3)',
    backdropFilter: 'blur(8px)',
  },
  summaryLabelBlue: {
    fontSize: FONT_SIZES.xs,
    color: '#60A5FA',
    margin: `0 0 ${SPACING.xs} 0`,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  summaryValueBlue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#3B82F6',
    margin: 0,
  },
  summaryCardPurple: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(139, 92, 246, 0.3)',
    backdropFilter: 'blur(8px)',
  },
  summaryLabelPurple: {
    fontSize: FONT_SIZES.xs,
    color: '#A78BFA',
    margin: `0 0 ${SPACING.xs} 0`,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  summaryValuePurple: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#8B5CF6',
    margin: 0,
  },
  summarySubPurple: {
    fontSize: FONT_SIZES.sm,
    color: '#A78BFA',
    margin: 0,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: `${SPACING['3xl']} 0`,
  },
  emptyState: {
    padding: SPACING['3xl'],
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  emptyText: {
    color: COLORS.text.whiteSubtle,
    margin: 0,
    fontSize: FONT_SIZES.base,
  },
  chartContainer: {
    height: '400px',
  },
  tooltip: {
    ...MIXINS.glassmorphicCard,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  tooltipTitle: {
    margin: `0 0 ${SPACING.sm} 0`,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  tooltipIncome: {
    margin: `0 0 ${SPACING.xs} 0`,
    color: '#10B981',
    fontWeight: FONT_WEIGHTS.medium,
  },
  tooltipExpense: {
    margin: `0 0 ${SPACING.xs} 0`,
    color: '#EF4444',
    fontWeight: FONT_WEIGHTS.medium,
  },
  tooltipNet: {
    margin: 0,
    color: '#3B82F6',
    fontWeight: FONT_WEIGHTS.semibold,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING['2xl'],
    maxWidth: '400px',
    width: '90%',
  },
  modalTitle: {
    margin: `0 0 ${SPACING.xl} 0`,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  formLabel: {
    display: 'block',
    marginBottom: SPACING.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
  },
  formInput: {
    width: '100%',
    padding: SPACING.md,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    outline: 'none',
  },
  modalButtons: {
    display: 'flex',
    gap: SPACING.sm,
    justifyContent: 'flex-end',
    marginTop: SPACING.xl,
  },
};
