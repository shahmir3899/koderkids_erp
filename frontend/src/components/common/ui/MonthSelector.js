// ============================================
// MONTH SELECTOR - Reusable Component
// ============================================
// Location: frontend/src/components/common/ui/MonthSelector.js

import React, { useMemo } from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../../utils/designConstants';

/**
 * MonthSelector Component
 * Reusable month dropdown with design constants
 *
 * @param {Object} props
 * @param {string} props.value - Selected month (YYYY-MM format)
 * @param {Function} props.onChange - Change handler (receives month value)
 * @param {string} props.label - Optional label text
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.required - Required field indicator
 * @param {number} props.monthsCount - Number of months to show (default: 12)
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.variant - Style variant: 'light' (default) or 'glass' for glassmorphic dark theme
 * @param {Object} props.style - Custom styles to override defaults
 */
export const MonthSelector = ({
  value,
  onChange,
  label,
  disabled = false,
  required = false,
  monthsCount = 12,
  placeholder = 'Select Month',
  variant = 'light',
  style = {},
}) => {
  // Generate past months dynamically
  const months = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 0; i < monthsCount; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const display = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      result.push({ value: yearMonth, label: display });
    }
    return result;
  }, [monthsCount]);

  const isGlass = variant === 'glass';

  const containerStyle = isGlass ? styles.containerGlass : styles.container;
  const labelStyle = isGlass ? styles.labelGlass : styles.label;
  const selectStyle = isGlass ? styles.selectGlass : styles.select;
  const disabledStyle = isGlass ? styles.selectDisabledGlass : styles.selectDisabled;
  const optionStyle = isGlass ? styles.optionGlass : styles.option;

  return (
    <div style={{ ...containerStyle, ...style }}>
      {label && (
        <label style={labelStyle}>
          {label}
          {required && <span style={styles.required}>*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          ...selectStyle,
          ...(disabled && disabledStyle),
        }}
      >
        <option value="" style={optionStyle}>{placeholder}</option>
        {months.map((month) => (
          <option key={month.value} value={month.value} style={optionStyle}>
            {month.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const styles = {
  // Light theme (default)
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  required: {
    color: COLORS.status.error,
    marginLeft: SPACING.xs,
  },
  select: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    border: `1px solid ${COLORS.border.default}`,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.white,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
  },
  selectDisabled: {
    backgroundColor: COLORS.background.lightGray,
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  option: {
    backgroundColor: COLORS.background.white,
    color: COLORS.text.primary,
  },

  // Glassmorphic dark theme
  containerGlass: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
  },
  labelGlass: {
    display: 'block',
    marginBottom: SPACING.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
  },
  selectGlass: {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.lg}`,
    ...MIXINS.glassmorphicSelect,
    borderRadius: BORDER_RADIUS.md,
    fontSize: '16px', // Prevent iOS zoom
    color: COLORS.text.white,
    cursor: 'pointer',
    outline: 'none',
    transition: TRANSITIONS.normal,
    minHeight: '44px', // Touch-friendly
    fontFamily: 'Inter, sans-serif',
  },
  selectDisabledGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  optionGlass: {
    background: '#4a3570',
    color: '#ffffff',
  },
};

export default MonthSelector;
