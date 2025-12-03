// ============================================
// INVENTORY DETAILS MODAL - Corrected Version
// ============================================
// Location: src/components/inventory/InventoryDetailsModal.js
//
// Matches backend serializer fields:
// - location (string: School/Headquarters/Unassigned)
// - school_name (from FK)
// - last_updated (not updated_at)
// - unique_id (auto-generated)

import React, { useState, useEffect } from 'react';
import { fetchInventoryHistory } from '../../services/inventoryService';

// ============================================
// STATUS CONFIG - Match backend choices
// ============================================

const STATUS_CONFIG = {
  'Available': { label: 'Available', color: '#10B981', icon: '✅' },
  'Assigned': { label: 'Assigned', color: '#3B82F6', icon: '👤' },
  'Damaged': { label: 'Damaged', color: '#F59E0B', icon: '⚠️' },
  'Lost': { label: 'Lost', color: '#EF4444', icon: '❌' },
  'Disposed': { label: 'Disposed', color: '#6B7280', icon: '🗑️' },
};

// ============================================
// STYLES
// ============================================

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem',
};

const modalContentStyle = {
  backgroundColor: 'white',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '600px',
  maxHeight: '90vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

const modalHeaderStyle = {
  padding: '1.5rem',
  borderBottom: '1px solid #E5E7EB',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
};

const modalBodyStyle = {
  padding: '1.5rem',
  overflowY: 'auto',
  flex: 1,
};

const modalFooterStyle = {
  padding: '1rem 1.5rem',
  borderTop: '1px solid #E5E7EB',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  backgroundColor: '#F9FAFB',
};

// ============================================
// DETAIL ROW COMPONENT
// ============================================

const DetailRow = ({ label, value, icon }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '0.75rem 0',
    borderBottom: '1px solid #F3F4F6',
  }}>
    <span style={{ 
      color: '#6B7280', 
      fontSize: '0.875rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    }}>
      {icon && <span>{icon}</span>}
      {label}
    </span>
    <span style={{ 
      color: '#1F2937', 
      fontWeight: '500', 
      fontSize: '0.875rem',
      textAlign: 'right',
      maxWidth: '60%',
      wordBreak: 'break-word',
    }}>
      {value || '-'}
    </span>
  </div>
);

// ============================================
// STATUS BADGE COMPONENT
// ============================================

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || { label: status, color: '#6B7280', icon: '?' };
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      padding: '0.375rem 0.875rem',
      backgroundColor: config.color + '15',
      color: config.color,
      borderRadius: '9999px',
      fontSize: '0.875rem',
      fontWeight: '600',
    }}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
};

// ============================================
// HISTORY TIMELINE COMPONENT
// ============================================

