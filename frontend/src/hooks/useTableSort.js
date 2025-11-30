// ============================================
// useTableSort Hook - Reusable Sorting Logic
// ============================================

import { useState, useMemo } from 'react';

/**
 * Custom hook for table sorting
 * @param {Array} data - Array of data to sort
 * @param {Object} config - Initial sort configuration
 * @param {string} config.key - Initial sort key
 * @param {string} config.direction - Initial sort direction ('asc' or 'desc')
 * @returns {Object} Sorted data, sort config, and sort handler
 */
export const useTableSort = (data, config = { key: null, direction: 'asc' }) => {
  const [sortConfig, setSortConfig] = useState(config);

  /**
   * Handle sort column click
   * @param {string} key - Column key to sort by
   */
  const handleSort = (key) => {
    let direction = 'asc';
    
    // If clicking the same column, toggle direction
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  /**
   * Get sorted data
   */
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !data || data.length === 0) {
      return data;
    }

    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' 
          ? aValue - bValue 
          : bValue - aValue;
      }

      // Handle strings (case-insensitive)
      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();

      if (aString < bString) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aString > bString) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [data, sortConfig]);

  /**
   * Reset sort to initial state
   */
  const resetSort = () => {
    setSortConfig({ key: null, direction: 'asc' });
  };

  return {
    sortedData,
    sortConfig,
    handleSort,
    resetSort,
  };
};

export default useTableSort;