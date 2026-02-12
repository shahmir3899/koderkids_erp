// ============================================
// SMART COMPLETE BUTTON - Context-aware actions
// ============================================
// Replaces the simple "Mark Complete" button with
// intelligent step-aware behavior based on the
// 5-step validation pipeline. Reading time is now
// dynamic (calculated from content word count).

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookReader,
  faCheck,
  faCamera,
  faClock,
  faUserShield,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import { ClipLoader } from 'react-spinners';
import {
  BOOK_COLORS,
  BOOK_FONTS,
  BOOK_FONT_SIZES,
  BOOK_RADIUS,
} from '../../utils/bookTheme';

const DEFAULT_REQUIRED_SECONDS = 60; // fallback 1 min

/**
 * Reading time progress button (shared between Simple and Smart modes)
 */
const ReadingProgressButton = ({ readingTime, requiredTime }) => {
  const progress = Math.min((readingTime / requiredTime) * 100, 100);
  const remaining = Math.max(requiredTime - readingTime, 0);
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <div style={styles.readingContainer}>
      <button style={{ ...styles.btn, ...styles.readingBtn }} disabled>
        <FontAwesomeIcon icon={faBookReader} style={styles.icon} />
        Keep Reading ({m}:{String(s).padStart(2, '0')} left)
      </button>
      <div style={styles.readingTrack}>
        <div style={{ ...styles.readingFill, width: `${progress}%` }} />
      </div>
    </div>
  );
};

const SmartCompleteButton = ({
  validationData,            // From GET validation-steps API
  readingTime = 0,           // Accumulated seconds
  requiredReadingTime,       // Dynamic, calculated from content
  isCompleted,               // Topic already completed
  isCompleting,              // Currently submitting completion
  hasHomeActivity,           // Does this topic have home_activity blocks
  onComplete,                // Mark topic complete action
  onNavigateNext,            // Go to next topic
  onScrollToUpload,          // Scroll to upload section
}) => {
  const reqTime = requiredReadingTime || DEFAULT_REQUIRED_SECONDS;

  // If no validation data or simple topic (no home activities) → simple button
  if (!validationData?.steps || !hasHomeActivity) {
    return (
      <SimpleCompleteButton
        readingTime={readingTime}
        requiredReadingTime={reqTime}
        isCompleted={isCompleted}
        isCompleting={isCompleting}
        onComplete={onComplete}
        onNavigateNext={onNavigateNext}
      />
    );
  }

  const { is_complete, steps } = validationData;

  // Already fully completed
  if (is_complete || isCompleted) {
    return (
      <button
        style={{ ...styles.btn, ...styles.completedBtn }}
        onClick={onNavigateNext}
      >
        <FontAwesomeIcon icon={faCheck} style={styles.icon} />
        Completed! Next Topic
        <FontAwesomeIcon icon={faArrowRight} style={styles.icon} />
      </button>
    );
  }

  // Step-aware button
  const readingStep = steps.find(s => s.step === 1);
  const activityStep = steps.find(s => s.step === 2);
  const screenshotStep = steps.find(s => s.step === 3);
  const teacherStep = steps.find(s => s.step === 4);
  const guardianStep = steps.find(s => s.step === 5);

  // Step 1: Reading time not met (use dynamic required time)
  if (!readingStep?.completed && readingTime < reqTime) {
    return <ReadingProgressButton readingTime={readingTime} requiredTime={reqTime} />;
  }

  // Step 2: Activity not complete
  if (!activityStep?.completed) {
    return (
      <button
        style={{ ...styles.btn, ...styles.activityBtn }}
        onClick={onComplete}
        disabled={isCompleting}
      >
        {isCompleting ? (
          <ClipLoader size={16} color="#FFFFFF" />
        ) : (
          <>
            <FontAwesomeIcon icon={faCheck} style={styles.icon} />
            Mark Activity Complete
          </>
        )}
      </button>
    );
  }

  // Step 3: Screenshot not uploaded
  if (!screenshotStep?.completed) {
    return (
      <button
        style={{ ...styles.btn, ...styles.uploadBtn }}
        onClick={onScrollToUpload}
      >
        <FontAwesomeIcon icon={faCamera} style={styles.icon} />
        Upload Your Work
      </button>
    );
  }

  // Step 4: Waiting for teacher
  if (!teacherStep?.completed) {
    return (
      <button style={{ ...styles.btn, ...styles.waitingBtn }} disabled>
        <FontAwesomeIcon icon={faClock} style={styles.icon} />
        Waiting for Teacher Review
      </button>
    );
  }

  // Step 5: Guardian review needed
  if (!guardianStep?.completed) {
    return (
      <button style={{ ...styles.btn, ...styles.guardianBtn }} disabled>
        <FontAwesomeIcon icon={faUserShield} style={styles.icon} />
        Awaiting Guardian Review
      </button>
    );
  }

  // Fallback
  return (
    <button
      style={{ ...styles.btn, ...styles.activityBtn }}
      onClick={onComplete}
      disabled={isCompleting}
    >
      {isCompleting ? (
        <ClipLoader size={16} color="#FFFFFF" />
      ) : (
        <>
          <FontAwesomeIcon icon={faCheck} style={styles.icon} />
          Mark Complete
        </>
      )}
    </button>
  );
};

