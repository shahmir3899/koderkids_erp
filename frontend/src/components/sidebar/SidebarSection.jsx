// ============================================
// SIDEBAR SECTION COMPONENT
// ============================================
// Location: src/components/sidebar/SidebarSection.jsx

import React from 'react';
import { FONT_SIZES, TRANSITIONS } from '../../utils/designConstants';
import SidebarItem from './SidebarItem';
import SidebarDropdown from './SidebarDropdown';

/**
 * SidebarSection Component
 * Groups menu items under a section header
 *
 * @param {object} section - Section configuration with label and items
 * @param {boolean} isOpen - Whether sidebar is expanded
 * @param {object} openDropdowns - Object tracking which dropdowns are open
 * @param {function} toggleDropdown - Callback to toggle dropdown state
 * @param {string} role - User's role
 */
const SidebarSection = ({ section, isOpen, openDropdowns, toggleDropdown, role }) => {
  if (!section || !section.items || section.items.length === 0) {
    return null;
  }

  return (
    <div style={styles.section}>
      {/* Section Header (only shown when sidebar is expanded) */}
      {isOpen && <div style={styles.sectionHeader}>{section.label}</div>}

      {/* Section Items */}
      {section.items.map((item) => {
        // Check if item is a dropdown
        if (item.dropdown && item.subItems) {
          return (
            <SidebarDropdown
              key={item.id}
              item={item}
              isOpen={isOpen}
              isDropdownOpen={!!openDropdowns[item.id]}
              onToggle={toggleDropdown}
              role={role}
            />
          );
        }

        // Regular menu item
        return <SidebarItem key={item.id} item={item} isOpen={isOpen} role={role} />;
      })}
    </div>
  );
};

const styles = {
  section: {
    marginBottom: '0.5rem',
  },

  sectionHeader: {
    fontSize: FONT_SIZES.xs,
    fontWeight: 600,
    letterSpacing: '1px',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    padding: '0.75rem 1rem 0.5rem',
    marginTop: '0.5rem',
    transition: `all ${TRANSITIONS.slow} ease`,
  },
};

export default SidebarSection;
