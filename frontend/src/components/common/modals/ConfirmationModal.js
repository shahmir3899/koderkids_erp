// ============================================
// CONFIRMATION MODAL - Reusable Component
// For delete confirmations, warnings, and other confirm actions
// ============================================

import React, { useEffect, useCallback } from 'react';

/**
 * ConfirmationModal Component
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {string} title - Modal title (e.g., "Delete Student")
 * @param {string} message - Confirmation message
 * @param {string} itemName - Name of item being acted upon (displayed in bold)
 * @param {string} confirmText - Text for confirm button (default: "Delete")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} variant - Style variant: "danger" | "warning" | "info" (default: "danger")
 * @param {boolean} isLoading - Show loading state on confirm button
 * @param {function} onConfirm - Callback when confirmed
 * @param {function} onCancel - Callback when cancelled
 */
export function ConfirmationModal({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  itemName = '',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  // ============================================
  // HOOKS MUST BE CALLED BEFORE ANY EARLY RETURN
  // ============================================

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading, onCancel]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onCancel();
    }
  }, [isLoading, onCancel]);

  // ============================================
  // EARLY RETURN - After all hooks
  // ============================================
  if (!isOpen) return null;

  // Variant styles
  const variantStyles = {
    danger: {
      icon: '⚠️',
      iconBg: '#FEE2E2',
      iconColor: '#DC2626',
      confirmBg: '#DC2626',
      confirmHoverBg: '#B91C1C',
    },
    warning: {
      icon: '⚡',
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      confirmBg: '#D97706',
      confirmHoverBg: '#B45309',
    },
    info: {
      icon: 'ℹ️',
      iconBg: '#DBEAFE',
      iconColor: '#2563EB',
      confirmBg: '#2563EB',
      confirmHoverBg: '#1D4ED8',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.danger;

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '400px',
          width: '100%',
          overflow: 'hidden',
          animation: 'modalSlideIn 0.2s ease-out',
        }}
      >
        {/* Modal Content */}
        <div style={{ padding: '1.5rem' }}>
          {/* Icon */}
          <div
            style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
              backgroundColor: currentVariant.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '1.5rem',
            }}
          >
            {currentVariant.icon}
          </div>

          {/* Title */}
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              textAlign: 'center',
              marginBottom: '0.5rem',
            }}
          >
            {title}
          </h3>

          {/* Message */}
          <p
            style={{
              fontSize: '0.875rem',
              color: '#6B7280',
              textAlign: 'center',
              lineHeight: '1.5',
              marginBottom: itemName ? '0.5rem' : '0',
            }}
          >
            {message}
          </p>

          {/* Item Name */}
          {itemName && (
            <p
              style={{
                fontSize: '0.9375rem',
                fontWeight: '600',
                color: '#111827',
                textAlign: 'center',
                padding: '0.5rem',
                backgroundColor: '#F3F4F6',
                borderRadius: '0.375rem',
                marginTop: '0.75rem',
              }}
            >
              {itemName}
            </p>
          )}
        </div>

        {/* Modal Actions */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            padding: '1rem 1.5rem',
            backgroundColor: '#F9FAFB',
            borderTop: '1px solid #E5E7EB',
          }}
        >
          {/* Cancel Button */}
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '0.625rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              backgroundColor: 'white',
              border: '1px solid #D1D5DB',
              borderRadius: '0.5rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              opacity: isLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = '#F3F4F6';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'white';
            }}
          >
            {cancelText}
          </button>

          {/* Confirm Button */}
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '0.625rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              backgroundColor: isLoading ? '#9CA3AF' : currentVariant.confirmBg,
              border: 'none',
              borderRadius: '0.5rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = currentVariant.confirmHoverBg;
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = currentVariant.confirmBg;
              }
            }}
          >
            {isLoading ? (
              <>
                <span
                  style={{
                    width: '1rem',
                    height: '1rem',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>

      {/* Keyframe Animations */}
      <style>
        {`
          @keyframes modalSlideIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(-10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}

export default ConfirmationModal;