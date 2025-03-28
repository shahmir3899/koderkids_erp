import React, { useEffect, useRef } from "react";
import "./App.css";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard";
import StudentsPage from "./pages/StudentsPage";
import FeePage from "./pages/FeePage";
import SchoolsPage from "./pages/SchoolsPage";
import SettingsPage from "./pages/SettingsPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import ProgressPage from "./pages/ProgressPage";
import LessonsPage from "./pages/LessonsPage";
import ReportsPage from "./pages/ReportsPage";
import StudentReport from "./components/StudentReportModal";
import TeacherDashboard from "./pages/TeacherDashboard";
import FinanceDashboard from "./pages/FinanceDashboard";
import TransactionsPage from "./pages/TransactionsPage";
import { ToastContainer } from "react-toastify"; 
import "react-toastify/dist/ReactToastify.css"; 
import RobotChat from "./components/RobotChat";

import { logout } from "./api"; 

export const REACT_APP_BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AutoLogout = () => {
    const timeoutRef = useRef(null);

    const resetTimer = () => {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            alert("Session expired! Logging out.");
            logout();
        }, 30 * 60 * 1000); 
    };

    useEffect(() => {
        const events = ["mousemove", "keypress", "click", "scroll"];
        events.forEach((event) => window.addEventListener(event, resetTimer));
        
        resetTimer(); 

        return () => {
            clearTimeout(timeoutRef.current);
            events.forEach((event) => window.removeEventListener(event, resetTimer));
        };
    }, []);

    return null;
};

function App() {
    const role = localStorage.getItem("role"); 

    return (
        <Router>
            <AutoLogout /> 
            <div className="flex m-0">
                <Sidebar />
                <div className="ml-64 w-full p-2 bg-gray-100 min-h-screen">
                    <Routes>
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/login" element={<LoginPage />} />

                        {(role === "Admin" || role === "Teacher") && (
                            <>
                                <Route path="/students" element={<ProtectedRoute element={<StudentsPage />} />} />
                                <Route path="/progress" element={<ProtectedRoute element={<ProgressPage />} />} />
                                <Route path="/lessons" element={<LessonsPage />} />
                                <Route path="/schools" element={<ProtectedRoute element={<SchoolsPage />} />} />
                                <Route path="/teacherDashboard" element={<ProtectedRoute element={<TeacherDashboard />} />} />
                                <Route path="/reports" element={<ReportsPage />} />
                                <Route path="/student-report/:studentId" element={<StudentReport />} />
                                 {/* Define route for Robot Chat */}
                                <Route path="/robot-chat" element={<ProtectedRoute element={<RobotChat />} />} />
                            </>
                        )}

                        {role === "Admin" && (
                            <>
                                <Route path="/admindashboard" element={<ProtectedRoute element={<AdminDashboard />} />} />
                                <Route path="/fee" element={<ProtectedRoute element={<FeePage />} />} />
                                <Route path="/reports" element={<ProtectedRoute element={<ReportsPage />} />} />
                                <Route path="/settings" element={<ProtectedRoute element={<SettingsPage />} />} />
                                <Route path="/finance" element={<ProtectedRoute element={<FinanceDashboard />} />} />
                                <Route path="/finance/transactions" element={<ProtectedRoute element={<TransactionsPage />} />} />
                            </>
                        )}

                        {role === "Teacher" && (
                            <>
                                <Route path="/progress" element={<ProtectedRoute element={<ProgressPage />} />} />
                            </>
                        )}

                        {role === "Student" && (
                            <Route path="/profile" element={<ProtectedRoute element={<LoginPage />} />} />
                        )}

                        <Route path="*" element={<Navigate to="/login" />} />
                    </Routes>
                </div>
                <ToastContainer
                    position="top-right"
                    autoClose={3000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                />
            </div>
        </Router>
    );
}

export default App;
