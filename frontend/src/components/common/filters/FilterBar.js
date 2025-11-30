// ============================================
// FILTER BAR - Extended with Date Support
// ============================================
// Location: src/components/common/filters/FilterBar.js
//
// EXTENDED:
// - Added showDate prop for single date picker
// - Added showDateRange prop for date range
// - Added maxDate prop to prevent future dates
// - Date is returned in YYYY-MM-DD format

import React, { useState, useEffect, useMemo } from 'react';
import { SchoolFilter } from './SchoolFilter';
import { ClassFilter } from './ClassFilter';
import { MonthFilter } from './MonthFilter';
import { Button } from '../ui/Button';
import moment from 'moment';

/**
 * FilterBar Component - Combines School, Class, Month, Date filters with optional search
 * @param {Object} props
 * @param {Function} props.onFilter - Callback when filters are applied
 * @param {boolean} props.showSchool - Show school filter (default: true)
 * @param {boolean} props.showClass - Show class filter (default: true)
 * @param {boolean} props.showMonth - Show month filter (default: false)
 * @param {boolean} props.showDate - Show single date picker (default: false) - NEW
 * @param {boolean} props.showDateRange - Show date range pickers (default: false) - NEW
 * @param {boolean} props.showSearch - Show search input (default: false)
 * @param {string} props.searchPlaceholder - Search input placeholder
 * @param {boolean} props.autoSubmit - Auto-submit on filter change (default: false)
 * @param {string} props.submitButtonText - Submit button text
 * @param {Function} props.onReset - Optional reset callback
 * @param {boolean} props.showResetButton - Show reset button (default: true)
 * @param {boolean} props.preventFutureDates - Prevent selecting future dates (default: true) - NEW
 * @param {React.ReactNode} props.additionalActions - Additional action buttons/elements
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.initialValues - Initial filter values
 */
export const FilterBar = ({
  onFilter,
  showSchool = true,
  showClass = true,
  showMonth = false,
  showDate = false,
  showDateRange = false,
  showSearch = false,
  searchPlaceholder = 'Search...',
  autoSubmit = false,
  submitButtonText = 'Apply Filters',
  onReset = null,
  showResetButton = true,
  preventFutureDates = true,
  additionalActions = null,
  className = '',
  initialValues = {},
}) => {
  // State
  const [schoolId, setSchoolId] = useState(initialValues.schoolId || '');
  const [selectedClass, setSelectedClass] = useState(initialValues.className || '');
  const [selectedMonth, setSelectedMonth] = useState(
    initialValues.month || moment().format('YYYY-MM')
  );
  const [selectedDate, setSelectedDate] = useState(
    initialValues.date || moment().format('YYYY-MM-DD')
  );
  const [startDate, setStartDate] = useState(initialValues.startDate || '');
  const [endDate, setEndDate] = useState(initialValues.endDate || '');
  const [searchTerm, setSearchTerm] = useState(initialValues.searchTerm || '');

  // Today's date for max date validation
  const today = useMemo(() => moment().format('YYYY-MM-DD'), []);

  // Auto-submit when filters change (excluding search term)
  useEffect(() => {
    if (autoSubmit) {
      handleApplyFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, selectedClass, selectedMonth, selectedDate, startDate, endDate, autoSubmit]);

  const handleApplyFilters = () => {
    if (onFilter) {
      onFilter({
        schoolId,
        className: selectedClass,
        month: selectedMonth,
        date: selectedDate,
        startDate,
        endDate,
        searchTerm,
      });
    }
  };

  const handleReset = () => {
    setSchoolId('');
    setSelectedClass('');
    setSelectedMonth(moment().format('YYYY-MM'));
    setSelectedDate(moment().format('YYYY-MM-DD'));
    setStartDate('');
    setEndDate('');
    setSearchTerm('');

    if (onReset) {
      onReset();
    }

    if (autoSubmit && onFilter) {
      onFilter({
        schoolId: '',
        className: '',
        month: moment().format('YYYY-MM'),
        date: moment().format('YYYY-MM-DD'),
        startDate: '',
        endDate: '',
        searchTerm: '',
      });
    }
  };

  // Styles
  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    padding: '1.25rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '0.75rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '1.5rem',
    alignItems: 'end',
  };

  const buttonContainerStyle = {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  };

  const inputContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  };

  const labelStyle = {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    color: '#374151',
    backgroundColor: '#FFFFFF',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = '#3B82F6';
    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
    e.target.style.outline = 'none';
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = '#D1D5DB';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={containerStyle} className={className}>
      {/* Search Input */}
      {showSearch && (
        <div style={inputContainerStyle}>
          <label style={labelStyle}>Search</label>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={inputStyle}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>
      )}

      {/* Single Date Picker - NEW */}
      {showDate && (
        <div style={inputContainerStyle}>
          <label style={labelStyle}>📅 Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={preventFutureDates ? today : undefined}
            style={inputStyle}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>
      )}

      {/* Date Range - NEW */}
      {showDateRange && (
        <>
          <div style={inputContainerStyle}>
            <label style={labelStyle}>📅 Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={preventFutureDates ? today : undefined}
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>
          <div style={inputContainerStyle}>
            <label style={labelStyle}>📅 End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              max={preventFutureDates ? today : undefined}
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>
        </>
      )}

      {/* School Filter */}
      {showSchool && (
        <SchoolFilter
          value={schoolId}
          onChange={(id) => {
            setSchoolId(id);
            setSelectedClass(''); // Reset class when school changes
          }}
          label="🏫 School"
          required
        />
      )}

      {/* Class Filter */}
      {showClass && (
        <ClassFilter
          schoolId={schoolId}
          value={selectedClass}
          onChange={setSelectedClass}
          label="📚 Class"
          required={showSchool}
        />
      )}

      {/* Month Filter */}
      {showMonth && (
        <MonthFilter
          value={selectedMonth}
          onChange={setSelectedMonth}
          label="📆 Month"
          defaultToCurrent
        />
      )}

      {/* Buttons */}
      {!autoSubmit && (
        <div style={buttonContainerStyle}>
          <Button onClick={handleApplyFilters} variant="primary">
            {submitButtonText}
          </Button>
          {showResetButton && (
            <Button onClick={handleReset} variant="secondary">
              Reset
            </Button>
          )}
          {additionalActions && additionalActions}
        </div>
      )}
    </div>
  );
};

export default FilterBar;