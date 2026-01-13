// ============================================
// DATA TABLE - Reusable Table Component
// ============================================

import React from 'react';
import { TableHeader } from './TableHeader';
import { useTableSort } from '../../../hooks/useTableSort';
import { LoadingSpinner, SkeletonLoader } from '../ui/LoadingSpinner';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  MIXINS,
  TRANSITIONS,
} from '../../../utils/designConstants';

/**
 * DataTable Component
 * @param {Object} props
 * @param {Array} props.data - Array of data objects
 * @param {Array} props.columns - Column configuration
 * @param {boolean} props.loading - Loading state (default: false)
 * @param {string} props.emptyMessage - Message when no data (default: 'No data available')
 * @param {boolean} props.striped - Alternating row colors (default: true)
 * @param {boolean} props.hoverable - Hover effect on rows (default: true)
 * @param {string} props.maxHeight - Max height with scroll (optional)
 * @param {Function} props.onRowClick - Row click handler (optional)
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.initialSort - Initial sort config (optional)
 */
export const DataTable = ({
  data = [],
  columns = [],
  loading = false,
  emptyMessage = 'No data available',
  striped = true,
  hoverable = true,
  maxHeight = null,
  onRowClick = null,
  className = '',
  initialSort = { key: null, direction: 'asc' },
}) => {
  const { sortedData, sortConfig, handleSort } = useTableSort(data, initialSort);

  // Container style using design constants
  const containerStyle = {
    width: '100%',
    overflowX: 'auto',
    borderRadius: BORDER_RADIUS.lg,
    ...MIXINS.glassmorphicSubtle,
    ...(maxHeight && {
      maxHeight: maxHeight,
      overflowY: 'auto',
    }),
  };

  // Table style using design constants
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: FONT_SIZES.sm,
  };

  // Row style using design constants
  const getRowStyle = (index) => ({
    backgroundColor: striped && index % 2 === 0 ? COLORS.border.whiteSubtle : 'transparent',
    transition: `background-color ${TRANSITIONS.fast} ease`,
    cursor: onRowClick ? 'pointer' : 'default',
    borderBottom: `1px solid ${COLORS.border.whiteSubtle}`,
  });

  // Cell style using design constants
  const cellStyle = (align = 'left') => ({
    padding: SPACING.sm,
    textAlign: align,
    color: COLORS.text.white,
  });

  // Loading state using design constants
  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ padding: SPACING.lg }}>
          <LoadingSpinner size="medium" message="Loading data..." />
          <div style={{ marginTop: SPACING.sm }}>
            <SkeletonLoader rows={5} height={SPACING.lg} />
          </div>
        </div>
      </div>
    );
  }

  // Empty state using design constants
  if (!data || data.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{
          padding: SPACING.xl,
          textAlign: 'center',
          color: COLORS.text.whiteSubtle,
          fontSize: FONT_SIZES.lg,
        }}>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} className={className}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map((column) => (
              <TableHeader
                key={column.key}
                label={column.label}
                sortKey={column.key}
                sortConfig={sortConfig}
                onSort={handleSort}
                align={column.align || 'left'}
                sortable={column.sortable !== false}
                width={column.width}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIndex) => (
            <tr
              key={row.id || rowIndex}
              style={getRowStyle(rowIndex)}
              onClick={() => onRowClick && onRowClick(row)}
              onMouseEnter={(e) => {
                if (hoverable) {
                  e.currentTarget.style.backgroundColor = COLORS.background.whiteStrong;
                }
              }}
              onMouseLeave={(e) => {
                if (hoverable) {
                  e.currentTarget.style.backgroundColor =
                    striped && rowIndex % 2 === 0 ? COLORS.border.whiteSubtle : 'transparent';
                }
              }}
            >
              {columns.map((column) => (
                <td key={column.key} style={cellStyle(column.align)}>
                  {column.render 
                    ? column.render(row[column.key], row) 
                    : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;