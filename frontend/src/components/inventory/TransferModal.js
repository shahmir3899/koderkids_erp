// ============================================
// TRANSFER MODAL - With RBAC Support
// ============================================
// Location: src/components/inventory/TransferModal.js
//
// Transfer modal with role-based restrictions:
// - Admin: Can transfer to any location/school
// - Teacher: Can only transfer to their assigned schools

import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { transferInventoryItems, fetchEmployees } from '../../services/inventoryService';
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
// STYLES - Gradient Design (matching other modals)
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
    maxWidth: '700px',
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
  input: {
    width: '100%',
    padding: `${SPACING.sm} ${SPACING.md}`,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    boxSizing: 'border-box',
    background: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    outline: 'none',
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
  warningBox: {
    backgroundColor: '#FEE2E2',
    border: '1px solid #FECACA',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoBox: {
    padding: SPACING.md,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: '#fcd34d',
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
    justifyContent: 'space-between',
    gap: SPACING.sm,
    background: 'rgba(255, 255, 255, 0.03)',
    position: 'sticky',
    bottom: 0,
    flexWrap: 'wrap',
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
  reportButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: COLORS.text.white,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
};

// Custom select styles for gradient design
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
  singleValue: (base) => ({
    ...base,
    color: '#fff',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'rgba(255, 255, 255, 0.5)',
  }),
  input: (base) => ({
    ...base,
    color: '#fff',
  }),
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

const getLocationDisplay = (item) => {
  if (item.location === 'School' && item.school_name) {
    return `School - ${item.school_name}`;
  }
  return item.location || 'Unknown';
};

const groupItemsByNameCategory = (items) => {
  const grouped = {};
  items.forEach(item => {
    const key = `${item.name}-${item.category || 'none'}`;
    if (!grouped[key]) {
      grouped[key] = {
        name: item.name,
        category_name: item.category_name || 'Uncategorized',
        items: [],
        totalValue: 0,
      };
    }
    grouped[key].items.push(item);
    grouped[key].totalValue += Number(item.purchase_value || 0);
  });
  return Object.values(grouped);
};

// ============================================
// COMPONENT
// ============================================

export const TransferModal = ({
  isOpen,
  onClose,
  onSuccess,
  selectedItems = [],
  schools = [],
  userContext = {},
}) => {
  const { isAdmin, userName } = userContext;

  // State
  const [toLocation, setToLocation] = useState(null);
  const [toSchool, setToSchool] = useState(null);
  const [receivedBy, setReceivedBy] = useState(null);
  const [reason, setReason] = useState('');
  const [employees, setEmployees] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // ============================================
  // LOCATION OPTIONS (Role-based)
  // ============================================

  const locationOptions = useMemo(() => {
    if (isAdmin) {
      return [
        { value: 'School', label: '🏫 School' },
        { value: 'Headquarters', label: '🏢 Headquarters' },
        { value: 'Unassigned', label: '📦 Unassigned' },
      ];
    }
    // Teachers can only transfer to School
    return [
      { value: 'School', label: '🏫 School' },
    ];
  }, [isAdmin]);

  // ============================================
  // FETCH EMPLOYEES
  // ============================================

  useEffect(() => {
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const data = await fetchEmployees();
        setEmployees(data || []);
      } catch (error) {
        console.error('Failed to load employees:', error);
        toast.error('Failed to load employees list');
      } finally {
        setLoadingEmployees(false);
      }
    };
    
    if (isOpen) {
      loadEmployees();
      // Reset state
      setToLocation(null);
      setToSchool(null);
      setReceivedBy(null);
      setReason('');
    }
  }, [isOpen]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const fromLocation = useMemo(() => {
    if (selectedItems.length === 0) return 'Unknown';
    return getLocationDisplay(selectedItems[0]);
  }, [selectedItems]);

  const locationMismatch = useMemo(() => {
    if (selectedItems.length <= 1) return false;
    const firstLocation = getLocationDisplay(selectedItems[0]);
    return selectedItems.some(item => getLocationDisplay(item) !== firstLocation);
  }, [selectedItems]);

  const groupedItems = useMemo(() => groupItemsByNameCategory(selectedItems), [selectedItems]);

  const totalValue = useMemo(() => 
    selectedItems.reduce((sum, item) => sum + Number(item.purchase_value || 0), 0),
    [selectedItems]
  );

  const schoolOptions = useMemo(() => 
    schools.map(s => ({ value: s.id, label: s.name })),
    [schools]
  );

  const employeeOptions = useMemo(() => 
    employees.map(e => ({
      value: e.user_id,
      label: e.name + (e.title ? ` (${e.title})` : ''),
    })),
    [employees]
  );

  // ============================================
  // HANDLERS
  // ============================================

  const handleSubmit = async (isTransfer) => {
    if (!toLocation) {
      toast.error('Please select a destination location');
      return;
    }

    if (toLocation.value === 'School' && !toSchool) {
      toast.error('Please select a destination school');
      return;
    }

    if (locationMismatch) {
      toast.error('Cannot transfer items from different locations');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        item_ids: selectedItems.map(item => item.id),
        to_location: toLocation.value,
        to_school_id: toLocation.value === 'School' ? toSchool?.value : null,
        received_by_user_id: receivedBy?.value || null,
        reason: reason.trim(),
        is_transfer: isTransfer,
      };

      const response = await transferInventoryItems(payload);

      // Download PDF
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = isTransfer 
        ? `Transfer_Receipt_${timestamp}.pdf` 
        : `Inventory_Report_${timestamp}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(isTransfer 
        ? `${selectedItems.length} items transferred successfully!` 
        : 'Report generated successfully!'
      );

      if (isTransfer && onSuccess) {
        onSuccess();
      }
      
      onClose();

    } catch (error) {
      console.error('Transfer error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to process request';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .transfer-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
          .transfer-input:focus {
            border-color: rgba(139, 92, 246, 0.6) !important;
            box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2) !important;
          }
        `}
      </style>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>📦 Transfer Inventory</h2>
            <p style={styles.subtitle}>
              {selectedItems.length} items selected • Total value: PKR {totalValue.toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            style={styles.closeButton}
            title="Close"
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={styles.content}>
          {/* Location Mismatch Warning */}
          {locationMismatch && (
            <div style={styles.warningBox}>
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
              <div>
                <div style={{ fontWeight: '600', color: '#DC2626' }}>Location Mismatch</div>
                <div style={{ fontSize: FONT_SIZES.sm, color: '#991B1B' }}>
                  Selected items are from different locations. Please select items from the same location.
                </div>
              </div>
            </div>
          )}

          {/* Role indicator for teachers */}
          {!isAdmin && (
            <div style={styles.infoBox}>
              <span>ℹ️</span>
              <span>You can only transfer items to your assigned schools.</span>
            </div>
          )}

          {/* Items Preview */}
          <div style={styles.itemsPreview}>
            <div style={{ fontSize: FONT_SIZES.xs, color: COLORS.text.whiteSubtle, marginBottom: SPACING.xs }}>
              Items to Transfer:
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
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
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
                  <span style={{ fontSize: FONT_SIZES.sm, color: COLORS.text.whiteSubtle }}>
                    PKR {group.totalValue.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* From Location (Read-only) */}
          <div style={{ marginBottom: SPACING.md }}>
            <label style={styles.label}>From Location</label>
            <input
              type="text"
              value={fromLocation}
              readOnly
              style={styles.readOnlyInput}
            />
          </div>

          {/* To Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.md, marginBottom: SPACING.md }}>
            <div>
              <label style={styles.label}>
                To Location <span style={{ color: '#f87171' }}>*</span>
              </label>
              <Select
                options={locationOptions}
                value={toLocation}
                onChange={(selected) => {
                  setToLocation(selected);
                  if (selected?.value !== 'School') {
                    setToSchool(null);
                  }
                }}
                placeholder="Select destination..."
                styles={selectStyles}
                menuPortalTarget={document.body}
                isDisabled={locationMismatch}
              />
            </div>

            <div>
              <label style={styles.label}>
                To School {toLocation?.value === 'School' && <span style={{ color: '#f87171' }}>*</span>}
              </label>
              <Select
                options={schoolOptions}
                value={toSchool}
                onChange={setToSchool}
                placeholder={toLocation?.value === 'School' ? 'Select school...' : 'N/A'}
                styles={{
                  ...selectStyles,
                  control: (base, state) => ({
                    ...selectStyles.control(base, state),
                    opacity: toLocation?.value !== 'School' ? 0.5 : 1,
                  }),
                }}
                isDisabled={toLocation?.value !== 'School' || locationMismatch}
                menuPortalTarget={document.body}
              />
            </div>
          </div>

          {/* Transferred By & Received By */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.md, marginBottom: SPACING.md }}>
            <div>
              <label style={styles.label}>Transfer Initiated By</label>
              <input
                type="text"
                value={userName || 'Current User'}
                readOnly
                style={styles.readOnlyInput}
              />
            </div>

            <div>
              <label style={styles.label}>Received By / Assign To</label>
              <Select
                options={employeeOptions}
                value={receivedBy}
                onChange={setReceivedBy}
                placeholder="Select employee (optional)..."
                styles={selectStyles}
                isClearable
                isLoading={loadingEmployees}
                isDisabled={locationMismatch}
                menuPortalTarget={document.body}
              />
            </div>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: SPACING.md }}>
            <label style={styles.label}>Reason for Transfer</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional: Equipment upgrade, relocation, etc."
              rows={3}
              style={{ ...styles.input, resize: 'vertical', minHeight: '80px' }}
              className="transfer-input"
              disabled={locationMismatch}
            />
          </div>

          {/* Auto-assignment info */}
          {receivedBy && (
            <div style={{
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: BORDER_RADIUS.md,
              padding: SPACING.md,
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.sm,
            }}>
              <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
              <span style={{ fontSize: FONT_SIZES.sm, color: '#c4b5fd' }}>
                All {selectedItems.length} items will be assigned to <strong>{receivedBy.label}</strong> after transfer.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || locationMismatch}
            style={{
              ...styles.reportButton,
              opacity: isSubmitting || locationMismatch ? 0.6 : 1,
              cursor: isSubmitting || locationMismatch ? 'not-allowed' : 'pointer',
            }}
          >
            📄 Generate Report Only
          </button>

          <div style={{ display: 'flex', gap: SPACING.sm }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                ...styles.cancelButton,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || locationMismatch}
              style={{
                ...styles.submitButton,
                backgroundColor: isSubmitting || locationMismatch ? '#9CA3AF' : '#8B5CF6',
                cursor: isSubmitting || locationMismatch ? 'not-allowed' : 'pointer',
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
                  Processing...
                </>
              ) : (
                <>📦 Transfer & Download Receipt</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TransferModal;