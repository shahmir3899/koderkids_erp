// ============================================
// USER DETAILS MODAL - View and Edit User
// ============================================

import React, { useState, useEffect } from 'react';
import { Button } from '../common/ui/Button';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';

/**
 * UserDetailsModal Component
 * Combined view and edit modal for users
 * 
 * @param {Object} props
 * @param {Object} props.user - User object to display/edit
 * @param {boolean} props.isEditing - Whether in edit mode
 * @param {Function} props.onClose - Close modal callback
 * @param {Function} props.onSave - Save changes callback
 * @param {Function} props.onEdit - Enable edit mode callback
 * @param {Function} props.onCancel - Cancel edit mode callback
 * @param {Array} props.schools - Array of school objects
 * @param {Array} props.roles - Array of role objects
 * @param {boolean} props.isSubmitting - Submitting state for save
 */
export const UserDetailsModal = ({
  user,
  isEditing,
  onClose,
  onSave,
  onEdit,
  onCancel,
  schools = [],
  roles = [],
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      console.log('📋 Initializing UserDetailsModal with user:', user.username);
      console.log('📋 Full user object:', user);
      console.log('📋 user.assigned_schools:', user.assigned_schools);
      console.log('📋 user.assigned_schools_names:', user.assigned_schools_names);
      
      // Extract school IDs from assigned_schools array (if it exists)
      // Otherwise, we'll need to look up IDs from names when editing
      let schoolIds = [];
      
      if (user.assigned_schools && Array.isArray(user.assigned_schools)) {
        // Backend sent full assigned_schools array
        schoolIds = user.assigned_schools.map(s => {
          const id = typeof s === 'object' ? s.id : s;
          return Number(id);
        });
      } else if (user.assigned_schools_names && schools.length > 0) {
        // We only have names, need to look up IDs from schools prop
        const names = Array.isArray(user.assigned_schools_names) 
          ? user.assigned_schools_names 
          : [user.assigned_schools_names];
        
        schoolIds = names.map(name => {
          const school = schools.find(s => s.name === name);
          return school ? school.id : null;
        }).filter(id => id !== null);
      }
      
      setFormData({
        ...user,
        assigned_schools: schoolIds,
      });
      
      console.log('📋 Form initialized with school IDs:', schoolIds);
    }
  }, [user, schools]);

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

  const validateForm = () => {
    const newErrors = {};

    // Role required
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    // If role is Teacher, check assigned schools
    if (formData.role === 'Teacher' && formData.assigned_schools.length === 0) {
      newErrors.assigned_schools = 'Teachers must be assigned to at least one school';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Prepare data for submission
    const submitData = {
      email: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name,
      role: formData.role,
      is_active: formData.is_active,
    };

    // Add assigned_schools if Teacher
    if (formData.role === 'Teacher') {
      submitData.assigned_schools = formData.assigned_schools;
    }

    console.log('📤 Updating user:', submitData);

    if (onSave) {
      onSave(submitData);
    }
  };

  const handleCancelEdit = () => {
    // Reset form data to original user data
    const schoolIds = user.assigned_schools?.map(s => s.id || s) || [];
    setFormData({
      ...user,
      assigned_schools: schoolIds,
    });
    setErrors({});
    
    if (onCancel) {
      onCancel();
    }
  };

  // Get assigned schools display names
  const getAssignedSchoolsDisplay = () => {
    console.log('🏫 Getting assigned schools display...');
    console.log('🏫 user.assigned_schools_names:', user.assigned_schools_names);
    console.log('🏫 user.assigned_schools_count:', user.assigned_schools_count);

    // Use assigned_schools_names from backend (the correct field!)
    if (user.assigned_schools_names) {
      // If it's already a string, return it
      if (typeof user.assigned_schools_names === 'string') {
        console.log('🏫 School names (string):', user.assigned_schools_names);
        return user.assigned_schools_names;
      }
      
      // If it's an array, join them
      if (Array.isArray(user.assigned_schools_names) && user.assigned_schools_names.length > 0) {
        const result = user.assigned_schools_names.join(', ');
        console.log('🏫 School names (array):', result);
        return result;
      }
    }

    // Fallback to count if names not available
    if (user.assigned_schools_count && user.assigned_schools_count > 0) {
      console.log('🏫 Only have count:', user.assigned_schools_count);
      return `${user.assigned_schools_count} school${user.assigned_schools_count !== 1 ? 's' : ''} assigned`;
    }

    // No schools assigned
    console.log('🏫 No assigned schools');
    return 'None';
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

  const badgeStyle = (color, bgColor) => ({
    backgroundColor: bgColor,
    color: color,
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '600',
    display: 'inline-block',
  });

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

  if (!user) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={titleStyle}>
            {isEditing ? '✏️ Edit User' : '👁️ User Details'}
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
              {/* ID - NON-EDITABLE */}
              <div style={fieldStyle}>
                <label style={labelStyle}>ID</label>
                <div style={valueStyle}>{formData.id || 'N/A'}</div>
              </div>

              {/* Username - NON-EDITABLE */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Username</label>
                <div style={valueStyle}>{formData.username || 'N/A'}</div>
              </div>

              {/* Email */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    style={inputStyle}
                    placeholder="user@koderkids.pk"
                  />
                ) : (
                  <div style={valueStyle}>{formData.email || 'N/A'}</div>
                )}
              </div>

              {/* First Name */}
              <div style={fieldStyle}>
                <label style={labelStyle}>First Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name || ''}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                ) : (
                  <div style={valueStyle}>{formData.first_name || 'N/A'}</div>
                )}
              </div>

              {/* Last Name */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Last Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name || ''}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                ) : (
                  <div style={valueStyle}>{formData.last_name || 'N/A'}</div>
                )}
              </div>

              {/* Role */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Role</label>
                {isEditing ? (
                  <>
                    <select
                      name="role"
                      value={formData.role || ''}
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
                  </>
                ) : (
                  <div>
                    <span style={badgeStyle(
                      formData.role === 'Admin' ? '#8B5CF6' :
                      formData.role === 'Teacher' ? '#F59E0B' : '#3B82F6',
                      formData.role === 'Admin' ? '#F5F3FF' :
                      formData.role === 'Teacher' ? '#FFFBEB' : '#EFF6FF'
                    )}>
                      {formData.role}
                    </span>
                  </div>
                )}
              </div>

              {/* Status */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Status</label>
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active || false}
                      onChange={handleChange}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>Active</span>
                  </div>
                ) : (
                  <div>
                    <span style={badgeStyle(
                      formData.is_active ? '#10B981' : '#EF4444',
                      formData.is_active ? '#ECFDF5' : '#FEF2F2'
                    )}>
                      {formData.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                )}
              </div>

              {/* Super Admin Badge - NON-EDITABLE */}
              {formData.is_super_admin && (
                <div style={fieldStyle}>
                  <label style={labelStyle}>Privileges</label>
                  <div>
                    <span style={badgeStyle('#8B5CF6', '#F5F3FF')}>
                      👑 Super Admin
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Assigned Schools (Only for Teachers) */}
            {(formData.role === 'Teacher' || user.assigned_schools?.length > 0) && (
              <div style={{ ...fieldStyle, marginTop: '1.5rem' }}>
                <label style={labelStyle}>Assigned Schools</label>
                {isEditing && formData.role === 'Teacher' ? (
                  <>
                    <select
                      multiple
                      value={formData.assigned_schools || []}
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
                  </>
                ) : (
                  <div style={valueStyle}>{getAssignedSchoolsDisplay()}</div>
                )}
              </div>
            )}

            {/* Audit Information */}
            {formData.created_at && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#F9FAFB', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.5rem' }}>
                  Audit Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.75rem', color: '#6B7280' }}>
                  <div>
                    <strong>Created:</strong> {new Date(formData.created_at).toLocaleString()}
                  </div>
                  {formData.updated_at && (
                    <div>
                      <strong>Updated:</strong> {new Date(formData.updated_at).toLocaleString()}
                    </div>
                  )}
                  {formData.created_by_name && (
                    <div>
                      <strong>Created By:</strong> {formData.created_by_name}
                    </div>
                  )}
                  {formData.last_login && (
                    <div>
                      <strong>Last Login:</strong> {new Date(formData.last_login).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={footerStyle}>
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
                  disabled={isSubmitting}
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
        </form>
      </div>
    </div>
  );
};

export default UserDetailsModal;