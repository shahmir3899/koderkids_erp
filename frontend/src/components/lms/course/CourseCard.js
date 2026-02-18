// ============================================
// COURSE CARD - Course thumbnail with progress
// ============================================
// Location: src/components/lms/course/CourseCard.js

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook,
  faPlay,
  faClock,
  faCheckCircle,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../../utils/designConstants';

const CourseCard = ({
  course,
  enrollment = null,
  topicValidations = [],
  onContinue,
  onEnroll,
  onView,
  showEnrollButton = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const isEnrolled = !!enrollment;
  const progressPercentage = enrollment?.progress_percentage || 0;
  const isCompleted = enrollment?.status === 'completed';

  // Format duration
  const formatDuration = (minutes) => {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handleClick = () => {
    if (isEnrolled) {
      onContinue?.(course, enrollment);
    } else {
      onView?.(course);
    }
  };

  return (
    <div
      style={{
        ...styles.card,
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 12px 40px rgba(0, 0, 0, 0.2)'
          : '0 4px 24px rgba(0, 0, 0, 0.12)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Cover Image */}
      <div style={styles.coverContainer}>
        {course.cover ? (
          <img
            src={course.cover}
            alt={course.title}
            style={styles.coverImage}
          />
        ) : (
          <div style={styles.coverPlaceholder}>
            <FontAwesomeIcon icon={faBook} style={styles.placeholderIcon} />
          </div>
        )}

        {/* Progress Overlay (if enrolled) */}
        {isEnrolled && (
          <div style={styles.progressOverlay}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progressPercentage}%`,
                  backgroundColor: isCompleted
                    ? COLORS.status.success
                    : COLORS.status.info,
                }}
              />
            </div>
            <span style={styles.progressText}>
              {isCompleted ? 'Completed' : `${progressPercentage}%`}
            </span>
          </div>
        )}

        {/* Completed Badge */}
        {isCompleted && (
          <div style={styles.completedBadge}>
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
        )}
      </div>

      {/* Content */}
      <div style={styles.content}>
        <h3 style={styles.title}>{course.title}</h3>

        <div style={styles.meta}>
          <span style={styles.metaItem}>
            <FontAwesomeIcon icon={faBook} style={styles.metaIcon} />
            {course.total_topics || '—'} topics
          </span>
          <span style={styles.metaItem}>
            <FontAwesomeIcon icon={faClock} style={styles.metaIcon} />
            {formatDuration(course.total_duration_minutes)}
          </span>
          {course.enrollment_count > 0 && (
            <span style={styles.metaItem}>
              <FontAwesomeIcon icon={faUsers} style={styles.metaIcon} />
              {course.enrollment_count}
            </span>
          )}
        </div>

        {/* Validation Status Dots */}
        {topicValidations.length > 0 && (
          <div style={styles.validationDots}>
            {topicValidations.map((tv, i) => (
              <div
                key={tv.topic_id || i}
                style={{
                  ...styles.dot,
                  backgroundColor:
                    tv.status === 'complete' ? COLORS.status.success :
                    tv.status === 'in_progress' ? COLORS.status.warning :
                    tv.status === 'needs_action' ? COLORS.status.error :
                    'rgba(255, 255, 255, 0.2)',
                }}
                title={`Topic ${i + 1}: ${tv.status.replace(/_/g, ' ')}`}
              />
            ))}
          </div>
        )}

        {/* Action Button */}
        <div style={styles.actions}>
          {isEnrolled ? (
            <button
              style={{
                ...styles.button,
                ...styles.continueButton,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onContinue?.(course, enrollment);
              }}
            >
              <FontAwesomeIcon icon={faPlay} style={{ marginRight: '8px' }} />
              {isCompleted ? 'Review' : 'Continue'}
            </button>
          ) : showEnrollButton ? (
            <button
              style={{
                ...styles.button,
                ...styles.enrollButton,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onEnroll?.(course);
              }}
            >
              Enroll Now
            </button>
          ) : (
            <button
              style={{
                ...styles.button,
                ...styles.viewButton,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onView?.(course);
              }}
            >
              View Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal} ease`,
    display: 'flex',
    flexDirection: 'column',
  },

  coverContainer: {
    position: 'relative',
    width: '100%',
    paddingTop: '56.25%', // 16:9 aspect ratio
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },

  coverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  coverPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
  },

  placeholderIcon: {
    fontSize: '3rem',
    color: 'rgba(255, 255, 255, 0.5)',
  },

  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.sm,
    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.7))',
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  progressBar: {
    flex: 1,
    height: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
    transition: `width ${TRANSITIONS.slow} ease`,
  },

  progressText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    minWidth: '50px',
    textAlign: 'right',
  },

  completedBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.status.success,
    color: COLORS.text.white,
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.lg,
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
  },

  content: {
    padding: SPACING.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
    flex: 1,
  },

  title: {
    margin: 0,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    lineHeight: 1.3,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },

  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },

  metaItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },

  metaIcon: {
    marginRight: SPACING.xs,
    fontSize: FONT_SIZES.xs,
  },

  validationDots: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: SPACING.xs,
  },

  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: `background-color ${TRANSITIONS.fast} ease`,
  },

  actions: {
    marginTop: 'auto',
    paddingTop: SPACING.md,
  },

  button: {
    width: '100%',
    padding: `${SPACING.sm} ${SPACING.lg}`,
    borderRadius: BORDER_RADIUS.md,
    border: 'none',
    cursor: 'pointer',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    transition: `all ${TRANSITIONS.fast} ease`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  continueButton: {
    backgroundColor: COLORS.status.info,
    color: COLORS.text.white,
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
  },

  enrollButton: {
    backgroundColor: COLORS.status.success,
    color: COLORS.text.white,
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
  },

  viewButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: COLORS.text.white,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },
};

export default CourseCard;
