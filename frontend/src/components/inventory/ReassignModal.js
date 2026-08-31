// ============================================
// REASSIGN MODAL - Bulk reassign items to a new employee
// ============================================
// Location: src/components/inventory/ReassignModal.js
//
// Only reassigns `assigned_to` for the selected items (via bulkAssign).
// Shown only when all selected items currently share the same assignee
// (see InventoryTable.js SelectionBar) - no location/school change here,
// unlike TransferModal which moves items between locations.

import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { bulkAssign } from '../../services/inventoryService';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  Z_INDEX,
} from '../../utils/designConstants';

// ============================================
// STYLES - matches TransferModal's gradient design
// ============================================

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: Z_INDEX.modal,
    padding: SPACING.sm,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: COLORS.background.gradient,
    borderRadius: BORDER_RADIUS.xl,
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    background: 'rgba(255, 255, 255, 0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    margin: 0,
  },
  subtitle: {
    margin: `${SPACING.xs} 0 0`,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },
  closeButton: {
    padding: SPACING.sm,
    background: 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: '50%',
    cursor: 'pointer',
    color: COLORS.text.white,
    transition: `all ${TRANSITIONS.fast} ease`,
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    padding: SPACING.lg,
  },
  label: {
    display: 'block',
    marginBottom: SPACING.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
  },
  readOnlyInput: {
    width: '100%',
    padding: `${SPACING.sm} ${SPACING.md}`,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    boxSizing: 'border-box',
    background: 'rgba(255, 255, 255, 0.05)',
    color: COLORS.text.whiteSubtle,
    cursor: 'not-allowed',
    outline: 'none',
  },
  itemsPreview: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    maxHeight: '150px',
    overflowY: 'auto',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  footer: {
    padding: SPACING.lg,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    background: 'rgba(255, 255, 255, 0.03)',
    position: 'sticky',
    bottom: 0,
  },
  cancelButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: COLORS.text.white,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
  },
  submitButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: '#8B5CF6',
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
};

const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: state.isFocused ? 'rgba(139, 92, 246, 0.6)' : 'rgba(255, 255, 255, 0.2)',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(139, 92, 246, 0.2)' : 'none',
    '&:hover': { borderColor: 'rgba(139, 92, 246, 0.4)' },
    minHeight: '42px',
    color: '#fff',
  }),
  singleValue: (base) => ({ ...base, color: '#fff' }),
  placeholder: (base) => ({ ...base, color: 'rgba(255, 255, 255, 0.5)' }),
  input: (base) => ({ ...base, color: '#fff' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#8B5CF6' : state.isFocused ? '#3B3B5C' : '#1e293b',
    color: '#fff',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

// ============================================
// HELPERS
// ============================================

const groupItemsByNameCategory = (items) => {
  const grouped = {};
  items.forEach(item => {
    const key = `${item.name}-${item.category || 'none'}`;
    if (!grouped[key]) {
      grouped[key] = {
        name: item.name,
        category_name: item.category_name || 'Uncategorized',
        items: [],
      };
    }
    grouped[key].items.push(item);
  });
  return Object.values(grouped);
};

// ============================================
// COMPONENT
// ============================================

export const ReassignModal = ({
  isOpen,
  onClose,
  onSuccess,
  selectedItems = [],
  users = [],
  userContext = {},
}) => {
  const { isAdmin, userId } = userContext;

  const [reassignTo, setReassignTo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReassignTo(null);
    }
  }, [isOpen]);

  const groupedItems = useMemo(() => groupItemsByNameCategory(selectedItems), [selectedItems]);

  const currentAssignee = useMemo(() => {
    if (selectedItems.length === 0) return 'Unassigned';
    return selectedItems[0].assigned_to_name || 'Unassigned';
  }, [selectedItems]);

  // `users` is the same active-only list InventoryFilters/AddInventoryModal use
  // (sourced from InventoryContext -> fetchAvailableUsers), unlike fetchEmployees()
  // which includes inactive staff. Non-admins are restricted to themselves,
  // matching bulk_assign's backend rule (views.py) and AddInventoryModal's pattern.
  const employeeOptions = useMemo(() => {
    const scoped = isAdmin ? users : users.filter(u => u.id === userId);
    return scoped.map(u => ({ value: u.id, label: u.name }));
  }, [isAdmin, users, userId]);

  const handleSubmit = async () => {
    if (!reassignTo) {
      toast.error('Please select an employee to reassign to');
      return;
    }

    setIsSubmitting(true);
    try {
      await bulkAssign(selectedItems.map(item => item.id), reassignTo.value);

      toast.success(`${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} reassigned to ${reassignTo.label}`);

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Reassign error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to reassign items';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>🔄 Reassign Items</h2>
            <p style={styles.subtitle}>
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button onClick={onClose} style={styles.closeButton} title="Close">
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={styles.content}>
          {/* Items Preview */}
          <div style={styles.itemsPreview}>
            <div style={{ fontSize: FONT_SIZES.xs, color: COLORS.text.whiteSubtle, marginBottom: SPACING.xs }}>
              Items to Reassign:
            </div>
            {groupedItems.map((group, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: `${SPACING.xs} 0`,
                borderBottom: idx < groupedItems.length - 1 ? `1px solid ${COLORS.border.whiteTransparent}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.xs }}>
                  <span style={{ fontWeight: FONT_WEIGHTS.medium, color: COLORS.text.white }}>{group.name}</span>
                  <span style={{
                    fontSize: FONT_SIZES.xs,
                    padding: `2px ${SPACING.xs}`,
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: BORDER_RADIUS.sm,
                    color: COLORS.text.whiteSubtle,
                  }}>
                    {group.category_name}
                  </span>
                </div>
                <span style={{
                  backgroundColor: '#8B5CF6',
                  color: 'white',
                  padding: `2px ${SPACING.xs}`,
                  borderRadius: BORDER_RADIUS.sm,
                  fontSize: FONT_SIZES.xs,
                  fontWeight: FONT_WEIGHTS.semibold,
                }}>
                  Qty: {group.items.length}
                </span>
              </div>
            ))}
          </div>

          {/* Currently Assigned To (Read-only) */}
          <div style={{ marginBottom: SPACING.md }}>
            <label style={styles.label}>Currently Assigned To</label>
            <input type="text" value={currentAssignee} readOnly style={styles.readOnlyInput} />
          </div>

          {/* Reassign To */}
          <div style={{ marginBottom: SPACING.md }}>
            <label style={styles.label}>
              Reassign To <span style={{ color: '#f87171' }}>*</span>
            </label>
            <Select
              options={employeeOptions}
              value={reassignTo}
              onChange={setReassignTo}
              placeholder="Select employee..."
              styles={selectStyles}
              menuPortalTarget={document.body}
            />
            {!isAdmin && (
              <p style={{ fontSize: FONT_SIZES.xs, color: COLORS.text.whiteSubtle, margin: `${SPACING.xs} 0 0` }}>
                You can only reassign items to yourself.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ ...styles.cancelButton, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              ...styles.submitButton,
              backgroundColor: isSubmitting ? '#9CA3AF' : '#8B5CF6',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? (
              <>
                <span style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid #fff',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Reassigning...
              </>
            ) : (
              <>🔄 Reassign Items</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ReassignModal;
