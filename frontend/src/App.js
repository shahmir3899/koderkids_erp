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
import InventoryDashboard from './pages/InventoryDashboard';
import Sidebar from "./components/Sidebar";
import ProgressPage from "./pages/ProgressPage";
import CustomReport from "./pages/CustomReport";
import SalarySlip from "./pages/SalarySlip";
import LessonsPage from "./pages/LessonsPage";
import ReportsPage from "./pages/ReportsPage";
import StudentDashboard from './pages/StudentDashboard';
import StudentProgressPage from "./pages/StudentProgressPage";
//import StudentReport from "./pages/StudentReport";
import TeacherDashboard from "./pages/TeacherDashboard";
import FinanceDashboard from "./pages/FinanceDashboard";
import TransactionsPage from "./pages/TransactionsPage";
import { ToastContainer } from "react-toastify"; 
import "react-toastify/dist/ReactToastify.css"; 
import RobotChat from "./components/RobotChat";
import InventoryPage from './pages/InventoryPage';
import BookTreeSelect from './components/BookTreeSelect';
import CSVUpload from './components/CSVUpload';

import { logout } from "./api"; 

//export const REACT_APP_BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const REACT_APP_BACKEND_URL = 'http://127.0.0.1:8000/api/books/books/';


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
    const [role, setRole] = React.useState(localStorage.getItem("role") || null);
    React.useEffect(() => {
    const handleStorage = () => setRole(localStorage.getItem("role"));
    window.addEventListener("storage", handleStorage);
    handleStorage();
    return () => window.removeEventListener("storage", handleStorage);
  }, []);
    return (
        <Router>
            <AutoLogout /> 
            <div className="flex m-0">
                <Sidebar />
                <div className="ml-64 w-full p-2 bg-gray-100 min-h-screen">
                <Routes>
      {/* ✅ Public Routes */}
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* ✅ Admin & Teacher Routes */}
      <Route path="/students" element={<ProtectedRoute element={<StudentsPage />} allowedRoles={["Admin", "Teacher"]} />} />
      <Route path="/progress" element={<ProtectedRoute element={<ProgressPage />} allowedRoles={["Admin", "Teacher"]} />} />
      <Route path="/lessons" element={<LessonsPage />} />
      <Route path="/reports" element={<ProtectedRoute element={<ReportsPage />} allowedRoles={["Admin", "Teacher"]} />} />

      <Route path="/schools" element={<ProtectedRoute element={<SchoolsPage />} allowedRoles={["Admin", "Teacher"]} />} />
      <Route path="/teacherDashboard" element={<ProtectedRoute element={<TeacherDashboard />} allowedRoles={["Teacher"]} />} />
      <Route path="/robot-chat" element={<ProtectedRoute element={<RobotChat />} allowedRoles={["Admin", "Teacher"]} />} />
      <Route path="/inventory-dashboard" element={<ProtectedRoute element= {<InventoryDashboard/>}allowedRoles={["Admin", "Teacher"]} />} />
      <Route path="/inventory" element={<ProtectedRoute element={<InventoryPage />} allowedRoles={["Admin", "Teacher"]}/>}/>

      {/* ✅ Admin Only Routes */}
      <Route path="/admindashboard" element={<ProtectedRoute element={<AdminDashboard />} allowedRoles={["Admin"]} />} />
      <Route path="/fee" element={<ProtectedRoute element={<FeePage />} allowedRoles={["Admin"]} />} />
      <Route path="/settings" element={<ProtectedRoute element={<SettingsPage />} allowedRoles={["Admin"]} />} />
      <Route path="/finance" element={<ProtectedRoute element={<FinanceDashboard />} allowedRoles={["Admin"]} />} />
      <Route path="/finance/transactions" element={<ProtectedRoute element={<TransactionsPage />} allowedRoles={["Admin"]} />} />
      <Route path="/custom-report" element={<ProtectedRoute element={<CustomReport />}allowedRoles={["Admin"]}/>} />
      <Route path="/salary-slip" element={<ProtectedRoute element={<SalarySlip />} allowedRoles={["Admin"]} />} />

      {/* ✅ Teacher Specific Routes */}
      <Route path="/progress" element={<ProtectedRoute element={<ProgressPage />} allowedRoles={["Teacher"]} />} />
      <Route path="/reports" element={<ProtectedRoute element={<ReportsPage />} allowedRoles={["Teacher"]} />} />

      {/* ✅ Student Route */}
      <Route path="/student-dashboard" element={<ProtectedRoute element={<StudentDashboard />} allowedRoles={["Student"]} />} />
      <Route path="/student-progress" element={<StudentProgressPage />} />

        {/* NEW ROUTES: Add these two – protected */}
      <Route path="/books-tree" element={<ProtectedRoute element={<BookTreeSelect/>} allowedRoles={["Admin", "Teacher"]} />} />
      <Route path="/books-upload" element={<ProtectedRoute element={CSVUpload} allowedRoles={["Admin", "Teacher"]} />} />

      {/* ✅ Fallback */}
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
