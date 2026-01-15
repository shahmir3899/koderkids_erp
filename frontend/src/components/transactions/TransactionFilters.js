// ============================================
// TRANSACTION FILTERS COMPONENT - Glassmorphism Design
// ============================================
// Location: src/components/transactions/TransactionFilters.js
//
// FEATURES:
// 1. Account-based filtering for reconciliation
// 2. Account type filtering (Bank/Person)
// 3. Search button - filters only apply when clicked
// 4. Visual indicator for unapplied changes
// 5. Glassmorphism design with translucent inputs

import React, { useEffect, useRef } from 'react';
import { Button } from '../common/ui/Button';
import { useDebounce } from '../../hooks/useDebounce';

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

export const TransactionFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  onApplyFilters,
  schools,
  categories,
  accounts,
  accountsByType,
  hasUnappliedFilters,
  autoApplySearch = false, // Optional: auto-apply when search changes (debounced)
}) => {
  const hasActiveFilters = Object.values(filters).some((value) => value !== '');

  // Debounce the search filter for auto-apply scenarios
  const debouncedSearch = useDebounce(filters.search, 300);
  const isInitialMount = useRef(true);

  // Auto-apply search after debounce (optional feature)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (autoApplySearch && debouncedSearch !== undefined) {
      onApplyFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, autoApplySearch]);

  return (
    <div style={styles.container}>
      {/* Header with Search Button */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.headerTitle}>Filter Transactions</h3>
          <p style={styles.headerSubtitle}>Configure filters and click "Search" to apply</p>
        </div>
        <div style={styles.headerButtons}>
          {hasActiveFilters && (
            <Button onClick={onClearFilters} variant="secondary" size="small">
              Clear All
            </Button>
          )}
          <Button
            onClick={onApplyFilters}
            variant="primary"
            style={{
              position: 'relative',
              backgroundColor: hasUnappliedFilters ? COLORS.status.warning : COLORS.interactive.primary,
            }}
          >
            {hasUnappliedFilters ? 'Search (Changes Not Applied)' : 'Search'}
          </Button>
        </div>
      </div>

      {/* ============================================ */}
      {/* RECONCILIATION SECTION */}
      {/* ============================================ */}
      <div style={styles.reconciliationSection}>
        <h4 style={styles.reconciliationTitle}>
          Reconciliation Filters
        </h4>

        <div style={styles.filterGrid}>
          {/* Account Type Filter */}
          <div>
            <label style={styles.reconciliationLabel}>Account Type</label>
            <select
              value={filters.accountType}
              onChange={(e) => onFilterChange('accountType', e.target.value)}
              style={styles.reconciliationSelect}
            >
              <option value="">All Account Types</option>
              <option value="Bank">Bank Accounts ({accountsByType.bank.length})</option>
              <option value="Person">Person Accounts ({accountsByType.person.length})</option>
            </select>
            <p style={styles.reconciliationHint}>
              Filter by type to reconcile banks or track person transactions
            </p>
          </div>

          {/* Specific Account Filter */}
          <div>
            <label style={styles.reconciliationLabel}>Specific Account</label>
            <select
              value={filters.account}
              onChange={(e) => onFilterChange('account', e.target.value)}
              style={styles.reconciliationSelect}
            >
              <option value="">All Accounts</option>

              {/* Bank Accounts Group */}
              {accountsByType.bank.length > 0 && (
                <optgroup label="Bank Accounts">
                  {accountsByType.bank.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} (PKR {acc.current_balance?.toLocaleString() || 0})
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Person Accounts Group */}
              {accountsByType.person.length > 0 && (
                <optgroup label="Person Accounts">
                  {accountsByType.person.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} (PKR {acc.current_balance?.toLocaleString() || 0})
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Other Accounts Group */}
              {accountsByType.other.length > 0 && (
                <optgroup label="Other Accounts">
                  {accountsByType.other.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} (PKR {acc.current_balance?.toLocaleString() || 0})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <p style={styles.reconciliationHint}>
              Shows transactions where this account is either sender or receiver
            </p>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* STANDARD FILTERS */}
      {/* ============================================ */}
      <div style={styles.standardFilterGrid}>
        {/* Search */}
        <div>
          <label style={styles.filterLabel}>Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="Search category, notes, accounts..."
            style={styles.input}
          />
        </div>

        {/* Date From */}
        <div>
          <label style={styles.filterLabel}>Date From</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange('dateFrom', e.target.value)}
            style={styles.input}
          />
        </div>

        {/* Date To */}
        <div>
          <label style={styles.filterLabel}>Date To</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange('dateTo', e.target.value)}
            style={styles.input}
          />
        </div>

        {/* School Filter */}
        <div>
          <label style={styles.filterLabel}>School</label>
          <select
            value={filters.school}
            onChange={(e) => onFilterChange('school', e.target.value)}
            style={styles.select}
          >
            <option value="">All Schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
            <option value="null">No School</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label style={styles.filterLabel}>Category</label>
          <select
            value={filters.category}
            onChange={(e) => onFilterChange('category', e.target.value)}
            style={styles.select}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Min Amount */}
        <div>
          <label style={styles.filterLabel}>Min Amount</label>
          <input
            type="number"
            value={filters.minAmount}
            onChange={(e) => onFilterChange('minAmount', e.target.value)}
            placeholder="Min"
            step="0.01"
            style={styles.input}
          />
        </div>

        {/* Max Amount */}
        <div>
          <label style={styles.filterLabel}>Max Amount</label>
          <input
            type="number"
            value={filters.maxAmount}
            onChange={(e) => onFilterChange('maxAmount', e.target.value)}
            placeholder="Max"
            step="0.01"
            style={styles.input}
          />
        </div>
      </div>

      {/* Info Message */}
      {hasUnappliedFilters && (
        <div style={styles.warningBanner}>
          <p style={styles.warningText}>
            You have unsaved filter changes. Click the <strong>"Search"</strong> button above to apply them.
          </p>
        </div>
      )}

      {/* Quick Tips */}
      <div style={styles.tipsBanner}>
        <p style={styles.tipsTitle}>
          <strong>Reconciliation Tips:</strong>
        </p>
        <ul style={styles.tipsList}>
          <li>Use <strong>Account Type</strong> to view all Bank or Person transactions</li>
          <li>Use <strong>Specific Account</strong> to reconcile a particular account statement</li>
          <li>Combine with <strong>Date Range</strong> to match your bank statement period</li>
          <li>The account filter shows transactions where the account is either sender or receiver</li>
        </ul>
      </div>
    </div>
  );
};

