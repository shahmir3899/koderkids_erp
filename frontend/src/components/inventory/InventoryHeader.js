// ============================================
// INVENTORY HEADER - With RBAC Support
// ============================================
// Location: src/components/inventory/InventoryHeader.js
//
// Header section with title and action buttons.
// Categories button shown only for admins.
// UI balanced for both roles.

import React from 'react';

// ============================================
// COMPONENT
// ============================================

export const InventoryHeader = ({
  userContext,
  onAddItem,
  onOpenCategories,
  onExport,
  isExporting = false,
}) => {
  const { isAdmin, canManageCategories, userName } = userContext;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '1.5rem',
      flexWrap: 'wrap',
      gap: '1rem',
    }}>
      {/* Title Section */}
      <div>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '700',
          color: '#FFFFFF',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          📦 Inventory Management
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: 'rgba(255, 255, 255, 0.7)',
          margin: '0.25rem 0 0',
        }}>
          {isAdmin
            ? 'Track and manage assets across all locations'
            : `Manage inventory at your assigned schools • ${userName}`
          }
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
      }}>
        {/* Add Item Button - Both roles */}
        <button
          onClick={onAddItem}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#10B981'}
        >
          <span style={{ fontSize: '1rem' }}>➕</span>
          Add Item
        </button>

        {/* Categories Button - Admin Only */}
        {canManageCategories && (
          <button
            onClick={onOpenCategories}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              backgroundColor: '#8B5CF6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#7C3AED'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#8B5CF6'}
          >
            <span style={{ fontSize: '1rem' }}>📁</span>
            Categories
          </button>
        )}

        {/* Export Button - Both roles (exports only their visible data) */}
        <button
          onClick={onExport}
          disabled={isExporting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            backgroundColor: isExporting ? '#9CA3AF' : '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: isExporting ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => !isExporting && (e.target.style.backgroundColor = '#2563EB')}
          onMouseLeave={(e) => !isExporting && (e.target.style.backgroundColor = '#3B82F6')}
        >
          {isExporting ? (
            <>
              <span style={{
                width: '14px',
                height: '14px',
                border: '2px solid #fff',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              Exporting...
            </>
          ) : (
            <>
              <span style={{ fontSize: '1rem' }}>📥</span>
              Export CSV
            </>
          )}
        </button>
      </div>

      {/* Spinner animation */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default InventoryHeader;