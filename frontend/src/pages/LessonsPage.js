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
            {/* Main Heading */}
            <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Lesson Management</h1>
    
            {/* Input Row: Start Date, End Date, School, Class, Fetch Button */}
            <div className="flex flex-wrap items-end gap-4 mb-8">
                {/* Start Date */}
                <div className="flex flex-col flex-1 min-w-[200px]">
                    <label className="font-bold mb-2 text-gray-700">Start Date:</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                </div>
    
                {/* End Date */}
                <div className="flex flex-col flex-1 min-w-[200px]">
                    <label className="font-bold mb-2 text-gray-700">End Date:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                </div>
    
                {/* School Selector */}
                <div className="flex flex-col flex-1 min-w-[200px]">
                    <label className="font-bold mb-2 text-gray-700">Select School:</label>
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
                    <label className="font-bold mb-2 text-gray-700">Select Class:</label>
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
    
                {/* Fetch Lessons Button */}
                <div className="flex flex-col flex-1 min-w-[200px]">
                    <button
                        onClick={fetchLessons}
                        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                        🔍 Fetch Lessons
                    </button>
                </div>
            </div>
    
            {/* Loading & Error Messages */}
            {loading && <p className="text-center text-gray-600">Loading...</p>}
            {error && <p className="text-center text-red-500 font-medium">{error}</p>}
    
            {/* Lessons Table */}
            {!loading && !error && lessons.length > 0 ? (
                <div className="overflow-x-auto shadow-lg rounded-lg">
                    <table className="w-full border-collapse">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">Date</th>
                                <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">School</th>
                                <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">Class</th>
                                <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">Planned Topic</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lessons.map((lesson) => (
                                <tr key={lesson.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-3 border border-gray-300 text-gray-600">{lesson.session_date}</td>
                                    <td className="p-3 border border-gray-300 text-gray-600">{lesson.school_name}</td>
                                    <td className="p-3 border border-gray-300 text-gray-600">{lesson.student_class}</td>
                                    <td className="p-3 border border-gray-300 text-gray-600">{lesson.planned_topic}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-center text-gray-600">No lessons found.</p>
            )}
    
            {/* Add Lesson Plan Button */}
            <div className="flex justify-center mt-8">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                    ➕ Add Lesson Plan
                </button>
            </div>
    
            {/* Lesson Plan Modal */}
            {isModalOpen && <LessonPlanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
    
}

export default LessonsPage;