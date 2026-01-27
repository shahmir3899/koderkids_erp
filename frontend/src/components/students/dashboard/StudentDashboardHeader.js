import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../../utils/authHelpers';
import { clearCacheOnLogout } from '../../../utils/cacheUtils';
import { StudentSettingsModal } from '../StudentSettingsModal';
import NotificationPanel from '../../common/ui/NotificationPanel';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  TRANSITIONS,
} from '../../../utils/designConstants';

/**
 * StudentDashboardHeader - Narrow, simple header matching Koder Kids reference
 * Shows: Logo | Greeting with Name/Level | Birthday Notification | Profile Photo | Settings
 */
const StudentDashboardHeader = ({
  profile,
  onProfileUpdate,
  birthdayName = null,
  studentClass = null,
  isMobile,
}) => {
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const defaultAvatar = 'https://ui-avatars.com/api/?name=' +
    encodeURIComponent(profile?.full_name || 'Student') +
    '&background=8B7EC8&color=fff&size=100';

  const handleProfileUpdate = useCallback((updatedProfile) => {
    if (onProfileUpdate) {
      onProfileUpdate(updatedProfile);
    }
  }, [onProfileUpdate]);

  const handleLogout = useCallback(() => {
    clearCacheOnLogout();
    logout();
    navigate('/login');
  }, [navigate]);

  // Check if today is the student's birthday
  const isBirthday = () => {
    if (!profile?.date_of_birth) return false;
    const today = new Date();
    const dob = new Date(profile.date_of_birth);
    return today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate();
  };

  const displayBirthdayName = birthdayName || (isBirthday() ? profile?.first_name : null);

  // Extract level from class name (e.g., "Level 2" from "Level 2 - Coding Basics")
  const getClassLevel = () => {
    if (!studentClass) return null;
    const levelMatch = studentClass.match(/Level\s*(\d+)/i);
    return levelMatch ? levelMatch[1] : null;
  };

  const level = getClassLevel();
  const firstName = profile?.first_name || profile?.full_name?.split(' ')[0] || 'Student';

  return (
    <>
      <div style={getStyles(isMobile).container}>
        {/* Left: Logo */}
        <div style={getStyles(isMobile).logoSection}>
          <div style={getStyles(isMobile).logoIcon}>K</div>
          <span style={getStyles(isMobile).logoText}>Koder Kids</span>
        </div>

        {/* Center: Greeting and Level Info */}
        <div style={getStyles(isMobile).centerSection}>
          <span style={getStyles(isMobile).greeting}>
            Hello, {firstName}!
          </span>
          <span style={getStyles(isMobile).levelInfo}>
            {profile?.school && (
              <>
                <span style={getStyles(isMobile).schoolName}>{profile.school}</span>
                {studentClass && <span style={getStyles(isMobile).separator}>•</span>}
              </>
            )}
            {studentClass || (!profile?.school && 'Student')}
          </span>
          {/* Birthday Notification (if applicable) */}
          {displayBirthdayName && (
            <div style={getStyles(isMobile).birthdayBanner}>
              <span style={getStyles(isMobile).birthdayIcon}>🎂</span>
              <span style={getStyles(isMobile).birthdayText}>
                Happy Birthday!
              </span>
              <span style={getStyles(isMobile).birthdayIcon}>🎉</span>
            </div>
          )}
        </div>

        {/* Right: Notifications, Profile & Settings */}
        <div style={getStyles(isMobile).rightSection}>
          {/* Notification Bell */}
          <NotificationPanel
            onNotificationClick={(notification) => {
              // Handle notification click - navigate to related URL if exists
              if (notification.related_url) {
                navigate(notification.related_url);
              }
            }}
          />

          {/* Profile Photo with Dropdown */}
          <div
            style={getStyles(isMobile).profileContainer}
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <img
              src={profile?.profile_photo_url || defaultAvatar}
              alt={profile?.full_name || 'Student'}
              style={getStyles(isMobile).profilePhoto}
              onError={(e) => {
                e.target.src = defaultAvatar;
              }}
            />
            {showDropdown && (
              <div style={getStyles(isMobile).dropdown}>
                <button
                  style={getStyles(isMobile).dropdownItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSettingsOpen(true);
                    setShowDropdown(false);
                  }}
                >
                  Profile Settings
                </button>
                <button
                  style={getStyles(isMobile).dropdownItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Settings Gear */}
          <button
            style={getStyles(isMobile).settingsButton}
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
          >
            <svg
              width={isMobile ? 20 : 24}
              height={isMobile ? 20 : 24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <StudentSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          profile={profile}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </>
  );
};

const getStyles = (isMobile) => ({
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobile ? `${SPACING.sm} ${SPACING.md}` : `${SPACING.md} ${SPACING.lg}`,
    backgroundColor: 'transparent',
    marginBottom: SPACING.lg,
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logoIcon: {
    width: isMobile ? '32px' : '40px',
    height: isMobile ? '32px' : '40px',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: isMobile ? FONT_SIZES.lg : FONT_SIZES.xl,
  },
  logoText: {
    fontSize: isMobile ? FONT_SIZES.lg : FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    display: isMobile ? 'none' : 'block',
  },
  centerSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
    textAlign: 'center',
  },
  greeting: {
    fontSize: isMobile ? FONT_SIZES.lg : FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },
  levelInfo: {
    fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    fontWeight: FONT_WEIGHTS.medium,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  schoolName: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  separator: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  birthdayBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    padding: `${SPACING.xs} ${SPACING.md}`,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.xs,
  },
  birthdayIcon: {
    fontSize: isMobile ? '14px' : '16px',
  },
  birthdayText: {
    fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
    color: COLORS.text.white,
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  profileContainer: {
    position: 'relative',
    cursor: 'pointer',
  },
  profilePhoto: {
    width: isMobile ? '36px' : '44px',
    height: isMobile ? '36px' : '44px',
    borderRadius: BORDER_RADIUS.full,
    objectFit: 'cover',
    border: `2px solid rgba(255, 255, 255, 0.3)`,
    boxShadow: SHADOWS.sm,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: SPACING.xs,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: BORDER_RADIUS.md,
    boxShadow: SHADOWS.lg,
    overflow: 'hidden',
    zIndex: 100,
    minWidth: '150px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: `${SPACING.sm} ${SPACING.md}`,
    border: 'none',
    backgroundColor: 'transparent',
    textAlign: 'left',
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    cursor: 'pointer',
    transition: `background-color ${TRANSITIONS.fast}`,
  },
  settingsButton: {
    width: isMobile ? '36px' : '44px',
    height: isMobile ? '36px' : '44px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: SHADOWS.sm,
    color: COLORS.text.white,
    transition: `all ${TRANSITIONS.fast}`,
  },
});

export default StudentDashboardHeader;
