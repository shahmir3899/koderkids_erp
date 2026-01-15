// ============================================
// INVENTORY STATS - Glassmorphism Design System
// Stat Cards with hover effects
// ============================================

import React, { useState } from 'react';
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
const StatCard = ({ title, value, subtitle, icon, color = '#3B82F6', id, hoveredCard, setHoveredCard }) => {
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
    marginBottom: SPACING.xs,
  };

  const subtitleStyle = {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    opacity: 0.8,
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
      {subtitle && <div style={subtitleStyle}>{subtitle}</div>}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const InventoryStats = ({
  totalItems = 0,
  totalValue = 0,
  availableCount = 0,
  assignedCount = 0,
  loading = false,
}) => {
  const [hoveredCard, setHoveredCard] = useState(null);

  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING['2xl'],
  };

  const stats = [
    {
      id: 'total',
      title: 'Total Items',
      value: totalItems.toLocaleString(),
      icon: '📦',
      color: '#60A5FA', // Light Blue
      subtitle: 'All inventory items',
    },
    {
      id: 'value',
      title: 'Total Value',
      value: `PKR ${totalValue.toLocaleString()}`,
      icon: '💰',
      color: '#FBBF24', // Yellow
      subtitle: 'Combined asset value',
    },
    {
      id: 'available',
      title: 'Available',
      value: availableCount.toLocaleString(),
      icon: '✅',
      color: '#34D399', // Light Green
      subtitle: 'Ready for assignment',
    },
    {
      id: 'assigned',
      title: 'Assigned',
      value: assignedCount.toLocaleString(),
      icon: '👤',
      color: '#A78BFA', // Light Purple
      subtitle: 'Currently in use',
    },
  ];

  if (loading) {
    return (
      <div style={containerStyle}>
        {stats.map((stat) => (
          <div
            key={stat.id}
            style={{
              ...MIXINS.glassmorphicCard,
              borderRadius: BORDER_RADIUS.xl,
              padding: SPACING.xl,
              textAlign: 'center',
              opacity: 0.6,
            }}
          >
            <span style={{ fontSize: FONT_SIZES['2xl'], display: 'block', marginBottom: SPACING.sm }}>{stat.icon}</span>
            <div style={{ fontSize: FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.bold, color: stat.color }}>...</div>
            <div style={{ fontSize: FONT_SIZES.sm, color: COLORS.text.whiteSubtle, textTransform: 'uppercase' }}>{stat.title}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {stats.map((stat) => (
        <StatCard
          key={stat.id}
          id={stat.id}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          subtitle={stat.subtitle}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
        />
      ))}
    </div>
  );
};

export default InventoryStats;
