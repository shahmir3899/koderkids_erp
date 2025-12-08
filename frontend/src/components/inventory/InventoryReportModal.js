// ============================================
// INVENTORY REPORT MODAL - Standalone Report Generation
// ============================================
// Location: src/components/inventory/InventoryReportModal.js
//
// Features:
// - Generate inventory list reports with filters
// - Filter by location, school, category, status, assigned user
// - Groups identical items with quantity
// - Downloads PDF with bg.png background

import React, { useState, useMemo } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { generateInventoryListReport } from '../../services/inventoryService';

// ============================================
// CONSTANTS
// ============================================

const LOCATION_OPTIONS = [
  { value: '', label: '📍 All Locations' },
  { value: 'School', label: '🏫 School' },
  { value: 'Headquarters', label: '🏢 Headquarters' },
  { value: 'Unassigned', label: '📦 Unassigned' },
];

const STATUS_OPTIONS = [
  { value: '', label: '📊 All Statuses' },
  { value: 'Available', label: '✅ Available' },
  { value: 'Assigned', label: '👤 Assigned' },
  { value: 'Damaged', label: '⚠️ Damaged' },
  { value: 'Lost', label: '❌ Lost' },
  { value: 'Disposed', label: '🗑️ Disposed' },
];

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

const labelStyle = {
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: '500',
  color: '#374151',
  fontSize: '0.875rem',
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
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

// ============================================
// COMPONENT
// ============================================

export const InventoryReportModal = ({
  isOpen,
  onClose,
  categories = [],
  schools = [],
  users = [],
}) => {
  // Filter state
  const [location, setLocation] = useState('');
  const [school, setSchool] = useState(null);
  const [category, setCategory] = useState(null);
  const [status, setStatus] = useState('');
  const [assignedTo, setAssignedTo] = useState(null);
  const [groupItems, setGroupItems] = useState(true);
  
  const [isGenerating, setIsGenerating] = useState(false);

  // Options for selects
  const categoryOptions = useMemo(() => [
    { value: '', label: '📁 All Categories' },
    ...categories.map(c => ({ value: c.id, label: c.name }))
  ], [categories]);

  const schoolOptions = useMemo(() => [
    { value: '', label: '🏫 All Schools' },
    ...schools.map(s => ({ value: s.id, label: s.name }))
  ], [schools]);

  const userOptions = useMemo(() => [
    { value: '', label: '👥 All Users' },
    ...users.map(u => ({ 
      value: u.id, 
      label: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username 
    }))
  ], [users]);

  // Check if any filter is applied
  const hasFilters = location || school?.value || category?.value || status || assignedTo?.value;

  // Generate report
  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const filters = {};
      if (location) filters.location = location;
      if (school?.value) filters.school_id = school.value;
      if (category?.value) filters.category_id = category.value;
      if (status) filters.status = status;
      if (assignedTo?.value) filters.assigned_to_id = assignedTo.value;

      const response = await generateInventoryListReport({
        filters,
        group_items: groupItems,
      });

      // Response is a PDF blob - trigger download
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Inventory_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Report generated successfully!');
      onClose();
      
    } catch (error) {
      console.error('Report generation error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to generate report';
      toast.error(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Reset filters
  const handleReset = () => {
    setLocation('');
    setSchool(null);
    setCategory(null);
    setStatus('');
    setAssignedTo(null);
    setGroupItems(true);
  };

  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalContentStyle}>
        {/* Header */}
        <div style={modalHeaderStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1F2937' }}>
              📄 Generate Inventory Report
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6B7280' }}>
              Select filters to customize your report
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
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={modalBodyStyle}>
          {/* Info Box */}
          <div style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <span style={{ fontSize: '1.25rem' }}>💡</span>
            <span style={{ fontSize: '0.875rem', color: '#1E40AF' }}>
              Leave filters empty to include all items in the report.
            </span>
          </div>

          {/* Location Filter */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Location</label>
              <Select
                options={LOCATION_OPTIONS}
                value={LOCATION_OPTIONS.find(opt => opt.value === location) || LOCATION_OPTIONS[0]}
                onChange={(selected) => {
                  setLocation(selected?.value || '');
                  if (selected?.value !== 'School') setSchool(null);
                }}
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>School</label>
              <Select
                options={schoolOptions}
                value={school || schoolOptions[0]}
                onChange={setSchool}
                isDisabled={location && location !== 'School'}
                styles={{
                  ...selectStyles,
                  control: (base, state) => ({
                    ...selectStyles.control(base, state),
                    backgroundColor: location && location !== 'School' ? '#F3F4F6' : 'white',
                  }),
                }}
                menuPortalTarget={document.body}
              />
            </div>
          </div>

          {/* Category & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Category</label>
              <Select
                options={categoryOptions}
                value={category || categoryOptions[0]}
                onChange={setCategory}
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Status</label>
              <Select
                options={STATUS_OPTIONS}
                value={STATUS_OPTIONS.find(opt => opt.value === status) || STATUS_OPTIONS[0]}
                onChange={(selected) => setStatus(selected?.value || '')}
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>
          </div>

          {/* Assigned To */}
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Assigned To</label>
            <Select
              options={userOptions}
              value={assignedTo || userOptions[0]}
              onChange={setAssignedTo}
              styles={selectStyles}
              menuPortalTarget={document.body}
            />
          </div>

          {/* Group Items Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            backgroundColor: '#F9FAFB',
            borderRadius: '8px',
            marginTop: '0.5rem',
          }}>
            <div>
              <div style={{ fontWeight: '500', color: '#374151', fontSize: '0.875rem' }}>
                Group Identical Items
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                Combine items with same name and category with quantity count
              </div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
              <input
                type="checkbox"
                checked={groupItems}
                onChange={(e) => setGroupItems(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: groupItems ? '#10B981' : '#D1D5DB',
                borderRadius: '24px',
                transition: 'background-color 0.2s',
              }}>
                <span style={{
                  position: 'absolute',
                  height: '20px',
                  width: '20px',
                  left: groupItems ? '26px' : '2px',
                  bottom: '2px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </span>
            </label>
          </div>

          {/* Active Filters Summary */}
          {hasFilters && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: '8px',
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}>
                <span style={{ fontWeight: '500', color: '#92400E', fontSize: '0.875rem' }}>
                  Active Filters:
                </span>
                <button
                  onClick={handleReset}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#B45309',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Clear All
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {location && (
                  <span style={{
                    backgroundColor: '#FDE68A',
                    color: '#92400E',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                  }}>
                    Location: {location}
                  </span>
                )}
                {school?.value && (
                  <span style={{
                    backgroundColor: '#FDE68A',
                    color: '#92400E',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                  }}>
                    School: {school.label}
                  </span>
                )}
                {category?.value && (
                  <span style={{
                    backgroundColor: '#FDE68A',
                    color: '#92400E',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                  }}>
                    Category: {category.label}
                  </span>
                )}
                {status && (
                  <span style={{
                    backgroundColor: '#FDE68A',
                    color: '#92400E',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                  }}>
                    Status: {status}
                  </span>
                )}
                {assignedTo?.value && (
                  <span style={{
                    backgroundColor: '#FDE68A',
                    color: '#92400E',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                  }}>
                    Assigned: {assignedTo.label}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={modalFooterStyle}>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: 'white',
              color: '#374151',
              fontWeight: '500',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: isGenerating ? '#9CA3AF' : '#3B82F6',
              color: 'white',
              fontWeight: '500',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {isGenerating ? (
              <>
                <span style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid #fff',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Generating...
              </>
            ) : (
              <>📄 Generate Report</>
            )}
          </button>
        </div>
      </div>

      {/* Spinner animation */}
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

export default InventoryReportModal;