// ============================================
// PROFILE HEADER - Teacher Profile (Figma Design)
// ============================================
// Location: src/components/teacher/ProfileHeaderFigma.js

import React, { useState } from 'react';
import moment from 'moment';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { NotificationPanel } from '../common/ui/NotificationPanel';
import { TeacherSettingsModal } from './TeacherSettingsModal';

/**
 * ProfileHeaderFigma Component
 * Horizontal layout matching Figma specifications
 * 
 * @param {Object} props
 * @param {Object} props.profile - Teacher profile data from API
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onProfileUpdate - Callback when profile is updated
 */
export const ProfileHeaderFigma = ({ profile, loading, onProfileUpdate }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <LoadingSpinner size="medium" message="Loading profile..." />
      </div>
    );
  }

  // Extract profile data with fallbacks
  const displayName = profile?.full_name || profile?.first_name 
    ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() 
    : 'Unknown';
  const employeeId = profile?.employee_id || 'Not Assigned';
  const role = localStorage.getItem('role') || 'Teacher';
  const gender = profile?.gender || 'Not Set';
  const joiningDate = profile?.date_of_joining 
    ? moment(profile.date_of_joining).format('DD-MMM-YYYY') 
    : 'Not Set';
  const bloodGroup = profile?.blood_group || 'Not Set';
  const schoolNames = profile?.school_names?.join(', ') || 'No Schools Assigned';
  const profilePhoto = profile?.profile_photo_url || '/images/teacher-avatar.jpg';

  // Handle notification click
  const handleNotificationClick = (url) => {
    if (url) {
      window.location.href = url;
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <>
      <div style={styles.container}>
        {/* Avatar */}
        <img
          src={profilePhoto}
          alt={displayName}
          style={styles.avatar}
          onError={(e) => {
            e.target.src = '/images/teacher-avatar.jpg';
          }}
        />

        {/* Middle Section - Emp # & Welcome & Details */}
        <div style={styles.middleSection}>
          {/* Top Row: Emp # and Welcome with Role */}
          <div style={styles.topRow}>
            <div style={styles.leftColumn}>
              {/* Employee ID */}
              <div style={styles.empId}>
                Emp # {employeeId}
              </div>
              
              {/* Welcome Text and Role on same line */}
              <div style={styles.welcomeRow}>
                <h1 style={styles.welcomeText}>
                  Welcome, {displayName}
                </h1>
                <span style={styles.roleText}>
                  Role : {role}
                                  </span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Details with vertical separators between label and value */}
          <div style={styles.detailsRow}>
            {/* Gender + Separator + Value */}
            <div style={styles.detailBlock}>
              <span style={styles.label}>Gender</span>
              <span style={styles.verticalSeparator}></span>
              <span>{gender}</span>
            </div>

            {/* Joining Date + Separator + Value */}
            <div style={styles.detailBlock}>
              <span style={styles.label}>Joining Date</span>
              <span style={styles.verticalSeparator}></span>
              <span>{joiningDate}</span>
            </div>

            {/* Blood Group + Separator + Value */}
            <div style={styles.detailBlock}>
              <span style={styles.label}>Blood Group</span>
              <span style={styles.verticalSeparator}></span>
              <span>{bloodGroup}</span>
            </div>

            {/* In-charge + Separator + Value */}
            <div style={{...styles.detailBlock, borderRight: 'none'}}>
              <span style={styles.label}>In-charge of School</span>
              <span style={styles.verticalSeparator}></span>
              <span>{schoolNames}</span>
            </div>
          </div>
        </div>

        {/* Right Icons */}
        <div style={styles.iconContainer}>
          {/* Notifications */}
          <NotificationPanel onNotificationClick={handleNotificationClick} />
          
          {/* Messages */}
          <button 
            style={styles.iconButton} 
            aria-label="Messages"
            title="Messages"
          >
            <svg style={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
          
          {/* Settings */}
          <button 
            style={styles.iconButton} 
            aria-label="Settings"
            title="Profile Settings"
            onClick={() => setIsSettingsOpen(true)}
          >
            <svg style={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* User Avatar (small) */}
          <img
            src={profilePhoto}
            alt={displayName}
            style={styles.smallAvatar}
            onError={(e) => {
              e.target.src = '/images/teacher-avatar.jpg';
            }}
          />

          {/* Logout Icon */}
          <button 
            style={styles.iconButton} 
            aria-label="Logout"
            title="Logout"
            onClick={handleLogout}
          >
            <svg style={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {/* Bottom Border */}
        <div style={styles.bottomBorder} />
      </div>

      {/* Settings Modal */}
      <TeacherSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onProfileUpdate={onProfileUpdate}
      />
    </>
  );
};

// Styles
const styles = {
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    padding: '3rem',
    marginBottom: '2rem',
  },
  container: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '2rem',
    backgroundColor: '#FFFFFF',
    padding: '2rem 3rem',
    marginBottom: '0',
  },
  avatar: {
    width: '101px',
    height: '101px',
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
    border: '3px solid #F3F4F6',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  middleSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    paddingTop: '0.5rem',
  },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    flex: 1,
  },
  empId: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#666666',
    fontFamily: 'Inter, sans-serif',
    margin: 0,
  },
  welcomeRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '2rem', // Space between name and role (matching Figma ~36% position)
  },
  welcomeText: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#B061CE',
    fontFamily: 'Montserrat, sans-serif',
    margin: 0,
    lineHeight: '26px',
  },
  roleText: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#666666',
    fontFamily: 'Inter, sans-serif',
    margin: 0,
    whiteSpace: 'nowrap',
  },
  detailsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',  // ← ADD THIS

    fontSize: '10px',
    color: '#666666',
    fontFamily: 'Inter, sans-serif',
    paddingTop: '0.5rem',
    flexWrap: 'wrap', // Allow wrapping on smaller screens
  },
  detailItem: {
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  detailBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    paddingRight: '1rem',
    //borderRight: '1px solid #D2D2D2',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  label: {
    fontWeight: '700', // CHANGED: Increased from '600' to '700' to make labels bolder
    marginRight: '0.25rem',
  },
  verticalSeparator: {
    borderRight: '1px solid #D2D2D2',
    height: '10px',
    display: 'inline-block',
    margin: '0 0.25rem',
  },
  iconContainer: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start',
    paddingTop: '1rem',
  },
  iconButton: {
    padding: '0.5rem',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#666666',
    transition: 'all 0.2s ease',
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
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #F3F4F6',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  bottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '1px',
    backgroundColor: '#D2D2D2',
  },
};

// Add hover styles via CSS
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    .profile-icon-button:hover {
      background-color: #F3F4F6 !important;
      color: #1F2937 !important;
    }
  `;
  if (!document.head.querySelector('style[data-profile-header-styles]')) {
    styleSheet.setAttribute('data-profile-header-styles', 'true');
    document.head.appendChild(styleSheet);
  }
}

export default ProfileHeaderFigma;