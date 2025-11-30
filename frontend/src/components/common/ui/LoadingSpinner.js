// ============================================
// LOADING SPINNER - Reusable Loading Component
// ============================================

import React from 'react';
import { ClipLoader } from 'react-spinners';

/**
 * LoadingSpinner Component
 * @param {Object} props
 * @param {string} props.size - Size of spinner: 'small', 'medium', 'large' (default: 'medium')
 * @param {string} props.color - Hex color (default: '#3B82F6')
 * @param {string} props.message - Optional loading message
 * @param {boolean} props.fullScreen - Whether to center in full screen (default: false)
 * @param {string} props.className - Additional CSS classes
 */
export const LoadingSpinner = ({ 
  size = 'medium', 
  color = '#3B82F6', 
  message = '', 
  fullScreen = false,
  className = '' 
}) => {
  // Size mapping
  const sizeMap = {
    small: 20,
    medium: 50,
    large: 80,
  };

  const spinnerSize = sizeMap[size] || 50;

  // Container styles
  const containerStyle = fullScreen
    ? {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
      };

  return (
    <div style={containerStyle} className={className}>
      <ClipLoader color={color} size={spinnerSize} />
      {message && (
        <p style={{ marginTop: '1rem', color: '#6B7280', fontSize: '1rem' }}>
          {message}
        </p>
      )}
    </div>
  );
};

/**
 * Inline Loading Spinner (for buttons, etc.)
 */
export const InlineSpinner = ({ color = '#FFFFFF', size = 16 }) => {
  return (
    <ClipLoader 
      color={color} 
      size={size} 
      cssOverride={{ display: 'inline-block', verticalAlign: 'middle' }} 
    />
  );
};

/**
 * Skeleton Loading (for tables, cards)
 */
export const SkeletonLoader = ({ rows = 3, height = '1rem' }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          style={{
            height: height,
            backgroundColor: '#E5E7EB',
            borderRadius: '0.5rem',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

export default LoadingSpinner;