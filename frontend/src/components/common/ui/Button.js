// ============================================
// BUTTON - Reusable Button Component
// Glassmorphism Design System
// ============================================

import React, { useState } from 'react';
import { InlineSpinner } from './LoadingSpinner';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  TOUCH_TARGETS,
} from '../../../utils/designConstants';

/**
 * Button Component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - 'primary', 'secondary', 'danger', 'success', 'warning', 'ghost' (default: 'primary')
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
  style = {},
  ...rest
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Variant styles using design constants - improved for glassmorphism
  const variantStyles = {
    primary: {
      backgroundColor: COLORS.status.info,
      hoverBackground: COLORS.status.infoDark,
      color: COLORS.text.white,
      border: 'none',
      boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
      hoverShadow: '0 6px 20px rgba(59, 130, 246, 0.5)',
    },
    secondary: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      hoverBackground: 'rgba(255, 255, 255, 0.25)',
      color: COLORS.text.white,
      border: `1px solid ${COLORS.border.whiteTransparent}`,
      boxShadow: 'none',
      hoverShadow: '0 4px 15px rgba(255, 255, 255, 0.1)',
    },
    danger: {
      backgroundColor: COLORS.status.error,
      hoverBackground: COLORS.status.errorDark,
      color: COLORS.text.white,
      border: 'none',
      boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
      hoverShadow: '0 6px 20px rgba(239, 68, 68, 0.5)',
    },
    success: {
      backgroundColor: COLORS.status.success,
      hoverBackground: COLORS.status.successDark,
      color: COLORS.text.white,
      border: 'none',
      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
      hoverShadow: '0 6px 20px rgba(16, 185, 129, 0.5)',
    },
    warning: {
      backgroundColor: COLORS.status.warning,
      hoverBackground: COLORS.status.warningDark,
      color: COLORS.text.white,
      border: 'none',
      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
      hoverShadow: '0 6px 20px rgba(245, 158, 11, 0.5)',
    },
    ghost: {
      backgroundColor: 'transparent',
      hoverBackground: 'rgba(255, 255, 255, 0.1)',
      color: COLORS.text.white,
      border: `1px solid transparent`,
      boxShadow: 'none',
      hoverShadow: 'none',
    },
  };

  // Size styles using design constants with touch-friendly minimum heights
  const sizeStyles = {
    small: {
      padding: `${SPACING.xs} ${SPACING.md}`,
      fontSize: FONT_SIZES.sm,
      borderRadius: BORDER_RADIUS.sm,
      minHeight: TOUCH_TARGETS.minimum, // 44px min for accessibility
    },
    medium: {
      padding: `${SPACING.sm} ${SPACING.lg}`,
      fontSize: FONT_SIZES.sm,
      borderRadius: BORDER_RADIUS.md,
      minHeight: TOUCH_TARGETS.minimum, // 44px min for accessibility
    },
    large: {
      padding: `${SPACING.md} ${SPACING.xl}`,
      fontSize: FONT_SIZES.base,
      borderRadius: BORDER_RADIUS.md,
      minHeight: TOUCH_TARGETS.large, // 48px for large buttons
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.primary;
  const currentSize = sizeStyles[size] || sizeStyles.medium;

  const isDisabledOrLoading = disabled || loading;
  const showHoverState = isHovered && !isDisabledOrLoading;

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: isDisabledOrLoading ? 'not-allowed' : 'pointer',
    transition: `all ${TRANSITIONS.normal} ease`,
    opacity: isDisabledOrLoading ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    whiteSpace: 'nowrap',
    ...currentSize,
    backgroundColor: showHoverState ? currentVariant.hoverBackground : currentVariant.backgroundColor,
    color: currentVariant.color,
    border: currentVariant.border,
    boxShadow: showHoverState ? currentVariant.hoverShadow : currentVariant.boxShadow,
    transform: showHoverState ? 'translateY(-2px)' : 'translateY(0)',
    // Touch-friendly properties
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    ...style,
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...rest}
    >
      {loading && <InlineSpinner color={currentVariant.color} size={16} />}
      {!loading && icon && icon}
      {children}
    </button>
  );
};

export default Button;
