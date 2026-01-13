// ============================================
// PAGINATION - Reusable Pagination Component
// ============================================
// Location: src/components/common/ui/Pagination.js

import React from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
} from '../../../utils/designConstants';

/**
 * Pagination Component
 * @param {Object} props
 * @param {number} props.currentPage - Current active page (1-indexed)
 * @param {number} props.totalItems - Total number of items
 * @param {number} props.itemsPerPage - Items per page
 * @param {Function} props.onPageChange - Callback when page changes
 * @param {boolean} props.showPageInfo - Show "Page X of Y" text (default: true)
 * @param {string} props.size - Size: 'small' | 'medium' | 'large' (default: 'medium')
 * @param {string} props.className - Additional CSS classes
 */
export const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  showPageInfo = true,
  size = 'medium',
  className = '',
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage >= totalPages;

  // Size configurations using design constants
  const sizes = {
    small: { padding: `${SPACING.xs} 0.75rem`, fontSize: FONT_SIZES.xs, gap: SPACING.xs },
    medium: { padding: `${SPACING.xs} ${SPACING.sm}`, fontSize: FONT_SIZES.sm, gap: SPACING.sm },
    large: { padding: `0.75rem ${SPACING.md}`, fontSize: FONT_SIZES.lg, gap: SPACING.md },
  };

  const { padding, fontSize, gap } = sizes[size] || sizes.medium;

  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap,
    marginTop: SPACING.sm,
  };

  const buttonStyle = {
    padding,
    fontSize,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    backgroundColor: COLORS.status.info,
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    backgroundColor: COLORS.border.light,
    cursor: 'not-allowed',
    opacity: 0.6,
  };

  const pageInfoStyle = {
    fontSize,
    color: COLORS.text.whiteSubtle,
    fontWeight: FONT_WEIGHTS.medium,
  };

  const handlePrevious = () => {
    if (!isFirstPage) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (!isLastPage) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) {
    return null; // Don't show pagination if only one page
  }

  return (
    <div style={containerStyle} className={className}>
      <button
        onClick={handlePrevious}
        disabled={isFirstPage}
        style={isFirstPage ? disabledButtonStyle : buttonStyle}
        onMouseEnter={(e) => {
          if (!isFirstPage) e.currentTarget.style.backgroundColor = COLORS.status.infoDark;
        }}
        onMouseLeave={(e) => {
          if (!isFirstPage) e.currentTarget.style.backgroundColor = COLORS.status.info;
        }}
        aria-label="Previous page"
      >
        ← Previous
      </button>

      {showPageInfo && (
        <span style={pageInfoStyle}>
          Page {currentPage} of {totalPages}
        </span>
      )}

      <button
        onClick={handleNext}
        disabled={isLastPage}
        style={isLastPage ? disabledButtonStyle : buttonStyle}
        onMouseEnter={(e) => {
          if (!isLastPage) e.currentTarget.style.backgroundColor = COLORS.status.infoDark;
        }}
        onMouseLeave={(e) => {
          if (!isLastPage) e.currentTarget.style.backgroundColor = COLORS.status.info;
        }}
        aria-label="Next page"
      >
        Next →
      </button>
    </div>
  );
};

export default Pagination;