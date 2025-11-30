// ============================================
// EXPORT BUTTONS - Reusable Export Actions
// ============================================
// Location: src/components/common/ui/ExportButtons.js

import React from 'react';
import { Button } from './Button';

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
    gap: '1rem',
    flexWrap: 'wrap',
  };

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: size === 'small' ? '0.5rem 1rem' : size === 'large' ? '0.875rem 1.5rem' : '0.625rem 1.25rem',
    fontSize: size === 'small' ? '0.75rem' : size === 'large' ? '1rem' : '0.875rem',
    fontWeight: '500',
    color: '#FFFFFF',
    backgroundColor: '#3B82F6',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    transition: 'background-color 0.15s ease, transform 0.1s ease',
  };

  const handleMouseEnter = (e) => {
    if (!disabled && !loading) {
      e.target.style.backgroundColor = '#2563EB';
    }
  };

  const handleMouseLeave = (e) => {
    e.target.style.backgroundColor = '#3B82F6';
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