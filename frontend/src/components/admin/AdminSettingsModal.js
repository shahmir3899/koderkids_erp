// ============================================
// ADMIN SETTINGS MODAL - Profile Settings & Password Change
// UPDATED: Now uses generic ProfilePhotoUploader with admin functions
// FILE: frontend/src/components/admin/AdminSettingsModal.js
// ============================================

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { updateAdminProfile, uploadAdminPhoto, deleteAdminPhoto } from '../../services/adminService';
import { ProfilePhotoUploader } from '../common/ProfilePhotoUploader'; // ← Updated import path
import { PasswordChangeForm } from '../common/forms/PasswordChangeForm';
import { changePassword } from '../../services/authService';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  Z_INDEX,
  MIXINS,
} from '../../utils/designConstants';

/**
 * AdminSettingsModal Component
 * Modal form for admins to update their profile and change password
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} props.profile - Current profile data
 * @param {Function} props.onProfileUpdate - Callback when profile is updated
 */
export const AdminSettingsModal = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdate,
}) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    title: '',
    gender: '',
    blood_group: '',
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
        title: profile.title || '',
        gender: profile.gender || '',
        blood_group: profile.blood_group || '',
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
    console.log('🔐 Admin password change triggered');
    setPasswordError('');
    setIsChangingPassword(true);

    try {
      console.log('📡 Calling change password API...');
      const result = await changePassword(passwordData);
      console.log('✅ API Success:', result);
      
      toast.success('✅ Password changed successfully!');
      setActiveTab('personal');
      
    } catch (error) {
      console.error('❌ Password change failed:', error);
      console.error('❌ Error response:', error.response?.data);
      
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
      const updatedProfile = await updateAdminProfile(formData);
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

  // Handle photo change
  const handlePhotoChange = (newPhotoUrl) => {
    if (onProfileUpdate) {
      onProfileUpdate({ ...profile, profile_photo_url: newPhotoUrl });
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <style>
        {`
          .admin-settings-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
          .admin-settings-input:focus {
            border-color: rgba(59, 130, 246, 0.6);
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          }
          .admin-settings-select option {
            background: #1e293b;
            color: #ffffff;
          }
        `}
      </style>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>⚙️ Admin Settings</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Profile Photo Section */}
        <div style={styles.photoSection}>
          <ProfilePhotoUploader
            currentPhotoUrl={profile?.profile_photo_url}
            onPhotoChange={handlePhotoChange}
            onUpload={uploadAdminPhoto}  // ← Pass admin upload function
            onDelete={deleteAdminPhoto}  // ← Pass admin delete function
            size={100}
          />
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
                  className="admin-settings-input"
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
                  className="admin-settings-input"
                />
              </div>

              {/* Title */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Job Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="e.g., System Administrator"
                  className="admin-settings-input"
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
                  className="admin-settings-input"
                />
              </div>

              {/* Gender */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  style={styles.select}
                  className="admin-settings-select"
                >
                  <option value="" style={styles.selectOption}>Select gender</option>
                  <option value="Male" style={styles.selectOption}>Male</option>
                  <option value="Female" style={styles.selectOption}>Female</option>
                  <option value="Other" style={styles.selectOption}>Other</option>
                </select>
              </div>

              {/* Blood Group */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Blood Group</label>
                <select
                  name="blood_group"
                  value={formData.blood_group}
                  onChange={handleChange}
                  style={styles.select}
                  className="admin-settings-select"
                >
                  <option value="" style={styles.selectOption}>Select blood group</option>
                  <option value="A+" style={styles.selectOption}>A+</option>
                  <option value="A-" style={styles.selectOption}>A-</option>
                  <option value="B+" style={styles.selectOption}>B+</option>
                  <option value="B-" style={styles.selectOption}>B-</option>
                  <option value="AB+" style={styles.selectOption}>AB+</option>
                  <option value="AB-" style={styles.selectOption}>AB-</option>
                  <option value="O+" style={styles.selectOption}>O+</option>
                  <option value="O-" style={styles.selectOption}>O-</option>
                </select>
              </div>

              {/* Email - Read Only */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  style={{ ...styles.input, ...styles.inputDisabled }}
                  disabled
                />
                <small style={styles.helperText}>Contact support to change email</small>
              </div>

              {/* Employee ID - Read Only */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Employee ID</label>
                <input
                  type="text"
                  value={profile?.employee_id || 'Not assigned'}
                  style={{ ...styles.input, ...styles.inputDisabled }}
                  disabled
                />
                <small style={styles.helperText}>Auto-generated ID</small>
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
                  className="admin-settings-input"
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

// Styles - Gradient Design (matching LessonPlanWizard)
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: Z_INDEX.modal,
    padding: SPACING.sm,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: COLORS.background.gradient,
    borderRadius: BORDER_RADIUS.xl,
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    background: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    margin: 0,
  },
  closeButton: {
    padding: SPACING.sm,
    background: 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    color: COLORS.text.white,
    transition: `all ${TRANSITIONS.fast} ease`,
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSection: {
    padding: SPACING.lg,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    display: 'flex',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.03)',
  },
  tabs: {
    display: 'flex',
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    padding: `0 ${SPACING.lg}`,
    background: 'rgba(255, 255, 255, 0.03)',
  },
  tab: {
    padding: `${SPACING.md} ${SPACING.lg}`,
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.whiteSubtle,
    transition: `all ${TRANSITIONS.fast} ease`,
  },
  tabActive: {
    color: COLORS.text.white,
    borderBottomColor: COLORS.status.info,
    background: 'rgba(255, 255, 255, 0.08)',
  },
  form: {
    padding: SPACING.lg,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: SPACING.md,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
  },
  input: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    transition: `all ${TRANSITIONS.fast} ease`,
    outline: 'none',
    background: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
  },
  inputDisabled: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: COLORS.text.whiteSubtle,
    cursor: 'not-allowed',
  },
  select: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    cursor: 'pointer',
    outline: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    transition: `all ${TRANSITIONS.fast} ease`,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23FFFFFF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.5rem center',
    backgroundSize: '1rem',
    paddingRight: '2rem',
  },
  selectOption: {
    backgroundColor: '#1e293b',
    color: COLORS.text.white,
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  cancelButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: COLORS.text.white,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
  },
  submitButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: COLORS.status.info,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
  },
};

export default AdminSettingsModal;