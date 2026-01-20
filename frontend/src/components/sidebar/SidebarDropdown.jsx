// ============================================
// SIDEBAR DROPDOWN COMPONENT
// ============================================
// Location: src/components/sidebar/SidebarDropdown.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight, faTimes } from '@fortawesome/free-solid-svg-icons';
import { COLORS, BORDER_RADIUS, TRANSITIONS, FONT_SIZES, SIDEBAR, TOUCH_TARGETS, Z_INDEX } from '../../utils/designConstants';
import SidebarItem from './SidebarItem';
import { useResponsive } from '../../hooks/useResponsive';

/**
 * FlyoutMenuItem Component
 * Individual item in the flyout menu with hover state
 */
const FlyoutMenuItem = ({ subItem, role, onNavigate, isMobile }) => {
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
        padding: isMobile ? '0.875rem 1rem' : '0.625rem 1rem',
        color: '#fff',
        textDecoration: 'none',
        fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.sm,
        transition: `all ${TRANSITIONS.fast} ease`,
        background: isActive
          ? 'rgba(255, 255, 255, 0.25)'
          : isItemHovered
          ? 'rgba(255, 255, 255, 0.15)'
          : 'transparent',
        cursor: 'pointer',
        borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
        minHeight: isMobile ? TOUCH_TARGETS.large : TOUCH_TARGETS.minimum,
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={() => setIsItemHovered(true)}
      onMouseLeave={() => setIsItemHovered(false)}
    >
      <FontAwesomeIcon
        icon={subItem.icon}
        style={{
          marginRight: '0.75rem',
          fontSize: isMobile ? '16px' : '14px',
          width: isMobile ? '20px' : '16px',
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
 * Shows flyout menu when sidebar is collapsed
 *
 * @param {object} item - Dropdown menu item configuration
 * @param {boolean} isOpen - Whether sidebar is expanded
 * @param {boolean} isDropdownOpen - Whether this dropdown is expanded
 * @param {function} onToggle - Callback to toggle dropdown state
 * @param {string} role - User's role
 */
const SidebarDropdown = ({ item, isOpen, isDropdownOpen, onToggle, role }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [flyoutPosition, setFlyoutPosition] = useState({ top: 0, left: 0 });
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const toggleRef = useRef(null);
  const location = useLocation();
  const { isMobile, isTablet } = useResponsive();

  // Check if any sub-item is active
  const isAnySubItemActive = item.subItems?.some((subItem) => {
    const path = typeof subItem.path === 'function' ? subItem.path(role) : subItem.path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  });

  // Calculate flyout position when hovered
  useEffect(() => {
    if (isHovered && !isOpen && toggleRef.current) {
      const rect = toggleRef.current.getBoundingClientRect();
      setFlyoutPosition({
        top: rect.top,
        left: rect.right + 8, // 8px gap from sidebar
      });
    }
  }, [isHovered, isOpen]);

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
          style={styles.dropdownToggle(isOpen, isDropdownOpen, isHovered, isAnySubItemActive, isMobile)}
          onClick={() => {
            if (isOpen) {
              onToggle(item.id);
            } else if (isMobile || isTablet) {
              // On mobile/tablet with collapsed sidebar, show fullscreen menu
              setShowMobileMenu(true);
            }
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
            <SidebarItem key={subItem.id} item={subItem} isOpen={isOpen} role={role} isNested />
          ))}
        </div>
      )}

      {/* Flyout Menu - shown when sidebar collapsed and hovered (desktop only) */}
      {/* Using portal to escape sidebar's overflow:hidden */}
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
              isMobile={false}
            />
          ))}
        </div>,
        document.body
      )}

      {/* Mobile Fullscreen Menu - shown on mobile/tablet when collapsed sidebar item is tapped */}
      {showMobileMenu && (isMobile || isTablet) && ReactDOM.createPortal(
        <div
          style={styles.mobileMenuOverlay}
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            style={styles.mobileMenuContainer}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Menu Header */}
            <div style={styles.mobileMenuHeader}>
              <span style={styles.mobileMenuTitle}>{item.label}</span>
              <button
                onClick={() => setShowMobileMenu(false)}
                style={styles.mobileMenuCloseButton}
                aria-label="Close menu"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Mobile Menu Items */}
            <div style={styles.mobileMenuItems}>
              {item.subItems?.map((subItem) => (
                <FlyoutMenuItem
                  key={subItem.id}
                  subItem={subItem}
                  role={role}
                  onNavigate={() => setShowMobileMenu(false)}
                  isMobile={true}
                />
              ))}
            </div>
          </div>
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
    margin: isOpen ? '0.25rem 0.75rem' : '0.5rem 0.5rem',
    cursor: 'pointer',
  }),

  dropdownToggle: (isOpen, isDropdownOpen, isHovered, isAnySubItemActive, isMobile) => ({
    display: 'flex',
    alignItems: 'center',
    padding: isOpen ? '0.75rem' : '0.5rem',
    color: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BORDER_RADIUS.md,
    transition: `all ${TRANSITIONS.normal} ease`,
    position: 'relative',
    overflow: 'hidden',
    minHeight: isMobile ? TOUCH_TARGETS.large : TOUCH_TARGETS.minimum,
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

  collapsedChevron: {
    position: 'absolute',
    right: '4px',
    bottom: '4px',
    fontSize: '8px',
    opacity: 0.7,
  },

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

  dropdownMenu: (isDropdownOpen) => ({
    maxHeight: isDropdownOpen ? '500px' : '0',
    overflow: 'hidden',
    transition: `max-height ${TRANSITIONS.slow} ease`,
    paddingLeft: '1rem',
  }),

  // Flyout menu for collapsed sidebar (uses portal, fixed positioning)
  // Matches glassmorphic purple theme from designConstants
  flyoutMenu: {
    position: 'fixed',
    minWidth: '220px',
    // Glassmorphic purple gradient background
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
    padding: '0.875rem 1rem 0.625rem',
    fontSize: FONT_SIZES.xs,
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
    marginBottom: '0.25rem',
  },

  // Mobile fullscreen menu styles
  mobileMenuOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: Z_INDEX.modal,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 0,
  },

  mobileMenuContainer: {
    width: '100%',
    maxHeight: '80vh',
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.98) 0%, rgba(139, 92, 246, 0.98) 50%, rgba(35, 98, 171, 0.98) 100%)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderBottom: 'none',
    boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
    animation: 'slideUp 0.3s ease-out',
    // Safe area for notch devices
    paddingBottom: 'env(safe-area-inset-bottom, 0)',
  },

  mobileMenuHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(255, 255, 255, 0.05)',
  },

  mobileMenuTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 600,
    color: '#FFFFFF',
  },

  mobileMenuCloseButton: {
    width: TOUCH_TARGETS.large,
    height: TOUCH_TARGETS.large,
    minWidth: TOUCH_TARGETS.large,
    minHeight: TOUCH_TARGETS.large,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    color: '#FFFFFF',
    fontSize: '18px',
    cursor: 'pointer',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    transition: `all ${TRANSITIONS.fast} ease`,
  },

  mobileMenuItems: {
    overflowY: 'auto',
    maxHeight: 'calc(80vh - 70px)', // Account for header
    WebkitOverflowScrolling: 'touch',
    padding: '0.5rem 0',
  },
};

export default SidebarDropdown;
