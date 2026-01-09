import React, { useEffect, useRef } from "react";
import "./App.css";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard";
import StudentsPage from "./pages/StudentsPage";
import FeePage from "./pages/FeePage";
import SchoolsPage from "./pages/SchoolsPage";
import PasswordResetRequestPage from "./pages/PasswordResetRequestPage";
import PasswordResetConfirmPage from "./pages/PasswordResetConfirmPage";
//import SettingsPage from "./pages/SettingsPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import { SchoolsProvider } from './contexts/SchoolsContext';
import { UserProvider } from './contexts/UserContext';
import { BooksProvider } from './contexts/BooksContext';
import { ClassesProvider } from './contexts/ClassesContext';
import ProtectedRoute from "./components/ProtectedRoute";
import InventoryDashboard from './pages/InventoryDashboard';
import Sidebar from "./components/Sidebar";
import ProgressPage from "./pages/ProgressPage";
import BookSelectPage from "./components/BookSelectPage";
import CustomReport from "./pages/CustomReport";
import SalarySlip from "./pages/SalarySlip";
import LessonsPage from "./pages/LessonsPage";
import ReportsPage from "./pages/ReportsPage";
import StudentDashboard from './pages/StudentDashboard';
import StudentProgressPage from "./pages/StudentProgressPage";
import TestComponents from "./pages/TestComponents"
//import StudentReport from "./pages/StudentReport";
//import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherDashboardFigma from "./pages/TeacherDashboardFigma";
import FinanceDashboard from "./pages/FinanceDashboard";
import TransactionsPage from "./pages/TransactionsPage";
import { ToastContainer } from "react-toastify"; 
import "react-toastify/dist/ReactToastify.css"; 
import RobotChat from "./components/RobotChat";
import InventoryPage from './pages/InventoryPage';
import CSVUpload from './components/CSVUpload';
import SettingsPage from './pages/SettingsPage';

// CRM Pages
import BDMDashboard from './pages/crm/BDMDashboard';
import AdminCRMDashboard from './pages/crm/AdminDashboard';
import LeadsListPage from './pages/crm/LeadsListPage';
import ActivitiesPage from './pages/crm/ActivitiesPage';

// Task Management Pages
import TaskManagementPage from './pages/TaskManagementPage';
import MyTasksPage from './pages/MyTasksPage';


import { logout } from "./api"; 

export const REACT_APP_BACKEND_URL = process.env.REACT_APP_API_URL;



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
    const [sidebarOpen, setSidebarOpen] = React.useState(true);
    
    React.useEffect(() => {
    const handleStorage = () => {
        const role = localStorage.getItem("role");
        // Handle role changes if needed
    };
    window.addEventListener("storage", handleStorage);
    handleStorage();
    return () => window.removeEventListener("storage", handleStorage);
  }, []);
    return (
    <SchoolsProvider>
      <UserProvider>
        <BooksProvider>
          <ClassesProvider>
            <Router>
            <AutoLogout /> 
            <div className="flex" style={{ gap: 0, position: 'relative', minHeight: '100vh' }}>
    <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
    <div className="flex-1 bg-gray-100 min-h-screen" style={{ 
      padding: '1rem', 
      margin: 0, 
      marginLeft: sidebarOpen ? '14rem' : '4rem',
      transition: 'margin-left 0.3s ease-in-out',
      position: 'relative',
      zIndex: 1
    }}>
                <Routes>
      {/* ✅ Public Routes */}
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* ✅ Admin & Teacher Routes */}
      <Route path="/students" element={<ProtectedRoute element={<StudentsPage />} allowedRoles={["Admin", "Teacher"]} />} />
      <Route path="/progress" element={<ProtectedRoute element={<ProgressPage />} allowedRoles={["Admin", "Teacher"]} />} />
      <Route path="/lessons" element={<LessonsPage />} />
      <Route path="/reports" element={<ProtectedRoute element={<ReportsPage />} allowedRoles={["Admin", "Teacher"]} />} />
        <Route 
  path="/test-components" 
  element={
    <ProtectedRoute 
      element={<TestComponents />} 
      allowedRoles={["Admin", "Teacher"]} 
    />
  } 
