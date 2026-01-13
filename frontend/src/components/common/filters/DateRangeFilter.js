// ============================================
// DATE RANGE FILTER - Start/End Date Picker
// ============================================
// Location: src/components/common/filters/DateRangeFilter.js

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
 * DateRangeFilter Component - Provides start and end date inputs
 * @param {Object} props
 * @param {string} props.startDate - Start date value (YYYY-MM-DD)
 * @param {string} props.endDate - End date value (YYYY-MM-DD)
 * @param {Function} props.onStartDateChange - Callback when start date changes
 * @param {Function} props.onEndDateChange - Callback when end date changes
 * @param {string} props.startLabel - Label for start date (default: 'Start Date')
 * @param {string} props.endLabel - Label for end date (default: 'End Date')
 * @param {boolean} props.required - Whether fields are required (default: false)
 * @param {boolean} props.inline - Display inline (default: false)
 * @param {string} props.className - Additional CSS classes
 */
export const DateRangeFilter = ({
  startDate = '',
  endDate = '',
  onStartDateChange,
  onEndDateChange,
  startLabel = 'Start Date',
  endLabel = 'End Date',
  required = false,
  inline = false,
  className = '',
}) => {
  const containerStyle = {
    display: inline ? 'flex' : 'contents',
    gap: inline ? SPACING.sm : undefined,
  };

  const fieldStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
  };

  const labelStyle = {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.primary,
  };

  const inputStyle = {
    width: '100%',
    padding: `${SPACING.xs} ${SPACING.sm}`,
    border: `1px solid ${COLORS.border.light}`,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.white,
    transition: `border-color ${TRANSITIONS.fast} ease, box-shadow ${TRANSITIONS.fast} ease`,
    outline: 'none',
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = COLORS.status.info;
    e.target.style.boxShadow = `0 0 0 3px rgba(59, 130, 246, 0.1)`;
  };

  const handleBlur = (e) => {
    e.target.style.borderColor = COLORS.border.light;
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={containerStyle} className={className}>
      {/* Start Date */}
      <div style={fieldStyle}>
        <label style={labelStyle}>
          {startLabel}
          {required && <span style={{ color: COLORS.status.error, marginLeft: '4px' }}>*</span>}
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required={required}
        />
      </div>

      {/* End Date */}
      <div style={fieldStyle}>
        <label style={labelStyle}>
          {endLabel}
          {required && <span style={{ color: COLORS.status.error, marginLeft: '4px' }}>*</span>}
        </label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          min={startDate || undefined}
          required={required}
        />
      </div>
    </div>
  );
};

export default DateRangeFilter;
