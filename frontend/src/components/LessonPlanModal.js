import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { getSchools, getAuthHeaders, getClasses, addLesson } from "../api";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
import "react-toastify/dist/ReactToastify.css";
import "./LessonPlanModal.css";
import BookTreeSelect from "./BookTreeSelect"; // ← NEW: Import
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,      // “Add Selected Dates” button
  faSave,      // Save button (optional – you can add later)
  faTimes,     // Close icon (×) and Cancel button
  
} from "@fortawesome/free-solid-svg-icons";

// --------------------------------------------------------------
// NEW: Shared book data state
// --------------------------------------------------------------
const API_BOOKS = `${process.env.REACT_APP_API_URL}/api/books/books`;

// Helper: ordinal suffix
const getOrdinalSuffix = (day) => {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

// Helper: format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getUTCDate();
  const suffix = getOrdinalSuffix(day);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    weekday: "long",
    timeZone: "UTC",
  }).replace(String(day), `${day}${suffix}`);
};

const LessonPlanModal = ({ isOpen, onClose, mode = "add" }) => {
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [teacherId, setTeacherId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [allDates, setAllDates] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [newLessons, setNewLessons] = useState([]); // ← Now holds { session_date, planned_topic_id, planned_topic_display }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null); // ← NEW: for topic selector
  // NEW: Shared book data (fetched once per modal open)
  const [bookTreeData, setBookTreeData] = useState(null);
  const [bookTreeLoading, setBookTreeLoading] = useState(false);
  const [bookTreeError, setBookTreeError] = useState(null);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);

  // --------------------------------------------------------------
  // Fetch books ONCE when modal opens
  // --------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) {
      // Reset when modal closes
      setBookTreeData(null);
      setBookTreeError(null);
      return;
    }

    const fetchBooksOnce = async () => {
      setBookTreeLoading(true);
      setBookTreeError(null);
      try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) throw new Error("Login required");

        const res = await fetch(API_BOOKS, { headers });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}${txt ? `: ${txt}` : ""}`);
        }
        const data = await res.json();
        setBookTreeData(Array.isArray(data) ? data : []);
      } catch (err) {
        setBookTreeError(err.message || "Failed to load books");
        toast.error("Failed to load book topics");
      } finally {
        setBookTreeLoading(false);
      }
    };

    fetchBooksOnce();
  }, [isOpen]); // ← Only runs when modal opens/closes

  

  // Memoized fetchSchools
  const fetchSchools = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSchools();
      setSchools(data);
    } catch (error) {
      setError("Failed to load schools. Check your connection and try again.");
      console.error("Error fetching schools:", error);
      toast.error("Failed to load schools.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoized fetchClasses
  const fetchClasses = useCallback(async () => {
    if (!selectedSchool) {
      setClasses([]);
      setSelectedClass("");
      return;
    }
    try {
      setLoading(true);
      const data = await getClasses(selectedSchool);
      setClasses(data);
    } catch (error) {
      setError("Failed to load classes. Check your connection and try again.");
      console.error("Error fetching classes:", error);
      toast.error("Failed to load classes.");
    } finally {
      setLoading(false);
    }
  }, [selectedSchool]);

  // Fetch teacher ID from JWT
  const fetchTeacherId = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/user/`, { headers });
      setTeacherId(res.data.id);
    } catch (err) {
      console.error("Failed to fetch teacher ID:", err);
    }
  }, []);

  // Generate dates for selected month
  const generateDatesForMonth = useCallback((year, month) => {
    const dates = [];
    const date = new Date(Date.UTC(year, month, 1));
    while (date.getUTCMonth() === month) {
      dates.push(new Date(date));
      date.setUTCDate(date.getUTCDate() + 1);
    }
    return dates;
  }, []);

  // Handle month change
  const handleMonthChange = (e) => {
    const value = e.target.value;
    setSelectedMonth(value);
    if (value) {
      const [year, month] = value.split("-").map(Number);
      const dates = generateDatesForMonth(year, month - 1);
      setAllDates(dates);
      setSelectedDates([]);
    } else {
      setAllDates([]);
      setSelectedDates([]);
    }
  };

  // Toggle date selection
  const toggleDateSelection = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    setSelectedDates((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr]
    );
    setHasUnsavedChanges(true);
  };

  // Generate new lessons
  const generateNewLessons = () => {
    if (selectedDates.length === 0) {
      toast.warn("Please select at least one date.");
      return;
    }
    const generated = selectedDates.map((date) => ({
      session_date: date,
      planned_topic_id: null,
      planned_topic_display: "",
    }));
    setNewLessons((prev) => [...prev, ...generated]);
    setSelectedDates([]);
    setHasUnsavedChanges(true);
    toast.success(`${selectedDates.length} date(s) added.`);
  };

    // Open topic selector
   

