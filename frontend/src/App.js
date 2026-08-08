import React, { useState, useEffect, useRef, useCallback } from "react";
import { ConfirmationModal } from "./components/common/modals/ConfirmationModal";
import "./App.css";
import "./styles/responsive.css";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";
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
import AuthGate from "./components/AuthGate";
import InventoryDashboard from './pages/InventoryDashboard';
import Sidebar from "./components/sidebar";
import ProgressPage from "./pages/ProgressPage";
import BookSelectPage from "./components/BookSelectPage";
import CustomReport from "./pages/CustomReport";
import SalarySlip from "./pages/SalarySlip";
import LessonsPage from "./pages/LessonsPage";
import ReportsPage from "./pages/ReportsPage";
import StudentDashboard from './pages/StudentDashboard';
import OnlineStudentDashboard from './pages/OnlineStudentDashboard';
import StudentProgressPage from "./pages/StudentProgressPage";
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
import SettingsRouter from './pages/SettingsRouter';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import ERPLoader from './components/ERPLoader';
import { setNavigating } from './utils/axiosInterceptor';

// Self Service Pages
import SelfServicesPage from './pages/SelfServicesPage';
import RequestReportPage from './pages/RequestReportPage';

// CRM Pages
import BDMDashboard from './pages/crm/BDMDashboard';
import AdminCRMDashboard from './pages/crm/AdminDashboard';
import LeadsListPage from './pages/crm/LeadsListPage';
import ActivitiesPage from './pages/crm/ActivitiesPage';
import ProposalGenerator from './pages/crm/ProposalGenerator';

// Monitoring Pages
import MonitoringPage from './pages/monitoring/MonitoringPage';
import MonitoringTemplatesPage from './pages/monitoring/MonitoringTemplatesPage';
import VisitDetailPage from './pages/monitoring/VisitDetailPage';
import EvaluationHistoryPage from './pages/monitoring/EvaluationHistoryPage';

// Task Pages
import TaskManagementPage from './pages/TaskManagementPage';
import MyTasksPage from './pages/MyTasksPage';

// LMS Pages
import MyCoursesPage from './pages/lms/MyCoursesPage';
import CoursePlayerPage from './pages/lms/CoursePlayerPage';
import BookViewerPage from './pages/lms/BookViewerPage';
import LMSGuidelinesPage from './pages/lms/LMSGuidelinesPage';
import QuizBuilderPage from './pages/lms/QuizBuilderPage';
import QuizManagementPage from './pages/lms/QuizManagementPage';
import { LMSProvider } from './contexts/LMSContext';
import {
  LMS_ENABLED_STUDENT_SUBTYPES,
  PROGRESS_ENABLED_STUDENT_SUBTYPES,
  AI_GALA_ENABLED_STUDENT_SUBTYPES,
  ONLINE_DASHBOARD_STUDENT_SUBTYPES,
  STANDARD_DASHBOARD_STUDENT_SUBTYPES,
  ONLINE_CLASSES_ENABLED_STUDENT_SUBTYPES,
} from './constants/studentSubtypePolicy';

// Book Management
import BookManagementPage from './pages/BookManagementPage';

// AI Gala
import AiGalaPage from './pages/AiGalaPage';
import AiGalaManagePage from './pages/AiGalaManagePage';

// Online Classes
import OnlineClassesStudentPage from './pages/online-classes/OnlineClassesStudentPage';
import DeviceCheckPage from './pages/online-classes/DeviceCheckPage';
import ClassRoomPage from './pages/online-classes/ClassRoomPage';
import RecordingPlaybackPage from './pages/online-classes/RecordingPlaybackPage';
import TeacherOnlineClassesPage from './pages/online-classes/TeacherOnlineClassesPage';
import CreateClassPage from './pages/online-classes/CreateClassPage';
import ClassSettingsPage from './pages/online-classes/ClassSettingsPage';
import OnlineLessonPlansPage from './pages/online-classes/OnlineLessonPlansPage';

// Online Student Management
import OnlineStudentManager from './pages/admin/OnlineStudentManager';

import { logout } from "./api";
import { useResponsive } from './hooks/useResponsive';
import { SIDEBAR, Z_INDEX } from './utils/designConstants';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

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

const ACTIVE_LIVE_CLASS_SESSION_KEY = 'activeOnlineClassSessionId';
const LIVE_CLASS_META_STORAGE_KEY = 'onlineClassLiveMeta';
const LIVE_CLASS_META_EVENT = 'onlineClassLiveMetaUpdated';

