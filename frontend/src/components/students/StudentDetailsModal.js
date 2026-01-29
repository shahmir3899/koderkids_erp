// ============================================
// STUDENT DETAILS MODAL - Gradient Design System
// Matches AddStudentPopup UI for consistency
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Button } from '../common/ui/Button';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { ClipLoader } from 'react-spinners';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  TRANSITIONS,
  Z_INDEX,
} from '../../utils/designConstants';
import { formatLocalDate } from '../../utils/dateFormatters';

// Status options for students
const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Pass Out', label: 'Pass Out' },
  { value: 'Left', label: 'Left' },
  { value: 'Suspended', label: 'Suspended' },
  { value: 'Expelled', label: 'Expelled' },
];

// Gender options
const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

/**
 * StudentDetailsModal Component
 * @param {Object} props
 * @param {Object} props.student - Student object to display/edit
 * @param {boolean} props.isEditing - Whether in edit mode
 * @param {Function} props.onClose - Close modal callback
 * @param {Function} props.onSave - Save changes callback
 * @param {Function} props.onEdit - Enable edit mode callback
 * @param {Function} props.onCancel - Cancel edit mode callback
 * @param {Function} props.onDelete - Delete student callback
 * @param {Array} props.schools - Array of school objects
 * @param {Array} props.classes - Array of class strings
 * @param {boolean} props.isSubmitting - Submitting state for save
 * @param {boolean} props.isDeleting - Deleting state for delete
 */