/>
      <Route path="/schools" element={<ProtectedRoute element={<SchoolsPage />} allowedRoles={["Admin", "Teacher"]} />} />
      <Route path="/teacherDashboard" element={<ProtectedRoute element={<TeacherDashboardFigma />} allowedRoles={["Teacher"]} />} />
      

      <Route path="/robot-chat" element={<ProtectedRoute element={<RobotChat />} allowedRoles={["Admin", "Teacher"]} />} />
      <Route path="/inventory-dashboard" element={<ProtectedRoute element= {<InventoryDashboard/>}allowedRoles={["Admin", "Teacher"]} />} />
      <Route path="/inventory" element={<ProtectedRoute element={<InventoryPage />} allowedRoles={["Admin", "Teacher"]}/>}/>

      {/* ✅ Admin Only Routes */}
      <Route path="/admindashboard" element={<ProtectedRoute element={<AdminDashboard />} allowedRoles={["Admin"]} />} />
      <Route path="/fee" element={<ProtectedRoute element={<FeePage />} allowedRoles={["Admin", "Teacher"]} />} />
      <Route path="/settings" element={<ProtectedRoute element={<SettingsPage />} allowedRoles={["Admin"]} />} />
      <Route path="/finance" element={<ProtectedRoute element={<FinanceDashboard />} allowedRoles={["Admin"]} />} />
      <Route path="/finance/transactions" element={<ProtectedRoute element={<TransactionsPage />} allowedRoles={["Admin"]} />} />
      <Route path="/custom-report" element={<ProtectedRoute element={<CustomReport />}allowedRoles={["Admin"]}/>} />
      <Route path="/salary-slip" element={<ProtectedRoute element={<SalarySlip />} allowedRoles={["Admin"]} />} />
      <Route path="/settings" element={<SettingsPage />} />

      {/* ✅ CRM Routes - Admin & BDM */}
      <Route path="/crm/admin-dashboard" element={<ProtectedRoute element={<AdminCRMDashboard />} allowedRoles={["Admin"]} />} />
      <Route path="/crm/dashboard" element={<ProtectedRoute element={<BDMDashboard />} allowedRoles={["BDM"]} />} />
      <Route path="/crm/leads" element={<ProtectedRoute element={<LeadsListPage />} allowedRoles={["Admin", "BDM"]} />} />
      <Route path="/crm/activities" element={<ProtectedRoute element={<ActivitiesPage />} allowedRoles={["Admin", "BDM"]} />} />

      {/* ✅ Task Management Routes */}
      <Route path="/task-management" element={<ProtectedRoute element={<TaskManagementPage />} allowedRoles={["Admin"]} />} />
      <Route path="/my-tasks" element={<ProtectedRoute element={<MyTasksPage />} allowedRoles={["Admin", "Teacher", "BDM"]} />} />

      {/* ✅ Teacher Specific Routes */}
      <Route path="/progress" element={<ProtectedRoute element={<ProgressPage />} allowedRoles={["Teacher"]} />} />
      <Route path="/reports" element={<ProtectedRoute element={<ReportsPage />} allowedRoles={["Teacher"]} />} />

      {/* ✅ Student Route */}
      <Route path="/student-dashboard" element={<ProtectedRoute element={<StudentDashboard />} allowedRoles={["Student"]} />} />
      <Route path="/student-progress" element={<StudentProgressPage />} />

        {/* NEW ROUTES: Add these two – protected */}
      <Route path="/books-tree" element={<ProtectedRoute element={<BookSelectPage/>} allowedRoles={["Admin", "Teacher"]} />} />
      <Route path="/books-upload" element={<ProtectedRoute element={CSVUpload} allowedRoles={["Admin", "Teacher"]} />} />
        {/* Password Reset Routes - NEW */}
        <Route path="/forgot-password" element={<PasswordResetRequestPage />} />
        <Route path="/reset-password/:uid/:token" element={<PasswordResetConfirmPage />} />

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
          </ClassesProvider>
        </BooksProvider>
      </UserProvider>
            </SchoolsProvider>

    );
}

export default App;
