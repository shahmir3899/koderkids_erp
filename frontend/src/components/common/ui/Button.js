// ============================================
// BUTTON - Reusable Button Component
// ============================================

import React from 'react';
import { InlineSpinner } from './LoadingSpinner';

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
  // Variant styles
  const variantStyles = {
    primary: {
      backgroundColor: '#3B82F6',
      color: '#FFFFFF',
      border: 'none',
      hover: '#2563EB',
    },
    secondary: {
      backgroundColor: '#FFFFFF',
      color: '#3B82F6',
      border: '1px solid #3B82F6',
      hover: '#F3F4F6',
    },
    danger: {
      backgroundColor: '#EF4444',
      color: '#FFFFFF',
      border: 'none',
      hover: '#DC2626',
    },
    success: {
      backgroundColor: '#10B981',
      color: '#FFFFFF',
      border: 'none',
      hover: '#059669',
    },
    warning: {
      backgroundColor: '#F59E0B',
      color: '#FFFFFF',
      border: 'none',
      hover: '#D97706',
    },
  };

  // Size styles
  const sizeStyles = {
    small: {
      padding: '0.5rem 1rem',
      fontSize: '0.875rem',
    },
    medium: {
      padding: '0.75rem 1.5rem',
      fontSize: '1rem',
    },
    large: {
      padding: '1rem 2rem',
      fontSize: '1.125rem',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.primary;
  const currentSize = sizeStyles[size] || sizeStyles.medium;

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontWeight: '500',
    borderRadius: '0.5rem',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
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