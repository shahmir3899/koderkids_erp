// ============================================
// ADD INVENTORY MODAL - With RBAC Support
// ============================================
// Location: src/components/inventory/AddInventoryModal.js
//
// Add/Edit modal with role-based restrictions:
// - Admin: All locations, all schools, all users
// - Teacher: Only School location, only assigned schools, only themselves

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  createInventoryItem,
  updateInventoryItem,
  bulkCreateItems,
} from '../../services/inventoryService';

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
  maxWidth: '700px',
  maxHeight: '90vh',
  overflow: 'auto',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

const headerStyle = {
  padding: '1.25rem 1.5rem',
  borderBottom: '1px solid #E5E7EB',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const bodyStyle = {
  padding: '1.5rem',
};

const footerStyle = {
  padding: '1rem 1.5rem',
  borderTop: '1px solid #E5E7EB',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  backgroundColor: '#F9FAFB',
};

const labelStyle = {
  display: 'block',
  marginBottom: '0.375rem',
  fontWeight: '500',
  color: '#374151',
  fontSize: '0.875rem',
};

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid #D1D5DB',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  boxSizing: 'border-box',
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
  backgroundColor: '#FFFFFF',
};

const fieldGroupStyle = {
  marginBottom: '1rem',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1rem',
};

// ============================================
// COMPONENT
// ============================================

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

  // ============================================
  // FORM STATE
  // ============================================

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    location: isAdmin ? '' : 'School', // Teachers default to School
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

  // ============================================
  // LOCATION OPTIONS (Role-based)
  // ============================================

  const locationOptions = useMemo(() => {
    if (isAdmin) {
      return [
        { value: '', label: 'Select Location...' },
        { value: 'School', label: '🏫 School' },
        { value: 'Headquarters', label: '🏢 Headquarters' },
        { value: 'Unassigned', label: '📦 Unassigned' },
      ];
    }
    // Teachers can only add to School
    return [
      { value: 'School', label: '🏫 School' },
    ];
  }, [isAdmin]);

  // ============================================
  // USER OPTIONS (Role-based)
  // ============================================

  const userOptions = useMemo(() => {
    if (isAdmin) {
      return users;
    }
    // Teachers can only assign to themselves
    return users.filter(u => u.id === userId);
  }, [isAdmin, users, userId]);

  // ============================================
  // INITIALIZE FORM
  // ============================================

  useEffect(() => {
  if (editItem) {
    console.log('Edit item data:', editItem); // Debug: check what's coming
    setFormData({
      name: editItem.name || '',
      description: editItem.description || '',
      // Convert to string for select element compatibility
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
    // Reset for new item
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

  // ============================================
  // HANDLERS
  // ============================================

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Clear school when location is not School
      if (field === 'location' && value !== 'School') {
        updated.school = '';
      }
      
      return updated;
    });
  };

  const handleSubmit = async () => {
    // Validation
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

    // For bulk creation, show confirmation
    if (!isEditMode && quantity > 1 && !showBulkConfirm) {
      setShowBulkConfirm(true);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        // Update existing item
        await updateInventoryItem(editItem.id, formData);
        toast.success('Item updated successfully');
      } else if (quantity > 1) {
        // Bulk create
        const result = await bulkCreateItems({ ...formData, quantity });
        toast.success(`${result.created_count} items created successfully`);
      } else {
        // Single create
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

  // ============================================
  // RENDER
  // ============================================

  if (!isOpen) return null;

  const totalValue = quantity * Number(formData.purchase_value || 0);

  return (
    <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalContentStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
            {isEditMode ? '✏️ Edit Item' : '➕ Add Inventory Item'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#9CA3AF',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
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
                You can only add items to your assigned schools.
              </span>
            </div>
          )}

          {/* Bulk creation info */}
          {!isEditMode && quantity > 1 && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#EFF6FF',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span>📦</span>
              <span style={{ fontSize: '0.875rem', color: '#1E40AF' }}>
                Creating {quantity} identical items • Total value: PKR {totalValue.toLocaleString()}
              </span>
            </div>
          )}

          {/* Form Fields */}
          <div style={gridStyle}>
            {/* Name */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Item name"
                style={inputStyle}
              />
            </div>

            {/* Category */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                style={selectStyle}
              >
                <option value="">Select Category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Location *</label>
              <select
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                style={selectStyle}
                disabled={!isAdmin}
              >
                {locationOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* School */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>
                School {formData.location === 'School' && '*'}
              </label>
              <select
                value={formData.school}
                onChange={(e) => handleChange('school', e.target.value)}
                style={{
                  ...selectStyle,
                  opacity: formData.location === 'School' ? 1 : 0.5,
                }}
                disabled={formData.location !== 'School'}
              >
                <option value="">Select School...</option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                style={selectStyle}
              >
                <option value="Available">Available</option>
                <option value="Assigned">Assigned</option>
                <option value="Damaged">Damaged</option>
                <option value="Lost">Lost</option>
                <option value="Disposed">Disposed</option>
              </select>
            </div>

            {/* Assigned To */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Assigned To</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => handleChange('assigned_to', e.target.value)}
                style={selectStyle}
              >
                <option value="">Unassigned</option>
                {userOptions.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
              {!isAdmin && userOptions.length === 1 && (
                <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0.25rem 0 0' }}>
                  You can only assign items to yourself
                </p>
              )}
            </div>

            {/* Purchase Value */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Purchase Value (PKR)</label>
              <input
                type="number"
                min="0"
                value={formData.purchase_value}
                onChange={(e) => handleChange('purchase_value', e.target.value)}
                placeholder="0"
                style={inputStyle}
              />
            </div>

            {/* Purchase Date */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Purchase Date</label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => handleChange('purchase_date', e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Serial Number */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Serial Number</label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) => handleChange('serial_number', e.target.value)}
                placeholder="Optional"
                style={inputStyle}
              />
            </div>

            {/* Quantity (only for new items) */}
            {!isEditMode && (
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Quantity</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                  style={inputStyle}
                />
                <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0.25rem 0 0' }}>
                  1-500 items. Each gets a unique ID.
                </p>
              </div>
            )}
          </div>

          {/* Description (full width) */}
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Optional description"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Bulk Confirmation */}
          {showBulkConfirm && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#FEF3C7',
              borderRadius: '0.5rem',
              marginTop: '1rem',
            }}>
              <p style={{ margin: 0, fontWeight: '500', color: '#92400E' }}>
                ⚠️ Confirm Bulk Creation
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#92400E' }}>
                You are about to create {quantity} identical items with a total value of PKR {totalValue.toLocaleString()}.
                Each item will get a unique ID automatically.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: isSubmitting ? '#9CA3AF' : '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
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

export default AddInventoryModal;