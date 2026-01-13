// ============================================
// STUDENT DETAILS MODAL - Full Screen Overlay
// FIXED: Form dirty tracking + proper save button states
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../common/ui/Button';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
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

  // Styles
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background.overlay,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: Z_INDEX.modal,
    padding: SPACING.sm,
  };

  const modalStyle = {
    backgroundColor: COLORS.background.white,
    borderRadius: BORDER_RADIUS.md,
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: SHADOWS.xl,
  };

  const headerStyle = {
    padding: SPACING.lg,
    borderBottom: `1px solid ${COLORS.border.light}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.lightGray,
  };

  const titleStyle = {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.primary,
    margin: 0,
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: FONT_SIZES['2xl'],
    cursor: 'pointer',
    color: COLORS.text.secondary,
    padding: `${SPACING.xs} ${SPACING.xs}`,
    borderRadius: BORDER_RADIUS.xs,
    transition: `color ${TRANSITIONS.fast} ease`,
  };

  const contentStyle = {
    padding: SPACING.lg,
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: SPACING.lg,
  };

  const fieldStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
  };

  const labelStyle = {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.primary,
  };

  const inputStyle = {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    border: `1px solid ${COLORS.border.default}`,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.primary,
    backgroundColor: isEditing ? COLORS.background.white : COLORS.background.lightGray,
    transition: `border-color ${TRANSITIONS.fast} ease, box-shadow ${TRANSITIONS.fast} ease`,
  };

  const selectStyle = {
    ...inputStyle,
    cursor: isEditing ? 'pointer' : 'not-allowed',
  };

  const valueStyle = {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.lightGray,
    borderRadius: BORDER_RADIUS.sm,
  };

  const footerStyle = {
    padding: SPACING.lg,
    borderTop: `1px solid ${COLORS.border.light}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.background.lightGray,
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: SPACING.sm,
  };

  const deleteConfirmStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: Z_INDEX.modalOverlay,
  };

  const deleteConfirmBoxStyle = {
    backgroundColor: COLORS.background.white,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.xl,
    maxWidth: '400px',
    width: '90%',
    boxShadow: SHADOWS.xl,
  };

  if (!student) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={titleStyle}>
            {isEditing ? 'Edit Student' : 'Student Details'}
          </h2>
          <button
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={(e) => e.target.style.color = COLORS.text.primary}
            onMouseLeave={(e) => e.target.style.color = COLORS.text.secondary}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div style={contentStyle}>
            <div style={gridStyle}>
              {/* Registration Number - NON-EDITABLE */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Registration Number</label>
                <div style={valueStyle}>{formData.reg_num || 'N/A'}</div>
              </div>

              {/* Student Name */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Student Name *</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = COLORS.status.info;
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = COLORS.border.default;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                ) : (
                  <div style={valueStyle}>{formData.name || 'N/A'}</div>
                )}
              </div>

              {/* School - Using school ID for the value */}
              <div style={fieldStyle}>
                <label style={labelStyle}>School *</label>
                {isEditing ? (
                  <select
                    name="school"
                    value={formData.school || ''}
                    onChange={handleChange}
                    required
                    style={selectStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = COLORS.status.info;
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = COLORS.border.default;
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Select School</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={valueStyle}>{getSchoolDisplayName()}</div>
                )}
              </div>

              {/* Class */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Class *</label>
                {isEditing ? (
                  <select
                    name="student_class"
                    value={formData.student_class || ''}
                    onChange={handleChange}
                    required
                    style={selectStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = COLORS.status.info;
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = COLORS.border.default;
                      e.target.style.boxShadow = 'none';
                    }}
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
                  <div style={valueStyle}>{formData.student_class || 'N/A'}</div>
                )}
              </div>

              {/* Monthly Fee */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Monthly Fee</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="monthly_fee"
                    value={formData.monthly_fee || ''}
                    onChange={handleChange}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = COLORS.status.info;
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = COLORS.border.default;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                ) : (
                  <div style={valueStyle}>
                    {formData.monthly_fee ? `PKR ${formData.monthly_fee}` : 'N/A'}
                  </div>
                )}
              </div>

              {/* Phone */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = COLORS.status.info;
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = COLORS.border.default;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                ) : (
                  <div style={valueStyle}>{formData.phone || 'N/A'}</div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={footerStyle}>
            {/* Delete Button (Left) */}
            {!isEditing && (
              <Button
                type="button"
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <LoadingSpinner size="small" />
                    <span style={{ marginLeft: SPACING.xs }}>Deleting...</span>
                  </>
                ) : (
                  '🗑️ Delete Student'
                )}
              </Button>
            )}

            {/* Action Buttons (Right) */}
            <div style={buttonGroupStyle}>
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!isDirty || isSubmitting}
                    //style={{ minWidth: '150px' }}  // ADD THIS LINE

                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="small" />
                        <span style={{ marginLeft: SPACING.xs }}>Saving...</span>
                      </>
                    ) : (
                      '💾 Save Changes'
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={onEdit}
                  >
                    ✏️ Edit
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div style={deleteConfirmStyle} onClick={() => setShowDeleteConfirm(false)}>
            <div style={deleteConfirmBoxStyle} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: `0 0 ${SPACING.sm} 0`, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text.primary }}>
                Confirm Delete
              </h3>
              <p style={{ margin: `0 0 ${SPACING.lg} 0`, color: COLORS.text.secondary }}>
                Are you sure you want to delete <strong>{formData.name}</strong>? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: SPACING.sm, justifyContent: 'flex-end' }}>
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    handleDelete();
                    setShowDeleteConfirm(false);
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDetailsModal;