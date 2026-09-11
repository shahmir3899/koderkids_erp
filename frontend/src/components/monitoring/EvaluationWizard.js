import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCheck, faChevronRight, faChevronLeft, faStar, faClipboardCheck, faUserTie, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, TRANSITIONS, MIXINS } from '../../utils/designConstants';
import { useResponsive } from '../../hooks/useResponsive';
import { fetchVisitTeachers, submitEvaluation, updateEvaluation } from '../../services/monitoringService';

const EMPTY_QUESTION = () => ({ question_text: '', answer_text: '', rating: null });

// Quick star-rating questions — pre-populated so the BDM can just tap stars
// instead of typing a question. Optional: left unrated, they don't count
// toward the score (same rule as any other unrated question).
const PRESET_QUESTIONS = [
  'Punctuality & Attendance',
  'Lesson Delivery',
  'Classroom Management',
  'Student Engagement',
];

const buildPresetQuestions = () =>
  PRESET_QUESTIONS.map((text) => ({ question_text: text, answer_text: '', rating: null, isPreset: true }));

// ============================================
// Z_INDEX (local reference for portal)
// ============================================
const Z_INDEX_MODAL = 9999;

// ============================================
// EVALUATION WIZARD COMPONENT
// ============================================

const EvaluationWizard = ({
  isOpen,
  onClose,
  onSuccess,
  visitId,
  visitSchoolName,
  editEvaluation = null,
}) => {
  // editEvaluation — when set, wizard pre-populates from an existing evaluation (edit mode)
  const { isMobile, isTablet } = useResponsive();

  // ============================================
  // STATE
  // ============================================

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 data
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Step 2 data — quick preset star ratings + ad-hoc questions the BDM types on the spot
  const [questions, setQuestions] = useState(buildPresetQuestions());

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
      const teacherData = await fetchVisitTeachers(visitId);
      setTeachers(Array.isArray(teacherData) ? teacherData : []);
    } catch (err) {
      console.error('Error loading step 1 data:', err);
      setError('Failed to load teachers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (isOpen && visitId) {
      loadStep1Data();
    }
  }, [isOpen, visitId, loadStep1Data]);

  // Pre-populate form when editing an existing evaluation
  useEffect(() => {
    if (isOpen && editEvaluation) {
      // Pre-fill qualitative fields and skip to step 3 so reviewer can tweak remarks
      setRemarks(editEvaluation.remarks || '');
      setAreasOfImprovement(editEvaluation.areas_of_improvement || '');
      setTeacherStrengths(editEvaluation.teacher_strengths || '');
      // Pre-fill questions from the stored evaluation
      if (Array.isArray(editEvaluation.questions) && editEvaluation.questions.length > 0) {
        setQuestions(editEvaluation.questions.map((q) => ({
          question_text: q.question_text || '',
          answer_text: q.answer_text || '',
          rating: q.rating ?? null,
          isPreset: PRESET_QUESTIONS.includes(q.question_text),
        })));
      }
      setCurrentStep(3);
    }
  }, [isOpen, editEvaluation]);

  useEffect(() => {
    if (!isOpen) {
      resetWizard();
    }
  }, [isOpen]);

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
    setSelectedTeacher(null);
    setQuestions(buildPresetQuestions());
    setRemarks('');
    setAreasOfImprovement('');
    setTeacherStrengths('');
    setLoading(false);
    setError('');
    setFieldErrors({});
    setIsSubmitting(false);
  };

  const handleTeacherSelect = (teacher) => {
    setSelectedTeacher(teacher);
  };

  const handleQuestionChange = (index, key, value) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, [key]: value } : q)));
    if (fieldErrors[index]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, EMPTY_QUESTION()]);
  };

  const handleRemoveQuestion = (index) => {
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
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
    return true;
  };

  const validateStep2 = () => {
    const newErrors = {};
    questions.forEach((q, i) => {
      if (!q.question_text.trim()) {
        newErrors[i] = 'Question text is required.';
      }
    });
    setFieldErrors(newErrors);

    const hasAtLeastOneQuestion = questions.some((q) => q.question_text.trim());
    if (!hasAtLeastOneQuestion || Object.keys(newErrors).length > 0) {
      setError('Add at least one question before continuing.');
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
    const ratings = questions
      .map((q) => q.rating)
      .filter((r) => r !== null && r !== undefined && r !== '')
      .map((r) => parseFloat(r))
      .filter((r) => !isNaN(r));

    if (ratings.length === 0) return null;
    const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    return Math.round((average / 5) * 100 * 10) / 10;
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

    const questionsPayload = questions
      .filter((q) => q.question_text.trim())
      .map((q, i) => ({
        question_text: q.question_text.trim(),
        answer_text: q.answer_text,
        rating: q.rating === '' || q.rating === undefined ? null : q.rating,
        order: i,
      }));

    try {
      if (editEvaluation) {
        // Edit mode — update remarks and questions
        await updateEvaluation(editEvaluation.id, {
          remarks,
          areas_of_improvement: areasOfImprovement,
          teacher_strengths: teacherStrengths,
          questions: questionsPayload,
        });
        toast.success('Evaluation updated successfully!');
      } else {
        // Create mode
        await submitEvaluation(visitId, {
          teacher_id: selectedTeacher.id,
          questions: questionsPayload,
          remarks,
          areas_of_improvement: areasOfImprovement,
          teacher_strengths: teacherStrengths,
        });
        toast.success('Evaluation submitted successfully!');
      }

      if (onSuccess) onSuccess(editEvaluation ? 'edit' : 'create');
      onClose();
    } catch (err) {
      console.error('Error submitting evaluation:', err);
      const apiError =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        (editEvaluation ? 'Failed to update evaluation. Please try again.' : 'Failed to submit evaluation. Please try again.');
      setError(apiError);
      toast.error(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const stepTitles = ['Select Teacher', 'Ask Questions', 'Remarks & Submit'];

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
          const isDisabled = false;

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
                {!isDisabled && teacher.already_evaluated && (
                  <span style={styles.evaluatedBadge}>
                    <FontAwesomeIcon icon={faCheck} style={{ marginRight: '4px' }} />
                    Evaluated ({teacher.evaluation_count || 1})
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

    </div>
  );

  const renderStarPicker = (index, rating, size = FONT_SIZES.lg) => (
    <div style={styles.starPicker}>
      {[1, 2, 3, 4, 5].map((n) => (
        <FontAwesomeIcon
          key={n}
          icon={faStar}
          onClick={() => handleQuestionChange(index, 'rating', rating === n ? null : n)}
          style={{
            cursor: 'pointer',
            fontSize: size,
            color: rating && n <= rating ? '#FBBF24' : 'rgba(255, 255, 255, 0.25)',
            transition: `color ${TRANSITIONS.fast}`,
          }}
          title={`${n} star${n > 1 ? 's' : ''}`}
        />
      ))}
      {rating != null && (
        <button
          type="button"
          onClick={() => handleQuestionChange(index, 'rating', null)}
          style={styles.clearRatingButton}
        >
          Clear
        </button>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div style={styles.stepContainer}>
      <h3 style={styles.stepTitle}>
        <FontAwesomeIcon icon={faStar} style={{ marginRight: SPACING.sm }} />
        Questions
      </h3>

      <div style={styles.formContextBar}>
        <span style={styles.contextItem}>
          Teacher: <strong>{selectedTeacher?.name || selectedTeacher?.full_name}</strong>
        </span>
      </div>

      {/* Quick star ratings — tap to rate, no typing needed. All optional. */}
      <div style={styles.formGroup}>
        <label style={styles.label}>Quick Ratings (optional)</label>
        <div style={styles.quickRatingList}>
          {questions.map((q, index) => q.isPreset && (
            <div key={index} style={styles.quickRatingRow}>
              <span style={styles.quickRatingLabel}>{q.question_text}</span>
              {renderStarPicker(index, q.rating, FONT_SIZES.xl)}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
        {questions.map((q, index) => !q.isPreset && (
          <div key={index} style={styles.questionCard}>
            <div style={styles.questionCardHeader}>
              <span style={styles.questionCardIndex}>Additional Question</span>
              <button
                type="button"
                onClick={() => handleRemoveQuestion(index)}
                style={styles.removeQuestionButton}
                title="Remove question"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Question</label>
              <input
                type="text"
                style={{
                  ...styles.input,
                  borderColor: fieldErrors[index] ? COLORS.status.error : COLORS.border.whiteTransparent,
                }}
                placeholder="e.g. Is the teacher following the lesson plan?"
                value={q.question_text}
                onChange={(e) => handleQuestionChange(index, 'question_text', e.target.value)}
              />
              {fieldErrors[index] && (
                <span style={styles.fieldErrorText}>{fieldErrors[index]}</span>
              )}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Answer / Notes</label>
              <textarea
                style={styles.textarea}
                rows={2}
                placeholder="What did you observe..."
                value={q.answer_text}
                onChange={(e) => handleQuestionChange(index, 'answer_text', e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Rating (optional)</label>
              {renderStarPicker(index, q.rating)}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddQuestion}
        style={styles.addQuestionButton}
      >
        <FontAwesomeIcon icon={faPlus} style={{ marginRight: SPACING.sm }} />
        Add Question
      </button>
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
            <span style={styles.reviewLabel}>Questions</span>
            <span style={styles.reviewValue}>
              {questions.filter((q) => q.question_text.trim()).length}
            </span>
          </div>
          <div style={styles.reviewItem}>
            <span style={styles.reviewLabel}>Rated Questions</span>
            <span style={styles.reviewValue}>
              {questions.filter((q) => q.rating != null).length}
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

  input: {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: COLORS.text.white,
    outline: 'none',
    transition: `all ${TRANSITIONS.normal}`,
    boxSizing: 'border-box',
  },

  fieldErrorText: {
    display: 'block',
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.xs,
    color: '#FCA5A5',
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

  // Step 2 - question builder
  questionCard: {
    padding: SPACING.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },

  questionCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  questionCardIndex: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  removeQuestionButton: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#F87171',
    borderRadius: BORDER_RADIUS.md,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    cursor: 'pointer',
    fontSize: FONT_SIZES.xs,
  },

  addQuestionButton: {
    marginTop: SPACING.lg,
    width: '100%',
    padding: `${SPACING.md} ${SPACING.lg}`,
    background: 'rgba(59, 130, 246, 0.15)',
    border: '1px dashed rgba(59, 130, 246, 0.4)',
    color: '#60A5FA',
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },

  starPicker: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  quickRatingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
    padding: SPACING.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },

  quickRatingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    padding: `${SPACING.xs} 0`,
  },

  quickRatingLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
  },

  clearRatingButton: {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.5)',
    cursor: 'pointer',
    fontSize: FONT_SIZES.xs,
    marginLeft: SPACING.sm,
    textDecoration: 'underline',
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
