// ============================================
// INVENTORY FILTERS - Glassmorphism Design
// ============================================
// Location: src/components/inventory/InventoryFilters.js
//
// Filter section with role-based options:
// - Admin: All locations, all schools
// - Teacher: Only School location, only assigned schools

import React from 'react';
import { CollapsibleSection } from '../common/cards/CollapsibleSection';
import { STATUS_OPTIONS } from '../../hooks/useInventory';

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

// ============================================
// STYLES - Glassmorphism Design
// ============================================

const filterContainerStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: SPACING.lg,
  alignItems: 'end',
};

const labelStyle = {
  display: 'block',
  marginBottom: SPACING.sm,
  fontWeight: FONT_WEIGHTS.semibold,
  color: COLORS.text.white,
  fontSize: FONT_SIZES.sm,
};

const inputStyle = {
  width: '100%',
  padding: SPACING.md,
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: BORDER_RADIUS.md,
  fontSize: FONT_SIZES.sm,
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  color: COLORS.text.white,
  transition: `all ${TRANSITIONS.normal}`,
  boxSizing: 'border-box',
  outline: 'none',
};

const selectStyle = {
  ...inputStyle,
  ...MIXINS.glassmorphicSelect,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23FFFFFF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.5rem center',
  backgroundSize: '1.25rem',
  paddingRight: '2.5rem',
};

// Style for dropdown options (readable on native dropdown)
const optionStyle = {
  ...MIXINS.selectOption,
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
              <option key={opt.value} value={opt.value} style={optionStyle}>
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
            <option value="" style={optionStyle}>
              {isAdmin ? 'All Schools' : 'All My Schools'}
            </option>
            {schools.map(school => (
              <option key={school.id} value={school.id} style={optionStyle}>
                {school.name}
              </option>
            ))}
          </select>
          {!isAdmin && schools.length === 0 && (
            <p style={{ fontSize: FONT_SIZES.xs, color: '#FCA5A5', margin: `${SPACING.xs} 0 0` }}>
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
            <option value="" style={optionStyle}>All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id} style={optionStyle}>
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
              <option key={opt.value} value={opt.value} style={optionStyle}>
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
              padding: SPACING.md,
              backgroundColor: hasActiveFilters ? COLORS.status.error : 'rgba(255, 255, 255, 0.1)',
              color: hasActiveFilters ? COLORS.text.white : COLORS.text.whiteSubtle,
              border: hasActiveFilters ? 'none' : `1px solid ${COLORS.border.whiteTransparent}`,
              borderRadius: BORDER_RADIUS.md,
              fontSize: FONT_SIZES.sm,
              fontWeight: FONT_WEIGHTS.medium,
              cursor: hasActiveFilters ? 'pointer' : 'not-allowed',
              transition: `all ${TRANSITIONS.normal}`,
            }}
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div style={{
          marginTop: SPACING.lg,
          padding: SPACING.md,
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          borderRadius: BORDER_RADIUS.md,
          border: '1px solid rgba(59, 130, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.sm,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: FONT_SIZES.sm, color: '#93C5FD', fontWeight: FONT_WEIGHTS.medium }}>
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
          marginTop: SPACING.md,
          padding: SPACING.md,
          backgroundColor: 'rgba(251, 191, 36, 0.15)',
          borderRadius: BORDER_RADIUS.md,
          border: '1px solid rgba(251, 191, 36, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.sm,
        }}>
          <span style={{ fontSize: '1rem' }}>ℹ️</span>
          <span style={{ fontSize: FONT_SIZES.sm, color: '#FDE68A' }}>
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
    padding: `${SPACING.xs} ${SPACING.md}`,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    color: '#BFDBFE',
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    border: '1px solid rgba(59, 130, 246, 0.3)',
  }}>
    {label}
  </span>
);

export default InventoryFilters;