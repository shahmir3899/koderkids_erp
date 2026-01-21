// ============================================
// INVENTORY DETAILS MODAL - Gradient Design System
// ============================================
// Location: src/components/inventory/InventoryDetailsModal.js
//
// Matches backend serializer fields:
// - location (string: School/Headquarters/Unassigned)
// - school_name (from FK)
// - last_updated (not updated_at)
// - unique_id (auto-generated)

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { fetchInventoryHistory } from '../../services/inventoryService';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  Z_INDEX,
} from '../../utils/designConstants';

// ============================================
// STATUS CONFIG - Match backend choices
// ============================================

const STATUS_CONFIG = {
  'Available': { label: 'Available', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.2)', icon: '✅' },
  'Assigned': { label: 'Assigned', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.2)', icon: '👤' },
  'Damaged': { label: 'Damaged', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.2)', icon: '⚠️' },
  'Lost': { label: 'Lost', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.2)', icon: '❌' },
  'Disposed': { label: 'Disposed', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.2)', icon: '🗑️' },
};

// ============================================
// STYLES - Gradient Design (matching other modals)
// ============================================

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: Z_INDEX.modal,
    padding: SPACING.sm,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: COLORS.background.gradient,
    borderRadius: BORDER_RADIUS.xl,
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    background: 'rgba(255, 255, 255, 0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  title: {
    margin: 0,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },
  subtitle: {
    margin: `${SPACING.xs} 0 0`,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },
  uniqueId: {
    margin: `${SPACING.xs} 0 0`,
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'monospace',
  },
  closeButton: {
    padding: SPACING.sm,
    background: 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: '50%',
    cursor: 'pointer',
    color: COLORS.text.white,
    transition: `all ${TRANSITIONS.fast} ease`,
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tabsContainer: {
    display: 'flex',
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    padding: `0 ${SPACING.lg}`,
    background: 'rgba(255, 255, 255, 0.02)',
  },
  tab: {
    padding: `${SPACING.md} ${SPACING.lg}`,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontWeight: FONT_WEIGHTS.medium,
    fontSize: FONT_SIZES.sm,
    marginBottom: '-1px',
    transition: `all ${TRANSITIONS.fast}`,
  },
  body: {
    padding: SPACING.lg,
    overflowY: 'auto',
    flex: 1,
  },
  descriptionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: `${SPACING.sm} 0`,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  detailLabel: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailValue: {
    color: COLORS.text.white,
    fontWeight: FONT_WEIGHTS.medium,
    fontSize: FONT_SIZES.sm,
    textAlign: 'right',
    maxWidth: '60%',
    wordBreak: 'break-word',
  },
  notesBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
    border: '1px solid rgba(251, 191, 36, 0.3)',
  },
  footer: {
    padding: SPACING.lg,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    background: 'rgba(255, 255, 255, 0.03)',
    position: 'sticky',
    bottom: 0,
  },
  closeBtn: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: COLORS.text.white,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
  },
  editBtn: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: '#3B82F6',
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  deleteBtn: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: '#EF4444',
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
  },
};

// ============================================
// DETAIL ROW COMPONENT
// ============================================

const DetailRow = ({ label, value, icon }) => (
  <div style={styles.detailRow}>
    <span style={styles.detailLabel}>
      {icon && <span>{icon}</span>}
      {label}
    </span>
    <span style={styles.detailValue}>
      {value || '-'}
    </span>
  </div>
);

// ============================================
// STATUS BADGE COMPONENT
// ============================================

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || { label: status, color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.2)', icon: '?' };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      padding: '0.375rem 0.875rem',
      backgroundColor: config.bgColor,
      color: config.color,
      borderRadius: '9999px',
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.semibold,
      border: `1px solid ${config.color}40`,
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
        padding: SPACING.xl,
        textAlign: 'center',
        color: COLORS.text.whiteSubtle,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: BORDER_RADIUS.md,
        border: `1px solid ${COLORS.border.whiteTransparent}`,
      }}>
        No history available for this item
      </div>
    );
  }

  return (
    <div style={{ marginTop: SPACING.sm }}>
      {history.map((entry, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            gap: SPACING.md,
            paddingBottom: SPACING.md,
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: index === 0 ? '#8B5CF6' : 'rgba(255, 255, 255, 0.3)',
              zIndex: 1,
            }} />
            {index < history.length - 1 && (
              <div style={{
                width: '2px',
                flex: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                marginTop: '4px',
              }} />
            )}
          </div>

          <div style={{ flex: 1, paddingBottom: SPACING.xs }}>
            <div style={{
              fontSize: FONT_SIZES.sm,
              fontWeight: FONT_WEIGHTS.medium,
              color: COLORS.text.white,
            }}>
              {entry.action || entry.description}
            </div>
            <div style={{
              fontSize: FONT_SIZES.xs,
              color: COLORS.text.whiteSubtle,
              marginTop: SPACING.xs,
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

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <div style={styles.header}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs, flexWrap: 'wrap' }}>
              <h2 style={styles.title}>
                📦 {item.name}
              </h2>
              <StatusBadge status={item.status} />
            </div>
            <p style={styles.subtitle}>
              {item.category_name || 'Uncategorized'} • {getLocationDisplay()}
            </p>
            {item.unique_id && (
              <p style={styles.uniqueId}>
                ID: {item.unique_id}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={styles.closeButton}
            title="Close (Esc)"
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ============================================ */}
        {/* TABS */}
        {/* ============================================ */}
        <div style={styles.tabsContainer}>
          {['details', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tab,
                color: activeTab === tab ? '#8B5CF6' : COLORS.text.whiteSubtle,
                borderBottom: activeTab === tab ? '2px solid #8B5CF6' : '2px solid transparent',
              }}
            >
              {tab === 'details' ? '📋 Details' : '📜 History'}
            </button>
          ))}
        </div>

        {/* ============================================ */}
        {/* BODY */}
        {/* ============================================ */}
        <div style={styles.body}>
          {activeTab === 'details' ? (
            <>
              {/* Description */}
              {item.description && (
                <div style={styles.descriptionBox}>
                  <h4 style={{ margin: `0 0 ${SPACING.xs} 0`, fontSize: FONT_SIZES.sm, color: COLORS.text.white }}>
                    Description
                  </h4>
                  <p style={{ margin: 0, color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.sm, lineHeight: '1.5' }}>
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
                <div style={styles.notesBox}>
                  <h4 style={{
                    margin: `0 0 ${SPACING.xs} 0`,
                    fontSize: FONT_SIZES.sm,
                    color: '#fcd34d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING.xs,
                  }}>
                    📝 Notes
                  </h4>
                  <p style={{ margin: 0, color: '#fde68a', fontSize: FONT_SIZES.sm, lineHeight: '1.5' }}>
                    {item.notes}
                  </p>
                </div>
              )}
            </>
          ) : (
            // History Tab
            loadingHistory ? (
              <div style={{ textAlign: 'center', padding: SPACING.xl, color: COLORS.text.whiteSubtle }}>
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
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.closeBtn}>
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onEdit(item);
            }}
            style={styles.editBtn}
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
                onDelete(item.id);
              }
            }}
            style={styles.deleteBtn}
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InventoryDetailsModal;
