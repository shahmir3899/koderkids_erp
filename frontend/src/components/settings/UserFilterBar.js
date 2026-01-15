// ============================================
// USER FILTER BAR - Glassmorphism Design System
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { useDebouncedCallback } from '../../hooks/useDebounce';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';

/**
 * UserFilterBar Component
 * Glassmorphic filter bar for user management page
 *
 * @param {Object} props
 * @param {Function} props.onFilter - Callback when filter button clicked
 * @param {Array} props.roles - Available roles from API
 * @param {Array} props.schools - Available schools
 * @param {React.ReactNode} props.additionalActions - Extra buttons (e.g., Add User)
 */
export const UserFilterBar = ({
  onFilter,
  roles = [],
  schools = [],
  additionalActions,
}) => {
  // ============================================
  // STATE
  // ============================================

  const [filters, setFilters] = useState({
    role: '',
    school: '',
    search: '',
  });

  const [includeInactive, setIncludeInactive] = useState(false);

  // ============================================
  // HANDLERS
  // ============================================

  // Debounced filter callback for search input (auto-search after typing stops)
  const debouncedSearch = useDebouncedCallback((searchValue) => {
    // Only auto-search if there's a search term
    if (searchValue.length >= 2) {
      console.log('Auto-searching after debounce:', searchValue);
      onFilter({
        ...filters,
        search: searchValue,
        is_active: includeInactive ? '' : 'true',
      });
    }
  }, 400);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));

    // Trigger debounced search for search input
    if (name === 'search') {
      debouncedSearch(value);
    }
  };

  const handleCheckboxChange = (e) => {
    setIncludeInactive(e.target.checked);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Build filter object
    const filterData = {
      ...filters,
      is_active: includeInactive ? '' : 'true', // Active only by default
    };

    console.log('Submitting filters:', filterData);
    onFilter(filterData);
  };

  const handleReset = () => {
    const resetFilters = {
      role: '',
      school: '',
      search: '',
    };
    setFilters(resetFilters);
    setIncludeInactive(false);

    console.log('Resetting filters');
    onFilter({
      ...resetFilters,
      is_active: 'true', // Reset to active only
    });
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <form onSubmit={handleSubmit} style={styles.container}>
      <div style={styles.filtersRow}>
        {/* Search Input */}
        <div style={styles.field}>
          <label style={styles.label}>Search</label>
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleChange}
            placeholder="Search by username, email, or name"
            style={styles.input}
          />
        </div>

        {/* Role Dropdown */}
        <div style={styles.field}>
          <label style={styles.label}>Role</label>
          <select
            name="role"
            value={filters.role}
            onChange={handleChange}
            style={styles.select}
          >
            <option value="" style={styles.option}>All Roles</option>
            {roles.map((role) => (
              <option key={role.value} value={role.value} style={styles.option}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {/* School Dropdown */}
        <div style={styles.field}>
          <label style={styles.label}>School</label>
          <select
            name="school"
            value={filters.school}
            onChange={handleChange}
            style={styles.select}
          >
            <option value="" style={styles.option}>All Schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id} style={styles.option}>
                {school.name}
              </option>
            ))}
          </select>
        </div>

        {/* Include Inactive Checkbox */}
        <div style={styles.checkboxField}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={handleCheckboxChange}
              style={styles.checkbox}
            />
            <span>Include Inactive Users</span>
          </label>
          <div style={styles.checkboxHint}>
            {includeInactive ? 'Showing all users' : 'Showing active users only'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.actionsRow}>
        <div style={styles.buttonGroup}>
          <button type="submit" style={styles.primaryButton}>
            🔍 Search
          </button>
          <button type="button" style={styles.secondaryButton} onClick={handleReset}>
            🔄 Reset
          </button>
        </div>

        {additionalActions && (
          <div>{additionalActions}</div>
        )}
      </div>
    </form>
  );
};

// ============================================
// STYLES - Glassmorphism Design System
// ============================================

const styles = {
  container: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING['2xl'],
  },

  filtersRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },

  actionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.lg,
    flexWrap: 'wrap',
  },

  buttonGroup: {
    display: 'flex',
    gap: SPACING.md,
  },

  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },

  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
  },

  input: {
    padding: `${SPACING.md} ${SPACING.lg}`,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    outline: 'none',
    transition: `all ${TRANSITIONS.normal}`,
  },

  select: {
    padding: `${SPACING.md} ${SPACING.lg}`,
    ...MIXINS.glassmorphicSelect,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    outline: 'none',
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
  },

  option: {
    ...MIXINS.selectOption,
  },

  checkboxField: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
    justifyContent: 'center',
  },

  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    cursor: 'pointer',
    userSelect: 'none',
  },

  checkbox: {
    width: '1.125rem',
    height: '1.125rem',
    cursor: 'pointer',
    accentColor: COLORS.status.info,
  },

  checkboxHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    fontStyle: 'italic',
    marginLeft: '1.625rem',
  },

  primaryButton: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.status.info,
    color: COLORS.text.white,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  secondaryButton: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
};

export default UserFilterBar;
