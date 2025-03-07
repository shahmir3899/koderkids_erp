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
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Title */}
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">📊 Monthly Reports</h2>
    
            {/* Filters Container */}
            <div className="flex flex-wrap gap-4 mb-6">
                {/* Select Month */}
                <div className="flex flex-col flex-1 min-w-[200px]">
                    <label className="font-bold mb-2 text-gray-700">Select Month:</label>
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
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                </div>
    
                {/* School Selector */}
                <div className="flex flex-col flex-1 min-w-[200px]">
                    <label className="font-bold mb-2 text-gray-700">School:</label>
                    <select
                        value={selectedSchool}
                        onChange={(e) => setSelectedSchool(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    >
                        <option value="">-- Select School --</option>
                        {schools.map((school) => (
                            <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                    </select>
                </div>
    
                {/* Class Selector */}
                <div className="flex flex-col flex-1 min-w-[200px]">
                    <label className="font-bold mb-2 text-gray-700">Class:</label>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        disabled={!selectedSchool}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors disabled:opacity-50"
                    >
                        <option value="">-- Select Class --</option>
                        {classes.map((className, index) => (
                            <option key={index} value={className}>{className}</option>
                        ))}
                    </select>
                </div>
    
                {/* Search Button */}
                <div className="flex flex-col flex-1 min-w-[200px]">
                    <button
                        onClick={fetchStudents}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                        🔍 Search
                    </button>
                </div>
            </div>
    
            {/* Students List */}
            {Array.isArray(students) && students.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">📋 Student List</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 text-left text-gray-700 font-semibold">Student Name</th>
                                    <th className="p-3 text-left text-gray-700 font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-3 border-t border-gray-200 text-gray-600">{student.name}</td>
                                        <td className="p-3 border-t border-gray-200">
                                            <button
                                                onClick={() => navigate(`/student-report/${student.id}`, { state: { autoGenerate: true, month: selectedMonth } })}
                                                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                                            >
                                                📄 Generate Report
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <p className="text-center text-gray-500">No students found. Adjust filters and try again.</p>
            )}
        </div>
    );
    
};

export default ReportsPage;
