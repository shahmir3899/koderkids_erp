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
 */
export const MonthSelector = ({
  value,
  onChange,
  label,
  disabled = false,
  required = false,
  monthsCount = 12,
  placeholder = 'Select Month',
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

  return (
    <div style={styles.container}>
      {label && (
        <label style={styles.label}>
          {label}
          {required && <span style={styles.required}>*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          ...styles.select,
          ...(disabled && styles.selectDisabled),
        }}
      >
        <option value="">{placeholder}</option>
        {months.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const styles = {
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
};

export default MonthSelector;
