// ============================================
// PAGINATION - Reusable Pagination Component
// ============================================
// Location: src/components/common/ui/Pagination.js

import React from 'react';

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

  // Size configurations
  const sizes = {
    small: { padding: '0.375rem 0.75rem', fontSize: '0.75rem', gap: '0.5rem' },
    medium: { padding: '0.5rem 1rem', fontSize: '0.875rem', gap: '1rem' },
    large: { padding: '0.75rem 1.5rem', fontSize: '1rem', gap: '1.5rem' },
  };

  const { padding, fontSize, gap } = sizes[size] || sizes.medium;

  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap,
    marginTop: '1rem',
  };

  const buttonStyle = {
    padding,
    fontSize,
    fontWeight: '500',
    color: '#FFFFFF',
    backgroundColor: '#3B82F6',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#D1D5DB',
    cursor: 'not-allowed',
    opacity: 0.6,
  };

  const pageInfoStyle = {
    fontSize,
    color: '#6B7280',
    fontWeight: '500',
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
          if (!isFirstPage) e.currentTarget.style.backgroundColor = '#2563EB';
        }}
        onMouseLeave={(e) => {
          if (!isFirstPage) e.currentTarget.style.backgroundColor = '#3B82F6';
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
          if (!isLastPage) e.currentTarget.style.backgroundColor = '#2563EB';
        }}
        onMouseLeave={(e) => {
          if (!isLastPage) e.currentTarget.style.backgroundColor = '#3B82F6';
        }}
        aria-label="Next page"
      >
        Next →
      </button>
    </div>
  );
};

export default Pagination;