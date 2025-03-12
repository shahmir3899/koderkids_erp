import React, { useState, useEffect } from "react";
import axios from "axios";
import { getSchools, getAuthHeaders, getClasses, addLesson } from "../api";
import "./LessonPlanModal.css";

// Helper function to format dates as "D MMM YYYY"
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        setLoading(true);
        const data = await getSchools();
        setSchools(data);
      } catch (error) {
        setError("Failed to load schools. Please try again.");
        console.error("Error fetching schools:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchools();
  }, []);

  useEffect(() => {
    if (!selectedSchool) {
      setClasses([]);
      setSelectedClass("");
      return;
    }
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const data = await getClasses(selectedSchool);
        setClasses(data);
      } catch (error) {
        setError("Failed to load classes. Please try again.");
        console.error("Error fetching classes:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [selectedSchool]);

  useEffect(() => {
    const fetchTeacher = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/user/`, {
          headers: getAuthHeaders(),
        });
        if (response.data && response.data.id) {
          setTeacherId(response.data.id);
        } else {
          setError("Could not fetch teacher ID!");
        }
      } catch (error) {
        setError("Error fetching user data. Please try again.");
        console.error("Error fetching user:", error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };
    if (isOpen) fetchTeacher();
  }, [isOpen]);

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    if (!e.target.value) {
      setAllDates([]);
      setSelectedDates([]);
      setNewLessons([]);
      return;
    }
    const [year, month] = e.target.value.split("-");
    const days = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const formattedDate = date.toISOString().split("T")[0];
      days.push(formattedDate);
    }
    setAllDates(days);
    setSelectedDates([]);
    setNewLessons([]);
    setError("");
  };

  const toggleDateSelection = (date) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const generateNewLessons = () => {
    if (selectedDates.length === 0) {
      setError("Please select at least one date for new lessons.");
      return;
    }
    const generatedLessons = selectedDates.map((date) => ({
      session_date: date,
      planned_topic: "",
    }));
    setNewLessons(generatedLessons);
    setError("");
  };

  const handleInputChange = (index, field, value) => {
    const updatedNewLessons = [...newLessons];
    updatedNewLessons[index][field] = value;
    setNewLessons(updatedNewLessons);
  };

  const handleSubmit = async () => {
    if (!selectedSchool || !selectedClass || !teacherId) {
      setError("Please select a school, class, and ensure teacher ID is loaded.");
      return;
    }
    if (newLessons.some((lesson) => !lesson.session_date || !lesson.planned_topic.trim())) {
      setError("Please fill all fields for new lessons before saving.");
      return;
    }
    try {
      setLoading(true);
      for (const lesson of newLessons) {
        await addLesson({
          school_id: selectedSchool,
          student_class: selectedClass,
          teacher_id: teacherId,
          session_date: lesson.session_date,
          planned_topic: lesson.planned_topic,
        });
      }
      alert("New Lessons Added Successfully!");
      onClose();
    } catch (error) {
      setError("Failed to add new lessons. Please try again.");
      console.error("Error adding new lessons:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2 className="modal-title">📅 Add Lesson Plan</h2>

        {loading && <p className="loading-text">Loading...</p>}
        {error && <p className="error-text">{error}</p>}

        {/* School and Class Selection */}
        <div className="form-group">
          <label className="form-label">School:</label>
          <select
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
        </div>

        <div className="form-group">
          <label className="form-label">Class:</label>
          <select
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
        </div>

        {/* Month Picker */}
        <div className="form-group">
          <label className="form-label">Select Month:</label>
          <input
            type="month"
            className="form-input"
            value={selectedMonth}
            onChange={handleMonthChange}
            disabled={loading}
          />
        </div>

        {/* Date Selection with Day Names */}
        {allDates.length > 0 && (
          <div className="form-group">
            <label className="form-label">Select Lesson Dates:</label>
            <div className="date-checkboxes">
              {allDates.map((date) => {
                const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "long" });
                const formattedDate = formatDate(date); // Use the helper function
                return (
                  <div key={date} className="date-checkbox-item">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedDates.includes(date)}
                        onChange={() => toggleDateSelection(date)}
                        disabled={loading}
                        className="checkbox-input"
                      />
                      <span>{`${dayName}, ${formattedDate}`}</span>
                    </label>
                  </div>
                );
              })}
            </div>
            <button
              onClick={generateNewLessons}
              className="btn btn-primary mt-2"
              disabled={loading}
            >
              ➕ Add Selected Dates
            </button>
          </div>
        )}

        {/* Lesson Table */}
        <div className="table-container">
          <table className="lesson-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Planned Topic</th>
              </tr>
            </thead>
            <tbody>
              {newLessons.map((lesson, index) => (
                <tr key={`new-${index}`} className="new-lesson">
                  <td>{formatDate(lesson.session_date)}</td> {/* Format date in table */}
                  <td>
                    <textarea
                      className="form-textarea"
                      value={lesson.planned_topic}
                      onChange={(e) =>
                        handleInputChange(index, "planned_topic", e.target.value)
                      }
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

        {/* Action Buttons */}
        <div className="modal-actions">
          <button
            onClick={handleSubmit}
            className="btn btn-success"
            disabled={loading || newLessons.length === 0}
          >
            Save New Lessons
          </button>
          <button onClick={onClose} className="btn btn-danger" disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LessonPlanModal;