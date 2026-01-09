import React from 'react';
import styles from './Modal.module.css';

/**
 * Unified form modal component for all form operations
 * Replaces both Bootstrap Modal and custom overlay divs
 *
 * @param {boolean} show - Control modal visibility
 * @param {string} title - Modal title
 * @param {function} onClose - Close handler
 * @param {function} onSubmit - Form submit handler
 * @param {boolean} isLoading - Loading state for submit button
 * @param {string} submitText - Submit button text (default: 'Save')
 * @param {string} cancelText - Cancel button text (default: 'Cancel')
 * @param {string} size - Modal size: 'sm', 'md', 'lg' (default: 'lg')
 * @param {string} variant - Submit button variant: 'primary', 'danger' (default: 'primary')
 * @param {React.ReactNode} children - Form content
 */
export const FormModal = ({
  show,
  title,
  onClose,
  onSubmit,
  isLoading = false,
  submitText = 'Save',
  cancelText = 'Cancel',
  children,
  size = 'lg',
  variant = 'primary',
}) => {
  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles[`modal-${size}`]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close modal"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Body with Form */}
        <div className={styles.body}>
          <form onSubmit={handleSubmit} id="modal-form">
            {children}
          </form>
        </div>

        {/* Footer - Outside of form */}
        <div className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            className={styles.buttonSecondary}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="submit"
            form="modal-form"
            className={`${styles.button} ${styles[`button-${variant}`]}`}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : submitText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormModal;
