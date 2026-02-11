// ============================================
// SIDEBAR NAVIGATION COMPONENT
// ============================================
// Location: src/components/sidebar/SidebarNav.jsx

import React from 'react';
import { SIDEBAR } from '../../utils/designConstants';
import { getMenuForRole } from '../../config/menuConfig';
import SidebarSection from './SidebarSection';

/**
 * SidebarNav Component
 * Renders all navigation sections based on user role
 *
 * @param {boolean} isOpen - Whether sidebar is expanded
 * @param {object} openDropdowns - Object tracking which dropdowns are open
 * @param {function} toggleDropdown - Callback to toggle dropdown state
 * @param {string} role - User's role
 * @param {function} onNavigate - Callback when a nav item is clicked (for mobile close)
 */
const SidebarNav = ({ isOpen, openDropdowns, toggleDropdown, role, onNavigate }) => {
  // Get filtered menu sections for the current role
  const menuSections = getMenuForRole(role);

  return (
    <nav style={styles.nav}>
      {Object.entries(menuSections).map(([key, section]) => (
        <SidebarSection
          key={key}
          section={section}
          isOpen={isOpen}
          openDropdowns={openDropdowns}
          toggleDropdown={toggleDropdown}
          role={role}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
};

const styles = {
  nav: {
    padding: '0.25rem 0',
    overflowY: 'auto',
    overflowX: 'hidden',
    height: `calc(100vh - ${SIDEBAR.headerHeight} - ${SIDEBAR.footerHeight})`,
    scrollbarWidth: 'none', // Firefox
    msOverflowStyle: 'none', // IE/Edge
  },
};

export default SidebarNav;
