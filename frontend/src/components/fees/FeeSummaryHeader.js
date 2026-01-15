/**
 * FeeSummaryHeader Component
 * Path: frontend/src/components/fees/FeeSummaryHeader.js
 * Glassmorphism Design System
 */

import React from 'react';
import { format } from 'date-fns';

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../../hooks/useResponsive';

const formatCurrency = (value) => {
  const num = parseFloat(value || 0);
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const FeeSummaryHeader = ({
  schoolName,
  studentClass,
  month,
  totals,
}) => {
  const { isMobile } = useResponsive();

  const monthDisplay = month ? format(month, 'MMM yyyy') : 'N/A';
  const classDisplay = studentClass || 'All Classes';

  const collectionRate = totals.total_fee > 0
    ? ((totals.paid_amount / totals.total_fee) * 100).toFixed(1)
    : 0;

  const styles = {
    container: {
      ...MIXINS.glassmorphicCard,
      padding: isMobile ? SPACING.md : SPACING.lg,
      borderRadius: BORDER_RADIUS.xl,
      marginBottom: SPACING.lg,
    },
    infoBar: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: SPACING.md,
      marginBottom: SPACING.lg,
    },
    infoItem: {
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    icon: {
      width: '20px',
      height: '20px',
    },
    schoolName: {
      fontWeight: FONT_WEIGHTS.semibold,
      color: COLORS.text.white,
      fontSize: FONT_SIZES.base,
    },
    infoText: {
      color: COLORS.text.whiteMedium,
      fontSize: FONT_SIZES.sm,
    },
    divider: {
      color: 'rgba(255, 255, 255, 0.3)',
      display: isMobile ? 'none' : 'inline',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
      gap: SPACING.md,
    },
    statCard: {
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md,
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    statCardBlue: {
      background: 'rgba(59, 130, 246, 0.15)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
    },
    statCardGreen: {
      background: 'rgba(16, 185, 129, 0.15)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
    },
    statCardRed: {
      background: 'rgba(239, 68, 68, 0.15)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    },
    statLabel: {
      fontSize: FONT_SIZES.xs,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: SPACING.xs,
    },
    statLabelBlue: {
      color: '#93C5FD',
    },
    statLabelGreen: {
      color: '#6EE7B7',
    },
    statLabelRed: {
      color: '#FCA5A5',
    },
    statLabelDefault: {
      color: COLORS.text.whiteMedium,
    },
    statValue: {
      fontSize: isMobile ? FONT_SIZES.lg : FONT_SIZES.xl,
      fontWeight: FONT_WEIGHTS.bold,
      color: COLORS.text.white,
      marginBottom: SPACING.xs,
    },
    statSubtext: {
      fontSize: FONT_SIZES.xs,
    },
    statSubtextBlue: {
      color: '#93C5FD',
    },
    statSubtextGreen: {
      color: '#6EE7B7',
    },
    statSubtextRed: {
      color: '#FCA5A5',
    },
    progressContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    progressBar: {
      flex: 1,
      background: 'rgba(255, 255, 255, 0.2)',
      borderRadius: BORDER_RADIUS.full,
      height: '12px',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: BORDER_RADIUS.full,
      transition: `all ${TRANSITIONS.slow}`,
    },
    progressText: {
      fontSize: FONT_SIZES.lg,
      fontWeight: FONT_WEIGHTS.bold,
      color: COLORS.text.white,
    },
  };

  const getProgressColor = () => {
    if (parseFloat(collectionRate) >= 80) return COLORS.status.success;
    if (parseFloat(collectionRate) >= 50) return COLORS.status.warning;
    return COLORS.status.error;
  };

  return (
    <div style={styles.container}>
      {/* Info Bar */}
      <div style={styles.infoBar}>
        <div style={styles.infoItem}>
          <svg style={{ ...styles.icon, color: '#60A5FA' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span style={styles.schoolName}>{schoolName}</span>
        </div>

        <span style={styles.divider}>|</span>

        <div style={styles.infoItem}>
          <svg style={{ ...styles.icon, color: '#34D399' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span style={styles.infoText}>{classDisplay}</span>
        </div>

        <span style={styles.divider}>|</span>

        <div style={styles.infoItem}>
          <svg style={{ ...styles.icon, color: '#A78BFA' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span style={styles.infoText}>{monthDisplay}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        {/* Total Fee */}
        <div style={{ ...styles.statCard, ...styles.statCardBlue }}>
          <p style={{ ...styles.statLabel, ...styles.statLabelBlue }}>Total Fee</p>
          <p style={styles.statValue}>PKR {formatCurrency(totals.total_fee)}</p>
          <p style={{ ...styles.statSubtext, ...styles.statSubtextBlue }}>{totals.count} records</p>
        </div>

        {/* Collected */}
        <div style={{ ...styles.statCard, ...styles.statCardGreen }}>
          <p style={{ ...styles.statLabel, ...styles.statLabelGreen }}>Collected</p>
          <p style={styles.statValue}>PKR {formatCurrency(totals.paid_amount)}</p>
          <p style={{ ...styles.statSubtext, ...styles.statSubtextGreen }}>{collectionRate}% collected</p>
        </div>

        {/* Outstanding */}
        <div style={{ ...styles.statCard, ...styles.statCardRed }}>
          <p style={{ ...styles.statLabel, ...styles.statLabelRed }}>Outstanding</p>
          <p style={styles.statValue}>PKR {formatCurrency(totals.balance_due)}</p>
          <p style={{ ...styles.statSubtext, ...styles.statSubtextRed }}>{(100 - collectionRate).toFixed(1)}% pending</p>
        </div>

        {/* Collection Rate */}
        <div style={styles.statCard}>
          <p style={{ ...styles.statLabel, ...styles.statLabelDefault }}>Collection Rate</p>
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${Math.min(collectionRate, 100)}%`,
                  background: getProgressColor(),
                }}
              />
            </div>
            <span style={styles.progressText}>{collectionRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeSummaryHeader;