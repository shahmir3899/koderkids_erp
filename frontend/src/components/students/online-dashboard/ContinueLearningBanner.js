import React from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../../utils/designConstants';

const ContinueLearningBanner = ({ continueLearning }) => {
  const navigate = useNavigate();

  if (!continueLearning || !continueLearning.book_id) {
    return (
      <div style={styles.card}>
        <div style={styles.accentBar} />
        <div style={styles.inner}>
          <div style={styles.playCircle}>📚</div>
          <div style={styles.textBlock}>
            <p style={styles.label}>READY TO LEARN?</p>
            <p style={styles.title}>No books assigned yet</p>
            <p style={styles.subtitle}>Your teacher will assign books soon.</p>
          </div>
        </div>
      </div>
    );
  }

  const { book_id, book_title, topic_id, topic_title } = continueLearning;
  const path = topic_id
    ? `/lms/book/${book_id}/${topic_id}`
    : `/lms/book/${book_id}`;

  return (
    <div style={styles.card}>
      {/* Left accent bar */}
      <div style={styles.accentBar} />
      <div style={styles.inner}>
        {/* Play circle icon */}
        <div style={styles.playCircle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </div>
        {/* Text */}
        <div style={styles.textBlock}>
          <p style={styles.label}>CONTINUE WHERE YOU LEFT OFF</p>
          <p style={styles.title}>{book_title}</p>
          {topic_title && (
            <p style={styles.subtitle}>
              <span style={styles.topicIcon}>📄</span> {topic_title}
            </p>
          )}
        </div>
        {/* Resume button */}
        <button style={styles.btn} onClick={() => navigate(path)}>
          <span style={styles.btnText}>Resume</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '6px', flexShrink: 0 }}>
            <polyline points="9,18 15,12 9,6" strokeWidth="2.5" stroke="white" fill="none" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {/* Decorative glow orb */}
      <div style={styles.glowOrb} />
    </div>
  );
};

const styles = {
  card: {
    position: 'relative',
    borderRadius: '16px',
    padding: `${SPACING.xl} ${SPACING.xl}`,
    background: 'rgba(0, 0, 0, 0.18)',
    border: '1px solid rgba(255,255,255,0.22)',
    marginBottom: SPACING.xl,
    overflow: 'hidden',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    boxShadow: '0 4px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.1)',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '4px',
    borderRadius: '16px 0 0 16px',
    background: 'linear-gradient(180deg, #6366f1, #a855f7)',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.lg,
    flexWrap: 'wrap',
    paddingLeft: SPACING.sm,
  },
  playCircle: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 0 20px rgba(99,102,241,0.5)',
    fontSize: '22px',
  },
  textBlock: {
    flex: 1,
    minWidth: '180px',
  },
  label: {
    margin: '0 0 4px 0',
    fontSize: '10px',
    color: 'rgba(165,180,252,0.8)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: FONT_WEIGHTS.semibold,
  },
  title: {
    margin: '0 0 4px 0',
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#fff',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    margin: 0,
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.55)',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  topicIcon: {
    fontSize: '13px',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    padding: `12px 24px`,
    borderRadius: BORDER_RADIUS.full,
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.sm,
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: '0 4px 16px rgba(99,102,241,0.45)',
    letterSpacing: '0.01em',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  btnText: {
    lineHeight: 1,
  },
  glowOrb: {
    position: 'absolute',
    right: '-40px',
    top: '-40px',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
};

export default ContinueLearningBanner;

