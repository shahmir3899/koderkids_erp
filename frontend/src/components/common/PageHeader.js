// ============================================
// PAGE HEADER - Reusable Header Component
// ============================================
// Location: src/components/common/PageHeader.js
//
// Consistent page header with icon, title, subtitle,
// and optional action buttons.

import React from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
} from '../../utils/designConstants';
import { useResponsive } from '../../hooks/useResponsive';

// ============================================
// COMPONENT
// ============================================

export const PageHeader = ({
  icon,
  title,
  subtitle,
  actions,
}) => {
  const { isMobile } = useResponsive();

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      marginBottom: SPACING.xl,
      flexWrap: 'wrap',
      gap: SPACING.md,
      flexDirection: isMobile ? 'column' : 'row',
    }}>
      {/* Title Section */}
      <div>
        <h1 style={{
          fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
          fontWeight: FONT_WEIGHTS.bold,
          color: COLORS.text.white,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.sm,
        }}>
          {icon && <span>{icon}</span>}
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: FONT_SIZES.sm,
            color: COLORS.text.whiteMedium,
            margin: `${SPACING.xs} 0 0`,
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {actions && (
        <div style={{
          display: 'flex',
          gap: SPACING.sm,
          flexWrap: 'wrap',
          width: isMobile ? '100%' : 'auto',
        }}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
