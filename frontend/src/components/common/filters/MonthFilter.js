// ============================================
// MONTH FILTER - Month Picker Component
// ============================================

import React from 'react';
import moment from 'moment';

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
    padding: '0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    backgroundColor: disabled ? '#F3F4F6' : '#FFFFFF',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'border-color 0.2s ease',
  };

  return (
    <div className={className}>
      {label && (
        <label 
          htmlFor="month-filter" 
          style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}
        >
          {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
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
        onFocus={(e) => { e.target.style.borderColor = '#3B82F6'; }}
        onBlur={(e) => { e.target.style.borderColor = '#D1D5DB'; }}
        required={required}
      />
    </div>
  );
};

export default MonthFilter;