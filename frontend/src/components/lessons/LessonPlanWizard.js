import React, { useState, useEffect, useCallback } from "react";
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
      //   topicIds: [1, 2, 3],
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

    // Check that all dates have topics assigned
    const unassignedDates = wizardData.selectedDates.filter(
      dateStr => !wizardData.sessionTopics[dateStr] ||
                 wizardData.sessionTopics[dateStr].topicIds.length === 0
    );

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
      lessons: data.selectedDates.map(dateStr => ({
        session_date: dateStr,
        planned_topic_ids: data.sessionTopics[dateStr]?.topicIds || []
      }))
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

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Add Lesson Plan</h2>
          <button
            onClick={onClose}
            style={styles.closeButton}
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Step Indicator */}
        <div style={styles.stepIndicatorContainer}>
          <div style={styles.stepIndicator}>
            {[1, 2, 3, 4, 5].map((step, index) => (
              <React.Fragment key={step}>
                <div style={styles.stepDot(currentStep === step)} />
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
                  <option value="">
                    {schoolsLoading ? "Loading schools..." : schoolsError ? "Error loading schools" : "-- Select School --"}
                  </option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
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
                    <option value="">-- Select Class --</option>
                    {classes.map((c) => (
                      <option key={c} value={c}>
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
                onTopicsUpdate={(dateStr, topicIds) => {
                  setWizardData({
                    ...wizardData,
                    sessionTopics: {
                      ...wizardData.sessionTopics,
                      [dateStr]: {
                        topicIds,
                        topicDisplay: `${topicIds.length} topic(s) selected`
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
            >
              Back
            </button>
          )}

          <button
            onClick={onClose}
            style={styles.buttonDanger}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          {currentStep < 5 ? (
            <button
              onClick={handleNext}
              style={styles.buttonPrimary}
              disabled={isSubmitting}
            >
              Next
            </button>
          ) : (
            <>
              <button
                onClick={() => handleSubmit(false)}
                style={styles.buttonSuccess}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save & Continue'}
              </button>
              <button
                onClick={() => handleSubmit(true)}
                style={styles.buttonPrimary}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save & Close'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// INLINE STYLES (Like AddSchoolModal)
// ============================================================

const styles = {
  overlay: {
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
  },

  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
  },

  header: {
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
    color: '#1f2937',
  },

  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },

  stepIndicatorContainer: {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },

  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  stepDot: (isActive) => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: isActive ? '#3b82f6' : '#d1d5db',
    transition: 'background-color 0.3s',
  }),

  stepLine: {
    width: '40px',
    height: '2px',
    backgroundColor: '#d1d5db',
  },

  stepLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },

  content: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
    position: 'relative',
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  stepContainer: {
    minHeight: '300px',
  },

  stepTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '24px',
  },

  formGroup: {
    marginBottom: '20px',
  },

  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px',
  },

  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#1f2937',
    outline: 'none',
    transition: 'border-color 0.2s',
  },

  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#1f2937',
    outline: 'none',
    transition: 'border-color 0.2s',
  },

  error: {
    marginTop: '6px',
    fontSize: '13px',
    color: '#dc2626',
  },

  footer: {
    padding: '20px 24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },

  buttonPrimary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },

  buttonSecondary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },

  buttonSuccess: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },

  buttonDanger: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginRight: 'auto',
  },
};

export default LessonPlanWizard;
