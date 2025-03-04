import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../auth";
import { useNavigate } from "react-router-dom";  // ✅ Import navigation

function TeacherStudentDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [schools, setSchools] = useState([]);
    const [classes, setClasses] = useState({});
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUserLoaded, setIsUserLoaded] = useState(false);  // ✅ Track if `user` is fully loaded
    const API_BASE_URL = "http://127.0.0.1:8000";  // ✅ Django Backend URL
    const [assignedClasses, setAssignedClasses] = useState([]);  // ✅ Track assigned classes

    console.log("🛠 Debug: User data:", user);

    // ✅ Function to fetch assigned schools and classes
    const fetchAssignedSchools = async () => {
        try {
            console.log("📡 Fetching assigned schools...");
            const response = await axios.get(`${API_BASE_URL}/api/schools/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
            });
            setSchools(response.data); // ✅ Store schools

            // ✅ Extract unique classes
            const uniqueClasses = new Set();
            response.data.forEach(school => {
                school.classes.forEach(cls => uniqueClasses.add(cls));
            });

            setAssignedClasses([...uniqueClasses]); // ✅ Convert Set to Array
            console.log("✅ Assigned Classes:", [...uniqueClasses]);
        } catch (error) {
            console.error("❌ Error fetching schools:", error.response?.data || error.message);
        }
    };

    // ✅ Function to fetch lessons
    const fetchDashboardLessons = async () => {
        try {
            console.log("📡 Fetching lessons for dashboard...");
            const response = await axios.get(`${API_BASE_URL}/api/teacher-dashboard-lessons/`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
            });
            setLessons(response.data.lessons);
            console.log("✅ Dashboard Lessons Fetched:", response.data.lessons);
        } catch (error) {
            console.error("❌ Error fetching lessons:", error.response?.data || error.message);
        } finally {
            setLoading(false);
        }
    };

    // ✅ useEffect to fetch data when user loads
    useEffect(() => {
        if (user === undefined) {
            console.warn("⏳ Waiting for user data...");
            return; // Wait until user is defined
        }

        fetchAssignedSchools();  // ✅ Fetch assigned schools and classes
        fetchDashboardLessons(); // ✅ Fetch lessons
    }, [user]);  // ✅ Only runs when user changes

    // ✅ Prevent unnecessary redirects while waiting for `user`
    if (user === undefined) {
        return <p>Loading user data...</p>;
    }

    if (loading) return <p>Loading dashboard...</p>;

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
                <p className="text-lg">{assignedClasses.length} Classes</p>  {/* ✅ Fix: assignedClasses now exists */}
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
