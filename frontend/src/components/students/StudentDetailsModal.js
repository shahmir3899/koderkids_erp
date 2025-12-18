// ============================================
// STUDENT DETAILS MODAL - Full Screen Overlay
// FIXED: Form dirty tracking + proper save button states
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../common/ui/Button';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';

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
    backgroundColor: isEditing ? '#FFFFFF' : '#F9FAFB',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  };

  const selectStyle = {
    ...inputStyle,
    cursor: isEditing ? 'pointer' : 'not-allowed',
  };

  const valueStyle = {
    padding: '0.625rem 0.75rem',
    fontSize: '0.875rem',
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    borderRadius: '0.5rem',
  };

  const footerStyle = {
    padding: '1.5rem',
    borderTop: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: '#F9FAFB',
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '0.75rem',
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
    zIndex: 1001,
  };

  const deleteConfirmBoxStyle = {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '2rem',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
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
            onMouseEnter={(e) => e.target.style.color = '#1F2937'}
            onMouseLeave={(e) => e.target.style.color = '#6B7280'}
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
                      e.target.style.borderColor = '#3B82F6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#D1D5DB';
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
                      e.target.style.borderColor = '#3B82F6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#D1D5DB';
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
                      e.target.style.borderColor = '#3B82F6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#D1D5DB';
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
                      e.target.style.borderColor = '#3B82F6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#D1D5DB';
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
                      e.target.style.borderColor = '#3B82F6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#D1D5DB';
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
                    <span style={{ marginLeft: '0.5rem' }}>Deleting...</span>
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
                        <span style={{ marginLeft: '0.5rem' }}>Saving...</span>
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
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '600', color: '#1F2937' }}>
                Confirm Delete
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', color: '#6B7280' }}>
                Are you sure you want to delete <strong>{formData.name}</strong>? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
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