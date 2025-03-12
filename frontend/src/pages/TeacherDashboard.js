import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../auth";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners"; // Import ClipLoader
import { toast } from "react-toastify"; // Import toast for notifications

function TeacherStudentDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [schools, setSchools] = useState([]);
    const [classes, setClasses] = useState({});
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUserLoaded, setIsUserLoaded] = useState(false);
    const [error, setError] = useState(null); // Add error state
    const [isRetrying, setIsRetrying] = useState(false); // Add retry state
    const [assignedClasses, setAssignedClasses] = useState([]);
    const API_BASE_URL = process.env.REACT_APP_API_URL;

    // Function to fetch assigned schools and classes
    const fetchAssignedSchools = async () => {
        try {
            console.log("📡 Fetching assigned schools...");
            const response = await axios.get(`${API_BASE_URL}/api/schools/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
            });
            if (!Array.isArray(response.data)) {
                throw new Error("Invalid schools data format.");
            }
            setSchools(response.data);

            // Extract unique classes
            const uniqueClasses = new Set();
            response.data.forEach(school => {
                school.classes.forEach(cls => uniqueClasses.add(cls));
            });

            setAssignedClasses([...uniqueClasses]);
            console.log("✅ Assigned Classes:", [...uniqueClasses]);
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || "Failed to fetch schools.";
            setError(errorMessage);
            toast.error(errorMessage);
        }
    };

    // Function to fetch lessons
    const fetchDashboardLessons = async () => {
        try {
            console.log("📡 Fetching lessons for dashboard...");
            const response = await axios.get(`${API_BASE_URL}/api/teacher-dashboard-lessons/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
            });
            if (!Array.isArray(response.data.lessons)) {
                throw new Error("Invalid lessons data format.");
            }
            setLessons(response.data.lessons);
            console.log("✅ Dashboard Lessons Fetched:", response.data.lessons);
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || "Failed to fetch lessons.";
            setError(errorMessage);
            toast.error(errorMessage);
        }
    };

    // Combined fetch function to handle both API calls
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([fetchAssignedSchools(), fetchDashboardLessons()]);
        } catch (err) {
            const errorMessage = err.message || "Failed to load dashboard data.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // useEffect to fetch data when user loads
    useEffect(() => {
        if (user === undefined) {
            console.warn("⏳ Waiting for user data...");
            return;
        }
        setIsUserLoaded(true);
        fetchData();
    }, [user]);

    // Handle retry
    const handleRetry = async () => {
        setIsRetrying(true);
        setError(null);
        await fetchData();
        setIsRetrying(false);
    };

    // Show loading state while user data is being fetched
    if (user === undefined || !isUserLoaded) {
        return (
            <div className="flex items-center justify-center p-6 min-h-screen bg-gray-100">
                <ClipLoader color="#000000" size={50} />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-6 min-h-screen bg-gray-100">
                <ClipLoader color="#000000" size={50} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-red-500 flex flex-col items-center">
                <p>{error}</p>
                <button
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    onClick={handleRetry}
                    disabled={isRetrying}
                    aria-label="Retry fetching dashboard data"
                >
                    {isRetrying ? "Retrying..." : "Retry"}
                </button>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold">Welcome, {user.username}!</h1>
            <h2 className="text-lg">Teacher Dashboard</h2>

            <section className="mt-4">
                <h3 className="text-xl font-semibold">Assigned Schools 🏫</h3>
                <ul className="list-disc ml-5">
                    {schools.map((school) => (
                        <li key={school.id}>{school.name}</li>
                    ))}
                </ul>
            </section>

            <section className="mt-4">
                <h3 className="text-xl font-semibold">Total Assigned Classes 🎓</h3>
                <p className="text-lg">{assignedClasses.length} Classes</p>
            </section>

            <section className="mt-4">
                <h3 className="text-xl font-semibold">Today's Lessons 📚</h3>
                {lessons.length > 0 ? (
                    <table className="w-full border-collapse border border-gray-300 mt-2">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border border-gray-300 px-4 py-2">Date</th>
                                <th className="border border-gray-300 px-4 py-2">Class</th>
                                <th className="border border-gray-300 px-4 py-2">School</th>
                                <th className="border border-gray-300 px-4 py-2">Topic</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lessons.length > 0 ? (
                                lessons.map((lesson, index) => (
                                    <tr key={index} className="border">
                                        <td className="border px-4 py-2">{lesson.date}</td>
                                        <td className="border px-4 py-2">{lesson.class_name}</td>
                                        <td className="border px-4 py-2">{lesson.school_name}</td>
                                        <td className="border px-4 py-2">{lesson.topic}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center p-4 border">No lessons available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center p-4 border border-gray-300 mt-2">
                        <p className="text-gray-500">No lessons scheduled for today.</p>
                    </div>
                )}
            </section>
        </div>
    );
}

export default TeacherStudentDashboard;