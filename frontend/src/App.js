import React, { useEffect, useRef } from "react";
import "./App.css";
import "./styles/responsive.css";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { LoadingProvider, useLoading } from './contexts/LoadingContext';
import { InventoryProvider } from './contexts/InventoryContext';
import { FinanceProvider } from './contexts/FinanceContext';
import ProtectedRoute from "./components/ProtectedRoute";
import InventoryDashboard from './pages/InventoryDashboard';
import Sidebar from "./components/sidebar";
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
import ERPLoader from './components/ERPLoader';

// CRM Pages
import BDMDashboard from './pages/crm/BDMDashboard';
import AdminCRMDashboard from './pages/crm/AdminDashboard';
import LeadsListPage from './pages/crm/LeadsListPage';
import ActivitiesPage from './pages/crm/ActivitiesPage';

// Task Pages
import TaskManagementPage from './pages/TaskManagementPage';
import MyTasksPage from './pages/MyTasksPage';

import { logout } from "./api"; 

export const REACT_APP_BACKEND_URL = process.env.REACT_APP_API_URL;

// React Query Client Configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      cacheTime: 10 * 60 * 1000, // 10 minutes - cache retained
      refetchOnWindowFocus: false, // Don't refetch when tab gains focus
      retry: 1, // Only retry failed requests once
      refetchOnMount: false, // Don't refetch on component mount if data is fresh
    },
  },
});



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

function AppContent() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const isPublicRoute = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div style={{
      minHeight: '100vh',
      overflow: 'hidden', // Prevent horizontal scroll
      position: 'relative',
      background: isPublicRoute ? 'white' : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #2362ab 100%)',
    }}>
      {!isPublicRoute && <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}

      <div
        style={{
          marginLeft: isPublicRoute ? 0 : (sidebarOpen ? '280px' : '80px'),
          transition: 'margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: '100vh',
          backgroundColor: isPublicRoute ? 'white' : 'transparent',
          overflowX: 'hidden',
          overflowY: 'auto',
          position: 'relative',
          zIndex: 1
        }}
      >
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

      {/* ✅ Task Routes */}
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
    </div>
  );
}

function AppWithLoader() {
  const { isLoading, loadingMessage } = useLoading();
  const [showInitialLoader, setShowInitialLoader] = React.useState(true);

  React.useEffect(() => {
    // Show initial loader for 2 seconds
    const timer = setTimeout(() => {
      setShowInitialLoader(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {(showInitialLoader || isLoading) && (
        <ERPLoader 
          isLoading={showInitialLoader || isLoading} 
          loadingMessage={loadingMessage}
        />
      )}
      {!showInitialLoader && <AppContent />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SchoolsProvider>
        <InventoryProvider>
          <FinanceProvider>
            <UserProvider>
              <BooksProvider>
                <ClassesProvider>
                  <LoadingProvider>
                    <Router>
                      <AutoLogout />
                      <AppWithLoader />
                    </Router>
                  </LoadingProvider>
                </ClassesProvider>
              </BooksProvider>
            </UserProvider>
          </FinanceProvider>
        </InventoryProvider>
      </SchoolsProvider>
    </QueryClientProvider>
  );
}

export default App;