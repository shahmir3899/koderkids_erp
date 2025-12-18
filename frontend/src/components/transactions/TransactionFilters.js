// ============================================
// TRANSACTION FILTERS COMPONENT - Enhanced for Reconciliation
// ============================================
// Location: src/components/transactions/TransactionFilters.js
//
// NEW FEATURES:
// 1. ✅ Account-based filtering for reconciliation
// 2. ✅ Account type filtering (Bank/Person)
// 3. ✅ Search button - filters only apply when clicked
// 4. ✅ Visual indicator for unapplied changes

import React from 'react';
import { Button } from '../common/ui/Button';

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
}) => {
  const hasActiveFilters = Object.values(filters).some((value) => value !== '');

  return (
    <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px' }}>
      {/* Header with Search Button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #E5E7EB'
      }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1F2937', margin: 0 }}>
            Filter Transactions
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.25rem', marginBottom: 0 }}>
            Configure filters and click "Search" to apply
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {hasActiveFilters && (
            <Button onClick={onClearFilters} variant="secondary" size="small">
              🔄 Clear All
            </Button>
          )}
          <Button 
            onClick={onApplyFilters} 
            variant="primary"
            style={{
              position: 'relative',
              backgroundColor: hasUnappliedFilters ? '#F59E0B' : '#1E40AF',
            }}
          >
            {hasUnappliedFilters ? '⚠️ Search (Changes Not Applied)' : '🔍 Search'}
          </Button>
        </div>
      </div>

      {/* ============================================ */}
      {/* RECONCILIATION SECTION */}
      {/* ============================================ */}
      <div style={{ 
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: '#FEF3C7',
        borderRadius: '8px',
        border: '2px solid #FCD34D'
      }}>
        <h4 style={{ 
          fontSize: '1rem', 
          fontWeight: 'bold', 
          color: '#92400E',
          marginTop: 0,
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          🏦 Reconciliation Filters
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
        }}>
          {/* Account Type Filter */}
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#78350F',
                fontSize: '0.875rem',
              }}
            >
              Account Type
            </label>
            <select
              value={filters.accountType}
              onChange={(e) => onFilterChange('accountType', e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #FCD34D',
                borderRadius: '8px',
                fontSize: '0.875rem',
                backgroundColor: 'white',
              }}
            >
              <option value="">All Account Types</option>
              <option value="Bank">🏦 Bank Accounts ({accountsByType.bank.length})</option>
              <option value="Person">👤 Person Accounts ({accountsByType.person.length})</option>
            </select>
            <p style={{ fontSize: '0.75rem', color: '#78350F', marginTop: '0.25rem', marginBottom: 0 }}>
              Filter by type to reconcile banks or track person transactions
            </p>
          </div>

          {/* Specific Account Filter */}
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#78350F',
                fontSize: '0.875rem',
              }}
            >
              Specific Account
            </label>
            <select
              value={filters.account}
              onChange={(e) => onFilterChange('account', e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #FCD34D',
                borderRadius: '8px',
                fontSize: '0.875rem',
                backgroundColor: 'white',
              }}
            >
              <option value="">All Accounts</option>
              
              {/* Bank Accounts Group */}
              {accountsByType.bank.length > 0 && (
                <optgroup label="🏦 Bank Accounts">
                  {accountsByType.bank.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} (PKR {acc.current_balance?.toLocaleString() || 0})
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Person Accounts Group */}
              {accountsByType.person.length > 0 && (
                <optgroup label="👤 Person Accounts">
                  {accountsByType.person.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} (PKR {acc.current_balance?.toLocaleString() || 0})
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Other Accounts Group */}
              {accountsByType.other.length > 0 && (
                <optgroup label="📁 Other Accounts">
                  {accountsByType.other.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} (PKR {acc.current_balance?.toLocaleString() || 0})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <p style={{ fontSize: '0.75rem', color: '#78350F', marginTop: '0.25rem', marginBottom: 0 }}>
              Shows transactions where this account is either sender or receiver
            </p>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* STANDARD FILTERS */}
      {/* ============================================ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        {/* Search */}
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem',
            }}
          >
            Search
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="Search category, notes, accounts..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}
          />
        </div>

        {/* Date From */}
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem',
            }}
          >
            Date From
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange('dateFrom', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}
          />
        </div>

        {/* Date To */}
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem',
            }}
          >
            Date To
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange('dateTo', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}
          />
        </div>

        {/* School Filter */}
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem',
            }}
          >
            School
          </label>
          <select
            value={filters.school}
            onChange={(e) => onFilterChange('school', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}
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
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem',
            }}
          >
            Category
          </label>
          <select
            value={filters.category}
            onChange={(e) => onFilterChange('category', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}
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
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem',
            }}
          >
            Min Amount
          </label>
          <input
            type="number"
            value={filters.minAmount}
            onChange={(e) => onFilterChange('minAmount', e.target.value)}
            placeholder="Min"
            step="0.01"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}
          />
        </div>

        {/* Max Amount */}
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem',
            }}
          >
            Max Amount
          </label>
          <input
            type="number"
            value={filters.maxAmount}
            onChange={(e) => onFilterChange('maxAmount', e.target.value)}
            placeholder="Max"
            step="0.01"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}
          />
        </div>
      </div>

      {/* Info Message */}
      {hasUnappliedFilters && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#FEF3C7',
          borderRadius: '8px',
          border: '1px solid #FCD34D',
          marginTop: '1rem'
        }}>
          <p style={{ fontSize: '0.875rem', color: '#92400E', margin: 0 }}>
            ⚠️ You have unsaved filter changes. Click the <strong>"Search"</strong> button above to apply them.
          </p>
        </div>
      )}

      {/* Quick Tips */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        backgroundColor: '#EFF6FF',
        borderRadius: '8px',
        border: '1px solid #BFDBFE'
      }}>
        <p style={{ fontSize: '0.875rem', color: '#1E40AF', margin: 0, fontWeight: '600' }}>
          💡 <strong>Reconciliation Tips:</strong>
        </p>
        <ul style={{ fontSize: '0.875rem', color: '#1E40AF', marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
          <li>Use <strong>Account Type</strong> to view all Bank or Person transactions</li>
          <li>Use <strong>Specific Account</strong> to reconcile a particular account statement</li>
          <li>Combine with <strong>Date Range</strong> to match your bank statement period</li>
          <li>The account filter shows transactions where the account is either sender or receiver</li>
        </ul>
      </div>
    </div>
  );
};