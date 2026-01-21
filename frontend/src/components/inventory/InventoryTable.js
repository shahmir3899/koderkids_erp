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
import { useResponsive } from '../../hooks/useResponsive';
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  TRANSITIONS,
  TOUCH_TARGETS,
} from '../../utils/designConstants';

// ============================================
// STYLES
// ============================================

const getActionButtonStyle = (color, isMobile) => ({
  padding: isMobile ? SPACING.sm : `${SPACING.xs} ${SPACING.sm}`,
  backgroundColor: color,
  color: 'white',
  border: 'none',
  borderRadius: BORDER_RADIUS.md,
  fontSize: isMobile ? '1rem' : '0.75rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: SPACING.xs,
  transition: TRANSITIONS.fast,
  minWidth: isMobile ? TOUCH_TARGETS.minimum : 'auto',
  minHeight: isMobile ? TOUCH_TARGETS.minimum : 'auto',
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
  noCollapse = false,
}) => {
  const { isAdmin, canDelete } = userContext;
  const { isMobile, isTablet } = useResponsive();

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
            style={{
              cursor: 'pointer',
              width: isMobile ? '20px' : '16px',
              height: isMobile ? '20px' : '16px',
            }}
          />
        ),
        sortable: false,
        width: isMobile ? '36px' : '40px',
        render: (_, row) => (
          <input
            type="checkbox"
            checked={selectedItemIds.includes(row.id)}
            onChange={() => toggleItemSelection(row.id)}
            style={{
              cursor: 'pointer',
              width: isMobile ? '20px' : '16px',
              height: isMobile ? '20px' : '16px',
            }}
          />
        ),
      },
      // Name with unique ID - includes status and location on mobile
      {
        key: 'name',
        label: 'Item',
        sortable: true,
        render: (value, row) => (
          <div>
            <div style={{ fontWeight: '500', color: COLORS.text.white }}>{value}</div>
            <div style={{
              fontSize: '0.75rem',
              color: COLORS.text.whiteSubtle,
              fontFamily: 'monospace',
            }}>
              {row.unique_id}
            </div>
            {/* Show status inline on mobile */}
            {isMobile && (
              <div style={{ marginTop: SPACING.xs }}>
                <span style={{
                  padding: `${SPACING.xs} ${SPACING.sm}`,
                  backgroundColor: (statusColors[row.status] || statusColors.Available).bg,
                  color: (statusColors[row.status] || statusColors.Available).text,
                  borderRadius: BORDER_RADIUS.sm,
                  fontSize: '0.7rem',
                  fontWeight: '500',
                }}>
                  {row.status}
                </span>
              </div>
            )}
            {/* Show location on mobile */}
            {isMobile && row.location && (
              <div style={{
                fontSize: '0.7rem',
                color: COLORS.text.whiteSubtle,
                marginTop: SPACING.xs,
              }}>
                📍 {row.location}
              </div>
            )}
            {!isMobile && row.description && (
              <div style={{
                fontSize: '0.75rem',
                color: COLORS.text.whiteSubtle,
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
    ];

    // Hide Category on mobile
    if (!isMobile) {
      cols.push({
        key: 'category_name',
        label: 'Category',
        sortable: true,
        width: isTablet ? '100px' : '120px',
        render: (value) => (
          <span style={{
            padding: `${SPACING.xs} ${SPACING.sm}`,
            backgroundColor: COLORS.background.whiteSubtle,
            borderRadius: BORDER_RADIUS.sm,
            fontSize: '0.75rem',
            color: COLORS.text.whiteMedium,
          }}>
            {value || 'Uncategorized'}
          </span>
        ),
      });
    }

    // Hide Status column on mobile (shown inline in Item column)
    if (!isMobile) {
      cols.push({
        key: 'status',
        label: 'Status',
        sortable: true,
        width: isTablet ? '90px' : '100px',
        render: (value) => {
          const colors = statusColors[value] || statusColors.Available;
          return (
            <span style={{
              padding: `${SPACING.xs} ${SPACING.sm}`,
              backgroundColor: colors.bg,
              color: colors.text,
              borderRadius: BORDER_RADIUS.sm,
              fontSize: '0.75rem',
              fontWeight: '500',
            }}>
              {value}
            </span>
          );
        },
      });
    }

    // Hide Location on mobile (shown inline in Item column)
    if (!isMobile) {
      cols.push({
        key: 'location',
        label: 'Location',
        sortable: true,
        width: isTablet ? '120px' : '150px',
        render: (value, row) => (
          <div>
            <div style={{ fontSize: '0.875rem', color: COLORS.text.white }}>{value}</div>
            {row.school_name && (
              <div style={{ fontSize: '0.75rem', color: COLORS.text.whiteSubtle }}>
                {row.school_name}
              </div>
            )}
          </div>
        ),
      });
    }

    // Hide Value on mobile
    if (!isMobile) {
      cols.push({
        key: 'purchase_value',
        label: 'Value',
        sortable: true,
        width: isTablet ? '90px' : '100px',
        render: (value) => (
          <span style={{ fontWeight: '500', color: COLORS.status.success }}>
            PKR {Number(value || 0).toLocaleString()}
          </span>
        ),
      });
    }

    // Hide Assigned To on mobile and tablet
    if (!isMobile && !isTablet) {
      cols.push({
        key: 'assigned_to_name',
        label: 'Assigned To',
        sortable: true,
        width: '120px',
        render: (value) => (
          <span style={{
            color: value ? COLORS.text.white : COLORS.text.whiteSubtle,
            fontSize: '0.875rem',
          }}>
            {value || 'Unassigned'}
          </span>
        ),
      });
    }

    // Actions column - always visible
    cols.push({
      key: 'actions',
      label: 'Actions',
      sortable: false,
      width: isMobile ? 'auto' : (canDelete ? '180px' : '140px'),
      render: (_, row) => {
        const isCertLoading = certificateLoading[row.id];

        return (
          <div style={{
            display: 'flex',
            gap: isMobile ? SPACING.sm : SPACING.xs,
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'flex-start' : 'flex-start',
          }}>
            {/* View Button */}
            <button
              onClick={() => onViewDetails(row)}
              style={getActionButtonStyle('#3B82F6', isMobile)}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#2563EB'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#3B82F6'}
              title="View Details"
              aria-label="View item details"
            >
              👁️
            </button>

            {/* Edit Button */}
            <button
              onClick={() => onEdit(row)}
              style={getActionButtonStyle('#F59E0B', isMobile)}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#D97706'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#F59E0B'}
              title="Edit Item"
              aria-label="Edit item"
            >
              ✏️
            </button>

            {/* Print Certificate Button - hide on mobile to save space */}
            {!isMobile && (
              <button
                onClick={() => onPrintCertificate(row.id)}
                disabled={isCertLoading}
                style={{
                  ...getActionButtonStyle(isCertLoading ? '#9CA3AF' : '#6366F1', isMobile),
                  cursor: isCertLoading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => !isCertLoading && (e.target.style.backgroundColor = '#4F46E5')}
                onMouseLeave={(e) => !isCertLoading && (e.target.style.backgroundColor = '#6366F1')}
                title="Print Certificate"
                aria-label="Print certificate"
              >
                {isCertLoading ? '⏳' : '🖨️'}
              </button>
            )}

            {/* Delete Button - Admin Only */}
            {canDelete && (
              <button
                onClick={() => onDelete(row)}
                style={getActionButtonStyle('#EF4444', isMobile)}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#DC2626'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#EF4444'}
                title="Delete Item"
                aria-label="Delete item"
              >
                🗑️
              </button>
            )}
          </div>
        );
      },
    });

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
    isMobile,
    isTablet,
  ]);

  // ============================================
  // SELECTION BAR
  // ============================================

  const SelectionBar = () => {
    if (selectedItemIds.length === 0) return null;

    return (
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? SPACING.sm : 0,
        padding: isMobile ? SPACING.sm : SPACING.md,
        backgroundColor: '#EFF6FF',
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.md,
        border: '1px solid #BFDBFE',
      }}>
        <span style={{
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#1E40AF',
          textAlign: isMobile ? 'center' : 'left',
        }}>
          {selectedItemIds.length} item{selectedItemIds.length !== 1 ? 's' : ''} selected
        </span>

        <div style={{
          display: 'flex',
          gap: SPACING.sm,
          justifyContent: isMobile ? 'center' : 'flex-end',
        }}>
          <button
            onClick={onOpenTransfer}
            style={{
              padding: isMobile ? SPACING.sm : `${SPACING.sm} ${SPACING.md}`,
              backgroundColor: '#8B5CF6',
              color: 'white',
              border: 'none',
              borderRadius: BORDER_RADIUS.md,
              fontSize: isMobile ? '0.875rem' : '0.8125rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SPACING.xs,
              minHeight: TOUCH_TARGETS.minimum,
              flex: isMobile ? 1 : 'none',
            }}
          >
            📦 {isMobile ? 'Transfer' : 'Transfer Selected'}
          </button>

          <button
            onClick={clearSelection}
            style={{
              padding: isMobile ? SPACING.sm : `${SPACING.sm} ${SPACING.md}`,
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: BORDER_RADIUS.md,
              fontSize: isMobile ? '0.875rem' : '0.8125rem',
              fontWeight: '500',
              cursor: 'pointer',
              minHeight: TOUCH_TARGETS.minimum,
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
        padding: isMobile ? SPACING.sm : `${SPACING.sm} ${SPACING.md}`,
        backgroundColor: '#059669',
        color: 'white',
        border: 'none',
        borderRadius: BORDER_RADIUS.md,
        fontSize: isMobile ? '0.875rem' : '0.8125rem',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        minHeight: TOUCH_TARGETS.minimum,
        transition: TRANSITIONS.fast,
      }}
      aria-label="View Reports"
    >
      📊 {isMobile ? '' : 'Reports'}
    </button>
  );

  // ============================================
  // RENDER
  // ============================================

  const tableContent = (
    <>
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
          padding: isMobile ? SPACING.lg : SPACING.xl,
          textAlign: 'center',
          color: COLORS.text.whiteSubtle,
          backgroundColor: COLORS.background.whiteSubtle,
          borderRadius: BORDER_RADIUS.md,
        }}>
          <div style={{ fontSize: isMobile ? '2.5rem' : '3rem', marginBottom: SPACING.md }}>📦</div>
          <p style={{ margin: 0, fontSize: isMobile ? '0.9375rem' : '1rem', color: COLORS.text.white }}>
            No inventory items found.
          </p>
          <p style={{
            margin: `${SPACING.sm} 0 0`,
            fontSize: isMobile ? '0.8125rem' : '0.875rem',
            color: COLORS.text.whiteSubtle,
          }}>
            {isAdmin
              ? 'Add your first item or adjust the filters.'
              : 'No items at your assigned schools, or adjust filters.'
            }
          </p>
        </div>
      )}
    </>
  );

  // If noCollapse, return content directly without CollapsibleSection wrapper
  if (noCollapse) {
    return (
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: SPACING.md,
        }}>
          <h3 style={{ margin: 0, color: COLORS.text.white, fontSize: '1rem' }}>
            📋 Inventory Items {items.length > 0 ? `(${items.length})` : ''}
          </h3>
          <HeaderAction />
        </div>
        {tableContent}
      </div>
    );
  }

  return (
    <CollapsibleSection
      title={`📋 Inventory Items ${items.length > 0 ? `(${items.length})` : ''}`}
      defaultOpen={true}
      headerAction={<HeaderAction />}
    >
      {tableContent}
    </CollapsibleSection>
  );
};

export default InventoryTable;