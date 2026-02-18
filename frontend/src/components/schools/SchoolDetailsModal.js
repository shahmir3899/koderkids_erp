// ============================================
// SCHOOL DETAILS MODAL - View/Edit School
// Updated with Payment Mode Configuration
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'react-toastify';
import { updateSchool, fetchSchoolStats } from '../../api/services/schoolService';
import { uploadSchoolLogo } from '../../utils/supabaseUpload';
import { Button } from '../common/ui/Button';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { LogoUploader } from './LogoUploader';
import { LocationPicker } from './LocationPicker';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
  Z_INDEX,
} from '../../utils/designConstants';

/**
 * SchoolDetailsModal Component
 * View and edit school details with statistics
 *
 * @param {Object} props
 * @param {Object} props.school - School object to display
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {boolean} props.isEditing - Whether in edit mode
 * @param {Function} props.onClose - Close modal callback
 * @param {Function} props.onEdit - Enable edit mode callback
 * @param {Function} props.onCancel - Cancel edit mode callback
 * @param {Function} props.onSave - Save changes callback
 * @param {boolean} props.isAdmin - Whether user is admin
 * @param {boolean} props.canEdit - Whether user can edit (Admin or BDM)
 */
export const SchoolDetailsModal = ({
  school,
  isOpen,
  isEditing,
  onClose,
  onEdit,
  onCancel,
  onSave,
  isAdmin = false,
  canEdit = false,
}) => {
  const [formData, setFormData] = useState({});
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Load detailed stats - wrapped in useCallback
  const loadStats = useCallback(async () => {
    if (!school?.id) return;
    setIsLoadingStats(true);
    try {
      const data = await fetchSchoolStats(school.id);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, [school?.id]);

  // Load school stats when modal opens
  useEffect(() => {
    if (isOpen && school?.id) {
      loadStats();
    }
  }, [isOpen, school?.id, loadStats]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // Initialize form data
  useEffect(() => {
    if (school) {
      setFormData({
        name: school.name || '',
        address: school.address || school.location || '',
        logo: school.logo || null,
        latitude: school.latitude || 33.5651,
        longitude: school.longitude || 73.0169,
        contact_email: school.contact_email || '',
        contact_phone: school.contact_phone || '',
        established_date: school.established_date || '',
        total_capacity: school.total_capacity || '',
        is_active: school.is_active !== false,
        // 📅 Assigned Days Configuration
        assigned_days: school.assigned_days || [],
        // 💰 Payment Configuration
        payment_mode: school.payment_mode || 'per_student',
        monthly_subscription_amount: school.monthly_subscription_amount || '',
      });
    }
  }, [school]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };
      
      // 💰 Clear subscription amount when switching to per_student mode
      if (name === 'payment_mode' && value === 'per_student') {
        updated.monthly_subscription_amount = '';
      }
      
      return updated;
    });
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Handle assigned days change (checkboxes)
  const handleDayToggle = (dayIndex) => {
    setFormData(prev => {
      const currentDays = prev.assigned_days || [];
      if (currentDays.includes(dayIndex)) {
        // Remove day
        return { ...prev, assigned_days: currentDays.filter(d => d !== dayIndex) };
      } else {
        // Add day and sort
        return { ...prev, assigned_days: [...currentDays, dayIndex].sort((a, b) => a - b) };
      }
    });
  };

  // Day names for display
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Handle logo change
  const handleLogoChange = (file) => {
    setFormData(prev => ({ ...prev, logo: file }));
  };

  // Handle logo remove
  const handleLogoRemove = () => {
    setFormData(prev => ({ ...prev, logo: null }));
  };

  // Handle location change
  const handleLocationChange = (lat, lng) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'School name is required';
    }
    if (!formData.address?.trim()) {
      newErrors.address = 'Address is required';
    }
    if (formData.total_capacity && formData.total_capacity < 1) {
      newErrors.total_capacity = 'Capacity must be at least 1';
    }
    
    // 💰 Validate payment mode
    if (formData.payment_mode === 'monthly_subscription') {
      if (!formData.monthly_subscription_amount || parseFloat(formData.monthly_subscription_amount) <= 0) {
        newErrors.monthly_subscription_amount = 'Subscription amount is required and must be greater than 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const schoolData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        contact_email: formData.contact_email?.trim() || null,
        contact_phone: formData.contact_phone?.trim() || null,
        established_date: formData.established_date || null,
        total_capacity: formData.total_capacity ? parseInt(formData.total_capacity) : null,
        is_active: formData.is_active,
        // 📅 Assigned Days Configuration
        assigned_days: formData.assigned_days || [],
        // 💰 Payment Configuration
        payment_mode: formData.payment_mode,
        monthly_subscription_amount: formData.payment_mode === 'monthly_subscription'
          ? parseFloat(formData.monthly_subscription_amount)
          : null,
      };

      // Upload logo if a new file was selected (not a URL string)
      if (formData.logo && typeof formData.logo !== 'string') {
        try {
          toast.info('Uploading logo...');
          const logoUrl = await uploadSchoolLogo(formData.logo, formData.name);
          if (logoUrl) {
            schoolData.logo = logoUrl;
          }
        } catch (logoError) {
          console.error('Logo upload failed:', logoError);
          toast.warning('Logo upload failed, but school details will still be saved.');
        }
      } else if (formData.logo === null) {
        // Logo was removed
        schoolData.logo = null;
      }

      await updateSchool(school.id, schoolData);

      toast.success('School updated successfully!');

      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error updating school:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to update school';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !school) return null;

  // Glassmorphic Styles
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: COLORS.background.gradient,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: Z_INDEX.modal,
    padding: SPACING.lg,
  };

  const modalStyle = {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
  };

  const headerStyle = {
    padding: SPACING.xl,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    background: 'rgba(255, 255, 255, 0.05)',
    position: 'relative',
  };

  const closeButtonStyle = {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    width: '32px',
    height: '32px',
    borderRadius: BORDER_RADIUS.full,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    background: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    fontSize: FONT_SIZES.lg,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `all ${TRANSITIONS.normal} ease`,
    padding: 0,
  };

  const titleStyle = {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    marginBottom: SPACING.xs,
  };

  const subtitleStyle = {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  };

  const contentStyle = {
    padding: SPACING.xl,
  };

  const statsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BORDER_RADIUS.lg,
    border: `1px solid ${COLORS.border.whiteSubtle}`,
  };

  const statItemStyle = {
    textAlign: 'center',
    padding: SPACING.md,
  };

  const statLabelStyle = {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    fontWeight: FONT_WEIGHTS.medium,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: SPACING.sm,
  };

  const statValueStyle = {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  };

  const sectionTitleStyle = {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    marginBottom: SPACING.lg,
    marginTop: SPACING.xl,
  };

  const fieldStyle = {
    marginBottom: SPACING.lg,
  };

  const labelStyle = {
    display: 'block',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.whiteMedium,
    marginBottom: SPACING.sm,
  };

  const inputStyle = {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.lg}`,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transition: `all ${TRANSITIONS.normal} ease`,
    outline: 'none',
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical',
  };

  const valueStyle = {
    padding: `${SPACING.md} ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.border.whiteSubtle}`,
  };

  const errorStyle = {
    color: COLORS.status.error,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  };

  const checkboxContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  };

  const footerStyle = {
    padding: SPACING.xl,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    display: 'flex',
    justifyContent: 'space-between',
    gap: SPACING.md,
    background: 'rgba(255, 255, 255, 0.05)',
  };

  const infoBoxStyle = {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    border: `1px solid rgba(59, 130, 246, 0.3)`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
  };

  return ReactDOM.createPortal(
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <button
            type="button"
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              e.target.style.borderColor = COLORS.border.whiteMedium;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.borderColor = COLORS.border.whiteTransparent;
            }}
            title="Close (Esc)"
          >
            ✕
          </button>
          <h2 style={titleStyle}>
            {isEditing ? '✏️ Edit School' : '🏫 School Details'}
          </h2>
          <p style={subtitleStyle}>{school.name}</p>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {/* Statistics (View Mode Only) */}
          {!isEditing && (
            <>
              <div style={statsGridStyle}>
                <div style={statItemStyle}>
                  <div style={statLabelStyle}>Students</div>
                  <div style={statValueStyle}>
                    {stats?.total_students || school.total_students || 0}
                  </div>
                </div>
                <div style={statItemStyle}>
                  <div style={statLabelStyle}>Classes</div>
                  <div style={statValueStyle}>
                    {stats?.total_classes || school.total_classes || 0}
                  </div>
                </div>
                <div style={statItemStyle}>
                  <div style={statLabelStyle}>Monthly Revenue</div>
                  <div style={statValueStyle}>
                    PKR {(stats?.monthly_revenue || school.monthly_revenue || 0).toLocaleString()}
                  </div>
                </div>
                <div style={statItemStyle}>
                  <div style={statLabelStyle}>Capacity</div>
                  <div style={statValueStyle}>
                    {stats?.capacity_utilization || school.capacity_utilization || 0}%
                  </div>
                </div>
              </div>

              {/* Class Breakdown (if available) */}
              {stats?.class_breakdown && stats.class_breakdown.length > 0 && (
                <div style={{ marginBottom: SPACING.xl }}>
                  <div style={{ fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text.white, marginBottom: SPACING.sm }}>
                    📊 Class Breakdown
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.sm }}>
                    {stats.class_breakdown.map((cls, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: `${SPACING.sm} ${SPACING.md}`,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: BORDER_RADIUS.sm,
                          fontSize: FONT_SIZES.xs,
                          border: `1px solid ${COLORS.border.whiteSubtle}`,
                          color: COLORS.text.white,
                        }}
                      >
                        <strong>{cls.class_name}:</strong>{' '}
                        <span style={{ color: COLORS.text.whiteSubtle }}>
                          {cls.students} students • PKR {cls.monthly_revenue.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {isLoadingStats && (
            <div style={{ textAlign: 'center', padding: SPACING['2xl'] }}>
              <LoadingSpinner />
            </div>
          )}

          {/* School Information */}
          <h3 style={sectionTitleStyle}>📋 School Information</h3>

          {isEditing && (
            <LogoUploader
              currentLogo={formData.logo}
              onLogoChange={handleLogoChange}
              onLogoRemove={handleLogoRemove}
            />
          )}

          <div style={fieldStyle}>
            <label style={labelStyle}>School Name *</label>
            {isEditing ? (
              <>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  style={inputStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = COLORS.border.whiteMedium;
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = COLORS.border.whiteTransparent;
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                />
                {errors.name && <div style={errorStyle}>{errors.name}</div>}
              </>
            ) : (
              <div style={valueStyle}>{school.name}</div>
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Address *</label>
            {isEditing ? (
              <>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  style={textareaStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = COLORS.border.whiteMedium;
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = COLORS.border.whiteTransparent;
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                />
                {errors.address && <div style={errorStyle}>{errors.address}</div>}
              </>
            ) : (
              <div style={valueStyle}>{school.address || school.location || 'N/A'}</div>
            )}
          </div>

          {/* Location */}
          {isEditing ? (
            <LocationPicker
              initialLat={formData.latitude}
              initialLng={formData.longitude}
              onLocationChange={handleLocationChange}
            />
          ) : (
            <div style={fieldStyle}>
              <label style={labelStyle}>📍 Location</label>
              <div style={valueStyle}>
                Lat: {school.latitude || 'N/A'}, Lng: {school.longitude || 'N/A'}
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div style={fieldStyle}>
            <label style={labelStyle}>📧 Contact Email</label>
            {isEditing ? (
              <input
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = COLORS.border.whiteMedium;
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = COLORS.border.whiteTransparent;
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
              />
            ) : (
              <div style={valueStyle}>{school.contact_email || 'N/A'}</div>
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>📞 Contact Phone</label>
            {isEditing ? (
              <input
                type="tel"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = COLORS.border.whiteMedium;
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = COLORS.border.whiteTransparent;
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
              />
            ) : (
              <div style={valueStyle}>{school.contact_phone || 'N/A'}</div>
            )}
          </div>

          {/* Additional Details */}
          <div style={fieldStyle}>
            <label style={labelStyle}>📅 Established Date</label>
            {isEditing ? (
              <input
                type="date"
                name="established_date"
                value={formData.established_date}
                onChange={handleChange}
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = COLORS.border.whiteMedium;
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = COLORS.border.whiteTransparent;
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
              />
            ) : (
              <div style={valueStyle}>{school.established_date || 'N/A'}</div>
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>👥 Total Capacity</label>
            {isEditing ? (
              <>
                <input
                  type="number"
                  name="total_capacity"
                  value={formData.total_capacity}
                  onChange={handleChange}
                  min="1"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = COLORS.border.whiteMedium;
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = COLORS.border.whiteTransparent;
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                />
                {errors.total_capacity && <div style={errorStyle}>{errors.total_capacity}</div>}
              </>
            ) : (
              <div style={valueStyle}>{school.total_capacity || 'N/A'} students</div>
            )}
          </div>

          {/* 📅 ASSIGNED DAYS SECTION */}
          <div style={fieldStyle}>
            <label style={labelStyle}>📅 Assigned Days (for Teacher Attendance)</label>
            {isEditing ? (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: SPACING.sm,
                padding: SPACING.md,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: BORDER_RADIUS.md,
                border: `1px solid ${COLORS.border.whiteSubtle}`,
              }}>
                {DAY_NAMES.map((day, index) => {
                  const isSelected = formData.assigned_days?.includes(index);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDayToggle(index)}
                      style={{
                        padding: `${SPACING.sm} ${SPACING.md}`,
                        borderRadius: BORDER_RADIUS.md,
                        border: `1px solid ${isSelected ? 'rgba(16, 185, 129, 0.5)' : COLORS.border.whiteTransparent}`,
                        backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: isSelected ? '#10b981' : COLORS.text.whiteSubtle,
                        fontSize: FONT_SIZES.sm,
                        fontWeight: isSelected ? FONT_WEIGHTS.semibold : FONT_WEIGHTS.normal,
                        cursor: 'pointer',
                        transition: `all ${TRANSITIONS.normal} ease`,
                        minWidth: '80px',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                          e.target.style.borderColor = COLORS.border.whiteMedium;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                          e.target.style.borderColor = COLORS.border.whiteTransparent;
                        }
                      }}
                    >
                      {isSelected && '✓ '}{DAY_SHORT[index]}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={valueStyle}>
                {school.assigned_days_display && school.assigned_days_display.length > 0
                  ? school.assigned_days_display.join(', ')
                  : school.assigned_days && school.assigned_days.length > 0
                    ? school.assigned_days.map(d => DAY_NAMES[d]).join(', ')
                    : 'Not set (will use Lesson Plans)'}
              </div>
            )}
            {isEditing && (
              <div style={{
                marginTop: SPACING.sm,
                fontSize: FONT_SIZES.xs,
                color: COLORS.text.whiteSubtle,
                fontStyle: 'italic',
              }}>
                Select the days when this school operates. Used for teacher attendance tracking.
              </div>
            )}
          </div>

          {/* 💰 PAYMENT CONFIGURATION SECTION */}
          <div style={{
            borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
            paddingTop: SPACING.xl,
            marginTop: SPACING.xl,
          }}>
            <h3 style={sectionTitleStyle}>💰 Payment Configuration</h3>
          </div>

          {/* Payment Mode */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Payment Mode *</label>
            {isEditing ? (
              <select
                name="payment_mode"
                value={formData.payment_mode}
                onChange={handleChange}
                required
                style={selectStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = COLORS.border.whiteMedium;
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = COLORS.border.whiteTransparent;
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <option value="per_student">Per Student (Individual Fees)</option>
                <option value="monthly_subscription">Monthly Subscription (Fixed Total)</option>
              </select>
            ) : (
              <div style={valueStyle}>
                {school.payment_mode === 'monthly_subscription' 
                  ? '💳 Monthly Subscription (Fixed Total)' 
                  : '👤 Per Student (Individual Fees)'}
              </div>
            )}
          </div>

          {/* Monthly Subscription Amount - Only show if mode is subscription */}
          {(isEditing ? formData.payment_mode === 'monthly_subscription' : school?.payment_mode === 'monthly_subscription') && (
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Monthly Subscription Amount (PKR) *
              </label>
              {isEditing ? (
                <>
                  <input
                    type="number"
                    name="monthly_subscription_amount"
                    value={formData.monthly_subscription_amount}
                    onChange={handleChange}
                    required={formData.payment_mode === 'monthly_subscription'}
                    min="0"
                    step="0.01"
                    placeholder="Enter total monthly subscription"
                    style={{
                      ...inputStyle,
                      borderColor: errors.monthly_subscription_amount ? COLORS.status.error : COLORS.border.whiteTransparent,
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = COLORS.border.whiteMedium;
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.monthly_subscription_amount ? COLORS.status.error : COLORS.border.whiteTransparent;
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  />
                  {errors.monthly_subscription_amount && (
                    <div style={errorStyle}>{errors.monthly_subscription_amount}</div>
                  )}
                </>
              ) : (
                <div style={valueStyle}>
                  PKR {school.monthly_subscription_amount?.toLocaleString() || 'Not Set'}
                </div>
              )}
            </div>
          )}

          {/* Info Box - Show calculation if in subscription mode (view mode only) */}
          {!isEditing && school?.payment_mode === 'monthly_subscription' && school?.monthly_subscription_amount && (
            <div style={infoBoxStyle}>
              <div style={{ marginBottom: SPACING.sm, fontWeight: FONT_WEIGHTS.semibold }}>
                📊 Fee Calculation Info:
              </div>
              <div>
                The subscription amount of <strong>PKR {school.monthly_subscription_amount.toLocaleString()}</strong> will
                be divided equally among all active students when creating monthly fee records.
              </div>
              {(stats?.total_students || school.total_students) > 0 && (
                <div style={{ marginTop: SPACING.md, paddingTop: SPACING.md, borderTop: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <div>
                    <strong>Current Active Students:</strong> {stats?.total_students || school.total_students}
                  </div>
                  <div>
                    <strong>Fee per Student:</strong> PKR{' '}
                    {(school.monthly_subscription_amount / (stats?.total_students || school.total_students)).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info Box - Editing mode explanation */}
          {isEditing && formData.payment_mode === 'per_student' && (
            <div style={infoBoxStyle}>
              <strong>Per Student Mode:</strong> Each student's monthly fee is taken from their individual 
              student record. Fee records will use each student's configured monthly_fee amount.
            </div>
          )}

          {isEditing && formData.payment_mode === 'monthly_subscription' && formData.monthly_subscription_amount && (
            <div style={infoBoxStyle}>
              <strong>Monthly Subscription Mode:</strong> The total subscription amount will be divided equally
              among all active students when creating fee records.
              {(stats?.total_students || school.total_students) > 0 && (
                <div style={{ marginTop: SPACING.sm }}>
                  Based on current <strong>{stats?.total_students || school.total_students} active students</strong>,
                  each student will pay: <strong>PKR {(parseFloat(formData.monthly_subscription_amount) / (stats?.total_students || school.total_students)).toFixed(2)}</strong>
                </div>
              )}
            </div>
          )}

          {/* Active Status Checkbox */}
          {isEditing && (
            <div style={fieldStyle}>
              <div style={checkboxContainerStyle}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: COLORS.status.success }}
                />
                <label style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer', color: COLORS.text.white }}>
                  School is Active
                </label>
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
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSave}
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
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              {/* Edit button: Show for Admin or BDM */}
              {(isAdmin || canEdit) && (
                <Button variant="primary" onClick={onEdit}>
                  ✏️ Edit
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SchoolDetailsModal;