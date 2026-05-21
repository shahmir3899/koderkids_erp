import React from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../../utils/designConstants';

const OnlineDashboardHeader = ({ student, isMobile }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <div style={styles.container}>
        <div style={styles.left}>
          {/* Avatar with gradient ring */}
          <div style={styles.avatarRing}>
            {student?.photo_url ? (
              <img src={student.photo_url} alt="Profile" style={styles.avatar} />
            ) : (
              <div style={styles.avatarPlaceholder}>
                <span style={styles.avatarInitial}>{student?.name?.[0]?.toUpperCase() || '?'}</span>
              </div>
            )}
          </div>
          <div>
            <p style={styles.greeting}>{greeting}</p>
            <h1 style={{ ...styles.name, fontSize: isMobile ? '1.5rem' : '2rem' }}>
              {student?.name || 'Student'}
            </h1>
            <p style={styles.meta}>
              <span style={styles.metaIcon}>🏫</span>
              {student?.school}
              <span style={styles.metaDot}> · </span>
              {student?.student_class}
            </p>
          </div>
        </div>
        {/* Badge with glow */}
        <div style={styles.badgeWrapper}>
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            <span style={styles.badgeText}>Online Student</span>
          </div>
          <p style={styles.statusLine}>
            {student?.status === 'Active' ? '✅ Active' : student?.status || ''}
          </p>
        </div>
      </div>
      {/* Separator */}
      <div style={styles.separator} />
    </>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  avatarRing: {
    padding: '3px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ffffff, #e0d7ff, #c4b5fd)',
    flexShrink: 0,
    boxShadow: '0 0 20px rgba(255,255,255,0.3)',
  },
  avatar: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'block',
    border: '2px solid #1a1033',
  },
  avatarPlaceholder: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #1a1033',
  },
  avatarInitial: {
    fontSize: '1.75rem',
    fontWeight: FONT_WEIGHTS.bold,
    color: '#fff',
    lineHeight: 1,
  },
  greeting: {
    margin: 0,
    fontSize: FONT_SIZES.sm,
    color: 'rgba(165,180,252,0.8)',
    fontWeight: FONT_WEIGHTS.normal,
    letterSpacing: '0.02em',
  },
  name: {
    margin: `4px 0 6px 0`,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#fff',
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
  },
  meta: {
    margin: 0,
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.5)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  metaIcon: {
    fontSize: '13px',
  },
  metaDot: {
    color: 'rgba(255,255,255,0.25)',
  },
  badgeWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    backgroundColor: 'rgba(255,255,255,0.18)',
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: BORDER_RADIUS.full,
    padding: `6px 14px`,
    boxShadow: '0 0 12px rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  badgeDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    boxShadow: '0 0 6px rgba(255,255,255,0.8)',
    flexShrink: 0,
  },
  badgeText: {
    fontSize: FONT_SIZES.sm,
    color: '#fff',
    fontWeight: FONT_WEIGHTS.semibold,
  },
  statusLine: {
    margin: 0,
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'right',
  },
  separator: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
    marginBottom: SPACING.xl,
  },
};

export default OnlineDashboardHeader;

