import React, { useState, useEffect } from "react";
import axios from "axios";
import { getAuthHeaders, getSchools, getClasses } from "../api";
import { useAuth } from "../auth";
import LessonPlanModal from "../components/LessonPlanModal";
import { toast } from "react-toastify";

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
    const [editingLessonId, setEditingLessonId] = useState(null);
    const [editedTopic, setEditedTopic] = useState("");

    const API_URL = process.env.REACT_APP_API_URL;

    const fetchLessonsForRange = async (startDate, endDate, schoolId, studentClass) => {
        try {
            const endpoint = `${API_URL}/api/lesson-plan-range/?start_date=${startDate}&end_date=${endDate}&school_id=${schoolId}&student_class=${studentClass}`;
            console.log(`🔍 Fetching lessons from: ${endpoint}`);
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
            setEditingLessonId(null);
        } catch (err) {
            console.error("❌ Error fetching lessons:", err);
            setError("Failed to fetch lessons.");
        } finally {
            setLoading(false);
        }
    };

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

    const handleEdit = (lessonId, currentTopic) => {
        setEditingLessonId(lessonId);
        setEditedTopic(currentTopic);
    };

    const handleSave = async (lessonId) => {
        try {
            const endpoint = `${API_URL}/api/lesson-plans/${lessonId}/update-planned-topic/`;
            await axios.put(endpoint, { planned_topic: editedTopic }, { headers: getAuthHeaders() });
            setLessons(lessons.map((lesson) =>
                lesson.id === lessonId ? { ...lesson, planned_topic: editedTopic } : lesson
            ));
            setEditingLessonId(null);
            setEditedTopic("");
            toast.success("Lesson updated successfully");
        } catch (err) {
            console.error("❌ Error updating lesson:", err.response?.data || err.message);
            toast.error(`Failed to update lesson: ${err.response?.data?.detail || err.message}`);
        }
    };

    if (!user) {
        return <h2 className="text-center text-xl mt-8">Loading user data...</h2>;
    }

    if (!["admin", "teacher"].includes(user.role)) {
        return <h2 className="text-center text-xl mt-8">Access Denied: Only Admins and Teachers can manage lessons.</h2>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Lesson Management</h1>

            <div className="flex flex-wrap items-end gap-4 mb-8">
                <div className="flex flex-col flex-1 min-w-[200px]">
                    <label className="font-bold mb-2 text-gray-700">Start Date:</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                </div>

                <div className="flex flex-col flex-1 min-w-[200px]">
                    <label className="font-bold mb-2 text-gray-700">End Date:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                </div>

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

                <div className="flex flex-col flex-1 min-w-[200px]">
                    <button
                        onClick={fetchLessons}
                        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                        🔍 Fetch Lessons
                    </button>
                </div>
            </div>

            {loading && <p className="text-center text-gray-600">Loading...</p>}
            {error && <p className="text-center text-red-500 font-medium">{error}</p>}

            {!loading && !error && lessons.length > 0 ? (
                <div className="overflow-x-auto shadow-lg rounded-lg">
                    <table className="w-full border-collapse">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">Date</th>
                                <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">School</th>
                                <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">Class</th>
                                <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">Planned Topic</th>
                                <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lessons.map((lesson) => (
                                <tr key={lesson.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-3 border border-gray-300 text-gray-600">{lesson.session_date}</td>
                                    <td className="p-3 border border-gray-300 text-gray-600">{lesson.school_name}</td>
                                    <td className="p-3 border border-gray-300 text-gray-600">{lesson.student_class}</td>
                                    <td className="p-3 border border-gray-300 text-gray-600">
                                        {editingLessonId === lesson.id ? (
                                            <input
                                                type="text"
                                                value={editedTopic}
                                                onChange={(e) => setEditedTopic(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        handleSave(lesson.id);
                                                    }
                                                }}
                                                className="p-1 border border-gray-300 rounded w-full"
                                            />
                                        ) : (
                                            lesson.planned_topic
                                        )}
                                    </td>
                                    <td className="p-3 border border-gray-300 text-gray-600">
                                        {editingLessonId === lesson.id ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSave(lesson.id)}
                                                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingLessonId(null)}
                                                    className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleEdit(lesson.id, lesson.planned_topic)}
                                                className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-center text-gray-600">No lessons found.</p>
            )}

            <div className="flex justify-center mt-8">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                    ➕ Add Lesson Plan
                </button>
            </div>

            {isModalOpen && <LessonPlanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
}

export default LessonsPage;