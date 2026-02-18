// ============================================
// VALIDATION STEPPER - 5-step progress pipeline
// ============================================
// Shows the 5-step validation pipeline at the bottom
// of BookPage. Steps: Reading → Activity → Screenshot →
// Teacher Review → Guardian Review

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookReader,
  faClipboardCheck,
  faCamera,
  faChalkboardTeacher,
  faUserShield,
  faCheck,
  faLock,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import {
  BOOK_COLORS,
  BOOK_FONTS,
  BOOK_FONT_SIZES,
  BOOK_RADIUS,
} from '../../utils/bookTheme';

const STEP_ICONS = [
  faBookReader,
  faClipboardCheck,
  faCamera,
  faChalkboardTeacher,
  faUserShield,
];

const STEP_COLORS = [
  BOOK_COLORS.reading,        // Reading - purple
  BOOK_COLORS.classActivity,  // Activity - blue
  BOOK_COLORS.homeActivity,   // Screenshot - green
  '#F59E0B',                  // Teacher - amber
  BOOK_COLORS.info,           // Guardian - blue
];

/**
 * Full stepper view (for BookPage footer area)
 */
const ValidationStepper = ({
  validationData,  // From GET /api/courses/topics/{id}/validation-steps/
  compact = false, // Compact mode for sidebar (just dots)
}) => {
  if (!validationData?.steps) return null;

  const { steps, current_step, is_complete } = validationData;

  if (compact) {
    return <CompactStepper steps={steps} currentStep={current_step} isComplete={is_complete} />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.stepsRow}>
        {steps.map((step, i) => {
          const isActive = step.is_current;
          const isDone = step.completed;
          const isLocked = !isDone && !isActive;
          const stepColor = STEP_COLORS[i] || BOOK_COLORS.muted;

          return (
            <React.Fragment key={step.step}>
              {/* Connector line (before step, skip first) */}
              {i > 0 && (
                <div style={{
                  ...styles.connector,
                  background: steps[i - 1].completed
                    ? BOOK_COLORS.success
                    : BOOK_COLORS.borderLight,
                }} />
              )}

              {/* Step circle + label */}
              <div style={styles.stepColumn}>
                <div
                  style={{
                    ...styles.stepCircle,
                    background: isDone
                      ? BOOK_COLORS.success
                      : isActive
                        ? stepColor
                        : '#FFFFFF',
                    border: isDone
                      ? 'none'
                      : isActive
                        ? 'none'
                        : `2px solid ${BOOK_COLORS.borderLight}`,
                    boxShadow: isActive
                      ? `0 0 0 3px ${stepColor}25`
                      : 'none',
                  }}
                  title={step.description}
                >
                  <FontAwesomeIcon
                    icon={isDone ? faCheck : isActive ? STEP_ICONS[i] : (isLocked ? faLock : STEP_ICONS[i])}
                    style={{
                      fontSize: '0.625rem',
                      color: isDone || isActive ? '#FFFFFF' : BOOK_COLORS.locked,
                    }}
                  />
                </div>
                <span style={{
                  ...styles.stepLabel,
                  color: isDone
                    ? BOOK_COLORS.success
                    : isActive
                      ? stepColor
                      : BOOK_COLORS.muted,
                  fontWeight: isActive ? 700 : 400,
                }}>
                  {step.name}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Status message */}
      {validationData.message && (
        <p style={styles.message}>
          {is_complete ? '✅ ' : ''}
          {validationData.message}
        </p>
      )}

      {/* Guardian review instructions - show when step 5 is current */}
      {current_step === 5 && !is_complete && (
        <div style={styles.guardianInfoBox}>
          <p style={styles.guardianInfoTitle}>How to complete Guardian Review:</p>
          <ol style={styles.guardianInfoList}>
            <li>This step can only be done <strong>outside school hours</strong> (after 3:00 PM)</li>
            <li>Ask your parent or guardian to sit with you</li>
            <li>Show them your completed activity and the teacher&apos;s feedback</li>
            <li>Your guardian will review and approve your work on this device</li>
          </ol>
        </div>
      )}
    </div>
  );
};

/**
 * Compact stepper (5 dots for sidebar)
 */
const CompactStepper = ({ steps, currentStep, isComplete }) => (
  <div style={styles.compactRow}>
    {steps.map((step, i) => (
      <div
        key={step.step}
        style={{
          ...styles.compactDot,
          background: step.completed
            ? BOOK_COLORS.success
            : step.is_current
              ? STEP_COLORS[i]
              : BOOK_COLORS.borderLight,
        }}
        title={`${step.name}: ${step.completed ? 'Done' : step.is_current ? 'Current' : 'Locked'}`}
      />
    ))}
  </div>
);

const styles = {
  container: {
    padding: '1rem 0',
  },

  stepsRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 0,
  },

  connector: {
    height: '2px',
    flex: '1 1 0',
    maxWidth: '48px',
    minWidth: '16px',
    marginTop: '15px', // Align with center of circle
    borderRadius: BOOK_RADIUS.full,
  },

  stepColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.375rem',
    minWidth: '48px',
    maxWidth: '72px',
  },

  stepCircle: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    flexShrink: 0,
  },

  stepLabel: {
    fontFamily: BOOK_FONTS.body,
    fontSize: '0.625rem',
    textAlign: 'center',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
  },

  message: {
    textAlign: 'center',
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.xs,
    color: BOOK_COLORS.bodyLight,
    margin: '0.75rem 0 0',
    lineHeight: 1.4,
  },

  // Guardian review info box
  guardianInfoBox: {
    marginTop: '0.75rem',
    padding: '0.75rem 1rem',
    background: `${BOOK_COLORS.info}10`,
    border: `1px solid ${BOOK_COLORS.info}30`,
    borderRadius: BOOK_RADIUS.md,
    textAlign: 'left',
  },

  guardianInfoTitle: {
    margin: '0 0 0.5rem',
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.sm,
    fontWeight: 700,
    color: BOOK_COLORS.info,
  },

  guardianInfoList: {
    margin: 0,
    paddingLeft: '1.25rem',
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.xs,
    color: BOOK_COLORS.bodyLight,
    lineHeight: 1.6,
    listStyleType: 'decimal',
  },

  // Compact (sidebar dots)
  compactRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },

  compactDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    transition: 'background 0.2s ease',
  },
};

export default ValidationStepper;
