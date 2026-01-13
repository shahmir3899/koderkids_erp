// ============================================
// FINANCIAL SUMMARY CARD - Reusable Component
// ============================================
// Location: frontend/src/components/finance/FinancialSummaryCard.js

import React from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
} from '../../utils/designConstants';

/**
 * FinancialSummaryCard Component
 * Displays financial summary metrics in a grid layout
 *
 * @param {Object} props
 * @param {number} props.totalFee - Total fee amount
 * @param {number} props.paidAmount - Paid amount
 * @param {number} props.balanceDue - Balance due amount
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.compact - Use compact layout
 */
export const FinancialSummaryCard = ({
  totalFee = 0,
  paidAmount = 0,
  balanceDue = 0,
  loading = false,
  compact = false,
}) => {
  const formatCurrency = (amount) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingText}>Loading financial summary...</div>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Total Fee',
      value: totalFee,
      color: COLORS.text.primary,
      bgColor: 'rgba(59, 130, 246, 0.08)',
      borderColor: 'rgba(59, 130, 246, 0.2)',
    },
    {
      label: 'Paid Amount',
      value: paidAmount,
      color: COLORS.status.success,
      bgColor: 'rgba(16, 185, 129, 0.08)',
      borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    {
      label: 'Balance Due',
      value: balanceDue,
      color: balanceDue > 0 ? COLORS.status.error : COLORS.status.success,
      bgColor: balanceDue > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
      borderColor: balanceDue > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
    },
  ];

  return (
    <div style={{
      ...styles.container,
      ...(compact && styles.containerCompact),
    }}>
      <div style={styles.grid}>
        {metrics.map((metric, index) => (
          <div
            key={index}
            style={{
              ...styles.card,
              backgroundColor: metric.bgColor,
              borderColor: metric.borderColor,
            }}
          >
            <div style={styles.label}>{metric.label}</div>
            <div
              style={{
                ...styles.value,
                color: metric.color,
              }}
            >
              {formatCurrency(metric.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  containerCompact: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: SPACING.lg,
  },
  card: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    border: '1px solid',
    boxShadow: SHADOWS.sm,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'default',
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    fontFamily: 'Inter, sans-serif',
  },
  value: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 1.2,
    fontFamily: 'Inter, sans-serif',
  },
  loadingText: {
    textAlign: 'center',
    padding: SPACING.xl,
    color: COLORS.text.secondary,
    fontSize: FONT_SIZES.base,
    fontFamily: 'Inter, sans-serif',
  },
};

export default FinancialSummaryCard;
