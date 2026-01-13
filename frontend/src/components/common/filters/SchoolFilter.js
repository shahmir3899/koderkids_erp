// ============================================
// SCHOOL FILTER - School Dropdown Component
// ============================================

import React from 'react';
import { useSchools } from '../../../hooks/useSchools';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
} from '../../../utils/designConstants';

/**
 * SchoolFilter Component
 * @param {Object} props
 * @param {string|number} props.value - Selected school ID
 * @param {Function} props.onChange - Change handler (receives schoolId)
 * @param {boolean} props.disabled - Disable dropdown (default: false)
 * @param {string} props.placeholder - Placeholder text (default: 'Select School')
 * @param {boolean} props.showAllOption - Show "All Schools" option (default: false)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.label - Label text (optional)
 * @param {boolean} props.required - Mark as required (default: false)
 */
export const SchoolFilter = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select School',
  showAllOption = false,
  className = '',
  label = '',
  required = false,
}) => {
  const { schools, loading, error } = useSchools();

  const handleChange = (e) => {
    const selectedId = e.target.value;
    onChange(selectedId);
  };

  const selectStyle = {
    width: '100%',
    padding: SPACING.sm,
    border: `1px solid ${COLORS.border.light}`,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.lg,
    backgroundColor: disabled ? COLORS.background.offWhite : COLORS.background.white,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: `border-color ${TRANSITIONS.normal} ease`,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: SPACING.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.primary,
  };

  if (loading) {
    return (
      <div className={className}>
        {label && (
          <label style={labelStyle}>
            {label} {required && <span style={{ color: COLORS.status.error }}>*</span>}
          </label>
        )}
        <LoadingSpinner size="small" message="Loading schools..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        {label && (
          <label style={labelStyle}>
            {label} {required && <span style={{ color: COLORS.status.error }}>*</span>}
          </label>
        )}
        <p style={{ color: COLORS.status.error, fontSize: FONT_SIZES.sm }}>Error loading schools</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor="school-filter" style={labelStyle}>
          {label} {required && <span style={{ color: COLORS.status.error }}>*</span>}
        </label>
      )}
      <select
        id="school-filter"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        style={selectStyle}
        onFocus={(e) => { e.target.style.borderColor = COLORS.status.info; }}
        onBlur={(e) => { e.target.style.borderColor = COLORS.border.light; }}
        required={required}
      >
        <option value="">{placeholder}</option>
        {showAllOption && <option value="all">All Schools</option>}
        {schools.map((school) => (
          <option key={school.id} value={school.id}>
            {school.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SchoolFilter;
