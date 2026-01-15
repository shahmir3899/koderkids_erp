// ============================================
// TRANSACTION DETAILS MODAL COMPONENT - Glassmorphism Design
// ============================================
// Location: src/components/transactions/TransactionDetailsModal.js

import React from 'react';
import { Button } from '../common/ui/Button';

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

export const TransactionDetailsModal = ({ transaction, onClose }) => {
  const getTransactionTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'income':
        return '#10B981';
      case 'expense':
        return '#EF4444';
      case 'transfer':
        return '#3B82F6';
      default:
        return COLORS.text.whiteSubtle;
    }
  };

  const typeColor = getTransactionTypeColor(transaction.transaction_type);

  return (
    <>
      {/* Modal Overlay */}
      <div onClick={onClose} style={styles.overlay}>
        {/* Modal Content */}
        <div onClick={(e) => e.stopPropagation()} style={styles.modalContent}>
          {/* Header */}
          <div style={styles.header}>
            <h2 style={styles.headerTitle}>Transaction Details</h2>
          </div>

          {/* Transaction Type Badge */}
          <div style={styles.badgeContainer}>
            <span style={styles.typeBadge(typeColor)}>
              {transaction.transaction_type}
            </span>
          </div>

          {/* Details Grid */}
          <div style={styles.detailsGrid}>
            {/* Date */}
            <div style={styles.detailCard}>
              <p style={styles.fieldLabel}>Date</p>
              <p style={styles.fieldValue}>
                {new Date(transaction.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Amount */}
            <div style={styles.detailCard}>
              <p style={styles.fieldLabel}>Amount</p>
              <p style={styles.amountValue(typeColor)}>
                PKR {parseFloat(transaction.amount).toLocaleString()}
              </p>
            </div>

            {/* Category */}
            <div style={styles.detailCard}>
              <p style={styles.fieldLabel}>Category</p>
              <p style={styles.fieldValue}>{transaction.category}</p>
            </div>

            {/* Account Information */}
            {transaction.transaction_type === 'Income' && (
              <div style={styles.detailCard}>
                <p style={styles.fieldLabel}>To Account</p>
                <p style={styles.fieldValue}>{transaction.to_account_name || 'N/A'}</p>
              </div>
            )}

            {transaction.transaction_type === 'Expense' && (
              <div style={styles.detailCard}>
                <p style={styles.fieldLabel}>From Account</p>
                <p style={styles.fieldValue}>{transaction.from_account_name || 'N/A'}</p>
              </div>
            )}

            {transaction.transaction_type === 'Transfer' && (
              <>
                <div style={styles.detailCard}>
                  <p style={styles.fieldLabel}>From Account</p>
                  <p style={styles.fieldValue}>{transaction.from_account_name || 'N/A'}</p>
                </div>
                <div style={styles.detailCard}>
                  <p style={styles.fieldLabel}>To Account</p>
                  <p style={styles.fieldValue}>{transaction.to_account_name || 'N/A'}</p>
                </div>
              </>
            )}

            {/* School */}
            <div style={styles.detailCard}>
              <p style={styles.fieldLabel}>School</p>
              <p style={styles.fieldValue}>{transaction.school_name || 'No School'}</p>
            </div>

            {/* Notes */}
            {transaction.notes && (
              <div style={styles.notesCard}>
                <p style={styles.fieldLabel}>Notes</p>
                <p style={styles.notesValue}>{transaction.notes}</p>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div style={styles.footer}>
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

// ============================================
// STYLES - Glassmorphism Design
// ============================================
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: SPACING.lg,
  },
  modalContent: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING['2xl'],
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    marginBottom: SPACING.xl,
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    paddingBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    margin: 0,
  },
  badgeContainer: {
    marginBottom: SPACING.xl,
  },
  typeBadge: (color) => ({
    display: 'inline-block',
    padding: `${SPACING.sm} ${SPACING.lg}`,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    backgroundColor: `${color}30`,
    color: color,
    border: `1px solid ${color}50`,
  }),
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: SPACING.lg,
  },
  detailCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  fieldLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    marginBottom: SPACING.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  fieldValue: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.white,
    margin: 0,
  },
  amountValue: (color) => ({
    fontSize: FONT_SIZES.xl,
    color: color,
    margin: 0,
    fontWeight: FONT_WEIGHTS.bold,
  }),
  notesCard: {
    gridColumn: '1 / -1',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  notesValue: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.white,
    margin: 0,
    padding: SPACING.md,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  footer: {
    marginTop: SPACING['2xl'],
    textAlign: 'right',
  },
};
