// ============================================
// EMAIL PROMPT MODAL - Beautiful notification for missing email
// Shown when student uploads progress but has no email configured
// ============================================

import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  Z_INDEX,
  SHADOWS,
  MIXINS,
} from '../../../utils/designConstants';

/**
 * EmailPromptModal Component
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Callback to close the modal
 * @param {string} settingsPath - Path to settings page (default: '/student/settings')
 */
export function EmailPromptModal({
  isOpen,
  onClose,
  settingsPath = '/student/settings',
}) {
  const navigate = useNavigate();

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle go to settings
  const handleGoToSettings = () => {
    onClose();
    navigate(settingsPath);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={handleBackdropClick}>
      <div style={styles.modal}>
        {/* Close Button */}
        <button style={styles.closeButton} onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div style={styles.iconContainer}>
          <div style={styles.iconCircle}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <h2 style={styles.title}>Stay Connected!</h2>

        <p style={styles.message}>
          Your progress was uploaded successfully, but we couldn't send you a confirmation email.
        </p>

        <p style={styles.submessage}>
          Add your email address in Settings to receive progress updates and important notifications.
        </p>

        {/* Benefits List */}
        <div style={styles.benefitsList}>
          <div style={styles.benefitItem}>
            <span style={styles.benefitIcon}>+</span>
            <span>Receive progress summaries</span>
          </div>
          <div style={styles.benefitItem}>
            <span style={styles.benefitIcon}>+</span>
            <span>Get lesson plan updates</span>
          </div>
          <div style={styles.benefitItem}>
            <span style={styles.benefitIcon}>+</span>
            <span>Track your achievements</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.buttonContainer}>
          <button style={styles.primaryButton} onClick={handleGoToSettings}>
            Go to Settings
          </button>
          <button style={styles.secondaryButton} onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: Z_INDEX?.modal || 1000,
    padding: SPACING.lg,
  },
  modal: {
    ...MIXINS.glassmorphicCard,
    position: 'relative',
    width: '100%',
    maxWidth: '400px',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    textAlign: 'center',
    animation: 'slideUp 0.3s ease-out',
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    background: 'transparent',
    border: 'none',
    color: COLORS.text.whiteSubtle,
    cursor: 'pointer',
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    transition: `all ${TRANSITIONS.base}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: SPACING.lg,
  },
  iconCircle: {
    width: '72px',
    height: '72px',
    borderRadius: BORDER_RADIUS.full,
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
    border: '2px solid rgba(59, 130, 246, 0.4)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: COLORS.accent.cyan,
  },
  title: {
    margin: `0 0 ${SPACING.sm} 0`,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    fontFamily: 'Inter, sans-serif',
  },
  message: {
    margin: `0 0 ${SPACING.sm} 0`,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.whiteMedium,
    lineHeight: 1.5,
  },
  submessage: {
    margin: `0 0 ${SPACING.lg} 0`,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    lineHeight: 1.5,
  },
  benefitsList: {
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    textAlign: 'left',
  },
  benefitItem: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: `${SPACING.xs} 0`,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
  },
  benefitIcon: {
    width: '20px',
    height: '20px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#10B981',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    flexShrink: 0,
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  primaryButton: {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.lg}`,
    backgroundColor: COLORS.primary,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.base}`,
    fontFamily: 'Inter, sans-serif',
  },
  secondaryButton: {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.lg}`,
    backgroundColor: 'transparent',
    color: COLORS.text.whiteSubtle,
    border: `1px solid rgba(255, 255, 255, 0.2)`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.base}`,
    fontFamily: 'Inter, sans-serif',
  },
};

// Add keyframes for animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('[data-email-prompt-modal-styles]')) {
  styleSheet.setAttribute('data-email-prompt-modal-styles', '');
  document.head.appendChild(styleSheet);
}

export default EmailPromptModal;
