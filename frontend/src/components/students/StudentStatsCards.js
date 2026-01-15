// ============================================
// STUDENT STATS CARDS - Glassmorphism Design System
// Matches Task Page stats card design with hover effects
// ============================================

import React, { useState } from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';

/**
 * StudentStatsCards Component
 * Glassmorphic stats cards matching Task page design
 *
 * @param {number} totalStudents - Total count of all students
 * @param {number} filteredCount - Count of students after filtering
 * @param {number} schoolsCount - Number of unique schools
 * @param {number} totalFees - Sum of all monthly fees
 * @param {boolean} hasSearched - Whether user has performed a search
 * @param {boolean} isLoading - Loading state
 */
export function StudentStatsCards({
  totalStudents = 0,
  filteredCount = 0,
  schoolsCount = 0,
  totalFees = 0,
  hasSearched = false,
  isLoading = false,
}) {
  const [hoveredCard, setHoveredCard] = useState(null);

  const formatValue = (value, format) => {
    if (isLoading) return '...';

    switch (format) {
      case 'currency':
        return `PKR ${Number(value).toLocaleString()}`;
      case 'number':
        return Number(value).toLocaleString();
      case 'text':
      default:
        return value;
    }
  };

  const stats = [
    {
      id: 'total',
      label: 'Total Students',
      value: totalStudents,
      icon: '👨‍🎓',
      color: '#60A5FA', // Light Blue
      format: 'number',
    },
    {
      id: 'filtered',
      label: 'Filtered',
      value: hasSearched ? filteredCount : '-',
      icon: '🔍',
      color: '#A78BFA', // Light Purple
      format: hasSearched ? 'number' : 'text',
    },
    {
      id: 'schools',
      label: 'Schools',
      value: schoolsCount,
      icon: '🏫',
      color: '#FBBF24', // Yellow
      format: 'number',
    },
    {
      id: 'fees',
      label: 'Monthly Fees',
      value: totalFees,
      icon: '💰',
      color: '#F59E0B', // Amber
      format: 'currency',
    },
  ];

  const getCardStyle = (isHovered) => ({
    ...styles.statCard,
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
  });

  const getIconStyle = (isHovered) => ({
    ...styles.statIcon,
    transform: isHovered ? 'scale(1.2)' : 'scale(1)',
    transition: `transform ${TRANSITIONS.normal}`,
  });

  return (
    <div style={styles.statsGrid}>
      {stats.map((stat) => (
        <div
          key={stat.id}
          style={getCardStyle(hoveredCard === stat.id)}
          onMouseEnter={() => setHoveredCard(stat.id)}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <span style={getIconStyle(hoveredCard === stat.id)}>{stat.icon}</span>
          <div style={{ ...styles.statValue, color: stat.color }}>
            {formatValue(stat.value, stat.format)}
          </div>
          <div style={styles.statLabel}>{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// STYLES - Glassmorphism Design System
// Matches MyTasksPage stats card styling
// ============================================

const styles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },

  statCard: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    textAlign: 'center',
    transition: `all ${TRANSITIONS.normal}`,
    cursor: 'default',
    border: '1px solid rgba(255, 255, 255, 0.18)',
  },

  statIcon: {
    fontSize: FONT_SIZES['2xl'],
    marginBottom: SPACING.sm,
    display: 'block',
  },

  statValue: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    margin: `${SPACING.sm} 0`,
    lineHeight: 1,
  },

  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    fontWeight: FONT_WEIGHTS.medium,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
};

export default StudentStatsCards;
