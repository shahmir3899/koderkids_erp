// ============================================
// UNIFIED PROFILE HEADER - FIXED VERSION
// Prevents infinite loops, better field mapping
// ============================================
// Location: frontend/src/components/common/UnifiedProfileHeader.js

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoleConfig, getDetailValue, getProfileName } from './profileHeaderConfig';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { NotificationPanel } from './ui/NotificationPanel';
import { TaskPanel } from './ui/TaskPanel';
import { logout } from '../../utils/authHelpers';
import { clearCacheOnLogout } from '../../utils/cacheUtils';
import { useResponsive } from '../../hooks/useResponsive';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  TRANSITIONS,
  TOUCH_TARGETS,
} from '../../utils/designConstants';

// Role-specific modals
import { TeacherSettingsModal } from '../teacher/TeacherSettingsModal';
import { AdminSettingsModal } from '../admin/AdminSettingsModal';
import { StudentSettingsModal } from '../students/StudentSettingsModal';
import { BDMSettingsModal } from '../bdm/BDMSettingsModal';

// Admin approval modal
import { ApprovalModal } from '../admin/ApprovalModal';
import { reportRequestService } from '../../services/reportRequestService';

/**
 * UnifiedProfileHeader Component - FIXED VERSION
 * Prevents infinite loops and handles missing fields gracefully
 */
