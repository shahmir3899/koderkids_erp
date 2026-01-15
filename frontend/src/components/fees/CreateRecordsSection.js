/**
 * CreateRecordsSection Component
 * Path: frontend/src/components/fees/CreateRecordsSection.js
 * Glassmorphism Design System
 */

import React from 'react';
import DatePicker from 'react-datepicker';
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

const CreateRecordsSection = ({
  schools,
  selectedSchoolId,
  onSchoolChange,
  selectedMonth,
  onMonthChange,
  onCreateMonthly,
  onOpenSingleFeeModal,
  loading,
  loadingStudents,
  successMessage,
}) => {
  const { isMobile } = useResponsive();

  const styles = {
    container: {
      ...MIXINS.glassmorphicCard,
      padding: isMobile ? SPACING.md : SPACING.lg,
      borderRadius: BORDER_RADIUS.xl,
      marginBottom: SPACING.lg,
      position: 'relative',
      zIndex: 10,
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    title: {
      fontSize: FONT_SIZES.lg,
      fontWeight: FONT_WEIGHTS.semibold,
      color: COLORS.text.white,
      margin: 0,
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
      minWidth: isMobile ? '100%' : 'auto',
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
      borderRadius: BORDER_RADIUS.lg,
      border: `1px solid ${COLORS.border.whiteTransparent}`,
      background: 'rgba(255, 255, 255, 0.1)',
      color: COLORS.text.white,
      fontSize: FONT_SIZES.base,
      minWidth: isMobile ? '100%' : '200px',
      outline: 'none',
      cursor: 'pointer',
      transition: `all ${TRANSITIONS.normal}`,
    },
    datePicker: {
      padding: `${SPACING.sm} ${SPACING.md}`,
      borderRadius: BORDER_RADIUS.lg,
      border: `1px solid ${COLORS.border.whiteTransparent}`,
      background: 'rgba(255, 255, 255, 0.1)',
      color: COLORS.text.white,
      fontSize: FONT_SIZES.base,
      outline: 'none',
      cursor: 'pointer',
      width: isMobile ? '100%' : '150px',
    },
    primaryButton: {
      padding: `${SPACING.sm} ${SPACING.lg}`,
      borderRadius: BORDER_RADIUS.lg,
      border: 'none',
      background: COLORS.primary,
      color: COLORS.text.white,
      fontSize: FONT_SIZES.base,
      fontWeight: FONT_WEIGHTS.medium,
      cursor: 'pointer',
      transition: `all ${TRANSITIONS.normal}`,
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.sm,
      minWidth: isMobile ? '100%' : 'auto',
      justifyContent: 'center',
    },
    primaryButtonDisabled: {
      background: 'rgba(255, 255, 255, 0.2)',
      cursor: 'not-allowed',
    },
    secondaryButton: {
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
      minWidth: isMobile ? '100%' : 'auto',
      justifyContent: 'center',
    },
    secondaryButtonDisabled: {
      background: 'rgba(255, 255, 255, 0.2)',
      cursor: 'not-allowed',
    },
    divider: {
      width: isMobile ? '100%' : '1px',
      height: isMobile ? '1px' : '40px',
      background: COLORS.border.whiteTransparent,
      margin: isMobile ? `${SPACING.sm} 0` : `0 ${SPACING.sm}`,
    },
    successMessage: {
      marginTop: SPACING.md,
      padding: `${SPACING.sm} ${SPACING.md}`,
      borderRadius: BORDER_RADIUS.lg,
      background: 'rgba(16, 185, 129, 0.2)',
      border: `1px solid ${COLORS.status.success}40`,
      color: COLORS.status.success,
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.sm,
      fontSize: FONT_SIZES.sm,
    },
    spinner: {
      width: '16px',
      height: '16px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderTopColor: COLORS.text.white,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
  };

  const isCreateDisabled = !selectedSchoolId || !selectedMonth || loading;
  const isSingleDisabled = !selectedSchoolId || loading || loadingStudents;

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .fee-select option {
            background: #1a1a2e;
            color: white;
          }
          .fee-datepicker {
            background: rgba(255, 255, 255, 0.1) !important;
            color: white !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            border-radius: 12px !important;
          }
          .fee-datepicker::placeholder {
            color: rgba(255, 255, 255, 0.5) !important;
          }
          .react-datepicker-wrapper {
            width: ${isMobile ? '100%' : 'auto'};
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

      <div style={styles.header}>
        <h2 style={styles.title}>Create Fee Records</h2>
      </div>

      <div style={styles.formGrid}>
        {/* School Selection */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>School</label>
          <select
            value={selectedSchoolId}
            onChange={(e) => onSchoolChange(e.target.value)}
            style={styles.select}
            className="fee-select"
          >
            <option value="">Select School</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>

        {/* Month Selection */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Month</label>
          <DatePicker
            selected={selectedMonth}
            onChange={onMonthChange}
            dateFormat="MMM-yyyy"
            showMonthYearPicker
            placeholderText="Select Month"
            className="fee-datepicker"
            style={styles.datePicker}
          />
        </div>

        {/* Create Monthly Button */}
        <div style={styles.fieldGroup}>
          <label style={{ ...styles.label, visibility: 'hidden' }}>Action</label>
          <button
            onClick={onCreateMonthly}
            disabled={isCreateDisabled}
            style={{
              ...styles.primaryButton,
              ...(isCreateDisabled ? styles.primaryButtonDisabled : {}),
            }}
          >
            {loading ? (
              <>
                <span style={styles.spinner} />
                Creating...
              </>
            ) : (
              'Create Monthly Records'
            )}
          </button>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Single Record Button */}
        <div style={styles.fieldGroup}>
          <label style={{ ...styles.label, visibility: 'hidden' }}>Action</label>
          <button
            onClick={onOpenSingleFeeModal}
            disabled={isSingleDisabled}
            style={{
              ...styles.secondaryButton,
              ...(isSingleDisabled ? styles.secondaryButtonDisabled : {}),
            }}
          >
            {loadingStudents ? (
              <>
                <span style={styles.spinner} />
                Loading...
              </>
            ) : (
              '+ Single Record'
            )}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div style={styles.successMessage}>
          <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default CreateRecordsSection;
