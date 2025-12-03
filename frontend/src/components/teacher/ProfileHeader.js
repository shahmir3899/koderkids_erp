// ============================================
// PROFILE HEADER - Teacher Profile Section (Updated)
// ============================================
// Location: src/components/teacher/ProfileHeader.js

import React, { useState } from 'react';
import moment from 'moment';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { NotificationPanel } from '../common/ui/NotificationPanel';
import { TeacherSettingsModal } from './TeacherSettingsModal';

/**
 * ProfileHeader Component - Updated to use real API data
 * @param {Object} props
 * @param {Object} props.profile - Teacher profile data from API
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onProfileUpdate - Callback when profile is updated
 */
export const ProfileHeader = ({ profile, loading, onProfileUpdate }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <LoadingSpinner size="medium" message="Loading profile..." />
      </div>
    );
  }

  // Get display values from profile (with fallbacks)
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

  return (
    <>
      <div style={styles.container}>
        <div style={styles.content}>
          {/* Teacher Avatar */}
          <img
            src={profilePhoto}
            alt={displayName}
            style={styles.avatar}
            onError={(e) => {
              e.target.src = '/images/teacher-avatar.jpg';
            }}
          />

          {/* Welcome Text */}
          <h1 style={styles.welcomeText}>
            Welcome, {displayName}
          </h1>

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
          </div>

          {/* Profile Details Grid */}
          <div style={styles.detailsGrid}>
            {/* Row 1 */}
            <span style={styles.label}>Emp #</span>
            <span style={{ ...styles.value, gridColumn: 'span 2' }}>{employeeId}</span>

            <span style={styles.label}>Role:</span>
            <span style={{ ...styles.value, gridColumn: 'span 2' }}>{role}</span>

            <span style={styles.label}>Gender</span>
            <span style={styles.value}>{gender}</span>

            {/* Row 2 */}
            <span style={styles.label}>Joining Date</span>
            <span style={styles.value}>{joiningDate}</span>

            <span style={styles.label}>Blood Group</span>
            <span style={styles.value}>{bloodGroup}</span>

            {/* Row 3 - Schools (full width) */}
            <span style={styles.label}>Schools</span>
            <span style={{ ...styles.value, gridColumn: 'span 5' }}>{schoolNames}</span>
          </div>

          {/* Bottom Border */}
          <div style={styles.bottomBorder} />
        </div>
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
    borderRadius: '16px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
    padding: '3rem',
    marginBottom: '2rem',
  },
  container: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
    overflow: 'hidden',
    marginBottom: '2rem',
  },
  content: {
    padding: '3rem',
    position: 'relative',
  },
  avatar: {
    position: 'absolute',
    left: '3rem',
    top: '3rem',
    width: '7rem',
    height: '7rem',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '4px solid #F3F4F6',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  welcomeText: {
    position: 'absolute',
    left: '13rem',
    top: '5rem',
    fontSize: '1.875rem',
    fontWeight: '800',
    color: '#7C3AED',
    fontFamily: 'Montserrat, sans-serif',
    margin: 0,
  },
  iconContainer: {
    position: 'absolute',
    right: '3rem',
    top: '3rem',
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  iconButton: {
    padding: '0.75rem',
    background: 'transparent',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    color: '#6B7280',
    transition: 'all 0.2s ease',
  },
  icon: {
    width: '1.5rem',
    height: '1.5rem',
  },
  detailsGrid: {
    marginTop: '9rem',
    marginLeft: '12rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '0.75rem 2rem',
    fontSize: '0.875rem',
  },
  label: {
    color: '#6B7280',
    fontWeight: '600',
  },
  value: {
    color: '#1F2937',
    fontWeight: '600',
  },
  bottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: '3rem',
    right: '3rem',
    height: '1px',
    backgroundColor: '#D1D5DB',
  },
};

// Add hover styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .profile-icon-button:hover {
    background-color: #F3F4F6 !important;
    color: #1F2937 !important;
  }
  
  @media (max-width: 768px) {
    .profile-details-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      margin-left: 0 !important;
      margin-top: 12rem !important;
    }
    
    .profile-avatar {
      left: 50% !important;
      transform: translateX(-50%);
    }
    
    .profile-welcome {
      left: 0 !important;
      right: 0 !important;
      text-align: center !important;
      top: 8rem !important;
    }
  }
`;
document.head.appendChild(styleSheet);

export default ProfileHeader;