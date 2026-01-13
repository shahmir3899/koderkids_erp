// ============================================
// PROGRESS INDICATOR - Visual Progress Bar
// ============================================
// Location: src/components/common/ui/ProgressIndicator.js

import React, { useMemo } from 'react';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  TRANSITIONS,
} from '../../../utils/designConstants';

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
  color = COLORS.status.info,
  backgroundColor = COLORS.border.light,
  className = '',
}) => {
  // Calculate percentage
  const percentage = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }, [completed, total]);

  // Determine color based on progress
  const progressColor = useMemo(() => {
    if (percentage >= 100) return COLORS.status.success;
    if (percentage >= 50) return color;
    if (percentage >= 25) return COLORS.status.warning;
    return COLORS.status.error;
  }, [percentage, color]);

  // Size configurations
  const sizes = {
    small: { height: '6px', fontSize: FONT_SIZES.xs, gap: '0.5rem' },
    medium: { height: '8px', fontSize: FONT_SIZES.sm, gap: '0.75rem' },
    large: { height: '12px', fontSize: FONT_SIZES.lg, gap: '1rem' },
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
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.primary,
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
    transition: `width ${TRANSITIONS.slow} ease, background-color ${TRANSITIONS.slow} ease`,
  };

  const statsStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize,
    color: COLORS.text.secondary,
    whiteSpace: 'nowrap',
  };

  const countStyle = {
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.primary,
  };

  const percentageStyle = {
    fontWeight: FONT_WEIGHTS.medium,
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