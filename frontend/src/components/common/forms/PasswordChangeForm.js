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
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
} from '../../../utils/designConstants';

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
    gap: SPACING.sm,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.primary,
  },
  inputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: SPACING.sm,
    paddingRight: '2.5rem',
    border: `1px solid ${COLORS.border.light}`,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    transition: `all ${TRANSITIONS.fast} ease`,
    outline: 'none',
  },
  eyeButton: {
    position: 'absolute',
    right: SPACING.sm,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: FONT_SIZES.xl,
    padding: SPACING.xs,
  },
  strengthBar: {
    height: '6px',
    backgroundColor: COLORS.border.light,
    borderRadius: BORDER_RADIUS.xs,
    overflow: 'hidden',
    marginTop: SPACING.xs,
  },
  strengthBarFill: {
    height: '100%',
    transition: `all ${TRANSITIONS.slow} ease`,
  },
  strengthLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    marginTop: SPACING.xs,
  },
  requirementsBox: {
    backgroundColor: COLORS.background.lightGray,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  requirementsTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.primary,
    margin: `0 0 ${SPACING.xs} 0`,
  },
  requirementsList: {
    margin: 0,
    paddingLeft: SPACING.md,
    listStyle: 'none',
    fontSize: FONT_SIZES.xs,
  },
  reqMet: {
    color: COLORS.status.success,
    marginBottom: SPACING.xs,
  },
  reqUnmet: {
    color: COLORS.text.tertiary,
    marginBottom: SPACING.xs,
  },
  matchSuccess: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.status.success,
    margin: `${SPACING.xs} 0 0 0`,
  },
  matchError: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.status.errorDark,
    margin: `${SPACING.xs} 0 0 0`,
  },
  errorBox: {
    backgroundColor: COLORS.status.errorLight,
    border: `1px solid ${COLORS.status.errorDark}`,
    borderRadius: BORDER_RADIUS.sm,
    padding: `${SPACING.sm} ${SPACING.md}`,
    marginBottom: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.status.errorDarker,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  errorIcon: {
    fontSize: FONT_SIZES.xl,
  },
  submitButton: {
    width: '100%',
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: COLORS.primary,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
    marginTop: SPACING.lg,
  },
};

export default PasswordChangeForm;