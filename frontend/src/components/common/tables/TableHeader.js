// ============================================
// TABLE HEADER - Sortable Header Component
// ============================================

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';

/**
 * TableHeader Component
 * @param {Object} props
 * @param {string} props.label - Header label text
 * @param {string} props.sortKey - Key for sorting
 * @param {Object} props.sortConfig - Current sort configuration {key, direction}
 * @param {Function} props.onSort - Sort handler function
 * @param {string} props.align - Text alignment: 'left', 'center', 'right' (default: 'left')
 * @param {boolean} props.sortable - Whether column is sortable (default: true)
 * @param {string} props.width - Column width (optional)
 * @param {string} props.className - Additional CSS classes
 */
export const TableHeader = ({
  label,
  sortKey,
  sortConfig,
  onSort,
  align = 'left',
  sortable = true,
  width = 'auto',
  className = '',
}) => {
  const isSorted = sortConfig.key === sortKey;
  const direction = sortConfig.direction;

  const handleClick = () => {
    if (sortable && onSort) {
      onSort(sortKey);
    }
  };

  const headerStyle = {
    padding: '1rem',
    textAlign: align,
    fontWeight: '600',
    fontSize: '0.875rem',
    color: '#374151',
    backgroundColor: '#F9FAFB',
    cursor: sortable ? 'pointer' : 'default',
    userSelect: 'none',
    transition: 'background-color 0.15s ease',
    borderBottom: '2px solid #E5E7EB',
    width: width,
    whiteSpace: 'nowrap',
  };

  const getSortIcon = () => {
    if (!sortable) return null;
    
    if (!isSorted) {
      return <FontAwesomeIcon icon={faSort} style={{ marginLeft: '0.5rem', color: '#9CA3AF' }} />;
    }
    
    return (
      <FontAwesomeIcon 
        icon={direction === 'asc' ? faSortUp : faSortDown} 
        style={{ marginLeft: '0.5rem', color: '#3B82F6' }} 
      />
    );
  };

  return (
    <th
      style={headerStyle}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (sortable) {
          e.currentTarget.style.backgroundColor = '#F3F4F6';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#F9FAFB';
      }}
      className={className}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}>
        <span>{label}</span>
        {getSortIcon()}
      </div>
    </th>
  );
};

export default TableHeader;