// ============================================
// RESET PASSWORD MODAL - Reset User Password
// ============================================

import React, { useState } from 'react';
import { Button } from '../common/ui/Button';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';

/**
 * ResetPasswordModal Component
 * Modal for resetting user passwords (admin/teacher)
 *
 * @param {Object} props
 * @param {Object} props.user - User object
 * @param {Function} props.onClose - Close modal callback
 * @param {Function} props.onReset - Reset password callback
 * @param {boolean} props.isSubmitting - Submitting state
 * @param {boolean} props.isStudent - Whether the user is a student (enables simple password option)
 */
export const ResetPasswordModal = ({
  user,
  onClose,
  onReset,
  isSubmitting = false,
  isStudent = false,
}) => {
  // ============================================
  // STATE
  // ============================================

  const [formData, setFormData] = useState({
    password: '',
    confirm_password: '',
  });

  const [autoGenerate, setAutoGenerate] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [newPassword, setNewPassword] = useState(null);
  const [sendEmail, setSendEmail] = useState(true); // Email checkbox
  const [allowSimplePassword, setAllowSimplePassword] = useState(isStudent); // Default true for students

  // ============================================
  // HANDLERS
  // ============================================

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAutoGenerateToggle = (e) => {
    const isAuto = e.target.checked;
    setAutoGenerate(isAuto);
    
    if (isAuto) {
      setFormData({
        password: '',
        confirm_password: '',
      });
      setErrors({});
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!autoGenerate) {
      // Minimum length depends on whether simple password is allowed
      const minLength = allowSimplePassword ? 4 : 8;

      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < minLength) {
        newErrors.password = `Password must be at least ${minLength} characters`;
      }

      if (!formData.confirm_password) {
        newErrors.confirm_password = 'Please confirm password';
      } else if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData = autoGenerate
      ? { send_email: sendEmail && user.email, simple_password: allowSimplePassword }
      : { password: formData.password, send_email: sendEmail && user.email, simple_password: allowSimplePassword };

    console.log('📤 Resetting password for:', user.username);
    console.log('📧 Send email:', sendEmail);
    console.log('🔓 Simple password:', allowSimplePassword);

    if (onReset) {
      const result = await onReset(submitData);
      
      // If password was generated, store it to show
      if (result && result.new_password) {
        setNewPassword(result.new_password);
      }
    }
  };

  // ============================================
  // STYLES
  // ============================================

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '1rem',
  };

  const modalStyle = {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  };

  const headerStyle = {
    padding: '1.5rem',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  };

  const titleStyle = {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1F2937',
    margin: 0,
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#6B7280',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.375rem',
    transition: 'color 0.15s ease',
  };

  const contentStyle = {
    padding: '1.5rem',
  };

  const fieldStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem',
  };

  const labelStyle = {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
  };

  const inputStyle = {
    padding: '0.625rem 0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    color: '#374151',
    backgroundColor: '#FFFFFF',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  };

  const errorStyle = {
    fontSize: '0.75rem',
    color: '#EF4444',
    marginTop: '0.25rem',
  };

  const footerStyle = {
    padding: '1.5rem',
    borderTop: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    backgroundColor: '#F9FAFB',
  };

  const successBoxStyle = {
    padding: '2rem',
    backgroundColor: '#ECFDF5',
    borderRadius: '0.5rem',
    border: '2px solid #10B981',
    textAlign: 'center',
  };

  const passwordDisplayStyle = {
    marginTop: '1.5rem',
  };

  if (!user) return null;

  // ============================================
  // RENDER SUCCESS STATE
  // ============================================

  if (newPassword) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <div style={headerStyle}>
            <h2 style={titleStyle}>✅ Password Reset Successful!</h2>
            <button
              style={closeButtonStyle}
              onClick={onClose}
              onMouseEnter={(e) => e.target.style.color = '#1F2937'}
              onMouseLeave={(e) => e.target.style.color = '#6B7280'}
            >
              ✕
            </button>
          </div>

          <div style={contentStyle}>
            <div style={successBoxStyle}>
              <p style={{ marginBottom: '1rem', color: '#374151' }}>
                Password for <strong>{user.username}</strong> has been reset successfully!
              </p>
              
              <div style={passwordDisplayStyle}>
                <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                  New Password:
                </div>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700', 
                  color: '#1F2937',
                  fontFamily: 'monospace',
                  backgroundColor: '#F9FAFB',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '2px solid #10B981',
                  textAlign: 'center',
                }}>
                  {newPassword}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '0.5rem' }}>
                  ⚠️ Save this password! It won't be shown again.
                </div>
              </div>

              {user.email && (
                <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6B7280' }}>
                  📧 An email with the new password has been sent to <strong>{user.email}</strong>
                </div>
              )}
            </div>
          </div>

          <div style={footerStyle}>
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER FORM
  // ============================================

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>🔑 Reset Password</h2>
            <div style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.25rem' }}>
              User: <strong>{user.username}</strong>
            </div>
          </div>
          <button
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={(e) => e.target.style.color = '#1F2937'}
            onMouseLeave={(e) => e.target.style.color = '#6B7280'}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={contentStyle}>
            {/* Warning */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#FEF2F2',
              border: '1px solid #EF4444',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{ fontSize: '0.875rem', color: '#991B1B' }}>
                ⚠️ <strong>Warning:</strong> This will reset the user's password. They will need to use the new password to log in.
              </div>
            </div>

            {/* Auto-Generate Toggle */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoGenerate}
                  onChange={handleAutoGenerateToggle}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  Auto-generate secure password (Recommended)
                </span>
              </label>
            </div>

            {/* Simple Password Option (Students Only) */}
            {isStudent && (
              <div style={{
                marginBottom: '1.5rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '0.5rem',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={allowSimplePassword}
                    onChange={(e) => setAllowSimplePassword(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10B981' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#166534' }}>
                    Allow simple password (min 4 characters)
                  </span>
                </label>
                <div style={{ fontSize: '0.75rem', color: '#15803D', marginTop: '0.25rem', marginLeft: '1.75rem' }}>
                  Easier for students to remember (e.g., "1234", "abcd")
                </div>
              </div>
            )}

            {/* Manual Password Fields */}
            {!autoGenerate && (
              <div style={{ 
                padding: '1.5rem', 
                backgroundColor: '#F9FAFB', 
                borderRadius: '0.5rem',
                marginBottom: '1rem',
              }}>
                {/* Password */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    New Password <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required={!autoGenerate}
                      style={inputStyle}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.25rem',
                      }}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {errors.password && <div style={errorStyle}>{errors.password}</div>}
                </div>

                {/* Confirm Password */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Confirm Password <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    required={!autoGenerate}
                    style={inputStyle}
                    placeholder="Re-enter new password"
                  />
                  {errors.confirm_password && <div style={errorStyle}>{errors.confirm_password}</div>}
                </div>
              </div>
            )}

            {/* Info Message */}
            {autoGenerate && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#EFF6FF',
                border: '1px solid #3B82F6',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                color: '#1E40AF',
              }}>
                ℹ️ A secure random password will be generated and shown after reset.
              </div>
            )}

            {/* Email Notification Section */}
            {user.email && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#FEF3C7', borderRadius: '0.5rem', border: '1px solid #FCD34D' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937' }}>
                    📧 Email new password to user
                  </span>
                </label>
                <div style={{ fontSize: '0.75rem', color: '#92400E', marginTop: '0.5rem', marginLeft: '1.75rem' }}>
                  User will receive an email at <strong>{user.email}</strong> with the new password
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={footerStyle}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="small" />
                  <span style={{ marginLeft: '0.5rem' }}>Resetting...</span>
                </>
              ) : (
                '🔑 Reset Password'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordModal;