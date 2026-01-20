// ============================================
// ADD SCHOOL MODAL - Multi-Step Creation Wizard
// Gradient Design System
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'react-toastify';
import { createSchool } from '../../api/services/schoolService';
import { uploadSchoolLogo } from '../../utils/supabaseUpload';
import { LogoUploader } from './LogoUploader';
import { LocationPicker } from './LocationPicker';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  Z_INDEX,
} from '../../utils/designConstants';

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
  const [closeButtonHovered, setCloseButtonHovered] = useState(false);

  // Handle ESC key to close modal
  const handleEscKey = useCallback((e) => {
    if (e.key === 'Escape' && !isSubmitting) {
      onClose();
    }
  }, [onClose, isSubmitting]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, handleEscKey]);

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
    assigned_days: [],
    payment_mode: 'per_student',
    monthly_subscription_amount: '',
  });

  // Day names for display
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const [errors, setErrors] = useState({});

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };

      if (name === 'payment_mode' && value === 'per_student') {
        updated.monthly_subscription_amount = '';
      }

      return updated;
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Handle assigned days toggle
  const handleDayToggle = (dayIndex) => {
    setFormData(prev => {
      const currentDays = prev.assigned_days || [];
      if (currentDays.includes(dayIndex)) {
        return { ...prev, assigned_days: currentDays.filter(d => d !== dayIndex) };
      } else {
        return { ...prev, assigned_days: [...currentDays, dayIndex].sort((a, b) => a - b) };
      }
    });
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
        assigned_days: formData.assigned_days || [],
        payment_mode: formData.payment_mode,
        monthly_subscription_amount: formData.payment_mode === 'monthly_subscription'
          ? parseFloat(formData.monthly_subscription_amount)
          : null,
      };

      if (formData.logo) {
        try {
          const logoUrl = await uploadSchoolLogo(formData.logo, formData.name);
          schoolData.logo = logoUrl;
        } catch (logoError) {
          console.error('Logo upload failed:', logoError);
          toast.warn('School created but logo upload failed. You can add it later.');
        }
      }

      await createSchool(schoolData);

      toast.success('School created successfully!');

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
        assigned_days: [],
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
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <style>
        {`
          .add-school-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
          .add-school-input:focus {
            border-color: rgba(59, 130, 246, 0.6) !important;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
          }
          .add-school-select option {
            background-color: #1e293b;
            color: white;
          }
        `}
      </style>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Add New School</h2>
            <div style={styles.stepIndicator}>
              <div style={styles.stepDot(currentStep >= 1)} />
              <div style={styles.stepLine(currentStep >= 2)} />
              <div style={styles.stepDot(currentStep >= 2)} />
              <div style={styles.stepLine(currentStep >= 3)} />
              <div style={styles.stepDot(currentStep >= 3)} />
              <span style={styles.stepLabel}>Step {currentStep} of 3</span>
            </div>
          </div>
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
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <>
                <h3 style={styles.sectionTitle}>Basic Information</h3>

                <div style={styles.logoSection}>
                  <LogoUploader
                    onLogoChange={handleLogoChange}
                    onLogoRemove={handleLogoRemove}
                  />
                </div>

                <div style={styles.formGrid}>
                  <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.label}>
                      School Name <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter school name"
                      style={styles.input}
                      className="add-school-input"
                    />
                    {errors.name && <div style={styles.error}>{errors.name}</div>}
                  </div>

                  <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.label}>
                      Detailed Address <span style={styles.required}>*</span>
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Enter complete address with street, area, city"
                      style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                      className="add-school-input"
                    />
                    {errors.address && <div style={styles.error}>{errors.address}</div>}
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Location & Contact */}
            {currentStep === 2 && (
              <>
                <h3 style={styles.sectionTitle}>Location & Contact</h3>

                <div style={styles.mapSection}>
                  <LocationPicker
                    initialLat={formData.latitude}
                    initialLng={formData.longitude}
                    onLocationChange={handleLocationChange}
                  />
                </div>

                {errors.location && <div style={styles.error}>{errors.location}</div>}

                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Contact Email</label>
                    <input
                      type="email"
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleChange}
                      placeholder="school@example.com"
                      style={styles.input}
                      className="add-school-input"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Contact Phone</label>
                    <input
                      type="tel"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleChange}
                      placeholder="051-1234567"
                      style={styles.input}
                      className="add-school-input"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Additional Details + Payment Configuration */}
            {currentStep === 3 && (
              <>
                <h3 style={styles.sectionTitle}>Additional Details</h3>

                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Established Date</label>
                    <input
                      type="date"
                      name="established_date"
                      value={formData.established_date}
                      onChange={handleChange}
                      style={styles.input}
                      className="add-school-input"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Total Capacity</label>
                    <input
                      type="number"
                      name="total_capacity"
                      value={formData.total_capacity}
                      onChange={handleChange}
                      placeholder="500"
                      min="1"
                      style={styles.input}
                      className="add-school-input"
                    />
                    {errors.total_capacity && <div style={styles.error}>{errors.total_capacity}</div>}
                  </div>
                </div>

                {/* Assigned Days Section */}
                <div style={styles.divider} />
                <h3 style={styles.sectionTitle}>Assigned Days (for Attendance)</h3>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Select operating days</label>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: SPACING.sm,
                    padding: SPACING.md,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: BORDER_RADIUS.md,
                    border: `1px solid ${COLORS.border.whiteTransparent}`,
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
                            transition: `all ${TRANSITIONS.fast} ease`,
                            minWidth: '80px',
                          }}
                        >
                          {isSelected && '✓ '}{DAY_SHORT[index]}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{
                    marginTop: SPACING.sm,
                    fontSize: FONT_SIZES.xs,
                    color: COLORS.text.whiteSubtle,
                    fontStyle: 'italic',
                  }}>
                    Optional: Select days when this school operates. Used for teacher attendance tracking.
                  </div>
                </div>

                {/* Payment Configuration */}
                <div style={styles.divider} />
                <h3 style={styles.sectionTitle}>Payment Configuration</h3>

                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Payment Mode <span style={styles.required}>*</span>
                    </label>
                    <select
                      name="payment_mode"
                      value={formData.payment_mode}
                      onChange={handleChange}
                      required
                      style={styles.select}
                      className="add-school-select"
                    >
                      <option value="per_student">Per Student (Individual Fees)</option>
                      <option value="monthly_subscription">Monthly Subscription (Fixed Total)</option>
                    </select>
                  </div>

                  {formData.payment_mode === 'monthly_subscription' && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        Monthly Subscription (PKR) <span style={styles.required}>*</span>
                      </label>
                      <input
                        type="number"
                        name="monthly_subscription_amount"
                        value={formData.monthly_subscription_amount}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                        placeholder="e.g., 50000"
                        style={styles.input}
                        className="add-school-input"
                      />
                      {errors.monthly_subscription_amount && (
                        <div style={styles.error}>{errors.monthly_subscription_amount}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Info box explaining payment modes */}
                <div style={styles.infoBox}>
                  {formData.payment_mode === 'per_student' ? (
                    <>
                      <strong>Per Student Mode:</strong> Each student's monthly fee will be taken from their
                      individual student record. You can set different fees for different students.
                    </>
                  ) : (
                    <>
                      <strong>Monthly Subscription Mode:</strong> The total subscription amount will be divided
                      equally among all active students when creating monthly fee records.
                    </>
                  )}
                </div>

                <div style={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    style={styles.checkbox}
                    id="is_active"
                  />
                  <label htmlFor="is_active" style={styles.checkboxLabel}>
                    School is Active
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={isSubmitting}
                  style={styles.backButton}
                >
                  <svg style={{ width: '16px', height: '16px', marginRight: '4px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: SPACING.sm }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={styles.cancelButton}
              >
                Cancel
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  style={styles.nextButton}
                >
                  Next
                  <svg style={{ width: '16px', height: '16px', marginLeft: '4px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={styles.submitButton}
                >
                  {isSubmitting ? 'Creating...' : 'Create School'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

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
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
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
    marginBottom: SPACING.sm,
  },
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  stepDot: (active) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: active ? COLORS.status.info : 'rgba(255, 255, 255, 0.3)',
    transition: `all ${TRANSITIONS.fast} ease`,
  }),
  stepLine: (active) => ({
    width: '24px',
    height: '2px',
    backgroundColor: active ? COLORS.status.info : 'rgba(255, 255, 255, 0.3)',
    transition: `all ${TRANSITIONS.fast} ease`,
  }),
  stepLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    marginLeft: SPACING.sm,
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
  content: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    marginBottom: SPACING.md,
    marginTop: 0,
  },
  logoSection: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.lg,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  mapSection: {
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
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
  error: {
    color: '#fca5a5',
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  divider: {
    height: '1px',
    background: COLORS.border.whiteTransparent,
    margin: `${SPACING.lg} 0`,
  },
  infoBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: '#93c5fd',
    lineHeight: 1.5,
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: COLORS.status.success,
  },
  checkboxLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    cursor: 'pointer',
  },
  footer: {
    padding: SPACING.lg,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    display: 'flex',
    justifyContent: 'space-between',
    background: 'rgba(255, 255, 255, 0.03)',
    position: 'sticky',
    bottom: 0,
  },
  backButton: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
    display: 'flex',
    alignItems: 'center',
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
  nextButton: {
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
    display: 'flex',
    alignItems: 'center',
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

export default AddSchoolModal;
