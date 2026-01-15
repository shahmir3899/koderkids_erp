// ============================================
// FORM MODAL - Gradient Design System
// Unified modal for all form operations
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import styles from './Modal.module.css';

/**
 * Unified form modal component for all form operations
 * Features: ESC key handler, circular close button with hover effect
 *
 * @param {boolean} show - Control modal visibility
 * @param {string} title - Modal title
 * @param {string} subtitle - Optional subtitle text
 * @param {function} onClose - Close handler
 * @param {function} onSubmit - Form submit handler
 * @param {boolean} isLoading - Loading state for submit button
 * @param {string} submitText - Submit button text (default: 'Save')
 * @param {string} cancelText - Cancel button text (default: 'Cancel')
 * @param {string} size - Modal size: 'sm', 'md', 'lg' (default: 'lg')
 * @param {string} variant - Submit button variant: 'primary', 'danger', 'success' (default: 'primary')
 * @param {React.ReactNode} children - Form content
 */
export const FormModal = ({
  show,
  title,
  subtitle,
  onClose,
  onSubmit,
  isLoading = false,
  submitText = 'Save',
  cancelText = 'Cancel',
  children,
  size = 'lg',
  variant = 'primary',
}) => {
  const [closeButtonHovered, setCloseButtonHovered] = useState(false);

  // Handle ESC key to close modal
  const handleEscKey = useCallback((e) => {
    if (e.key === 'Escape' && !isLoading) {
      onClose();
    }
  }, [onClose, isLoading]);

  useEffect(() => {
    if (show) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [show, handleEscKey]);

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
        className={`${styles.modal} ${styles[`modal${size.charAt(0).toUpperCase() + size.slice(1)}`]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className={`${styles.closeButton} ${closeButtonHovered ? styles.closeButtonHovered : ''}`}
            onMouseEnter={() => setCloseButtonHovered(true)}
            onMouseLeave={() => setCloseButtonHovered(false)}
            aria-label="Close modal"
            title="Close (Esc)"
            type="button"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
            className={`${styles.button} ${styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`]}`}
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
