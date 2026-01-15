// ============================================
// ADD STUDENT POPUP - Gradient Design System
// FILE: frontend/src/pages/AddStudentPopup.js
// ============================================

import React, { useState, useEffect, useCallback } from "react";
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

function AddStudentPopup({ onClose, onStudentAdded }) {
  const [closeButtonHovered, setCloseButtonHovered] = useState(false);
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

  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
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
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  return (
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
                  placeholder="e.g., +92 300 1234567"
                  style={styles.input}
                  className="add-student-input"
                />
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
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Set strong password"
                  style={styles.input}
                  className="add-student-input"
                />
              </div>

              {/* Confirm Password */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Confirm Password <span style={styles.required}>*</span>
                </label>
                <input
                  name="confirm_password"
                  type="password"
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                  placeholder="Re-type password"
                  style={styles.input}
                  className="add-student-input"
                />
              </div>
            </div>

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
                {isSubmitting ? 'Adding...' : 'Add Student'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
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
    background: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
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
