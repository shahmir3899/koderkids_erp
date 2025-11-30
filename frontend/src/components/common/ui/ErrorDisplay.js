// ============================================
// ERROR DISPLAY COMPONENT
// ============================================

import React from 'react';

export const ErrorDisplay = ({ error, onRetry, isRetrying }) => {
  return (
    <div style={{
      backgroundColor: '#FEE2E2',
      color: '#DC2626',
      padding: '1rem',
      borderRadius: '8px',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      border: '1px solid #FCA5A5',
    }}>
      <span style={{ fontWeight: '500' }}>{error}</span>
      <button
        onClick={onRetry}
        disabled={isRetrying}
        style={{
          backgroundColor: '#DC2626',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '6px',
          border: 'none',
          cursor: isRetrying ? 'not-allowed' : 'pointer',
          fontWeight: '500',
          opacity: isRetrying ? 0.6 : 1,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!isRetrying) e.target.style.backgroundColor = '#B91C1C';
        }}
        onMouseLeave={(e) => {
          if (!isRetrying) e.target.style.backgroundColor = '#DC2626';
        }}
      >
        {isRetrying ? 'Retrying...' : 'Retry'}
      </button>
    </div>
  );
};