import React from 'react';
import styles from './QuickActions.module.css';

/**
 * Quick action/template buttons
 * Used for: notification templates, task quick templates
 *
 * @param {Array} actions - Array of {id, name, label, icon}
 * @param {string} label - Optional label for the action group
 * @param {function} onAction - Callback when an action is clicked
 */
export const QuickActions = ({
  actions,
  label = null,
  onAction,
}) => {
  return (
    <div className={styles.container}>
      {label && <p className={styles.label}>{label}</p>}
      <div className={styles.grid}>
        {actions.map((action) => (
          <button
            key={action.id || action.name}
            type="button"
            onClick={() => onAction(action)}
            className={styles.button}
          >
            {action.icon && <span className={styles.icon}>{action.icon}</span>}
            <span className={styles.buttonLabel}>{action.label || action.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
