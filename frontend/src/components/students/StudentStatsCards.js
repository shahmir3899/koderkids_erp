// ============================================
// STUDENT STATS CARDS - Statistics Display
// Shows key metrics for student management
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
 * StudentStatsCards Component
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
  const stats = [
    {
      id: 'total',
      label: 'Total Students',
      value: totalStudents,
      icon: '👨‍🎓',
      color: '#3B82F6',
      bgColor: '#EFF6FF',
      format: 'number',
    },
    {
      id: 'filtered',
      label: 'Filtered Results',
      value: hasSearched ? filteredCount : '-',
      icon: '🔍',
      color: '#8B5CF6',
      bgColor: '#F5F3FF',
      format: hasSearched ? 'number' : 'text',
      subtitle: hasSearched ? 'Matching filters' : 'Search to filter',
    },
    {
      id: 'schools',
      label: 'Schools',
      value: schoolsCount,
      icon: '🏫',
      color: '#10B981',
      bgColor: '#ECFDF5',
      format: 'number',
    },
    {
      id: 'fees',
      label: 'Total Monthly Fees',
      value: totalFees,
      icon: '💰',
      color: '#F59E0B',
      bgColor: '#FFFBEB',
      format: 'currency',
    },
  ];

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

  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  };

  const cardStyle = {
    backgroundColor: COLORS.background.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    boxShadow: SHADOWS.sm,
    border: `1px solid ${COLORS.border.light}`,
    display: 'flex',
    alignItems: 'flex-start',
    gap: SPACING.md,
    transition: `transform ${TRANSITIONS.fast} ease, box-shadow ${TRANSITIONS.fast} ease`,
    cursor: 'default',
  };

  const getIconStyle = (bgColor) => ({
    width: '3rem',
    height: '3rem',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: bgColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES.xl,
    flexShrink: 0,
  });

  const contentStyle = {
    flex: 1,
    minWidth: 0,
  };

  const labelStyle = {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
    marginBottom: SPACING.xs,
  };

  const getValueStyle = (color) => ({
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: color,
    lineHeight: '1.2',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  });

  const subtitleStyle = {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  };

  return (
    <div style={containerStyle}>
      {stats.map((stat) => (
        <div
          key={stat.id}
          style={cardStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = SHADOWS.md;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = SHADOWS.sm;
          }}
        >
          {/* Icon */}
          <div style={getIconStyle(stat.bgColor)}>
            {stat.icon}
          </div>

          {/* Content */}
          <div style={contentStyle}>
            <p style={labelStyle}>
              {stat.label}
            </p>
            <p style={getValueStyle(stat.color)}>
              {formatValue(stat.value, stat.format)}
            </p>
            {stat.subtitle && (
              <p style={subtitleStyle}>
                {stat.subtitle}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default StudentStatsCards;