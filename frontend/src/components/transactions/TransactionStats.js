// ============================================
// TRANSACTION STATS COMPONENT
// ============================================
// Location: src/components/transactions/TransactionStats.js

import React from 'react';

export const TransactionStats = ({ stats, activeTab }) => {
  const getTabIcon = () => {
    switch (activeTab) {
      case 'income':
        return '💵';
      case 'expense':
        return '💸';
      case 'transfers':
        return '🔄';
      default:
        return '💰';
    }
  };

  const getTabColor = () => {
    switch (activeTab) {
      case 'income':
        return '#10B981'; // Green
      case 'expense':
        return '#EF4444'; // Red
      case 'transfers':
        return '#3B82F6'; // Blue
      default:
        return '#6B7280'; // Gray
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.5rem',
      }}
    >
      {/* Total Count Card */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
              Total Transactions
            </p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1F2937', margin: 0 }}>
              {stats.count}
            </p>
          </div>
          <div
            style={{
              backgroundColor: `${getTabColor()}20`,
              borderRadius: '12px',
              padding: '0.75rem',
              fontSize: '1.5rem',
            }}
          >
            {getTabIcon()}
          </div>
        </div>
      </div>

      {/* Total Amount Card */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
              Total Amount
            </p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: getTabColor(), margin: 0 }}>
              PKR {stats.total.toLocaleString()}
            </p>
          </div>
          <div
            style={{
              backgroundColor: `${getTabColor()}20`,
              borderRadius: '12px',
              padding: '0.75rem',
              fontSize: '1.5rem',
            }}
          >
            💰
          </div>
        </div>
      </div>

      {/* Average Amount Card */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
              Average Amount
            </p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6B7280', margin: 0 }}>
              PKR {stats.average.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div
            style={{
              backgroundColor: '#6B728020',
              borderRadius: '12px',
              padding: '0.75rem',
              fontSize: '1.5rem',
            }}
          >
            📊
          </div>
        </div>
      </div>
    </div>
  );
};