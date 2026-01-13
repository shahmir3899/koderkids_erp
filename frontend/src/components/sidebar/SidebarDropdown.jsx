// ============================================
// SIDEBAR DROPDOWN COMPONENT
// ============================================
// Location: src/components/sidebar/SidebarDropdown.jsx

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { COLORS, BORDER_RADIUS, TRANSITIONS, FONT_SIZES } from '../../utils/designConstants';
import SidebarItem from './SidebarItem';

/**
 * SidebarDropdown Component
 * Expandable menu item with nested sub-items
 *
 * @param {object} item - Dropdown menu item configuration
 * @param {boolean} isOpen - Whether sidebar is expanded
 * @param {boolean} isDropdownOpen - Whether this dropdown is expanded
 * @param {function} onToggle - Callback to toggle dropdown state
 * @param {string} role - User's role
 */
const SidebarDropdown = ({ item, isOpen, isDropdownOpen, onToggle, role }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div style={styles.dropdownContainer}>
      {/* Dropdown Toggle */}
      <div
        style={styles.navItem(isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          style={styles.dropdownToggle(isOpen, isDropdownOpen, isHovered)}
          onClick={() => onToggle(item.id)}
        >
          {/* Icon */}
          <span style={styles.icon(isOpen)}>
            <FontAwesomeIcon icon={item.icon} />
          </span>

          {/* Label (shown when expanded) */}
          {isOpen && <span style={styles.text}>{item.label}</span>}

          {/* Chevron Icon (shown when expanded) */}
          {isOpen && (
            <span style={styles.chevron(isDropdownOpen)}>
              <FontAwesomeIcon icon={faChevronDown} />
            </span>
          )}

          {/* Tooltip (shown when collapsed and hovered) */}
          {!isOpen && isHovered && <div style={styles.tooltip}>{item.label}</div>}
        </div>
      </div>

      {/* Dropdown Menu (nested items) */}
      {isOpen && isDropdownOpen && (
        <div style={styles.dropdownMenu(isDropdownOpen)}>
          {item.subItems?.map((subItem) => (
            <SidebarItem key={subItem.id} item={subItem} isOpen={isOpen} role={role} isNested />
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  dropdownContainer: {
    position: 'relative',
  },

  navItem: (isOpen) => ({
    position: 'relative',
    borderRadius: BORDER_RADIUS.md,
    margin: isOpen ? '0.25rem 0.75rem' : '0.5rem 0.5rem',
    cursor: 'pointer',
  }),

  dropdownToggle: (isOpen, isDropdownOpen, isHovered) => ({
    display: 'flex',
    alignItems: 'center',
    padding: isOpen ? '0.75rem' : '0.5rem',
    color: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BORDER_RADIUS.md,
    transition: `all ${TRANSITIONS.normal} ease`,
    position: 'relative',
    overflow: 'hidden',
    minHeight: '40px',
    justifyContent: isOpen ? 'flex-start' : 'center',
    width: '100%',
    background: isHovered ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
  }),

  icon: (isOpen) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    width: isOpen ? '24px' : '100%',
    height: '24px',
    minWidth: isOpen ? '24px' : 'auto',
    flexShrink: 0,
    transition: `all ${TRANSITIONS.normal} ease`,
  }),

  text: {
    marginLeft: '1rem',
    fontSize: FONT_SIZES.base,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flex: 1,
  },

  chevron: (isDropdownOpen) => ({
    marginLeft: 'auto',
    fontSize: '12px',
    transition: `transform ${TRANSITIONS.normal} ease`,
    transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
  }),

  tooltip: {
    position: 'absolute',
    left: '70px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0, 0, 0, 0.9)',
    color: 'white',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    fontSize: FONT_SIZES.sm,
    whiteSpace: 'nowrap',
    zIndex: 1020,
    pointerEvents: 'none',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },

  dropdownMenu: (isDropdownOpen) => ({
    maxHeight: isDropdownOpen ? '500px' : '0',
    overflow: 'hidden',
    transition: `max-height ${TRANSITIONS.slow} ease`,
    paddingLeft: '1rem',
  }),
};

export default SidebarDropdown;
