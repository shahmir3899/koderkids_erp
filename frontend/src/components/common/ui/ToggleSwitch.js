// ============================================
// TOGGLE SWITCH - Reusable Toggle Component
// ============================================
// Location: src/components/common/ui/ToggleSwitch.js

import React from 'react';
import {
  COLORS,
  TRANSITIONS,
  SHADOWS,
} from '../../../utils/designConstants';

/**
 * ToggleSwitch Component - A styled toggle/switch input
 * @param {Object} props
 * @param {boolean} props.checked - Whether the toggle is on
 * @param {Function} props.onChange - Change handler
 * @param {string} props.label - Accessible label (for screen readers)
 * @param {string} props.size - Size: 'small' | 'medium' | 'large' (default: 'medium')
 * @param {boolean} props.disabled - Whether the toggle is disabled
 * @param {string} props.onColor - Color when on (default: '#3B82F6')
 * @param {string} props.offColor - Color when off (default: '#D1D5DB')
 * @param {string} props.className - Additional CSS classes
 */
export const ToggleSwitch = ({
  checked = false,
  onChange,
  label = 'Toggle',
  size = 'medium',
  disabled = false,
  onColor = COLORS.status.info,
  offColor = COLORS.border.light,
  className = '',
}) => {
  // Size configurations
  const sizes = {
    small: { width: 32, height: 16, knob: 12 },
    medium: { width: 40, height: 20, knob: 16 },
    large: { width: 52, height: 26, knob: 22 },
  };

  const { width, height, knob } = sizes[size] || sizes.medium;
  const translateX = width - knob - 4;

  const containerStyle = {
    position: 'relative',
    display: 'inline-block',
    width: `${width}px`,
    height: `${height}px`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };

  const inputStyle = {
    opacity: 0,
    width: 0,
    height: 0,
    position: 'absolute',
  };

  const sliderStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: checked ? onColor : offColor,
    borderRadius: `${height}px`,
    transition: `background-color ${TRANSITIONS.slow} ease`,
  };

  const knobStyle = {
    position: 'absolute',
    content: '',
    height: `${knob}px`,
    width: `${knob}px`,
    left: '2px',
    bottom: '2px',
    backgroundColor: COLORS.text.white,
    borderRadius: '50%',
    transition: `transform ${TRANSITIONS.slow} ease`,
    transform: checked ? `translateX(${translateX}px)` : 'translateX(0)',
    boxShadow: SHADOWS.sm,
  };

  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div
      style={containerStyle}
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      tabIndex={disabled ? -1 : 0}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => {}}
        style={inputStyle}
        disabled={disabled}
        aria-hidden="true"
        tabIndex={-1}
      />
      <span style={sliderStyle}>
        <span style={knobStyle} />
      </span>
    </div>
  );
};

export default ToggleSwitch;