const readLiveClassMeta = () => {
  try {
    const raw = localStorage.getItem(LIVE_CLASS_META_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};



const AUTO_LOGOUT_ACTIVITY_EVENTS = ["mousemove", "keypress", "click", "scroll"];

const AutoLogout = () => {
    const timeoutRef = useRef(null);
    // Guards against the warning re-firing: once expired, no further activity
    // should be able to reschedule the timer, and the click that dismisses
    // the modal itself is a "click" event that would otherwise reset it.
    const hasExpiredRef = useRef(false);
    const [showExpiredModal, setShowExpiredModal] = useState(false);

    const resetTimer = useCallback(() => {
        if (hasExpiredRef.current) return;
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            if (hasExpiredRef.current) return;
            hasExpiredRef.current = true;
            // Stop listening immediately so nothing already in flight can
            // reschedule the timer while the modal is up.
            AUTO_LOGOUT_ACTIVITY_EVENTS.forEach((event) =>
                window.removeEventListener(event, resetTimer)
            );
            setShowExpiredModal(true);
        }, 30 * 60 * 1000);
    }, []);

    useEffect(() => {
        AUTO_LOGOUT_ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer));

        resetTimer();

        return () => {
            clearTimeout(timeoutRef.current);
            AUTO_LOGOUT_ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
        };
    }, [resetTimer]);

    const handleAcknowledge = useCallback(() => {
        logout(); // clears storage + hard-redirects to /login
    }, []);

    return (
        <ConfirmationModal
            isOpen={showExpiredModal}
            title="Session Expired"
            message="You've been inactive for a while, so you were logged out to keep your account secure."
            variant="warning"
            confirmText="OK"
            hideCancel
            onConfirm={handleAcknowledge}
            onCancel={handleAcknowledge}
        />
    );
};

