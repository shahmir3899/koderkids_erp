// ============================================
// TABLE HEADER - Sortable Header Component
// ============================================

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  TRANSITIONS,
} from '../../../utils/designConstants';

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
    padding: SPACING.sm,
    textAlign: align,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.sm,
    color: '#FBBF24', // Golden Yellow for headers
    backgroundColor: 'rgba(139, 92, 246, 0.3)', // Purple tint background
    cursor: sortable ? 'pointer' : 'default',
    userSelect: 'none',
    transition: `background-color ${TRANSITIONS.fast} ease`,
    borderBottom: `2px solid rgba(251, 191, 36, 0.4)`, // Golden border
    width: width,
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const getSortIcon = () => {
    if (!sortable) return null;

    if (!isSorted) {
      return <FontAwesomeIcon icon={faSort} style={{ marginLeft: SPACING.xs, color: 'rgba(251, 191, 36, 0.5)' }} />;
    }

    return (
      <FontAwesomeIcon
        icon={direction === 'asc' ? faSortUp : faSortDown}
        style={{ marginLeft: SPACING.xs, color: '#FBBF24' }}
      />
    );
  };

  return (
    <th
      style={headerStyle}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (sortable) {
          e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.5)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.3)';
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