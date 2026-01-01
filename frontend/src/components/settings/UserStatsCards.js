// ============================================
// USER STATS CARDS - Statistics Display
// ============================================

import React from 'react';

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
  gap: '1.5rem',
  marginBottom: '2rem',
};

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  padding: '1.5rem',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  borderLeft: '4px solid',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  cursor: 'default',
};

const labelStyle = {
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#6B7280',
  marginBottom: '0.5rem',
};

const valueStyle = {
  fontSize: '2rem',
  fontWeight: '700',
  lineHeight: '1',
};

const iconStyle = {
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.5rem',
  flexShrink: 0,
  marginLeft: '1rem',
};

export default UserStatsCards;