export const UnifiedProfileHeader = ({
  role,
  profile,
  loading = false,
  onProfileUpdate,
  onNotificationClick,
}) => {
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const { isMobile, isTablet } = useResponsive();

  // Fetch pending approval count for admins
  useEffect(() => {
    if (role === 'Admin') {
      const fetchPendingCount = async () => {
        try {
          const data = await reportRequestService.fetchPendingRequests();
          setPendingApprovals(data.count || data.results?.length || 0);
        } catch (error) {
          console.warn('Could not fetch pending approvals:', error.message);
        }
      };
      fetchPendingCount();
      // Refresh every 60 seconds
      const interval = setInterval(fetchPendingCount, 60000);
      return () => clearInterval(interval);
    }
  }, [role]);

  console.log('🎨 UnifiedProfileHeader render:', { role, loading, hasProfile: !!profile });

  // Get role-specific configuration
  const config = getRoleConfig(role);

  // FIXED: Prevent infinite loop with useCallback
  const handleProfileUpdate = useCallback((updatedProfile) => {
    console.log('📝 Profile update:', updatedProfile);
    if (onProfileUpdate) {
      // Don't trigger re-fetch, just update the profile data
      onProfileUpdate(updatedProfile);
    }
  }, [onProfileUpdate]);

  // Handle logout
  const handleLogout = useCallback(() => {
    console.log('👋 Logging out...');
    clearCacheOnLogout();
    logout();
    navigate('/login');
  }, [navigate]);

  // Loading State
  if (loading) {
    console.log('⏳ Showing loading state');
    return (
      <div style={styles.loadingContainer}>
        <LoadingSpinner size="medium" message="Loading profile..." />
      </div>
    );
  }

  // No profile error state
  if (!profile) {
    console.error('❌ No profile data provided');
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>Unable to load profile</p>
        <button onClick={() => window.location.reload()} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  // FIXED: Use new getProfileName helper with multiple fallbacks
  const fullName = getProfileName(profile, config);
  // For mobile: use first name only, or truncate if still too long
  const firstName = fullName.split(' ')[0];
  const displayName = isMobile ? firstName : fullName;
  const idValue = profile[config.idField] || config.idFallback;
  const profilePhoto = profile?.profile_photo_url || config.avatarFallback;
  const firstLetter = fullName.charAt(0).toUpperCase();

  console.log('📊 Profile data:', {
    displayName,
    idValue,
    hasPhoto: !!profile?.profile_photo_url,
    photoUrl: profilePhoto,
  });

  // Render settings modal based on role
  const renderSettingsModal = () => {
    if (!isSettingsOpen) return null;

    const modalProps = {
      isOpen: isSettingsOpen,
      onClose: () => {
        console.log('🚪 Closing settings modal');
        setIsSettingsOpen(false);
      },
      profile: profile,
      onProfileUpdate: handleProfileUpdate,
    };

    console.log('🔧 Rendering settings modal for:', role);

    switch (role) {
      case 'Teacher':
        return <TeacherSettingsModal {...modalProps} />;
      case 'Admin':
        return <AdminSettingsModal {...modalProps} />;
      case 'Student':
        return <StudentSettingsModal {...modalProps} />;
      case 'BDM':
        return <BDMSettingsModal {...modalProps} />;
      default:
        console.warn('⚠️ Unknown role for modal:', role);
        return null;
    }
  };

  // Get responsive styles
  const responsiveStyles = getResponsiveStyles(isMobile, isTablet);

  return (
    <>
      <div style={responsiveStyles.container}>
        {/* Large Avatar - Left (hidden on mobile) */}
        {!isMobile && (
          <img
            src={profilePhoto}
            alt={displayName}
            style={{
              ...styles.avatar,
              width: isTablet ? '80px' : `${config.avatarSize}px`,
              height: isTablet ? '80px' : `${config.avatarSize}px`,
            }}
            onError={(e) => {
              console.log('⚠️ Avatar load error, using fallback');
              e.target.src = config.avatarFallback;
            }}
          />
        )}

        {/* Middle Section - ID, Welcome, Role, Details */}
        <div style={responsiveStyles.middleSection}>
          {/* Top Row: ID and Welcome with Role */}
          <div style={responsiveStyles.topRow}>
            <div style={styles.leftColumn}>
              {/* Mobile: Show small avatar inline with name */}
              {isMobile && (
                <div style={responsiveStyles.mobileAvatarRow}>
                  <img
                    src={profilePhoto}
                    alt={displayName}
                    style={responsiveStyles.mobileAvatar}
                    onError={(e) => {
                      e.target.src = config.avatarFallback;
                    }}
                  />
                  <div style={responsiveStyles.mobileNameContainer}>
                    <h1 style={{
                      ...responsiveStyles.welcomeText,
                      color: config.colors.accent || '#FFFFFF',
                    }}>
                      {displayName}
                    </h1>
                    <span style={responsiveStyles.roleText}>
                      {config.roleName}
                    </span>
                  </div>
                </div>
              )}

              {/* Desktop/Tablet: Original layout */}
              {!isMobile && (
                <>
                  {/* ID Display */}
                  <div style={responsiveStyles.empId}>
                    {config.idPrefix} {idValue}
                  </div>

                  {/* Welcome Text and Role on same line */}
                  <div style={responsiveStyles.welcomeRow}>
                    <h1 style={{
                      ...responsiveStyles.welcomeText,
                      color: config.colors.accent || '#FFFFFF',
                    }}>
                      Welcome, {displayName}
                    </h1>
                    <span style={responsiveStyles.roleText}>
                      Role : {config.roleName}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Row: Details with vertical separators (hidden on mobile) */}
          {!isMobile && (
            <div style={responsiveStyles.detailsRow}>
              {config.details.slice(0, isTablet ? 2 : config.details.length).map((detail, index) => {
                const value = getDetailValue(profile, detail);

                return (
                  <div
                    key={detail.key}
                    style={{
                      ...styles.detailBlock,
                      borderRight: detail.noBorder ? 'none' : '1px solid rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    <span style={styles.label}>{detail.label}</span>
                    <span style={styles.verticalSeparator}></span>
                    <span>{value}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Icons Section */}
        <div style={responsiveStyles.iconContainer}>
          {/* Notifications (Teachers Only) */}
          {config.features.showNotifications && (
            <NotificationPanel onNotificationClick={onNotificationClick} />
          )}

          {/* Messages (Teachers Only) - hidden on mobile */}
          {config.features.showMessages && !isMobile && (
            <button
              style={responsiveStyles.iconButton}
              aria-label="Messages"
              title="Messages"
              className="profile-icon-button"
            >
              <svg style={responsiveStyles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
          )}

          {/* Tasks (Teachers & BDMs) */}
          {config.features.showTasks && (
            <TaskPanel />
          )}

          {/* Approvals (Admin Only) */}
          {role === 'Admin' && (
            <button
              style={{
                ...responsiveStyles.iconButton,
                position: 'relative',
              }}
              aria-label="Pending Approvals"
              title={`Pending Approvals${pendingApprovals > 0 ? ` (${pendingApprovals})` : ''}`}
              onClick={() => setIsApprovalModalOpen(true)}
              className="profile-icon-button"
            >
              <svg style={responsiveStyles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              {pendingApprovals > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: COLORS.status.error,
                  color: 'white',
                  borderRadius: '50%',
                  width: isMobile ? '16px' : '20px',
                  height: isMobile ? '16px' : '20px',
                  fontSize: isMobile ? '10px' : '11px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(0,0,0,0.2)',
                }}>
                  {pendingApprovals > 9 ? '9+' : pendingApprovals}
                </span>
              )}
            </button>
          )}

          {/* Settings (All Roles) */}
          {config.features.showSettings && (
            <button
              style={responsiveStyles.iconButton}
              aria-label="Settings"
              title="Profile Settings"
              onClick={() => {
                console.log('⚙️ Opening settings modal');
                setIsSettingsOpen(true);
              }}
              className="profile-icon-button"
            >
              <svg style={responsiveStyles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}

          {/* Small Avatar (All Roles) - hidden on mobile */}
          {config.features.showSmallAvatar && !isMobile && (
            <img
              src={profilePhoto}
              alt={displayName}
              style={styles.smallAvatar}
              onError={(e) => {
                e.target.src = config.avatarFallback;
              }}
            />
          )}

          {/* Logout (All Roles) */}
          {config.features.showLogout && (
            <button
              style={responsiveStyles.iconButton}
              aria-label="Logout"
              title="Logout"
              onClick={handleLogout}
              className="profile-icon-button"
            >
              <svg style={responsiveStyles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>

        {/* Bottom Border - removed for transparent blending */}
      </div>

      {/* Settings Modal - Role-specific */}
      {renderSettingsModal()}

      {/* Approval Modal - Admin Only */}
      {role === 'Admin' && (
        <ApprovalModal
          isOpen={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          onApprovalComplete={() => {
            // Refresh pending count after approval action
            reportRequestService.fetchPendingRequests()
              .then(data => setPendingApprovals(data.count || data.results?.length || 0))
              .catch(() => {});
          }}
        />
      )}
    </>
  );
};

// Responsive styles generator
const getResponsiveStyles = (isMobile, isTablet) => ({
  container: {
    position: 'relative',
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'stretch' : 'flex-start',
    gap: isMobile ? SPACING.sm : SPACING.xl,
    background: 'transparent',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: 'none',
    padding: isMobile ? SPACING.sm : isTablet ? SPACING.lg : `${SPACING.lg} 0`,
    marginBottom: SPACING.lg,
    borderRadius: 0,
    boxShadow: 'none',
    overflow: 'visible', // Prevent truncation
  },
  middleSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: isMobile ? SPACING.xs : SPACING.sm,
    paddingTop: isMobile ? 0 : SPACING.xs,
    minWidth: 0, // Allow flex item to shrink
    overflow: 'visible',
  },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  empId: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#A5F3FC', // Light Cyan for Emp ID
    fontFamily: 'Inter, sans-serif',
    margin: 0,
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  },
  welcomeRow: {
    display: 'flex',
    flexDirection: isTablet ? 'column' : 'row',
    alignItems: isTablet ? 'flex-start' : 'baseline',
    gap: isTablet ? SPACING.xs : SPACING.xl,
    flexWrap: 'wrap',
  },
  welcomeText: {
    fontSize: isMobile ? FONT_SIZES.base : isTablet ? '22px' : '26px',
    fontWeight: FONT_WEIGHTS.bold,
    fontFamily: 'Montserrat, sans-serif',
    margin: 0,
    lineHeight: isMobile ? '1.2' : '26px',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    wordBreak: 'break-word',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: isMobile ? 'nowrap' : 'normal',
  },
  roleText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#67E8F9', // Light Cyan for Role
    fontFamily: 'Inter, sans-serif',
    margin: 0,
    whiteSpace: 'nowrap',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  },
  detailsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: SPACING.sm,
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter, sans-serif',
    paddingTop: SPACING.xs,
    flexWrap: 'wrap',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  },
  iconContainer: {
    display: 'flex',
    flexDirection: 'row', // Always horizontal for icons
    gap: isMobile ? SPACING.xs : SPACING.sm,
    alignItems: 'center',
    paddingTop: isMobile ? 0 : SPACING.sm,
    flexShrink: 0,
    position: isMobile ? 'absolute' : 'relative',
    top: isMobile ? SPACING.sm : 'auto',
    right: isMobile ? SPACING.sm : 'auto',
  },
  iconButton: {
    padding: isMobile ? '6px' : SPACING.xs,
    background: isMobile ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    cursor: 'pointer',
    color: 'rgba(255, 255, 255, 0.9)',
    transition: `all ${TRANSITIONS.normal} ease`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: isMobile ? '36px' : TOUCH_TARGETS.minimum,
    minHeight: isMobile ? '36px' : TOUCH_TARGETS.minimum,
  },
  icon: {
    width: isMobile ? '20px' : '32px',
    height: isMobile ? '20px' : '32px',
  },
  // Mobile-specific styles
  mobileAvatarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingRight: '130px', // Space for horizontal icons row
  },
  mobileAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: BORDER_RADIUS.full,
    objectFit: 'cover',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    flexShrink: 0,
  },
  mobileNameContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
    flex: 1,
    overflow: 'hidden',
  },
});

// Styles
const styles = {
  loadingContainer: {
    background: 'transparent',
    padding: SPACING['2xl'],
    marginBottom: SPACING.lg,
  },
  errorContainer: {
    background: 'rgba(254, 226, 226, 0.9)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    borderRadius: BORDER_RADIUS.sm,
    textAlign: 'center',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#991B1B',
    fontSize: FONT_SIZES.base,
    margin: `0 0 ${SPACING.sm} 0`,
  },
  retryButton: {
    backgroundColor: COLORS.status.error,
    color: COLORS.text.white,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    border: 'none',
    borderRadius: BORDER_RADIUS.xs,
    cursor: 'pointer',
    fontSize: FONT_SIZES.sm,
  },
  container: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: SPACING.xl,
    background: 'transparent',
    padding: `${SPACING.lg} 0`,
    marginBottom: SPACING.lg,
  },
  avatar: {
    borderRadius: BORDER_RADIUS.full,
    objectFit: 'cover',
    flexShrink: 0,
    border: '3px solid rgba(255, 255, 255, 0.3)',
    boxShadow: SHADOWS.md,
  },
  middleSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
    flex: 1,
  },
  empId: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#A5F3FC', // Light Cyan for Emp ID
    fontFamily: 'Inter, sans-serif',
    margin: 0,
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  },
  welcomeRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: SPACING.xl,
  },
  welcomeText: {
    fontSize: '26px',
    fontWeight: FONT_WEIGHTS.bold,
    fontFamily: 'Montserrat, sans-serif',
    margin: 0,
    lineHeight: '26px',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  roleText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#67E8F9', // Light Cyan for Role
    fontFamily: 'Inter, sans-serif',
    margin: 0,
    whiteSpace: 'nowrap',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  },
  detailsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter, sans-serif',
    paddingTop: SPACING.xs,
    flexWrap: 'wrap',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  },
  detailBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingRight: SPACING.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    whiteSpace: 'nowrap',
  },
  label: {
    fontWeight: FONT_WEIGHTS.bold,
    marginRight: SPACING.xs,
    color: '#FDE68A', // Light Yellow for labels
  },
  verticalSeparator: {
    borderRight: '1px solid rgba(255, 255, 255, 0.3)',
    height: '10px',
    display: 'inline-block',
    margin: `0 ${SPACING.xs}`,
  },
  iconContainer: {
    display: 'flex',
    gap: SPACING.sm,
    alignItems: 'flex-start',
    paddingTop: SPACING.sm,
  },
  iconButton: {
    padding: SPACING.xs,
    background: 'transparent',
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    cursor: 'pointer',
    color: 'rgba(255, 255, 255, 0.9)',
    transition: `all ${TRANSITIONS.base} ease`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: '32px',
    height: '32px',
  },
  smallAvatar: {
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: BORDER_RADIUS.full,
    objectFit: 'cover',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    boxShadow: SHADOWS.xs,
  },
  bottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3) 50%, transparent)',
  },
};

// Add hover styles via CSS
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    .profile-icon-button:hover {
      background-color: rgba(255, 255, 255, 0.2) !important;
      color: #FFFFFF !important;
    }
  `;
  if (!document.head.querySelector('style[data-unified-profile-header-styles]')) {
    styleSheet.setAttribute('data-unified-profile-header-styles', 'true');
    document.head.appendChild(styleSheet);
  }
}

export default UnifiedProfileHeader;