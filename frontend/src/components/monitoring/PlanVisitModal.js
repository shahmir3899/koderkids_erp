import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSchool, faCalendarAlt, faClipboardCheck, faChevronLeft, faChevronRight, faSearch, faMapMarkerAlt, faClock, faUsers } from "@fortawesome/free-solid-svg-icons";
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

import { useResponsive } from "../../hooks/useResponsive";
import { createVisit, fetchSchoolWorkingDays } from "../../services/monitoringService";
import { API_URL } from "../../utils/constants";
import { getAuthHeaders } from "../../utils/authHelpers";

// ============================================================
// PLAN VISIT MODAL - 3-Step Wizard
// ============================================================

const PlanVisitModal = ({ isOpen, onClose, onSuccess }) => {
  const { isMobile, isTablet } = useResponsive();

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Step 1: School selection
  const [schoolData, setSchoolData] = useState([]);
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [plannedTimes, setPlannedTimes] = useState({});

  // Step 2: Date picking
  const [workingDaysData, setWorkingDaysData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [loadingWorkingDays, setLoadingWorkingDays] = useState(false);

  // ============================================================
  // DATA FETCHING
  // ============================================================

  const fetchSchools = useCallback(async () => {
    setLoadingSchools(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/schools-with-classes/`, {
        headers: getAuthHeaders(),
      });
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      const activeSchools = data.filter(
        (s) => s.is_active === undefined || s.is_active === true
      );
      setSchoolData(activeSchools);
    } catch (err) {
      console.error("Error fetching schools:", err);
      setError("Failed to load schools. Please try again.");
      setSchoolData([]);
    } finally {
      setLoadingSchools(false);
    }
  }, []);

  const fetchWorkingDays = useCallback(async (schools) => {
    if (!schools || schools.length === 0) return;
    
    setLoadingWorkingDays(true);
    setError(null);
    try {
      // Fetch working days for all selected schools
      const workingDaysPromises = schools.map((school) =>
        fetchSchoolWorkingDays(school.id)
      );
      const allWorkingDaysData = await Promise.all(workingDaysPromises);

      if (allWorkingDaysData.length === 0) {
        setWorkingDaysData(null);
        return;
      }

      // Calculate UNION of assigned days (all weekdays that work for ANY school)
      // Convert Python weekday (0=Mon) to JS getDay (0=Sun)
      const allWorkingDays = new Set();
      allWorkingDaysData.forEach((data) => {
        const schoolDays = data.assigned_days || [];
        schoolDays.forEach((pythonDay) => {
          // Convert Python weekday to JS getDay: (pythonDay + 1) % 7
          const jsDay = (pythonDay + 1) % 7;
          allWorkingDays.add(jsDay);
        });
      });

      // Generate upcoming dates that work for ANY school
      const upcoming_dates = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < 60; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() + i);
        const weekday = checkDate.getDay(); // 0=Sunday through 6=Saturday (JS format)
        
        if (allWorkingDays.has(weekday)) {
          const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
          upcoming_dates.push(dateStr);
        }
        
        if (upcoming_dates.length >= 30) break;
      }

      // Find first school with times set, or use first school
      let schoolWithTimes = allWorkingDaysData[0];
      for (let i = 1; i < allWorkingDaysData.length; i++) {
        if (allWorkingDaysData[i].start_time || allWorkingDaysData[i].end_time) {
          schoolWithTimes = allWorkingDaysData[i];
          break;
        }
      }

      // Merge data: use consolidated times and all working dates
      const mergedData = {
        ...schoolWithTimes,
        upcoming_working_dates: upcoming_dates,
        schools_count: schools.length,
        all_working_days: Array.from(allWorkingDays),
        schools_data: allWorkingDaysData,
      };
      
      setWorkingDaysData(mergedData);
    } catch (err) {
      console.error("Error fetching working days:", err);
      setError("Failed to load school working days.");
      setWorkingDaysData(null);
    } finally {
      setLoadingWorkingDays(false);
    }
  }, []);

  // ============================================================
  // LIFECYCLE
  // ============================================================

  useEffect(() => {
    if (isOpen) {
      fetchSchools();
    } else {
      resetWizard();
    }
  }, [isOpen, fetchSchools]);

  useEffect(() => {
    if (selectedSchools.length > 0 && currentStep === 2) {
      fetchWorkingDays(selectedSchools);
    }
  }, [selectedSchools, currentStep, fetchWorkingDays]);

  // ============================================================
  // HELPERS
  // ============================================================

  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedSchools([]);
    setSchoolSearch("");
    setPurpose("");
    setNotes("");
    setWorkingDaysData(null);
    setSelectedDate(null);
    setCalendarMonth(new Date());
    setError(null);
    setIsSubmitting(false);
    setPlannedTimes({});
  };

  const filteredSchools = schoolData.filter((school) => {
    const term = schoolSearch.toLowerCase();
    const name = (school.name || "").toLowerCase();
    const location = (school.location || school.address || "").toLowerCase();
    return name.includes(term) || location.includes(term);
  });

  const getUpcomingWorkingDates = () => {
    if (!workingDaysData || !workingDaysData.upcoming_working_dates) {
      // Fallback: generate all future dates if working days data not available
      const dates = [];
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        dates.push(dateStr);
      }
      return dates;
    }
    return workingDaysData.upcoming_working_dates;
  };

  const isWorkingDate = (dateStr) => {
    return getUpcomingWorkingDates().includes(dateStr);
  };

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  };

  // ============================================================
  // NAVIGATION
  // ============================================================

  const handleNext = () => {
    setError(null);

    if (currentStep === 1) {
      if (selectedSchools.length === 0) {
        setError("Please select at least one school to continue.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!selectedDate) {
        setError("Please select a visit date to continue.");
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(currentStep - 1);
  };

  // ============================================================
  // SUBMISSION
  // ============================================================

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Create visits for all selected schools
      const visitPromises = selectedSchools.map((school) =>
        createVisit({
          school: school.id,
          visit_date: selectedDate,
          purpose: purpose || undefined,
          notes: notes || undefined,
          planned_time: plannedTimes[school.id] || undefined,
        })
      );

      await Promise.all(visitPromises);

      toast.success(
        selectedSchools.length === 1
          ? "Visit planned successfully!"
          : `${selectedSchools.length} visits planned successfully!`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Error creating visit:", err);
      const apiError =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        (typeof err.response?.data === "object"
          ? Object.values(err.response.data).flat().join(", ")
          : null) ||
        "Failed to create visit. Please try again.";
      setError(apiError);
      toast.error(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // CALENDAR RENDERING
  // ============================================================

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const buildCalendarGrid = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const cells = [];

    // Empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, dateStr: null });
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ day, dateStr });
    }

    return cells;
  };

  const navigateMonth = (direction) => {
    setCalendarMonth((prev) => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + direction);
      return newMonth;
    });
  };

  const calendarMonthLabel = calendarMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // ============================================================
  // RENDER
  // ============================================================

  if (!isOpen) return null;

  const loading = loadingSchools || loadingWorkingDays;

  const stepLabels = [
    { num: 1, label: "Select School", icon: faSchool },
    { num: 2, label: "Pick Date", icon: faCalendarAlt },
    { num: 3, label: "Review & Confirm", icon: faClipboardCheck },
  ];

  const progressPercent = ((currentStep - 1) / 2) * 100;

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={{
          ...styles.modal,
          ...(isMobile ? styles.modalMobile : {}),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Plan School Visit</h2>
          <button
            onClick={onClose}
            style={styles.closeButton}
            aria-label="Close"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Step Indicator */}
        <div style={styles.stepIndicatorContainer}>
          <div style={styles.stepIndicator}>
            {stepLabels.map((step, index) => (
              <React.Fragment key={step.num}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: SPACING.xs,
                  }}
                >
                  <div
                    style={styles.stepDot(
                      currentStep === step.num,
                      step.num < currentStep
                    )}
                  >
                    <FontAwesomeIcon
                      icon={step.icon}
                      style={{
                        fontSize: "10px",
                        color:
                          currentStep === step.num || step.num < currentStep
                            ? COLORS.text.white
                            : "rgba(255, 255, 255, 0.5)",
                      }}
                    />
                  </div>
                  {!isMobile && (
                    <span
                      style={{
                        fontSize: FONT_SIZES.xs,
                        color:
                          currentStep === step.num
                            ? COLORS.text.white
                            : COLORS.text.whiteSubtle,
                        fontWeight:
                          currentStep === step.num
                            ? FONT_WEIGHTS.semibold
                            : FONT_WEIGHTS.normal,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {step.label}
                    </span>
                  )}
                </div>
                {index < stepLabels.length - 1 && (
                  <div
                    style={{
                      ...styles.stepLine,
                      backgroundColor:
                        step.num < currentStep
                          ? COLORS.status.success
                          : "rgba(255, 255, 255, 0.2)",
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Progress Bar */}
          <div style={styles.progressBarContainer}>
            <div
              style={{
                ...styles.progressBarFill,
                width: `${progressPercent}%`,
              }}
            />
          </div>

          <span style={styles.stepLabel}>
            Step {currentStep} of 3
          </span>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {loading && (
            <div style={styles.loadingOverlay}>
              <ClipLoader size={50} color={"#3b82f6"} />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div style={styles.errorBanner}>
              {error}
            </div>
          )}

          {/* Step 1: Select School */}
          {currentStep === 1 && (
            <div style={styles.stepContainer}>
              <h3 style={styles.stepTitle}>Select Schools</h3>

              {/* Search Input */}
              <div style={styles.formGroup}>
                <div style={styles.searchInputWrapper}>
                  <FontAwesomeIcon
                    icon={faSearch}
                    style={styles.searchIcon}
                  />
                  <input
                    type="text"
                    placeholder="Search schools by name or location..."
                    value={schoolSearch}
                    onChange={(e) => setSchoolSearch(e.target.value)}
                    style={styles.searchInput}
                  />
                </div>
              </div>

              {/* Schools List */}
              <div style={styles.schoolsList}>
                {loadingSchools ? (
                  <div style={styles.centeredMessage}>
                    <ClipLoader size={30} color={"#3b82f6"} />
                    <span style={{ color: COLORS.text.whiteSubtle, marginTop: SPACING.sm }}>
                      Loading schools...
                    </span>
                  </div>
                ) : filteredSchools.length === 0 ? (
                  <div style={styles.centeredMessage}>
                    <span style={{ color: COLORS.text.whiteSubtle }}>
                      {schoolSearch
                        ? "No schools match your search."
                        : "No active schools found."}
                    </span>
                  </div>
                ) : (
                  filteredSchools.map((school) => {
                    const isSelected = selectedSchools.some((s) => s.id === school.id);
                    return (
                      <div
                        key={school.id}
                        style={{
                          ...styles.schoolCard,
                          ...(isSelected ? styles.schoolCardSelected : {}),
                        }}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSchools(selectedSchools.filter((s) => s.id !== school.id));
                          } else {
                            setSelectedSchools([...selectedSchools, school]);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor =
                              "rgba(255, 255, 255, 0.12)";
                            e.currentTarget.style.borderColor =
                              "rgba(255, 255, 255, 0.3)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor =
                              "rgba(255, 255, 255, 0.06)";
                            e.currentTarget.style.borderColor =
                              "rgba(255, 255, 255, 0.15)";
                          }
                        }}
                      >
                        <div style={styles.schoolCardContent}>
                          <div style={styles.schoolName}>{school.name}</div>
                          {(school.location || school.address) && (
                            <div style={styles.schoolLocation}>
                              <FontAwesomeIcon
                                icon={faMapMarkerAlt}
                                style={{ marginRight: SPACING.xs, fontSize: "11px" }}
                              />
                              {school.location || school.address}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div style={styles.selectedBadge}>Selected</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected Schools Info - with Planned Times */}
              {selectedSchools.length > 0 && (
                <div style={styles.selectedSchoolsContainer}>
                  <div style={styles.selectedSchoolsTitle}>
                    <FontAwesomeIcon icon={faSchool} style={{ marginRight: SPACING.sm }} />
                    {selectedSchools.length} school{selectedSchools.length !== 1 ? "s" : ""} selected
                  </div>
                  <div style={styles.selectedSchoolsList}>
                    {selectedSchools.map((school) => (
                      <div key={school.id} style={styles.selectedSchoolChip}>
                        <div style={{ flex: 1 }}>
                          <div style={styles.chipSchoolName}>{school.name}</div>
                          {(school.location || school.address) && (
                            <div style={styles.chipSchoolLocation}>
                              <FontAwesomeIcon
                                icon={faMapMarkerAlt}
                                style={{ marginRight: SPACING.xs, fontSize: "10px" }}
                              />
                              {school.location || school.address}
                            </div>
                          )}
                          <input
                            type="time"
                            placeholder="Planned visit time (optional)"
                            value={plannedTimes[school.id] || ""}
                            onChange={(e) =>
                              setPlannedTimes({
                                ...plannedTimes,
                                [school.id]: e.target.value,
                              })
                            }
                            style={styles.plannedTimeInput}
                            title="What time do you plan to visit this school?"
                          />
                        </div>
                        <button
                          onClick={() =>
                            setSelectedSchools(selectedSchools.filter((s) => s.id !== school.id))
                          }
                          style={styles.chipRemoveButton}
                          title="Remove"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = COLORS.status.error;
                            e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                            e.currentTarget.style.borderRadius = BORDER_RADIUS.full;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = COLORS.text.whiteSubtle;
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Purpose Field */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Purpose (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly monitoring, Follow-up visit..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  style={styles.input}
                />
              </div>

              {/* Notes Field */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Notes (optional)</label>
                <textarea
                  placeholder="Additional notes for this visit..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={styles.textarea}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Pick Date */}
          {currentStep === 2 && (
            <div style={styles.stepContainer}>
              <h3 style={styles.stepTitle}>Pick a Visit Date</h3>

              {/* Multiple Schools Info */}
              {selectedSchools.length > 1 && (
                <div style={styles.multiSchoolInfo}>
                  <FontAwesomeIcon icon={faSchool} style={{ marginRight: SPACING.sm }} />
                  <span>
                    Showing all dates where any of the <strong>{selectedSchools.length} schools</strong> is working
                  </span>
                </div>
              )}

              {/* School Hours Info */}
              {workingDaysData && (
                <div style={styles.schoolHoursInfoContainer}>
                  {selectedSchools.length === 1 ? (
                    <div style={styles.schoolHoursInfo}>
                      <FontAwesomeIcon icon={faClock} style={{ marginRight: SPACING.sm }} />
                      <span>
                        School Hours:{" "}
                        <strong>
                          {workingDaysData.start_time
                            ? formatTime(workingDaysData.start_time)
                            : "N/A"}{" "}
                          -{" "}
                          {workingDaysData.end_time
                            ? formatTime(workingDaysData.end_time)
                            : "N/A"}
                        </strong>
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div style={styles.schoolHoursInfoLabel}>School Hours by School:</div>
                      <div style={styles.schoolHoursList}>
                        {workingDaysData.schools_data && workingDaysData.schools_data.map((schoolData) => (
                          <div key={schoolData.school_id} style={styles.schoolHourItem}>
                            <span style={styles.schoolHourItemName}>{schoolData.school_name}:</span>
                            <span style={styles.schoolHourItemTime}>
                              {schoolData.start_time ? formatTime(schoolData.start_time) : "N/A"} -{" "}
                              {schoolData.end_time ? formatTime(schoolData.end_time) : "N/A"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Debug Info - Show available dates count */}
              {workingDaysData && (
                <div style={{
                  fontSize: FONT_SIZES.xs,
                  color: COLORS.text.whiteSubtle,
                  marginBottom: SPACING.md,
                  textAlign: 'center'
                }}>
                  {getUpcomingWorkingDates().length} working dates available
                </div>
              )}

              {loading && (
                <div style={styles.loadingOverlay}>
                  <ClipLoader size={40} color={"#3b82f6"} />
                </div>
              )}
              <div style={styles.calendarNav}>
                <button
                  onClick={() => navigateMonth(-1)}
                  style={styles.calendarNavButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                  }}
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <span style={styles.calendarMonthLabel}>{calendarMonthLabel}</span>
                <button
                  onClick={() => navigateMonth(1)}
                  style={styles.calendarNavButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                  }}
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>

              {/* Calendar Grid */}
              <div style={styles.calendarGrid}>
                {/* Day Headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (dayName) => (
                    <div key={dayName} style={styles.calendarDayHeader}>
                      {dayName}
                    </div>
                  )
                )}

                {/* Day Cells */}
                {buildCalendarGrid().map((cell, idx) => {
                  if (!cell.day) {
                    return <div key={`empty-${idx}`} style={styles.calendarCellEmpty} />;
                  }

                  const isWorking = isWorkingDate(cell.dateStr);
                  const isSelected = selectedDate === cell.dateStr;
                  const today = new Date();
                  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                  const isToday = cell.dateStr === todayStr;
                  const isPast = cell.dateStr < todayStr;
                  const isClickable = isWorking && !isPast;

                  return (
                    <div
                      key={cell.dateStr}
                      style={{
                        ...styles.calendarCell,
                        ...(isClickable
                          ? styles.calendarCellWorking
                          : styles.calendarCellDisabled),
                        ...(isSelected ? styles.calendarCellSelected : {}),
                        ...(isToday ? styles.calendarCellToday : {}),
                      }}
                      onClick={() => {
                        if (isClickable) {
                          setSelectedDate(cell.dateStr);
                          setError(null);
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (isClickable && !isSelected) {
                          e.currentTarget.style.backgroundColor =
                            "rgba(59, 130, 246, 0.3)";
                          e.currentTarget.style.transform = "scale(1.05)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isClickable && !isSelected) {
                          e.currentTarget.style.backgroundColor =
                            "rgba(255, 255, 255, 0.08)";
                          e.currentTarget.style.transform = "scale(1)";
                        }
                      }}
                      role="button"
                      tabIndex={isClickable ? 0 : -1}
                      onKeyDown={(e) => {
                        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                          setSelectedDate(cell.dateStr);
                          setError(null);
                        }
                      }}
                    >
                      {cell.day}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={styles.calendarLegend}>
                <div style={styles.legendItem}>
                  <div
                    style={{
                      ...styles.legendDot,
                      backgroundColor: "rgba(59, 130, 246, 0.6)",
                    }}
                  />
                  <span>Available</span>
                </div>
                <div style={styles.legendItem}>
                  <div
                    style={{
                      ...styles.legendDot,
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                    }}
                  />
                  <span>Unavailable</span>
                </div>
                <div style={styles.legendItem}>
                  <div
                    style={{
                      ...styles.legendDot,
                      backgroundColor: COLORS.status.info,
                      boxShadow: "0 0 8px rgba(59, 130, 246, 0.6)",
                    }}
                  />
                  <span>Selected</span>
                </div>
              </div>

              {/* Selected Date Display */}
              {selectedDate && (
                <div style={styles.selectedDateInfo}>
                  <FontAwesomeIcon
                    icon={faCalendarAlt}
                    style={{ marginRight: SPACING.sm }}
                  />
                  Selected: <strong>{formatDateForDisplay(selectedDate)}</strong>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review & Confirm */}
          {currentStep === 3 && (
            <div style={styles.stepContainer}>
              <h3 style={styles.stepTitle}>Review & Confirm</h3>

              <div style={styles.reviewCard}>
                {/* Schools */}
                <div style={styles.reviewRow}>
                  <div style={styles.reviewLabel}>
                    <FontAwesomeIcon icon={faSchool} style={styles.reviewIcon} />
                    Schools
                  </div>
                  <div style={styles.reviewValue}>
                    {selectedSchools.length === 1 ? (
                      <>
                        {selectedSchools[0]?.name}
                        {(selectedSchools[0]?.location || selectedSchools[0]?.address) && (
                          <div style={styles.reviewSubValue}>
                            <FontAwesomeIcon icon={faMapMarkerAlt} style={{ marginRight: SPACING.xs, fontSize: "11px" }} />
                            {selectedSchools[0].location || selectedSchools[0].address}
                          </div>
                        )}
                        {plannedTimes[selectedSchools[0]?.id] && (
                          <div style={styles.reviewSubValue}>
                            <FontAwesomeIcon icon={faClock} style={{ marginRight: SPACING.xs, fontSize: "11px" }} />
                            {plannedTimes[selectedSchools[0]?.id]}
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        {selectedSchools.map((school, idx) => (
                          <div key={school.id} style={{ marginBottom: idx < selectedSchools.length - 1 ? SPACING.md : 0 }}>
                            {school.name}
                            {(school.location || school.address) && (
                              <div style={styles.reviewSubValue}>
                                <FontAwesomeIcon icon={faMapMarkerAlt} style={{ marginRight: SPACING.xs, fontSize: "11px" }} />
                                {school.location || school.address}
                              </div>
                            )}
                            {plannedTimes[school.id] && (
                              <div style={styles.reviewSubValue}>
                                <FontAwesomeIcon icon={faClock} style={{ marginRight: SPACING.xs, fontSize: "11px" }} />
                                Planned: {plannedTimes[school.id]}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Visit Date */}
                <div style={styles.reviewRow}>
                  <div style={styles.reviewLabel}>
                    <FontAwesomeIcon icon={faCalendarAlt} style={styles.reviewIcon} />
                    Visit Date
                  </div>
                  <div style={styles.reviewValue}>
                    {selectedDate ? formatDateForDisplay(selectedDate) : "N/A"}
                  </div>
                </div>

                {/* School Hours */}
                {workingDaysData && (workingDaysData.start_time || workingDaysData.end_time) && (
                  <div style={styles.reviewRow}>
                    <div style={styles.reviewLabel}>
                      <FontAwesomeIcon icon={faClock} style={styles.reviewIcon} />
                      School Hours
                    </div>
                    <div style={styles.reviewValue}>
                      {workingDaysData.start_time
                        ? formatTime(workingDaysData.start_time)
                        : "N/A"}{" "}
                      -{" "}
                      {workingDaysData.end_time
                        ? formatTime(workingDaysData.end_time)
                        : "N/A"}
                    </div>
                  </div>
                )}

                {/* Teacher Count */}
                {workingDaysData && workingDaysData.teacher_count !== undefined && (
                  <div style={styles.reviewRow}>
                    <div style={styles.reviewLabel}>
                      <FontAwesomeIcon icon={faUsers} style={styles.reviewIcon} />
                      Teachers
                    </div>
                    <div style={styles.reviewValue}>
                      {workingDaysData.teacher_count} teacher{workingDaysData.teacher_count !== 1 ? "s" : ""}
                    </div>
                  </div>
                )}

                {/* Purpose */}
                <div style={styles.reviewRow}>
                  <div style={styles.reviewLabel}>
                    <FontAwesomeIcon icon={faClipboardCheck} style={styles.reviewIcon} />
                    Purpose
                  </div>
                  <div style={styles.reviewValue}>
                    {purpose || <span style={{ color: COLORS.text.whiteSubtle, fontStyle: "italic" }}>Not specified</span>}
                  </div>
                </div>

                {/* Notes */}
                {notes && (
                  <div style={styles.reviewRow}>
                    <div style={styles.reviewLabel}>
                      Notes
                    </div>
                    <div style={{ ...styles.reviewValue, whiteSpace: "pre-wrap" }}>
                      {notes}
                    </div>
                  </div>
                )}
              </div>
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
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                e.currentTarget.style.transform = "translateY(0)";
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
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.status.error;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Cancel
          </button>

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              style={styles.buttonPrimary}
              disabled={isSubmitting}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.status.infoDark;
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.status.info;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              style={styles.buttonSuccess}
              disabled={isSubmitting}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = COLORS.status.successDark;
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = COLORS.status.success;
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {isSubmitting ? "Confirming..." : "Confirm Visit"}
            </button>
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
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: Z_INDEX.modal,
    backdropFilter: "blur(4px)",
  },

  modal: {
    background: COLORS.background.gradient,
    borderRadius: BORDER_RADIUS.xl,
    width: "90%",
    maxWidth: "700px",
    maxHeight: "90vh",
    overflow: "hidden",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
    display: "flex",
    flexDirection: "column",
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    ...MIXINS.glassmorphicCard,
  },

  modalMobile: {
    width: "100%",
    maxWidth: "100%",
    height: "100vh",
    maxHeight: "100vh",
    borderRadius: 0,
  },

  header: {
    padding: SPACING.xl,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(255, 255, 255, 0.05)",
  },

  title: {
    margin: 0,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },

  closeButton: {
    background: "rgba(255, 255, 255, 0.1)",
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.white,
    cursor: "pointer",
    padding: SPACING.sm,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BORDER_RADIUS.md,
    transition: `all ${TRANSITIONS.normal}`,
    width: "40px",
    height: "40px",
  },

  // Step Indicator
  stepIndicatorContainer: {
    padding: `${SPACING.lg} ${SPACING.xl}`,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: SPACING.sm,
    background: "rgba(255, 255, 255, 0.03)",
  },

  stepIndicator: {
    display: "flex",
    alignItems: "flex-start",
    gap: SPACING.sm,
    width: "100%",
    justifyContent: "center",
  },

  stepDot: (isActive, isCompleted) => ({
    width: "28px",
    height: "28px",
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: isActive
      ? COLORS.status.info
      : isCompleted
      ? COLORS.status.success
      : "rgba(255, 255, 255, 0.15)",
    transition: `all ${TRANSITIONS.normal}`,
    boxShadow: isActive ? "0 0 12px rgba(59, 130, 246, 0.5)" : "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: isActive
      ? "2px solid rgba(59, 130, 246, 0.6)"
      : isCompleted
      ? "2px solid rgba(16, 185, 129, 0.6)"
      : "2px solid rgba(255, 255, 255, 0.2)",
  }),

  stepLine: {
    width: "60px",
    height: "2px",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginTop: "13px",
    transition: `all ${TRANSITIONS.normal}`,
  },

  progressBarContainer: {
    width: "100%",
    maxWidth: "300px",
    height: "4px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: BORDER_RADIUS.full,
    overflow: "hidden",
  },

  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.status.info,
    borderRadius: BORDER_RADIUS.full,
    transition: `width ${TRANSITIONS.slow} ease`,
  },

  stepLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    fontWeight: FONT_WEIGHTS.medium,
  },

  // Content
  content: {
    flex: 1,
    overflow: "auto",
    padding: SPACING.xl,
    position: "relative",
  },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderRadius: BORDER_RADIUS.lg,
  },

  stepContainer: {
    minHeight: "300px",
  },

  stepTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    marginBottom: SPACING.xl,
    marginTop: 0,
  },

  // Error
  errorBanner: {
    marginBottom: SPACING.lg,
    fontSize: FONT_SIZES.sm,
    color: "#FCA5A5",
    padding: `${SPACING.md} ${SPACING.lg}`,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: BORDER_RADIUS.md,
    border: "1px solid rgba(239, 68, 68, 0.3)",
  },

  // Form Elements
  formGroup: {
    marginBottom: SPACING.lg,
  },

  label: {
    display: "block",
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    marginBottom: SPACING.sm,
  },

  input: {
    width: "100%",
    padding: `${SPACING.md} ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: COLORS.text.white,
    outline: "none",
    transition: `all ${TRANSITIONS.normal}`,
    boxSizing: "border-box",
  },

  textarea: {
    width: "100%",
    padding: `${SPACING.md} ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: COLORS.text.white,
    outline: "none",
    transition: `all ${TRANSITIONS.normal}`,
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },

  // Search
  searchInputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },

  searchIcon: {
    position: "absolute",
    left: SPACING.lg,
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
    pointerEvents: "none",
  },

  searchInput: {
    width: "100%",
    padding: `${SPACING.md} ${SPACING.lg}`,
    paddingLeft: "2.5rem",
    fontSize: FONT_SIZES.sm,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: COLORS.text.white,
    outline: "none",
    transition: `all ${TRANSITIONS.normal}`,
    boxSizing: "border-box",
  },

  // Schools List
  schoolsList: {
    maxHeight: "220px",
    overflow: "auto",
    marginBottom: SPACING.lg,
    display: "flex",
    flexDirection: "column",
    gap: SPACING.sm,
    padding: SPACING.xs,
  },

  centeredMessage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },

  schoolCard: {
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    cursor: "pointer",
    transition: `all ${TRANSITIONS.normal}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  schoolCardSelected: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderColor: "rgba(59, 130, 246, 0.5)",
    boxShadow: "0 0 12px rgba(59, 130, 246, 0.2)",
  },

  schoolCardContent: {
    flex: 1,
  },

  schoolName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },

  schoolLocation: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    marginTop: "2px",
    display: "flex",
    alignItems: "center",
  },

  selectedBadge: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    backgroundColor: COLORS.status.info,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.sm,
    whiteSpace: "nowrap",
  },

  selectedSchoolsContainer: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    marginBottom: SPACING.lg,
  },

  selectedSchoolsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    display: "flex",
    alignItems: "center",
    marginBottom: SPACING.md,
  },

  selectedSchoolsList: {
    display: "flex",
    flexDirection: "column",
    gap: SPACING.sm,
  },

  selectedSchoolChip: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderRadius: BORDER_RADIUS.sm,
    border: "1px solid rgba(59, 130, 246, 0.4)",
    fontSize: FONT_SIZES.xs,
  },

  chipSchoolName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
  },

  chipSchoolLocation: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    marginTop: "2px",
    display: "flex",
    alignItems: "center",
  },

  chipRemoveButton: {
    background: "none",
    border: "none",
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.lg,
    cursor: "pointer",
    padding: 0,
    marginLeft: SPACING.md,
    transition: `all ${TRANSITIONS.normal}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    flexShrink: 0,
  },

  plannedTimeInput: {
    marginTop: SPACING.sm,
    width: "100%",
    padding: `${SPACING.xs} ${SPACING.sm}`,
    fontSize: FONT_SIZES.xs,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: COLORS.text.white,
    outline: "none",
    transition: `all ${TRANSITIONS.normal}`,
    boxSizing: "border-box",
  },

  selectedSchoolInfo: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    marginBottom: SPACING.lg,
  },

  selectedSchoolHeader: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    display: "flex",
    alignItems: "center",
  },

  selectedSchoolDetail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    marginTop: SPACING.xs,
    display: "flex",
    alignItems: "center",
  },

  // Calendar Styles
  multiSchoolInfo: {
    display: "flex",
    alignItems: "center",
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    marginBottom: SPACING.lg,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
  },

  schoolHoursInfoContainer: {
    marginBottom: SPACING.lg,
  },

  schoolHoursInfo: {
    display: "flex",
    alignItems: "center",
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
  },

  schoolHoursInfoLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    marginBottom: SPACING.sm,
  },

  schoolHoursList: {
    display: "flex",
    flexDirection: "column",
    gap: SPACING.sm,
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
  },

  schoolHourItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
    paddingBottom: SPACING.sm,
    borderBottom: "1px solid rgba(59, 130, 246, 0.2)",
  },

  schoolHourItemName: {
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
  },

  schoolHourItemTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },

  calendarNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },

  calendarNavButton: {
    background: "rgba(255, 255, 255, 0.1)",
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    color: COLORS.text.white,
    cursor: "pointer",
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    transition: `all ${TRANSITIONS.normal}`,
  },

  calendarMonthLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },

  calendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
    marginBottom: SPACING.lg,
  },

  calendarDayHeader: {
    textAlign: "center",
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.whiteSubtle,
    padding: SPACING.sm,
  },

  calendarCell: {
    textAlign: "center",
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    transition: `all ${TRANSITIONS.normal}`,
    minHeight: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  calendarCellEmpty: {
    minHeight: "36px",
  },

  calendarCellWorking: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: COLORS.text.white,
    cursor: "pointer",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    pointerEvents: "auto",
    userSelect: "none",
  },

  calendarCellDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    color: "rgba(255, 255, 255, 0.25)",
    cursor: "not-allowed",
    border: "1px solid transparent",
    pointerEvents: "none",
  },

  calendarCellSelected: {
    backgroundColor: COLORS.status.info,
    color: COLORS.text.white,
    boxShadow: "0 0 12px rgba(59, 130, 246, 0.5)",
    border: `1px solid ${COLORS.status.info}`,
    fontWeight: FONT_WEIGHTS.bold,
  },

  calendarCellToday: {
    boxShadow: "inset 0 0 0 2px rgba(255, 255, 255, 0.4)",
  },

  calendarLegend: {
    display: "flex",
    gap: SPACING.lg,
    justifyContent: "center",
    marginBottom: SPACING.lg,
    flexWrap: "wrap",
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: SPACING.xs,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },

  legendDot: {
    width: "10px",
    height: "10px",
    borderRadius: BORDER_RADIUS.full,
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },

  selectedDateInfo: {
    display: "flex",
    alignItems: "center",
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
  },

  // Review Card
  reviewCard: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    overflow: "hidden",
  },

  reviewRow: {
    display: "flex",
    flexDirection: "row",
    padding: `${SPACING.lg} ${SPACING.xl}`,
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    gap: SPACING.lg,
    alignItems: "flex-start",
  },

  reviewLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.whiteSubtle,
    minWidth: "120px",
    display: "flex",
    alignItems: "center",
  },

  reviewIcon: {
    marginRight: SPACING.sm,
    fontSize: "14px",
    opacity: 0.8,
  },

  reviewValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    flex: 1,
  },

  reviewSubValue: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    marginTop: "2px",
    display: "flex",
    alignItems: "center",
  },

  // Footer Buttons
  footer: {
    padding: `${SPACING.lg} ${SPACING.xl}`,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    display: "flex",
    gap: SPACING.md,
    justifyContent: "flex-end",
    background: "rgba(255, 255, 255, 0.05)",
  },

  buttonPrimary: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    backgroundColor: COLORS.status.info,
    border: "none",
    borderRadius: BORDER_RADIUS.md,
    cursor: "pointer",
    transition: `all ${TRANSITIONS.normal}`,
    boxShadow: "0 4px 15px rgba(59, 130, 246, 0.4)",
    minWidth: "120px",
  },

  buttonSecondary: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    cursor: "pointer",
    transition: `all ${TRANSITIONS.normal}`,
    minWidth: "100px",
  },

  buttonSuccess: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    backgroundColor: COLORS.status.success,
    border: "none",
    borderRadius: BORDER_RADIUS.md,
    cursor: "pointer",
    transition: `all ${TRANSITIONS.normal}`,
    boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
    minWidth: "140px",
  },

  buttonDanger: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    backgroundColor: COLORS.status.error,
    border: "none",
    borderRadius: BORDER_RADIUS.md,
    cursor: "pointer",
    transition: `all ${TRANSITIONS.normal}`,
    boxShadow: "0 4px 15px rgba(239, 68, 68, 0.4)",
    marginRight: "auto",
    minWidth: "100px",
  },
};

export default PlanVisitModal;
