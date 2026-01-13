// ============================================
// SCHOOL STATS CARDS - Dashboard Overview
// ============================================

import React from 'react';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
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
 * SchoolStatsCards Component
 * Displays overview statistics in beautiful cards
 * 
 * @param {Object} props
 * @param {number} props.totalSchools - Total number of schools
 * @param {number} props.totalStudents - Total number of students
 * @param {number} props.totalRevenue - Total monthly revenue
 * @param {number} props.avgCapacity - Average capacity utilization percentage
 * @param {boolean} props.isLoading - Loading state
 */
export const SchoolStatsCards = ({
  totalSchools = 0,
  totalStudents = 0,
  totalRevenue = 0,
  avgCapacity = 0,
  isLoading = false,
}) => {
  const stats = [
    {
      id: 'schools',
      icon: '🏫',
      label: 'Total Schools',
      value: totalSchools,
      color: '#3B82F6', // Blue
      bgColor: '#EFF6FF',
    },
    {
      id: 'students',
      icon: '👥',
      label: 'Total Students',
      value: totalStudents.toLocaleString(),
      color: '#10B981', // Green
      bgColor: '#ECFDF5',
    },
    {
      id: 'revenue',
      icon: '💰',
      label: 'Monthly Revenue',
      value: `PKR ${totalRevenue.toLocaleString()}`,
      color: '#F59E0B', // Orange
      bgColor: '#FEF3C7',
    },
    {
      id: 'capacity',
      icon: '📈',
      label: 'Avg Capacity',
      value: `${avgCapacity}%`,
      color: '#8B5CF6', // Purple
      bgColor: '#F5F3FF',
    },
  ];

  // Styles
  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  };

  const cardStyle = () => ({
    backgroundColor: COLORS.background.white,
    border: `1px solid ${COLORS.border.light}`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    boxShadow: SHADOWS.sm,
    transition: `all ${TRANSITIONS.fast} ease`,
    cursor: 'default',
    position: 'relative',
    overflow: 'hidden',
  });

  const iconContainerStyle = (bgColor, color) => ({
    width: '48px',
    height: '48px',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: bgColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES.xl,
    marginBottom: SPACING.md,
    border: `2px solid ${color}20`,
  });

  const labelStyle = {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
  };

  const valueStyle = (color) => ({
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: color,
    lineHeight: '1.2',
  });

  const loadingContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '140px',
  };

  // Loading skeleton
  const skeletonStyle = {
    backgroundColor: COLORS.background.offWhite,
    borderRadius: BORDER_RADIUS.md,
    minHeight: '140px',
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  };

  if (isLoading) {
    return (
      <div style={containerStyle}>
        {stats.map((stat) => (
          <div key={stat.id} style={skeletonStyle}>
            <div style={loadingContainerStyle}>
              <LoadingSpinner size="small" />
            </div>
          </div>
        ))}
        <style>
          {`
            @keyframes pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0.5;
              }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {stats.map((stat) => (
        <div
          key={stat.id}
          style={cardStyle()}
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
          <div style={iconContainerStyle(stat.bgColor, stat.color)}>
            {stat.icon}
          </div>

          {/* Label */}
          <div style={labelStyle}>{stat.label}</div>

          {/* Value */}
          <div style={valueStyle(stat.color)}>{stat.value}</div>

          {/* Decorative element */}
          <div
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              width: '80px',
              height: '80px',
              background: `linear-gradient(135deg, ${stat.color}10, transparent)`,
              borderRadius: `0 ${BORDER_RADIUS.md} 0 100%`,
              pointerEvents: 'none',
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default SchoolStatsCards;