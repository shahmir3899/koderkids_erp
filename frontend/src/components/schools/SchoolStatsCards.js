// ============================================
// SCHOOL STATS CARDS - Dashboard Overview
// ============================================

import React from 'react';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';

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
    gap: '1.5rem',
    marginBottom: '2rem',
  };

  const cardStyle = (bgColor) => ({
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
    cursor: 'default',
    position: 'relative',
    overflow: 'hidden',
  });

  const cardHoverStyle = {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  };

  const iconContainerStyle = (bgColor, color) => ({
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: bgColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    marginBottom: '1rem',
    border: `2px solid ${color}20`,
  });

  const labelStyle = {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
  };

  const valueStyle = (color) => ({
    fontSize: '1.875rem',
    fontWeight: '700',
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
    backgroundColor: '#F3F4F6',
    borderRadius: '12px',
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
          style={cardStyle(stat.bgColor)}
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, cardHoverStyle);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
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
              borderRadius: '0 12px 0 100%',
              pointerEvents: 'none',
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default SchoolStatsCards;