import React from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../../utils/designConstants';

const LearningStreakCard = ({ learningStreak, isMobile }) => {
  const current = learningStreak?.current_days ?? 0;
  const activeLast30 = learningStreak?.active_days_last_30 ?? 0;

  // Build a 30-dot mini activity grid (simplified — just active days count)
  const totalDots = 30;

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.headerRow}>
        <h3 style={styles.heading}>🔥 Learning Streak</h3>
      </div>

      {/* Stat pair */}
      <div style={styles.body}>
        {/* Current streak */}
        <div style={styles.statBlock}>
          <div style={styles.glowRing}>
            <span style={styles.bigNum}>{current}</span>
          </div>
          <p style={styles.statLabel}>Current streak</p>
          <p style={styles.statUnit}>day{current !== 1 ? 's' : ''}</p>
        </div>

        <div style={styles.divider} />

        {/* Active last 30 */}
        <div style={styles.statBlock}>
          <div style={{ ...styles.glowRing, ...styles.glowRingSecondary }}>
            <span style={{ ...styles.bigNum, ...styles.bigNumSecondary }}>{activeLast30}</span>
          </div>
          <p style={styles.statLabel}>Active (30 days)</p>
          <p style={styles.statUnit}>days</p>
        </div>
      </div>

      {/* Mini dot activity grid */}
      <div style={styles.dotGrid}>
        {Array.from({ length: totalDots }).map((_, i) => (
          <div
            key={i}
            style={{
              ...styles.dot,
              ...(i < activeLast30 ? styles.dotActive : {}),
            }}
          />
        ))}
      </div>

      {/* Encouragement message */}
      <p style={styles.encouragement}>
        {current >= 7
          ? '🏆 Amazing! You\'re on fire!'
          : current >= 3
          ? '⚡ Great momentum! Keep going!'
          : current === 0
          ? 'Open a lesson today to start your streak!'
          : '👍 Good start! Keep the habit!'}
      </p>
    </div>
  );
};

const styles = {
  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: '16px',
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  headerRow: {
    marginBottom: SPACING.md,
  },
  heading: {
    margin: 0,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#fff',
  },
  body: {
    display: 'flex',
    gap: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  statBlock: {
    textAlign: 'center',
    flex: 1,
  },
  glowRing: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 70%)',
    border: '2px solid rgba(249,115,22,0.35)',
    marginBottom: '8px',
    boxShadow: '0 0 16px rgba(249,115,22,0.2)',
  },
  glowRingSecondary: {
    background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
    border: '2px solid rgba(99,102,241,0.3)',
    boxShadow: '0 0 16px rgba(99,102,241,0.15)',
  },
  bigNum: {
    fontSize: '2rem',
    fontWeight: FONT_WEIGHTS.bold,
    color: '#f97316',
    lineHeight: 1,
  },
  bigNumSecondary: {
    color: '#a5b4fc',
  },
  statLabel: {
    margin: '0 0 2px 0',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statUnit: {
    margin: 0,
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.3)',
  },
  divider: {
    width: '1px',
    height: '60px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  dotGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginBottom: SPACING.sm,
    padding: `${SPACING.sm} 0`,
    borderTop: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '2px',
    backgroundColor: 'rgba(255,255,255,0.07)',
    flexShrink: 0,
  },
  dotActive: {
    backgroundColor: 'rgba(249,115,22,0.55)',
    boxShadow: '0 0 4px rgba(249,115,22,0.3)',
  },
  encouragement: {
    margin: `${SPACING.sm} 0 0 0`,
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
};

export default LearningStreakCard;

