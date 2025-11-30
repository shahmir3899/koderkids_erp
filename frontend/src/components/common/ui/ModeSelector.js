// ============================================
// MODE SELECTOR - Radio Button Group Component
// ============================================
// Location: src/components/common/ui/ModeSelector.js

import React from 'react';

/**
 * ModeSelector Component - Radio button group for selecting modes
 * @param {Object} props
 * @param {string} props.value - Current selected value
 * @param {Function} props.onChange - Change handler (receives new value)
 * @param {Array} props.options - Array of {value, label, icon?} objects
 * @param {string} props.name - Radio group name (default: 'mode')
 * @param {string} props.layout - Layout: 'horizontal' | 'vertical' (default: 'horizontal')
 * @param {string} props.className - Additional CSS classes
 */
export const ModeSelector = ({
  value,
  onChange,
  options = [],
  name = 'mode',
  layout = 'horizontal',
  className = '',
}) => {
  const containerStyle = {
    display: 'flex',
    flexDirection: layout === 'vertical' ? 'column' : 'row',
    gap: '1rem',
    alignItems: layout === 'vertical' ? 'flex-start' : 'center',
  };

  const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    transition: 'background-color 0.15s ease',
    fontSize: '0.875rem',
    color: '#374151',
  };

  const labelActiveStyle = {
    ...labelStyle,
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    fontWeight: '500',
  };

  const radioStyle = {
    width: '16px',
    height: '16px',
    accentColor: '#3B82F6',
    cursor: 'pointer',
  };

  return (
    <div style={containerStyle} className={className} role="radiogroup">
      {options.map((option) => (
        <label
          key={option.value}
          style={value === option.value ? labelActiveStyle : labelStyle}
          onMouseEnter={(e) => {
            if (value !== option.value) {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }
          }}
          onMouseLeave={(e) => {
            if (value !== option.value) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            style={radioStyle}
            aria-label={option.label}
          />
          {option.icon && <span>{option.icon}</span>}
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
};

export default ModeSelector;