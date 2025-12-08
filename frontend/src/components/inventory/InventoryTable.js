// ============================================
// INVENTORY TABLE - With RBAC Support
// ============================================
// Location: src/components/inventory/InventoryTable.js
//
// Table with role-based actions:
// - Admin: View, Edit, Print, Delete
// - Teacher: View, Edit, Print (no Delete)
// Both roles can select and transfer items

import React, { useMemo } from 'react';
import { CollapsibleSection } from '../common/cards/CollapsibleSection';
import { DataTable } from '../common/tables/DataTable';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';

// ============================================
// STYLES
// ============================================

const actionButtonStyle = (color, hoverColor) => ({
  padding: '0.375rem 0.625rem',
  backgroundColor: color,
  color: 'white',
  border: 'none',
  borderRadius: '0.375rem',
  fontSize: '0.75rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  transition: 'background-color 0.15s ease',
});

const statusColors = {
  Available: { bg: '#D1FAE5', text: '#065F46' },
  Assigned: { bg: '#DBEAFE', text: '#1E40AF' },
  Damaged: { bg: '#FEF3C7', text: '#92400E' },
  Lost: { bg: '#FEE2E2', text: '#991B1B' },
  Disposed: { bg: '#E5E7EB', text: '#374151' },
};

// ============================================
// COMPONENT
// ============================================