export const StudentDetailsModal = ({
  student,
  isEditing,
  onClose,
  onSave,
  onEdit,
  onCancel,
  onDelete,
  schools = [],
  classes = [],
  isSubmitting = false,
  isDeleting = false,
}) => {
  const [formData, setFormData] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [closeButtonHovered, setCloseButtonHovered] = useState(false);
  const [cancelButtonHovered, setCancelButtonHovered] = useState(false);

  // Track the initial student and form data
  const initializedStudentIdRef = useRef(null);
  const originalFormDataRef = useRef({});

  // Initialize form data ONLY when a NEW student is selected (ID changes)
  useEffect(() => {
    // Only initialize if this is a different student than before
    if (student && student.id !== initializedStudentIdRef.current) {
      console.log('🔄 Initializing form for student:', student.id);
      
      let initialData;
      
      if (schools.length > 0) {
        // Find the school ID from the school name
        let schoolId = '';
        
        if (typeof student.school === 'number') {
          // school is already an ID
          schoolId = student.school;
        } else if (typeof student.school === 'string') {
          // school is a name, find the ID
          const schoolObj = schools.find(s => s.name === student.school);
          schoolId = schoolObj ? schoolObj.id : '';
        }
        
        initialData = {
          ...student,
          school: schoolId, // Store the school ID in formData.school
        };
      } else {
        initialData = student;
      }
      
      setFormData(initialData);
      originalFormDataRef.current = initialData;
      setIsDirty(false);
      
      console.log('📋 Form initialized with data:', initialData);
      
      // Mark this student as initialized
      initializedStudentIdRef.current = student.id;
    }
  }, [student?.id, schools]);

  // Reset when modal closes
  useEffect(() => {
    if (!student) {
      initializedStudentIdRef.current = null;
      originalFormDataRef.current = {};
      setIsDirty(false);
    }
  }, [student]);

  // Reset dirty flag when switching between edit/view modes
  useEffect(() => {
    if (!isEditing) {
      setIsDirty(false);
    }
  }, [isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Convert school to number when changed
    const processedValue = name === 'school' ? Number(value) : value;
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: processedValue,
      };
      
      // Check if form is dirty (has changes)
      const hasChanges = Object.keys(newData).some(key => {
        const original = originalFormDataRef.current[key];
        const current = newData[key];
        
        // Handle empty string vs null/undefined
        if ((original === null || original === undefined || original === '') && 
            (current === null || current === undefined || current === '')) {
          return false;
        }
        
        return String(original) !== String(current);
      });
      
      setIsDirty(hasChanges);
      
      return newData;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave && isDirty) {
      console.log('💾 Submitting form data:', formData);
      onSave(formData);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(student.id);
    }
  };

  const handleCancelEdit = () => {
    // Reset form data to original
    setFormData(originalFormDataRef.current);
    setIsDirty(false);
    
    if (onCancel) {
      onCancel();
    }
  };

  // Get the current school name for display in view mode
  const getSchoolDisplayName = () => {
    // If formData.school is a number (ID), find the name
    if (typeof formData.school === 'number' && schools.length > 0) {
      const schoolObj = schools.find(s => s.id === formData.school);
      return schoolObj ? schoolObj.name : 'N/A';
    }
    // If it's already a string (name), return it
    if (typeof formData.school === 'string') {
      return formData.school || 'N/A';
    }
    return 'N/A';
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Format date for input (YYYY-MM-DD) using local timezone
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return formatLocalDate(date);
    } catch {
      return dateStr;
    }
  };

  if (!student) return null;

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <style>
        {`
          .student-modal-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
          .student-modal-input:focus {
            border-color: rgba(16, 185, 129, 0.6) !important;
            box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2) !important;
          }
          .student-modal-select option {
            background-color: #1e293b;
            color: white;
          }
        `}
      </style>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            {isEditing ? 'Edit Student' : 'Student Details'}
          </h2>
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

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div style={styles.content}>
            <div style={styles.formGrid}>
              {/* Registration Number - NON-EDITABLE */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Registration Number</label>
                <div style={styles.valueDisplay}>{formData.reg_num || 'N/A'}</div>
              </div>

              {/* Student Name */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Student Name {isEditing && <span style={styles.required}>*</span>}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleChange}
                    placeholder="Enter student name"
                    required
                    style={styles.input}
                    className="student-modal-input"
                  />
                ) : (
                  <div style={styles.valueDisplay}>{formData.name || 'N/A'}</div>
                )}
              </div>

              {/* School */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  School {isEditing && <span style={styles.required}>*</span>}
                </label>
                {isEditing ? (
                  <select
                    name="school"
                    value={formData.school || ''}
                    onChange={handleChange}
                    required
                    style={styles.select}
                    className="student-modal-select"
                  >
                    <option value="">Select School</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={styles.valueDisplay}>{getSchoolDisplayName()}</div>
                )}
              </div>

              {/* Class */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Class {isEditing && <span style={styles.required}>*</span>}
                </label>
                {isEditing ? (
                  <select
                    name="student_class"
                    value={formData.student_class || ''}
                    onChange={handleChange}
                    required
                    style={styles.select}
                    className="student-modal-select"
                  >
                    <option value="">Select Class</option>
                    {classes
                      .filter(cls => cls !== 'All Classes')
                      .map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                  </select>
                ) : (
                  <div style={styles.valueDisplay}>{formData.student_class || 'N/A'}</div>
                )}
              </div>

              {/* Monthly Fee */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Monthly Fee</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="monthly_fee"
                    value={formData.monthly_fee || ''}
                    onChange={handleChange}
                    placeholder="Enter monthly fee"
                    style={styles.input}
                    className="student-modal-input"
                  />
                ) : (
                  <div style={styles.valueDisplay}>
                    {formData.monthly_fee ? `PKR ${formData.monthly_fee}` : 'N/A'}
                  </div>
                )}
              </div>

              {/* Phone */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    placeholder="e.g., 03001234567"
                    style={styles.input}
                    className="student-modal-input"
                  />
                ) : (
                  <div style={styles.valueDisplay}>{formData.phone || 'N/A'}</div>
                )}
                {isEditing && <small style={styles.helperText}>Parent/Guardian contact</small>}
              </div>

              {/* Gender */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Gender {isEditing && <span style={styles.required}>*</span>}
                </label>
                {isEditing ? (
                  <select
                    name="gender"
                    value={formData.gender || ''}
                    onChange={handleChange}
                    required
                    style={styles.select}
                    className="student-modal-select"
                  >
                    <option value="">Select Gender</option>
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={styles.valueDisplay}>{formData.gender || 'N/A'}</div>
                )}
              </div>

              {/* Date of Birth */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Date of Birth</label>
                {isEditing ? (
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formatDateForInput(formData.date_of_birth)}
                    onChange={handleChange}
                    style={styles.input}
                    className="student-modal-input"
                  />
                ) : (
                  <div style={styles.valueDisplay}>{formatDate(formData.date_of_birth)}</div>
                )}
              </div>

              {/* Date of Registration */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Date of Registration</label>
                {isEditing ? (
                  <input
                    type="date"
                    name="date_of_registration"
                    value={formatDateForInput(formData.date_of_registration)}
                    onChange={handleChange}
                    style={styles.input}
                    className="student-modal-input"
                  />
                ) : (
                  <div style={styles.valueDisplay}>{formatDate(formData.date_of_registration)}</div>
                )}
              </div>

              {/* Status */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                {isEditing ? (
                  <select
                    name="status"
                    value={formData.status || 'Active'}
                    onChange={handleChange}
                    style={styles.select}
                    className="student-modal-select"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{
                    ...styles.valueDisplay,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: formData.status === 'Active' ? '#22c55e' :
                                       formData.status === 'Pass Out' ? '#3b82f6' :
                                       formData.status === 'Left' ? '#f59e0b' : '#ef4444',
                    }}></span>
                    {formData.status || 'N/A'}
                  </div>
                )}
              </div>

              {/* Address - Full Width */}
              <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                <label style={styles.label}>Address</label>
                {isEditing ? (
                  <textarea
                    name="address"
                    value={formData.address || ''}
                    onChange={handleChange}
                    placeholder="Enter full address"
                    rows={2}
                    style={{
                      ...styles.input,
                      resize: 'vertical',
                      minHeight: '60px',
                    }}
                    className="student-modal-input"
                  />
                ) : (
                  <div style={styles.valueDisplay}>{formData.address || 'N/A'}</div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            {/* Delete Button (Left) */}
            {!isEditing && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                style={styles.deleteButton}
              >
                {isDeleting ? (
                  <>
                    <ClipLoader color="#fff" size={14} />
                    <span style={{ marginLeft: '6px' }}>Deleting...</span>
                  </>
                ) : (
                  '🗑️ Delete Student'
                )}
              </button>
            )}

            {/* Spacer when not editing */}
            {isEditing && <div></div>}

            {/* Action Buttons (Right) */}
            <div style={styles.buttonGroup}>
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                    style={{
                      ...styles.cancelButton,
                      ...(cancelButtonHovered ? styles.cancelButtonHover : {}),
                    }}
                    onMouseEnter={() => setCancelButtonHovered(true)}
                    onMouseLeave={() => setCancelButtonHovered(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isDirty || isSubmitting}
                    style={{
                      ...styles.submitButton,
                      opacity: !isDirty || isSubmitting ? 0.6 : 1,
                      cursor: !isDirty || isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <ClipLoader color="#fff" size={14} />
                        <span style={{ marginLeft: '6px' }}>Saving...</span>
                      </>
                    ) : (
                      '💾 Save Changes'
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    style={styles.secondaryButton}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={onEdit}
                    style={styles.primaryButton}
                  >
                    ✏️ Edit
                  </button>
                </>
              )}
            </div>
          </div>
        </form>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div style={styles.deleteConfirmOverlay} onClick={() => setShowDeleteConfirm(false)}>
            <div style={styles.deleteConfirmBox} onClick={(e) => e.stopPropagation()}>
              <h3 style={styles.deleteConfirmTitle}>Confirm Delete</h3>
              <p style={styles.deleteConfirmText}>
                Are you sure you want to delete <strong style={{ color: COLORS.text.white }}>{formData.name}</strong>?
                This action cannot be undone.
              </p>
              <div style={styles.deleteConfirmButtons}>
                <button
                  style={styles.secondaryButton}
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  style={styles.deleteButton}
                  onClick={() => {
                    handleDelete();
                    setShowDeleteConfirm(false);
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// Styles - Gradient Design (matching AddStudentPopup)
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
    maxWidth: '700px',
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
  content: {
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
  valueDisplay: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    background: 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    background: 'rgba(255, 255, 255, 0.03)',
  },
  buttonGroup: {
    display: 'flex',
    gap: SPACING.sm,
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
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
  secondaryButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
  },
  deleteButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: Z_INDEX.modalOverlay,
  },
  deleteConfirmBox: {
    background: COLORS.background.gradient,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  deleteConfirmTitle: {
    margin: `0 0 ${SPACING.sm} 0`,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  deleteConfirmText: {
    margin: `0 0 ${SPACING.lg} 0`,
    color: COLORS.text.whiteSubtle,
    lineHeight: 1.5,
  },
  deleteConfirmButtons: {
    display: 'flex',
    gap: SPACING.sm,
    justifyContent: 'flex-end',
  },
};

export default StudentDetailsModal;