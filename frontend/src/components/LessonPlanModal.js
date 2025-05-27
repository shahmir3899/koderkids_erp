import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getSchools, getAuthHeaders, getClasses, addLesson } from "../api";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
import "react-toastify/dist/ReactToastify.css";
import "./LessonPlanModal.css";

// Helper function to add ordinal suffix (e.g., 1st, 2nd, 3rd, 4th)
const getOrdinalSuffix = (day) => {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

// Helper function to format dates as "3rd Feb 2025, Tuesday"
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
  const [newLessons, setNewLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    const fetchTeacher = async () => {
      try {
        setLoading(true);
        toast.info("Loading lesson plan form...", { toastId: "loadingLessonForm", autoClose: false });
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/user/`, {
          headers: getAuthHeaders(),
        });
        if (response.data?.id) {
          setTeacherId(response.data.id);
        } else {
          setError("Could not fetch teacher ID. Please try again.");
          toast.error("Could not fetch teacher ID.");
        }
      } catch (error) {
        const message = error.response?.status === 401 ? "Unauthorized access. Please log in again." : "Error fetching user data.";
        setError(message);
        console.error("Error fetching user:", error.response?.data || error.message);
        toast.error(message);
      } finally {
        setLoading(false);
        toast.dismiss("loadingLessonForm");
      }
    };
    if (isOpen) fetchTeacher();
  }, [isOpen]);

  const handleMonthChange = useCallback((e) => {
    setSelectedMonth(e.target.value);
    setHasUnsavedChanges(true);
    if (!e.target.value) {
      setAllDates([]);
      setSelectedDates([]);
      setNewLessons([]);
      setError("");
      return;
    }
    const [year, month] = e.target.value.split("-");
    const days = [];
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(Date.UTC(year, month - 1, day));
      const formattedDate = date.toISOString().split("T")[0];
      days.push(formattedDate);
    }
    setAllDates(days);
    setSelectedDates([]);
    setNewLessons([]);
    setError("");
  }, []);

  const toggleDateSelection = (date) => {
    setHasUnsavedChanges(true);
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const generateNewLessons = () => {
    if (selectedDates.length === 0) {
      setError("Please select at least one date for new lessons.");
      toast.error("Select at least one date.");
      return;
    }
    const generatedLessons = selectedDates.map((date) => ({
      session_date: date,
      planned_topic: "",
    }));
    setNewLessons(generatedLessons);
    setError("");
    setHasUnsavedChanges(true);
  };

  const handleInputChange = (index, field, value) => {
    setHasUnsavedChanges(true);
    const updatedNewLessons = [...newLessons];
    updatedNewLessons[index][field] = value;
    setNewLessons(updatedNewLessons);
  };

  const isFormValid = () => {
    return (
      selectedSchool &&
      selectedClass &&
      teacherId &&
      newLessons.length > 0 &&
      newLessons.every((lesson) => lesson.session_date && lesson.planned_topic.trim())
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      toast.error("Please fill all required fields: school, class, and lesson topics.");
      return;
    }

    let toastId = null;
    try {
      setLoading(true);
      toastId = toast.info(`Saving lessons for ${formatDate(selectedDates[0])} - ${selectedClass}...`, { autoClose: false });

      for (const lesson of newLessons) {
        await addLesson({
          school_id: selectedSchool,
          student_class: selectedClass,
          teacher_id: teacherId,
          session_date: lesson.session_date,
          planned_topic: lesson.planned_topic,
        });
      }

      toast.success("Lessons saved successfully!");
      resetForm();
      onClose();
    } catch (error) {
      const message = error.response?.status === 400 ? "Invalid lesson data." : "Failed to save lessons.";
      toast.error(message);
      console.error("Error adding new lessons:", error.response?.data || error.message);
      setError(message);
    } finally {
      setLoading(false);
      if (toastId) toast.dismiss(toastId);
    }
  };

  const resetForm = () => {
    setSelectedSchool("");
    setSelectedClass("");
    setSelectedMonth("");
    setAllDates([]);
    setSelectedDates([]);
    setNewLessons([]);
    setError("");
    setHasUnsavedChanges(false);
  };

  const handleClose = () => {
    if (hasUnsavedChanges && !window.confirm("You have unsaved changes. Are you sure you want to close?")) {
      return;
    }
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-labelledby="modal-title">
      <div className="modal-container">
        {/* Updated Descriptive Text */}
        <p className="text-gray-600 mb-4">
  Choose your <span className="font-bold">School, Class, Month (Date ranges)</span> to view all dates. Then check your working days to see space for entering <span className="font-bold">your planned lesson</span>.
</p>

        <h2 id="modal-title" className="modal-title">📅 Add Lesson Plan</h2>

        {loading && (
  <div className="flex justify-center items-center" aria-live="polite">
    <ClipLoader color="#000000" size={30} />
  </div>
)}
        {error && <p className="error-text" aria-live="assertive">{error}</p>}

        <fieldset className="form-group">
          <legend className="form-label">School</legend>
          <select
            aria-label="Select school"
            className="form-select"
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            disabled={loading}
          >
            <option value="">-- Select School --</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset className="form-group">
          <legend className="form-label">Class</legend>
          <select
            aria-label="Select class"
            className="form-select"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={!selectedSchool || loading}
          >
            <option value="">-- Select Class --</option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset className="form-group">
          <legend className="form-label">Select Month</legend>
          <input
            type="month"
            aria-label="Select month"
            className="form-input"
            value={selectedMonth}
            onChange={handleMonthChange}
            disabled={loading}
          />
        </fieldset>

        {allDates.length > 0 && (
          <fieldset className="form-group">
            <legend className="form-label">Select Lesson Dates</legend>
            {/* New Descriptive Text Before Dates */}
           <p className="text-gray-600 mb-2">
  Select your <span style={{ fontWeight: 'bold' }}>working days</span> and click <span style={{ fontWeight: 'bold' }}>Add Selected Dates</span>
</p>
            <div className="date-checkboxes" role="group" aria-label="Select lesson dates">
              {allDates.map((date) => (
                <div key={date} className="date-checkbox-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      aria-label={`Select ${formatDate(date)}`}
                      checked={selectedDates.includes(date)}
                      onChange={() => toggleDateSelection(date)}
                      disabled={loading}
                      className="checkbox-input"
                    />
                    <span>{formatDate(date)}</span>
                  </label>
                </div>
              ))}
            </div>
            <button
              onClick={generateNewLessons}
              className="btn btn-primary mt-2"
              disabled={loading}
              aria-label="Add selected dates"
            >
              ➕ Add Selected Dates
            </button>
          </fieldset>
        )}

        <div className="table-container">
          <table className="lesson-table" aria-describedby="modal-title">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Planned Topic</th>
              </tr>
            </thead>
            <tbody>
              {newLessons.map((lesson, index) => (
                <tr key={`new-${index}`} className="new-lesson">
                  <td>{formatDate(lesson.session_date)}</td>
                  <td>
                    <textarea
                      aria-label={`Enter topic for lesson on ${formatDate(lesson.session_date)}`}
                      className="form-textarea"
                      value={lesson.planned_topic}
                      onChange={(e) => handleInputChange(index, "planned_topic", e.target.value)}
                      placeholder="Enter topic for this lesson"
                      disabled={loading}
                    />
                  </td>
                </tr>
              ))}
              {newLessons.length === 0 && (
                <tr>
                  <td colSpan="2" className="empty-table-text">
                    No lessons added. Select dates to add new lessons.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="modal-actions">
          <button
            onClick={handleSubmit}
            className="btn btn-success"
            disabled={loading || !isFormValid()}
            aria-label="Save new lessons"
          >
            Save New Lessons
          </button>
          <button
            onClick={handleClose}
            className="btn btn-danger"
            disabled={loading}
            aria-label="Cancel and close modal"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LessonPlanModal;