// ============================================
// TRANSFER MODAL - With RBAC Support
// ============================================
// Location: src/components/inventory/TransferModal.js
//
// Transfer modal with role-based restrictions:
// - Admin: Can transfer to any location/school
// - Teacher: Can only transfer to their assigned schools

import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { transferInventoryItems, fetchEmployees } from '../../services/inventoryService';

// ============================================
// STYLES
// ============================================

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem',
};

const modalContentStyle = {
  backgroundColor: 'white',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '600px',
  maxHeight: '90vh',
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

const labelStyle = {
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: '500',
  color: '#374151',
  fontSize: '0.875rem',
};

const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: '1px solid #D1D5DB',
  borderRadius: '8px',
  fontSize: '0.875rem',
  boxSizing: 'border-box',
};

const readOnlyInputStyle = {
  ...inputStyle,
  backgroundColor: '#F3F4F6',
  color: '#6B7280',
  cursor: 'not-allowed',
};

const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? '#3B82F6' : '#D1D5DB',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
    '&:hover': { borderColor: '#3B82F6' },
    minHeight: '42px',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#3B82F6' : state.isFocused ? '#EFF6FF' : 'white',
    color: state.isSelected ? 'white' : '#374151',
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

  return (
    <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalContentStyle}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1F2937' }}>
              📦 Transfer Inventory
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6B7280' }}>
              {selectedItems.length} items selected • Total value: PKR {totalValue.toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#9CA3AF',
              padding: '0.25rem',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* Location Mismatch Warning */}
          {locationMismatch && (
            <div style={{
              backgroundColor: '#FEE2E2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
              <div>
                <div style={{ fontWeight: '600', color: '#DC2626' }}>Location Mismatch</div>
                <div style={{ fontSize: '0.875rem', color: '#991B1B' }}>
                  Selected items are from different locations. Please select items from the same location.
                </div>
              </div>
            </div>
          )}

          {/* Role indicator for teachers */}
          {!isAdmin && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#FEF3C7',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span>ℹ️</span>
              <span style={{ fontSize: '0.875rem', color: '#92400E' }}>
                You can only transfer items to your assigned schools.
              </span>
            </div>
          )}

          {/* Items Preview */}
          <div style={{
            backgroundColor: '#F9FAFB',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.25rem',
            maxHeight: '150px',
            overflowY: 'auto',
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.5rem' }}>
              Items to Transfer:
            </div>
            {groupedItems.map((group, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0',
                borderBottom: idx < groupedItems.length - 1 ? '1px solid #E5E7EB' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: '500' }}>{group.name}</span>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '0.125rem 0.5rem',
                    backgroundColor: '#E5E7EB',
                    borderRadius: '4px',
                    color: '#6B7280',
                  }}>
                    {group.category_name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                  }}>
                    Qty: {group.items.length}
                  </span>
                  <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                    PKR {group.totalValue.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* From Location (Read-only) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>From Location</label>
            <input
              type="text"
              value={fromLocation}
              readOnly
              style={readOnlyInputStyle}
            />
          </div>

          {/* To Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={labelStyle}>
                To Location <span style={{ color: '#EF4444' }}>*</span>
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
              <label style={labelStyle}>
                To School {toLocation?.value === 'School' && <span style={{ color: '#EF4444' }}>*</span>}
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
                    backgroundColor: toLocation?.value !== 'School' ? '#F3F4F6' : 'white',
                  }),
                }}
                isDisabled={toLocation?.value !== 'School' || locationMismatch}
                menuPortalTarget={document.body}
              />
            </div>
          </div>

          {/* Transferred By & Received By */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Transfer Initiated By</label>
              <input
                type="text"
                value={userName || 'Current User'}
                readOnly
                style={readOnlyInputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Received By / Assign To</label>
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
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Reason for Transfer</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional: Equipment upgrade, relocation, etc."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
              disabled={locationMismatch}
            />
          </div>

          {/* Auto-assignment info */}
          {receivedBy && (
            <div style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
              <span style={{ fontSize: '0.875rem', color: '#1E40AF' }}>
                All {selectedItems.length} items will be assigned to <strong>{receivedBy.label}</strong> after transfer.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '0.75rem',
          backgroundColor: '#F9FAFB',
          flexWrap: 'wrap',
        }}>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || locationMismatch}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: 'white',
              color: '#374151',
              fontWeight: '500',
              cursor: isSubmitting || locationMismatch ? 'not-allowed' : 'pointer',
              opacity: isSubmitting || locationMismatch ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            📄 Generate Report Only
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: 'white',
                color: '#374151',
                fontWeight: '500',
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
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isSubmitting || locationMismatch ? '#9CA3AF' : '#8B5CF6',
                color: 'white',
                fontWeight: '500',
                cursor: isSubmitting || locationMismatch ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
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

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default TransferModal;