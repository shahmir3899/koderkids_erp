// ============================================
// ADMIN PROFILE HEADER - Header with Profile & Settings
// NEW FILE: frontend/src/components/admin/AdminProfileHeader.js
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminProfile } from '../../services/adminService';
import { AdminSettingsModal } from './AdminSettingsModal';
import { logout } from '../../utils/authHelpers';

/**
 * AdminProfileHeader Component
 * Displays admin profile info with settings and logout
 */
export const AdminProfileHeader = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch admin profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const data = await getAdminProfile();
      setProfile(data);
    } catch (error) {
      console.error('❌ Error loading admin profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfileUpdate = (updatedProfile) => {
    setProfile(updatedProfile);
  };

  if (isLoading) {
    return (
      <div style={styles.header}>
        <div style={styles.leftSection}>
          <img 
            src="/whiteLogo.png" 
            alt="Koder Kids Logo" 
            style={styles.logo}
          />
          <h1 style={styles.title}>Admin Dashboard</h1>
        </div>
        <div style={styles.rightSection}>
          <div style={styles.loadingText}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={styles.header}>
        {/* Left Section - Logo & Title */}
        <div style={styles.leftSection}>
          <img 
            src="/whiteLogo.png" 
            alt="Koder Kids Logo" 
            style={styles.logo}
          />
          <h1 style={styles.title}>Admin Dashboard</h1>
        </div>

        {/* Right Section - Profile */}
        <div style={styles.rightSection}>
          {/* Profile Info */}
          <div style={styles.profileInfo}>
            <div style={styles.textInfo}>
              <p style={styles.name}>{profile?.full_name || 'Admin'}</p>
              <p style={styles.role}>{profile?.employee_id || 'Administrator'}</p>
            </div>
            
            {/* Profile Photo */}
            <div style={styles.photoContainer}>
              {profile?.profile_photo_url ? (
                <img 
                  src={profile.profile_photo_url} 
                  alt="Profile" 
                  style={styles.photo}
                />
              ) : (
                <div style={styles.photoPlaceholder}>
                  {(profile?.full_name || 'A').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Settings Icon */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            style={styles.iconButton}
            title="Settings"
          >
            <svg style={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={styles.logoutButton}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#EF4444'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#DC2626'}
          >
            <svg style={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <AdminSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          profile={profile}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </>
  );
};

// Styles
const styles = {
  header: {
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    marginBottom: '2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  logo: {
    height: '3rem',
    width: 'auto',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: 0,
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  profileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  textInfo: {
    textAlign: 'right',
  },
  name: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: '600',
  },
  role: {
    margin: 0,
    fontSize: '0.875rem',
    opacity: 0.9,
  },
  photoContainer: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '2px solid #FFFFFF',
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#7C3AED',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  iconButton: {
    padding: '0.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#FFFFFF',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#DC2626',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#FFFFFF',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  icon: {
    width: '1.25rem',
    height: '1.25rem',
  },
  loadingText: {
    fontSize: '0.875rem',
    opacity: 0.9,
  },
};

export default AdminProfileHeader;