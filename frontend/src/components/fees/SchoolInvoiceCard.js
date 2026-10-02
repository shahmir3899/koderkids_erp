/**
 * SchoolInvoiceCard Component
 * Path: frontend/src/components/fees/SchoolInvoiceCard.js
 *
 * Lumpsum (monthly subscription) schools get ONE invoice per month instead of
 * a per-student fee table: school, classes covered, students enrolled, amount.
 * Supports Pay in full, editing the received amount (part payments), PDF and delete.
 */

import React, { useState } from 'react';
import { format } from 'date-fns';

import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';
import { useResponsive } from '../../hooks/useResponsive';

const formatCurrency = (value) =>
  parseFloat(value || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusStyle = (status) => {
  switch (status) {
    case 'Paid':
      return { background: 'rgba(16, 185, 129, 0.2)', color: '#6EE7B7' };
    case 'Overdue':
      return { background: 'rgba(239, 68, 68, 0.2)', color: '#FCA5A5' };
    default:
      return { background: 'rgba(245, 158, 11, 0.2)', color: '#FCD34D' };
  }
};

const SchoolInvoiceCard = ({
  invoice,
  onPayInFull,
  onSavePaid,
  onDelete,
  onDownloadPDF,
  loading = false,
}) => {
  const { isMobile } = useResponsive();
  const [editing, setEditing] = useState(false);
  const [paidInput, setPaidInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPay, setConfirmPay] = useState(false);

  const total = parseFloat(invoice.total_amount);
  const balance = parseFloat(invoice.balance_due);

  const startEdit = () => {
    setPaidInput(invoice.paid_amount);
    setEditing(true);
  };

  const saveEdit = async () => {
    const amount = parseFloat(paidInput);
    if (isNaN(amount) || amount < 0 || amount > total) return;
    const result = await onSavePaid(invoice.id, amount);
    if (result?.success) setEditing(false);
  };

  const styles = {
    card: {
      ...MIXINS.glassmorphicCard,
      borderRadius: BORDER_RADIUS.xl,
      padding: isMobile ? SPACING.md : SPACING.lg,
      marginBottom: SPACING.lg,
      color: COLORS.text.white,
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: SPACING.md,
      flexWrap: 'wrap',
      marginBottom: SPACING.md,
    },
    title: { fontSize: isMobile ? FONT_SIZES.lg : FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, margin: 0, lineHeight: 1.25 },
    sub: { color: COLORS.text.whiteMedium, fontSize: FONT_SIZES.sm, marginTop: '4px' },
    badge: {
      ...statusStyle(invoice.status),
      padding: `${SPACING.xs} ${SPACING.md}`,
      borderRadius: BORDER_RADIUS.full,
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.semibold,
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
      gap: SPACING.md,
      marginBottom: SPACING.md,
    },
    tile: {
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md,
      minWidth: 0,
    },
    tileWide: { gridColumn: isMobile ? '1 / -1' : 'auto' },
    label: { color: COLORS.text.whiteMedium, fontSize: FONT_SIZES.xs, textTransform: 'uppercase', letterSpacing: '0.04em' },
    value: { fontSize: isMobile ? FONT_SIZES.lg : FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, marginTop: '4px' },
    classes: { color: COLORS.text.whiteMedium, fontSize: FONT_SIZES.xs, marginTop: SPACING.sm, lineHeight: 1.5 },
    actions: { display: 'flex', gap: SPACING.sm, flexWrap: 'wrap', marginTop: SPACING.md },
    btn: {
      padding: `${SPACING.sm} ${SPACING.md}`,
      borderRadius: BORDER_RADIUS.lg,
      border: '1px solid rgba(255, 255, 255, 0.25)',
      background: 'rgba(255, 255, 255, 0.1)',
      color: COLORS.text.white,
      cursor: loading ? 'not-allowed' : 'pointer',
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.medium,
      minHeight: '44px',
      transition: `all ${TRANSITIONS.normal}`,
      flex: isMobile ? '1 1 45%' : '0 0 auto',
    },
    btnGreen: { background: 'rgba(16, 185, 129, 0.25)', border: '1px solid rgba(16, 185, 129, 0.6)', color: '#6EE7B7' },
    btnRed: { background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#FCA5A5' },
    input: {
      padding: SPACING.sm,
      borderRadius: BORDER_RADIUS.md,
      border: `1px solid ${COLORS.primary}`,
      background: 'rgba(255, 255, 255, 0.1)',
      color: COLORS.text.white,
      fontSize: '16px',
      width: '100%',
      minHeight: '44px',
      outline: 'none',
    },
    tapValue: {
      background: 'none',
      border: 'none',
      padding: 0,
      color: 'inherit',
      font: 'inherit',
      cursor: 'pointer',
      textDecoration: 'underline dotted',
      textAlign: 'left',
    },
    overlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: SPACING.md,
    },
    modal: {
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.97) 0%, rgba(15, 23, 42, 0.97) 100%)',
      borderRadius: BORDER_RADIUS.xl,
      border: '1px solid rgba(255, 255, 255, 0.1)',
      padding: SPACING.lg,
      width: '100%',
      maxWidth: '400px',
    },
  };

  const Confirm = ({ title, text, label, color, onYes, onNo }) => (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={{ margin: 0, marginBottom: SPACING.sm, fontSize: FONT_SIZES.lg }}>{title}</h3>
        <p style={{ color: COLORS.text.whiteMedium, marginBottom: SPACING.lg }}>{text}</p>
        <div style={{ display: 'flex', gap: SPACING.md, justifyContent: 'flex-end' }}>
          <button onClick={onNo} style={styles.btn}>Cancel</button>
          <button onClick={onYes} style={{ ...styles.btn, background: color, border: 'none' }}>{label}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{invoice.school_name}</h2>
          <div style={styles.sub}>
            Invoice {invoice.invoice_no} &middot; {invoice.month}
          </div>
        </div>
        <span style={styles.badge}>{invoice.status}</span>
      </div>

      <div style={styles.grid}>
        <div style={styles.tile}>
          <div style={styles.label}>Students enrolled</div>
          <div style={styles.value}>{invoice.students_count}</div>
        </div>
        <div style={styles.tile}>
          <div style={styles.label}>Classes covered</div>
          <div style={styles.value}>{invoice.classes_count}</div>
        </div>
        <div style={{ ...styles.tile, ...styles.tileWide }}>
          <div style={styles.label}>Amount payable</div>
          <div style={styles.value}>PKR {formatCurrency(total)}</div>
        </div>
        <div style={styles.tile}>
          <div style={styles.label}>Received</div>
          {editing ? (
            <div style={{ marginTop: SPACING.xs }}>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max={total}
                step="0.01"
                value={paidInput}
                onChange={(e) => setPaidInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit();
                  if (e.key === 'Escape') setEditing(false);
                }}
                style={styles.input}
                autoFocus
              />
              <div style={{ display: 'flex', gap: SPACING.xs, marginTop: SPACING.xs }}>
                <button onClick={saveEdit} style={{ ...styles.btn, ...styles.btnGreen, flex: 1 }} disabled={loading}>Save</button>
                <button onClick={() => setEditing(false)} style={{ ...styles.btn, flex: 1 }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={styles.value}>
              <button type="button" style={styles.tapValue} onClick={startEdit} aria-label="Edit received amount">
                PKR {formatCurrency(invoice.paid_amount)}
              </button>
            </div>
          )}
        </div>
        <div style={styles.tile}>
          <div style={styles.label}>Balance due</div>
          <div style={{ ...styles.value, color: balance > 0 ? '#FCA5A5' : '#6EE7B7' }}>PKR {formatCurrency(balance)}</div>
        </div>
        <div style={styles.tile}>
          <div style={styles.label}>Date received</div>
          <div style={{ ...styles.value, fontSize: FONT_SIZES.base }}>
            {invoice.date_received ? format(new Date(invoice.date_received), 'dd MMM yyyy') : '-'}
          </div>
        </div>
      </div>

      {invoice.class_names?.length > 0 && (
        <div style={styles.classes}>Classes: {invoice.class_names.join(', ')}</div>
      )}

      <div style={styles.actions}>
        {balance > 0 && (
          <button style={{ ...styles.btn, ...styles.btnGreen }} disabled={loading} onClick={() => setConfirmPay(true)}>
            Pay in full
          </button>
        )}
        <button style={styles.btn} onClick={() => onDownloadPDF(invoice)}>Download PDF</button>
        <button style={{ ...styles.btn, ...styles.btnRed }} disabled={loading} onClick={() => setConfirmDelete(true)}>
          Delete invoice
        </button>
      </div>

      {confirmPay && (
        <Confirm
          title="Confirm Pay in Full"
          text={`Mark the ${invoice.month} invoice for ${invoice.school_name} as fully paid (PKR ${formatCurrency(total)})? The received date will be set to today.`}
          label="Pay in full"
          color={COLORS.status.success}
          onYes={() => { setConfirmPay(false); onPayInFull(invoice.id); }}
          onNo={() => setConfirmPay(false)}
        />
      )}
      {confirmDelete && (
        <Confirm
          title="Delete Invoice"
          text={`Delete the ${invoice.month} invoice for ${invoice.school_name}? This cannot be undone.`}
          label="Delete"
          color={COLORS.status.error}
          onYes={() => { setConfirmDelete(false); onDelete(invoice.id); }}
          onNo={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
};

export default SchoolInvoiceCard;
