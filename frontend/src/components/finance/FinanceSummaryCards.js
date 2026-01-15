// ============================================
// FINANCE SUMMARY CARDS - Glassmorphism Design System
// ============================================

import React, { useState } from 'react';
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

const SummaryCard = ({ title, value, icon, color, id, hoveredCard, setHoveredCard }) => {
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
      <div style={valueStyle}>PKR {value.toLocaleString()}</div>
      <div style={titleStyle}>{title}</div>
    </div>
  );
};

export const FinanceSummaryCards = ({ summary, loading }) => {
  const [hoveredCard, setHoveredCard] = useState(null);

  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING['2xl'],
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        {['income', 'expenses', 'balance'].map((id) => (
          <div
            key={id}
            style={{
              ...MIXINS.glassmorphicCard,
              borderRadius: BORDER_RADIUS.xl,
              padding: SPACING.xl,
              textAlign: 'center',
              opacity: 0.6,
            }}
          >
            <span style={{ fontSize: FONT_SIZES['2xl'], display: 'block', marginBottom: SPACING.sm }}>...</span>
            <div style={{ fontSize: FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.bold, color: COLORS.text.white }}>...</div>
            <div style={{ fontSize: FONT_SIZES.sm, color: COLORS.text.whiteSubtle, textTransform: 'uppercase' }}>Loading...</div>
          </div>
        ))}
      </div>
    );
  }

  const netBalance = summary.income - summary.expenses;

  const cards = [
    {
      id: 'income',
      title: 'Total Income',
      value: summary.income,
      icon: '💵',
      color: '#34D399', // Light Green
    },
    {
      id: 'expenses',
      title: 'Total Expenses',
      value: summary.expenses,
      icon: '💸',
      color: '#F87171', // Light Red
    },
    {
      id: 'balance',
      title: 'Net Balance',
      value: netBalance,
      icon: netBalance >= 0 ? '📈' : '📉',
      color: netBalance >= 0 ? '#60A5FA' : '#F87171', // Light Blue or Light Red
    },
  ];

  return (
    <div style={containerStyle}>
      {cards.map((card) => (
        <SummaryCard
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

export default FinanceSummaryCards;