//   // Handle topic select
//   const handleTopicSelect = (index, node) => {
//   setNewLessons((prev) => {
//     const updated = [...prev];
//     updated[index] = {
//       ...updated[index],
//       planned_topic_id: node.id,
//       planned_topic_display: node.display_title,
//     };
//     console.log("Updated newLessons:", updated); // Log the updated array
//     return updated;
//   });
//   setEditingIndex(null);
//   setHasUnsavedChanges(true);
// };
    const openTopicSelector = (index) => {
  setSelectedTopicIds(newLessons[index]?.planned_topic_ids || []);
  setEditingIndex(index);
};

  const handleTopicSelect = (ids) => {
  const updated = [...newLessons];
  updated[editingIndex] = {
    ...updated[editingIndex],
    planned_topic_ids: ids,
    planned_topic_display: ids.length > 0 ? `${ids.length} topic(s) selected` : "Select topics"
  };
  setNewLessons(updated);
  setEditingIndex(null);
};
  // Clear topic
  const clearTopic = (index) => {
  const updated = [...newLessons];
  updated[index] = {
    ...updated[index],
    planned_topic_ids: [],           // ← Clear IDs
    planned_topic_display: undefined // ← Remove display text
  };
  setNewLessons(updated);
};

  // // Form validation
  // const isFormValid = () => {
  //   return (
  //     selectedSchool &&
  //     selectedClass &&
  //     teacherId &&
  //     newLessons.length > 0 &&
  //     newLessons.every((l) => l.planned_topic_id != null)
  //   );
  // };
  const formValid = useMemo(() => {
  const valid = (
    selectedSchool != null &&
    selectedClass != null &&
    teacherId != null &&
    newLessons.length > 0 &&
    newLessons.every((l) => 
      Array.isArray(l.planned_topic_ids) && l.planned_topic_ids.length > 0
    )
  );
  console.log("formValid computed:", valid);
  console.log("Current newLessons:", newLessons);
  return valid;
}, [selectedSchool, selectedClass, teacherId, newLessons]);
  // Handle submit
    const handleSubmit = async () => {
    if (!formValid || loading) return;

    setLoading(true);
    setError("");

    try {
      const payload = {
        school_id: selectedSchool,
        student_class: selectedClass,
        lessons: newLessons.map(l => ({
          session_date: l.session_date,
          planned_topic_ids: l.planned_topic_ids || []  // ← CRITICAL
        })),
      };

      console.log("Final payload:", payload); // Debug

      const result = await addLesson(payload);
      console.log("API Response:", result);

      toast.success("Lesson plans created successfully!");

      // DO NOT CALL onClose() HERE
      // Keep modal open for more entries

      // Optional: Reset form for next entry
      setSelectedDates([]);
      setNewLessons([]);
      // Keep school/class/month selected if you want
    } catch (err) {
      console.error("Add lesson error:", err);
      setError(err.message || "Failed to save lessons");
      toast.error("Failed to save lessons");
    } finally {
      setLoading(false);
    }
  };
  // Handle close with unsaved changes
  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm("You have unsaved changes. Close anyway?")) {
        onClose();
        resetForm();
      }
    } else {
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setSelectedSchool("");
    setSelectedClass("");
    setSelectedMonth("");
    setAllDates([]);
    setSelectedDates([]);
    setNewLessons([]);
    setEditingIndex(null);
    setHasUnsavedChanges(false);
  };

  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      fetchSchools();
      fetchTeacherId();
    }
  }, [isOpen, fetchSchools, fetchTeacherId]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  if (!isOpen) return null;

