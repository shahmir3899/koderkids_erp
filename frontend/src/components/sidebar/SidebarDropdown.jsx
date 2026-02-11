// ============================================
// SIDEBAR DROPDOWN COMPONENT
// ============================================
// Location: src/components/sidebar/SidebarDropdown.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { COLORS, BORDER_RADIUS, TRANSITIONS, FONT_SIZES, SIDEBAR, TOUCH_TARGETS, Z_INDEX } from '../../utils/designConstants';
import SidebarItem from './SidebarItem';
import { useResponsive } from '../../hooks/useResponsive';

/**
 * FlyoutMenuItem Component
 * Individual item in the flyout menu with hover state (desktop collapsed only)
 */
const FlyoutMenuItem = ({ subItem, role, onNavigate }) => {
  const [isItemHovered, setIsItemHovered] = useState(false);
  const location = useLocation();

  const path = typeof subItem.path === 'function' ? subItem.path(role) : subItem.path;
  const isActive = location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <Link
      to={path}
      onClick={onNavigate}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        color: '#fff',
        textDecoration: 'none',
        fontSize: FONT_SIZES.sm,
        transition: `all ${TRANSITIONS.fast} ease`,
        background: isActive
          ? 'rgba(255, 255, 255, 0.25)'
          : isItemHovered
          ? 'rgba(255, 255, 255, 0.15)'
          : 'transparent',
        cursor: 'pointer',
        borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
        minHeight: '36px',
      }}
      onMouseEnter={() => setIsItemHovered(true)}
      onMouseLeave={() => setIsItemHovered(false)}
    >
      <FontAwesomeIcon
        icon={subItem.icon}
        style={{
          marginRight: '0.75rem',
          fontSize: '14px',
          width: '16px',
          textAlign: 'center',
          opacity: isActive ? 1 : 0.85,
        }}
      />
      <span style={{ fontWeight: isActive ? 600 : 500 }}>{subItem.label}</span>
    </Link>
  );
};

/**
 * SidebarDropdown Component
 * Expandable menu item with nested sub-items
 * Shows flyout menu when sidebar is collapsed (desktop only)
 * On mobile overlay: always expanded inline (no flyout/bottom-sheet needed)
 *
 * @param {object} item - Dropdown menu item configuration
 * @param {boolean} isOpen - Whether sidebar is expanded
 * @param {boolean} isDropdownOpen - Whether this dropdown is expanded
 * @param {function} onToggle - Callback to toggle dropdown state
 * @param {string} role - User's role
 * @param {function} onNavigate - Callback when a sub-item is clicked (for mobile close)
 */
const SidebarDropdown = ({ item, isOpen, isDropdownOpen, onToggle, role, onNavigate }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [flyoutPosition, setFlyoutPosition] = useState({ top: 0, left: 0 });
  const toggleRef = useRef(null);
  const location = useLocation();
  const { isMobile, isTablet } = useResponsive();

  // Check if any sub-item is active
  const isAnySubItemActive = item.subItems?.some((subItem) => {
    const path = typeof subItem.path === 'function' ? subItem.path(role) : subItem.path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  });

  // Calculate flyout position when hovered (desktop collapsed only)
  useEffect(() => {
    if (isHovered && !isOpen && toggleRef.current && !isMobile && !isTablet) {
      const rect = toggleRef.current.getBoundingClientRect();
      setFlyoutPosition({
        top: rect.top,
        left: rect.right + 8,
      });
    }
  }, [isHovered, isOpen, isMobile, isTablet]);

  return (
    <div
      ref={toggleRef}
      style={styles.dropdownContainer}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Dropdown Toggle */}
      <div style={styles.navItem(isOpen)}>
        <div
          style={styles.dropdownToggle(isOpen, isDropdownOpen, isHovered, isAnySubItemActive)}
          onClick={() => {
            if (isOpen) {
              // Sidebar is expanded: toggle dropdown inline
              onToggle(item.id);
            }
            // When collapsed on desktop: flyout handles it via hover
            // When in mobile overlay: sidebar is always expanded, so this branch handles it
          }}
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

          {/* Small chevron indicator when collapsed */}
          {!isOpen && (
            <span style={styles.collapsedChevron}>
              <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '8px' }} />
            </span>
          )}
        </div>
      </div>

      {/* Dropdown Menu (nested items) - shown when sidebar expanded */}
      {isOpen && isDropdownOpen && (
        <div style={styles.dropdownMenu(isDropdownOpen)}>
          {item.subItems?.map((subItem) => (
            <SidebarItem
              key={subItem.id}
              item={subItem}
              isOpen={isOpen}
              role={role}
              isNested
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}

      {/* Flyout Menu - shown when sidebar collapsed and hovered (desktop only) */}
      {!isOpen && isHovered && !isMobile && !isTablet && ReactDOM.createPortal(
        <div
          style={{
            ...styles.flyoutMenu,
            top: flyoutPosition.top,
            left: flyoutPosition.left,
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Flyout Header */}
          <div style={styles.flyoutHeader}>{item.label}</div>

          {/* Flyout Items */}
          {item.subItems?.map((subItem) => (
            <FlyoutMenuItem
              key={subItem.id}
              subItem={subItem}
              role={role}
              onNavigate={() => setIsHovered(false)}
            />
          ))}
        </div>,
        document.body
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
    margin: isOpen ? '0.125rem 0.75rem' : '0.25rem 0.5rem',
    cursor: 'pointer',
  }),

  dropdownToggle: (isOpen, isDropdownOpen, isHovered, isAnySubItemActive) => ({
    display: 'flex',
    alignItems: 'center',
    padding: isOpen ? '0.5rem 0.75rem' : '0.375rem',
    color: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BORDER_RADIUS.md,
    transition: `all ${TRANSITIONS.normal} ease`,
    position: 'relative',
    overflow: 'hidden',
    minHeight: '36px',
    justifyContent: isOpen ? 'flex-start' : 'center',
    width: '100%',
    background: isAnySubItemActive
      ? 'rgba(255, 255, 255, 0.25)'
      : isHovered
      ? 'rgba(255, 255, 255, 0.15)'
      : 'transparent',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
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

  text: {
    marginLeft: '0.75rem',
    fontSize: '14px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flex: 1,
  },

  chevron: (isDropdownOpen) => ({
    marginLeft: 'auto',
    fontSize: '11px',
    transition: `transform ${TRANSITIONS.normal} ease`,
    transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
  }),

  collapsedChevron: {
    position: 'absolute',
    right: '4px',
    bottom: '4px',
    fontSize: '8px',
    opacity: 0.7,
  },

  dropdownMenu: (isDropdownOpen) => ({
    maxHeight: isDropdownOpen ? '500px' : '0',
    overflow: 'hidden',
    transition: `max-height ${TRANSITIONS.slow} ease`,
    paddingLeft: '0.75rem',
  }),

  // Flyout menu for collapsed sidebar (uses portal, fixed positioning)
  flyoutMenu: {
    position: 'fixed',
    minWidth: '220px',
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(139, 92, 246, 0.95) 50%, rgba(35, 98, 171, 0.95) 100%)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    borderRadius: BORDER_RADIUS.xl,
    border: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
    zIndex: Z_INDEX.sidebarFlyout,
    overflow: 'hidden',
    padding: '0.5rem 0',
  },

  flyoutHeader: {
    padding: '0.75rem 1rem 0.5rem',
    fontSize: FONT_SIZES.xs,
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
    marginBottom: '0.25rem',
  },
};

export default SidebarDropdown;
