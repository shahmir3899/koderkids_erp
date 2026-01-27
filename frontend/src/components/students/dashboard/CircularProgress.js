import React from 'react';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../../../utils/designConstants';

/**
 * CircularProgress - SVG-based donut chart for displaying progress percentages
 *
 * @param {number} percentage - Progress percentage (0-100)
 * @param {number} size - Diameter of the circle in pixels
 * @param {number} strokeWidth - Width of the progress stroke
 * @param {string} color - Color of the progress arc
 * @param {string} backgroundColor - Color of the background circle
 * @param {string} label - Label text below the percentage
 * @param {boolean} showPercentage - Whether to show the percentage number
 */
const CircularProgress = ({
  percentage = 0,
  size = 100,
  strokeWidth = 10,
  color = COLORS.studentDashboard.progressOrange,
  backgroundColor = '#E0E0E0',
  label = '',
  showPercentage = true,
}) => {
  // Ensure percentage is within bounds
  const normalizedPercentage = Math.min(100, Math.max(0, percentage));

  // Calculate dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedPercentage / 100) * circumference;

  // Center point
  const center = size / 2;

  return (
    <div style={styles.container}>
      <svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 0.5s ease-out',
          }}
        />
      </svg>
      {showPercentage && (
        <div style={{ ...styles.percentageContainer, width: size, height: size }}>
          <span style={{ ...styles.percentage, fontSize: size * 0.25 }}>
            {Math.round(normalizedPercentage)}
          </span>
          <span style={{ ...styles.percentSign, fontSize: size * 0.12 }}>%</span>
        </div>
      )}
      {label && <span style={styles.label}>{label}</span>}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    display: 'block',
  },
  percentageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.studentDashboard.textPrimary,
  },
  percentSign: {
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.studentDashboard.textSecondary,
    marginLeft: '2px',
  },
  label: {
    marginTop: '8px',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.studentDashboard.textSecondary,
    textAlign: 'center',
  },
};

export default CircularProgress;