return (
  <div
  className={`modal-overlay ${isOpen ? "visible" : ""}`}
  onClick={handleClose} // Close when clicking overlay
>
  <div
    className="modal-content"
    onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside
  >
      <div className="modal-header">
        <h2 id="modal-title">{mode === "add" ? "Add" : "Edit"} Lesson Plan</h2>
        <button onClick={handleClose} className="btn-close" aria-label="Close modal">
          ×
        </button>

      </div>
      <div className="modal-instructions">
  <p>
    Choose your <strong>School</strong>, <strong>Class</strong>, <strong>Month (Date ranges)</strong> to view all dates. 
    Then check your working days to see space for entering your planned lesson.
  </p>
</div>


      {loading && (
        <div className="loading-overlay">
          <ClipLoader size={50} color={"#123abc"} />
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="modal-body">
        {/* School Selection */}
        <fieldset disabled={loading}>
          <label htmlFor="school-select">Select School</label>
          <select
            id="school-select"
            value={selectedSchool}
            onChange={(e) => {
              setSelectedSchool(e.target.value);
              setSelectedClass("");
              setHasUnsavedChanges(true);
            }}
            className="form-select"
          >
            <option value="">-- Select School --</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </fieldset>

        {/* Class Selection */}
        {selectedSchool && (
          <fieldset disabled={loading}>
            <label htmlFor="class-select">Select Class</label>
            <select
              id="class-select"
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="form-select"
            >
              <option value="">-- Select Class --</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </fieldset>
        )}

        {/* Month Selection */}
        {selectedClass && (
          <fieldset disabled={loading}>
            <label htmlFor="month-select">Select Month</label>
            <input
              id="month-select"
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="form-input"
            />
          </fieldset>
        )}

        {/* Date Selection */}
        {allDates.length > 0 && (
          <fieldset disabled={loading}>
            <legend>Select Dates</legend>
            <div className="dates-grid">
              {allDates.map((date) => {
                const dateStr = date.toISOString().split("T")[0];
                return (
                  <div key={dateStr} className="date-item">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedDates.includes(dateStr)}
                        onChange={() => toggleDateSelection(date)}
                        disabled={loading}
                        className="checkbox-input"
                        aria-label={`Select date ${formatDate(date)}`}
                      />
                      <span>{formatDate(date)}</span>
                    </label>
                  </div>
                );
              })}
            </div>
            <button
              onClick={generateNewLessons}
              className="btn btn-primary mt-2"
              disabled={loading || selectedDates.length === 0}
              aria-label="Add selected dates"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Selected Dates
            </button>
          </fieldset>
        )}

        {/* Lessons Table */}
        <div className="table-container">
          <table className="lesson-table" aria-describedby="modal-title">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Planned Topic</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {newLessons.map((lesson, index) => (
                <tr key={`new-${index}`} className="new-lesson">
                  <td>{formatDate(lesson.session_date)}</td>
                  <td>
                    {lesson.planned_topic_display ? (
                      <span className="selected-topic-display">
                        {lesson.planned_topic_display}
                      </span>
                    ) : (
                      <em className="text-muted">No topic selected</em>
                    )}
                  </td>
                  <td>
  {/* Show how many topics are selected (or “No topics”) */}
  {lesson.planned_topic_ids?.length > 0 
    ? `${lesson.planned_topic_ids.length} topic${lesson.planned_topic_ids.length > 1 ? 's' : ''} selected`
    : "No topics"}

  {/* Open / Change button */}
  <button
    onClick={() => openTopicSelector(index)}
    className="btn btn-sm btn-outline ml-2"
    disabled={loading}
  >
    {lesson.planned_topic_ids?.length > 0 ? "Change" : "Select"}
  </button>

  {/* Clear button – only when something is selected */}
  {lesson.planned_topic_ids?.length > 0 && (
    <button
      onClick={() => clearTopic(index)}
      className="btn btn-sm btn-danger ml-1"
      disabled={loading}
    >
      Clear
    </button>
  )}
</td>
                </tr>
              ))}
              {newLessons.length === 0 && (
                <tr>
                  <td colSpan="3" className="empty-table-text">
                    No lessons added. Select dates to add new lessons.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

  {/* Topic Selector Modal */}
{editingIndex !== null && (
  <div className="topic-selector-overlay">
    <div className="topic-selector-modal">
      <button
        onClick={() => setEditingIndex(null)}
        className="close-icon"
        aria-label="Close topic selector"
      >
        <FontAwesomeIcon icon={faTimes} />
      </button>

      <h3>
        Select Topic for{" "}
        {formatDate(newLessons[editingIndex].session_date)}
      </h3>

      {bookTreeLoading && (
        <div className="text-center p-4">
          <ClipLoader size={30} color="#7e57c2" />
          <p className="mt-2">Loading topics...</p>
        </div>
      )}

      {bookTreeError && (
        <div className="text-center p-4 text-danger">
          <p>{bookTreeError}</p>
          <button
            onClick={async () => {
              setBookTreeLoading(true);
              try {
                const headers = getAuthHeaders();
                const res = await fetch(API_BOOKS, { headers });
                const data = await res.json();
                setBookTreeData(Array.isArray(data) ? data : []);
                setBookTreeError(null);
              } catch {
                setBookTreeError("Retry failed");
              } finally {
                setBookTreeLoading(false);
              }
            }}
            className="btn btn-sm btn-outline mt-2"
          >
            Retry
          </button>
        </div>
      )}

      {bookTreeData && !bookTreeLoading && !bookTreeError && (
        <BookTreeSelect
          books={bookTreeData}
          selectedIds={selectedTopicIds}                 // <-- NEW
          onSelect={handleTopicSelect}                  // <-- NEW (receives array)
        />
      )}

      <button
        onClick={() => setEditingIndex(null)}
        className="btn btn-danger mt-3"
      >
        Close
      </button>
    </div>
  </div>
)}
      </div>

      {/* SINGLE, CLEAN MODAL ACTIONS */}
      <div className="modal-actions">
        <button
          onClick={handleSubmit}
          className="btn btn-success"
          disabled={loading || !formValid}
        >
          {loading ? "Saving..." : "Save & Continue"}
        </button>

        <button
          onClick={async () => {
            await handleSubmit();
            onClose();
          }}
          className="btn btn-primary"
          disabled={loading || !formValid}
        >
          <FontAwesomeIcon icon={faSave} className="mr-2" />
          Save & Close
        </button>

        <button
          onClick={onClose}
          className="btn btn-danger"
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);
};

export default LessonPlanModal;