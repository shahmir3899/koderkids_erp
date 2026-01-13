// ============================================
// ERROR DISPLAY COMPONENT
// ============================================

import React from 'react';
import {
  COLORS,
  SPACING,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
} from '../../../utils/designConstants';

export const ErrorDisplay = ({ error, onRetry, isRetrying }) => {
  return (
    <div style={{
      backgroundColor: COLORS.status.errorLight,
      color: COLORS.status.errorDark,
      padding: SPACING.sm,
      borderRadius: BORDER_RADIUS.sm,
      marginBottom: SPACING.md,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      border: `1px solid #FCA5A5`,
    }}>
      <span style={{ fontWeight: FONT_WEIGHTS.medium }}>{error}</span>
      <button
        onClick={onRetry}
        disabled={isRetrying}
        style={{
          backgroundColor: COLORS.status.errorDark,
          color: COLORS.text.white,
          padding: `${SPACING.xs} ${SPACING.sm}`,
          borderRadius: BORDER_RADIUS.sm,
          border: 'none',
          cursor: isRetrying ? 'not-allowed' : 'pointer',
          fontWeight: FONT_WEIGHTS.medium,
          opacity: isRetrying ? 0.6 : 1,
          transition: `opacity ${TRANSITIONS.normal}`,
        }}
        onMouseEnter={(e) => {
          if (!isRetrying) e.target.style.backgroundColor = COLORS.status.errorDarker;
        }}
        onMouseLeave={(e) => {
          if (!isRetrying) e.target.style.backgroundColor = COLORS.status.errorDark;
        }}
      >
        {isRetrying ? 'Retrying...' : 'Retry'}
      </button>
    </div>
  );
};
