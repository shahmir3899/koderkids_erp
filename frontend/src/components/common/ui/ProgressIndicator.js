// ============================================
// PROGRESS INDICATOR - Visual Progress Bar
// ============================================
// Location: src/components/common/ui/ProgressIndicator.js

import React, { useMemo } from 'react';

/**
 * ProgressIndicator Component
 * Shows a visual progress bar with completed/total counts
 * 
 * @param {Object} props
 * @param {number} props.completed - Number of completed items
 * @param {number} props.total - Total number of items
 * @param {string} props.label - Optional label text
 * @param {boolean} props.showPercentage - Show percentage (default: true)
 * @param {boolean} props.showCounts - Show "X/Y" counts (default: true)
 * @param {string} props.size - Size: 'small' | 'medium' | 'large' (default: 'medium')
 * @param {string} props.color - Progress bar color (default: '#3B82F6')
 * @param {string} props.backgroundColor - Background color (default: '#E5E7EB')
 * @param {string} props.className - Additional CSS classes
 */
export const ProgressIndicator = ({
  completed = 0,
  total = 0,
  label = '',
  showPercentage = true,
  showCounts = true,
  size = 'medium',
  color = '#3B82F6',
  backgroundColor = '#E5E7EB',
  className = '',
}) => {
  // Calculate percentage
  const percentage = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }, [completed, total]);

  // Determine color based on progress
  const progressColor = useMemo(() => {
    if (percentage >= 100) return '#10B981'; // Green when complete
    if (percentage >= 50) return color; // Default color
    if (percentage >= 25) return '#F59E0B'; // Yellow for low progress
    return '#EF4444'; // Red for very low progress
  }, [percentage, color]);

  // Size configurations
  const sizes = {
    small: { height: '6px', fontSize: '0.75rem', gap: '0.5rem' },
    medium: { height: '8px', fontSize: '0.875rem', gap: '0.75rem' },
    large: { height: '12px', fontSize: '1rem', gap: '1rem' },
  };

  const { height, fontSize, gap } = sizes[size] || sizes.medium;

  // Styles
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap,
    width: '100%',
  };

  const labelStyle = {
    fontSize,
    fontWeight: '500',
    color: '#374151',
    whiteSpace: 'nowrap',
  };

  const barContainerStyle = {
    flex: 1,
    height,
    backgroundColor,
    borderRadius: '9999px',
    overflow: 'hidden',
    minWidth: '100px',
  };

  const barFillStyle = {
    height: '100%',
    width: `${percentage}%`,
    backgroundColor: progressColor,
    borderRadius: '9999px',
    transition: 'width 0.3s ease, background-color 0.3s ease',
  };

  const statsStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize,
    color: '#6B7280',
    whiteSpace: 'nowrap',
  };

  const countStyle = {
    fontWeight: '600',
    color: '#374151',
  };

  const percentageStyle = {
    fontWeight: '500',
    color: progressColor,
  };

  return (
    <div style={containerStyle} className={className}>
      {label && <span style={labelStyle}>{label}</span>}
      
      <div style={barContainerStyle}>
        <div style={barFillStyle} />
      </div>
      
      <div style={statsStyle}>
        {showCounts && (
          <span style={countStyle}>
            {completed}/{total}
          </span>
        )}
        {showPercentage && (
          <span style={percentageStyle}>
            ({percentage}%)
          </span>
        )}
      </div>
    </div>
  );
};

export default ProgressIndicator;