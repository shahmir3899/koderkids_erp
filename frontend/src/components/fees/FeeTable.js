/**
 * FeeTable Component
 * Path: frontend/src/components/fees/FeeTable.js
 * Glassmorphism Design System
 *
 * Responsive design:
 * - Mobile: Shows essential columns (Name, Paid, Balance, Actions)
 * - Tablet+: Shows all columns
 * - Touch targets: min 44px for interactive elements
 */

import React from 'react';
import FeeTableRow from './FeeTableRow';
import { useResponsive } from '../../hooks/useResponsive';

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';

const formatCurrency = (value) => {
  const num = parseFloat(value || 0);
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const FeeTable = ({
  groupedFees,
  totals,
  selectedFeeIds,
  onToggleSelect,
  onSelectAll,
  isAllSelected,
  sortConfig,
  onSort,
  editingFeeId,
  onEditStart,
  onEditSave,
  onEditCancel,
  editedValues,
  onEditValueChange,
  onDelete,
  loading,
}) => {
  const { isMobile } = useResponsive();

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const styles = {
    container: {
      ...MIXINS.glassmorphicCard,
      borderRadius: BORDER_RADIUS.xl,
      overflow: 'hidden',
    },
    tableWrapper: {
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,
    },
    headerRow: {
      background: 'rgba(255, 255, 255, 0.15)',
    },
    headerCell: {
      padding: isMobile ? `${SPACING.sm} ${SPACING.xs}` : `${SPACING.md} ${SPACING.md}`,
      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
      color: COLORS.text.white,
      fontWeight: FONT_WEIGHTS.semibold,
      fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
      cursor: 'pointer',
      transition: `background ${TRANSITIONS.fast}`,
      whiteSpace: 'nowrap',
    },
    headerCellHover: {
      background: 'rgba(255, 255, 255, 0.1)',
    },
    sortIcon: {
      color: COLORS.primary,
      marginLeft: SPACING.xs,
    },
    checkboxCell: {
      width: isMobile ? '40px' : '48px',
      textAlign: 'center',
    },
    checkbox: {
      width: isMobile ? '20px' : '16px',
      height: isMobile ? '20px' : '16px',
      cursor: 'pointer',
      accentColor: COLORS.primary,
    },
    groupRow: {
      background: 'rgba(59, 130, 246, 0.2)',
    },
    groupCell: {
      padding: isMobile ? `${SPACING.sm} ${SPACING.xs}` : `${SPACING.sm} ${SPACING.md}`,
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    },
    groupLabel: {
      fontWeight: FONT_WEIGHTS.semibold,
      color: '#93C5FD',
      fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,
    },
    groupCount: {
      color: '#60A5FA',
      fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
      marginLeft: SPACING.sm,
    },
    subtotalRow: {
      background: 'rgba(255, 255, 255, 0.08)',
    },
    subtotalCell: {
      padding: isMobile ? `${SPACING.sm} ${SPACING.xs}` : `${SPACING.sm} ${SPACING.md}`,
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      color: COLORS.text.white,
      fontWeight: FONT_WEIGHTS.semibold,
      fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
    },
    grandTotalRow: {
      background: 'rgba(255, 255, 255, 0.15)',
    },
    grandTotalCell: {
      padding: isMobile ? `${SPACING.sm} ${SPACING.xs}` : `${SPACING.md} ${SPACING.md}`,
      borderTop: '2px solid rgba(255, 255, 255, 0.2)',
      color: COLORS.text.white,
      fontWeight: FONT_WEIGHTS.bold,
      fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
    },
    paidAmount: {
      color: '#6EE7B7',
    },
    balanceAmount: {
      color: '#FCA5A5',
    },
    emptyState: {
      ...MIXINS.glassmorphicCard,
      textAlign: 'center',
      padding: isMobile ? SPACING.xl : `${SPACING['2xl']} 0`,
      borderRadius: BORDER_RADIUS.xl,
    },
    emptyIcon: {
      width: '64px',
      height: '64px',
      margin: '0 auto',
      color: 'rgba(255, 255, 255, 0.3)',
      marginBottom: SPACING.md,
    },
    emptyTitle: {
      color: COLORS.text.whiteMedium,
      fontSize: FONT_SIZES.lg,
      marginBottom: SPACING.xs,
    },
    emptySubtitle: {
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: FONT_SIZES.sm,
    },
  };

  const renderSortableHeader = (key, label, align = 'left', hideOnMobile = false) => {
    if (hideOnMobile && isMobile) return null;

    const textAlign = align === 'right' ? 'right' : align === 'center' ? 'center' : 'left';

    return (
      <th
        scope="col"
        style={{ ...styles.headerCell, textAlign }}
        onClick={() => onSort(key)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSort(key)}
        tabIndex={0}
        role="button"
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: textAlign === 'right' ? 'flex-end' : textAlign === 'center' ? 'center' : 'flex-start', gap: SPACING.xs }}>
          {isMobile && label.length > 6 ? label.substring(0, 6) + '.' : label}
          {getSortIcon(key) && <span style={styles.sortIcon}>{getSortIcon(key)}</span>}
        </span>
      </th>
    );
  };

  if (groupedFees.length === 0) {
    return (
      <div style={styles.emptyState}>
        <svg style={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p style={styles.emptyTitle}>No fee records found</p>
        <p style={styles.emptySubtitle}>Select filters or create new records to get started</p>
      </div>
    );
  }

  const totalFeeCount = groupedFees.reduce((sum, g) => sum + g.fees.length, 0);
  const columnCount = isMobile ? 5 : 8;

  return (
    <div style={styles.container}>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th scope="col" style={{ ...styles.headerCell, ...styles.checkboxCell }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  style={styles.checkbox}
                />
              </th>
              {renderSortableHeader('student_name', 'Name')}
              {renderSortableHeader('total_fee', 'Total', 'right', true)}
              {renderSortableHeader('paid_amount', 'Paid', 'right')}
              {renderSortableHeader('date_received', 'Date', 'center', true)}
              {renderSortableHeader('balance_due', 'Balance', 'right')}
              {renderSortableHeader('status', 'Status', 'center', true)}
              <th scope="col" style={{ ...styles.headerCell, textAlign: 'center', width: isMobile ? '48px' : '64px' }}>
                {isMobile ? '⚙️' : 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody>
            {groupedFees.map((group) => (
              <React.Fragment key={group.class}>
                <tr style={styles.groupRow}>
                  <td colSpan={columnCount} style={styles.groupCell}>
                    <span style={styles.groupLabel}>
                      {isMobile ? group.class : `Class: ${group.class}`}
                    </span>
                    <span style={styles.groupCount}>
                      ({group.fees.length})
                    </span>
                  </td>
                </tr>

                {group.fees.map((fee) => (
                  <FeeTableRow
                    key={fee.id}
                    fee={fee}
                    isSelected={selectedFeeIds.includes(fee.id)}
                    onToggleSelect={() => onToggleSelect(fee.id)}
                    isEditing={editingFeeId}
                    onEditStart={onEditStart}
                    onEditSave={onEditSave}
                    onEditCancel={onEditCancel}
                    editedValues={editedValues}
                    onEditValueChange={onEditValueChange}
                    onDelete={onDelete}
                    isMobile={isMobile}
                  />
                ))}

                <tr style={styles.subtotalRow}>
                  <td style={styles.subtotalCell} />
                  <td style={{ ...styles.subtotalCell, textAlign: 'right' }}>
                    {isMobile ? 'Sub:' : `Subtotal for ${group.class}:`}
                  </td>
                  {!isMobile && (
                    <td style={{ ...styles.subtotalCell, textAlign: 'right' }}>
                      {formatCurrency(group.subtotals.total_fee)}
                    </td>
                  )}
                  <td style={{ ...styles.subtotalCell, textAlign: 'right' }}>
                    {formatCurrency(group.subtotals.paid_amount)}
                  </td>
                  {!isMobile && <td style={styles.subtotalCell} />}
                  <td style={{ ...styles.subtotalCell, textAlign: 'right' }}>
                    {formatCurrency(group.subtotals.balance_due)}
                  </td>
                  {!isMobile && <td style={styles.subtotalCell} />}
                  <td style={styles.subtotalCell} />
                </tr>
              </React.Fragment>
            ))}

            <tr style={styles.grandTotalRow}>
              <td style={styles.grandTotalCell} />
              <td style={{ ...styles.grandTotalCell, textAlign: 'right' }}>
                {isMobile ? `Total (${totalFeeCount}):` : `Grand Total (${totalFeeCount} records):`}
              </td>
              {!isMobile && (
                <td style={{ ...styles.grandTotalCell, textAlign: 'right' }}>
                  {formatCurrency(totals.total_fee)}
                </td>
              )}
              <td style={{ ...styles.grandTotalCell, ...styles.paidAmount, textAlign: 'right' }}>
                {formatCurrency(totals.paid_amount)}
              </td>
              {!isMobile && <td style={styles.grandTotalCell} />}
              <td style={{ ...styles.grandTotalCell, ...styles.balanceAmount, textAlign: 'right' }}>
                {formatCurrency(totals.balance_due)}
              </td>
              {!isMobile && <td style={styles.grandTotalCell} />}
              <td style={styles.grandTotalCell} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FeeTable;