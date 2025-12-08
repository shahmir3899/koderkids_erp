// ============================================
// INVENTORY STATS - Stat Cards Component
// ============================================
// Location: src/components/inventory/InventoryStats.js
//
// Displays 4 summary stat cards:
// - Total Items
// - Total Value
// - Available Items
// - Assigned Items

import React from 'react';

// ============================================
// STAT CARD COMPONENT
// ============================================
const StatCard = ({ title, value, subtitle, icon, color = '#3B82F6' }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #E5E7EB',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    transition: 'transform 0.2s, box-shadow 0.2s',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
  }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: '500' }}>{title}</span>
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
    </div>
    <div style={{ fontSize: '2rem', fontWeight: '700', color }}>{value}</div>
    {subtitle && <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{subtitle}</div>}
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================
export const InventoryStats = ({
  totalItems = 0,
  totalValue = 0,
  availableCount = 0,
  assignedCount = 0,
  loading = false,
}) => {
  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#F3F4F6',
              borderRadius: '12px',
              padding: '1.5rem',
              height: '120px',
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
  }

  return (
    <div style={containerStyle}>
      <StatCard
        title="Total Items"
        value={totalItems.toLocaleString()}
        icon="📦"
        color="#3B82F6"
        subtitle="All inventory items"
      />
      <StatCard
        title="Total Value"
        value={`PKR ${totalValue.toLocaleString()}`}
        icon="💰"
        color="#10B981"
        subtitle="Combined asset value"
      />
      <StatCard
        title="Available"
        value={availableCount.toLocaleString()}
        icon="✅"
        color="#10B981"
        subtitle="Ready for assignment"
      />
      <StatCard
        title="Assigned"
        value={assignedCount.toLocaleString()}
        icon="👤"
        color="#8B5CF6"
        subtitle="Currently in use"
      />
    </div>
  );
};

export default InventoryStats;