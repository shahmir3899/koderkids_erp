import React, { useState, useEffect } from "react";
import axios from "axios";
import { getSchools, getAuthHeaders, getClasses, addLesson } from "../api";
import "../App.css";

const LessonPlanModal = ({ isOpen, onClose }) => {
    const [schools, setSchools] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState("");
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [lessons, setLessons] = useState([]);
    const [teacherId, setTeacherId] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedDays, setSelectedDays] = useState(" "); // Default working days


    // ✅ Fetch Schools
    useEffect(() => {
        const fetchSchools = async () => {
            try {
                const data = await getSchools();
                setSchools(data);
            } catch (error) {
                console.error("Error fetching schools:", error);
            }
        };
        fetchSchools();
    }, []);

    // ✅ Fetch Classes
    useEffect(() => {
        if (!selectedSchool) return;
        const fetchClasses = async () => {
            try {
                const data = await getClasses(selectedSchool);
                setClasses(data);
            } catch (error) {
                console.error("Error fetching classes:", error);
            }
        };
        fetchClasses();
    }, [selectedSchool]);

    // ✅ Fetch Teacher ID
    useEffect(() => {
        const fetchTeacher = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/user/`, {
                    headers: getAuthHeaders(),
                });

                if (response.data && response.data.id) {
                    setTeacherId(response.data.id);
                } else {
                    console.error("❌ Could not fetch teacher ID!");
                }
            } catch (error) {
                console.error("❌ Error fetching user:", error.response?.data || error.message);
            }
        };

        if (isOpen) fetchTeacher();
    }, [isOpen]);

    // ✅ Handle Month Selection & Generate 8 Lesson Dates
    const handleMonthSelect = (e) => {
        setSelectedMonth(e.target.value);
    };
    
    const generateLessons = () => {
        if (!selectedMonth || selectedDays.length === 0) {
            alert("Please select a month and working days first!");
            return;
        }
    
        const [year, month] = selectedMonth.split("-");
        const monthIndex = parseInt(month, 10) - 1; // ✅ Ensure correct month indexing
        let generatedLessons = [];
        let daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
        for (let day = 1; day <= daysInMonth; day++) {
            let lessonDate = new Date(year, monthIndex, day);
            let weekday = lessonDate.toLocaleDateString("en-US", { weekday: "long" });
    
            // ✅ Check if the weekday is selected
            if (selectedDays.includes(weekday)) {
                const formattedDate = lessonDate.toISOString().split("T")[0]; // ✅ Convert to YYYY-MM-DD
                generatedLessons.push({ session_date: formattedDate, planned_topic: "" });
            }
        }
    
        console.log("✅ Generated Lessons:", generatedLessons);
        setLessons(generatedLessons);
    };
    
    
    
    
    
    
    

    // ✅ Handle Planned Topic Input (Allow Multi-line)
    const handleInputChange = (index, field, value) => {
        const updatedLessons = [...lessons];
        updatedLessons[index][field] = value;
        setLessons(updatedLessons);
    };

    const toggleDaySelection = (day) => {
        setSelectedDays((prevDays) =>
            prevDays.includes(day)
                ? prevDays.filter((d) => d !== day) // Remove if already selected
                : [...prevDays, day] // Add if not selected
        );
    };

    
    // ✅ Handle Submit
    const handleSubmit = async () => {
        if (!selectedSchool || !selectedClass || !teacherId || lessons.some(lesson => !lesson.session_date || !lesson.planned_topic.trim())) {
            alert("Please fill all fields before saving!");
            return;
        }
    
        try {
            for (const lesson of lessons) {  // ✅ Send lessons one by one
                const dateObject = new Date(lesson.session_date);
                const formattedDate = dateObject.toISOString().split("T")[0];
    
                const lessonData = {
                    school_id: selectedSchool,
                    student_class: selectedClass,
                    teacher_id: teacherId,
                    session_date: formattedDate,
                    planned_topic: lesson.planned_topic
                };
    
                console.log("🚀 Sending Lesson Data:", lessonData);
                await addLesson(lessonData);  // ✅ Ensures one request at a time
            }
    
            alert("Lesson Plan Saved Successfully!");
            onClose();
        } catch (error) {
            console.error("❌ Error saving lesson plan:", error.response?.data || error.message);
            alert("Failed to save lesson plan.");
        }
    };
    
    

    if (!isOpen) return null;

    return (
        <div className="modal">
            <div className="modal-content">
                <h2>➕ Add Lesson Plan</h2>

                {/* ✅ Select School */}
                <label>Select School:</label>
                <select value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)}>
                    <option value="">-- Select School --</option>
                    {schools.map((school) => (
                        <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                </select>

                {/* ✅ Select Class */}
                <label>Select Class:</label>
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} disabled={!selectedSchool}>
                    <option value="">-- Select Class --</option>
                    {classes.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                    ))}
                </select>

                {/* Month Selection */}
                <label>Select Month:</label>
                <input type="month" value={selectedMonth || ""} onChange={handleMonthSelect} />

                <label>Select Working Days:</label>
                <div className="flex flex-wrap gap-2">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
                        <label key={day} className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={selectedDays.includes(day)}
                                onChange={() => toggleDaySelection(day)}
                            />
                            <span>{day}</span>
                        </label>
                    ))}
                </div>


                {/* Generate Lessons Button */}
                <button
                    onClick={generateLessons}
                    className="bg-blue-500 text-white px-4 py-2 rounded mt-2 hover:bg-blue-600"
                >
                    📅 Generate Lessons
                </button>
              
                

                {/* ✅ Lesson Plan Inputs */}
                <table className="lesson-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Planned Topic</th>
                        </tr>
                    </thead>
                    <tbody>
    {lessons.length > 0 ? (
        lessons.map((lesson, index) => (
            <tr key={index}>
                <td>{lesson.session_date}</td>
                <td>
                    <textarea
                        placeholder="Enter topic"
                        value={lesson.planned_topic}
                        onChange={(e) => handleInputChange(index, "planned_topic", e.target.value)}
                    />
                </td>
            </tr>
        ))
    ) : (
        <tr>
            <td colSpan="2" style={{ textAlign: "center", color: "gray" }}>No lessons added yet</td>
        </tr>
    )}
</tbody>

                </table>

                {/* ✅ Buttons */}
                <button onClick={handleSubmit} className="save-button">Save</button>
                <button onClick={onClose} className="cancel-button">Cancel</button>
            </div>
        </div>
    );
};

export default LessonPlanModal;
