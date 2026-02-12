// ============================================
// PROOF STATUS BADGE - Shows homework review status
// ============================================
// Displays the status of an uploaded activity proof:
// pending, approved (with rating), or rejected (with feedback).

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faCheckCircle,
  faTimesCircle,
  faStar,
  faStarHalfAlt,
  faRedo,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarOutline } from '@fortawesome/free-regular-svg-icons';
import {
  BOOK_COLORS,
  BOOK_FONTS,
  BOOK_FONT_SIZES,
  BOOK_RADIUS,
} from '../../utils/bookTheme';

const STATUS_CONFIG = {
  pending: {
    icon: faClock,
    color: '#F59E0B',
    bg: '#FFFBEB',
    border: '#FDE68A',
    label: 'Waiting for Teacher Review',
  },
  approved: {
    icon: faCheckCircle,
    color: BOOK_COLORS.success,
    bg: '#F0FDF4',
    border: '#BBF7D0',
    label: 'Approved',
  },
  rejected: {
    icon: faTimesCircle,
    color: BOOK_COLORS.challenge,
    bg: '#FEF2F2',
    border: '#FECACA',
    label: 'Needs Revision',
  },
};

/**
 * Render star rating (1-3 stars for basic/good/excellent)
 */
const StarRating = ({ rating }) => {
  const ratingMap = {
    excellent: 3,
    good: 2,
    basic: 1,
  };
  const stars = ratingMap[rating] || 0;
  if (stars === 0) return null;

  return (
    <div style={styles.starRow}>
      {[1, 2, 3].map((i) => (
        <FontAwesomeIcon
          key={i}
          icon={i <= stars ? faStar : faStarOutline}
          style={{
            color: i <= stars ? '#FBBF24' : '#D1D5DB',
            fontSize: '0.875rem',
          }}
        />
      ))}
      <span style={styles.ratingLabel}>
        {rating === 'excellent' ? 'Excellent!' : rating === 'good' ? 'Good Job' : 'Keep Trying'}
      </span>
    </div>
  );
};

const ProofStatusBadge = ({
  proof,               // The proof object from API / LMS context
  onReupload,          // Callback to trigger re-upload (shows uploader again)
}) => {
  if (!proof) return null;

  const status = proof.status || 'pending';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <div style={{ ...styles.container, background: cfg.bg, borderColor: cfg.border }}>
      {/* Status row */}
      <div style={styles.statusRow}>
        <FontAwesomeIcon icon={cfg.icon} style={{ color: cfg.color, fontSize: '1.125rem' }} />
        <span style={{ ...styles.statusLabel, color: cfg.color }}>{cfg.label}</span>
      </div>

      {/* Screenshot preview */}
      {proof.screenshot_url && (
        <div style={styles.thumbWrap}>
          <img
            src={proof.screenshot_url}
            alt="Your submission"
            style={styles.thumbnail}
          />
        </div>
      )}

      {/* Approved: show rating + teacher remarks */}
      {status === 'approved' && (
        <div style={styles.feedbackSection}>
          {proof.teacher_rating && <StarRating rating={proof.teacher_rating} />}
          {proof.teacher_remarks && (
            <div style={styles.remarksBox}>
              <span style={styles.remarksLabel}>Teacher says:</span>
              <p style={styles.remarksText}>"{proof.teacher_remarks}"</p>
            </div>
          )}
          {/* Guardian review info */}
          {proof.guardian_reviewed && (
            <div style={styles.guardianBadge}>
              <FontAwesomeIcon icon={faUserShield} style={{ color: BOOK_COLORS.info, fontSize: '0.75rem' }} />
              <span style={styles.guardianText}>Guardian reviewed</span>
            </div>
          )}
        </div>
      )}

      {/* Rejected: show feedback + re-upload button */}
      {status === 'rejected' && (
        <div style={styles.feedbackSection}>
          {proof.teacher_remarks && (
            <div style={styles.remarksBox}>
              <span style={styles.remarksLabel}>Teacher feedback:</span>
              <p style={styles.remarksText}>"{proof.teacher_remarks}"</p>
            </div>
          )}
          {onReupload && (
            <button style={styles.reuploadBtn} onClick={onReupload}>
              <FontAwesomeIcon icon={faRedo} />
              <span>Re-upload Work</span>
            </button>
          )}
        </div>
      )}

      {/* Pending: show submitted timestamp */}
      {status === 'pending' && proof.created_at && (
        <p style={styles.submittedAt}>
          Submitted {new Date(proof.created_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

const styles = {
  container: {
    borderRadius: BOOK_RADIUS.lg,
    border: '1.5px solid',
    padding: '1rem',
    marginTop: '0.75rem',
  },

  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },

  statusLabel: {
    fontFamily: BOOK_FONTS.heading,
    fontSize: BOOK_FONT_SIZES.sm,
    fontWeight: 700,
  },

  thumbWrap: {
    marginBottom: '0.75rem',
  },

  thumbnail: {
    width: '100%',
    maxHeight: '200px',
    objectFit: 'contain',
    borderRadius: BOOK_RADIUS.md,
    border: `1px solid ${BOOK_COLORS.border}`,
    background: '#FFFFFF',
  },

  feedbackSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },

  starRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },

  ratingLabel: {
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.xs,
    color: BOOK_COLORS.bodyLight,
    marginLeft: '0.375rem',
    fontWeight: 600,
  },

  remarksBox: {
    background: 'rgba(255,255,255,0.7)',
    borderRadius: BOOK_RADIUS.md,
    padding: '0.5rem 0.75rem',
  },

  remarksLabel: {
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.xs,
    color: BOOK_COLORS.muted,
    fontWeight: 600,
  },

  remarksText: {
    fontFamily: BOOK_FONTS.handwritten,
    fontSize: BOOK_FONT_SIZES.base,
    color: BOOK_COLORS.body,
    margin: '0.25rem 0 0',
    fontStyle: 'italic',
  },

  guardianBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.25rem 0',
  },

  guardianText: {
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.xs,
    color: BOOK_COLORS.info,
    fontWeight: 600,
  },

  submittedAt: {
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.xs,
    color: BOOK_COLORS.muted,
    margin: 0,
  },

  reuploadBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: BOOK_RADIUS.md,
    border: `1.5px solid ${BOOK_COLORS.challenge}`,
    background: '#FFFFFF',
    color: BOOK_COLORS.challenge,
    fontFamily: BOOK_FONTS.heading,
    fontSize: BOOK_FONT_SIZES.sm,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s',
    alignSelf: 'flex-start',
  },
};

export default ProofStatusBadge;
