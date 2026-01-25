// ============================================
// USER DETAILS MODAL - View and Edit User
// Glassmorphism Design System
// ============================================

import React, { useState, useEffect } from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';

/**
 * UserDetailsModal Component
 * Combined view and edit modal for users with glassmorphism design
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
      let schoolIds = [];

      if (user.assigned_schools && Array.isArray(user.assigned_schools)) {
        schoolIds = user.assigned_schools.map(s => {
          const id = typeof s === 'object' ? s.id : s;
          return Number(id);
        });
      } else if (user.assigned_schools_names && schools.length > 0) {
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
    }
  }, [user, schools]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

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

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

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

    const submitData = {
      email: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name,
      role: formData.role,
      is_active: formData.is_active,
    };

    if (formData.role === 'Teacher') {
      submitData.assigned_schools = formData.assigned_schools;
    }

    if (onSave) {
      onSave(submitData);
    }
  };

  const handleCancelEdit = () => {
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

  // Format helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatSalary = (salary) => {
    if (!salary) return 'Not set';
    return `Rs ${Number(salary).toLocaleString()}`;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get assigned schools display names
  const getAssignedSchoolsDisplay = () => {
    if (user.assigned_schools_names) {
      if (typeof user.assigned_schools_names === 'string') {
        return user.assigned_schools_names;
      }
      if (Array.isArray(user.assigned_schools_names) && user.assigned_schools_names.length > 0) {
        return user.assigned_schools_names.join(', ');
      }
    }
    if (user.assigned_schools_count && user.assigned_schools_count > 0) {
      return `${user.assigned_schools_count} school${user.assigned_schools_count !== 1 ? 's' : ''} assigned`;
    }
    return 'None';
  };

  // Role colors
  const getRoleColor = (role) => {
    const colors = {
      Admin: { bg: 'rgba(139, 92, 246, 0.2)', text: '#A78BFA', border: 'rgba(139, 92, 246, 0.4)' },
      Teacher: { bg: 'rgba(245, 158, 11, 0.2)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.4)' },
      BDM: { bg: 'rgba(16, 185, 129, 0.2)', text: '#34D399', border: 'rgba(16, 185, 129, 0.4)' },
      Student: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.4)' },
    };
    return colors[role] || { bg: 'rgba(107, 114, 128, 0.2)', text: '#9CA3AF', border: 'rgba(107, 114, 128, 0.4)' };
  };

  const roleColor = getRoleColor(formData.role);

  if (!user) return null;

  // Get initials for avatar
  const getInitials = () => {
    if (formData.first_name && formData.last_name) {
      return `${formData.first_name.charAt(0)}${formData.last_name.charAt(0)}`.toUpperCase();
    }
    if (formData.first_name) return formData.first_name.charAt(0).toUpperCase();
    if (formData.username) return formData.username.charAt(0).toUpperCase();
    return '?';
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={{ ...styles.avatar, backgroundColor: roleColor.bg, borderColor: roleColor.border }}>
              {getInitials()}
            </div>
            <div>
              <h2 style={styles.title}>
                {isEditing ? 'Edit User' : 'User Details'}
              </h2>
              <p style={styles.subtitle}>
                @{formData.username} {formData.employee_id && `• ${formData.employee_id}`}
              </p>
            </div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div style={styles.content}>
            {/* Profile Section */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionIcon}>👤</span>
                <span style={styles.sectionTitle}>Profile Information</span>
              </div>
              <div style={styles.grid}>
                {/* First Name */}
                <div style={styles.field}>
                  <label style={styles.label}>First Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name || ''}
                      onChange={handleChange}
                      style={styles.input}
                      placeholder="Enter first name"
                    />
                  ) : (
                    <div style={styles.value}>{formData.first_name || 'Not set'}</div>
                  )}
                </div>

                {/* Last Name */}
                <div style={styles.field}>
                  <label style={styles.label}>Last Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name || ''}
                      onChange={handleChange}
                      style={styles.input}
                      placeholder="Enter last name"
                    />
                  ) : (
                    <div style={styles.value}>{formData.last_name || 'Not set'}</div>
                  )}
                </div>

                {/* Email */}
                <div style={styles.field}>
                  <label style={styles.label}>Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleChange}
                      style={styles.input}
                      placeholder="user@example.com"
                    />
                  ) : (
                    <div style={styles.value}>
                      {formData.email ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                          <span>✉️</span>
                          <span>{formData.email}</span>
                        </span>
                      ) : (
                        <span style={{ color: COLORS.text.whiteSubtle }}>No email set</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Role */}
                <div style={styles.field}>
                  <label style={styles.label}>Role</label>
                  {isEditing ? (
                    <>
                      <select
                        name="role"
                        value={formData.role || ''}
                        onChange={handleChange}
                        required
                        style={styles.select}
                      >
                        {roles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      {errors.role && <div style={styles.error}>{errors.role}</div>}
                    </>
                  ) : (
                    <div style={{
                      ...styles.badge,
                      backgroundColor: roleColor.bg,
                      color: roleColor.text,
                      border: `1px solid ${roleColor.border}`,
                    }}>
                      {formData.role === 'Admin' && '👑 '}
                      {formData.role === 'Teacher' && '📚 '}
                      {formData.role === 'BDM' && '💼 '}
                      {formData.role}
                      {formData.is_super_admin && ' (Super)'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Employment Section */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionIcon}>💼</span>
                <span style={styles.sectionTitle}>Employment Details</span>
              </div>
              <div style={styles.grid}>
                {/* Employee ID */}
                <div style={styles.field}>
                  <label style={styles.label}>Employee ID</label>
                  <div style={styles.value}>
                    {formData.employee_id || <span style={{ color: COLORS.text.whiteSubtle }}>Not assigned</span>}
                  </div>
                </div>

                {/* Date of Joining */}
                <div style={styles.field}>
                  <label style={styles.label}>Date of Joining</label>
                  <div style={styles.value}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                      <span>📅</span>
                      <span>{formatDate(formData.date_of_joining)}</span>
                    </span>
                  </div>
                </div>

                {/* Basic Salary */}
                <div style={styles.field}>
                  <label style={styles.label}>Basic Salary</label>
                  <div style={styles.value}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                      <span>💰</span>
                      <span style={{ color: formData.basic_salary ? '#10B981' : COLORS.text.whiteSubtle }}>
                        {formatSalary(formData.basic_salary)}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div style={styles.field}>
                  <label style={styles.label}>Status</label>
                  {isEditing ? (
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active || false}
                        onChange={handleChange}
                        style={styles.checkbox}
                      />
                      <span>Active</span>
                    </label>
                  ) : (
                    <div style={{
                      ...styles.badge,
                      backgroundColor: formData.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: formData.is_active ? '#34D399' : '#f87171',
                      border: `1px solid ${formData.is_active ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                    }}>
                      {formData.is_active ? '✅ Active' : '❌ Inactive'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Schools Section (Teachers only) */}
            {(formData.role === 'Teacher' || user.assigned_schools_count > 0) && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <span style={styles.sectionIcon}>🏫</span>
                  <span style={styles.sectionTitle}>Assigned Schools</span>
                </div>
                {isEditing && formData.role === 'Teacher' ? (
                  <div style={styles.field}>
                    <select
                      multiple
                      value={formData.assigned_schools || []}
                      onChange={handleSchoolChange}
                      style={{ ...styles.select, minHeight: '120px' }}
                    >
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                    <div style={styles.hint}>
                      Hold Ctrl (Windows) or Cmd (Mac) to select multiple schools
                    </div>
                    {errors.assigned_schools && <div style={styles.error}>{errors.assigned_schools}</div>}
                  </div>
                ) : (
                  <div style={styles.value}>{getAssignedSchoolsDisplay()}</div>
                )}
              </div>
            )}

            {/* Activity Section */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionIcon}>📊</span>
                <span style={styles.sectionTitle}>Activity & Audit</span>
              </div>
              <div style={styles.grid}>
                <div style={styles.field}>
                  <label style={styles.label}>Last Login</label>
                  <div style={styles.value}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                      <span>🕐</span>
                      <span>{formatDateTime(formData.last_login)}</span>
                    </span>
                  </div>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Created</label>
                  <div style={styles.value}>
                    {formatDateTime(formData.created_at)}
                    {formData.created_by_name && (
                      <span style={{ color: COLORS.text.whiteSubtle }}> by {formData.created_by_name}</span>
                    )}
                  </div>
                </div>

                {formData.updated_at && (
                  <div style={styles.field}>
                    <label style={styles.label}>Last Updated</label>
                    <div style={styles.value}>{formatDateTime(formData.updated_at)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  style={styles.secondaryButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={styles.primaryButton}
                >
                  {isSubmitting ? '⏳ Saving...' : '💾 Save Changes'}
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
                  ✏️ Edit User
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// STYLES - Glassmorphism Design System
// ============================================

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: SPACING.lg,
  },

  modal: {
    ...MIXINS.glassmorphicCard,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: BORDER_RADIUS.xl,
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.xl,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.lg,
  },

  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: BORDER_RADIUS.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    border: '2px solid',
  },

  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    margin: 0,
  },

  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    margin: 0,
    marginTop: SPACING.xs,
  },

  closeButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: COLORS.text.whiteMedium,
    width: '36px',
    height: '36px',
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    fontSize: FONT_SIZES.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `all ${TRANSITIONS.fast}`,
  },

  content: {
    padding: SPACING.xl,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xl,
  },

  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
  },

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },

  sectionIcon: {
    fontSize: FONT_SIZES.md,
  },

  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.whiteMedium,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: SPACING.lg,
  },

  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
  },

  label: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.whiteSubtle,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  value: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },

  input: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    outline: 'none',
    transition: `all ${TRANSITIONS.fast}`,
  },

  select: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    outline: 'none',
    cursor: 'pointer',
  },

  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#3B82F6',
  },

  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    cursor: 'pointer',
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },

  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: `${SPACING.xs} ${SPACING.md}`,
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    width: 'fit-content',
  },

  hint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    marginTop: SPACING.xs,
  },

  error: {
    fontSize: FONT_SIZES.xs,
    color: '#f87171',
    marginTop: SPACING.xs,
  },

  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    padding: SPACING.xl,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },

  primaryButton: {
    padding: `${SPACING.sm} ${SPACING.xl}`,
    backgroundColor: '#3B82F6',
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
  },

  secondaryButton: {
    padding: `${SPACING.sm} ${SPACING.xl}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
  },
};

export default UserDetailsModal;
