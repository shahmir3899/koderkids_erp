// ============================================
// STUDENT STATS CARDS - Statistics Display
// Shows key metrics for student management
// ============================================

import React from 'react';

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

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      {stats.map((stat) => (
        <div
          key={stat.id}
          style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            cursor: 'default',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '0.625rem',
              backgroundColor: stat.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              flexShrink: 0,
            }}
          >
            {stat.icon}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: '500',
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.025em',
                marginBottom: '0.25rem',
              }}
            >
              {stat.label}
            </p>
            <p
              style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: stat.color,
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {formatValue(stat.value, stat.format)}
            </p>
            {stat.subtitle && (
              <p
                style={{
                  fontSize: '0.6875rem',
                  color: '#9CA3AF',
                  marginTop: '0.25rem',
                }}
              >
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