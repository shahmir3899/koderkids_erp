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

const formatAmount = (n) => Math.abs(Math.round(Number(n) || 0)).toLocaleString();

// delta = percent change vs previous period; goodWhenUp flips colours for expenses.
const DeltaChip = ({ delta, goodWhenUp }) => {
  if (delta === null || delta === undefined || !isFinite(delta)) return null;
  const up = delta >= 0;
  const good = up === goodWhenUp;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.15rem 0.6rem',
        borderRadius: '999px',
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        color: good ? '#6EE7B7' : '#FCA5A5',
        background: good ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)',
      }}
    >
      {up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
      <span style={{ fontWeight: FONT_WEIGHTS.medium, opacity: 0.85 }}>vs prev</span>
    </span>
  );
};

const SummaryCard = ({ title, value, icon, color, accent, sign, delta, goodWhenUp, id, hoveredCard, setHoveredCard }) => {
  const isHovered = hoveredCard === id;

  const cardStyle = {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    textAlign: 'left',
    transition: `all ${TRANSITIONS.normal}`,
    cursor: 'default',
    border: '1px solid rgba(255, 255, 255, 0.22)',
    borderLeft: `6px solid ${accent}`,
    transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
    boxShadow: isHovered
      ? '0 12px 40px rgba(0, 0, 0, 0.25)'
      : '0 4px 24px rgba(0, 0, 0, 0.12)',
    background: isHovered
      ? 'rgba(255, 255, 255, 0.18)'
      : 'rgba(255, 255, 255, 0.12)',
  };

  const titleStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteTransparent,
    fontWeight: FONT_WEIGHTS.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  };

  const valueStyle = {
    fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
    fontWeight: FONT_WEIGHTS.bold,
    color: color,
    margin: `${SPACING.md} 0 ${SPACING.sm}`,
    lineHeight: 1.1,
    fontVariantNumeric: 'tabular-nums',
    textShadow: '0 1px 8px rgba(0, 0, 0, 0.25)',
    wordBreak: 'break-word',
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHoveredCard(id)}
      onMouseLeave={() => setHoveredCard(null)}
    >
      <div style={titleStyle}>
        <span aria-hidden="true">{icon}</span>
        {title}
      </div>
      <div style={valueStyle}>
        {sign}
        <span style={{ fontSize: '0.5em', fontWeight: FONT_WEIGHTS.semibold, marginRight: '0.35em', opacity: 0.9 }}>PKR</span>
        {formatAmount(value)}
      </div>
      <div style={{ minHeight: '1.6rem' }}>
        <DeltaChip delta={delta} goodWhenUp={goodWhenUp} />
      </div>
    </div>
  );
};

// previousSummary (optional): { income, expenses } for the prior period, enables the delta chips.
export const FinanceSummaryCards = ({ summary, previousSummary, loading }) => {
  const [hoveredCard, setHoveredCard] = useState(null);

  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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
              textAlign: 'left',
              minHeight: '9rem',
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

  const pct = (cur, prev) => (prev ? ((cur - prev) / Math.abs(prev)) * 100 : null);
  const prevNet = previousSummary ? previousSummary.income - previousSummary.expenses : null;

  const cards = [
    {
      id: 'income',
      title: 'Total Income',
      value: summary.income,
      icon: '💵',
      color: '#6EE7B7',
      accent: '#10B981',
      sign: '+ ',
      goodWhenUp: true,
      delta: previousSummary ? pct(summary.income, previousSummary.income) : null,
    },
    {
      id: 'expenses',
      title: 'Total Expenses',
      value: summary.expenses,
      icon: '💸',
      color: '#FCA5A5',
      accent: '#EF4444',
      sign: '− ',
      goodWhenUp: false,
      delta: previousSummary ? pct(summary.expenses, previousSummary.expenses) : null,
    },
    {
      id: 'balance',
      title: 'Net Balance',
      value: netBalance,
      icon: netBalance >= 0 ? '📈' : '📉',
      color: netBalance >= 0 ? '#93C5FD' : '#FCA5A5',
      accent: netBalance >= 0 ? '#3B82F6' : '#EF4444',
      sign: netBalance >= 0 ? '+ ' : '− ',
      goodWhenUp: true,
      delta: prevNet !== null ? pct(netBalance, prevNet) : null,
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
          accent={card.accent}
          sign={card.sign}
          delta={card.delta}
          goodWhenUp={card.goodWhenUp}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
        />
      ))}
    </div>
  );
};

export default FinanceSummaryCards;
