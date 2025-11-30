// ============================================
// DATA TABLE - Reusable Table Component
// ============================================

import React from 'react';
import { TableHeader } from './TableHeader';
import { useTableSort } from '../../../hooks/useTableSort';
import { LoadingSpinner, SkeletonLoader } from '../ui/LoadingSpinner';

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

  // Container style
  const containerStyle = {
    width: '100%',
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    backgroundColor: '#FFFFFF',
    ...(maxHeight && {
      maxHeight: maxHeight,
      overflowY: 'auto',
    }),
  };

  // Table style
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
  };

  // Row style
  const getRowStyle = (index) => ({
    backgroundColor: striped && index % 2 === 0 ? '#F9FAFB' : '#FFFFFF',
    transition: 'background-color 0.15s ease',
    cursor: onRowClick ? 'pointer' : 'default',
    borderBottom: '1px solid #E5E7EB',
  });

  // Cell style
  const cellStyle = (align = 'left') => ({
    padding: '1rem',
    textAlign: align,
    color: '#374151',
  });

  // Loading state
  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ padding: '2rem' }}>
          <LoadingSpinner size="medium" message="Loading data..." />
          <div style={{ marginTop: '1rem' }}>
            <SkeletonLoader rows={5} height="2rem" />
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{ 
          padding: '3rem', 
          textAlign: 'center', 
          color: '#9CA3AF',
          fontSize: '1rem'
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
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }
              }}
              onMouseLeave={(e) => {
                if (hoverable) {
                  e.currentTarget.style.backgroundColor = 
                    striped && rowIndex % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
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