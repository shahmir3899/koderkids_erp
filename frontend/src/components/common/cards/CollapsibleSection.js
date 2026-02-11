// ============================================
// COLLAPSIBLE SECTION - Consolidated Version
// ============================================
// ✅ Backward compatible with existing pages
// ✅ Supports lazy loading via onToggle callback
// ✅ Supports both defaultCollapsed and defaultOpen props
// ✅ Compact mode for mobile via useResponsive
// ============================================

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../../utils/designConstants';
import { useResponsive } from '../../../hooks/useResponsive';

/**
 * CollapsibleSection Component
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {React.ReactNode} props.children - Section content
 * @param {boolean} props.defaultCollapsed - Initial collapsed state (default: false) - OLD PROP
 * @param {boolean} props.defaultOpen - Initial open state (default: true) - NEW PROP
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.headerAction - Optional action button in header
 * @param {Function} props.onToggle - Callback when section is toggled (receives isOpen state)
 */
export const CollapsibleSection = ({
  title,
  children,
  defaultCollapsed = false,
  defaultOpen,
  className = '',
  headerAction = null,
  onToggle = null,
}) => {
  const { isMobile } = useResponsive();

  // Determine initial state
  const getInitialState = () => {
    if (defaultOpen !== undefined) {
      return defaultOpen;
    }
    return !defaultCollapsed;
  };

  const [isOpen, setIsOpen] = useState(getInitialState());

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (onToggle) {
      onToggle(newState);
    }
  };

  const containerStyle = {
    ...MIXINS.glassmorphicCard,
    padding: isMobile ? SPACING.sm : SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: isMobile ? SPACING.sm : SPACING.md,
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isOpen ? (isMobile ? SPACING.sm : SPACING.md) : 0,
    cursor: 'pointer',
    userSelect: 'none',
    minHeight: isMobile ? '36px' : '40px',
  };

  const titleStyle = {
    fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    margin: 0,
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  };

  const buttonStyle = {
    color: COLORS.text.white,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
    transition: `color ${TRANSITIONS.normal} ease`,
  };

  return (
    <div style={containerStyle} className={className}>
      <div style={headerStyle} onClick={handleToggle}>
        <h2 style={titleStyle}>{title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
          {headerAction && <div onClick={(e) => e.stopPropagation()}>{headerAction}</div>}
          <button
            style={buttonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.text.whiteSubtle; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.text.white; }}
            aria-label={isOpen ? 'Collapse section' : 'Expand section'}
          >
            <FontAwesomeIcon icon={isOpen ? faChevronUp : faChevronDown} />
          </button>
        </div>
      </div>

      {isOpen && <div>{children}</div>}
    </div>
  );
};

export default CollapsibleSection;
