// ============================================
// CONFIRMATION MODAL - Reusable Component
// For delete confirmations, warnings, and other confirm actions
// ============================================

import React, { useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  Z_INDEX,
  SHADOWS,
  TOUCH_TARGETS,
  MIXINS,
} from '../../../utils/designConstants';
import { useResponsive } from '../../../hooks/useResponsive';

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

  // Responsive hook for mobile styling
  const { isMobile } = useResponsive();

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

  // Variant styles using design constants
  const variantStyles = {
    danger: {
      icon: '⚠️',
      iconBg: COLORS.status.errorLight,
      iconColor: COLORS.status.errorDark,
      confirmBg: COLORS.status.errorDark,
      confirmHoverBg: COLORS.status.errorDarker,
    },
    warning: {
      icon: '⚡',
      iconBg: COLORS.status.warningLight,
      iconColor: COLORS.status.warningDark,
      confirmBg: COLORS.status.warningDark,
      confirmHoverBg: COLORS.status.warningDarker,
    },
    info: {
      icon: 'ℹ️',
      iconBg: COLORS.status.infoLight,
      iconColor: COLORS.status.infoDark,
      confirmBg: COLORS.status.infoDark,
      confirmHoverBg: COLORS.status.infoDarker,
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.danger;

  return ReactDOM.createPortal(
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: Z_INDEX.modal,
        padding: SPACING.sm,
      }}
    >
      <div
        style={{
          ...MIXINS.glassmorphicCard,
          background: COLORS.background.gradient,
          borderRadius: BORDER_RADIUS.xl,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          maxWidth: isMobile ? '95vw' : '480px',
          width: '100%',
          overflow: 'hidden',
          animation: 'modalSlideIn 0.2s ease-out',
          margin: isMobile ? SPACING.sm : 0,
        }}
      >
        {/* Modal Content */}
        <div style={{ padding: SPACING.lg }}>
          {/* Icon */}
          <div
            style={{
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: BORDER_RADIUS.full,
              backgroundColor: currentVariant.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: `0 auto ${SPACING.md}`,
              fontSize: FONT_SIZES['2xl'],
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            }}
          >
            {currentVariant.icon}
          </div>

          {/* Title */}
          <h3
            style={{
              fontSize: FONT_SIZES.xl,
              fontWeight: FONT_WEIGHTS.semibold,
              color: COLORS.text.white,
              textAlign: 'center',
              marginBottom: SPACING.sm,
            }}
          >
            {title}
          </h3>

          {/* Message */}
          <div
            style={{
              fontSize: FONT_SIZES.sm,
              color: COLORS.text.whiteSubtle,
              textAlign: 'left',
              lineHeight: '1.6',
              marginBottom: itemName ? SPACING.sm : '0',
            }}
          >
            {message}
          </div>

          {/* Item Name */}
          {itemName && (
            <p
              style={{
                fontSize: FONT_SIZES.md,
                fontWeight: FONT_WEIGHTS.semibold,
                color: COLORS.text.white,
                textAlign: 'center',
                padding: SPACING.sm,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: BORDER_RADIUS.md,
                marginTop: SPACING.md,
                border: '1px solid rgba(255, 255, 255, 0.1)',
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
            flexDirection: isMobile ? 'column-reverse' : 'row',
            gap: isMobile ? SPACING.sm : SPACING.md,
            padding: SPACING.lg,
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Cancel Button */}
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: `${SPACING.sm} ${SPACING.md}`,
              fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.sm,
              fontWeight: FONT_WEIGHTS.medium,
              color: COLORS.text.white,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: BORDER_RADIUS.md,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: `all ${TRANSITIONS.fast} ease`,
              opacity: isLoading ? 0.6 : 1,
              minHeight: isMobile ? TOUCH_TARGETS.large : TOUCH_TARGETS.minimum,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
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
              padding: `${SPACING.sm} ${SPACING.md}`,
              fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.sm,
              fontWeight: FONT_WEIGHTS.medium,
              color: COLORS.text.white,
              backgroundColor: isLoading ? 'rgba(100, 100, 100, 0.5)' : currentVariant.confirmBg,
              border: 'none',
              borderRadius: BORDER_RADIUS.md,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: `all ${TRANSITIONS.fast} ease`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SPACING.xs,
              minHeight: isMobile ? TOUCH_TARGETS.large : TOUCH_TARGETS.minimum,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = currentVariant.confirmHoverBg;
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = currentVariant.confirmBg;
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
              }
            }}
          >
            {isLoading ? (
              <>
                <span
                  style={{
                    width: SPACING.sm,
                    height: SPACING.sm,
                    border: `2px solid ${COLORS.text.white}`,
                    borderTopColor: 'transparent',
                    borderRadius: BORDER_RADIUS.full,
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
    </div>,
    document.body
  );
}

export default ConfirmationModal;