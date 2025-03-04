import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard";
import StudentsPage from "./pages/StudentsPage";
import FeePage from "./pages/FeePage";
import SchoolsPage from "./pages/SchoolsPage";
//import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import ProgressPage from "./pages/ProgressPage";  // ✅ Add this line
import LessonsPage from "./pages/LessonsPage";  // Import LessonsPage
import ReportsPage from "./pages/ReportsPage";
//import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import StudentReport from "./components/StudentReport";
import TeacherDashboard from "./pages/TeacherDashboard"; // Import new dashboard

export const API_URL = process.env.REACT_APP_BACKEND_URL;



function App() {
    const role = localStorage.getItem("role"); // ✅ Get role from localStorage

    return (
        <Router>
            <div className="flex m-0">
                <Sidebar />
                <div className="ml-64 w-full p-2 bg-gray-100 min-h-screen">
                    <Routes>
                        

                        {/* Public Pages */}
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/login" element={<LoginPage />} />

                        {/* 🔒 Protected Routes Based on Role */}
                        {(role === "Admin" || role === "Teacher") && (
                            <>
                                <Route path="/students" element={<ProtectedRoute element={<StudentsPage />} />} />
                                <Route path="/progress" element={<ProtectedRoute element={<ProgressPage />} />} /> {/* ✅ Added Progress Page */}
                                <Route path="/lessons" element={<LessonsPage />} />  {/* ✅ Added Lessons Route */}
                                <Route path="/schools" element={<ProtectedRoute element={<SchoolsPage />} />} />
                                <Route path="/teacherDashboard" element={<ProtectedRoute element={<TeacherDashboard />} />} />
                                <Route path="/reports" element={<ReportsPage />} />
                                {/* Route for viewing student report */}
                                <Route path="/student-report/:studentId" element={<StudentReport />} />
                                <Route path="/student-report/:studentId" element={<StudentReport />} /> {/* Student Report Page */}


                            </>
                        )}

                        {role === "Admin" && (
                            <>
                                {/* 🔒 Protect Home Page */}
                                <Route path="/admindashboard" element={<ProtectedRoute element={<AdminDashboard />} />} />
                                <Route path="/fee" element={<ProtectedRoute element={<FeePage />} />} />
                                <Route path="/reports" element={<ProtectedRoute element={<ReportsPage />} />} />
                                <Route path="/settings" element={<ProtectedRoute element={<SettingsPage />} />} />
                            </>
                        )}

                        {role === "Teacher" && (
                            <>
                                
                                <Route path="/progress" element={<ProtectedRoute element={<ProgressPage />} />} /> {/* ✅ Ensure it's protected */}
                            </>
                        )}

                        {role === "Student" && (
                            <Route path="/profile" element={<ProtectedRoute element={<LoginPage />} />} />
                        )}

                        {/* Redirect all unknown routes */}
                        <Route path="*" element={<Navigate to="/login" />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;
