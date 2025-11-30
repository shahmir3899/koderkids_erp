// ============================================
// SCHOOL FILTER - School Dropdown Component
// ============================================

import React from 'react';
import { useSchools } from '../../../hooks/useSchools';
import { LoadingSpinner } from '../ui/LoadingSpinner';

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
    padding: '0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    backgroundColor: disabled ? '#F3F4F6' : '#FFFFFF',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'border-color 0.2s ease',
  };

  if (loading) {
    return (
      <div className={className}>
        {label && (
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
            {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
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
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
            {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
          </label>
        )}
        <p style={{ color: '#EF4444', fontSize: '0.875rem' }}>Error loading schools</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label 
          htmlFor="school-filter" 
          style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}
        >
          {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
      )}
      <select
        id="school-filter"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        style={selectStyle}
        onFocus={(e) => { e.target.style.borderColor = '#3B82F6'; }}
        onBlur={(e) => { e.target.style.borderColor = '#D1D5DB'; }}
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