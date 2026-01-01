// ============================================
// CREATE USER MODAL - Add New User
// ============================================

import React, { useState, useEffect } from 'react';
import { Button } from '../common/ui/Button';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';

/**
 * CreateUserModal Component
 * Modal for creating new users with role-based fields
 * 
 * @param {Object} props
 * @param {Function} props.onClose - Close modal callback
 * @param {Function} props.onCreate - Create user callback
 * @param {Array} props.schools - Array of school objects
 * @param {Array} props.roles - Array of role objects
 * @param {boolean} props.isSubmitting - Submitting state
 */
export const CreateUserModal = ({
  onClose,
  onCreate,
  schools = [],
  roles = [],
  isSubmitting = false,
}) => {
  // ============================================
  // STATE
  // ============================================

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'Teacher', // Default to Teacher
    password: '',
    confirm_password: '',
    assigned_schools: [],
    is_active: true,
  });

  const [autoGeneratePassword, setAutoGeneratePassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [sendEmail, setSendEmail] = useState(true); // Email checkbox (default: checked)

  // ============================================
  // HANDLERS
  // ============================================

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSchoolChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(Number(options[i].value));
      }
    }
    setFormData(prev => ({
      ...prev,
      assigned_schools: selected,
    }));
  };

  const handleAutoPasswordToggle = (e) => {
    const isAuto = e.target.checked;
    setAutoGeneratePassword(isAuto);
    
    if (isAuto) {
      // Clear password fields when auto-generate is enabled
      setFormData(prev => ({
        ...prev,
        password: '',
        confirm_password: '',
      }));
      setErrors(prev => ({
        ...prev,
        password: '',
        confirm_password: '',
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Username required
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    // Role required
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    // If not auto-generating, validate passwords
    if (!autoGeneratePassword) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }

      if (!formData.confirm_password) {
        newErrors.confirm_password = 'Please confirm password';
      } else if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match';
      }
    }

    // If role is Teacher, check assigned schools
    if (formData.role === 'Teacher' && formData.assigned_schools.length === 0) {
      newErrors.assigned_schools = 'Teachers must be assigned to at least one school';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Prepare data for submission
    const submitData = { ...formData };

    // If auto-generating password, remove password fields
    if (autoGeneratePassword) {
      delete submitData.password;
      delete submitData.confirm_password;
    }

    // If not teacher, remove assigned_schools
    if (formData.role !== 'Teacher') {
      delete submitData.assigned_schools;
    }

    // Add email flag - ENSURE IT'S BOOLEAN
    submitData.send_email = Boolean(sendEmail && formData.email); // Only if email provided

    console.log('📤 Submitting user data:', submitData);
    console.log('📧 Send email:', sendEmail);
    console.log('📧 Send email type:', typeof submitData.send_email, submitData.send_email);

    // Call onCreate callback
    if (onCreate) {
      const result = await onCreate(submitData);
      
      // If successful and password was generated, store it
      if (result && result.generated_password) {
        setGeneratedPassword(result.generated_password);
      }
    }
  };

  // ============================================
  // RENDER SUCCESS STATE
  // ============================================

  if (generatedPassword) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <div style={headerStyle}>
            <h2 style={titleStyle}>✅ User Created Successfully!</h2>
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
                User <strong>{formData.username}</strong> has been created successfully!
              </p>
              
              <div style={passwordDisplayStyle}>
                <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                  Generated Password:
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
                  {generatedPassword}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '0.5rem' }}>
                  ⚠️ Save this password! It won't be shown again.
                </div>
              </div>

              {formData.email && (
                <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6B7280' }}>
                  📧 An email with login credentials has been sent to <strong>{formData.email}</strong>
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
          <h2 style={titleStyle}>➕ Create New User</h2>
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
            <div style={gridStyle}>
              {/* Username */}
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Username <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                  placeholder="Enter username"
                />
                {errors.username && <div style={errorStyle}>{errors.username}</div>}
              </div>

              {/* Email */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="user@koderkids.pk"
                />
              </div>

              {/* First Name */}
              <div style={fieldStyle}>
                <label style={labelStyle}>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="First name"
                />
              </div>

              {/* Last Name */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Last name"
                />
              </div>

              {/* Role */}
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Role <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  style={selectStyle}
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                {errors.role && <div style={errorStyle}>{errors.role}</div>}
              </div>

              {/* Active Status */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>Active</span>
                </div>
              </div>
            </div>

            {/* Assigned Schools (Only for Teachers) */}
            {formData.role === 'Teacher' && (
              <div style={{ ...fieldStyle, marginTop: '1.5rem' }}>
                <label style={labelStyle}>
                  Assigned Schools <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  multiple
                  value={formData.assigned_schools}
                  onChange={handleSchoolChange}
                  style={{ ...selectStyle, minHeight: '120px' }}
                >
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                  Hold Ctrl (Windows) or Cmd (Mac) to select multiple schools
                </div>
                {errors.assigned_schools && <div style={errorStyle}>{errors.assigned_schools}</div>}
              </div>
            )}

            {/* Password Section */}
            <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#F9FAFB', borderRadius: '0.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoGeneratePassword}
                    onChange={handleAutoPasswordToggle}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                    Auto-generate secure password
                  </span>
                </label>
              </div>

              {!autoGeneratePassword && (
                <div style={gridStyle}>
                  {/* Password */}
                  <div style={fieldStyle}>
                    <label style={labelStyle}>
                      Password <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required={!autoGeneratePassword}
                        style={inputStyle}
                        placeholder="Enter password"
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
                      required={!autoGeneratePassword}
                      style={inputStyle}
                      placeholder="Re-enter password"
                    />
                    {errors.confirm_password && <div style={errorStyle}>{errors.confirm_password}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Email Notification Section */}
            {formData.email && (
              <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#EFF6FF', borderRadius: '0.5rem', border: '1px solid #DBEAFE' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937' }}>
                    📧 Send welcome email with credentials
                  </span>
                </label>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.5rem', marginLeft: '1.75rem' }}>
                  User will receive an email at <strong>{formData.email}</strong> with their username and password
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
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="small" />
                  <span style={{ marginLeft: '0.5rem' }}>Creating...</span>
                </>
              ) : (
                '✅ Create User'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
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
  maxWidth: '800px',
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

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '1.5rem',
};

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
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

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
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

export default CreateUserModal;