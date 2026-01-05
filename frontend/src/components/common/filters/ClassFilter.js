// ============================================
// CLASS FILTER - Class Dropdown Component
// ============================================

import React, { useState, useEffect } from 'react';
import { useClasses } from '../../../hooks/useClasses';
import { LoadingSpinner } from '../ui/LoadingSpinner';

/**
 * ClassFilter Component
 * @param {Object} props
 * @param {string|number} props.schoolId - School ID to fetch classes for (required)
 * @param {string} props.value - Selected class
 * @param {Function} props.onChange - Change handler (receives className)
 * @param {boolean} props.disabled - Disable dropdown (default: false)
 * @param {string} props.placeholder - Placeholder text (default: 'Select Class')
 * @param {boolean} props.showAllOption - Show "All Classes" option (default: false)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.label - Label text (optional)
 * @param {boolean} props.required - Mark as required (default: false)
 */
export const ClassFilter = ({
  schoolId,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select Class',
  showAllOption = false,
  className = '',
  label = '',
  required = false,
}) => {
  const { fetchClassesBySchool, getCachedClasses, loading: contextLoading } = useClasses();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadClasses = async () => {
      if (!schoolId) {
        setClasses([]);
        return;
      }

      // Check cache first
      const cached = getCachedClasses(schoolId);
      if (cached) {
        setClasses(cached);
        return;
      }

      // Not in cache, fetch from API
      setLoading(true);
      setError(null);

      try {
        const data = await fetchClassesBySchool(schoolId);
        setClasses(data);
      } catch (err) {
        console.error('ClassFilter: Error loading classes:', err);
        setError('Failed to load classes');
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]); // Only depend on schoolId, not the functions

  const handleChange = (e) => {
    const selectedClass = e.target.value;
    onChange(selectedClass);
  };

  const selectStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    backgroundColor: disabled || !schoolId ? '#F3F4F6' : '#FFFFFF',
    cursor: disabled || !schoolId ? 'not-allowed' : 'pointer',
    transition: 'border-color 0.2s ease',
  };

  if (!schoolId) {
    return (
      <div className={className}>
        {label && (
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
            {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
          </label>
        )}
        <select style={selectStyle} disabled>
          <option>Select a school first</option>
        </select>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={className}>
        {label && (
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
            {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
          </label>
        )}
        <LoadingSpinner size="small" message="Loading classes..." />
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
        <p style={{ color: '#EF4444', fontSize: '0.875rem' }}>Error loading classes</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label 
          htmlFor="class-filter" 
          style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}
        >
          {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
      )}
      <select
        id="class-filter"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        style={selectStyle}
        onFocus={(e) => { e.target.style.borderColor = '#3B82F6'; }}
        onBlur={(e) => { e.target.style.borderColor = '#D1D5DB'; }}
        required={required}
      >
        <option value="">{placeholder}</option>
        {showAllOption && <option value="all">All Classes</option>}
        {classes.map((cls) => (
          <option key={cls} value={cls}>
            {cls}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ClassFilter;