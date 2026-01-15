// ============================================
// CLASS FILTER - Class Dropdown Component
// ============================================

import React, { useState, useEffect } from 'react';
import { useClasses } from '../../../hooks/useClasses';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../../utils/designConstants';

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
    padding: SPACING.sm,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    cursor: disabled || !schoolId ? 'not-allowed' : 'pointer',
    transition: `border-color ${TRANSITIONS.normal} ease`,
    opacity: disabled || !schoolId ? 0.6 : 1,
  };

  const optionStyle = {
    backgroundColor: '#1e1e2e',
    color: '#ffffff',
    padding: SPACING.sm,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: SPACING.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
  };

  if (!schoolId) {
    return (
      <div className={className}>
        {label && (
          <label style={labelStyle}>
            {label} {required && <span style={{ color: COLORS.status.error }}>*</span>}
          </label>
        )}
        <select style={selectStyle} disabled>
          <option style={optionStyle}>Select a school first</option>
        </select>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={className}>
        {label && (
          <label style={labelStyle}>
            {label} {required && <span style={{ color: COLORS.status.error }}>*</span>}
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
          <label style={labelStyle}>
            {label} {required && <span style={{ color: COLORS.status.error }}>*</span>}
          </label>
        )}
        <p style={{ color: COLORS.status.error, fontSize: FONT_SIZES.sm }}>Error loading classes</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor="class-filter" style={labelStyle}>
          {label} {required && <span style={{ color: COLORS.status.error }}>*</span>}
        </label>
      )}
      <select
        id="class-filter"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        style={selectStyle}
        onFocus={(e) => { e.target.style.borderColor = COLORS.primary; e.target.style.boxShadow = '0 0 0 3px rgba(176, 97, 206, 0.3)'; }}
        onBlur={(e) => { e.target.style.borderColor = COLORS.border.whiteTransparent; e.target.style.boxShadow = 'none'; }}
        required={required}
      >
        <option value="" style={optionStyle}>{placeholder}</option>
        {showAllOption && <option value="all" style={optionStyle}>All Classes</option>}
        {classes.map((cls) => (
          <option key={cls} value={cls} style={optionStyle}>
            {cls}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ClassFilter;
