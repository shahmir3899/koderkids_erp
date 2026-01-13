// ============================================
// USER STATS CARDS - Statistics Display
// ============================================

import React from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  TRANSITIONS,
} from '../../utils/designConstants';

/**
 * UserStatsCards Component
 * Displays user statistics in card format
 * 
 * @param {Object} props
 * @param {Object} props.stats - Statistics object from API
 * @param {number} props.filteredCount - Number of filtered users (optional)
 * @param {boolean} props.hasSearched - Whether search has been performed
 * @param {boolean} props.isLoading - Loading state
 */
export const UserStatsCards = ({ 
  stats, 
  filteredCount, 
  hasSearched = false, 
  isLoading = false 
}) => {
  // If loading, show skeleton
  if (isLoading) {
    return (
      <div style={containerStyle}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ ...cardStyle, opacity: 0.6 }}>
            <div style={{ ...labelStyle }}>Loading...</div>
            <div style={{ ...valueStyle }}>-</div>
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
      color: '#3B82F6',
      bgColor: '#EFF6FF',
    },
    {
      label: 'Active Users',
      value: stats.active_users || 0,
      icon: '✅',
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      label: 'Admins',
      value: stats.admins || 0,
      icon: '👑',
      color: '#8B5CF6',
      bgColor: '#F5F3FF',
    },
    {
      label: 'Teachers',
      value: stats.teachers || 0,
      icon: '👨‍🏫',
      color: '#F59E0B',
      bgColor: '#FFFBEB',
    },
    {
      label: 'BDMs',
      value: stats.bdms || 0,
      icon: '💼',
      color: '#06B6D4',
      bgColor: '#ECFEFF',
    },
  ];

  // If search performed, show filtered count
  if (hasSearched && filteredCount !== undefined) {
    cards.unshift({
      label: 'Filtered Results',
      value: filteredCount,
      icon: '🔍',
      color: '#EC4899',
      bgColor: '#FDF2F8',
    });
  }

  return (
    <div style={containerStyle}>
      {cards.map((card, index) => (
        <div key={index} style={{ ...cardStyle, borderLeftColor: card.color }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>{card.label}</div>
              <div style={{ ...valueStyle, color: card.color }}>{card.value.toLocaleString()}</div>
            </div>
            <div style={{ 
              ...iconStyle, 
              backgroundColor: card.bgColor,
              color: card.color 
            }}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// STYLES
// ============================================

const containerStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: SPACING.lg,
  marginBottom: SPACING.xl,
};

const cardStyle = {
  backgroundColor: COLORS.background.white,
  borderRadius: BORDER_RADIUS.md,
  padding: SPACING.lg,
  boxShadow: SHADOWS.sm,
  borderLeft: '4px solid',
  transition: `transform ${TRANSITIONS.fast} ease, box-shadow ${TRANSITIONS.fast} ease`,
  cursor: 'default',
};

const labelStyle = {
  fontSize: FONT_SIZES.sm,
  fontWeight: FONT_WEIGHTS.medium,
  color: COLORS.text.secondary,
  marginBottom: SPACING.xs,
};

const valueStyle = {
  fontSize: FONT_SIZES['2xl'],
  fontWeight: FONT_WEIGHTS.bold,
  lineHeight: '1',
};

const iconStyle = {
  width: '48px',
  height: '48px',
  borderRadius: BORDER_RADIUS.md,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: FONT_SIZES.xl,
  flexShrink: 0,
  marginLeft: SPACING.md,
};

export default UserStatsCards;