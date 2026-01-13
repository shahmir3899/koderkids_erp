// ============================================
// BUTTON - Reusable Button Component
// ============================================

import React from 'react';
import { InlineSpinner } from './LoadingSpinner';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
} from '../../../utils/designConstants';

/**
 * Button Component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - 'primary', 'secondary', 'danger', 'success' (default: 'primary')
 * @param {string} props.size - 'small', 'medium', 'large' (default: 'medium')
 * @param {boolean} props.loading - Show loading spinner (default: false)
 * @param {boolean} props.disabled - Disable button (default: false)
 * @param {boolean} props.fullWidth - Full width button (default: false)
 * @param {Function} props.onClick - Click handler
 * @param {string} props.type - Button type: 'button', 'submit', 'reset' (default: 'button')
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.icon - Icon element (optional)
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  icon = null,
  ...rest
}) => {
  // Variant styles using design constants
  const variantStyles = {
    primary: {
      backgroundColor: COLORS.status.info,
      color: COLORS.text.white,
      border: 'none',
      hover: COLORS.status.infoDark,
    },
    secondary: {
      backgroundColor: COLORS.background.white,
      color: COLORS.status.info,
      border: `1px solid ${COLORS.status.info}`,
      hover: COLORS.background.lightGray,
    },
    danger: {
      backgroundColor: COLORS.status.error,
      color: COLORS.text.white,
      border: 'none',
      hover: COLORS.status.errorDark,
    },
    success: {
      backgroundColor: COLORS.status.success,
      color: COLORS.text.white,
      border: 'none',
      hover: COLORS.status.successDark,
    },
    warning: {
      backgroundColor: COLORS.status.warning,
      color: COLORS.text.white,
      border: 'none',
      hover: COLORS.status.warningDark,
    },
  };

  // Size styles using design constants
  const sizeStyles = {
    small: {
      padding: `${SPACING.xs} ${SPACING.sm}`,
      fontSize: FONT_SIZES.sm,
    },
    medium: {
      padding: `${SPACING.xs} ${SPACING.md}`,
      fontSize: FONT_SIZES.lg,
    },
    large: {
      padding: `${SPACING.sm} ${SPACING.lg}`,
      fontSize: FONT_SIZES.xl,
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.primary;
  const currentSize = sizeStyles[size] || sizeStyles.medium;

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    fontWeight: FONT_WEIGHTS.medium,
    borderRadius: BORDER_RADIUS.sm,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: `all ${TRANSITIONS.normal} ease`,
    opacity: disabled || loading ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    ...currentSize,
    backgroundColor: currentVariant.backgroundColor,
    color: currentVariant.color,
    border: currentVariant.border,
  };

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      style={baseStyle}
      onClick={handleClick}
      disabled={disabled || loading}
      className={className}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = currentVariant.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = currentVariant.backgroundColor;
        }
      }}
      {...rest}
    >
      {loading && <InlineSpinner color={currentVariant.color} size={16} />}
      {!loading && icon && icon}
      {children}
    </button>
  );
};

export default Button;