/**
 * Simple button for topics without home_activity (chapters, intros, etc.)
 * NOW enforces reading time before allowing completion.
 */
const SimpleCompleteButton = ({
  readingTime,
  requiredReadingTime,
  isCompleted,
  isCompleting,
  onComplete,
  onNavigateNext,
}) => {
  const reqTime = requiredReadingTime || DEFAULT_REQUIRED_SECONDS;
  const hasReadEnough = readingTime >= reqTime;

  // Already completed → show "Next Topic"
  if (isCompleted) {
    return (
      <button
        style={{ ...styles.btn, ...styles.completedBtn }}
        onClick={onNavigateNext}
      >
        <FontAwesomeIcon icon={faCheck} style={styles.icon} />
        Completed! Next Topic
        <FontAwesomeIcon icon={faArrowRight} style={styles.icon} />
      </button>
    );
  }

  // Reading time not met → show "Keep Reading" with progress
  if (!hasReadEnough) {
    return <ReadingProgressButton readingTime={readingTime} requiredTime={reqTime} />;
  }

  // Reading done → allow mark complete
  return (
    <button
      style={{
        ...styles.btn,
        ...styles.activityBtn,
        opacity: isCompleting ? 0.7 : 1,
      }}
      onClick={onComplete}
      disabled={isCompleting}
    >
      {isCompleting ? (
        <ClipLoader size={16} color="#FFFFFF" />
      ) : (
        <>
          <FontAwesomeIcon icon={faCheck} style={styles.icon} />
          Mark Complete
        </>
      )}
    </button>
  );
};

const styles = {
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.5rem',
    border: 'none',
    borderRadius: BOOK_RADIUS.md,
    fontFamily: BOOK_FONTS.body,
    fontWeight: 700,
    fontSize: BOOK_FONT_SIZES.sm,
    cursor: 'pointer',
    minWidth: '160px',
    transition: 'all 0.2s ease',
    color: '#FFFFFF',
  },

  icon: {
    fontSize: '0.75rem',
  },

  // Step 1: Reading
  readingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.375rem',
    minWidth: '180px',
  },

  readingBtn: {
    background: BOOK_COLORS.reading,
    opacity: 0.85,
    cursor: 'default',
    width: '100%',
  },

  readingTrack: {
    width: '100%',
    height: '3px',
    background: BOOK_COLORS.borderLight,
    borderRadius: BOOK_RADIUS.full,
    overflow: 'hidden',
  },

  readingFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${BOOK_COLORS.classActivity}, ${BOOK_COLORS.reading})`,
    borderRadius: BOOK_RADIUS.full,
    transition: 'width 0.6s ease',
  },

  // Step 2: Activity
  activityBtn: {
    background: `linear-gradient(135deg, ${BOOK_COLORS.classActivity}, ${BOOK_COLORS.heading})`,
    boxShadow: '0 2px 8px rgba(107, 33, 168, 0.25)',
  },

  // Step 3: Upload
  uploadBtn: {
    background: `linear-gradient(135deg, ${BOOK_COLORS.homeActivity}, #34D399)`,
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
  },

  // Step 4: Waiting
  waitingBtn: {
    background: '#F59E0B',
    opacity: 0.75,
    cursor: 'default',
  },

  // Step 5: Guardian
  guardianBtn: {
    background: BOOK_COLORS.info,
    opacity: 0.75,
    cursor: 'default',
  },

  // Completed
  completedBtn: {
    background: BOOK_COLORS.success,
    cursor: 'pointer',
  },
};

export default SmartCompleteButton;
