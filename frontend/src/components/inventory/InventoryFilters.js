// ============================================
// INVENTORY FILTERS - With RBAC Support
// ============================================
// Location: src/components/inventory/InventoryFilters.js
//
// Filter section with role-based options:
// - Admin: All locations, all schools
// - Teacher: Only School location, only assigned schools

import React from 'react';
import { CollapsibleSection } from '../common/cards/CollapsibleSection';
import { STATUS_OPTIONS } from '../../hooks/useInventory';

// ============================================
// STYLES
// ============================================

const filterContainerStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '1rem',
  alignItems: 'end',
};

const labelStyle = {
  display: 'block',
  marginBottom: '0.375rem',
  fontWeight: '500',
  color: '#374151',
  fontSize: '0.8125rem',
};

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #D1D5DB',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  backgroundColor: '#FFFFFF',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  boxSizing: 'border-box',
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.5rem center',
  backgroundSize: '1.25rem',
  paddingRight: '2.5rem',
};

// ============================================
// COMPONENT
// ============================================

export const InventoryFilters = ({
  userContext,
  filters,
  updateFilter,
  resetFilters,
  hasActiveFilters,
  locationOptions,
  schools,
  categories,
}) => {
  const { isAdmin } = userContext;

  // School dropdown is enabled when:
  // - Admin: location is 'School' or empty (showing all)
  // - Teacher: always enabled (they only see School items)
  const schoolDropdownEnabled = isAdmin 
    ? (filters.location === 'School' || filters.location === '')
    : true;

  return (
    <CollapsibleSection 
      title="🔍 Filter Options" 
      defaultOpen={true}
      style={{ marginBottom: '1.5rem' }}
    >
      <div style={filterContainerStyle}>
        {/* Search */}
        <div>
          <label style={labelStyle}>🔎 Search</label>
          <input
            type="text"
            placeholder="Search by name, ID..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Location - Admin sees all options, Teacher sees only School */}
        <div>
          <label style={labelStyle}>📍 Location</label>
          <select
            value={filters.location}
            onChange={(e) => updateFilter('location', e.target.value)}
            style={selectStyle}
          >
            {locationOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* School - Filtered by role */}
        <div>
          <label style={labelStyle}>🏫 School</label>
          <select
            value={filters.schoolId}
            onChange={(e) => updateFilter('schoolId', e.target.value)}
            disabled={!schoolDropdownEnabled}
            style={{
              ...selectStyle,
              opacity: schoolDropdownEnabled ? 1 : 0.5,
              cursor: schoolDropdownEnabled ? 'pointer' : 'not-allowed',
            }}
          >
            <option value="">
              {isAdmin ? 'All Schools' : 'All My Schools'}
            </option>
            {schools.map(school => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
          {!isAdmin && schools.length === 0 && (
            <p style={{ fontSize: '0.75rem', color: '#EF4444', margin: '0.25rem 0 0' }}>
              No schools assigned
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label style={labelStyle}>📁 Category</label>
          <select
            value={filters.categoryId}
            onChange={(e) => updateFilter('categoryId', e.target.value)}
            style={selectStyle}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label style={labelStyle}>📊 Status</label>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            style={selectStyle}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Button */}
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            style={{
              width: '100%',
              padding: '0.5rem 1rem',
              backgroundColor: hasActiveFilters ? '#EF4444' : '#E5E7EB',
              color: hasActiveFilters ? 'white' : '#9CA3AF',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: hasActiveFilters ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
            }}
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          backgroundColor: '#EFF6FF',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '0.8125rem', color: '#1E40AF', fontWeight: '500' }}>
            Active Filters:
          </span>
          
          {filters.search && (
            <FilterBadge label={`Search: "${filters.search}"`} />
          )}
          {filters.location && (
            <FilterBadge label={`Location: ${filters.location}`} />
          )}
          {filters.schoolId && (
            <FilterBadge 
              label={`School: ${schools.find(s => s.id == filters.schoolId)?.name || filters.schoolId}`} 
            />
          )}
          {filters.categoryId && (
            <FilterBadge 
              label={`Category: ${categories.find(c => c.id == filters.categoryId)?.name || filters.categoryId}`} 
            />
          )}
          {filters.status && (
            <FilterBadge label={`Status: ${filters.status}`} />
          )}
        </div>
      )}

      {/* Role indicator for teachers */}
      {!isAdmin && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.5rem 0.75rem',
          backgroundColor: '#FEF3C7',
          borderRadius: '0.375rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1rem' }}>ℹ️</span>
          <span style={{ fontSize: '0.8125rem', color: '#92400E' }}>
            You are viewing inventory from your {schools.length} assigned school{schools.length !== 1 ? 's' : ''} only.
          </span>
        </div>
      )}
    </CollapsibleSection>
  );
};

// ============================================
// HELPER COMPONENTS
// ============================================

const FilterBadge = ({ label }) => (
  <span style={{
    padding: '0.25rem 0.625rem',
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
  }}>
    {label}
  </span>
);

export default InventoryFilters;