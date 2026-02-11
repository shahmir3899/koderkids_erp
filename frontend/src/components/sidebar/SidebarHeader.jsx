// ============================================
// SIDEBAR HEADER COMPONENT
// ============================================
// Location: src/components/sidebar/SidebarHeader.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faTimes } from '@fortawesome/free-solid-svg-icons';
import { COLORS, SIDEBAR, BORDER_RADIUS, TRANSITIONS } from '../../utils/designConstants';

/**
 * SidebarHeader Component
 * Displays logo, brand text, and toggle/close button
 *
 * @param {boolean} isOpen - Whether sidebar is expanded
 * @param {function} onToggle - Callback to toggle sidebar state (or close on mobile)
 * @param {boolean} isMobileOverlay - Whether rendering in mobile overlay mode
 */
const SidebarHeader = ({ isOpen, onToggle, isMobileOverlay = false }) => {
  return (
    <div style={styles.header(isOpen)}>
      {/* Logo */}
      <div style={styles.logoWrapper}>
        <img
          src="/whiteLogo.png"
          alt="Koder Kids Logo"
          style={styles.logoImage}
        />
      </div>

      {/* Brand Text (only when expanded) */}
      {isOpen && <span style={styles.logoText}>Koder Kids</span>}

      {/* Toggle Button (desktop) or Close Button (mobile overlay) */}
      <button
        style={isMobileOverlay ? styles.closeBtn : styles.toggleBtn}
        onClick={onToggle}
        aria-label={isMobileOverlay ? 'Close sidebar' : (isOpen ? 'Collapse sidebar' : 'Expand sidebar')}
      >
        <FontAwesomeIcon
          icon={isMobileOverlay ? faTimes : (isOpen ? faChevronLeft : faChevronRight)}
        />
      </button>
    </div>
  );
};

const styles = {
  header: (isOpen) => ({
    display: 'flex',
    alignItems: 'center',
    height: SIDEBAR.headerHeight,
    padding: '0.75rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
    gap: '0.5rem',
    justifyContent: isOpen ? 'flex-start' : 'center',
    paddingLeft: isOpen ? '1rem' : '0.75rem',
  }),

  logoWrapper: {
    width: '32px',
    height: '32px',
    minWidth: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '0.3rem',
    transition: `all ${TRANSITIONS.slow} ease`,
  },

  logoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },

  logoText: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'white',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  },

  toggleBtn: {
    position: 'absolute',
    right: '0.5rem',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '28px',
    height: '28px',
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'white',
    fontSize: '12px',
    zIndex: 100,
    transition: `all ${TRANSITIONS.normal} ease`,
  },

  closeBtn: {
    position: 'absolute',
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '32px',
    height: '32px',
    background: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'white',
    fontSize: '14px',
    zIndex: 100,
    transition: `all ${TRANSITIONS.normal} ease`,
  },
};

export default SidebarHeader;
