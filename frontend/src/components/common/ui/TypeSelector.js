import React from 'react';
import styles from './TypeSelector.module.css';

/**
 * Reusable type/option selector component
 * Used for: task types, notification types, priority levels
 *
 * @param {string} value - Currently selected value
 * @param {function} onChange - Callback when selection changes
 * @param {Array} options - Array of {value, label, icon, color}
 * @param {string} layout - 'grid' or 'list' (default: 'grid')
 * @param {string} label - Optional label for the selector
 * @param {boolean} required - Show required indicator
 */
export const TypeSelector = ({
  value,
  onChange,
  options,
  layout = 'grid',
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
      <div className={`${styles.optionsContainer} ${styles[`layout-${layout}`]}`}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`${styles.option} ${
              value === option.value ? styles.active : ''
            }`}
            style={
              value === option.value && option.color
                ? { borderColor: option.color, backgroundColor: `${option.color}15` }
                : {}
            }
          >
            {option.icon && <span className={styles.icon}>{option.icon}</span>}
            <span className={styles.optionLabel}>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TypeSelector;
