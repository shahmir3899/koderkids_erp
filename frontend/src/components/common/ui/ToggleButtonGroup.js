import React from 'react';
import styles from './ToggleButtonGroup.module.css';

/**
 * Reusable toggle button group
 * Used for: recipient type (single/all), view modes, status filters
 *
 * @param {string} value - Currently selected value
 * @param {function} onChange - Callback when selection changes
 * @param {Array} options - Array of {value, label, icon}
 * @param {string} label - Optional label for the group
 * @param {boolean} required - Show required indicator
 */
export const ToggleButtonGroup = ({
  value,
  onChange,
  options,
  label = null,
  required = false,
}) => {
  return (
    <div className={styles.container}>
      {label && (
        <label className={styles.label}>
          {label} {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.group}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`${styles.button} ${
              value === option.value ? styles.active : ''
            }`}
          >
            {option.icon && <span className={styles.icon}>{option.icon}</span>}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ToggleButtonGroup;
