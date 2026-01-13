// ============================================
// SIDEBAR HEADER COMPONENT
// ============================================
// Location: src/components/sidebar/SidebarHeader.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { COLORS, SIDEBAR, BORDER_RADIUS, TRANSITIONS } from '../../utils/designConstants';

/**
 * SidebarHeader Component
 * Displays logo, brand text, and toggle button
 *
 * @param {boolean} isOpen - Whether sidebar is expanded
 * @param {function} onToggle - Callback to toggle sidebar state
 */
const SidebarHeader = ({ isOpen, onToggle }) => {
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

      {/* Toggle Button */}
      <button
        style={styles.toggleBtn}
        onClick={onToggle}
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <FontAwesomeIcon icon={isOpen ? faChevronLeft : faChevronRight} />
      </button>
    </div>
  );
};

const styles = {
  header: (isOpen) => ({
    display: 'flex',
    alignItems: 'center',
    height: SIDEBAR.headerHeight,
    padding: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
    gap: '0.75rem',
    justifyContent: isOpen ? 'flex-start' : 'center',
    paddingLeft: isOpen ? '1.25rem' : '1rem',
  }),

  logoWrapper: {
    width: '40px',
    height: '40px',
    minWidth: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '0.4rem',
    transition: `all ${TRANSITIONS.slow} ease`,
  },

  logoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },

  logoText: {
    fontSize: '18px',
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
};

export default SidebarHeader;
