// ============================================
// USER STATS CARDS - Glassmorphism Design System
// ============================================

import React from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';

/**
 * UserStatsCards Component
 * Displays user statistics in glassmorphic card format
 *
 * @param {Object} props
 * @param {Object} props.stats - Statistics object from API
 * @param {number} props.filteredCount - Number of filtered users (optional)
 * @param {boolean} props.hasSearched - Whether search has been performed
 * @param {boolean} props.isLoading - Loading state
 * @param {number} props.totalSalaries - Total salaries of filtered users
 */
export const UserStatsCards = ({
  stats,
  filteredCount,
  hasSearched = false,
  isLoading = false,
  totalSalaries = 0,
}) => {

  // Format salary for display
  const formatSalary = (amount) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toLocaleString();
  };
  // If loading, show skeleton
  if (isLoading) {
    return (
      <div style={styles.container}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ ...styles.card, opacity: 0.6 }}>
            <div style={styles.cardContent}>
              <div style={styles.label}>Loading...</div>
              <div style={styles.value}>-</div>
            </div>
            <div style={styles.iconPlaceholder}></div>
          </div>
        ))}
      </div>
    );
  }

  // If no stats yet
  if (!stats) {
    return null;
  }

  const cards = [
    {
      label: 'Total Users',
      value: stats.total_users || 0,
      icon: '👥',
      color: '#60A5FA', // Light Blue
      bgColor: 'rgba(96, 165, 250, 0.2)',
    },
    {
      label: 'Active Users',
      value: stats.active_users || 0,
      icon: '✅',
      color: '#34D399', // Light Green
      bgColor: 'rgba(52, 211, 153, 0.2)',
    },
    {
      label: 'Admins',
      value: stats.admins || 0,
      icon: '👑',
      color: '#A78BFA', // Light Purple
      bgColor: 'rgba(167, 139, 250, 0.2)',
    },
    {
      label: 'Teachers',
      value: stats.teachers || 0,
      icon: '👨‍🏫',
      color: '#FBBF24', // Yellow
      bgColor: 'rgba(251, 191, 36, 0.2)',
    },
    {
      label: 'BDMs',
      value: stats.bdms || 0,
      icon: '💼',
      color: '#22D3EE', // Light Cyan
      bgColor: 'rgba(34, 211, 238, 0.2)',
    },
  ];

  // If search performed, show filtered count
  if (hasSearched && filteredCount !== undefined) {
    cards.unshift({
      label: 'Filtered Results',
      value: filteredCount,
      icon: '🔍',
      color: '#F472B6', // Light Pink
      bgColor: 'rgba(244, 114, 182, 0.2)',
    });
  }

  // Add total salaries card (shows filtered salaries if search performed)
  if (totalSalaries > 0) {
    cards.push({
      label: 'Total Salaries',
      value: formatSalary(totalSalaries),
      icon: '💰',
      color: '#10B981', // Green
      bgColor: 'rgba(16, 185, 129, 0.2)',
      isFormatted: true, // Flag to skip toLocaleString
    });
  }

  return (
    <div style={styles.container}>
      {cards.map((card, index) => (
        <div key={index} style={styles.card}>
          <div style={styles.cardContent}>
            <div style={styles.label}>{card.label}</div>
            <div style={{ ...styles.value, color: card.color }}>
              {card.isFormatted ? card.value : (typeof card.value === 'number' ? card.value.toLocaleString() : card.value)}
            </div>
          </div>
          <div style={{
            ...styles.iconWrapper,
            backgroundColor: card.bgColor,
          }}>
            <span style={styles.icon}>{card.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// STYLES - Glassmorphism Design System
// ============================================

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },

  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: `all ${TRANSITIONS.normal}`,
    cursor: 'default',
  },

  cardContent: {
    flex: 1,
  },

  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.whiteSubtle,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  value: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 1,
  },

  iconWrapper: {
    width: '52px',
    height: '52px',
    borderRadius: BORDER_RADIUS.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: SPACING.md,
  },

  icon: {
    fontSize: FONT_SIZES['2xl'],
  },

  iconPlaceholder: {
    width: '52px',
    height: '52px',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    flexShrink: 0,
    marginLeft: SPACING.md,
  },
};

export default UserStatsCards;
