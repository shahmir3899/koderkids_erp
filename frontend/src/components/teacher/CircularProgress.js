// ============================================
// CIRCULAR PROGRESS - Course Completion Chart
// ============================================
// Location: src/components/teacher/CircularProgress.js

import React from 'react';

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

  return (
    <div 
      style={{
        ...styles.container,
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.3s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>Course Completion chart</div>
        <div style={styles.schoolName}>{schoolName}</div>
      </div>
      
      {/* Chart */}
      <div style={styles.chartContainer}>
        <svg 
          width={size} 
          height={size} 
          style={styles.svg}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background circle (light gray) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#F2F2F7"
            strokeWidth={strokeWidth}
            opacity={0.3}
          />
          
          {/* Progress circle (purple) with animation */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#B061CE"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            style={{
              ...styles.progressCircle,
              filter: hovered ? 'drop-shadow(0 0 8px rgba(176, 97, 206, 0.6))' : 'none',
            }}
          />
        </svg>
        
        {/* Percentage Text */}
        <div style={{
          ...styles.percentageText,
          fontSize: hovered ? '34px' : '30px',
          transition: 'font-size 0.3s ease',
        }}>
          {Math.round(percentage)}%
        </div>
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    cursor: 'pointer',
  },
  header: {
    marginBottom: '1rem',
  },
  title: {
    fontSize: '15px',
    fontFamily: 'Poly, serif',
    color: '#000000',
    marginBottom: '0.25rem',
    lineHeight: '1.6',
  },
  schoolName: {
    fontSize: '15px',
    fontFamily: 'Poly, serif',
    color: '#000000',
    lineHeight: '1.6',
  },
  chartContainer: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    display: 'block',
  },
  progressCircle: {
    transition: 'stroke-dashoffset 1.5s ease-in-out, filter 0.3s ease',
    animation: 'progress-fill 1.5s ease-in-out',
  },
  percentageText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '30px',
    fontWeight: '600',
    color: '#B061CE',
    fontFamily: 'Inter, sans-serif',
    lineHeight: '1',
  },
};

export default CircularProgress;