// Memoized: takes no props, so this bails out of the re-render AppWithLoader
// triggers on every API call (via LoadingContext's isLoading toggling) — without
// this, the entire routed tree re-rendered on every single network request.
const AppContent = React.memo(function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const isMobileOrTablet = isMobile || isTablet;

  // Desktop sidebar expand/collapse state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Mobile/Tablet overlay drawer visibility
  const [mobileSidebarVisible, setMobileSidebarVisible] = useState(false);
  const [liveStrip, setLiveStrip] = useState(() => {
    const meta = readLiveClassMeta();
    return {
      sessionId: sessionStorage.getItem(ACTIVE_LIVE_CLASS_SESSION_KEY) || meta?.sessionId || '',
      participantCount: Number(meta?.participantCount || 0),
      hasRaisedHand: Boolean(meta?.hasRaisedHand),
    };
  });

  const isPublicRoute = location.pathname === '/login' || location.pathname === '/register';

  useEffect(() => {
    const refreshLiveStrip = (event) => {
      const metaFromEvent = event?.detail;
      const meta = typeof metaFromEvent === 'object' && metaFromEvent !== null
        ? metaFromEvent
        : readLiveClassMeta();
      const sessionId = sessionStorage.getItem(ACTIVE_LIVE_CLASS_SESSION_KEY) || meta?.sessionId || '';

      setLiveStrip({
        sessionId,
        participantCount: Number(meta?.participantCount || 0),
        hasRaisedHand: Boolean(meta?.hasRaisedHand),
      });
    };

    refreshLiveStrip();
    window.addEventListener('focus', refreshLiveStrip);
    window.addEventListener('storage', refreshLiveStrip);
    window.addEventListener(LIVE_CLASS_META_EVENT, refreshLiveStrip);
    return () => {
      window.removeEventListener('focus', refreshLiveStrip);
      window.removeEventListener('storage', refreshLiveStrip);
      window.removeEventListener(LIVE_CLASS_META_EVENT, refreshLiveStrip);
    };
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarVisible(false);
  }, [location.pathname]);

  // On mobile/tablet: content gets full width (sidebar is overlay)
  // On desktop: content margin follows sidebar width
  const contentMarginLeft = isPublicRoute
    ? 0
    : isMobileOrTablet
    ? 0
    : (sidebarOpen ? SIDEBAR.expandedWidth : SIDEBAR.collapsedWidth);
  const showLiveStrip = !isPublicRoute && Boolean(liveStrip.sessionId);

  return (
    <div style={{
      minHeight: '100vh',
      overflow: 'hidden',
      position: 'relative',
      background: isPublicRoute ? 'white' : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #2362ab 100%)',
    }}>
      {!isPublicRoute && (
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          mobileSidebarVisible={mobileSidebarVisible}
          setMobileSidebarVisible={setMobileSidebarVisible}
        />
      )}

      {/* Floating hamburger button for mobile/tablet */}
      {!isPublicRoute && isMobileOrTablet && !mobileSidebarVisible && (
        <button
          onClick={() => setMobileSidebarVisible(true)}
          style={{
            position: 'fixed',
            top: '12px',
            left: '12px',
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: Z_INDEX.sidebar + 1,
            transition: 'all 0.2s ease',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label="Open navigation menu"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
      )}

      {showLiveStrip && (
        <button
          onClick={() => navigate(`/online-classes/room/${liveStrip.sessionId}`)}
          style={{
            position: 'fixed',
            top: isMobileOrTablet ? 12 : 14,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: Z_INDEX.sidebar + 2,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: isMobileOrTablet ? '8px 12px' : '10px 14px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(8, 13, 26, 0.64)',
            color: '#fff',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: '0 10px 26px rgba(0,0,0,0.22)',
            cursor: 'pointer',
            fontSize: isMobileOrTablet ? 12 : 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
          aria-label="Open live class"
          title="Open live class"
        >
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#ef4444',
            boxShadow: '0 0 0 5px rgba(239,68,68,0.2)',
            flexShrink: 0,
          }} />
          <span>Live</span>
          <span style={{ opacity: 0.9 }}>•</span>
          <span>{Math.max(1, liveStrip.participantCount || 1)} participants</span>
          {liveStrip.hasRaisedHand && (
            <>
              <span style={{ opacity: 0.9 }}>•</span>
              <span style={{ color: '#FBBF24', fontWeight: 700 }}>✋ Hand Raised</span>
            </>
          )}
        </button>
      )}

      <div
        style={{
          marginLeft: contentMarginLeft,
          transition: `margin-left 300ms ${SIDEBAR.transitionEasing}`,
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
      <Route path="/schools" element={<ProtectedRoute element={<SchoolsPage />} allowedRoles={["Admin", "Teacher", "BDM"]} />} />
      <Route path="/teacherDashboard" element={<ProtectedRoute element={<TeacherDashboardFigma />} allowedRoles={["Teacher"]} />} />
      

      <Route path="/robot-chat" element={<ProtectedRoute element={<RobotChat />} allowedRoles={["Admin", "Teacher", "Student"]} />} />
      <Route path="/inventory-dashboard" element={<ProtectedRoute element= {<InventoryDashboard/>}allowedRoles={["Admin", "Teacher", "BDM"]} />} />
      <Route path="/inventory" element={<ProtectedRoute element={<InventoryPage />} allowedRoles={["Admin", "Teacher", "BDM"]}/>}/>

      {/* ✅ Admin Only Routes */}
      <Route path="/admindashboard" element={<ProtectedRoute element={<AdminDashboard />} allowedRoles={["Admin"]} />} />
      <Route path="/book-management" element={<ProtectedRoute element={<BookManagementPage />} allowedRoles={["Admin"]} />} />
      <Route path="/online-students" element={<ProtectedRoute element={<OnlineStudentManager />} allowedRoles={["Admin"]} />} />
      <Route path="/fee" element={<ProtectedRoute element={<FeePage />} allowedRoles={["Admin", "Teacher"]} />} />
      <Route path="/settings" element={<ProtectedRoute element={<SettingsRouter />} allowedRoles={["Admin"]} />} />
      <Route path="/settings/notifications" element={<ProtectedRoute element={<NotificationSettingsPage />} allowedRoles={["Admin"]} />} />
      <Route path="/finance" element={<ProtectedRoute element={<FinanceDashboard />} allowedRoles={["Admin"]} />} />
      <Route path="/finance/transactions" element={<ProtectedRoute element={<TransactionsPage />} allowedRoles={["Admin"]} />} />
      <Route path="/custom-report" element={<ProtectedRoute element={<CustomReport />}allowedRoles={["Admin", "BDM"]}/>} />
      <Route path="/salary-slip" element={<ProtectedRoute element={<SalarySlip />} allowedRoles={["Admin", "Teacher", "BDM"]} />} />

      {/* ✅ CRM Routes - Admin & BDM */}
      <Route path="/crm/admin-dashboard" element={<ProtectedRoute element={<AdminCRMDashboard />} allowedRoles={["Admin"]} />} />
      <Route path="/crm/dashboard" element={<ProtectedRoute element={<BDMDashboard />} allowedRoles={["BDM"]} />} />
      <Route path="/crm/leads" element={<ProtectedRoute element={<LeadsListPage />} allowedRoles={["Admin", "BDM"]} />} />
      <Route path="/crm/activities" element={<ProtectedRoute element={<ActivitiesPage />} allowedRoles={["Admin", "BDM"]} />} />
      <Route path="/crm/proposals" element={<ProtectedRoute element={<ProposalGenerator />} allowedRoles={["Admin", "BDM"]} />} />

      {/* ✅ Monitoring Routes - Admin & BDM */}
      <Route path="/monitoring" element={<ProtectedRoute element={<MonitoringPage />} allowedRoles={["Admin", "BDM"]} />} />
      <Route path="/monitoring/templates" element={<ProtectedRoute element={<MonitoringTemplatesPage />} allowedRoles={["Admin"]} />} />
      <Route path="/monitoring/visits/:visitId" element={<ProtectedRoute element={<VisitDetailPage />} allowedRoles={["Admin", "BDM"]} />} />
      <Route path="/monitoring/evaluations" element={<ProtectedRoute element={<EvaluationHistoryPage />} allowedRoles={["Admin", "Teacher"]} />} />

      {/* ✅ Task Routes */}
      <Route path="/task-management" element={<ProtectedRoute element={<TaskManagementPage />} allowedRoles={["Admin"]} />} />
      <Route path="/my-tasks" element={<ProtectedRoute element={<MyTasksPage />} allowedRoles={["Admin", "Teacher", "BDM"]} />} />

      {/* ✅ Self Service Routes - Teacher & BDM */}
      <Route path="/self-services" element={<ProtectedRoute element={<SelfServicesPage />} allowedRoles={["Teacher", "BDM"]} />} />
      <Route path="/self-services/request-report" element={<ProtectedRoute element={<RequestReportPage />} allowedRoles={["Teacher", "BDM"]} />} />

      {/* ✅ Teacher Specific Routes */}
      <Route path="/progress" element={<ProtectedRoute element={<ProgressPage />} allowedRoles={["Teacher"]} />} />
      <Route path="/reports" element={<ProtectedRoute element={<ReportsPage />} allowedRoles={["Teacher"]} />} />

      {/* ✅ Student Routes */}
      <Route path="/student-dashboard" element={<ProtectedRoute element={<StudentDashboard />} allowedRoles={["Student"]} allowedStudentSubtypes={STANDARD_DASHBOARD_STUDENT_SUBTYPES} />} />
      <Route path="/online-student-dashboard" element={<ProtectedRoute element={<OnlineStudentDashboard />} allowedRoles={["Student"]} allowedStudentSubtypes={ONLINE_DASHBOARD_STUDENT_SUBTYPES} />} />
      <Route path="/student-progress" element={<ProtectedRoute element={<StudentProgressPage />} allowedRoles={["Student"]} allowedStudentSubtypes={PROGRESS_ENABLED_STUDENT_SUBTYPES} />} />

      {/* ✅ LMS Routes - Learning (Admin/Teacher can access for testing) */}
      <Route path="/lms/my-courses" element={<ProtectedRoute element={<MyCoursesPage />} allowedRoles={["Student", "Admin", "Teacher"]} allowedStudentSubtypes={LMS_ENABLED_STUDENT_SUBTYPES} />} />
      <Route path="/lms/guidelines" element={<ProtectedRoute element={<LMSGuidelinesPage />} allowedRoles={["Student", "Admin", "Teacher"]} allowedStudentSubtypes={LMS_ENABLED_STUDENT_SUBTYPES} />} />
      <Route path="/lms/learn/:courseId/:topicId?" element={<ProtectedRoute element={<CoursePlayerPage />} allowedRoles={["Student", "Admin", "Teacher"]} allowedStudentSubtypes={LMS_ENABLED_STUDENT_SUBTYPES} />} />
      <Route path="/lms/book/:courseId/:topicId?" element={<ProtectedRoute element={<BookViewerPage />} allowedRoles={["Student", "Admin", "Teacher"]} allowedStudentSubtypes={LMS_ENABLED_STUDENT_SUBTYPES} />} />

      {/* ✅ LMS Routes - Quiz Builder (Admin/Teacher) */}
      <Route path="/lms/quiz-manage" element={<ProtectedRoute element={<QuizManagementPage />} allowedRoles={["Admin", "Teacher"]} />} />
      <Route path="/lms/quiz-builder" element={<ProtectedRoute element={<QuizBuilderPage />} allowedRoles={["Admin", "Teacher"]} />} />
      <Route path="/lms/quiz-builder/:quizId" element={<ProtectedRoute element={<QuizBuilderPage />} allowedRoles={["Admin", "Teacher"]} />} />

      {/* ✅ AI Gala Routes */}
      <Route path="/ai-gala" element={<ProtectedRoute element={<AiGalaPage />} allowedRoles={["Student", "Admin", "Teacher"]} allowedStudentSubtypes={AI_GALA_ENABLED_STUDENT_SUBTYPES} />} />
      <Route path="/ai-gala/manage" element={<ProtectedRoute element={<AiGalaManagePage />} allowedRoles={["Admin", "Teacher"]} />} />

      {/* ✅ Online Classes Routes */}
      <Route path="/online-classes" element={<ProtectedRoute element={<OnlineClassesStudentPage />} allowedRoles={["Student"]} allowedStudentSubtypes={ONLINE_CLASSES_ENABLED_STUDENT_SUBTYPES} />} />
      <Route path="/online-classes/check/:sessionId" element={<ProtectedRoute element={<DeviceCheckPage />} allowedRoles={["Student", "Teacher", "Admin"]} />} />
      <Route path="/online-classes/room/:sessionId" element={<ProtectedRoute element={<ClassRoomPage />} allowedRoles={["Student", "Teacher", "Admin"]} />} />
      <Route path="/online-classes/recordings/:recordingId" element={<ProtectedRoute element={<RecordingPlaybackPage />} allowedRoles={["Student", "Teacher", "Admin"]} />} />
      <Route path="/online-classes/teacher" element={<ProtectedRoute element={<TeacherOnlineClassesPage />} allowedRoles={["Teacher", "Admin"]} />} />
      <Route path="/online-classes/teacher/create" element={<ProtectedRoute element={<CreateClassPage />} allowedRoles={["Teacher", "Admin"]} />} />
      <Route path="/online-classes/teacher/edit/:sessionId" element={<ProtectedRoute element={<CreateClassPage />} allowedRoles={["Teacher", "Admin"]} />} />
      <Route path="/online-classes/teacher/settings" element={<ProtectedRoute element={<ClassSettingsPage />} allowedRoles={["Teacher", "Admin"]} />} />
      <Route path="/online-classes/teacher/lesson-plans" element={<ProtectedRoute element={<OnlineLessonPlansPage />} allowedRoles={["Teacher", "Admin"]} />} />

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
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ zIndex: 99999 }}
      />
    </div>
  );
});

function AppWithLoader() {
  const { isLoading, loadingMessage } = useLoading();
  const location = useLocation();
  const isLoaderExcludedPage = location.pathname.startsWith('/ai-gala/manage');
  const shouldShowGlobalLoader = !isLoaderExcludedPage && isLoading;

  React.useEffect(() => {
    const path = location.pathname;

    // Skip public/auth pages and excluded pages — they don't need ERP loader
    const isExcluded = (
      path.startsWith('/ai-gala/manage') ||
      path === '/login' ||
      path === '/register' ||
      path.startsWith('/reset-password') ||
      path.startsWith('/password-reset')
    );
    if (isExcluded) return;

    // Arm the interceptor on route change.
    // Loader visibility is controlled by request lifecycle in the interceptor.
    setNavigating(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <>
      {shouldShowGlobalLoader && (
        <ERPLoader 
          isLoading={shouldShowGlobalLoader} 
          loadingMessage={loadingMessage}
        />
      )}
      <AppContent />
    </>
  );
}

function App() {
  return (
    <AuthGate>
      <QueryClientProvider client={queryClient}>
        <SchoolsProvider>
          <InventoryProvider>
            <FinanceProvider>
              <UserProvider>
                <BooksProvider>
                  <LMSProvider>
                    <ClassesProvider>
                      <LoadingProvider>
                        <Router>
                          <AutoLogout />
                          <AppWithLoader />
                        </Router>
                      </LoadingProvider>
                    </ClassesProvider>
                  </LMSProvider>
                </BooksProvider>
              </UserProvider>
            </FinanceProvider>
          </InventoryProvider>
        </SchoolsProvider>
      </QueryClientProvider>
    </AuthGate>
  );
}

export default App;