// ============================================
// STYLES - Glassmorphism Design
// ============================================
const styles = {
  container: {
    ...MIXINS.glassmorphicCard,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.xl,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    margin: 0,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    marginTop: SPACING.xs,
    marginBottom: 0,
  },
  headerButtons: {
    display: 'flex',
    gap: SPACING.sm,
  },
  reconciliationSection: {
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(251, 191, 36, 0.4)',
    backdropFilter: 'blur(8px)',
  },
  reconciliationTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FCD34D',
    marginTop: 0,
    marginBottom: SPACING.lg,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  reconciliationLabel: {
    display: 'block',
    marginBottom: SPACING.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#FDE68A',
    fontSize: FONT_SIZES.sm,
  },
  reconciliationSelect: {
    width: '100%',
    padding: SPACING.md,
    border: '1px solid rgba(251, 191, 36, 0.5)',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: COLORS.text.white,
    transition: `all ${TRANSITIONS.normal}`,
  },
  reconciliationHint: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(253, 230, 138, 0.8)',
    marginTop: SPACING.xs,
    marginBottom: 0,
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: SPACING.lg,
  },
  standardFilterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  filterLabel: {
    display: 'block',
    marginBottom: SPACING.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
  },
  input: {
    width: '100%',
    padding: SPACING.md,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    transition: `all ${TRANSITIONS.normal}`,
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: SPACING.md,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    transition: `all ${TRANSITIONS.normal}`,
    outline: 'none',
  },
  warningBanner: {
    padding: SPACING.md,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(251, 191, 36, 0.5)',
    marginTop: SPACING.lg,
  },
  warningText: {
    fontSize: FONT_SIZES.sm,
    color: '#FDE68A',
    margin: 0,
  },
  tipsBanner: {
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  tipsTitle: {
    fontSize: FONT_SIZES.sm,
    color: '#93C5FD',
    margin: 0,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  tipsList: {
    fontSize: FONT_SIZES.sm,
    color: '#BFDBFE',
    marginTop: SPACING.sm,
    marginBottom: 0,
    paddingLeft: SPACING.xl,
  },
};

export default TransactionFilters;
