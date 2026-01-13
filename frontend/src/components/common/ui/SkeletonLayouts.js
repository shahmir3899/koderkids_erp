// ============================================
// SKELETON LAYOUTS - Reusable Loading Skeletons
// ============================================
// Location: src/components/common/ui/SkeletonLayouts.js

import React from 'react';
import { SkeletonLoader } from './LoadingSpinner';
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
} from '../../../utils/designConstants';

/**
 * SkeletonDashboard - Dashboard grid with card placeholders
 */
export const SkeletonDashboard = ({ cards = 4 }) => {
  const containerStyle = {
    padding: SPACING.lg,
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  };

  const cardStyle = {
    height: '120px',
    backgroundColor: COLORS.background.offWhite,
    borderRadius: BORDER_RADIUS.md,
    animation: 'pulse 1.5s ease-in-out infinite',
  };

  const chartStyle = {
    height: '350px',
    backgroundColor: COLORS.background.offWhite,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    animation: 'pulse 1.5s ease-in-out infinite',
  };

  return (
    <div style={containerStyle}>
      {/* Stats Cards Row */}
      <div style={gridStyle}>
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} style={cardStyle} />
        ))}
      </div>

      {/* Chart Placeholder */}
      <div style={chartStyle} />

      {/* Table Placeholder */}
      <SkeletonLoader rows={5} height="3rem" />

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

/**
 * SkeletonTable - Enhanced table skeleton
 */
export const SkeletonTable = ({ rows = 10, hasHeader = true }) => {
  const containerStyle = {
    padding: SPACING.md,
  };

  const headerStyle = {
    height: '3rem',
    backgroundColor: COLORS.background.offWhite,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
    animation: 'pulse 1.5s ease-in-out infinite',
  };

  return (
    <div style={containerStyle}>
      {hasHeader && <div style={headerStyle} />}
      <SkeletonLoader rows={rows} height="2.5rem" />
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

/**
 * SkeletonForm - Form skeleton with input fields
 */
export const SkeletonForm = ({ fields = 5 }) => {
  const containerStyle = {
    padding: SPACING.lg,
  };

  const fieldContainerStyle = {
    marginBottom: SPACING.lg,
  };

  const labelStyle = {
    height: '1.25rem',
    width: '30%',
    backgroundColor: COLORS.background.offWhite,
    borderRadius: BORDER_RADIUS.xs,
    marginBottom: SPACING.xs,
    animation: 'pulse 1.5s ease-in-out infinite',
  };

  const getInputStyle = (index) => ({
    height: '2.5rem',
    backgroundColor: COLORS.background.offWhite,
    borderRadius: BORDER_RADIUS.sm,
    animation: 'pulse 1.5s ease-in-out infinite',
    animationDelay: `${index * 0.1}s`,
  });

  const buttonStyle = {
    height: '2.75rem',
    width: '150px',
    backgroundColor: COLORS.background.offWhite,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.lg,
    animation: 'pulse 1.5s ease-in-out infinite',
  };

  return (
    <div style={containerStyle}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} style={fieldContainerStyle}>
          {/* Label */}
          <div style={labelStyle} />
          {/* Input */}
          <div style={getInputStyle(index)} />
        </div>
      ))}

      {/* Submit Button */}
      <div style={buttonStyle} />

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

/**
 * SkeletonCards - Grid of card skeletons
 */
export const SkeletonCards = ({ count = 6, columns = 3 }) => {
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${100 / columns}%, 1fr))`,
    gap: SPACING.lg,
    padding: SPACING.md,
  };

  const getCardStyle = (index) => ({
    height: '200px',
    backgroundColor: COLORS.background.offWhite,
    borderRadius: BORDER_RADIUS.md,
    animation: 'pulse 1.5s ease-in-out infinite',
    animationDelay: `${index * 0.1}s`,
  });

  return (
    <div style={gridStyle}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} style={getCardStyle(index)} />
      ))}

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

/**
 * SkeletonList - Simple list skeleton
 */
export const SkeletonList = ({ items = 8 }) => {
  const containerStyle = {
    padding: SPACING.md,
  };

  const getItemStyle = (index) => ({
    height: '4rem',
    backgroundColor: COLORS.background.offWhite,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
    animation: 'pulse 1.5s ease-in-out infinite',
    animationDelay: `${index * 0.05}s`,
  });

  return (
    <div style={containerStyle}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} style={getItemStyle(index)} />
      ))}

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

export default {
  SkeletonDashboard,
  SkeletonTable,
  SkeletonForm,
  SkeletonCards,
  SkeletonList,
};
