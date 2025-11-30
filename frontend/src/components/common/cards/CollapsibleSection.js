// ============================================
// COLLAPSIBLE SECTION - Reusable Card Component
// ============================================

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

/**
 * CollapsibleSection Component
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {React.ReactNode} props.children - Section content
 * @param {boolean} props.defaultCollapsed - Initial collapsed state (default: false)
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.headerAction - Optional action button in header
 */
export const CollapsibleSection = ({
  title,
  children,
  defaultCollapsed = false,
  className = '',
  headerAction = null,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const containerStyle = {
    backgroundColor: '#FFFFFF',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '1.5rem',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isCollapsed ? 0 : '1.5rem',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const titleStyle = {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  };

  const buttonStyle = {
    color: '#3B82F6',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'color 0.2s ease',
  };

  return (
    <div style={containerStyle} className={className}>
      <div style={headerStyle} onClick={() => setIsCollapsed(!isCollapsed)}>
        <h2 style={titleStyle}>{title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {headerAction && <div onClick={(e) => e.stopPropagation()}>{headerAction}</div>}
          <button
            style={buttonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#2563EB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#3B82F6'; }}
            aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
          >
            <FontAwesomeIcon icon={isCollapsed ? faChevronDown : faChevronUp} />
          </button>
        </div>
      </div>

      {!isCollapsed && <div>{children}</div>}
    </div>
  );
};

export default CollapsibleSection;