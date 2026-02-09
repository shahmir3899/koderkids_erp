// ============================================
// SEGMENTED CONTROL - Glassmorphism Design
// ============================================
// Location: src/components/common/ui/SegmentedControl.js
//
// A reusable segmented control component for switching between options.
// Uses glassmorphism styling to match the design system.

import React from 'react';

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
} from '../../../utils/designConstants';

/**
 * SegmentedControl - A pill-shaped toggle for switching between options
 *
 * @param {string} value - Currently selected value
 * @param {function} onChange - Callback when selection changes (receives new value)
 * @param {Array} options - Array of { value, label, icon? } objects
 * @param {string} size - Size variant: 'sm', 'md', 'lg' (default: 'md')
 * @param {boolean} fullWidth - Whether to stretch to full width (default: false)
 */
export const SegmentedControl = ({
  value,
  onChange,
  options = [],
  size = 'md',
  fullWidth = false,
}) => {
  // Size configurations
  const sizeConfig = {
    sm: {
      padding: `${SPACING.xs} ${SPACING.md}`,
      fontSize: FONT_SIZES.sm,
      gap: SPACING.xs,
      containerPadding: SPACING.xs,
    },
    md: {
      padding: `${SPACING.sm} ${SPACING.lg}`,
      fontSize: FONT_SIZES.base,
      gap: SPACING.xs,
      containerPadding: SPACING.xs,
    },
    lg: {
      padding: `${SPACING.md} ${SPACING.xl}`,
      fontSize: FONT_SIZES.md,
      gap: SPACING.sm,
      containerPadding: SPACING.sm,
    },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  const containerStyle = {
    display: 'inline-flex',
    gap: config.gap,
    padding: config.containerPadding,
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BORDER_RADIUS.xl,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    width: fullWidth ? '100%' : 'auto',
  };

  const getButtonStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: config.padding,
    fontSize: config.fontSize,
    fontWeight: FONT_WEIGHTS.semibold,
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    cursor: 'pointer',
    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.85)' : 'transparent',
    color: isActive ? COLORS.text.white : COLORS.text.whiteSubtle,
    transition: `all ${TRANSITIONS.normal}`,
    backdropFilter: isActive ? 'blur(8px)' : 'none',
    WebkitBackdropFilter: isActive ? 'blur(8px)' : 'none',
    boxShadow: isActive
      ? '0 4px 15px rgba(59, 130, 246, 0.35)'
      : 'none',
    flex: fullWidth ? 1 : 'none',
    whiteSpace: 'nowrap',
  });

  const iconStyle = {
    fontSize: config.fontSize,
    lineHeight: 1,
  };

  return (
    <div style={containerStyle} role="tablist">
      {options.map((option) => {
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            style={getButtonStyle(isActive)}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = COLORS.text.white;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = COLORS.text.whiteSubtle;
              }
            }}
          >
            {option.icon && <span style={iconStyle}>{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
