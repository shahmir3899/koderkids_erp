// ============================================
// COLLAPSIBLE SECTION - Consolidated Version
// ============================================
// ✅ Backward compatible with existing pages
// ✅ Supports lazy loading via onToggle callback
// ✅ Supports both defaultCollapsed and defaultOpen props
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

/**
 * CollapsibleSection Component
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {React.ReactNode} props.children - Section content
 * @param {boolean} props.defaultCollapsed - Initial collapsed state (default: false) - OLD PROP
 * @param {boolean} props.defaultOpen - Initial open state (default: true) - NEW PROP
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.headerAction - Optional action button in header
 * @param {Function} props.onToggle - Callback when section is toggled (receives isOpen state) - NEW PROP
 * 
 * @example
 * // Old usage (still works)
 * <CollapsibleSection title="My Section" defaultCollapsed={false}>...</CollapsibleSection>
 * 
 * @example
 * // New usage with lazy loading
 * <CollapsibleSection 
 *   title="Heavy Data" 
 *   defaultOpen={false}
 *   onToggle={(isOpen) => {
 *     if (isOpen) fetchHeavyData();
 *   }}
 * >...</CollapsibleSection>
 */
export const CollapsibleSection = ({
  title,
  children,
  defaultCollapsed = false,  // OLD PROP - for backward compatibility
  defaultOpen,               // NEW PROP - takes precedence if provided
  className = '',
  headerAction = null,
  onToggle = null,          // NEW PROP - lazy loading callback
}) => {
  // Determine initial state
  // Priority: defaultOpen > defaultCollapsed > default (open)
  const getInitialState = () => {
    if (defaultOpen !== undefined) {
      return defaultOpen; // New prop takes precedence
    }
    return !defaultCollapsed; // Use old prop (inverted)
  };

  const [isOpen, setIsOpen] = useState(getInitialState());

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    
    // Call onToggle callback if provided (for lazy loading)
    if (onToggle) {
      onToggle(newState);
    }
  };

  const containerStyle = {
    ...MIXINS.glassmorphicCard,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isOpen ? SPACING.md : 0,
    cursor: 'pointer',
    userSelect: 'none',
  };

  const titleStyle = {
    fontSize: FONT_SIZES['2xl'],
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
    fontSize: FONT_SIZES.lg,
    padding: SPACING.xs,
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