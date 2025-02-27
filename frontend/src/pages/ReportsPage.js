import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ✅ Import useNavigate
import axios from "axios";
import { API_URL, getAuthHeaders, getSchools, getClasses } from "../api";

const getMonthDates = (month) => {
    const [year, monthNumber] = month.split("-"); // Extract year and month
    const firstDay = `${month}-01`;
    const lastDay = new Date(year, monthNumber, 0).toISOString().split("T")[0]; // Get last day

    return { firstDay, lastDay };
};




const ReportsPage = () => {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedSchool, setSelectedSchool] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [students, setStudents] = useState([]);
    const [schools, setSchools] = useState([]);
    const [classes, setClasses] = useState([]);
    const navigate = useNavigate(); // ✅ Initialize navigation function
    const [selectedMonth, setSelectedMonth] = useState(""); // YYYY-MM format


    // Fetch schools on component mount
    useEffect(() => {
        const fetchSchoolList = async () => {
            try {
                const schoolData = await getSchools();
                console.log("🏫 Fetched Schools:", schoolData);
                setSchools(schoolData);
            } catch (error) {
                console.error("❌ Error loading schools:", error);
            }
        };
        fetchSchoolList();
    }, []);

    // Fetch classes when a school is selected
    useEffect(() => {
        const fetchClassList = async () => {
            if (!selectedSchool) {
                setClasses([]);
                return;
            }
            try {
                const classData = await getClasses(selectedSchool);
                console.log("📚 Fetched Classes for School:", selectedSchool, classData);
                setClasses(classData);
            } catch (error) {
                console.error("❌ Error loading classes:", error);
            }
        };
        fetchClassList();
    }, [selectedSchool]);

    // Fetch students based on school and class selection
    const fetchStudents = async () => {
        if (!selectedSchool || !selectedClass) {
            alert("Please select a school and class.");
            return;
        }

        try {
            console.log(`📡 Fetching students for School: ${selectedSchool}, Class: ${selectedClass}`);
            const response = await axios.get(`${API_URL}/api/students-prog/`, {
                headers: getAuthHeaders(),
                params: {
                    school_id: selectedSchool,
                    class_id: selectedClass,
                    session_date: startDate // Use startDate or add a new date filter
                },
            });

            console.log("🔍 Full API Response:", response.data);
            console.log("✅ Extracted Students:", response.data.students || response.data);
            const studentList = response.data?.students || response.data || []; // Handle different formats
            console.log("✅ Processed Students Data:", studentList);
            setStudents(studentList);

        } catch (error) {
            console.error("❌ Error fetching students:", error.response?.data || error.message);
            setStudents([]);
        }
    };

    return (
        <div style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
            <h2 style={{ textAlign: "center", marginBottom: "20px" }}>📊 Monthly Reports</h2>
    
            {/* Filters Container */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
            <div style={{ flex: "1" }}>
            <label>Select Month:</label>
            <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => {
                    const selectedMonth = e.target.value;
                    setSelectedMonth(selectedMonth);
                
                    const { firstDay, lastDay } = getMonthDates(selectedMonth); // Use the same function from `StudentReport.js`
                    setStartDate(firstDay);
                    setEndDate(lastDay);
                }}
                 
            />
        </div>

    
                <div style={{ flex: "1" }}>
                    <label>School:</label>
                    <select value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)}>
                        <option value="">-- Select School --</option>
                        {schools.map((school) => (
                            <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                    </select>
                </div>
    
                <div style={{ flex: "1" }}>
                    <label>Class:</label>
                    <select 
                        value={selectedClass} 
                        onChange={(e) => setSelectedClass(e.target.value)} 
                        disabled={!selectedSchool}
                    >
                        <option value="">-- Select Class --</option>
                        {classes.map((className, index) => (
                            <option key={index} value={className}>{className}</option>
                        ))}
                    </select>
                </div>
    
                {/* Search Button */}
                <div style={{ flex: "1", alignSelf: "flex-end" }}>
                    <button 
                        onClick={fetchStudents} 
                        style={{
                            width: "100%",
                            backgroundColor: "#007BFF",
                            color: "white",
                            padding: "10px",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                        }}
                    >
                        🔍 Search
                    </button>
                </div>
            </div>
    
            {/* Students List */}
            {Array.isArray(students) && students.length > 0 ? (
                <div>
                    <h3 style={{ marginBottom: "10px" }}>📋 Student List</h3>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#f4f4f4", textAlign: "left" }}>
                                <th style={{ padding: "10px", borderBottom: "2px solid #ddd" }}>Student Name</th>
                                <th style={{ padding: "10px", borderBottom: "2px solid #ddd" }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student) => (
                                <tr key={student.id}>
                                    <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>{student.name}</td>
                                    <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
    <button 
        onClick={() => navigate(`/student-report/${student.id}`, { state: { autoGenerate: true,month: selectedMonth } })} 
        style={{
            backgroundColor: "#28A745",
            color: "white",
            padding: "8px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
        }}
    >
        📄 Generate Report
    </button>
</td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p style={{ textAlign: "center", color: "gray" }}>No students found. Adjust filters and try again.</p>
            )}
        </div>
    );
    
};

export default ReportsPage;
