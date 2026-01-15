/**
 * BulkActionsBar Component
 * Path: frontend/src/components/fees/BulkActionsBar.js
 * Glassmorphism Design System
 */

import React, { useState } from 'react';

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../../hooks/useResponsive';

const BulkActionsBar = ({
  selectedCount,
  onBulkUpdate,
  onBulkDelete,
  loading,
}) => {
  const { isMobile } = useResponsive();
  const [bulkPaidAmount, setBulkPaidAmount] = useState('');
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleBulkUpdate = () => {
    onBulkUpdate(parseFloat(bulkPaidAmount));
    setBulkPaidAmount('');
    setShowUpdateConfirm(false);
  };

  const handleBulkDelete = () => {
    onBulkDelete();
    setShowDeleteConfirm(false);
  };

  if (selectedCount === 0) {
    return null;
  }

  const styles = {
    container: {
      background: 'rgba(59, 130, 246, 0.15)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: BORDER_RADIUS.xl,
      padding: isMobile ? SPACING.md : SPACING.lg,
      marginBottom: SPACING.lg,
    },
    content: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: SPACING.md,
      alignItems: 'center',
    },
    selectedInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.sm,
      color: '#93C5FD',
      fontWeight: FONT_WEIGHTS.medium,
      fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,
    },
    icon: {
      width: '20px',
      height: '20px',
    },
    inputGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.sm,
      flexWrap: isMobile ? 'wrap' : 'nowrap',
      flex: isMobile ? '1 1 100%' : '0 0 auto',
    },
    label: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.text.whiteMedium,
    },
    input: {
      padding: `${SPACING.sm} ${SPACING.md}`,
      borderRadius: BORDER_RADIUS.lg,
      border: '1px solid rgba(255, 255, 255, 0.2)',
      background: 'rgba(255, 255, 255, 0.1)',
      color: COLORS.text.white,
      fontSize: FONT_SIZES.base,
      width: isMobile ? '100%' : '128px',
      outline: 'none',
    },
    applyButton: {
      padding: `${SPACING.sm} ${SPACING.md}`,
      borderRadius: BORDER_RADIUS.lg,
      border: 'none',
      background: COLORS.primary,
      color: COLORS.text.white,
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.medium,
      cursor: 'pointer',
      transition: `all ${TRANSITIONS.normal}`,
      whiteSpace: 'nowrap',
      minWidth: isMobile ? '100%' : 'auto',
    },
    applyButtonDisabled: {
      background: 'rgba(255, 255, 255, 0.2)',
      cursor: 'not-allowed',
    },
    deleteButton: {
      padding: `${SPACING.sm} ${SPACING.md}`,
      borderRadius: BORDER_RADIUS.lg,
      border: 'none',
      background: COLORS.status.error,
      color: COLORS.text.white,
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.medium,
      cursor: 'pointer',
      transition: `all ${TRANSITIONS.normal}`,
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.sm,
      whiteSpace: 'nowrap',
      minWidth: isMobile ? '100%' : 'auto',
      justifyContent: 'center',
    },
    deleteButtonDisabled: {
      background: 'rgba(255, 255, 255, 0.2)',
      cursor: 'not-allowed',
    },
    deleteIcon: {
      width: '16px',
      height: '16px',
    },
  };

  return (
    <>
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.selectedInfo}>
            <svg style={styles.icon} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{selectedCount} record{selectedCount > 1 ? 's' : ''} selected</span>
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="bulk-amount" style={styles.label}>
              Set Paid Amount:
            </label>
            <input
              id="bulk-amount"
              type="number"
              value={bulkPaidAmount}
              onChange={(e) => setBulkPaidAmount(e.target.value)}
              placeholder="Enter amount"
              style={styles.input}
              min="0"
              step="0.01"
            />
            <button
              onClick={() => setShowUpdateConfirm(true)}
              disabled={!bulkPaidAmount || loading}
              style={{
                ...styles.applyButton,
                ...(!bulkPaidAmount || loading ? styles.applyButtonDisabled : {}),
              }}
            >
              Apply to Selected
            </button>
          </div>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading}
            style={{
              ...styles.deleteButton,
              ...(loading ? styles.deleteButtonDisabled : {}),
            }}
          >
            <svg style={styles.deleteIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Selected
          </button>
        </div>
      </div>

      {showUpdateConfirm && (
        <ConfirmModal
          title="Confirm Bulk Update"
          message={`Are you sure you want to update ${selectedCount} fee record${selectedCount > 1 ? 's' : ''} with paid amount PKR ${parseFloat(bulkPaidAmount).toFixed(2)}?`}
          confirmLabel="Update"
          confirmColor="blue"
          onConfirm={handleBulkUpdate}
          onCancel={() => setShowUpdateConfirm(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="Confirm Delete"
          message={`Are you sure you want to delete ${selectedCount} fee record${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmColor="red"
          onConfirm={handleBulkDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
};

const ConfirmModal = ({
  title,
  message,
  confirmLabel,
  confirmColor = 'blue',
  onConfirm,
  onCancel,
}) => {
  const { isMobile } = useResponsive();

  const getConfirmButtonColor = () => {
    switch (confirmColor) {
      case 'red':
        return COLORS.status.error;
      case 'green':
        return COLORS.status.success;
      default:
        return COLORS.primary;
    }
  };

  const styles = {
    overlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: SPACING.md,
    },
    modal: {
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
      backdropFilter: 'blur(20px)',
      borderRadius: BORDER_RADIUS.xl,
      border: '1px solid rgba(255, 255, 255, 0.1)',
      maxWidth: '400px',
      width: '100%',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    },
    content: {
      padding: SPACING.lg,
    },
    title: {
      fontSize: FONT_SIZES.lg,
      fontWeight: FONT_WEIGHTS.semibold,
      color: COLORS.text.white,
      marginBottom: SPACING.sm,
    },
    text: {
      color: COLORS.text.whiteMedium,
      marginBottom: SPACING.lg,
      fontSize: FONT_SIZES.base,
      lineHeight: 1.5,
    },
    buttons: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: SPACING.md,
      flexDirection: isMobile ? 'column-reverse' : 'row',
    },
    cancelButton: {
      padding: `${SPACING.sm} ${SPACING.md}`,
      borderRadius: BORDER_RADIUS.lg,
      border: '1px solid rgba(255, 255, 255, 0.2)',
      background: 'transparent',
      color: COLORS.text.white,
      fontWeight: FONT_WEIGHTS.medium,
      cursor: 'pointer',
      fontSize: FONT_SIZES.sm,
      transition: `all ${TRANSITIONS.normal}`,
      minHeight: isMobile ? '44px' : 'auto',
    },
    confirmButton: {
      padding: `${SPACING.sm} ${SPACING.md}`,
      borderRadius: BORDER_RADIUS.lg,
      border: 'none',
      background: getConfirmButtonColor(),
      color: COLORS.text.white,
      fontWeight: FONT_WEIGHTS.medium,
      cursor: 'pointer',
      fontSize: FONT_SIZES.sm,
      transition: `all ${TRANSITIONS.normal}`,
      minHeight: isMobile ? '44px' : 'auto',
    },
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.content}>
          <h3 style={styles.title}>{title}</h3>
          <p style={styles.text}>{message}</p>

          <div style={styles.buttons}>
            <button onClick={onCancel} style={styles.cancelButton}>
              Cancel
            </button>
            <button onClick={onConfirm} style={styles.confirmButton}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsBar;