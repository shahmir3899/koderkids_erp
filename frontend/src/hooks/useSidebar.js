// ============================================
// SIDEBAR STATE HOOK
// ============================================
// Location: src/hooks/useSidebar.js

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to manage sidebar state
 * Handles sidebar open/close and dropdown menu states
 *
 * @param {boolean} initialOpen - Initial sidebar open state (default: true)
 * @returns {object} Sidebar state and control functions
 */
export const useSidebar = (initialOpen = true) => {
  // Main sidebar open/collapsed state
  const [isOpen, setIsOpen] = useState(initialOpen);

  // Track which dropdown menus are open (by dropdown id)
  const [openDropdowns, setOpenDropdowns] = useState({});

  /**
   * Effect: Close all dropdowns when sidebar is collapsed
   * This ensures a clean state when the sidebar is minimized
   */
  useEffect(() => {
    if (!isOpen) {
      setOpenDropdowns({});
    }
  }, [isOpen]);

  /**
   * Toggle sidebar open/closed state
   */
  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  /**
   * Open the sidebar (expand it)
   */
  const openSidebar = useCallback(() => {
    setIsOpen(true);
  }, []);

  /**
   * Close the sidebar (collapse it)
   */
  const closeSidebar = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Toggle a specific dropdown menu
   * If sidebar is collapsed, it will auto-expand and open the dropdown
   *
   * @param {string} id - Dropdown identifier
   */
  const toggleDropdown = useCallback((id) => {
    if (!isOpen) {
      // If sidebar is collapsed, first expand it
      setIsOpen(true);
      // Then open the dropdown after a brief delay for smooth animation
      setTimeout(() => {
        setOpenDropdowns((prev) => ({ ...prev, [id]: true }));
      }, 300); // Match sidebar transition duration
    } else {
      // If already open, just toggle the dropdown
      setOpenDropdowns((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));
    }
  }, [isOpen]);

  /**
   * Open a specific dropdown (without toggling)
   *
   * @param {string} id - Dropdown identifier
   */
  const openDropdown = useCallback((id) => {
    setOpenDropdowns((prev) => ({ ...prev, [id]: true }));
  }, []);

  /**
   * Close a specific dropdown
   *
   * @param {string} id - Dropdown identifier
   */
  const closeDropdown = useCallback((id) => {
    setOpenDropdowns((prev) => ({ ...prev, [id]: false }));
  }, []);

  /**
   * Close all dropdown menus
   */
  const closeAllDropdowns = useCallback(() => {
    setOpenDropdowns({});
  }, []);

  /**
   * Check if a specific dropdown is open
   *
   * @param {string} id - Dropdown identifier
   * @returns {boolean} Whether the dropdown is open
   */
  const isDropdownOpen = useCallback((id) => {
    return !!openDropdowns[id];
  }, [openDropdowns]);

  /**
   * Set sidebar state directly
   *
   * @param {boolean} open - Whether sidebar should be open
   */
  const setSidebarState = useCallback((open) => {
    setIsOpen(open);
  }, []);

  return {
    // State
    isOpen,
    openDropdowns,

    // Sidebar controls
    toggleSidebar,
    openSidebar,
    closeSidebar,
    setSidebarState,

    // Dropdown controls
    toggleDropdown,
    openDropdown,
    closeDropdown,
    closeAllDropdowns,
    isDropdownOpen,
  };
};

export default useSidebar;
