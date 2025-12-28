// ============================================
// ADD SCHOOL MODAL - Multi-Step Creation Wizard
// Updated with Payment Mode Configuration
// ============================================

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { createSchool } from '../../api/services/schoolService';
import { uploadSchoolLogo } from '../../utils/supabaseUpload';
import { Button } from '../common/ui/Button';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { LogoUploader } from './LogoUploader';
import { LocationPicker } from './LocationPicker';

/**
 * AddSchoolModal Component
 * Multi-step wizard for creating a new school
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close modal callback
 * @param {Function} props.onSuccess - Success callback
 */
export const AddSchoolModal = ({ isOpen, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    logo: null,
    latitude: 33.5651,
    longitude: 73.0169,
    contact_email: '',
    contact_phone: '',
    established_date: '',
    total_capacity: '',
    is_active: true,
    // 💰 Payment Configuration
    payment_mode: 'per_student',
    monthly_subscription_amount: '',
  });

  const [errors, setErrors] = useState({});

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
    
    // Clear error for this field
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

  // Validate current step
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'School name is required';
      }
      if (!formData.address.trim()) {
        newErrors.address = 'Address is required';
      }
    }

    if (step === 2) {
      if (!formData.latitude || !formData.longitude) {
        newErrors.location = 'Location coordinates are required';
      }
    }

    if (step === 3) {
      if (formData.total_capacity && formData.total_capacity < 1) {
        newErrors.total_capacity = 'Capacity must be at least 1';
      }
      
      // 💰 Validate payment mode
      if (formData.payment_mode === 'monthly_subscription') {
        if (!formData.monthly_subscription_amount || parseFloat(formData.monthly_subscription_amount) <= 0) {
          newErrors.monthly_subscription_amount = 'Subscription amount is required and must be greater than 0';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep(3)) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for API
      const schoolData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        contact_email: formData.contact_email.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        established_date: formData.established_date || null,
        total_capacity: formData.total_capacity ? parseInt(formData.total_capacity) : null,
        is_active: formData.is_active,
        // 💰 Payment Configuration
        payment_mode: formData.payment_mode,
        monthly_subscription_amount: formData.payment_mode === 'monthly_subscription'
          ? parseFloat(formData.monthly_subscription_amount)
          : null,
      };

      // Upload logo to Supabase if provided
      if (formData.logo) {
        try {
          console.log('📤 Uploading logo to Supabase...');
          const logoUrl = await uploadSchoolLogo(formData.logo, formData.name);
          schoolData.logo = logoUrl;
          console.log('✅ Logo uploaded:', logoUrl);
        } catch (logoError) {
          console.error('❌ Logo upload failed:', logoError);
          toast.warn('⚠️ School created but logo upload failed. You can add it later.');
        }
      }

      await createSchool(schoolData);
      
      toast.success('✅ School created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        address: '',
        logo: null,
        latitude: 33.5651,
        longitude: 73.0169,
        contact_email: '',
        contact_phone: '',
        established_date: '',
        total_capacity: '',
        is_active: true,
        payment_mode: 'per_student',
        monthly_subscription_amount: '',
      });
      setCurrentStep(1);
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating school:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to create school';
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
    maxWidth: '700px',
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
    marginBottom: '0.5rem',
  };

  const stepIndicatorStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const stepDotStyle = (active) => ({
    width: active ? '32px' : '8px',
    height: '8px',
    borderRadius: '4px',
    backgroundColor: active ? '#3B82F6' : '#D1D5DB',
    transition: 'all 0.3s ease',
  });

  const stepLabelStyle = {
    fontSize: '0.875rem',
    color: '#6B7280',
  };

  const contentStyle = {
    padding: '1.5rem',
  };

  const fieldStyle = {
    marginBottom: '1.25rem',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
  };

  const inputStyle = {
    width: '100%',
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

  const textareaStyle = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical',
  };

  const errorStyle = {
    color: '#DC2626',
    fontSize: '0.75rem',
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
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
  };

  const infoBoxStyle = {
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: '0.5rem',
    padding: '1rem',
    marginTop: '1rem',
    fontSize: '0.875rem',
    color: '#1E40AF',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={titleStyle}>➕ Add New School</h2>
          <div style={stepIndicatorStyle}>
            <div style={stepDotStyle(currentStep === 1)} />
            <div style={stepDotStyle(currentStep === 2)} />
            <div style={stepDotStyle(currentStep === 3)} />
            <span style={stepLabelStyle}>Step {currentStep} of 3</span>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div style={contentStyle}>
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                  📋 Basic Information
                </h3>

                <LogoUploader
                  onLogoChange={handleLogoChange}
                  onLogoRemove={handleLogoRemove}
                />

                <div style={fieldStyle}>
                  <label style={labelStyle}>School Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter school name"
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
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Detailed Address *</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter complete address with street, area, city"
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
                </div>
              </>
            )}

            {/* Step 2: Location & Contact */}
            {currentStep === 2 && (
              <>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                  📍 Location & Contact
                </h3>

                <LocationPicker
                  initialLat={formData.latitude}
                  initialLng={formData.longitude}
                  onLocationChange={handleLocationChange}
                />

                {errors.location && <div style={errorStyle}>{errors.location}</div>}

                <div style={fieldStyle}>
                  <label style={labelStyle}>📧 Contact Email</label>
                  <input
                    type="email"
                    name="contact_email"
                    value={formData.contact_email}
                    onChange={handleChange}
                    placeholder="school@example.com"
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
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>📞 Contact Phone</label>
                  <input
                    type="tel"
                    name="contact_phone"
                    value={formData.contact_phone}
                    onChange={handleChange}
                    placeholder="051-1234567"
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
                </div>
              </>
            )}

            {/* Step 3: Additional Details + Payment Configuration */}
            {currentStep === 3 && (
              <>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                  📝 Additional Details
                </h3>

                <div style={fieldStyle}>
                  <label style={labelStyle}>📅 Established Date</label>
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
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>👥 Total Capacity</label>
                  <input
                    type="number"
                    name="total_capacity"
                    value={formData.total_capacity}
                    onChange={handleChange}
                    placeholder="500"
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
                </div>

                {/* 💰 PAYMENT CONFIGURATION */}
                <h3 style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: '600', 
                  marginBottom: '1rem',
                  marginTop: '1.5rem',
                  paddingTop: '1.5rem',
                  borderTop: '2px solid #E5E7EB'
                }}>
                  💰 Payment Configuration
                </h3>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Payment Mode *</label>
                  <select
                    name="payment_mode"
                    value={formData.payment_mode}
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
                    <option value="per_student">Per Student (Individual Fees)</option>
                    <option value="monthly_subscription">Monthly Subscription (Fixed Total)</option>
                  </select>
                </div>

                {/* Show subscription amount field only if subscription mode is selected */}
                {formData.payment_mode === 'monthly_subscription' && (
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Monthly Subscription Amount (PKR) *</label>
                    <input
                      type="number"
                      name="monthly_subscription_amount"
                      value={formData.monthly_subscription_amount}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      placeholder="Enter total monthly subscription (e.g., 50000)"
                      style={{
                        ...inputStyle,
                        borderColor: errors.monthly_subscription_amount ? '#DC2626' : '#D1D5DB',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#3B82F6';
                        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = errors.monthly_subscription_amount ? '#DC2626' : '#D1D5DB';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    {errors.monthly_subscription_amount && (
                      <div style={errorStyle}>{errors.monthly_subscription_amount}</div>
                    )}
                  </div>
                )}

                {/* Info box explaining payment modes */}
                {formData.payment_mode === 'per_student' ? (
                  <div style={infoBoxStyle}>
                    <strong>Per Student Mode:</strong> Each student's monthly fee will be taken from their 
                    individual student record. You can set different fees for different students.
                  </div>
                ) : (
                  <div style={infoBoxStyle}>
                    <strong>Monthly Subscription Mode:</strong> The total subscription amount will be divided 
                    equally among all active students when creating monthly fee records. This ensures your 
                    total monthly revenue stays constant.
                  </div>
                )}

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
              </>
            )}
          </div>

          {/* Footer */}
          <div style={footerStyle}>
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handlePrevious}
                  disabled={isSubmitting}
                >
                  ← Back
                </Button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              {currentStep < 3 ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNext}
                >
                  Next →
                </Button>
              ) : (
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
                    '🎉 Create School'
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSchoolModal;