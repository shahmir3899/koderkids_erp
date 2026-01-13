// ============================================
// CIRCULAR PROGRESS - Course Completion Chart
// ============================================
// Location: src/components/teacher/CircularProgress.js

import React from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  TRANSITIONS,
} from '../../utils/designConstants';

/**
 * CircularProgress Component
 * Displays a circular progress chart with percentage
 * 
 * @param {Object} props
 * @param {number} props.percentage - Completion percentage (0-100)
 * @param {string} props.schoolName - Name of the school
 * @param {number} props.size - Diameter of the circle (default: 173)
 * @param {number} props.strokeWidth - Width of the progress ring (default: 20)
 */
export const CircularProgress = ({ 
  percentage = 0, 
  schoolName = '', 
  size = 173, 
  strokeWidth = 20 
}) => {
  const [hovered, setHovered] = React.useState(false);
  
  // Calculate circle dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    cursor: 'pointer',
    transform: hovered ? 'scale(1.05)' : 'scale(1)',
    transition: `transform ${TRANSITIONS.normal} ease`,
  };

  const headerStyle = {
    marginBottom: SPACING.md,
  };

  const titleStyle = {
    fontSize: FONT_SIZES.base,
    fontFamily: 'Poly, serif',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    lineHeight: '1.6',
  };

  const schoolNameStyle = {
    fontSize: FONT_SIZES.base,
    fontFamily: 'Poly, serif',
    color: COLORS.text.primary,
    lineHeight: '1.6',
  };

  const chartContainerStyle = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const svgStyle = {
    display: 'block',
  };

  const progressCircleStyle = {
    transition: `stroke-dashoffset 1.5s ease-in-out, filter ${TRANSITIONS.normal} ease`,
    animation: 'progress-fill 1.5s ease-in-out',
    filter: hovered ? 'drop-shadow(0 0 8px rgba(176, 97, 206, 0.6))' : 'none',
  };

  const percentageTextStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: hovered ? '34px' : '30px',
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.accent.purple,
    fontFamily: 'Inter, sans-serif',
    lineHeight: '1',
    transition: `font-size ${TRANSITIONS.normal} ease`,
  };

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div style={headerStyle}>
        <div style={titleStyle}>Course Completion chart</div>
        <div style={schoolNameStyle}>{schoolName}</div>
      </div>

      {/* Chart */}
      <div style={chartContainerStyle}>
        <svg
          width={size}
          height={size}
          style={svgStyle}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background circle (light gray) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={COLORS.background.offWhite}
            strokeWidth={strokeWidth}
            opacity={0.3}
          />

          {/* Progress circle (purple) with animation */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={COLORS.accent.purple}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            style={progressCircleStyle}
          />
        </svg>

        {/* Percentage Text */}
        <div style={percentageTextStyle}>
          {Math.round(percentage)}%
        </div>
      </div>
    </div>
  );
};

export default CircularProgress;