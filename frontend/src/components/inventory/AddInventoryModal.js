// ============================================
// ADD INVENTORY MODAL - Gradient Design System
// With RBAC Support
// ============================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  createInventoryItem,
  updateInventoryItem,
  bulkCreateItems,
} from '../../services/inventoryService';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  Z_INDEX,
} from '../../utils/designConstants';

const AddInventoryModal = ({
  isOpen,
  onClose,
  onSuccess,
  editItem = null,
  categories = [],
  schools = [],
  users = [],
  userContext = {},
}) => {
  const { isAdmin, userId } = userContext;
  const isEditMode = !!editItem;

  const [closeButtonHovered, setCloseButtonHovered] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    location: isAdmin ? '' : 'School',
    school: '',
    status: 'Available',
    purchase_value: '',
    purchase_date: '',
    serial_number: '',
    assigned_to: '',
  });

  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Handle ESC key to close modal
  const handleEscKey = useCallback((e) => {
    if (e.key === 'Escape' && !isSubmitting) {
      onClose();
    }
  }, [onClose, isSubmitting]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, handleEscKey]);

  // Location options (Role-based)
  const locationOptions = useMemo(() => {
    if (isAdmin) {
      return [
        { value: '', label: 'Select Location...' },
        { value: 'School', label: 'School' },
        { value: 'Headquarters', label: 'Headquarters' },
        { value: 'Unassigned', label: 'Unassigned' },
      ];
    }
    return [{ value: 'School', label: 'School' }];
  }, [isAdmin]);

  // User options (Role-based)
  const userOptions = useMemo(() => {
    if (isAdmin) {
      return users;
    }
    return users.filter(u => u.id === userId);
  }, [isAdmin, users, userId]);

  // Initialize form
  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name || '',
        description: editItem.description || '',
        category: String(editItem.category || editItem.category_id || ''),
        location: editItem.location || 'School',
        school: String(editItem.school || editItem.school_id || ''),
        status: editItem.status || 'Available',
        purchase_value: editItem.purchase_value || '',
        purchase_date: editItem.purchase_date || '',
        serial_number: editItem.serial_number || '',
        assigned_to: String(editItem.assigned_to || editItem.assigned_to_id || ''),
      });
      setQuantity(1);
    } else {
      setFormData({
        name: '',
        description: '',
        category: '',
        location: isAdmin ? '' : 'School',
        school: '',
        status: 'Available',
        purchase_value: '',
        purchase_date: '',
        serial_number: '',
        assigned_to: '',
      });
      setQuantity(1);
    }
  }, [editItem, isAdmin]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'location' && value !== 'School') {
        updated.school = '';
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter item name');
      return;
    }

    if (!formData.location) {
      toast.error('Please select location');
      return;
    }

    if (formData.location === 'School' && !formData.school) {
      toast.error('Please select a school');
      return;
    }

    if (!isEditMode && quantity > 1 && !showBulkConfirm) {
      setShowBulkConfirm(true);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        await updateInventoryItem(editItem.id, formData);
        toast.success('Item updated successfully');
      } else if (quantity > 1) {
        const result = await bulkCreateItems({ ...formData, quantity });
        toast.success(`${result.created_count} items created successfully`);
      } else {
        await createInventoryItem(formData);
        toast.success('Item created successfully');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      const errorMsg = error.response?.data?.detail ||
                       error.response?.data?.error ||
                       'Failed to save item';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
      setShowBulkConfirm(false);
    }
  };

  if (!isOpen) return null;

  const totalValue = quantity * Number(formData.purchase_value || 0);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <style>
        {`
          .inventory-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
          .inventory-input:focus {
            border-color: rgba(16, 185, 129, 0.6) !important;
            box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2) !important;
          }
          .inventory-select option {
            background-color: #1e293b;
            color: white;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            {isEditMode ? 'Edit Item' : 'Add Inventory Item'}
          </h2>
          <button
            onClick={onClose}
            style={{
              ...styles.closeButton,
              ...(closeButtonHovered ? styles.closeButtonHover : {}),
            }}
            onMouseEnter={() => setCloseButtonHovered(true)}
            onMouseLeave={() => setCloseButtonHovered(false)}
            title="Close (Esc)"
            aria-label="Close modal"
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={styles.content}>
          {/* Role indicator for teachers */}
          {!isAdmin && (
            <div style={styles.warningBox}>
              <span>You can only add items to your assigned schools.</span>
            </div>
          )}

          {/* Bulk creation info */}
          {!isEditMode && quantity > 1 && (
            <div style={styles.infoBox}>
              <span>Creating {quantity} identical items • Total value: PKR {totalValue.toLocaleString()}</span>
            </div>
          )}

          {/* Form Fields */}
          <div style={styles.formGrid}>
            {/* Name */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Item name"
                style={styles.input}
                className="inventory-input"
              />
            </div>

            {/* Category */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                style={styles.select}
                className="inventory-select"
              >
                <option value="">Select Category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Location <span style={styles.required}>*</span>
              </label>
              <select
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                style={{
                  ...styles.select,
                  ...((!isAdmin) ? styles.inputDisabled : {}),
                }}
                className="inventory-select"
                disabled={!isAdmin}
              >
                {locationOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* School */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                School {formData.location === 'School' && <span style={styles.required}>*</span>}
              </label>
              <select
                value={formData.school}
                onChange={(e) => handleChange('school', e.target.value)}
                style={{
                  ...styles.select,
                  ...(formData.location !== 'School' ? styles.inputDisabled : {}),
                }}
                className="inventory-select"
                disabled={formData.location !== 'School'}
              >
                <option value="">Select School...</option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                style={styles.select}
                className="inventory-select"
              >
                <option value="Available">Available</option>
                <option value="Assigned">Assigned</option>
                <option value="Damaged">Damaged</option>
                <option value="Lost">Lost</option>
                <option value="Disposed">Disposed</option>
              </select>
            </div>

            {/* Assigned To */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Assigned To</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => handleChange('assigned_to', e.target.value)}
                style={styles.select}
                className="inventory-select"
              >
                <option value="">Unassigned</option>
                {userOptions.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
              {!isAdmin && userOptions.length === 1 && (
                <small style={styles.helperText}>You can only assign items to yourself</small>
              )}
            </div>

            {/* Purchase Value */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Purchase Value (PKR)</label>
              <input
                type="number"
                min="0"
                value={formData.purchase_value}
                onChange={(e) => handleChange('purchase_value', e.target.value)}
                placeholder="0"
                style={styles.input}
                className="inventory-input"
              />
            </div>

            {/* Purchase Date */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Purchase Date</label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => handleChange('purchase_date', e.target.value)}
                style={styles.input}
                className="inventory-input"
              />
            </div>

            {/* Serial Number */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Serial Number</label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) => handleChange('serial_number', e.target.value)}
                placeholder="Optional"
                style={styles.input}
                className="inventory-input"
              />
            </div>

            {/* Quantity (only for new items) */}
            {!isEditMode && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Quantity</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                  style={styles.input}
                  className="inventory-input"
                />
                <small style={styles.helperText}>1-500 items. Each gets a unique ID.</small>
              </div>
            )}
          </div>

          {/* Description (full width) */}
          <div style={{ ...styles.formGroup, marginTop: SPACING.md }}>
            <label style={styles.label}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Optional description"
              rows={3}
              style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
              className="inventory-input"
            />
          </div>

          {/* Bulk Confirmation */}
          {showBulkConfirm && (
            <div style={styles.confirmBox}>
              <p style={{ margin: 0, fontWeight: FONT_WEIGHTS.semibold, color: '#fbbf24' }}>
                Confirm Bulk Creation
              </p>
              <p style={{ margin: `${SPACING.xs} 0 0`, fontSize: FONT_SIZES.sm, color: '#fcd34d' }}>
                You are about to create {quantity} identical items with a total value of PKR {totalValue.toLocaleString()}.
                Each item will get a unique ID automatically.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={styles.cancelButton}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={styles.submitButton}
          >
            {isSubmitting ? (
              <>
                <span style={styles.spinner} />
                {showBulkConfirm ? 'Creating...' : 'Saving...'}
              </>
            ) : showBulkConfirm ? (
              `Yes, Create ${quantity} Items`
            ) : isEditMode ? (
              'Update Item'
            ) : quantity > 1 ? (
              `Create ${quantity} Items`
            ) : (
              'Create Item'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles - Gradient Design (matching other modals)
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
    alignItems: 'center',
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
  closeButtonHover: {
    background: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    transform: 'scale(1.05)',
  },
  content: {
    padding: SPACING.lg,
  },
  warningBox: {
    padding: SPACING.md,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: '#fcd34d',
  },
  infoBox: {
    padding: SPACING.md,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: '#93c5fd',
  },
  confirmBox: {
    padding: SPACING.md,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: SPACING.md,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
  },
  required: {
    color: '#f87171',
  },
  input: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    transition: `all ${TRANSITIONS.fast} ease`,
    outline: 'none',
    background: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
  },
  inputDisabled: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: COLORS.text.whiteSubtle,
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  select: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    transition: `all ${TRANSITIONS.fast} ease`,
    outline: 'none',
    background: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '16px',
    appearance: 'none',
    paddingRight: '40px',
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
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
    backgroundColor: COLORS.status.success,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid #fff',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

export default AddInventoryModal;
