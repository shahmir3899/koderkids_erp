import React, { useState, useEffect } from "react";
import axios from "axios";
import { getAuthHeaders,  getSchools, getClasses } from "../api";
import { useAuth } from "../auth";
import LessonPlanModal from "../components/LessonPlanModal";




function LessonsPage() {
    const { user } = useAuth();

    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedSchool, setSelectedSchool] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [selectedClass, setSelectedClass] = useState("");
    const [schools, setSchools] = useState([]);
    const [classes, setClasses] = useState([]);
    //const [allDates, setAllDates] = useState(false); // Controls "All Dates" checkbox

    //const schoolId = selectedSchool || user?.school_id || "";
    const API_URL = process.env.REACT_APP_API_URL;

    console.log("🔗 API_URL:", API_URL);
    

    // Function to calculate the start and end dates of the selected month
    // const getMonthDateRange = (month) => {
    //     const [year, monthNumber] = month.split("-");
    //     const startDate = new Date(year, monthNumber - 1, 1);
    //     const endDate = new Date(year, monthNumber, 0);
    //     return { startDate, endDate };
    // };

    // Function to fetch lessons for a specific date
    const fetchLessonsForRange = async (startDate, endDate, schoolId, studentClass) => {
        try {
            //const endpoint = `http://localhost:8000/api/lesson-plan-range/?start_date=${startDate}&end_date=${endDate}&school_id=${schoolId}&student_class=${studentClass}`;
            const endpoint = `${API_URL}/api/lesson-plan-range/?start_date=${startDate}&end_date=${endDate}&school_id=${schoolId}&student_class=${studentClass}`;

            console.log(`🔍 Fetching lessons from: ${endpoint}`);  // Debug log
            const response = await axios.get(endpoint, { headers: getAuthHeaders() });
            return response.data;
        } catch (err) {
            console.error("❌ Error fetching lessons:", err);
            return [];
        }
    };
    
    const fetchLessons = async () => {
        if (!startDate || !endDate || !selectedSchool || !selectedClass) {
            console.log("⚠️ Please select all required fields.");
            return;
        }
    
        setLoading(true);
        setError(null);
        setLessons([]);
    
        try {
            console.log("🚀 Fetching lessons...");
            const lessonsData = await fetchLessonsForRange(startDate, endDate, selectedSchool, selectedClass);
            setLessons(lessonsData);
        } catch (err) {
            console.error("❌ Error fetching lessons:", err);
            setError("Failed to fetch lessons.");
        } finally {
            setLoading(false);
        }
    };
    
    

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

    


    

    // Render loading state if user data is not available
    if (!user) {
        return <h2 className="text-center text-xl mt-8">Loading user data...</h2>;
    }

    // Restrict access to admins and teachers only
    if (!["admin", "teacher"].includes(user.role)) {
        return <h2 className="text-center text-xl mt-8">Access Denied: Only Admins and Teachers can manage lessons.</h2>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold text-center mb-6">Lesson Management</h1>
    
            {/* Input Row: Start Date, End Date, School, Class, Fetch Button */}
            <div className="flex flex-wrap items-end gap-4 mb-6">
                {/* Start Date */}
                <div className="flex flex-col">
                    <label className="font-bold mb-1">Start Date:</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded"
                    />
                </div>
    
                {/* End Date */}
                <div className="flex flex-col">
                    <label className="font-bold mb-1">End Date:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded"
                    />
                </div>
    
                {/* School Selector */}
                <div className="flex flex-col">
                    <label className="font-bold mb-1">Select School:</label>
                    <select
                        value={selectedSchool}
                        onChange={(e) => setSelectedSchool(e.target.value)}
                        className="p-2 border border-gray-300 rounded"
                    >
                        <option value="">-- Select School --</option>
                        {schools.map((school) => (
                            <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                    </select>
                </div>
    
                {/* Class Selector */}
                <div className="flex flex-col">
                    <label className="font-bold mb-1">Select Class:</label>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        disabled={!selectedSchool}
                        className="p-2 border border-gray-300 rounded"
                    >
                        <option value="">-- Select Class --</option>
                        {classes.map((className, index) => (
                            <option key={index} value={className}>{className}</option>
                        ))}
                    </select>
                </div>
    
                {/* Fetch Lessons Button */}
                <button
                    onClick={fetchLessons}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    🔍 Fetch Lessons
                </button>
            </div>
    
            {/* Loading & Error Messages */}
            {loading && <p className="text-center">Loading...</p>}
            {error && <p className="text-center text-red-500">{error}</p>}
    
            {/* Lessons Table */}
            {!loading && !error && lessons.length > 0 ? (
                <table className="w-full border-collapse border border-gray-300">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-3 border border-gray-300">Date</th>
                            <th className="p-3 border border-gray-300">School</th>
                            <th className="p-3 border border-gray-300">Class</th>
                            <th className="p-3 border border-gray-300">Planned Topic</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lessons.map((lesson) => (
                            <tr key={lesson.id} className="hover:bg-gray-50">
                                <td className="p-3 border border-gray-300">{lesson.session_date}</td>
                                <td className="p-3 border border-gray-300">{lesson.school_name}</td>
                                <td className="p-3 border border-gray-300">{lesson.student_class}</td>
                                <td className="p-3 border border-gray-300">{lesson.planned_topic}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="text-center text-gray-600">No lessons found.</p>
            )}
    
            {/* Add Lesson Plan Button */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="bg-green-500 text-white px-4 py-2 rounded mt-6 hover:bg-green-600"
            >
                ➕ Add Lesson Plan
            </button>
    
            {/* Lesson Plan Modal */}
            {isModalOpen && <LessonPlanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
    
}

export default LessonsPage;