// ============================================
// EXPORT BUTTONS - Reusable Export Actions
// ============================================
// Location: src/components/common/ui/ExportButtons.js

import React from 'react';
import { Button } from './Button';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
} from '../../../utils/designConstants';

/**
 * ExportButtons Component - Provides Image, PDF, and Print export buttons
 * @param {Object} props
 * @param {Function} props.onDownloadImage - Handler for image download
 * @param {Function} props.onDownloadPdf - Handler for PDF download
 * @param {Function} props.onPrint - Handler for print
 * @param {boolean} props.showImage - Show image download button (default: true)
 * @param {boolean} props.showPdf - Show PDF download button (default: true)
 * @param {boolean} props.showPrint - Show print button (default: true)
 * @param {boolean} props.disabled - Disable all buttons (default: false)
 * @param {boolean} props.loading - Loading state (default: false)
 * @param {string} props.size - Button size: 'small' | 'medium' | 'large' (default: 'medium')
 * @param {string} props.className - Additional CSS classes
 */
export const ExportButtons = ({
  onDownloadImage,
  onDownloadPdf,
  onPrint,
  showImage = true,
  showPdf = true,
  showPrint = true,
  disabled = false,
  loading = false,
  size = 'medium',
  className = '',
}) => {
  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  };

  const sizeMap = {
    small: { padding: `${SPACING.xs} ${SPACING.sm}`, fontSize: FONT_SIZES.xs },
    medium: { padding: `${SPACING.xs} 1.25rem`, fontSize: FONT_SIZES.sm },
    large: { padding: `0.875rem ${SPACING.md}`, fontSize: FONT_SIZES.lg },
  };

  const { padding, fontSize } = sizeMap[size] || sizeMap.medium;

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
    padding,
    fontSize,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    backgroundColor: COLORS.status.info,
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    transition: `background-color ${TRANSITIONS.fast} ease, transform 0.1s ease`,
  };

  const handleMouseEnter = (e) => {
    if (!disabled && !loading) {
      e.target.style.backgroundColor = COLORS.status.infoDark;
    }
  };

  const handleMouseLeave = (e) => {
    e.target.style.backgroundColor = COLORS.status.info;
  };

  return (
    <div style={containerStyle} className={className}>
      {showImage && onDownloadImage && (
        <button
          onClick={onDownloadImage}
          disabled={disabled || loading}
          style={buttonStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          📷 {loading ? 'Processing...' : 'Download Image'}
        </button>
      )}

      {showPdf && onDownloadPdf && (
        <button
          onClick={onDownloadPdf}
          disabled={disabled || loading}
          style={buttonStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          📄 {loading ? 'Processing...' : 'Download PDF'}
        </button>
      )}

      {showPrint && onPrint && (
        <button
          onClick={onPrint}
          disabled={disabled || loading}
          style={buttonStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          🖨️ {loading ? 'Processing...' : 'Print'}
        </button>
      )}
    </div>
  );
};

export default ExportButtons;