const HistoryTimeline = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        color: '#9CA3AF',
        backgroundColor: '#F9FAFB',
        borderRadius: '8px',
      }}>
        No history available for this item
      </div>
    );
  }

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {history.map((entry, index) => (
        <div 
          key={index}
          style={{
            display: 'flex',
            gap: '1rem',
            paddingBottom: '1rem',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: index === 0 ? '#3B82F6' : '#D1D5DB',
              zIndex: 1,
            }} />
            {index < history.length - 1 && (
              <div style={{
                width: '2px',
                flex: 1,
                backgroundColor: '#E5E7EB',
                marginTop: '4px',
              }} />
            )}
          </div>
          
          <div style={{ flex: 1, paddingBottom: '0.5rem' }}>
            <div style={{ 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#1F2937',
            }}>
              {entry.action || entry.description}
            </div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6B7280',
              marginTop: '0.25rem',
            }}>
              {entry.user && <span>by {entry.user} • </span>}
              {new Date(entry.timestamp || entry.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const InventoryDetailsModal = ({
  isOpen,
  onClose,
  item,
  onEdit,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch history when tab changes
  useEffect(() => {
    if (activeTab === 'history' && item?.id) {
      setLoadingHistory(true);
      fetchInventoryHistory(item.id)
        .then(setHistory)
        .catch(() => setHistory([]))
        .finally(() => setLoadingHistory(false));
    }
  }, [activeTab, item?.id]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isOpen || !item) return null;

  // Format currency
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return `PKR ${Number(value).toLocaleString()}`;
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format datetime
  const formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get location display text
  const getLocationDisplay = () => {
    if (item.location === 'School' && item.school_name) {
      return `${item.school_name} (School)`;
    }
    return item.location || 'Unknown';
  };

  return (
    <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalContentStyle}>
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <div style={modalHeaderStyle}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1F2937' }}>
                📦 {item.name}
              </h2>
              <StatusBadge status={item.status} />
            </div>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>
              {item.category_name || 'Uncategorized'} • {getLocationDisplay()}
            </p>
            {item.unique_id && (
              <p style={{ 
                margin: '0.25rem 0 0 0', 
                color: '#9CA3AF', 
                fontSize: '0.75rem',
                fontFamily: 'monospace',
              }}>
                ID: {item.unique_id}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '0.5rem',
              borderRadius: '8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* ============================================ */}
        {/* TABS */}
        {/* ============================================ */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #E5E7EB',
          padding: '0 1.5rem',
        }}>
          {['details', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '1rem 1.5rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem',
                color: activeTab === tab ? '#3B82F6' : '#6B7280',
                borderBottom: activeTab === tab ? '2px solid #3B82F6' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'details' ? '📋 Details' : '📜 History'}
            </button>
          ))}
        </div>

        {/* ============================================ */}
        {/* BODY */}
        {/* ============================================ */}
        <div style={modalBodyStyle}>
          {activeTab === 'details' ? (
            <>
              {/* Description */}
              {item.description && (
                <div style={{
                  backgroundColor: '#F9FAFB',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#374151' }}>
                    Description
                  </h4>
                  <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem', lineHeight: '1.5' }}>
                    {item.description}
                  </p>
                </div>
              )}

              {/* Details Grid */}
              <div>
                <DetailRow 
                  icon="🔖" 
                  label="Unique ID" 
                  value={item.unique_id} 
                />
                <DetailRow 
                  icon="🏷️" 
                  label="Category" 
                  value={item.category_name || 'Uncategorized'} 
                />
                <DetailRow 
                  icon="📍" 
                  label="Location" 
                  value={getLocationDisplay()} 
                />
                <DetailRow 
                  icon="💰" 
                  label="Purchase Value" 
                  value={formatCurrency(item.purchase_value)} 
                />
                <DetailRow 
                  icon="📅" 
                  label="Purchase Date" 
                  value={formatDate(item.purchase_date)} 
                />
                <DetailRow 
                  icon="👤" 
                  label="Assigned To" 
                  value={item.assigned_to_name || 'Unassigned'} 
                />
                <DetailRow 
                  icon="✏️" 
                  label="Last Updated" 
                  value={formatDateTime(item.last_updated)} 
                />
              </div>

              {/* Notes */}
              {item.notes && (
                <div style={{
                  backgroundColor: '#FEF3C7',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginTop: '1.5rem',
                  border: '1px solid #FCD34D',
                }}>
                  <h4 style={{ 
                    margin: '0 0 0.5rem 0', 
                    fontSize: '0.875rem', 
                    color: '#92400E',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    📝 Notes
                  </h4>
                  <p style={{ margin: 0, color: '#92400E', fontSize: '0.875rem', lineHeight: '1.5' }}>
                    {item.notes}
                  </p>
                </div>
              )}
            </>
          ) : (
            // History Tab
            loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
                ⏳ Loading history...
              </div>
            ) : (
              <HistoryTimeline history={history} />
            )
          )}
        </div>

        {/* ============================================ */}
        {/* FOOTER */}
        {/* ============================================ */}
        <div style={modalFooterStyle}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: 'white',
              color: '#374151',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onEdit(item);
            }}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#3B82F6',
              color: 'white',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
                onDelete(item.id);
              }
            }}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#EF4444',
              color: 'white',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryDetailsModal;