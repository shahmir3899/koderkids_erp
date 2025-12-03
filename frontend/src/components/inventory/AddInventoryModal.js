// ============================================
// ADD INVENTORY MODAL - Corrected Version
// ============================================
// Location: src/components/inventory/AddInventoryModal.js
// 
// Matches backend model:
// - location: CharField with choices ('School', 'Headquarters', 'Unassigned')
// - school: ForeignKey to School (optional, only when location='School')
// - status: CharField with choices ('Available', 'Assigned', 'Damaged', 'Lost', 'Disposed')

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Select from 'react-select';
import { toast } from 'react-toastify';

// Services
import { createInventoryItem, updateInventoryItem } from '../../services/inventoryService';

// ============================================
// CONSTANTS - Match backend choices
// ============================================

const LOCATION_OPTIONS = [
  { value: 'School', label: '🏫 School' },
  { value: 'Headquarters', label: '🏢 Headquarters' },
  { value: 'Unassigned', label: '📦 Unassigned' },
];

const STATUS_OPTIONS = [
  { value: 'Available', label: '✅ Available', color: '#10B981' },
  { value: 'Assigned', label: '👤 Assigned', color: '#3B82F6' },
  { value: 'Damaged', label: '⚠️ Damaged', color: '#F59E0B' },
  { value: 'Lost', label: '❌ Lost', color: '#EF4444' },
  { value: 'Disposed', label: '🗑️ Disposed', color: '#6B7280' },
];

// ============================================
// VALIDATION SCHEMA
// ============================================

const schema = yup.object().shape({
  name: yup
    .string()
    .required('Item name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  description: yup
    .string()
    .max(500, 'Description must be less than 500 characters')
    .nullable(),
  purchase_value: yup
    .number()
    .typeError('Purchase value must be a number')
    .required('Purchase value is required')
    .positive('Must be a positive number')
    .max(100000000, 'Value seems too high'),
  purchase_date: yup
    .string()
    .nullable(),
  category: yup
    .number()
    .required('Category is required')
    .nullable(),
  location: yup
    .string()
    .required('Location is required')
    .oneOf(['School', 'Headquarters', 'Unassigned'], 'Invalid location'),
  school: yup
    .number()
    .nullable()
    .when('location', {
      is: 'School',
      then: (schema) => schema.required('School is required when location is School'),
      otherwise: (schema) => schema.nullable(),
    }),
  status: yup
    .string()
    .required('Status is required')
    .oneOf(['Available', 'Assigned', 'Damaged', 'Lost', 'Disposed'], 'Invalid status'),
  assigned_to: yup
    .number()
    .nullable(),
  serial_number: yup
  .string()
  .max(100, 'Serial number must be less than 100 characters')
  .nullable(),
warranty_expiry: yup
  .string()
  .nullable(),
});

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
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

const modalHeaderStyle = {
  padding: '1.5rem',
  borderBottom: '1px solid #E5E7EB',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const modalBodyStyle = {
  padding: '1.5rem',
  overflowY: 'auto',
  flex: 1,
};

const modalFooterStyle = {
  padding: '1rem 1.5rem',
  borderTop: '1px solid #E5E7EB',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  backgroundColor: '#F9FAFB',
};

const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: '1px solid #D1D5DB',
  borderRadius: '8px',
  fontSize: '0.875rem',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box',
};

const inputErrorStyle = {
  ...inputStyle,
  borderColor: '#EF4444',
  backgroundColor: '#FEF2F2',
};

const labelStyle = {
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: '500',
  color: '#374151',
  fontSize: '0.875rem',
};

const errorTextStyle = {
  color: '#EF4444',
  fontSize: '0.75rem',
  marginTop: '0.25rem',
};

const fieldGroupStyle = {
  marginBottom: '1.25rem',
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
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,  // Ensures the menu appears above the modal (z-index: 1000)
}),
}

// ============================================
// COMPONENT
// ============================================

