/**
 * FeeTableRow Component
 * Path: frontend/src/components/fees/FeeTableRow.js
 * Glassmorphism Design System
 */

import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
} from '../../utils/designConstants';

const formatCurrency = (value) => {
  const num = parseFloat(value || 0);
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const FeeTableRow = ({
  fee,
  isSelected,
  onToggleSelect,
  isEditing,
  onEditStart,
  onEditSave,
  onEditCancel,
  editedValues,
  onEditValueChange,
  onDelete,
  isMobile = false,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditingPaid = isEditing === `${fee.id}-paid_amount`;
  const isEditingDate = isEditing === `${fee.id}-date_received`;

  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      onEditSave(fee.id, fee.total_fee, field);
    } else if (e.key === 'Escape') {
      onEditCancel();
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    onDelete(fee.id);
    setShowDeleteConfirm(false);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'yyyy-MM-dd');
    } catch {
      return '-';
    }
  };

  const getStatusStyles = (status) => {
    const baseStyle = {
      padding: `${SPACING.xs} ${SPACING.sm}`,
      borderRadius: BORDER_RADIUS.full,
      fontSize: FONT_SIZES.xs,
      fontWeight: FONT_WEIGHTS.semibold,
    };

    switch (status) {
      case 'Paid':
        return { ...baseStyle, background: 'rgba(16, 185, 129, 0.2)', color: '#6EE7B7' };
      case 'Pending':
        return { ...baseStyle, background: 'rgba(245, 158, 11, 0.2)', color: '#FCD34D' };
      case 'Overdue':
        return { ...baseStyle, background: 'rgba(239, 68, 68, 0.2)', color: '#FCA5A5' };
      default:
        return { ...baseStyle, background: 'rgba(255, 255, 255, 0.1)', color: COLORS.text.whiteMedium };
    }
  };

  const styles = {
    row: {
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      transition: `background ${TRANSITIONS.fast}`,
    },
    rowHover: {
      background: 'rgba(255, 255, 255, 0.05)',
    },
    cell: {
      padding: isMobile ? `${SPACING.sm} ${SPACING.xs}` : `${SPACING.sm} ${SPACING.md}`,
      color: COLORS.text.white,
      fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
    },
    checkbox: {
      width: isMobile ? '20px' : '16px',
      height: isMobile ? '20px' : '16px',
      cursor: 'pointer',
      accentColor: COLORS.primary,
    },
    studentName: {
      fontWeight: FONT_WEIGHTS.medium,
      color: COLORS.text.white,
    },
    regNum: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.text.whiteMedium,
      display: 'block',
      marginTop: '2px',
    },
    editInput: {
      padding: SPACING.xs,
      borderRadius: BORDER_RADIUS.md,
      border: `1px solid ${COLORS.primary}`,
      background: 'rgba(255, 255, 255, 0.1)',
      color: COLORS.text.white,
      textAlign: 'right',
      width: isMobile ? '64px' : '96px',
      fontSize: '16px', // Prevent iOS zoom
      outline: 'none',
    },
    editButton: {
      padding: SPACING.xs,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: isMobile ? '44px' : 'auto',
      minHeight: isMobile ? '44px' : 'auto',
    },
    saveIcon: {
      width: isMobile ? '24px' : '20px',
      height: isMobile ? '24px' : '20px',
      color: COLORS.status.success,
    },
    cancelIcon: {
      width: isMobile ? '24px' : '20px',
      height: isMobile ? '24px' : '20px',
      color: COLORS.status.error,
    },
    clickableCell: {
      cursor: 'pointer',
      padding: `${SPACING.xs} ${SPACING.sm}`,
      borderRadius: BORDER_RADIUS.md,
      display: 'inline-block',
      transition: `background ${TRANSITIONS.fast}`,
    },
    balancePositive: {
      color: '#FCA5A5',
    },
    balanceNegative: {
      color: '#6EE7B7',
    },
    deleteButton: {
      padding: SPACING.xs,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      borderRadius: BORDER_RADIUS.md,
      transition: `background ${TRANSITIONS.fast}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: isMobile ? '44px' : 'auto',
      minHeight: isMobile ? '44px' : 'auto',
    },
    deleteIcon: {
      width: isMobile ? '24px' : '20px',
      height: isMobile ? '24px' : '20px',
      color: COLORS.status.error,
    },
    modalOverlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: SPACING.md,
    },
    modalContent: {
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
      backdropFilter: 'blur(20px)',
      borderRadius: BORDER_RADIUS.xl,
      border: '1px solid rgba(255, 255, 255, 0.1)',
      padding: isMobile ? SPACING.md : SPACING.lg,
      width: '100%',
      maxWidth: isMobile ? '320px' : '400px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    },
    modalTitle: {
      fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.lg,
      fontWeight: FONT_WEIGHTS.semibold,
      color: COLORS.text.white,
      marginBottom: SPACING.sm,
    },
    modalText: {
      fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,
      color: COLORS.text.whiteMedium,
      marginBottom: SPACING.lg,
    },
    modalButtons: {
      display: 'flex',
      gap: SPACING.md,
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'flex-end',
    },
    cancelButton: {
      padding: `${SPACING.sm} ${SPACING.md}`,
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: BORDER_RADIUS.lg,
      background: 'transparent',
      color: COLORS.text.white,
      cursor: 'pointer',
      fontSize: FONT_SIZES.sm,
      minHeight: isMobile ? '44px' : 'auto',
      order: isMobile ? 2 : 1,
      transition: `background ${TRANSITIONS.fast}`,
    },
    deleteConfirmButton: {
      padding: `${SPACING.sm} ${SPACING.md}`,
      border: 'none',
      borderRadius: BORDER_RADIUS.lg,
      background: COLORS.status.error,
      color: COLORS.text.white,
      cursor: 'pointer',
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.medium,
      minHeight: isMobile ? '44px' : 'auto',
      order: isMobile ? 1 : 2,
      transition: `background ${TRANSITIONS.fast}`,
    },
  };

  return (
    <>
      <tr style={styles.row}>
        {/* Checkbox */}
        <td style={{ ...styles.cell, textAlign: 'center' }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            style={styles.checkbox}
          />
        </td>

        {/* Student Name */}
        <td style={styles.cell}>
          <span style={styles.studentName}>
            {isMobile && fee.student_name.length > 15
              ? fee.student_name.substring(0, 15) + '...'
              : fee.student_name}
          </span>
          {fee.reg_num && !isMobile && (
            <span style={styles.regNum}>{fee.reg_num}</span>
          )}
        </td>

        {/* Total Fee - hidden on mobile */}
        {!isMobile && (
          <td style={{ ...styles.cell, textAlign: 'right' }}>
            {formatCurrency(fee.total_fee)}
          </td>
        )}

        {/* Paid Amount */}
        <td style={{ ...styles.cell, textAlign: 'right' }}>
          {isEditingPaid ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: SPACING.xs }}>
              <input
                type="number"
                value={editedValues.paidAmount}
                onChange={(e) => onEditValueChange({ paidAmount: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, 'paid_amount')}
                style={styles.editInput}
                min="0"
                max={fee.total_fee}
                step="0.01"
                autoFocus
              />
              <button
                onClick={() => onEditSave(fee.id, fee.total_fee, 'paid_amount')}
                style={styles.editButton}
              >
                <svg style={styles.saveIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button onClick={onEditCancel} style={styles.editButton}>
                <svg style={styles.cancelIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <span
              onClick={() => onEditStart(fee, 'paid_amount')}
              style={styles.clickableCell}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onEditStart(fee, 'paid_amount')}
            >
              {formatCurrency(fee.paid_amount)}
            </span>
          )}
        </td>

        {/* Date Received - hidden on mobile */}
        {!isMobile && (
          <td style={{ ...styles.cell, textAlign: 'center' }}>
            {isEditingDate ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs }}>
                <DatePicker
                  selected={editedValues.dateReceived}
                  onChange={(date) => onEditValueChange({ dateReceived: date })}
                  dateFormat="yyyy-MM-dd"
                  className="fee-row-datepicker"
                  autoFocus
                />
                <button
                  onClick={() => onEditSave(fee.id, fee.total_fee, 'date_received')}
                  style={styles.editButton}
                >
                  <svg style={styles.saveIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button onClick={onEditCancel} style={styles.editButton}>
                  <svg style={styles.cancelIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <span
                onClick={() => onEditStart(fee, 'date_received')}
                style={styles.clickableCell}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onEditStart(fee, 'date_received')}
              >
                {formatDate(fee.date_received)}
              </span>
            )}
          </td>
        )}

        {/* Balance Due */}
        <td style={{
          ...styles.cell,
          textAlign: 'right',
          ...(parseFloat(fee.balance_due) > 0 ? styles.balancePositive : styles.balanceNegative),
        }}>
          {formatCurrency(fee.balance_due)}
        </td>

        {/* Status - hidden on mobile */}
        {!isMobile && (
          <td style={{ ...styles.cell, textAlign: 'center' }}>
            <span style={getStatusStyles(fee.status)}>
              {fee.status}
            </span>
          </td>
        )}

        {/* Actions */}
        <td style={{ ...styles.cell, textAlign: 'center' }}>
          <button onClick={handleDeleteClick} style={styles.deleteButton}>
            <svg style={styles.deleteIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </td>
      </tr>

      {/* Global styles for DatePicker */}
      <style>
        {`
          .fee-row-datepicker {
            padding: ${SPACING.xs};
            border-radius: ${BORDER_RADIUS.md};
            border: 1px solid ${COLORS.primary};
            background: rgba(255, 255, 255, 0.1);
            color: white;
            text-align: center;
            width: 112px;
            outline: none;
          }
        `}
      </style>

      {showDeleteConfirm && (
        <tr>
          <td colSpan={isMobile ? 5 : 8}>
            <div style={styles.modalOverlay}>
              <div style={styles.modalContent}>
                <h3 style={styles.modalTitle}>Delete Fee Record</h3>
                <p style={styles.modalText}>
                  Are you sure you want to delete the fee record for <strong>{fee.student_name}</strong>?
                  This action cannot be undone.
                </p>
                <div style={styles.modalButtons}>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    style={styles.deleteConfirmButton}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default FeeTableRow;