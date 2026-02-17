import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCheck, faChevronRight, faChevronLeft, faStar, faClipboardCheck, faUserTie } from '@fortawesome/free-solid-svg-icons';

import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, TRANSITIONS, MIXINS } from '../../utils/designConstants';
import { useResponsive } from '../../hooks/useResponsive';
import { fetchVisitTeachers, fetchTemplates, fetchTemplateDetail, submitEvaluation } from '../../services/monitoringService';
import DynamicFormRenderer from './DynamicFormRenderer';

// ============================================
// Z_INDEX (local reference for portal)
// ============================================
const Z_INDEX_MODAL = 9999;

// ============================================
// EVALUATION WIZARD COMPONENT
// ============================================

const EvaluationWizard = ({ isOpen, onClose, onSuccess, visitId, visitSchoolName }) => {
  const { isMobile, isTablet } = useResponsive();

  // ============================================
  // STATE
  // ============================================

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 data
  const [teachers, setTeachers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Step 2 data
  const [templateFields, setTemplateFields] = useState([]);
  const [formValues, setFormValues] = useState({});

  // Step 3 data
  const [remarks, setRemarks] = useState('');
  const [areasOfImprovement, setAreasOfImprovement] = useState('');
  const [teacherStrengths, setTeacherStrengths] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============================================
  // DATA FETCHING
  // ============================================

  const loadStep1Data = useCallback(async () => {
    if (!visitId) return;
    setLoading(true);
    setError('');
    try {
      const [teacherData, templateData] = await Promise.all([
        fetchVisitTeachers(visitId),
        fetchTemplates(),
      ]);
      setTeachers(Array.isArray(teacherData) ? teacherData : []);
      setTemplates(Array.isArray(templateData) ? templateData : []);
    } catch (err) {
      console.error('Error loading step 1 data:', err);
      setError('Failed to load teachers or templates. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  const loadTemplateFields = useCallback(async (templateId) => {
    if (!templateId) return;
    setLoading(true);
    setError('');
    try {
      const detail = await fetchTemplateDetail(templateId);
      const fields = detail?.fields || detail?.template_fields || [];
      setTemplateFields(fields);
      // Initialize formValues for all fields
      const initialValues = {};
      fields.forEach((field) => {
        if (!formValues[field.id]) {
          initialValues[field.id] = { value: '', numeric_value: null };
        }
      });
      setFormValues((prev) => ({ ...initialValues, ...prev }));
    } catch (err) {
      console.error('Error loading template fields:', err);
      setError('Failed to load evaluation form. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (isOpen && visitId) {
      loadStep1Data();
    }
  }, [isOpen, visitId, loadStep1Data]);

  useEffect(() => {
    if (!isOpen) {
      resetWizard();
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentStep === 2 && selectedTemplate) {
      loadTemplateFields(selectedTemplate.id);
    }
  }, [currentStep, selectedTemplate, loadTemplateFields]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ============================================
  // HANDLERS
  // ============================================

  const resetWizard = () => {
    setCurrentStep(1);
    setTeachers([]);
    setTemplates([]);
    setSelectedTeacher(null);
    setSelectedTemplate(null);
    setTemplateFields([]);
    setFormValues({});
    setRemarks('');
    setAreasOfImprovement('');
    setTeacherStrengths('');
    setLoading(false);
    setError('');
    setFieldErrors({});
    setIsSubmitting(false);
  };

  const handleFormChange = (fieldId, value, numericValue) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: { value, numeric_value: numericValue },
    }));
    // Clear error for this field
    if (fieldErrors[fieldId]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleTeacherSelect = (teacher) => {
    if (teacher.already_evaluated) return;
    setSelectedTeacher(teacher);
  };

  const handleTemplateSelect = (e) => {
    const templateId = e.target.value;
    if (!templateId) {
      setSelectedTemplate(null);
      return;
    }
    const tmpl = templates.find((t) => String(t.id) === String(templateId));
    setSelectedTemplate(tmpl || null);
    // Reset form values when template changes
    setFormValues({});
    setTemplateFields([]);
  };

  // ============================================
  // VALIDATION
  // ============================================

  const validateStep1 = () => {
    setError('');
    if (!selectedTeacher) {
      setError('Please select a teacher to evaluate.');
      return false;
    }
    if (!selectedTemplate) {
      setError('Please select an evaluation template.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const newErrors = {};
    templateFields.forEach((field) => {
      if (field.is_required) {
        const val = formValues[field.id];
        if (!val) {
          newErrors[field.id] = `${field.label} is required.`;
        } else if (field.field_type === 'yes_no') {
          // numeric_value can be '0' (No) or '1' (Yes) — both are valid
          if (val.numeric_value === null || val.numeric_value === undefined) {
            newErrors[field.id] = `${field.label} is required.`;
          }
        } else if (field.field_type === 'rating_1_5' || field.field_type === 'rating_1_10') {
          if (val.numeric_value === null || val.numeric_value === undefined) {
            newErrors[field.id] = `${field.label} is required.`;
          }
        } else {
          // text, textarea, select — check value string
          if (val.value === '' || val.value === null || val.value === undefined) {
            newErrors[field.id] = `${field.label} is required.`;
          }
        }
      }
    });
    setFieldErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setError('Please fill in all required fields.');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep3 = () => {
    setError('');
    return true;
  };

  // ============================================
  // NAVIGATION
  // ============================================

  const handleNext = () => {
    let isValid = false;
    switch (currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      default:
        isValid = true;
    }
    if (isValid) {
      setCurrentStep((prev) => prev + 1);
      setError('');
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
    setError('');
    setFieldErrors({});
  };

  // ============================================
  // SCORE CALCULATION
  // ============================================

  const calculateScorePreview = () => {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    templateFields.forEach((field) => {
      const val = formValues[field.id];
      if (!val || val.numeric_value === null || val.numeric_value === undefined) return;

      const numericVal = parseFloat(val.numeric_value);
      if (isNaN(numericVal)) return;

      const weight = parseFloat(field.weight) || 0;
      if (weight <= 0) return;

      let normalizedScore = 0;
      if (field.field_type === 'rating_1_5') {
        normalizedScore = (numericVal / 5) * 100;
      } else if (field.field_type === 'rating_1_10') {
        normalizedScore = (numericVal / 10) * 100;
      } else if (field.field_type === 'yes_no') {
        normalizedScore = numericVal === '1' || numericVal === 1 ? 100 : 0;
      } else {
        return;
      }

      totalWeightedScore += normalizedScore * weight;
      totalWeight += weight;
    });

    if (totalWeight === 0) return null;
    return Math.round((totalWeightedScore / totalWeight) * 10) / 10;
  };

  const getScoreColor = (score) => {
    if (score === null) return 'rgba(255, 255, 255, 0.5)';
    if (score >= 80) return COLORS.status.success;
    if (score >= 60) return COLORS.status.warning;
    return COLORS.status.error;
  };

  const getScoreLabel = (score) => {
    if (score === null) return 'N/A';
    if (score >= 90) return 'Outstanding';
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Satisfactory';
    if (score >= 50) return 'Needs Improvement';
    return 'Unsatisfactory';
  };

  // ============================================
  // SUBMISSION
  // ============================================

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setIsSubmitting(true);
    setError('');

    try {
      await submitEvaluation(visitId, {
        teacher_id: selectedTeacher.id,
        template_id: selectedTemplate.id,
        responses: Object.entries(formValues).map(([fieldId, val]) => ({
          field_id: parseInt(fieldId),
          value: val.value,
          numeric_value: val.numeric_value,
        })),
        remarks,
        areas_of_improvement: areasOfImprovement,
        teacher_strengths: teacherStrengths,
      });

      toast.success('Evaluation submitted successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error submitting evaluation:', err);
      const apiError =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        'Failed to submit evaluation. Please try again.';
      setError(apiError);
      toast.error(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const stepTitles = ['Select Teacher & Template', 'Fill Evaluation Form', 'Remarks & Submit'];

  const scorePreview = calculateScorePreview();

  // ============================================
  // STEP RENDERERS
  // ============================================

  const renderStep1 = () => (
    <div style={styles.stepContainer}>
      <h3 style={styles.stepTitle}>
        <FontAwesomeIcon icon={faUserTie} style={{ marginRight: SPACING.sm }} />
        Select Teacher
      </h3>

      {visitSchoolName && (
        <div style={styles.schoolBadge}>
          School: {visitSchoolName}
        </div>
      )}

      <div style={styles.teacherList}>
        {teachers.length === 0 && !loading && (
          <div style={styles.emptyState}>
            No teachers found for this visit.
          </div>
        )}
        {teachers.map((teacher) => {
          const isSelected = selectedTeacher?.id === teacher.id;
          const isDisabled = teacher.already_evaluated;

          return (
            <div
              key={teacher.id}
              style={styles.teacherCard(isSelected, isDisabled)}
              onClick={() => handleTeacherSelect(teacher)}
              onMouseEnter={(e) => {
                if (!isDisabled && !isSelected) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDisabled && !isSelected) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <div style={styles.teacherInfo}>
                <div style={styles.teacherAvatar}>
                  {(teacher.name || teacher.full_name || 'T').charAt(0).toUpperCase()}
                </div>
                <div style={styles.teacherDetails}>
                  <span style={styles.teacherName}>
                    {teacher.name || teacher.full_name || `Teacher #${teacher.id}`}
                  </span>
                  {teacher.subject && (
                    <span style={styles.teacherSubject}>{teacher.subject}</span>
                  )}
                  {teacher.class_name && (
                    <span style={styles.teacherSubject}>Class: {teacher.class_name}</span>
                  )}
                </div>
              </div>
              <div style={styles.teacherStatus}>
                {isDisabled && (
                  <span style={styles.evaluatedBadge}>
                    <FontAwesomeIcon icon={faCheck} style={{ marginRight: '4px' }} />
                    Evaluated
                  </span>
                )}
                {isSelected && !isDisabled && (
                  <span style={styles.selectedBadge}>
                    <FontAwesomeIcon icon={faCheck} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: SPACING.xl }}>
        <h3 style={styles.stepTitle}>
          <FontAwesomeIcon icon={faClipboardCheck} style={{ marginRight: SPACING.sm }} />
          Select Evaluation Template
        </h3>

        <select
          style={styles.select}
          value={selectedTemplate?.id || ''}
          onChange={handleTemplateSelect}
        >
          <option value="" style={styles.selectOption}>-- Select Template --</option>
          {templates.map((tmpl) => (
            <option key={tmpl.id} value={tmpl.id} style={styles.selectOption}>
              {tmpl.name || tmpl.title || `Template #${tmpl.id}`}
            </option>
          ))}
        </select>

        {selectedTemplate && (
          <div style={styles.templatePreview}>
            <span style={styles.templatePreviewLabel}>Selected:</span>
            <span style={styles.templatePreviewName}>
              {selectedTemplate.name || selectedTemplate.title}
            </span>
            {selectedTemplate.description && (
              <p style={styles.templatePreviewDescription}>
                {selectedTemplate.description}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={styles.stepContainer}>
      <h3 style={styles.stepTitle}>
        <FontAwesomeIcon icon={faStar} style={{ marginRight: SPACING.sm }} />
        {selectedTemplate?.name || 'Evaluation Form'}
      </h3>

      <div style={styles.formContextBar}>
        <span style={styles.contextItem}>
          Teacher: <strong>{selectedTeacher?.name || selectedTeacher?.full_name}</strong>
        </span>
        <span style={styles.contextDivider}>|</span>
        <span style={styles.contextItem}>
          Template: <strong>{selectedTemplate?.name || selectedTemplate?.title}</strong>
        </span>
      </div>

      {templateFields.length > 0 ? (
        <DynamicFormRenderer
          fields={templateFields}
          values={formValues}
          onChange={handleFormChange}
          errors={fieldErrors}
        />
      ) : (
        !loading && (
          <div style={styles.emptyState}>
            No fields found in this template.
          </div>
        )
      )}
    </div>
  );

  const renderStep3 = () => (
    <div style={styles.stepContainer}>
      <h3 style={styles.stepTitle}>
        <FontAwesomeIcon icon={faClipboardCheck} style={{ marginRight: SPACING.sm }} />
        Remarks & Review
      </h3>

      {/* Review section */}
      <div style={styles.reviewSection}>
        <div style={styles.reviewHeader}>Evaluation Summary</div>
        <div style={styles.reviewGrid}>
          <div style={styles.reviewItem}>
            <span style={styles.reviewLabel}>Teacher</span>
            <span style={styles.reviewValue}>
              {selectedTeacher?.name || selectedTeacher?.full_name || '-'}
            </span>
          </div>
          <div style={styles.reviewItem}>
            <span style={styles.reviewLabel}>Template</span>
            <span style={styles.reviewValue}>
              {selectedTemplate?.name || selectedTemplate?.title || '-'}
            </span>
          </div>
          <div style={styles.reviewItem}>
            <span style={styles.reviewLabel}>Fields Completed</span>
            <span style={styles.reviewValue}>
              {Object.values(formValues).filter(
                (v) => v.value !== '' || v.numeric_value !== null
              ).length}{' '}
              / {templateFields.length}
            </span>
          </div>
          <div style={styles.reviewItem}>
            <span style={styles.reviewLabel}>Score Preview</span>
            <span
              style={{
                ...styles.reviewValue,
                color: getScoreColor(scorePreview),
                fontWeight: FONT_WEIGHTS.bold,
                fontSize: FONT_SIZES.lg,
              }}
            >
              {scorePreview !== null ? `${scorePreview}%` : 'N/A'}
              {scorePreview !== null && (
                <span
                  style={{
                    fontSize: FONT_SIZES.xs,
                    fontWeight: FONT_WEIGHTS.normal,
                    marginLeft: SPACING.sm,
                    opacity: 0.8,
                  }}
                >
                  ({getScoreLabel(scorePreview)})
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Remarks textarea */}
      <div style={styles.formGroup}>
        <label style={styles.label}>Remarks</label>
        <textarea
          style={styles.textarea}
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Enter any general remarks about the evaluation..."
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.6)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Areas of Improvement */}
      <div style={styles.formGroup}>
        <label style={styles.label}>Areas of Improvement</label>
        <textarea
          style={styles.textarea}
          rows={3}
          value={areasOfImprovement}
          onChange={(e) => setAreasOfImprovement(e.target.value)}
          placeholder="What areas should the teacher focus on improving..."
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.6)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Teacher Strengths */}
      <div style={styles.formGroup}>
        <label style={styles.label}>Teacher Strengths</label>
        <textarea
          style={styles.textarea}
          rows={3}
          value={teacherStrengths}
          onChange={(e) => setTeacherStrengths(e.target.value)}
          placeholder="What are the teacher's key strengths..."
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.6)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  if (!isOpen) return null;

  const modalWidth = isMobile ? '95%' : isTablet ? '90%' : '800px';

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={{ ...styles.modal, width: modalWidth, maxWidth: '800px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            {isMobile ? 'Evaluate' : 'Teacher Evaluation'}
          </h2>
          <button
            onClick={onClose}
            style={styles.closeButton}
            aria-label="Close"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Step Indicator */}
        <div style={styles.stepIndicatorContainer}>
          <div style={styles.stepIndicator}>
            {[1, 2, 3].map((step, index) => (
              <React.Fragment key={step}>
                <div
                  style={styles.stepDotWrapper}
                  title={stepTitles[step - 1]}
                >
                  <div style={styles.stepDot(currentStep === step, step < currentStep)}>
                    {step < currentStep ? (
                      <FontAwesomeIcon icon={faCheck} style={{ fontSize: '10px' }} />
                    ) : (
                      step
                    )}
                  </div>
                  {!isMobile && (
                    <span style={styles.stepDotLabel(currentStep === step, step < currentStep)}>
                      {stepTitles[step - 1]}
                    </span>
                  )}
                </div>
                {index < 2 && <div style={styles.stepLine(step < currentStep)} />}
              </React.Fragment>
            ))}
          </div>
          <span style={styles.stepLabelMobile}>
            Step {currentStep} of 3: {stepTitles[currentStep - 1]}
          </span>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {loading && (
            <div style={styles.loadingOverlay}>
              <ClipLoader size={40} color="#8B5CF6" />
              <span style={styles.loadingText}>Loading...</span>
            </div>
          )}

          {error && (
            <div style={styles.errorBanner}>
              {error}
            </div>
          )}

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Footer / Navigation */}
        <div style={styles.footer}>
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              style={styles.buttonSecondary}
              disabled={isSubmitting}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <FontAwesomeIcon icon={faChevronLeft} style={{ marginRight: '6px' }} />
              Back
            </button>
          )}

          <button
            onClick={onClose}
            style={styles.buttonDanger}
            disabled={isSubmitting}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.status.errorDark;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.status.error;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Cancel
          </button>

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              style={styles.buttonPrimary}
              disabled={loading}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = COLORS.status.infoDark;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = COLORS.status.info;
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              Next
              <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: '6px' }} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              style={styles.buttonSubmit}
              disabled={isSubmitting}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = COLORS.status.successDark;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = COLORS.status.success;
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <ClipLoader size={14} color="#FFFFFF" />
                  <span style={{ marginLeft: '8px' }}>Submitting...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheck} style={{ marginRight: '6px' }} />
                  Submit Evaluation
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================
// INLINE STYLES - Glassmorphism Design
// ============================================

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: Z_INDEX_MODAL,
    backdropFilter: 'blur(4px)',
  },

  modal: {
    background: COLORS.background.gradient,
    borderRadius: BORDER_RADIUS.xl,
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },

  header: {
    padding: SPACING.xl,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
  },

  title: {
    margin: 0,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },

  closeButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.white,
    cursor: 'pointer',
    padding: SPACING.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    transition: `all ${TRANSITIONS.normal}`,
    width: '40px',
    height: '40px',
  },

  // Step indicator
  stepIndicatorContainer: {
    padding: `${SPACING.lg} ${SPACING.xl}`,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.sm,
    background: 'rgba(255, 255, 255, 0.03)',
  },

  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    width: '100%',
    maxWidth: '500px',
    justifyContent: 'center',
  },

  stepDotWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },

  stepDot: (isActive, isCompleted) => ({
    width: '28px',
    height: '28px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: isActive
      ? COLORS.status.info
      : isCompleted
      ? COLORS.status.success
      : 'rgba(255, 255, 255, 0.2)',
    transition: `all ${TRANSITIONS.normal}`,
    boxShadow: isActive ? '0 0 12px rgba(59, 130, 246, 0.5)' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    flexShrink: 0,
  }),

  stepDotLabel: (isActive, isCompleted) => ({
    fontSize: '0.65rem',
    color: isActive
      ? COLORS.text.white
      : isCompleted
      ? 'rgba(255, 255, 255, 0.7)'
      : 'rgba(255, 255, 255, 0.4)',
    fontWeight: isActive ? FONT_WEIGHTS.semibold : FONT_WEIGHTS.normal,
    textAlign: 'center',
    maxWidth: '80px',
    lineHeight: '1.2',
  }),

  stepLine: (isCompleted) => ({
    flex: 1,
    height: '2px',
    backgroundColor: isCompleted ? COLORS.status.success : 'rgba(255, 255, 255, 0.2)',
    maxWidth: '60px',
    minWidth: '20px',
    transition: `all ${TRANSITIONS.normal}`,
    alignSelf: 'flex-start',
    marginTop: '13px',
  }),

  stepLabelMobile: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    fontWeight: FONT_WEIGHTS.medium,
  },

  // Content area
  content: {
    flex: 1,
    overflow: 'auto',
    padding: SPACING.xl,
    position: 'relative',
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    gap: SPACING.md,
  },

  loadingText: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.sm,
  },

  errorBanner: {
    marginBottom: SPACING.lg,
    fontSize: FONT_SIZES.sm,
    color: '#FCA5A5',
    padding: `${SPACING.md} ${SPACING.lg}`,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },

  stepContainer: {
    minHeight: '250px',
  },

  stepTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    marginBottom: SPACING.lg,
    marginTop: 0,
    display: 'flex',
    alignItems: 'center',
  },

  // Step 1 - Teacher selection
  schoolBadge: {
    display: 'inline-block',
    padding: `${SPACING.xs} ${SPACING.md}`,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: BORDER_RADIUS.full,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.lg,
    border: '1px solid rgba(139, 92, 246, 0.3)',
  },

  teacherList: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
    maxHeight: '240px',
    overflowY: 'auto',
    paddingRight: SPACING.xs,
  },

  teacherCard: (isSelected, isDisabled) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: BORDER_RADIUS.lg,
    border: isSelected
      ? '2px solid rgba(59, 130, 246, 0.6)'
      : isDisabled
      ? '1px solid rgba(255, 255, 255, 0.08)'
      : '1px solid rgba(255, 255, 255, 0.15)',
    backgroundColor: isSelected
      ? 'rgba(59, 130, 246, 0.15)'
      : isDisabled
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(255, 255, 255, 0.08)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    opacity: isDisabled ? 0.6 : 1,
    boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none',
  }),

  teacherInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },

  teacherAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: COLORS.text.white,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.sm,
    flexShrink: 0,
    border: '1px solid rgba(139, 92, 246, 0.4)',
  },

  teacherDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  teacherName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },

  teacherSubject: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },

  teacherStatus: {
    flexShrink: 0,
    marginLeft: SPACING.md,
  },

  evaluatedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: BORDER_RADIUS.full,
    color: '#6EE7B7',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    border: '1px solid rgba(16, 185, 129, 0.3)',
  },

  selectedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    backgroundColor: COLORS.status.info,
    borderRadius: BORDER_RADIUS.full,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.xs,
  },

  // Template dropdown
  select: {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    outline: 'none',
    transition: `all ${TRANSITIONS.normal}`,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23FFFFFF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1.25rem',
    paddingRight: '2.5rem',
  },

  selectOption: {
    backgroundColor: '#1e293b',
    color: COLORS.text.white,
    padding: SPACING.sm,
  },

  templatePreview: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },

  templatePreviewLabel: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    marginRight: SPACING.sm,
  },

  templatePreviewName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    fontWeight: FONT_WEIGHTS.semibold,
  },

  templatePreviewDescription: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: SPACING.sm,
    marginBottom: 0,
    lineHeight: '1.5',
  },

  // Step 2 - form context bar
  formContextBar: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    flexWrap: 'wrap',
  },

  contextItem: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  contextDivider: {
    color: 'rgba(255, 255, 255, 0.2)',
  },

  // Step 3 - Review section
  reviewSection: {
    marginBottom: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },

  reviewHeader: {
    padding: `${SPACING.md} ${SPACING.lg}`,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },

  reviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },

  reviewItem: {
    padding: SPACING.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
  },

  reviewLabel: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: FONT_WEIGHTS.medium,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  reviewValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    fontWeight: FONT_WEIGHTS.semibold,
  },

  // Form group styles
  formGroup: {
    marginBottom: SPACING.lg,
  },

  label: {
    display: 'block',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    marginBottom: SPACING.sm,
  },

  textarea: {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: COLORS.text.white,
    outline: 'none',
    transition: 'all 0.2s ease',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    minHeight: '80px',
  },

  emptyState: {
    textAlign: 'center',
    padding: SPACING['2xl'],
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },

  // Footer / Navigation
  footer: {
    padding: `${SPACING.lg} ${SPACING.xl}`,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    display: 'flex',
    gap: SPACING.md,
    justifyContent: 'flex-end',
    background: 'rgba(255, 255, 255, 0.05)',
    flexWrap: 'wrap',
  },

  buttonPrimary: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    backgroundColor: COLORS.status.info,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
    minWidth: '120px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonSecondary: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    minWidth: '100px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonDanger: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    backgroundColor: COLORS.status.error,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
    marginRight: 'auto',
    minWidth: '100px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonSubmit: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    backgroundColor: COLORS.status.success,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
    minWidth: '160px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default EvaluationWizard;
