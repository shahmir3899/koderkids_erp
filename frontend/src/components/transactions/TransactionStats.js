// ============================================
// TRANSACTION STATS COMPONENT - Glassmorphism Design
// ============================================
// Location: src/components/transactions/TransactionStats.js

import React, { useState } from 'react';

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

// ============================================
// STAT CARD COMPONENT
// ============================================
const StatCard = ({ title, value, icon, color, id, hoveredCard, setHoveredCard }) => {
  const isHovered = hoveredCard === id;

  const cardStyle = {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    textAlign: 'center',
    transition: `all ${TRANSITIONS.normal}`,
    cursor: 'default',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
    boxShadow: isHovered
      ? '0 12px 40px rgba(0, 0, 0, 0.25)'
      : '0 4px 24px rgba(0, 0, 0, 0.12)',
    background: isHovered
      ? 'rgba(255, 255, 255, 0.18)'
      : 'rgba(255, 255, 255, 0.12)',
    borderColor: isHovered
      ? 'rgba(255, 255, 255, 0.3)'
      : 'rgba(255, 255, 255, 0.18)',
  };

  const iconStyle = {
    fontSize: FONT_SIZES['2xl'],
    marginBottom: SPACING.sm,
    display: 'block',
    transform: isHovered ? 'scale(1.2)' : 'scale(1)',
    transition: `transform ${TRANSITIONS.normal}`,
  };

  const valueStyle = {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: color,
    margin: `${SPACING.sm} 0`,
    lineHeight: 1,
  };

  const titleStyle = {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    fontWeight: FONT_WEIGHTS.medium,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHoveredCard(id)}
      onMouseLeave={() => setHoveredCard(null)}
    >
      <span style={iconStyle}>{icon}</span>
      <div style={valueStyle}>{value}</div>
      <div style={titleStyle}>{title}</div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const TransactionStats = ({ stats, activeTab }) => {
  const [hoveredCard, setHoveredCard] = useState(null);

  const getTabIcon = () => {
    switch (activeTab) {
      case 'income':
        return '💵';
      case 'expense':
        return '💸';
      case 'transfers':
        return '🔄';
      default:
        return '💰';
    }
  };

  const getTabColor = () => {
    switch (activeTab) {
      case 'income':
        return '#34D399'; // Light Green
      case 'expense':
        return '#F87171'; // Light Red
      case 'transfers':
        return '#60A5FA'; // Light Blue
      default:
        return '#A78BFA'; // Light Purple
    }
  };

  const tabColor = getTabColor();

  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING['2xl'],
  };

  const cards = [
    {
      id: 'count',
      title: 'Total Transactions',
      value: stats.count.toLocaleString(),
      icon: getTabIcon(),
      color: tabColor,
    },
    {
      id: 'total',
      title: 'Total Amount',
      value: `PKR ${stats.total.toLocaleString()}`,
      icon: '💰',
      color: tabColor,
    },
    {
      id: 'average',
      title: 'Average Amount',
      value: `PKR ${stats.average.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: '📊',
      color: '#A78BFA', // Light Purple
    },
  ];

  return (
    <div style={containerStyle}>
      {cards.map((card) => (
        <StatCard
          key={card.id}
          id={card.id}
          title={card.title}
          value={card.value}
          icon={card.icon}
          color={card.color}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
        />
      ))}
    </div>
  );
};

export default TransactionStats;
