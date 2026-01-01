// ============================================
// USER FILTER BAR - Updated with Include Inactive Checkbox
// ============================================

import React, { useState } from 'react';
import { Button } from '../common/ui/Button';

/**
 * UserFilterBar Component
 * Custom filter bar for user management page
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
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
    
    console.log('🔍 Submitting filters:', filterData);
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
    
    console.log('🔄 Resetting filters');
    onFilter({
      ...resetFilters,
      is_active: 'true', // Reset to active only
    });
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <form onSubmit={handleSubmit} style={containerStyle}>
      <div style={filtersRowStyle}>
        {/* Search Input */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Search</label>
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleChange}
            placeholder="Search by username, email, or name"
            style={inputStyle}
          />
        </div>

        {/* Role Dropdown */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Role</label>
          <select
            name="role"
            value={filters.role}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {/* School Dropdown */}
        <div style={fieldStyle}>
          <label style={labelStyle}>School</label>
          <select
            name="school"
            value={filters.school}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">All Schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>

        {/* Include Inactive Checkbox */}
        <div style={checkboxFieldStyle}>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={handleCheckboxChange}
              style={checkboxStyle}
            />
            <span>Include Inactive Users</span>
          </label>
          <div style={checkboxHintStyle}>
            {includeInactive ? 'Showing all users' : 'Showing active users only'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={actionsRowStyle}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button type="submit" variant="primary">
            🔍 Search
          </Button>
          <Button type="button" variant="secondary" onClick={handleReset}>
            🔄 Reset
          </Button>
        </div>
        
        {additionalActions && (
          <div>{additionalActions}</div>
        )}
      </div>
    </form>
  );
};

// ============================================
// STYLES
// ============================================

const containerStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  padding: '1.5rem',
  marginBottom: '1.5rem',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
};

const filtersRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
  marginBottom: '1rem',
};

const actionsRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem',
  flexWrap: 'wrap',
};

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const labelStyle = {
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#374151',
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
};

const inputStyle = {
  padding: '0.625rem 0.75rem',
  border: '1px solid #D1D5DB',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  color: '#374151',
  outline: 'none',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
  backgroundColor: '#FFFFFF',
};

const checkboxFieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  justifyContent: 'center',
};

const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
  cursor: 'pointer',
  userSelect: 'none',
};

const checkboxStyle = {
  width: '1.125rem',
  height: '1.125rem',
  cursor: 'pointer',
  accentColor: '#3B82F6',
};

const checkboxHintStyle = {
  fontSize: '0.75rem',
  color: '#6B7280',
  fontStyle: 'italic',
  marginLeft: '1.625rem',
};

export default UserFilterBar;