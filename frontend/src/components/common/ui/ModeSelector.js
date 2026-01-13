// ============================================
// MODE SELECTOR - Radio Button Group Component
// ============================================
// Location: src/components/common/ui/ModeSelector.js

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
    gap: SPACING.sm,
    alignItems: layout === 'vertical' ? 'flex-start' : 'center',
  };

  const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
    cursor: 'pointer',
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.sm,
    transition: `background-color ${TRANSITIONS.fast} ease`,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.primary,
  };

  const labelActiveStyle = {
    ...labelStyle,
    backgroundColor: COLORS.status.infoLight,
    color: COLORS.status.infoDarker,
    fontWeight: FONT_WEIGHTS.medium,
  };

  const radioStyle = {
    width: '16px',
    height: '16px',
    accentColor: COLORS.status.info,
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
              e.currentTarget.style.backgroundColor = COLORS.background.offWhite;
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
