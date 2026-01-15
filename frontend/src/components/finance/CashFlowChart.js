// ============================================
// CASH FLOW CHART COMPONENT - Glassmorphism Design
// ============================================
// Location: src/components/finance/CashFlowChart.js

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { financeDashboardService } from '../../services/financeDashboardService';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';

export const CashFlowChart = ({ schools, isVisible = true }) => {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [months, setMonths] = useState(6);
  const [selectedSchool, setSelectedSchool] = useState('');
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
  }, [months, selectedSchool]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await financeDashboardService.getCashFlow(
        months,
        selectedSchool || null
      );

      setData(response.data.data);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching cash flow:', error);
      toast.error('Failed to load cash flow data');
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={styles.tooltip}>
          <p style={styles.tooltipTitle}>{data.month_label}</p>
          <p style={styles.tooltipLine}>
            Opening: PKR {data.opening_balance.toLocaleString()}
          </p>
          <p style={styles.tooltipInflow}>
            Inflow: +PKR {data.inflow.toLocaleString()}
          </p>
          <p style={styles.tooltipOutflow}>
            Outflow: -PKR {data.outflow.toLocaleString()}
          </p>
          <p style={styles.tooltipNet}>
            Net Flow: PKR {data.net_flow.toLocaleString()}
          </p>
          <p style={styles.tooltipClosing}>
            Closing: PKR {data.closing_balance.toLocaleString()}
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
        {/* Months Selector */}
        <div style={styles.monthsSelector}>
          <label style={styles.monthsLabel}>Months:</label>
          <select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value))}
            style={styles.select}
          >
            <option value={3}>3 Months</option>
            <option value={6}>6 Months</option>
            <option value={12}>12 Months</option>
          </select>
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
            <p style={styles.summaryLabelGreen}>TOTAL INFLOW</p>
            <p style={styles.summaryValueGreen}>
              PKR {summary.total_inflow.toLocaleString()}
            </p>
          </div>

          <div style={styles.summaryCardRed}>
            <p style={styles.summaryLabelRed}>TOTAL OUTFLOW</p>
            <p style={styles.summaryValueRed}>
              PKR {summary.total_outflow.toLocaleString()}
            </p>
          </div>

          <div style={styles.summaryCardBlue}>
            <p style={styles.summaryLabelBlue}>NET CASH FLOW</p>
            <p style={styles.summaryValueBlue}>
              PKR {summary.net_cash_flow.toLocaleString()}
            </p>
          </div>

          <div style={styles.summaryCardPurple}>
            <p style={styles.summaryLabelPurple}>BURN RATE</p>
            <p style={styles.summaryValuePurple}>
              PKR {summary.burn_rate.toLocaleString()}/mo
            </p>
          </div>

          <div style={styles.summaryCardYellow}>
            <p style={styles.summaryLabelYellow}>CASH POSITION</p>
            <p style={styles.summaryValueYellow}>
              PKR {summary.current_cash_position.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <LoadingSpinner message="Loading cash flow..." />
        </div>
      ) : data.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No cash flow data available</p>
        </div>
      ) : (
        <div style={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorClosing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="month_label" stroke={COLORS.text.whiteSubtle} tick={{ fontSize: 12 }} />
              <YAxis stroke={COLORS.text.whiteSubtle} tick={{ fontSize: 12 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '1rem' }}
                formatter={(value) => <span style={{ color: COLORS.text.whiteMedium }}>{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="closing_balance"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#colorClosing)"
                name="Closing Balance"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Info */}
      {data.length > 0 && (
        <div style={styles.infoBanner}>
          <p style={styles.infoText}>
            <strong>Cash Position:</strong> Shows cumulative balance over time. Closing balance each month becomes opening balance for next month.
          </p>
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
  monthsSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
  },
  monthsLabel: {
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
  },
  selectContainer: {
    minWidth: '200px',
  },
  select: {
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
    fontSize: FONT_SIZES.lg,
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
    fontSize: FONT_SIZES.lg,
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
    fontSize: FONT_SIZES.lg,
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
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#8B5CF6',
    margin: 0,
  },
  summaryCardYellow: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(251, 191, 36, 0.3)',
    backdropFilter: 'blur(8px)',
  },
  summaryLabelYellow: {
    fontSize: FONT_SIZES.xs,
    color: '#FCD34D',
    margin: `0 0 ${SPACING.xs} 0`,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  summaryValueYellow: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#F59E0B',
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
  tooltipLine: {
    margin: `0 0 ${SPACING.xs} 0`,
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },
  tooltipInflow: {
    margin: `0 0 ${SPACING.xs} 0`,
    color: '#10B981',
    fontSize: FONT_SIZES.sm,
  },
  tooltipOutflow: {
    margin: `0 0 ${SPACING.xs} 0`,
    color: '#EF4444',
    fontSize: FONT_SIZES.sm,
  },
  tooltipNet: {
    margin: `0 0 ${SPACING.xs} 0`,
    color: '#3B82F6',
    fontWeight: FONT_WEIGHTS.semibold,
  },
  tooltipClosing: {
    margin: 0,
    color: COLORS.text.white,
    fontWeight: FONT_WEIGHTS.semibold,
    paddingTop: SPACING.xs,
    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
  },
  infoBanner: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: '#93C5FD',
    margin: 0,
  },
};
