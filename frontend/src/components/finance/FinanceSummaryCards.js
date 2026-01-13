// ============================================
// FINANCE SUMMARY CARDS COMPONENT
// ============================================

import React from 'react';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
} from '../../utils/designConstants';

const SummaryCard = ({ title, value, color }) => {
  const colorStyles = {
    green: {
      background: COLORS.status.successLight,
      titleColor: COLORS.status.successDark,
      valueColor: COLORS.status.successDark,
    },
    red: {
      background: COLORS.status.errorLight,
      titleColor: COLORS.status.errorDarker,
      valueColor: COLORS.status.errorDark,
    },
    blue: {
      background: COLORS.status.infoLight,
      titleColor: COLORS.status.infoDarker,
      valueColor: COLORS.status.infoDark,
    },
  };

  const style = colorStyles[color] || colorStyles.blue;

  const cardStyle = {
    backgroundColor: style.background,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.sm,
    boxShadow: SHADOWS.sm,
  };

  const titleStyle = {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: style.titleColor,
    margin: `0 0 ${SPACING.xs} 0`,
  };

  const valueStyle = {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: style.valueColor,
    margin: 0,
  };

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>{title}</h3>
      <p style={valueStyle}>PKR {value.toLocaleString()}</p>
    </div>
  );
};

export const FinanceSummaryCards = ({ summary, loading }) => {
  if (loading) {
    return <LoadingSpinner size="medium" message="Loading summary..." />;
  }

  const netBalance = summary.income - summary.expenses;

  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  };

  return (
    <div style={containerStyle}>
      <SummaryCard
        title="Total Income"
        value={summary.income}
        color="green"
      />
      <SummaryCard
        title="Total Expenses"
        value={summary.expenses}
        color="red"
      />
      <SummaryCard
        title="Net Balance"
        value={netBalance}
        color={netBalance >= 0 ? 'blue' : 'red'}
      />
    </div>
  );
};