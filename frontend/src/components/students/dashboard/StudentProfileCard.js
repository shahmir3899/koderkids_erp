import React from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, MIXINS } from '../../../utils/designConstants';

/**
 * StudentProfileCard - Displays student photo, name, grade, level, and status
 */
const StudentProfileCard = ({ profile, isMobile }) => {
  const defaultAvatar = 'https://ui-avatars.com/api/?name=' +
    encodeURIComponent(profile?.full_name || 'Student') +
    '&background=8B7EC8&color=fff&size=200';

  return (
    <div style={getStyles(isMobile).card}>
      {/* Profile Photo */}
      <div style={getStyles(isMobile).photoContainer}>
        <img
          src={profile?.profile_photo_url || defaultAvatar}
          alt={profile?.full_name || 'Student'}
          style={getStyles(isMobile).photo}
          onError={(e) => {
            e.target.src = defaultAvatar;
          }}
        />
      </div>

      {/* Name */}
      <h3 style={getStyles(isMobile).name}>
        {profile?.full_name || profile?.username || 'Student'}
      </h3>

      {/* Grade & Level */}
      <p style={getStyles(isMobile).gradeLevel}>
        {profile?.class || 'Class'} - Level {getLevelFromClass(profile?.class)}
      </p>

      {/* Status Badge */}
      <div style={getStyles(isMobile).statusBadge}>
        {profile?.status || 'Active'}
      </div>
    </div>
  );
};

// Helper to extract level number from class name
const getLevelFromClass = (className) => {
  if (!className) return '1';
  const match = className.match(/\d+/);
  return match ? match[0] : '1';
};

const getStyles = (isMobile) => ({
  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: isMobile ? SPACING.lg : SPACING.xl,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: isMobile ? '100%' : '200px',
  },
  photoContainer: {
    width: isMobile ? '100px' : '120px',
    height: isMobile ? '100px' : '120px',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    border: `4px solid ${COLORS.primary}`,
    boxShadow: SHADOWS.md,
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  name: {
    fontSize: isMobile ? FONT_SIZES.lg : FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    margin: `0 0 ${SPACING.xs} 0`,
    textAlign: 'center',
  },
  gradeLevel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    margin: `0 0 ${SPACING.md} 0`,
  },
  statusBadge: {
    backgroundColor: COLORS.status.success,
    color: '#FFFFFF',
    padding: `${SPACING.xs} ${SPACING.lg}`,
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});

export default StudentProfileCard;
