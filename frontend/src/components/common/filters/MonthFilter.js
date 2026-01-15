// ============================================
// MONTH FILTER - Month Picker Component (Glassmorphism)
// ============================================

import React from 'react';
import moment from 'moment';
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
 * MonthFilter Component
 * @param {Object} props
 * @param {string} props.value - Selected month in YYYY-MM format
 * @param {Function} props.onChange - Change handler (receives month string)
 * @param {boolean} props.disabled - Disable input (default: false)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.label - Label text (optional)
 * @param {boolean} props.required - Mark as required (default: false)
 * @param {string} props.min - Minimum month (YYYY-MM format) (optional)
 * @param {string} props.max - Maximum month (YYYY-MM format) (optional)
 * @param {boolean} props.defaultToCurrent - Set to current month on mount (default: false)
 */
export const MonthFilter = ({
  value,
  onChange,
  disabled = false,
  className = '',
  label = '',
  required = false,
  min = null,
  max = null,
  defaultToCurrent = false,
}) => {
  // Set to current month if defaultToCurrent is true and value is empty
  React.useEffect(() => {
    if (defaultToCurrent && !value) {
      const currentMonth = moment().format('YYYY-MM');
      onChange(currentMonth);
    }
  }, [defaultToCurrent, value, onChange]);

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const inputStyle = {
    width: '100%',
    padding: SPACING.sm,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: `border-color ${TRANSITIONS.normal} ease`,
    opacity: disabled ? 0.6 : 1,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: SPACING.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
  };

  return (
    <div className={className}>
      {label && (
        <label htmlFor="month-filter" style={labelStyle}>
          {label} {required && <span style={{ color: COLORS.status.error }}>*</span>}
        </label>
      )}
      <input
        id="month-filter"
        type="month"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        min={min}
        max={max}
        style={inputStyle}
        onFocus={(e) => { e.target.style.borderColor = COLORS.primary; e.target.style.boxShadow = '0 0 0 3px rgba(176, 97, 206, 0.3)'; }}
        onBlur={(e) => { e.target.style.borderColor = COLORS.border.whiteTransparent; e.target.style.boxShadow = 'none'; }}
        required={required}
      />
    </div>
  );
};

export default MonthFilter;
