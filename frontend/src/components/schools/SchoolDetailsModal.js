// ============================================
// SCHOOL DETAILS MODAL - View/Edit School
// ============================================

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { updateSchool, fetchSchoolStats } from '../../api/services/schoolService';
import { Button } from '../common/ui/Button';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { LogoUploader } from './LogoUploader';
import { LocationPicker } from './LocationPicker';

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
}) => {
  const [formData, setFormData] = useState({});
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Load school stats when modal opens
  useEffect(() => {
    if (isOpen && school?.id) {
      loadStats();
    }
  }, [isOpen, school?.id]);

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
      });
    }
  }, [school]);

  // Load detailed stats
  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await fetchSchoolStats(school.id);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

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
      };

      // TODO: Upload logo if changed
      if (formData.logo && typeof formData.logo !== 'string') {
        // schoolData.logo = await uploadSchoolLogo(formData.logo, formData.name);
        console.log('Logo upload pending implementation');
      }

      await updateSchool(school.id, schoolData);
      
      toast.success('✅ School updated successfully!');
      
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error updating school:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to update school';
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !school) return null;

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
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  };

  const headerStyle = {
    padding: '1.5rem',
    borderBottom: '1px solid #E5E7EB',
    backgroundColor: '#F9FAFB',
  };

  const titleStyle = {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: '0.25rem',
  };

  const subtitleStyle = {
    fontSize: '0.875rem',
    color: '#6B7280',
  };

  const contentStyle = {
    padding: '1.5rem',
  };

  const statsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
  };

  const statItemStyle = {
    textAlign: 'center',
  };

  const statLabelStyle = {
    fontSize: '0.75rem',
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  };

  const statValueStyle = {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1F2937',
  };

  const sectionTitleStyle = {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: '1rem',
    marginTop: '1.5rem',
  };

  const fieldStyle = {
    marginBottom: '1.5rem',
  };

  const labelStyle = {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
    display: 'block',
  };

  const valueStyle = {
    padding: '0.625rem 0.75rem',
    fontSize: '0.875rem',
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    borderRadius: '0.5rem',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    color: '#374151',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical',
  };

  const errorStyle = {
    fontSize: '0.875rem',
    color: '#EF4444',
    marginTop: '0.25rem',
  };

  const checkboxContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const footerStyle = {
    padding: '1.5rem',
    borderTop: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    backgroundColor: '#F9FAFB',
  };

  const classBreakdownStyle = {
    marginTop: '1rem',
  };

  const classItemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    borderBottom: '1px solid #E5E7EB',
  };

  const classNameStyle = {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
  };

  const classStatsStyle = {
    fontSize: '0.875rem',
    color: '#6B7280',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={titleStyle}>
            {isEditing ? '✏️ Edit School' : '🏫 School Details'}
          </h2>
          <p style={subtitleStyle}>{school.name}</p>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {/* Statistics (View Mode Only) */}
          {!isEditing && !isLoadingStats && stats && (
            <>
              <h3 style={sectionTitleStyle}>📊 Statistics</h3>
              <div style={statsGridStyle}>
                <div style={statItemStyle}>
                  <div style={statLabelStyle}>Students</div>
                  <div style={statValueStyle}>👥 {stats.total_students || 0}</div>
                </div>
                <div style={statItemStyle}>
                  <div style={statLabelStyle}>Classes</div>
                  <div style={statValueStyle}>📚 {stats.total_classes || 0}</div>
                </div>
                <div style={statItemStyle}>
                  <div style={statLabelStyle}>Monthly Revenue</div>
                  <div style={statValueStyle}>
                    💰 {(stats.monthly_revenue / 1000).toFixed(0)}K
                  </div>
                </div>
                <div style={statItemStyle}>
                  <div style={statLabelStyle}>Capacity</div>
                  <div style={statValueStyle}>
                    {stats.capacity_utilization}%
                  </div>
                </div>
              </div>

              {/* Class Breakdown */}
              {stats.class_breakdown && stats.class_breakdown.length > 0 && (
                <div style={classBreakdownStyle}>
                  <h4 style={{ ...labelStyle, marginBottom: '0.5rem' }}>
                    📚 Class Breakdown
                  </h4>
                  {stats.class_breakdown.map((cls, idx) => (
                    <div key={idx} style={classItemStyle}>
                      <span style={classNameStyle}>{cls.class_name}</span>
                      <span style={classStatsStyle}>
                        {cls.students} students • PKR {cls.monthly_revenue.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {isLoadingStats && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
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
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                    e.target.style.boxShadow = 'none';
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
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                    e.target.style.boxShadow = 'none';
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
                  e.target.style.borderColor = '#3B82F6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#D1D5DB';
                  e.target.style.boxShadow = 'none';
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
                  e.target.style.borderColor = '#3B82F6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#D1D5DB';
                  e.target.style.boxShadow = 'none';
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
                  e.target.style.borderColor = '#3B82F6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#D1D5DB';
                  e.target.style.boxShadow = 'none';
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
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {errors.total_capacity && <div style={errorStyle}>{errors.total_capacity}</div>}
              </>
            ) : (
              <div style={valueStyle}>{school.total_capacity || 'N/A'} students</div>
            )}
          </div>

          {isEditing && (
            <div style={fieldStyle}>
              <div style={checkboxContainerStyle}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
                  ✓ School is Active
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
              {isAdmin && (
                <Button variant="primary" onClick={onEdit}>
                  ✏️ Edit
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolDetailsModal;