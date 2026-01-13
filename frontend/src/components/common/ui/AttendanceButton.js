// ============================================
// ATTENDANCE BUTTON - Toggle Present/Absent
// ============================================
// Location: src/components/common/ui/AttendanceButton.js

import React from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
} from '../../../utils/designConstants';

/**
 * AttendanceButton Component - Toggles between Present/Absent status
 * @param {Object} props
 * @param {string} props.status - Current status: 'Present' | 'Absent' | null
 * @param {Function} props.onChange - Callback when status changes
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {string} props.size - Size: 'small' | 'medium' | 'large' (default: 'medium')
 */
export const AttendanceButton = ({
  status,
  onChange,
  disabled = false,
  size = 'medium',
}) => {
  // Size configurations
  const sizes = {
    small: { padding: `0.25rem ${SPACING.xs}`, fontSize: FONT_SIZES.xs, minWidth: '80px' },
    medium: { padding: `0.375rem ${SPACING.sm}`, fontSize: FONT_SIZES.sm, minWidth: '100px' },
    large: { padding: `${SPACING.xs} ${SPACING.sm}`, fontSize: FONT_SIZES.base, minWidth: '120px' },
  };

  const { padding, fontSize, minWidth } = sizes[size] || sizes.medium;

  const getButtonStyle = () => {
    const baseStyle = {
      padding,
      fontSize,
      minWidth,
      fontWeight: FONT_WEIGHTS.semibold,
      border: 'none',
      borderRadius: BORDER_RADIUS.sm,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: `all ${TRANSITIONS.normal} ease`,
      opacity: disabled ? 0.6 : 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.25rem',
    };

    if (status === 'Present') {
      return {
        ...baseStyle,
        backgroundColor: COLORS.status.success,
        color: COLORS.text.white,
      };
    } else if (status === 'Absent') {
      return {
        ...baseStyle,
        backgroundColor: COLORS.status.error,
        color: COLORS.text.white,
      };
    } else {
      return {
        ...baseStyle,
        backgroundColor: COLORS.background.offWhite,
        color: COLORS.text.secondary,
        border: `1px solid ${COLORS.border.light}`,
      };
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (disabled) return;

    // Toggle logic: null -> Present -> Absent -> Present
    const newStatus = status === 'Present' ? 'Absent' : 'Present';
    onChange(newStatus);
  };

  const getIcon = () => {
    if (status === 'Present') return '✓';
    if (status === 'Absent') return '✗';
    return '○';
  };

  const getLabel = () => {
    if (status === 'Present') return 'Present';
    if (status === 'Absent') return 'Absent';
    return 'Set Status';
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={getButtonStyle()}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      aria-label={`Attendance status: ${status || 'Not set'}. Click to toggle.`}
    >
      <span>{getIcon()}</span>
      <span>{getLabel()}</span>
    </button>
  );
};

export default AttendanceButton;
