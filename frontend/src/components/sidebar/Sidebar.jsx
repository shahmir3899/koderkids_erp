// ============================================
// MAIN SIDEBAR COMPONENT
// ============================================
// Location: src/components/sidebar/Sidebar.jsx

import React, { useState, useEffect } from 'react';
import { COLORS, SIDEBAR, MIXINS, SHADOWS, Z_INDEX } from '../../utils/designConstants';
import { useSidebar } from '../../hooks/useSidebar';
import { useResponsive } from '../../hooks/useResponsive';
import SidebarHeader from './SidebarHeader';
import SidebarNav from './SidebarNav';
import SidebarFooter from './SidebarFooter';
import { getAdminProfile } from '../../services/adminService';
import { getTeacherProfile } from '../../services/teacherService';
import { getStudentProfile } from '../../services/studentService';
import { getBDMProfile } from '../../services/bdmService';

/**
 * Main Sidebar Component
 * Glassmorphic collapsible sidebar with role-based navigation
 *
 * Desktop (>=1024px): Fixed sidebar with expand/collapse (280px / 80px)
 * Mobile/Tablet (<1024px): Hidden by default, overlay drawer via hamburger button
 *
 * @param {boolean} sidebarOpen - Optional controlled open state (desktop)
 * @param {function} setSidebarOpen - Optional controlled setter (desktop)
 * @param {boolean} mobileSidebarVisible - Controls overlay visibility on mobile/tablet
 * @param {function} setMobileSidebarVisible - Callback to close overlay on mobile/tablet
 */
const Sidebar = ({ sidebarOpen, setSidebarOpen, mobileSidebarVisible, setMobileSidebarVisible }) => {
  // Detect mobile/tablet to use overlay mode
  const { isMobile, isTablet } = useResponsive();
  const isMobileOrTablet = isMobile || isTablet;

  // Use internal state if not controlled (desktop only)
  const {
    isOpen: internalIsOpen,
    openDropdowns,
    toggleSidebar: internalToggle,
    toggleDropdown,
  } = useSidebar(!isMobileOrTablet);

  // Desktop: use props if provided, otherwise use internal state
  const isOpen = sidebarOpen !== undefined ? sidebarOpen : internalIsOpen;
  const toggleSidebar = setSidebarOpen
    ? () => setSidebarOpen(!sidebarOpen)
    : internalToggle;

  // Get user info from localStorage
  const username = localStorage.getItem('fullName') || 'Unknown';
  const role = localStorage.getItem('role') || 'Unknown';

  // State for profile photo
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);

  // Fetch profile photo on mount
  useEffect(() => {
    const fetchProfilePhoto = async () => {
      try {
        let profileService;
        switch (role) {
          case 'Admin':
            profileService = getAdminProfile;
            break;
          case 'Teacher':
            profileService = getTeacherProfile;
            break;
          case 'Student':
            profileService = getStudentProfile;
            break;
          case 'BDM':
            profileService = getBDMProfile;
            break;
          default:
            return;
        }

        const profileData = await profileService();
        if (profileData?.profile_photo_url) {
          setProfilePhotoUrl(profileData.profile_photo_url);
        }
      } catch (error) {
        console.error('Failed to fetch profile photo for sidebar:', error);
      }
    };

    if (role && role !== 'Unknown') {
      fetchProfilePhoto();
    }
  }, [role]);

  // Close mobile overlay when a nav item is clicked
  const handleMobileNavigate = () => {
    if (isMobileOrTablet && setMobileSidebarVisible) {
      setMobileSidebarVisible(false);
    }
  };

  // Close mobile overlay
  const closeMobileSidebar = () => {
    if (setMobileSidebarVisible) {
      setMobileSidebarVisible(false);
    }
  };

  // =============================================
  // MOBILE / TABLET: Overlay Drawer
  // =============================================
  if (isMobileOrTablet) {
    return (
      <>
        {/* Overlay backdrop */}
        {mobileSidebarVisible && (
          <div
            style={styles.mobileOverlay}
            onClick={closeMobileSidebar}
          />
        )}

        {/* Slide-in drawer */}
        <aside style={styles.mobileDrawer(mobileSidebarVisible)}>
          <SidebarHeader
            isOpen={true}
            onToggle={closeMobileSidebar}
            isMobileOverlay={true}
          />

          <SidebarNav
            isOpen={true}
            openDropdowns={openDropdowns}
            toggleDropdown={toggleDropdown}
            role={role}
            onNavigate={handleMobileNavigate}
          />

          <SidebarFooter
            isOpen={true}
            username={username}
            role={role}
            profilePhotoUrl={profilePhotoUrl}
          />
        </aside>
      </>
    );
  }

  // =============================================
  // DESKTOP: Fixed sidebar with expand/collapse
  // =============================================
  return (
    <>
      {/* Gradient Background */}
      <div style={styles.gradientBackground} />

      {/* Sidebar Container */}
      <aside style={styles.sidebar(isOpen)}>
        <SidebarHeader isOpen={isOpen} onToggle={toggleSidebar} />

        <SidebarNav
          isOpen={isOpen}
          openDropdowns={openDropdowns}
          toggleDropdown={toggleDropdown}
          role={role}
        />

        <SidebarFooter
          isOpen={isOpen}
          username={username}
          role={role}
          profilePhotoUrl={profilePhotoUrl}
        />
      </aside>
    </>
  );
};

const styles = {
  // Animated gradient background
  gradientBackground: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, #8B5CF6 50%, #2362ab 100%)`,
    zIndex: 0,
    pointerEvents: 'none',
  },

  // Desktop sidebar container
  sidebar: (isOpen) => ({
    position: 'fixed',
    left: 0,
    top: 0,
    height: '100vh',
    width: isOpen ? SIDEBAR.expandedWidth : SIDEBAR.collapsedWidth,
    transition: `width ${SIDEBAR.transitionDuration} ${SIDEBAR.transitionEasing}`,
    zIndex: Z_INDEX.sidebar,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',

    // Enhanced glassmorphic effect
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    border: 'none',
    borderRight: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
  }),

  // Mobile overlay backdrop
  mobileOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: Z_INDEX.mobileOverlay,
    animation: 'sidebarFadeIn 0.3s ease-out',
  },

  // Mobile slide-in drawer
  mobileDrawer: (visible) => ({
    position: 'fixed',
    left: 0,
    top: 0,
    height: '100vh',
    width: SIDEBAR.mobileWidth,
    transform: visible ? 'translateX(0)' : 'translateX(-100%)',
    transition: `transform ${SIDEBAR.transitionDuration} ${SIDEBAR.transitionEasing}`,
    zIndex: Z_INDEX.mobileSidebar,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',

    // Same glassmorphic styling as desktop
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    border: 'none',
    borderRight: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
  }),
};

export default Sidebar;