export const AddInventoryModal = ({
  isOpen,
  onClose,
  onSuccess,
  editingItem = null,
  categories = [],
  locations = [],  // This is schools list from your API
  users = [],
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryOptions = useMemo(() => 
  categories.map(cat => ({ value: cat.id, label: cat.name })),
  [categories]
);

const schoolOptions = useMemo(() => 
  locations.map(loc => ({ value: loc.id, label: loc.name })),
  [locations]
);

const userOptions = useMemo(() => 
  users.map(user => ({
    value: user.id,
    label: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
  })),
  [users]
);
  // React Hook Form setup
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
    getValues,
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      purchase_value: '',
      purchase_date: '',
      category: null,
      location: 'School',
      school: null,
      status: 'Available',
      assigned_to: null,

      serial_number: editingItem?.serial_number || '',
      warranty_expiry: editingItem?.warranty_expiry || '',
    },
  });
  const assignedTo = watch('assigned_to');
  const watchLocation = watch('location');
 
  // Effect for location-based school clearing (keep as is, but memoize check)
  useEffect(() => {
  if (watchLocation !== 'School' && getValues('school') !== null) {
    setValue('school', null);
  }
}, [watchLocation, getValues, setValue]);
  // Watch location to show/hide school field
  
   // Populate form when editing
  useEffect(() => {
    if (editingItem) {
      reset({
        name: editingItem.name || '',
        description: editingItem.description || '',
        purchase_value: editingItem.purchase_value || '',
        purchase_date: editingItem.purchase_date || '',
        category: editingItem.category || null,
        location: editingItem.location || 'School',
        school: editingItem.school || null,
        status: editingItem.status || 'Available',
        assigned_to: editingItem.assigned_to || null,
      });
    } else {
      reset({
        name: '',
        description: '',
        purchase_value: '',
        purchase_date: new Date().toISOString().split('T')[0],
        category: null,
        location: 'School',
        school: schoolOptions.length > 0 ? schoolOptions[0].value : null,
        status: 'Available',
        assigned_to: null,
      });
    }
  }, [editingItem, reset, schoolOptions]);

  

  useEffect(() => {
  if (assignedTo && getValues('status') !== 'Assigned') {
    setValue('status', 'Assigned');
  }
}, [assignedTo, getValues, setValue]);



  // Form submission handler
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    
    try {
      const payload = {
        name: data.name,
        description: data.description || '',
        purchase_value: Number(data.purchase_value),
        purchase_date: data.purchase_date || null,
        category: data.category,
        location: data.location,
        school: data.location === 'School' ? data.school : null,
        status: data.status,
        assigned_to: data.assigned_to || null,
      };

      console.log('📤 Submitting payload:', payload);

      if (editingItem) {
        await updateInventoryItem(editingItem.id, payload);
        toast.success('Item updated successfully!');
      } else {
        await createInventoryItem(payload);
        toast.success('Item added successfully!');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('❌ Submit error:', error);
      
      if (error.response?.data) {
        // Handle Django validation errors
        const errorData = error.response.data;
        const errorMessages = Object.entries(errorData)
          .map(([field, messages]) => {
            const msg = Array.isArray(messages) ? messages.join(', ') : messages;
            return `${field}: ${msg}`;
          })
          .join('\n');
        toast.error(errorMessages || 'Failed to save item');
      } else {
        toast.error('Failed to save item. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isSubmitting]);

  if (!isOpen) return null;

  return (
    <div 
      style={modalOverlayStyle} 
      onClick={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}
    >
      <div style={modalContentStyle}>
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <div style={modalHeaderStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1F2937' }}>
              {editingItem ? '✏️ Edit Inventory Item' : '➕ Add New Inventory Item'}
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '0.875rem' }}>
              {editingItem ? `Editing: ${editingItem.name}` : 'Fill in the details to add a new item'}
            </p>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.5rem' }}>
  Note: Unique ID will be auto-generated upon creation.
</p>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#6B7280',
              padding: '0.5rem',
              borderRadius: '8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* ============================================ */}
        {/* BODY */}
        {/* ============================================ */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={modalBodyStyle}>
            
            {/* Row 1: Name */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>
                Item Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                {...register('name')}
                placeholder="e.g., Dell Laptop, Office Chair, Projector"
                style={errors.name ? inputErrorStyle : inputStyle}
              />
              {errors.name && <span style={errorTextStyle}>{errors.name.message}</span>}
            </div>

            {/* Row 2: Category */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>
                Category <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                 <Select
  options={categoryOptions}
  value={categoryOptions.find(opt => opt.value === field.value) || null}
  onChange={(selected) => {
    const newValue = selected ? selected.value : null;
    field.onChange(newValue);
    if (newValue && getValues('status') !== 'Assigned') {
      setValue('status', 'Assigned');
    }
  }}
  onBlur={field.onBlur}
  placeholder="Select category..."
  styles={selectStyles}
  isClearable
  menuPortalTarget={document.body}  // Add this line
/>
                )}
              />
              {errors.category && <span style={errorTextStyle}>{errors.category.message}</span>}
            </div>

            {/* Row 3: Location & School */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Location (String Choice) */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>
                  Location <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <Controller
                  name="location"
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={LOCATION_OPTIONS}
                      value={LOCATION_OPTIONS.find(opt => opt.value === field.value) || null}
                      onChange={(selected) => field.onChange(selected ? selected.value : 'School')}
                      styles={selectStyles}
                      isSearchable={false}
                    />
                  )}
                />
                {errors.location && <span style={errorTextStyle}>{errors.location.message}</span>}
              </div>

              {/* School (Conditional - only when location is 'School') */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>
                  School {watchLocation === 'School' && <span style={{ color: '#EF4444' }}>*</span>}
                </label>
                <Controller
                  name="school"
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={schoolOptions}
                      value={schoolOptions.find(opt => opt.value === field.value) || null}
                      onChange={(selected) => field.onChange(selected ? selected.value : null)}
                      placeholder={watchLocation === 'School' ? 'Select school...' : 'N/A'}
                      styles={{
                        ...selectStyles,
                        control: (base, state) => ({
                          ...selectStyles.control(base, state),
                          backgroundColor: watchLocation !== 'School' ? '#F3F4F6' : 'white',
                        }),
                      }}
                      isDisabled={watchLocation !== 'School'}
                      isClearable
                    />
                  )}
                />
                {errors.school && <span style={errorTextStyle}>{errors.school.message}</span>}
              </div>
            </div>

            {/* Row 4: Status & Assigned To */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Status */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>
                  Status <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={STATUS_OPTIONS}
                      value={STATUS_OPTIONS.find(opt => opt.value === field.value) || null}
                      onChange={(selected) => field.onChange(selected ? selected.value : 'Available')}
                      styles={selectStyles}
                      isSearchable={false}
                    />
                  )}
                />
                {errors.status && <span style={errorTextStyle}>{errors.status.message}</span>}
              </div>

              {/* Assigned To */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Assigned To</label>
                <Controller
                  name="assigned_to"
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={userOptions}
                      value={userOptions.find(opt => opt.value === field.value) || null}
                      onChange={(selected) => field.onChange(selected ? selected.value : null)}
                      placeholder="Select user (optional)..."
                      styles={selectStyles}
                      isClearable
                    />
                  )}
                />
                <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                  Note: Status auto-changes to "Assigned" when user is selected
                </span>
              </div>
            </div>

            {/* Row 5: Purchase Value & Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Purchase Value */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>
                  Purchase Value (PKR) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#6B7280',
                    fontSize: '0.875rem',
                    pointerEvents: 'none',
                  }}>
                    PKR
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    {...register('purchase_value')}
                    placeholder="0.00"
                    style={{
                      ...(errors.purchase_value ? inputErrorStyle : inputStyle),
                      paddingLeft: '3.5rem',
                    }}
                  />
                </div>
                {errors.purchase_value && <span style={errorTextStyle}>{errors.purchase_value.message}</span>}
              </div>

              {/* Purchase Date */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Purchase Date</label>
                <input
                  type="date"
                  {...register('purchase_date')}
                  style={errors.purchase_date ? inputErrorStyle : inputStyle}
                />
                {errors.purchase_date && <span style={errorTextStyle}>{errors.purchase_date.message}</span>}
              </div>
            </div>
            {/* Row: Serial Number & Warranty Expiry */}
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
  {/* Serial Number */}
  <div style={fieldGroupStyle}>
    <label style={labelStyle}>Serial Number</label>
    <input
      type="text"
      {...register('serial_number')}
      placeholder="Enter serial number (optional)"
      style={errors.serial_number ? inputErrorStyle : inputStyle}
    />
    {errors.serial_number && <span style={errorTextStyle}>{errors.serial_number.message}</span>}
  </div>

  {/* Warranty Expiry */}
  <div style={fieldGroupStyle}>
    <label style={labelStyle}>Warranty Expiry</label>
    <input
      type="date"
      {...register('warranty_expiry')}
      style={errors.warranty_expiry ? inputErrorStyle : inputStyle}
    />
    {errors.warranty_expiry && <span style={errorTextStyle}>{errors.warranty_expiry.message}</span>}
  </div>
</div>
            {/* Row 6: Description */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Description</label>
              <textarea
                {...register('description')}
                placeholder="Brief description of the item..."
                rows={3}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  minHeight: '80px',
                }}
              />
              {errors.description && <span style={errorTextStyle}>{errors.description.message}</span>}
            </div>

          </div>

          {/* ============================================ */}
          {/* FOOTER */}
          {/* ============================================ */}
          <div style={modalFooterStyle}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
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
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isSubmitting ? '#9CA3AF' : '#10B981',
                color: 'white',
                fontWeight: '500',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {isSubmitting ? (
                <>⏳ {editingItem ? 'Updating...' : 'Adding...'}</>
              ) : (
                <>{editingItem ? '✅ Update Item' : '➕ Add Item'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddInventoryModal;