// ============================================
// PROFILE HEADER - Teacher Profile Section
// ============================================

import React from 'react';
import moment from 'moment';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';

/**
 * ProfileHeader Component
 * @param {Object} props
 * @param {Object} props.user - User data object
 * @param {boolean} props.loading - Loading state
 */
export const ProfileHeader = ({ user, loading }) => {
  if (loading) {
    return (
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        borderRadius: '16px', 
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
        padding: '3rem',
        marginBottom: '2rem'
      }}>
        <LoadingSpinner size="medium" message="Loading profile..." />
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      backgroundColor: '#FFFFFF',
      borderRadius: '16px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
      overflow: 'hidden',
      marginBottom: '2rem',
    }}>
      <div style={{ padding: '3rem', position: 'relative' }}>
        {/* Teacher Avatar */}
        <img
          src={user?.profile_photo || "/images/teacher-avatar.jpg"}
          alt="Teacher"
          style={{
            position: 'absolute',
            left: '3rem',
            top: '3rem',
            width: '7rem',
            height: '7rem',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '4px solid #F3F4F6',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        />

        {/* Welcome Text */}
        <h1 style={{
          position: 'absolute',
          left: '13rem',
          top: '5rem',
          fontSize: '1.875rem',
          fontWeight: '800',
          color: '#7C3AED',
          fontFamily: 'Montserrat, sans-serif',
          margin: 0,
        }}>
          Welcome, {user?.fullName || 'Unknown'}
        </h1>

        {/* Right Icons */}
        <div style={{
          position: 'absolute',
          right: '3rem',
          top: '3rem',
          display: 'flex',
          gap: '1.75rem',
        }}>
          <button style={iconButtonStyle} aria-label="Notifications">
            <svg style={{ width: '2rem', height: '2rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button style={iconButtonStyle} aria-label="Messages">
            <svg style={{ width: '2rem', height: '2rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
          <button style={iconButtonStyle} aria-label="Settings">
            <svg style={{ width: '2rem', height: '2rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Profile Details Grid */}
        <div style={{
          marginTop: '9rem',
          marginLeft: '12rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '0.75rem 3rem',
          fontSize: '0.875rem',
        }}>
          <span style={labelStyle}>Emp #</span>
          <span style={{ ...valueStyle, gridColumn: 'span 2' }}>{user?.employee_id || '21556'}</span>

          <span style={labelStyle}>Role:</span>
          <span style={{ ...valueStyle, gridColumn: 'span 2' }}>{localStorage.getItem('role') || 'Teacher'}</span>

          <span style={labelStyle}>Gender</span>
          <span style={valueStyle}>{user?.gender || 'Female'}</span>

          <span style={labelStyle}>Joining Date</span>
          <span style={valueStyle}>
            {user?.joining_date ? moment(user.joining_date).format('DD-MMM-YYYY') : '29-Nov-2025'}
          </span>

          <span style={labelStyle}>Blood Group</span>
          <span style={valueStyle}>{user?.blood_group || 'A+'}</span>

          <span style={labelStyle}>Schools</span>
          <span style={{ ...valueStyle, gridColumn: 'span 5' }}>
            {user?.school_name || 'Creative School Gauri Town'}
          </span>
        </div>

        {/* Bottom Border */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '3rem',
          right: '3rem',
          height: '1px',
          backgroundColor: '#D1D5DB',
        }} />
      </div>
    </div>
  );
};

// Styles
const iconButtonStyle = {
  padding: '0.75rem',
  background: 'transparent',
  border: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
  color: '#6B7280',
  transition: 'background-color 0.2s ease',
};

const labelStyle = {
  color: '#6B7280',
  fontWeight: '600',
};

const valueStyle = {
  color: '#1F2937',
  fontWeight: '600',
};

export default ProfileHeader;