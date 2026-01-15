// ============================================
// CONFIRMATION MODAL - Reusable Component
// For delete confirmations, warnings, and other confirm actions
// ============================================

import React, { useEffect, useCallback } from 'react';
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

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: COLORS.background.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: Z_INDEX.modal,
        padding: SPACING.sm,
      }}
    >
      <div
        style={{
          backgroundColor: COLORS.background.white,
          borderRadius: BORDER_RADIUS.lg,
          boxShadow: SHADOWS.xl,
          maxWidth: isMobile ? '95vw' : '400px',
          width: '100%',
          overflow: 'hidden',
          animation: 'modalSlideIn 0.2s ease-out',
          margin: isMobile ? SPACING.sm : 0,
        }}
      >
        {/* Modal Content */}
        <div style={{ padding: SPACING.md }}>
          {/* Icon */}
          <div
            style={{
              width: '3rem',
              height: '3rem',
              borderRadius: BORDER_RADIUS.full,
              backgroundColor: currentVariant.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: `0 auto ${SPACING.sm}`,
              fontSize: FONT_SIZES['2xl'],
            }}
          >
            {currentVariant.icon}
          </div>

          {/* Title */}
          <h3
            style={{
              fontSize: FONT_SIZES.xl,
              fontWeight: FONT_WEIGHTS.semibold,
              color: COLORS.text.primary,
              textAlign: 'center',
              marginBottom: SPACING.xs,
            }}
          >
            {title}
          </h3>

          {/* Message */}
          <p
            style={{
              fontSize: FONT_SIZES.sm,
              color: COLORS.text.secondary,
              textAlign: 'center',
              lineHeight: '1.5',
              marginBottom: itemName ? SPACING.xs : '0',
            }}
          >
            {message}
          </p>

          {/* Item Name */}
          {itemName && (
            <p
              style={{
                fontSize: FONT_SIZES.md,
                fontWeight: FONT_WEIGHTS.semibold,
                color: COLORS.text.primary,
                textAlign: 'center',
                padding: SPACING.xs,
                backgroundColor: COLORS.background.offWhite,
                borderRadius: BORDER_RADIUS.sm,
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
            flexDirection: isMobile ? 'column-reverse' : 'row',
            gap: isMobile ? SPACING.sm : '0.75rem',
            padding: `${SPACING.sm} ${SPACING.md}`,
            backgroundColor: COLORS.background.lightGray,
            borderTop: `1px solid ${COLORS.border.light}`,
          }}
        >
          {/* Cancel Button */}
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: `0.625rem ${SPACING.sm}`,
              fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.sm,
              fontWeight: FONT_WEIGHTS.medium,
              color: COLORS.text.secondary,
              backgroundColor: COLORS.background.white,
              border: `1px solid ${COLORS.border.light}`,
              borderRadius: BORDER_RADIUS.sm,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: `all ${TRANSITIONS.fast} ease`,
              opacity: isLoading ? 0.6 : 1,
              minHeight: isMobile ? TOUCH_TARGETS.large : TOUCH_TARGETS.minimum,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = COLORS.background.offWhite;
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = COLORS.background.white;
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
              padding: `0.625rem ${SPACING.sm}`,
              fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.sm,
              fontWeight: FONT_WEIGHTS.medium,
              color: COLORS.text.white,
              backgroundColor: isLoading ? COLORS.text.tertiary : currentVariant.confirmBg,
              border: 'none',
              borderRadius: BORDER_RADIUS.sm,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: `all ${TRANSITIONS.fast} ease`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SPACING.xs,
              minHeight: isMobile ? TOUCH_TARGETS.large : TOUCH_TARGETS.minimum,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
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
    </div>
  );
}

export default ConfirmationModal;