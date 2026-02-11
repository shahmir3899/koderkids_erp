// ============================================
// SIDEBAR FOOTER COMPONENT – WITH PROFILE PHOTO
// ============================================
// Location: src/components/sidebar/SidebarFooter.jsx

import React from 'react';
import { COLORS, SIDEBAR, BORDER_RADIUS, TRANSITIONS } from '../../utils/designConstants';
import LogoutButton from '../LogoutButton';

/**
 * SidebarFooter Component
 * Displays user profile photo (preferred), name, role, and logout button
 *
 * @param {boolean} isOpen - Whether sidebar is expanded
 * @param {string} username - User's display name
 * @param {string} role - User's role
 * @param {string} [profilePhotoUrl] - URL to the user's profile photo (optional)
 */
const SidebarFooter = ({ isOpen, username = 'Unknown', role = 'User', profilePhotoUrl }) => {
  // Generate initials as fallback
  const getInitials = (name) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(username);

  return (
    <div style={styles.footer}>
      <div style={styles.userProfile(isOpen)}>
        {/* Avatar container */}
        <div style={styles.avatar}>
          {/* Profile photo – shown when URL exists */}
          {profilePhotoUrl && (
            <img
              src={profilePhotoUrl}
              alt={`${username} profile photo`}
              style={styles.avatarImage}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}

          {/* Initials fallback – shown when no photo or load error */}
          <div
            style={{
              ...styles.initialsFallback,
              display: profilePhotoUrl ? 'none' : 'flex',
            }}
          >
            {initials}
          </div>
        </div>

        {/* User Info and Logout (shown when expanded) */}
        {isOpen && (
          <>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{username}</span>
              <span style={styles.userRole}> ({role})</span>
            </div>
            <LogoutButton style={styles.logoutBtn} />
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '0.75rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
  },

  userProfile: (isOpen) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.375rem',
    borderRadius: '10px',
    transition: `all ${TRANSITIONS.normal} ease`,
    justifyContent: isOpen ? 'flex-start' : 'center',
  }),

  avatar: {
    width: '30px',
    height: '30px',
    minWidth: '30px',
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 600,
    fontSize: '12px',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%',
  },

  initialsFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 600,
    fontSize: '12px',
  },

  userInfo: {
    flex: 1,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.25rem',
    minWidth: 0,
  },

  userName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'white',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },

  userRole: {
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    flexShrink: 0,
  },

  logoutBtn: {
    flexShrink: 0,
    padding: '5px',
    minWidth: '28px',
    height: '28px',
  },
};

export default SidebarFooter;
