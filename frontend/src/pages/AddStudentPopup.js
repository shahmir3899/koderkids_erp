// ============================================
// ADD STUDENT POPUP - Gradient Design System
// FILE: frontend/src/pages/AddStudentPopup.js
// ============================================

import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import 'react-toastify/dist/ReactToastify.css';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  Z_INDEX,
} from '../utils/designConstants';

function AddStudentPopup({ onClose, onStudentAdded, schools: propSchools }) {
  const [closeButtonHovered, setCloseButtonHovered] = useState(false);
  const [cancelButtonHovered, setCancelButtonHovered] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    reg_num: "",
    school: "",
    student_class: "",
    monthly_fee: "",
    phone: "",
    date_of_registration: "",
    gender: "",
    password: "",
    confirm_password: ""
  });

  // Use schools from props if provided (cached from parent), otherwise fetch
  const [schools, setSchools] = useState(propSchools || []);
  const [loading, setLoading] = useState(!propSchools);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    passwordsMatch: false,
  });

  // Password visibility toggle (shows both passwords simultaneously)
  const [showPasswords, setShowPasswords] = useState(false);

  // Validate password on change
  const validatePassword = (password, confirmPassword) => {
    setPasswordValidation({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      passwordsMatch: password.length > 0 && password === confirmPassword,
    });
  };

  // Handle ESC key to close modal
  const handleEscKey = useCallback((e) => {
    if (e.key === 'Escape' && !isSubmitting) {
      onClose();
    }
  }, [onClose, isSubmitting]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [handleEscKey]);

  // Only fetch schools if not provided via props (fallback for backwards compatibility)
  useEffect(() => {
    // Skip fetching if schools were provided via props
    if (propSchools && propSchools.length > 0) {
      setSchools(propSchools);
      setLoading(false);
      return;
    }

    async function fetchSchools() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("access");
        if (!token) {
          setError("Authentication token missing. Please log in again.");
          return;
        }

        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/schools/`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const schoolData = response.data.schools || response.data;
        if (Array.isArray(schoolData)) {
          setSchools(schoolData);
        } else {
          setError("Unexpected data format from API.");
        }
      } catch (err) {
        setError("Failed to fetch schools.");
        console.error("Error fetching schools:", err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSchools();
  }, [propSchools]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // Validate password when password or confirm_password changes
      if (name === 'password' || name === 'confirm_password') {
        const pwd = name === 'password' ? value : prev.password;
        const confirmPwd = name === 'confirm_password' ? value : prev.confirm_password;
        validatePassword(pwd, confirmPwd);
      }

      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("access");
      if (!token) {
        toast.error("Authentication error. Please log in again.", {
          position: "top-right",
          autoClose: 3000,
        });
        setIsSubmitting(false);
        return;
      }

      // Required field validation
      if (
        !formData.name ||
        !formData.school ||
        !formData.student_class ||
        !formData.monthly_fee ||
        !formData.phone ||
        !formData.date_of_registration ||
        !formData.gender ||
        !formData.password
      ) {
        toast.error("Please fill all required fields, including password.", {
          position: "top-right",
          autoClose: 4000,
        });
        setIsSubmitting(false);
        return;
      }

      // Password strength check
      if (formData.password.length < 8) {
        toast.error("Password must be at least 8 characters long.", {
          position: "top-right",
          autoClose: 4000,
        });
        setIsSubmitting(false);
        return;
      }

      // Password confirmation check
      if (formData.password !== formData.confirm_password) {
        toast.error("Passwords do not match. Please confirm the password correctly.", {
          position: "top-right",
          autoClose: 4000,
        });
        setIsSubmitting(false);
        return;
      }

      // Prepare clean payload
      const payload = {
        name: formData.name,
        school: parseInt(formData.school),
        student_class: formData.student_class,
        monthly_fee: parseFloat(formData.monthly_fee),
        phone: formData.phone,
        gender: formData.gender,
        password: formData.password,
        date_of_registration:
          formData.date_of_registration || new Date().toISOString().split("T")[0],
      };

      // API call
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/students/`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Success: Show login credentials
      toast.success(
        <div style={{ lineHeight: "1.6" }}>
          <strong>Student added successfully!</strong>
          <br />
          <strong>Username (Reg#):</strong> {response.data.reg_num}
          <br />
          <strong>Password:</strong> {formData.password}
          <br />
          <small>Student can now log in immediately.</small>
        </div>,
        {
          position: "top-right",
          autoClose: 10000,
          closeButton: true,
        }
      );

      // Close popup and trigger refresh
      setTimeout(() => {
        if (onStudentAdded) {
          onStudentAdded();
        } else {
          onClose();
        }
      }, 2000);

    } catch (err) {
      console.error("Error adding student:", err.response?.data || err.message);
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Failed to add student. Please try again.";
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <style>
        {`
          .add-student-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
          .add-student-input:focus {
            border-color: rgba(16, 185, 129, 0.6);
            box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
          }
          .add-student-select option {
            background-color: #1e293b;
            color: white;
          }
        `}
      </style>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Add New Student</h2>
          <button
            onClick={onClose}
            style={{
              ...styles.closeButton,
              ...(closeButtonHovered ? styles.closeButtonHover : {}),
            }}
            onMouseEnter={() => setCloseButtonHovered(true)}
            onMouseLeave={() => setCloseButtonHovered(false)}
            title="Close (Esc)"
            aria-label="Close modal"
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={styles.loadingContainer}>
            <ClipLoader color={COLORS.status.success} size={50} />
            <p style={styles.loadingText}>Loading schools...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={styles.errorContainer}>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        {/* Form */}
        {!loading && !error && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGrid}>
              {/* Name */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Name <span style={styles.required}>*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter student name"
                  style={styles.input}
                  className="add-student-input"
                />
              </div>

              {/* Registration Number */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Registration Number</label>
                <input
                  type="text"
                  value="Auto Generated by system"
                  disabled
                  style={{ ...styles.input, ...styles.inputDisabled }}
                />
                <small style={styles.helperText}>Auto-generated ID</small>
              </div>

              {/* School */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  School <span style={styles.required}>*</span>
                </label>
                <select
                  name="school"
                  value={formData.school}
                  onChange={handleInputChange}
                  style={styles.select}
                  className="add-student-select"
                >
                  <option value="">Select School</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Class <span style={styles.required}>*</span>
                </label>
                <input
                  name="student_class"
                  type="text"
                  value={formData.student_class}
                  onChange={handleInputChange}
                  placeholder="Enter class"
                  style={styles.input}
                  className="add-student-input"
                />
              </div>

              {/* Monthly Fee */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Monthly Fee <span style={styles.required}>*</span>
                </label>
                <input
                  name="monthly_fee"
                  type="number"
                  value={formData.monthly_fee}
                  onChange={handleInputChange}
                  placeholder="Enter monthly fee"
                  style={styles.input}
                  className="add-student-input"
                />
              </div>

              {/* Phone */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Phone <span style={styles.required}>*</span>
                </label>
                <input
                  name="phone"
                  type="text"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="e.g., 03001234567"
                  style={styles.input}
                  className="add-student-input"
                />
                <small style={styles.helperText}>Parent/Guardian contact number</small>
              </div>

              {/* Gender */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Gender <span style={styles.required}>*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  style={styles.select}
                  className="add-student-select"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Date of Registration */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Date of Registration <span style={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  name="date_of_registration"
                  value={formData.date_of_registration}
                  onChange={handleInputChange}
                  style={styles.input}
                  className="add-student-input"
                />
              </div>

              {/* Password */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Login Password <span style={styles.required}>*</span>
                </label>
                <div style={styles.passwordInputWrapper}>
                  <input
                    name="password"
                    type={showPasswords ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Min 8 characters"
                    style={{
                      ...styles.input,
                      ...styles.passwordInput,
                      borderColor: formData.password.length > 0
                        ? (passwordValidation.minLength ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)')
                        : COLORS.border.whiteTransparent,
                    }}
                    className="add-student-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    style={styles.eyeButton}
                    title={showPasswords ? "Hide passwords" : "Show passwords"}
                  >
                    {showPasswords ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Confirm Password <span style={styles.required}>*</span>
                </label>
                <input
                  name="confirm_password"
                  type={showPasswords ? "text" : "password"}
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                  placeholder="Re-type password"
                  style={{
                    ...styles.input,
                    borderColor: formData.confirm_password.length > 0
                      ? (passwordValidation.passwordsMatch ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)')
                      : COLORS.border.whiteTransparent,
                  }}
                  className="add-student-input"
                />
                {/* Password match indicator */}
                {formData.confirm_password.length > 0 && (
                  <small style={{
                    ...styles.helperText,
                    color: passwordValidation.passwordsMatch ? '#22c55e' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '4px',
                  }}>
                    {passwordValidation.passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </small>
                )}
              </div>
            </div>

            {/* Password Requirements Info */}
            {(formData.password.length > 0 || formData.confirm_password.length > 0) && (
              <div style={styles.passwordRequirements}>
                <p style={styles.passwordRequirementsTitle}>Password Requirements:</p>
                <div style={styles.requirementsList}>
                  <span style={{
                    ...styles.requirementItem,
                    color: passwordValidation.minLength ? '#22c55e' : '#ef4444',
                  }}>
                    {passwordValidation.minLength ? '✓' : '✗'} At least 8 characters
                  </span>
                  <span style={{
                    ...styles.requirementItem,
                    color: passwordValidation.hasUppercase ? '#22c55e' : 'rgba(255,255,255,0.5)',
                  }}>
                    {passwordValidation.hasUppercase ? '✓' : '○'} Uppercase letter (recommended)
                  </span>
                  <span style={{
                    ...styles.requirementItem,
                    color: passwordValidation.hasLowercase ? '#22c55e' : 'rgba(255,255,255,0.5)',
                  }}>
                    {passwordValidation.hasLowercase ? '✓' : '○'} Lowercase letter (recommended)
                  </span>
                  <span style={{
                    ...styles.requirementItem,
                    color: passwordValidation.hasNumber ? '#22c55e' : 'rgba(255,255,255,0.5)',
                  }}>
                    {passwordValidation.hasNumber ? '✓' : '○'} Number (recommended)
                  </span>
                  <span style={{
                    ...styles.requirementItem,
                    color: passwordValidation.passwordsMatch ? '#22c55e' : (formData.confirm_password.length > 0 ? '#ef4444' : 'rgba(255,255,255,0.5)'),
                  }}>
                    {passwordValidation.passwordsMatch ? '✓' : (formData.confirm_password.length > 0 ? '✗' : '○')} Passwords match
                  </span>
                </div>
              </div>
            )}

            {/* Login Info Note */}
            <div style={styles.infoNote}>
              <span style={styles.infoIcon}>ℹ️</span>
              <div>
                <p style={styles.infoTitle}>Login Credentials</p>
                <p style={styles.infoText}>
                  After creation, the student can log in using their <strong>Registration Number</strong> as username
                  and the password you set above. The registration number will be auto-generated.
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div style={styles.actions}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  ...styles.cancelButton,
                  ...(cancelButtonHovered ? styles.cancelButtonHover : {}),
                }}
                onMouseEnter={() => setCancelButtonHovered(true)}
                onMouseLeave={() => setCancelButtonHovered(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  ...styles.submitButton,
                  opacity: (!passwordValidation.minLength || !passwordValidation.passwordsMatch) && formData.password.length > 0 ? 0.6 : 1,
                }}
                disabled={isSubmitting || (formData.password.length > 0 && (!passwordValidation.minLength || !passwordValidation.passwordsMatch))}
              >
                {isSubmitting ? 'Adding...' : 'Add Student'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

// Styles - Gradient Design (matching other modals)
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
    maxWidth: '650px',
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
    position: 'sticky',
    top: 0,
    zIndex: 10,
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
    borderRadius: '50%',
    cursor: 'pointer',
    color: COLORS.text.white,
    transition: `all ${TRANSITIONS.fast} ease`,
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  closeButtonHover: {
    background: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
    color: '#ef4444',
    transform: 'scale(1.05)',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
    gap: SPACING.md,
  },
  loadingText: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },
  errorContainer: {
    padding: SPACING.lg,
    margin: SPACING.lg,
    background: 'rgba(239, 68, 68, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#fca5a5',
    margin: 0,
    textAlign: 'center',
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
  required: {
    color: '#f87171',
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
  passwordInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    width: '100%',
    paddingRight: '44px',
  },
  eyeButton: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.sm,
    transition: `all ${TRANSITIONS.fast} ease`,
    opacity: 0.8,
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
    transition: `all ${TRANSITIONS.fast} ease`,
    outline: 'none',
    background: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '16px',
    appearance: 'none',
    paddingRight: '40px',
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  passwordRequirements: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  passwordRequirementsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    marginBottom: SPACING.sm,
    margin: 0,
    marginBottom: SPACING.xs,
  },
  requirementsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  requirementItem: {
    fontSize: FONT_SIZES.xs,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: `${SPACING.xs} ${SPACING.sm}`,
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.sm,
    transition: `all ${TRANSITIONS.fast} ease`,
  },
  infoNote: {
    display: 'flex',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    background: 'rgba(59, 130, 246, 0.1)',
    borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  infoIcon: {
    fontSize: FONT_SIZES.lg,
    flexShrink: 0,
  },
  infoTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#60a5fa',
    margin: 0,
    marginBottom: '4px',
  },
  infoText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    margin: 0,
    lineHeight: 1.5,
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
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
  },
  cancelButtonHover: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: 'rgba(239, 68, 68, 0.6)',
    color: '#fca5a5',
    boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)',
    transform: 'translateY(-1px)',
  },
  submitButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: COLORS.status.success,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
  },
};

export default AddStudentPopup;
