// ============================================
// STUDENT SETTINGS MODAL - Profile Settings & Password Change
// NEW FILE: frontend/src/components/student/StudentSettingsModal.js
// ============================================

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { updateStudentProfile } from '../../services/studentService';
import { PasswordChangeForm } from '../common/forms/PasswordChangeForm';
import { changePassword } from '../../services/authService';

/**
 * StudentSettingsModal Component
 * Modal form for students to update their profile and change password
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} props.profile - Current profile data
 * @param {Function} props.onProfileUpdate - Callback when profile is updated
 */
export const StudentSettingsModal = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdate,
}) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Initialize form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
      });
    }
  }, [profile]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle password change
  const handlePasswordChange = async (passwordData) => {
    console.log('🔐 Student password change triggered');
    setPasswordError('');
    setIsChangingPassword(true);

    try {
      console.log('📡 Calling change password API...');
      const result = await changePassword(passwordData);
      console.log('✅ API Success:', result);
      
      toast.success('✅ Password changed successfully!');
      setActiveTab('personal'); // Switch back to personal tab
      
    } catch (error) {
      console.error('❌ Password change failed:', error);
      console.error('❌ Error response:', error.response?.data);
      
      // Handle different error types
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.current_password) {
          setPasswordError(errorData.current_password[0] || 'Current password is incorrect.');
        } else if (errorData.new_password) {
          setPasswordError(errorData.new_password[0] || 'Invalid new password.');
        } else if (errorData.confirm_password) {
          setPasswordError(errorData.confirm_password[0] || 'Passwords do not match.');
        } else if (errorData.detail) {
          setPasswordError(errorData.detail);
        } else {
          setPasswordError('Failed to change password. Please try again.');
        }
      } else if (error.message === 'Not authenticated') {
        setPasswordError('Session expired. Please login again.');
        toast.error('Session expired. Please login again.');
      } else {
        setPasswordError('Failed to change password. Please try again.');
      }
      
      toast.error('❌ ' + passwordError);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle form submission (for Personal Info only)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updatedProfile = await updateStudentProfile(formData);
      toast.success('Profile updated successfully!');
      
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }
      
      onClose();
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>⚙️ My Settings</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'personal' ? styles.tabActive : {}),
            }}
            onClick={() => {
              setActiveTab('personal');
              setPasswordError('');
            }}
          >
            Personal Info
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'password' ? styles.tabActive : {}),
            }}
            onClick={() => {
              setActiveTab('password');
              setPasswordError('');
            }}
          >
            Change Password
          </button>
        </div>

        {/* Content - Conditional Form Wrapper */}
        {activeTab === 'personal' && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGrid}>
              {/* First Name */}
              <div style={styles.formGroup}>
                <label style={styles.label}>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Enter first name"
                />
              </div>

              {/* Last Name */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Enter last name"
                />
              </div>

              {/* Phone */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="e.g., +92 300 1234567"
                />
              </div>

              {/* Email - Read Only */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  style={{ ...styles.input, backgroundColor: '#F3F4F6' }}
                  disabled
                />
                <small style={styles.helperText}>Contact admin to change email</small>
              </div>

              {/* School - Read Only */}
              <div style={styles.formGroup}>
                <label style={styles.label}>School</label>
                <input
                  type="text"
                  value={profile?.school || ''}
                  style={{ ...styles.input, backgroundColor: '#F3F4F6' }}
                  disabled
                />
                <small style={styles.helperText}>Assigned by admin</small>
              </div>

              {/* Class - Read Only */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Class</label>
                <input
                  type="text"
                  value={profile?.class || profile?.student_class || ''}
                  style={{ ...styles.input, backgroundColor: '#F3F4F6' }}
                  disabled
                />
                <small style={styles.helperText}>Assigned by admin</small>
              </div>

              {/* Registration Number - Read Only */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Registration Number</label>
                <input
                  type="text"
                  value={profile?.reg_num || 'Not assigned'}
                  style={{ ...styles.input, backgroundColor: '#F3F4F6' }}
                  disabled
                />
                <small style={styles.helperText}>Auto-generated ID</small>
              </div>

              {/* Username - Read Only */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Username</label>
                <input
                  type="text"
                  value={profile?.username || ''}
                  style={{ ...styles.input, backgroundColor: '#F3F4F6' }}
                  disabled
                />
                <small style={styles.helperText}>Cannot be changed</small>
              </div>

              {/* Address - Full Width */}
              <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                <label style={styles.label}>Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                  placeholder="Enter your address"
                />
              </div>
            </div>

            {/* Form Actions for Personal Info */}
            <div style={styles.actions}>
              <button
                type="button"
                onClick={onClose}
                style={styles.cancelButton}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Password Tab - NO form wrapper to avoid nesting */}
        {activeTab === 'password' && (
          <div style={styles.form}>
            <PasswordChangeForm
              onSubmit={handlePasswordChange}
              isSubmitting={isChangingPassword}
              error={passwordError}
            />
            
            {/* Close button for password tab */}
            <div style={styles.actions}>
              <button
                type="button"
                onClick={onClose}
                style={styles.cancelButton}
                disabled={isChangingPassword}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Styles
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.5rem',
    borderBottom: '1px solid #E5E7EB',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1F2937',
    margin: 0,
  },
  closeButton: {
    padding: '0.5rem',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#6B7280',
    transition: 'all 0.15s ease',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #E5E7EB',
    padding: '0 1.5rem',
  },
  tab: {
    padding: '1rem 1.5rem',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#6B7280',
    transition: 'all 0.15s ease',
  },
  tabActive: {
    color: '#10B981',
    borderBottomColor: '#10B981',
  },
  form: {
    padding: '1.5rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '0.875rem',
    transition: 'all 0.15s ease',
    outline: 'none',
  },
  helperText: {
    fontSize: '0.75rem',
    color: '#9CA3AF',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.5rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #E5E7EB',
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};

export default StudentSettingsModal;