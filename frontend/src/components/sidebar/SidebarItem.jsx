// ============================================
// SIDEBAR ITEM COMPONENT
// ============================================
// Location: src/components/sidebar/SidebarItem.jsx

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { COLORS, BORDER_RADIUS, TRANSITIONS, FONT_SIZES, Z_INDEX } from '../../utils/designConstants';

/**
 * SidebarItem Component
 * Individual menu item with icon, label, and active state
 *
 * @param {object} item - Menu item configuration
 * @param {boolean} isOpen - Whether sidebar is expanded
 * @param {string} role - User's role
 * @param {boolean} isNested - Whether this is a nested item in dropdown
 * @param {function} onNavigate - Callback when item is clicked (for mobile close)
 */
const SidebarItem = ({ item, isOpen, role, isNested = false, onNavigate }) => {
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  // Resolve path (can be string or function)
  const path = typeof item.path === 'function' ? item.path(role) : item.path;

  // Check if this item is currently active
  const isActive =
    location.pathname === path ||
    location.pathname.startsWith(path + '/') ||
    location.pathname.includes(item.id);

  return (
    <div
      style={styles.navItem(isOpen, isNested)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        to={path}
        style={styles.navLink(isOpen, isActive, isHovered, isNested)}
        onClick={onNavigate}
      >
        {/* Icon */}
        <span style={styles.icon(isOpen)}>
          <FontAwesomeIcon icon={item.icon} />
        </span>

        {/* Label (shown when expanded) */}
        {isOpen && <span style={styles.text(isNested)}>{item.label}</span>}

        {/* Tooltip (shown when collapsed and hovered) */}
        {!isOpen && isHovered && <div style={styles.tooltip}>{item.label}</div>}
      </Link>
    </div>
  );
};

const styles = {
  navItem: (isOpen, isNested) => ({
    position: 'relative',
    borderRadius: BORDER_RADIUS.md,
    margin: isOpen
      ? isNested
        ? '0.125rem 0 0.125rem 0.5rem'
        : '0.125rem 0.75rem'
      : '0.25rem 0.5rem',
    cursor: 'pointer',
  }),

  navLink: (isOpen, isActive, isHovered, isNested) => ({
    display: 'flex',
    alignItems: 'center',
    padding: isOpen ? (isNested ? '0.375rem 0.75rem' : '0.5rem 0.75rem') : '0.375rem',
    color: 'rgba(255, 255, 255, 0.9)',
    textDecoration: 'none',
    borderRadius: BORDER_RADIUS.md,
    transition: `all ${TRANSITIONS.normal} ease`,
    position: 'relative',
    overflow: 'hidden',
    minHeight: isNested ? '32px' : '36px',
    justifyContent: isOpen ? 'flex-start' : 'center',
    width: '100%',
    background: isActive
      ? 'rgba(255, 255, 255, 0.25)'
      : isHovered
      ? 'rgba(255, 255, 255, 0.15)'
      : 'transparent',
    borderLeft: isActive && isOpen ? '3px solid white' : 'none',
    fontWeight: isActive ? 600 : 500,
  }),

  icon: (isOpen) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    width: isOpen ? '22px' : '100%',
    height: '22px',
    minWidth: isOpen ? '22px' : 'auto',
    flexShrink: 0,
    transition: `all ${TRANSITIONS.normal} ease`,
  }),

  text: (isNested) => ({
    marginLeft: '0.75rem',
    fontSize: isNested ? FONT_SIZES.sm : '14px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
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
    zIndex: Z_INDEX.sidebarTooltip,
    pointerEvents: 'none',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
};

export default SidebarItem;
