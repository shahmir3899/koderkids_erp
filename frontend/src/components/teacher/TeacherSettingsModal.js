// ============================================
// TEACHER SETTINGS MODAL - Edit Profile Form
// ============================================
// Location: src/components/teacher/TeacherSettingsModal.js

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { updateTeacherProfile } from '../../services/teacherService';
import { ProfilePhotoUploader } from './ProfilePhotoUploader';

/**
 * TeacherSettingsModal Component
 * Modal form for teachers to update their profile information
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} props.profile - Current profile data
 * @param {Function} props.onProfileUpdate - Callback when profile is updated
 */
export const TeacherSettingsModal = ({
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
    bank_name: '',
    account_number: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

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
        bank_name: profile.bank_name || '',
        account_number: profile.account_number || '',
      });
    }
  }, [profile]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updatedProfile = await updateTeacherProfile(formData);
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
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>⚙️ Profile Settings</h2>
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
            onClick={() => setActiveTab('personal')}
          >
            Personal Info
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'bank' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('bank')}
          >
            Bank Details
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {activeTab === 'personal' && (
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

              {/* Title */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Job Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="e.g., Senior Teacher"
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

              {/* Gender */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  style={styles.select}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
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
                >
                  <option value="">Select blood group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
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
          )}

          {activeTab === 'bank' && (
            <div style={styles.formGrid}>
              {/* Bank Name */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Bank Name</label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="e.g., Habib Bank Limited"
                />
              </div>

              {/* Account Number */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Account Number</label>
                <input
                  type="text"
                  name="account_number"
                  value={formData.account_number}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Enter account number"
                />
              </div>

              {/* Read-only Employee ID */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Employee ID</label>
                <input
                  type="text"
                  value={profile?.employee_id || 'Not assigned'}
                  style={{ ...styles.input, backgroundColor: '#F3F4F6' }}
                  disabled
                />
                <small style={styles.helperText}>Auto-generated, cannot be changed</small>
              </div>

              {/* Read-only Basic Salary */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Basic Salary</label>
                <input
                  type="text"
                  value={profile?.basic_salary ? `PKR ${Number(profile.basic_salary).toLocaleString()}` : 'Not set'}
                  style={{ ...styles.input, backgroundColor: '#F3F4F6' }}
                  disabled
                />
                <small style={styles.helperText}>Contact admin to update salary</small>
              </div>
            </div>
          )}

          {/* Form Actions */}
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
  photoSection: {
    padding: '1.5rem',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'center',
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
    color: '#7C3AED',
    borderBottomColor: '#7C3AED',
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
  select: {
    padding: '0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '0.875rem',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
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
    backgroundColor: '#7C3AED',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};

// Responsive styles for mobile
const mobileStyles = `
  @media (max-width: 640px) {
    .settings-form-grid {
      grid-template-columns: 1fr !important;
    }
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = mobileStyles;
document.head.appendChild(styleSheet);

export default TeacherSettingsModal;