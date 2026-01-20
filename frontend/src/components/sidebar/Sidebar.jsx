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
 * @param {boolean} sidebarOpen - Optional controlled open state
 * @param {function} setSidebarOpen - Optional controlled setter
 */
const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  // Detect mobile to collapse sidebar by default on small screens
  const { isMobile } = useResponsive();

  // Use internal state if not controlled
  // Sidebar is collapsed by default on mobile, open on desktop
  const {
    isOpen: internalIsOpen,
    openDropdowns,
    toggleSidebar: internalToggle,
    toggleDropdown,
  } = useSidebar(!isMobile);

  // Use props if provided, otherwise use internal state
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
        // Get role-specific profile service
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
            console.warn('⚠️ Unknown role for profile photo:', role);
            return;
        }

        const profileData = await profileService();
        console.log('🔍 Profile data received in sidebar:', profileData);

        if (profileData?.profile_photo_url) {
          setProfilePhotoUrl(profileData.profile_photo_url);
          console.log('✅ Profile photo loaded for sidebar:', profileData.profile_photo_url);
        } else {
          console.log('⚠️ No profile_photo_url found. Available fields:', Object.keys(profileData || {}));
        }
      } catch (error) {
        console.error('❌ Failed to fetch profile photo for sidebar:', error);
      }
    };

    if (role && role !== 'Unknown') {
      fetchProfilePhoto();
    }
  }, [role]);

  return (
    <>
      {/* Gradient Background */}
      <div style={styles.gradientBackground} />

      {/* Sidebar Container */}
      <aside style={styles.sidebar(isOpen)}>
        {/* Header: Logo + Toggle */}
        <SidebarHeader isOpen={isOpen} onToggle={toggleSidebar} />

        {/* Navigation: Menu Items */}
        <SidebarNav
          isOpen={isOpen}
          openDropdowns={openDropdowns}
          toggleDropdown={toggleDropdown}
          role={role}
        />

        {/* Footer: User Profile */}
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

  // Main sidebar container
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
};

export default Sidebar;
