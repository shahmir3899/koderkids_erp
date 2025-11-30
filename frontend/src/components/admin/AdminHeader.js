// ============================================
// ADMIN HEADER - Admin Dashboard Header
// ============================================

import React from 'react';

export const AdminHeader = () => {
  return (
    <header style={{
      backgroundColor: '#3B82F6',
      color: '#FFFFFF',
      padding: '1.5rem',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      marginBottom: '2rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img 
          src="/whiteLogo.png" 
          alt="Koder Kids Logo" 
          style={{ height: '3rem', width: 'auto', marginRight: '1rem' }} 
        />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
          Koder Kids Admin Dashboard
        </h1>
      </div>
    </header>
  );
};

export default AdminHeader;