// ============================================
// PASSWORD CHANGE FORM - Reusable Component
// NEW FILE: frontend/src/components/common/forms/PasswordChangeForm.js
// ============================================

import React, { useState, useEffect } from 'react';
import {
  calculatePasswordStrength,
  getPasswordStrength,
  validatePasswordRequirements,
  doPasswordsMatch,
} from '../../../utils/passwordUtils';

/**
 * PasswordChangeForm Component
 * Reusable form for changing password with validation
 * 
 * @param {Object} props
 * @param {Function} props.onSubmit - Callback with { currentPassword, newPassword, confirmPassword }
 * @param {boolean} props.isSubmitting - Loading state
 * @param {string} props.error - Error message to display
 */
export const PasswordChangeForm = ({
  onSubmit,
  isSubmitting = false,
  error = '',
}) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: '' });
  const [requirements, setRequirements] = useState({
    minLength: false,
    hasLettersAndNumbers: false,
    hasUppercase: false,
  });

  // Calculate password strength when new password changes
  useEffect(() => {
    const score = calculatePasswordStrength(formData.newPassword);
    const strength = getPasswordStrength(score);
    setPasswordStrength({ score, ...strength });

    const reqs = validatePasswordRequirements(formData.newPassword);
    setRequirements(reqs);
  }, [formData.newPassword]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!requirements.minLength || !requirements.hasLettersAndNumbers) {
      return;
    }

    if (!doPasswordsMatch(formData.newPassword, formData.confirmPassword)) {
      return;
    }

    onSubmit({
      current_password: formData.currentPassword,
      new_password: formData.newPassword,
      confirm_password: formData.confirmPassword,
    });
  };

  const passwordsMatch = doPasswordsMatch(formData.newPassword, formData.confirmPassword);

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {/* Error Message */}
      {error && (
        <div style={styles.errorBox}>
          <span style={styles.errorIcon}>⚠️</span>
          {error}
        </div>
      )}

      <div style={styles.formGrid}>
        {/* Current Password */}
        <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Current Password</label>
          <div style={styles.inputContainer}>
            <input
              type={showPasswords.current ? 'text' : 'password'}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="Enter current password"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('current')}
              style={styles.eyeButton}
              tabIndex={-1}
            >
              {showPasswords.current ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
          <label style={styles.label}>New Password</label>
          <div style={styles.inputContainer}>
            <input
              type={showPasswords.new ? 'text' : 'password'}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="Enter new password"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('new')}
              style={styles.eyeButton}
              tabIndex={-1}
            >
              {showPasswords.new ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {formData.newPassword && (
            <>
              <div style={styles.strengthBar}>
                <div
                  style={{
                    ...styles.strengthBarFill,
                    width: `${(passwordStrength.score / 6) * 100}%`,
                    backgroundColor: passwordStrength.color,
                  }}
                />
              </div>
              <span
                style={{
                  ...styles.strengthLabel,
                  color: passwordStrength.color,
                }}
              >
                {passwordStrength.label}
              </span>

              {/* Requirements Checklist */}
              <div style={styles.requirementsBox}>
                <p style={styles.requirementsTitle}>Password must contain:</p>
                <ul style={styles.requirementsList}>
                  <li style={requirements.minLength ? styles.reqMet : styles.reqUnmet}>
                    {requirements.minLength ? '✓' : '○'} At least 8 characters
                  </li>
                  <li style={requirements.hasLettersAndNumbers ? styles.reqMet : styles.reqUnmet}>
                    {requirements.hasLettersAndNumbers ? '✓' : '○'} Letters and numbers
                  </li>
                  <li style={requirements.hasUppercase ? styles.reqMet : styles.reqUnmet}>
                    {requirements.hasUppercase ? '✓' : '○'} Uppercase letter (recommended)
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Confirm Password */}
        <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
          <label style={styles.label}>Confirm New Password</label>
          <div style={styles.inputContainer}>
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="Re-enter new password"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirm')}
              style={styles.eyeButton}
              tabIndex={-1}
            >
              {showPasswords.confirm ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          {/* Password Match Indicator */}
          {formData.confirmPassword && (
            <p style={passwordsMatch ? styles.matchSuccess : styles.matchError}>
              {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
            </p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        style={styles.submitButton}
        disabled={isSubmitting || !requirements.minLength || !requirements.hasLettersAndNumbers || !passwordsMatch}
      >
        {isSubmitting ? 'Changing Password...' : '🔐 Change Password'}
      </button>
    </form>
  );
};

// Styles
const styles = {
  form: {
    width: '100%',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
  },
  inputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    paddingRight: '2.5rem',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '0.875rem',
    transition: 'all 0.15s ease',
    outline: 'none',
  },
  eyeButton: {
    position: 'absolute',
    right: '0.75rem',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.25rem',
    padding: '0.25rem',
  },
  strengthBar: {
    height: '6px',
    backgroundColor: '#E5E7EB',
    borderRadius: '3px',
    overflow: 'hidden',
    marginTop: '0.5rem',
  },
  strengthBarFill: {
    height: '100%',
    transition: 'all 0.3s ease',
  },
  strengthLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    marginTop: '0.25rem',
  },
  requirementsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    padding: '0.75rem',
    marginTop: '0.5rem',
  },
  requirementsTitle: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 0.5rem 0',
  },
  requirementsList: {
    margin: 0,
    paddingLeft: '1.25rem',
    listStyle: 'none',
    fontSize: '0.75rem',
  },
  reqMet: {
    color: '#10B981',
    marginBottom: '0.25rem',
  },
  reqUnmet: {
    color: '#9CA3AF',
    marginBottom: '0.25rem',
  },
  matchSuccess: {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#10B981',
    margin: '0.25rem 0 0 0',
  },
  matchError: {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#DC2626',
    margin: '0.25rem 0 0 0',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    border: '1px solid #DC2626',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    marginBottom: '1rem',
    fontSize: '0.875rem',
    color: '#991B1B',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  errorIcon: {
    fontSize: '1.25rem',
  },
  submitButton: {
    width: '100%',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#7C3AED',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    marginTop: '1.5rem',
  },
};

export default PasswordChangeForm;