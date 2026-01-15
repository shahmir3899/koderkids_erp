/**
 * FeeFilters Component
 * Path: frontend/src/components/fees/FeeFilters.js
 * Glassmorphism Design System
 */

import React, { useCallback } from 'react';
import DatePicker from 'react-datepicker';
import debounce from 'lodash/debounce';
import 'react-datepicker/dist/react-datepicker.css';

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

// Responsive Hook
import { useResponsive } from '../../hooks/useResponsive';

const FeeFilters = ({
  schools,
  classes,
  filters,
  onFilterChange,
  onExportPDF,
  loading,
  hasData,
}) => {
  const { isMobile } = useResponsive();

  const debouncedSearch = useCallback(
    debounce((value) => {
      onFilterChange({ searchTerm: value });
    }, 300),
    [onFilterChange]
  );

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const styles = {
    container: {
      ...MIXINS.glassmorphicCard,
      padding: isMobile ? SPACING.md : SPACING.lg,
      borderRadius: BORDER_RADIUS.xl,
      marginBottom: SPACING.lg,
      position: 'relative',
      zIndex: 5,
    },
    formGrid: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: SPACING.md,
      alignItems: 'flex-end',
    },
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column',
      flex: isMobile ? '1 1 100%' : '0 0 auto',
      minWidth: isMobile ? '100%' : '150px',
    },
    fieldGroupExpand: {
      display: 'flex',
      flexDirection: 'column',
      flex: isMobile ? '1 1 100%' : '1 1 200px',
      minWidth: isMobile ? '100%' : '200px',
    },
    label: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.text.whiteMedium,
      marginBottom: SPACING.xs,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    select: {
      padding: `${SPACING.sm} ${SPACING.md}`,
      ...MIXINS.glassmorphicSelect,
      borderRadius: BORDER_RADIUS.lg,
      color: COLORS.text.white,
      fontSize: FONT_SIZES.base,
      outline: 'none',
      cursor: 'pointer',
      transition: `all ${TRANSITIONS.normal}`,
      width: '100%',
    },
    option: {
      ...MIXINS.selectOption,
    },
    input: {
      padding: `${SPACING.sm} ${SPACING.md}`,
      borderRadius: BORDER_RADIUS.lg,
      border: `1px solid ${COLORS.border.whiteTransparent}`,
      background: 'rgba(255, 255, 255, 0.1)',
      color: COLORS.text.white,
      fontSize: FONT_SIZES.base,
      outline: 'none',
      transition: `all ${TRANSITIONS.normal}`,
      width: '100%',
    },
    exportButton: {
      padding: `${SPACING.sm} ${SPACING.lg}`,
      borderRadius: BORDER_RADIUS.lg,
      border: 'none',
      background: COLORS.status.success,
      color: COLORS.text.white,
      fontSize: FONT_SIZES.base,
      fontWeight: FONT_WEIGHTS.medium,
      cursor: 'pointer',
      transition: `all ${TRANSITIONS.normal}`,
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.sm,
      whiteSpace: 'nowrap',
    },
    exportButtonDisabled: {
      background: 'rgba(255, 255, 255, 0.2)',
      cursor: 'not-allowed',
    },
  };

  const isExportDisabled = loading || !hasData;

  return (
    <div style={styles.container}>
      <style>
        {`
          .fee-filter-select option {
            background: #1a1a2e;
            color: white;
          }
          .fee-filter-datepicker {
            background: rgba(255, 255, 255, 0.1) !important;
            color: white !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            border-radius: 12px !important;
            width: 100% !important;
            padding: 8px 12px !important;
          }
          .fee-filter-datepicker::placeholder {
            color: rgba(255, 255, 255, 0.5) !important;
          }
          .fee-filter-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
          .react-datepicker-wrapper {
            width: 100%;
          }
          .react-datepicker-popper {
            z-index: 99999 !important;
          }
          .react-datepicker {
            background: #1a1a2e !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            border-radius: 12px !important;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
          }
          .react-datepicker__header {
            background: rgba(255, 255, 255, 0.1) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          }
          .react-datepicker__current-month,
          .react-datepicker__day-name,
          .react-datepicker-year-header {
            color: white !important;
          }
          .react-datepicker__month-text,
          .react-datepicker__day {
            color: rgba(255, 255, 255, 0.8) !important;
          }
          .react-datepicker__month-text:hover,
          .react-datepicker__day:hover {
            background: rgba(99, 102, 241, 0.5) !important;
            color: white !important;
          }
          .react-datepicker__month-text--selected,
          .react-datepicker__day--selected {
            background: #6366F1 !important;
            color: white !important;
          }
          .react-datepicker__navigation-icon::before {
            border-color: white !important;
          }
        `}
      </style>

      <div style={styles.formGrid}>
        {/* School Filter */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>School</label>
          <select
            value={filters.schoolId}
            onChange={(e) => onFilterChange({ schoolId: e.target.value })}
            style={styles.select}
            className="fee-filter-select"
          >
            <option value="" style={styles.option}>All Schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id} style={styles.option}>
                {school.name}
              </option>
            ))}
          </select>
        </div>

        {/* Class Filter */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Class</label>
          <select
            value={filters.studentClass}
            onChange={(e) => onFilterChange({ studentClass: e.target.value })}
            style={styles.select}
            className="fee-filter-select"
          >
            <option value="" style={styles.option}>All Classes</option>
            {classes.map((cls, index) => (
              <option key={index} value={cls} style={styles.option}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Month</label>
          <DatePicker
            selected={filters.month}
            onChange={(date) => onFilterChange({ month: date })}
            dateFormat="MMM-yyyy"
            showMonthYearPicker
            placeholderText="Select Month"
            className="fee-filter-datepicker"
          />
        </div>

        {/* Search Input */}
        <div style={styles.fieldGroupExpand}>
          <label style={styles.label}>Search</label>
          <input
            type="text"
            onChange={handleSearchChange}
            placeholder="Search by student name..."
            style={styles.input}
            className="fee-filter-input"
          />
        </div>

        {/* Export Button */}
        <button
          onClick={onExportPDF}
          disabled={isExportDisabled}
          style={{
            ...styles.exportButton,
            ...(isExportDisabled ? styles.exportButtonDisabled : {}),
          }}
        >
          <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export PDF
        </button>
      </div>
    </div>
  );
};

export default FeeFilters;
