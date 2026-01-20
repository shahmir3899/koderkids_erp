import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { getAuthHeaders, addLesson } from "../../api";
import { useSchools } from "../../hooks/useSchools";
import { useUser } from "../../hooks/useUser";
import { useClasses } from "../../hooks/useClasses";
import DateGrid from "./DateGrid";
import BookGridSelector from "./BookGridSelector";
import SessionTopicAssigner from "./SessionTopicAssigner";
import LessonReviewPanel from "./LessonReviewPanel";
import "react-toastify/dist/ReactToastify.css";

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
  Z_INDEX,
} from "../../utils/designConstants";

const LessonPlanWizard = ({ isOpen, onClose, onSuccess }) => {
  // Use cached schools from context
  const { schools, loading: schoolsLoading, error: schoolsError } = useSchools();
  // Use cached user from context
  const { user } = useUser();
  // Use classes cache from context
  const { fetchClassesBySchool, getCachedClasses } = useClasses();

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================

  // Step navigation
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Wizard data - persists across all steps
  const [wizardData, setWizardData] = useState({
    // Step 1
    selectedSchool: null,
    selectedClass: null,
    selectedMonth: '',
    teacherId: null,

    // Step 2
    selectedDates: [], // ['2025-01-03', '2025-01-05', ...]

    // Step 3
    selectedBookId: null,
    selectedBookData: null, // Full book with topics

    // Step 4
    sessionTopics: {
      // '2025-01-03': {
      //   mode: 'book' | 'custom',
      //   topicIds: [1, 2, 3],        // For book mode
      //   customText: 'Topic text',    // For custom mode
      //   topicDisplay: 'Chapter 1 > Lesson 1, ...'
      // }
    },
  });

  // Data for selectors
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  // ============================================================
  // DATA FETCHING
  // ============================================================

  // Fetch classes using cache
  const fetchClasses = useCallback(async () => {
    if (!wizardData.selectedSchool) {
      setClasses([]);
      return;
    }

    // Try to get from cache first
    const cachedClasses = getCachedClasses(wizardData.selectedSchool);
    if (cachedClasses) {
      setClasses(cachedClasses);
      return;
    }

    // Not in cache, fetch from API (this will cache it automatically)
    try {
      setLoading(true);
      const data = await fetchClassesBySchool(wizardData.selectedSchool);
      setClasses(data);
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast.error("Failed to load classes.");
    } finally {
      setLoading(false);
    }
  }, [wizardData.selectedSchool, fetchClassesBySchool, getCachedClasses]);

  // Set teacher ID from cached user when available
  useEffect(() => {
    if (user && user.id) {
      setWizardData(prev => ({ ...prev, teacherId: user.id }));
    }
  }, [user]);

  // ============================================================
  // VALIDATION FUNCTIONS
  // ============================================================

  const validateStep1 = () => {
    const newErrors = {};

    if (!wizardData.selectedSchool) {
      newErrors.selectedSchool = 'School is required';
    }
    if (!wizardData.selectedClass) {
      newErrors.selectedClass = 'Class is required';
    }
    if (!wizardData.selectedMonth) {
      newErrors.selectedMonth = 'Month is required';
    }
    if (!wizardData.teacherId) {
      newErrors.teacherId = 'Teacher assignment required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (wizardData.selectedDates.length === 0) {
      newErrors.selectedDates = 'Please select at least one session date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};

    if (!wizardData.selectedBookId) {
      newErrors.selectedBookId = 'Please select a book';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = () => {
    const newErrors = {};

    // Check that all dates have topics assigned (either book topics or custom text)
    const unassignedDates = wizardData.selectedDates.filter(dateStr => {
      const session = wizardData.sessionTopics[dateStr];
      if (!session) return true;

      // For book mode: check if topicIds are set
      if (session.mode === 'book' || !session.mode) {
        return !session.topicIds || session.topicIds.length === 0;
      }

      // For custom mode: check if customText is set
      if (session.mode === 'custom') {
        return !session.customText || !session.customText.trim();
      }

      return true;
    });

    if (unassignedDates.length > 0) {
      newErrors.sessionTopics = `Please assign topics to all sessions (${unassignedDates.length} remaining)`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================
  // NAVIGATION
  // ============================================================

  const handleNext = () => {
    let isValid = false;

    switch(currentStep) {
      case 1: isValid = validateStep1(); break;
      case 2: isValid = validateStep2(); break;
      case 3: isValid = validateStep3(); break;
      case 4: isValid = validateStep4(); break;
      default: isValid = true;
    }

    if (isValid) {
      setCurrentStep(currentStep + 1);
      setErrors({});
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
  };

  const handleStepJump = (step) => {
    setCurrentStep(step);
    setErrors({});
  };

  // ============================================================
  // SUBMISSION
  // ============================================================

  const transformToAPIPayload = (data) => {
    return {
      school_id: data.selectedSchool,
      student_class: data.selectedClass,
      lessons: data.selectedDates.map(dateStr => {
        const session = data.sessionTopics[dateStr];

        // Custom mode: send planned_topic (text) with empty topic_ids
        if (session?.mode === 'custom') {
          return {
            session_date: dateStr,
            planned_topic_ids: [],
            planned_topic: session.customText || ''
          };
        }

        // Book mode: send topic_ids (FK) with empty planned_topic
        return {
          session_date: dateStr,
          planned_topic_ids: session?.topicIds || [],
          planned_topic: ''
        };
      })
    };
  };

  const handleSubmit = async (closeAfter = true) => {
    if (!validateStep4()) return;

    setIsSubmitting(true);

    try {
      const payload = transformToAPIPayload(wizardData);
      await addLesson(payload);

      toast.success('Lesson plan created successfully!');

      if (onSuccess) onSuccess();

      if (closeAfter) {
        onClose();
        resetWizard();
      } else {
        // Save & Continue: Reset for next plan
        resetWizard();
        setCurrentStep(1);
        toast.info('Create another lesson plan');
      }
    } catch (error) {
      console.error('Failed to create lesson plan:', error);
      toast.error('Failed to create lesson plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetWizard = () => {
    setWizardData({
      selectedSchool: null,
      selectedClass: null,
      selectedMonth: '',
      teacherId: null,
      selectedDates: [],
      selectedBookId: null,
      selectedBookData: null,
      sessionTopics: {},
    });
    setCurrentStep(1);
    setErrors({});
  };

  // ============================================================
  // LIFECYCLE
  // ============================================================

  useEffect(() => {
    if (!isOpen) {
      resetWizard();
    }
  }, [isOpen]);

  // Fetch classes only when selected school changes
  useEffect(() => {
    if (wizardData.selectedSchool) {
      fetchClasses();
    } else {
      setClasses([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardData.selectedSchool]);

  // ============================================================
  // RENDER
  // ============================================================

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Add Lesson Plan</h2>
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
            {[1, 2, 3, 4, 5].map((step, index) => (
              <React.Fragment key={step}>
                <div style={styles.stepDot(currentStep === step, step < currentStep)} />
                {index < 4 && <div style={styles.stepLine} />}
              </React.Fragment>
            ))}
          </div>
          <span style={styles.stepLabel}>Step {currentStep} of 5</span>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {loading && (
            <div style={styles.loadingOverlay}>
              <ClipLoader size={50} color={"#3b82f6"} />
            </div>
          )}

          {/* Step 1: Class & Month Selection */}
          {currentStep === 1 && (
            <div style={styles.stepContainer}>
              <h3 style={styles.stepTitle}>Select Class & Month</h3>

              <div style={styles.formGroup}>
                <label style={styles.label}>School *</label>
                <select
                  style={styles.select}
                  value={wizardData.selectedSchool || ''}
                  onChange={(e) => {
                    setWizardData({
                      ...wizardData,
                      selectedSchool: e.target.value,
                      selectedClass: null, // Reset class when school changes
                    });
                  }}
                  disabled={schoolsLoading}
                >
                  <option value="" style={styles.selectOption}>
                    {schoolsLoading ? "Loading schools..." : schoolsError ? "Error loading schools" : "-- Select School --"}
                  </option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id} style={styles.selectOption}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.selectedSchool && <div style={styles.error}>{errors.selectedSchool}</div>}
              </div>

              {wizardData.selectedSchool && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Class *</label>
                  <select
                    style={styles.select}
                    value={wizardData.selectedClass || ''}
                    onChange={(e) => {
                      setWizardData({
                        ...wizardData,
                        selectedClass: e.target.value,
                      });
                    }}
                  >
                    <option value="" style={styles.selectOption}>-- Select Class --</option>
                    {classes.map((c) => (
                      <option key={c} value={c} style={styles.selectOption}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {errors.selectedClass && <div style={styles.error}>{errors.selectedClass}</div>}
                </div>
              )}

              {wizardData.selectedClass && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Month *</label>
                  <input
                    type="month"
                    style={styles.input}
                    value={wizardData.selectedMonth}
                    onChange={(e) => {
                      setWizardData({
                        ...wizardData,
                        selectedMonth: e.target.value,
                      });
                    }}
                  />
                  {errors.selectedMonth && <div style={styles.error}>{errors.selectedMonth}</div>}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Date Selection */}
          {currentStep === 2 && (
            <div style={styles.stepContainer}>
              <h3 style={styles.stepTitle}>Choose Session Dates</h3>
              <DateGrid
                selectedMonth={wizardData.selectedMonth}
                selectedDates={wizardData.selectedDates}
                onDatesChange={(dates) => {
                  setWizardData({ ...wizardData, selectedDates: dates });
                }}
                error={errors.selectedDates}
              />
            </div>
          )}

          {/* Step 3: Book Selection */}
          {currentStep === 3 && (
            <div style={styles.stepContainer}>
              <h3 style={styles.stepTitle}>Choose Book for Topics</h3>
              <BookGridSelector
                selectedBookId={wizardData.selectedBookId}
                onBookSelect={(book) => {
                  setWizardData({
                    ...wizardData,
                    selectedBookId: book.id,
                    selectedBookData: book,
                  });
                }}
                error={errors.selectedBookId}
              />
            </div>
          )}

          {/* Step 4: Topic Assignment */}
          {currentStep === 4 && (
            <div style={styles.stepContainer}>
              <h3 style={styles.stepTitle}>Assign Topics to Each Session</h3>
              <SessionTopicAssigner
                selectedDates={wizardData.selectedDates}
                selectedBookData={wizardData.selectedBookData}
                sessionTopics={wizardData.sessionTopics}
                onTopicsUpdate={(dateStr, topicIds, mode, customText) => {
                  setWizardData({
                    ...wizardData,
                    sessionTopics: {
                      ...wizardData.sessionTopics,
                      [dateStr]: {
                        mode: mode || 'book',
                        topicIds,
                        customText: customText || '',
                        topicDisplay: mode === 'custom'
                          ? 'Custom topic set'
                          : `${topicIds.length} topic(s) selected`
                      }
                    }
                  });
                }}
                error={errors.sessionTopics}
              />
            </div>
          )}

          {/* Step 5: Review & Confirm */}
          {currentStep === 5 && (
            <div style={styles.stepContainer}>
              <h3 style={styles.stepTitle}>Review Lesson Plan</h3>
              <LessonReviewPanel
                wizardData={wizardData}
                onWizardDataChange={setWizardData}
                onEditSession={(dateStr) => {
                  handleStepJump(4);
                }}
                schools={schools}
                classes={classes}
                errors={errors}
              />
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={styles.footer}>
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              style={styles.buttonSecondary}
              disabled={isSubmitting}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
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

          {currentStep < 5 ? (
            <button
              onClick={handleNext}
              style={styles.buttonPrimary}
              disabled={isSubmitting}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.status.infoDark;
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.status.info;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Next
            </button>
          ) : (
            <>
              <button
                onClick={() => handleSubmit(false)}
                style={styles.buttonSuccess}
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
                {isSubmitting ? 'Saving...' : 'Save & Continue'}
              </button>
              <button
                onClick={() => handleSubmit(true)}
                style={styles.buttonPrimary}
                disabled={isSubmitting}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor = COLORS.status.infoDark;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor = COLORS.status.info;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {isSubmitting ? 'Saving...' : 'Save & Close'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================================
// INLINE STYLES - Glassmorphism Design
// ============================================================

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
    zIndex: Z_INDEX.modal,
    backdropFilter: 'blur(4px)',
  },

  modal: {
    background: COLORS.background.gradient,
    borderRadius: BORDER_RADIUS.xl,
    width: '90%',
    maxWidth: '800px',
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

  stepIndicatorContainer: {
    padding: `${SPACING.lg} ${SPACING.xl}`,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.md,
    background: 'rgba(255, 255, 255, 0.03)',
  },

  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  stepDot: (isActive, isCompleted) => ({
    width: '14px',
    height: '14px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: isActive ? COLORS.status.info : isCompleted ? COLORS.status.success : 'rgba(255, 255, 255, 0.3)',
    transition: `all ${TRANSITIONS.normal}`,
    boxShadow: isActive ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none',
  }),

  stepLine: {
    width: '40px',
    height: '2px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  stepLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    fontWeight: FONT_WEIGHTS.medium,
  },

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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  stepContainer: {
    minHeight: '300px',
  },

  stepTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    marginBottom: SPACING.xl,
  },

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

  input: {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    outline: 'none',
    transition: `all ${TRANSITIONS.normal}`,
  },

  error: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.xs,
    color: '#FCA5A5',
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: BORDER_RADIUS.sm,
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },

  footer: {
    padding: `${SPACING.lg} ${SPACING.xl}`,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    display: 'flex',
    gap: SPACING.md,
    justifyContent: 'flex-end',
    background: 'rgba(255, 255, 255, 0.05)',
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
  },

  buttonSuccess: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    backgroundColor: COLORS.status.success,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
    minWidth: '140px',
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
  },
};

export default LessonPlanWizard;