export const InventoryTable = ({
  userContext,
  items,
  loading,
  selectedItemIds,
  toggleItemSelection,
  toggleSelectAll,
  clearSelection,
  onViewDetails,
  onEdit,
  onDelete,
  onPrintCertificate,
  onOpenTransfer,
  onOpenReport,
  certificateLoading = {},
}) => {
  const { isAdmin, canDelete } = userContext;

  // ============================================
  // TABLE COLUMNS
  // ============================================

  const columns = useMemo(() => {
    const cols = [
      // Select checkbox
      {
        key: 'select',
        label: (
          <input
            type="checkbox"
            checked={selectedItemIds.length === items.length && items.length > 0}
            onChange={toggleSelectAll}
            style={{ cursor: 'pointer' }}
          />
        ),
        sortable: false,
        width: '40px',
        render: (_, row) => (
          <input
            type="checkbox"
            checked={selectedItemIds.includes(row.id)}
            onChange={() => toggleItemSelection(row.id)}
            style={{ cursor: 'pointer' }}
          />
        ),
      },
      // Name with unique ID
      {
        key: 'name',
        label: 'Item',
        sortable: true,
        render: (value, row) => (
          <div>
            <div style={{ fontWeight: '500', color: '#1F2937' }}>{value}</div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6B7280',
              fontFamily: 'monospace',
            }}>
              {row.unique_id}
            </div>
            {row.description && (
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#9CA3AF',
                marginTop: '0.125rem',
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {row.description}
              </div>
            )}
          </div>
        ),
      },
      // Category
      {
        key: 'category_name',
        label: 'Category',
        sortable: true,
        width: '120px',
        render: (value) => (
          <span style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: '#F3F4F6',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            color: '#4B5563',
          }}>
            {value || 'Uncategorized'}
          </span>
        ),
      },
      // Status
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        width: '100px',
        render: (value) => {
          const colors = statusColors[value] || statusColors.Available;
          return (
            <span style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: colors.bg,
              color: colors.text,
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: '500',
            }}>
              {value}
            </span>
          );
        },
      },
      // Location
      {
        key: 'location',
        label: 'Location',
        sortable: true,
        width: '150px',
        render: (value, row) => (
          <div>
            <div style={{ fontSize: '0.875rem' }}>{value}</div>
            {row.school_name && (
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                {row.school_name}
              </div>
            )}
          </div>
        ),
      },
      // Value
      {
        key: 'purchase_value',
        label: 'Value',
        sortable: true,
        width: '100px',
        render: (value) => (
          <span style={{ fontWeight: '500', color: '#059669' }}>
            PKR {Number(value || 0).toLocaleString()}
          </span>
        ),
      },
      // Assigned To
      {
        key: 'assigned_to_name',
        label: 'Assigned To',
        sortable: true,
        width: '120px',
        render: (value) => (
          <span style={{ 
            color: value ? '#1F2937' : '#9CA3AF',
            fontSize: '0.875rem',
          }}>
            {value || 'Unassigned'}
          </span>
        ),
      },
      // Actions
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        width: canDelete ? '200px' : '160px',
        render: (_, row) => {
          const isCertLoading = certificateLoading[row.id];
          
          return (
            <div style={{ 
              display: 'flex', 
              gap: '0.375rem',
              flexWrap: 'wrap',
            }}>
              {/* View Button */}
              <button
                onClick={() => onViewDetails(row)}
                style={actionButtonStyle('#3B82F6')}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563EB'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3B82F6'}
                title="View Details"
              >
                👁️
              </button>

              {/* Edit Button */}
              <button
                onClick={() => onEdit(row)}
                style={actionButtonStyle('#F59E0B')}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#D97706'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#F59E0B'}
                title="Edit Item"
              >
                ✏️
              </button>

              {/* Print Certificate Button */}
              <button
                onClick={() => onPrintCertificate(row.id)}
                disabled={isCertLoading}
                style={{
                  ...actionButtonStyle(isCertLoading ? '#9CA3AF' : '#6366F1'),
                  cursor: isCertLoading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => !isCertLoading && (e.target.style.backgroundColor = '#4F46E5')}
                onMouseLeave={(e) => !isCertLoading && (e.target.style.backgroundColor = '#6366F1')}
                title="Print Certificate"
              >
                {isCertLoading ? '⏳' : '🖨️'}
              </button>

              {/* Delete Button - Admin Only */}
              {canDelete && (
                <button
                  onClick={() => onDelete(row)}
                  style={actionButtonStyle('#EF4444')}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#DC2626'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#EF4444'}
                  title="Delete Item"
                >
                  🗑️
                </button>
              )}
            </div>
          );
        },
      },
    ];

    return cols;
  }, [
    items,
    selectedItemIds,
    toggleSelectAll,
    toggleItemSelection,
    onViewDetails,
    onEdit,
    onDelete,
    onPrintCertificate,
    certificateLoading,
    canDelete,
  ]);

  // ============================================
  // SELECTION BAR
  // ============================================

  const SelectionBar = () => {
    if (selectedItemIds.length === 0) return null;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        backgroundColor: '#EFF6FF',
        borderRadius: '0.5rem',
        marginBottom: '1rem',
        border: '1px solid #BFDBFE',
      }}>
        <span style={{ 
          fontSize: '0.875rem', 
          fontWeight: '500',
          color: '#1E40AF',
        }}>
          {selectedItemIds.length} item{selectedItemIds.length !== 1 ? 's' : ''} selected
        </span>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onOpenTransfer}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#8B5CF6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.8125rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            📦 Transfer Selected
          </button>
          
          <button
            onClick={clearSelection}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '0.375rem',
              fontSize: '0.8125rem',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // HEADER ACTION (Reports Button)
  // ============================================

  const HeaderAction = () => (
    <button
      onClick={onOpenReport}
      style={{
        padding: '0.5rem 1rem',
        backgroundColor: '#059669',
        color: 'white',
        border: 'none',
        borderRadius: '0.375rem',
        fontSize: '0.8125rem',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
      }}
    >
      📊 Reports
    </button>
  );

  // ============================================
  // RENDER
  // ============================================

  return (
    <CollapsibleSection
      title={`📋 Inventory Items ${items.length > 0 ? `(${items.length})` : ''}`}
      defaultOpen={true}
      headerAction={<HeaderAction />}
    >
      <SelectionBar />

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <LoadingSpinner size="medium" message="Loading items..." />
        </div>
      ) : items.length > 0 ? (
        <DataTable
          data={items}
          columns={columns}
          emptyMessage="No inventory items found."
          striped
          hoverable
          maxHeight="600px"
        />
      ) : (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#6B7280',
          backgroundColor: '#F9FAFB',
          borderRadius: '0.5rem',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <p style={{ margin: 0, fontSize: '1rem' }}>
            No inventory items found.
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#9CA3AF' }}>
            {isAdmin 
              ? 'Add your first item or adjust the filters.'
              : 'No items at your assigned schools, or adjust filters.'
            }
          </p>
        </div>
      )}
    </CollapsibleSection>
  );
};

export default InventoryTable;