// ============================================
// TEACHER DASHBOARD - Figma Redesign
// ============================================
// Location: src/pages/TeacherDashboardFigma.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';

// Components
import { UnifiedProfileHeader } from '../components/common/UnifiedProfileHeader';
import { LessonGrid } from '../components/teacher/LessonGrid';
import { CircularProgress } from '../components/teacher/CircularProgress';
import { CollapsibleSection } from '../components/common/cards/CollapsibleSection';
import { MonthFilter } from '../components/common/filters/MonthFilter';
import { FilterBar } from '../components/common/filters/FilterBar';
import { DataTable } from '../components/common/tables/DataTable';
import { BarChartWrapper } from '../components/common/charts/BarChartWrapper';
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { LessonSummaryDashboard } from '../components/teacher/LessonSummaryDashboard';
import { TeacherInventoryWidget } from '../components/teacher/TeacherInventoryWidget';
import TeacherAttendanceWidget from '../components/dashboard/TeacherAttendanceWidget';
import AttendanceConfirmationModal from '../components/AttendanceConfirmationModal';
import { StaffCommandInput, CommandHistory, QuickActionsPanel } from '../components/staff';

// Hooks
import { useSchools } from '../hooks/useSchools';
import { useResponsive } from '../hooks/useResponsive';

// Services
import { getTeacherProfile } from '../services/teacherService';
import { teacherDashboardService } from '../services/teacherDashboardService';

// Constants
import { COLORS, SPACING, LAYOUT, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS, TRANSITIONS } from '../utils/designConstants';

// Hover wrapper component for cards - uses TRANSITIONS from design system
const HoverCard = ({ children, style = {} }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        ...style,
        transition: `all ${TRANSITIONS.normal}`,
        transform: isHovered ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
        boxShadow: isHovered ? '0 12px 40px rgba(0, 0, 0, 0.25)' : '0 4px 24px rgba(0, 0, 0, 0.12)',
        background: isHovered ? 'rgba(255, 255, 255, 0.18)' : style.background || 'rgba(255, 255, 255, 0.12)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  );
};

const TeacherDashboardFigma = () => {
  // ============================================
  // RESPONSIVE HOOK
  // ============================================
  const { isMobile } = useResponsive();

  // Get responsive styles
  const styles = getStyles(isMobile);

  // ============================================
  // STATE
  // ============================================

  // Profile State
  const [profile, setProfile] = useState(null);
  
  // Lessons State
  const [lessons, setLessons] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
  const [monthlyLessonData, setMonthlyLessonData] = useState([]);
  
  // Completion Data
  const [completionData, setCompletionData] = useState([]);
  
  // Student Data State
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [studentTopics, setStudentTopics] = useState([]);
  const [studentImages, setStudentImages] = useState([]);
  
  // Loading States
  const [loading, setLoading] = useState({
    profile: true,
    lessons: true,
    monthlyData: false,
    schoolData: false,
    studentData: false,
    completion: false,
  });

  // Attendance Modal State
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceModalData, setAttendanceModalData] = useState(null);

  // Hooks - useSchools available for future school-related features
  useSchools();

  // Check for attendance data on mount and show modal
  useEffect(() => {
    const lastAttendance = localStorage.getItem('lastAttendance');
    if (lastAttendance) {
      try {
        const attendanceData = JSON.parse(lastAttendance);
        if (attendanceData && attendanceData.records && attendanceData.records.length > 0) {
          setAttendanceModalData(attendanceData);
          setShowAttendanceModal(true);
          // Clear the stored attendance after showing
          localStorage.removeItem('lastAttendance');
        }
      } catch (e) {
        console.error('Error parsing attendance data:', e);
        localStorage.removeItem('lastAttendance');
      }
    }
  }, []);

  // Ref for command input
  const commandInputRef = useRef(null);

  // ============================================
  // DATA FETCHING
  // ============================================
  // Inside TeacherDashboardFigma component
const teacherSchools = profile?.assigned_schools || [];


const teacherName = profile?.full_name || '';
  // Fetch teacher profile on mount
  // Fetch teacher profile on mount
useEffect(() => {
  let isMounted = true; // ADD THIS
  
  const fetchProfile = async () => {
    if (!isMounted) return; // ADD THIS
    
    setLoading(prev => ({ ...prev, profile: true }));
    try {
      const profileData = await getTeacherProfile();
      if (isMounted) { // ADD THIS
        console.log('✅ Profile loaded:', profileData);
        setProfile(profileData);
      }
    } catch (error) {
      if (isMounted) { // ADD THIS
        console.error('❌ Failed to fetch profile:', error);
        toast.error('Failed to load profile data');
      }
    }
    if (isMounted) { // ADD THIS
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  fetchProfile();
  
  return () => { isMounted = false; }; // ADD THIS CLEANUP
}, []);

  // Fetch lessons (CACHED via teacherDashboardService)
useEffect(() => {
  let isMounted = true;

  const fetchLessons = async () => {
    if (!isMounted) return;

    setLoading(prev => ({ ...prev, lessons: true }));
    try {
      const data = await teacherDashboardService.getUpcomingLessons();
      if (isMounted) {
        setLessons(data.lessons || []);
      }
    } catch (error) {
      if (isMounted) {
        console.error('❌ Failed to fetch lessons:', error);
        toast.error('Failed to fetch lessons');
      }
    }
    if (isMounted) {
      setLoading(prev => ({ ...prev, lessons: false }));
    }
  };

  fetchLessons();

  return () => { isMounted = false; };
}, []);

  // Fetch monthly data when month changes (CACHED via teacherDashboardService)
useEffect(() => {
  let isMounted = true;

  const fetchMonthlyData = async () => {
    if (!isMounted) return;

    setLoading(prev => ({ ...prev, monthlyData: true, schoolData: true, completion: true }));

    try {
      const [lessonStatusData, schoolLessonsData] = await Promise.all([
        teacherDashboardService.getLessonStatus(selectedMonth),
        teacherDashboardService.getLessonsBySchool(selectedMonth),
      ]);

      if (isMounted) {
        setMonthlyLessonData(lessonStatusData);

        console.log('📊 Lesson Status Data:', lessonStatusData);
        console.log('🏫 School Lessons Data:', schoolLessonsData);

        // Calculate completion data for charts
        const completionBySchool = schoolLessonsData.reduce((acc, school) => {
          const schoolData = lessonStatusData.filter(
            lesson => lesson.school_name === school.school_name
          );

          console.log(`🎯 School: ${school.school_name}, Matching lessons:`, schoolData);

          if (schoolData.length > 0) {
            const avgCompletion = schoolData.reduce(
              (sum, lesson) => sum + (lesson.completion_rate || 0),
              0
            ) / schoolData.length;

            console.log(`✅ ${school.school_name} completion: ${avgCompletion}%`);

            acc.push({
              school_name: school.school_name,
              completion_rate: avgCompletion,
            });
          }

          return acc;
        }, []);

        console.log('📈 Final Completion Data:', completionBySchool);
        setCompletionData(completionBySchool);
      }
    } catch (error) {
      if (isMounted) {
        console.error('❌ Failed to fetch monthly data:', error);
        toast.error('Failed to fetch monthly data');
      }
    }

    if (isMounted) {
      setLoading(prev => ({ ...prev, monthlyData: false, schoolData: false, completion: false }));
    }
  };

  fetchMonthlyData();

  return () => { isMounted = false; };
}, [selectedMonth]);

  // Fetch student data (CACHED via teacherDashboardService)
  const fetchStudentData = async (filters) => {
    if (!filters.schoolId || !filters.className) {
      toast.error('Please select school and class');
      return;
    }

    setLoading(prev => ({ ...prev, studentData: true }));

    try {
      const month = filters.month || selectedMonth;
      const data = await teacherDashboardService.getStudentData(month, filters.schoolId, filters.className);

      setStudentAttendance(data.attendance);
      setStudentTopics(data.topics);
      setStudentImages(data.images);
    } catch (error) {
      console.error('❌ Failed to fetch student data:', error);
      toast.error('Failed to fetch student data');
    }

    setLoading(prev => ({ ...prev, studentData: false }));
  };

  // Handle profile update from settings modal
  const handleProfileUpdate = useCallback((updatedProfile) => {
    console.log('🔄 Profile updated:', updatedProfile);
    setProfile(updatedProfile);
  }, []);

  // ============================================
  // DATA PROCESSING
  // ============================================

  // Prepare chart data for student performance
  const studentChartData = studentAttendance.map((student) => {
    const topic = studentTopics.find(t => t.student_id === student.student_id) || { topics_achieved: 0 };
    const image = studentImages.find(i => i.student_id === student.student_id) || { images_uploaded: 0 };
    
    return {
      name: student.name,
      present: student.present,
      topics: topic.topics_achieved,
      images: image.images_uploaded,
    };
  });

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={styles.pageContainer}>
      {/* Main Content - Sidebar is handled by App.js layout */}
      <div style={styles.mainContent}>
        {/* Profile Header */}
        <UnifiedProfileHeader
  role="Teacher"
  profile={profile}
  loading={loading.profile}
  onProfileUpdate={handleProfileUpdate}
  //onNotificationClick={handleNotificationClick}  // Optional: if you use notifications
/>

        {/* Staff Command Center */}
        <CollapsibleSection title="🤖 Command Center" defaultOpen={false}>
          {/* Chat + History Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: SPACING.lg,
            marginBottom: SPACING.lg
          }}>
            <StaffCommandInput
              ref={commandInputRef}
              placeholder="Type a command... (e.g., 'Show my inventory')"
              showQuickActions={false}
              height={isMobile ? '300px' : '350px'}
              onCommandSuccess={() => {
                // Optionally refresh data after command execution
              }}
            />
            <CommandHistory
              limit={8}
              showFilters={!isMobile}
              compact={isMobile}
              style={{ height: isMobile ? '300px' : '350px' }}
            />
          </div>
          {/* Quick Actions Row */}
          <QuickActionsPanel
            onActionSelect={(action) => {
              if (commandInputRef.current) {
                if (action.required_params && action.required_params.length > 0) {
                  commandInputRef.current.setCommand(action.command_template);
                } else {
                  commandInputRef.current.executeCommand(action.command_template);
                }
              }
            }}
          />
        </CollapsibleSection>

        {/* Course Completion Charts */}
        {!loading.completion && completionData.length > 0 && (
          <HoverCard style={styles.completionSection}>
            {completionData.slice(0, 2).map((school, idx) => (
              <CircularProgress
                key={idx}
                percentage={school.completion_rate}
                schoolName={school.school_name}
                size={173}
                strokeWidth={20}
              />
            ))}
          </HoverCard>
        )}

        {/* Lesson Schedule Header */}
        <div style={styles.lessonScheduleHeader}>
          <h2 style={styles.sectionTitle}>
            Lesson Schedule (Next 7 Days)
          </h2>
         
        </div>

        {/* Lesson Schedule Grid */}
        <CollapsibleSection 
     title="📅 Upcoming Lessons"
     defaultOpen={false}>
        <div style={styles.lessonScheduleSection}>
          <LessonGrid 
            lessons={lessons} 
            loading={loading.lessons}
            selectedMonth={selectedMonth}
          />
        </div>
</CollapsibleSection>
       {/* Lesson Summary Dashboard */}
<CollapsibleSection title="📊 Lesson Summary" defaultOpen={false}>
  <LessonSummaryDashboard 
    data={monthlyLessonData}
    loading={loading.monthlyData}
  />
</CollapsibleSection>
{/* Teacher Attendance Widget */}
<CollapsibleSection title="📋 My Attendance" defaultOpen={true}>
  <TeacherAttendanceWidget />
</CollapsibleSection>

{/* Teacher Inventory Widget */}
<CollapsibleSection title="📚 Teaching Resources" defaultOpen={false}>
  <TeacherInventoryWidget
    teacherSchools={teacherSchools}
    teacherName={teacherName}
  />
</CollapsibleSection>
        {/* Student Reports */}
        <CollapsibleSection title="👨‍🎓 Student Reports">
          <HoverCard style={styles.monthSelectorWrapper}>
            <span style={styles.monthLabel}>Select Month</span>
            <MonthFilter
              value={selectedMonth}
              onChange={setSelectedMonth}
              defaultToCurrent
            />
          </HoverCard>
          <FilterBar
            onFilter={(data) => fetchStudentData({ 
              ...data, 
              month: selectedMonth 
            })}
            showSchool
            showClass
            showMonth={false}
            submitButtonText="Fetch Student Data"
            
          />

          {loading.studentData ? (
            <LoadingSpinner size="medium" message="Loading student data..." />
          ) : studentAttendance.length > 0 ? (
            <>
              {/* Student Data Table */}
              <HoverCard style={styles.tableContainer}>
                <DataTable
                  data={studentAttendance.map(attendance => {
                    const topic = studentTopics.find(t => t.student_id === attendance.student_id) || { topics_achieved: 0 };
                    const image = studentImages.find(i => i.student_id === attendance.student_id) || { images_uploaded: 0 };
                    
                    return {
                      ...attendance,
                      topics_achieved: topic.topics_achieved,
                      images_uploaded: image.images_uploaded,
                    };
                  })}
                  columns={[
                    { key: 'student_id', label: 'Student ID', sortable: true, width: '100px' },
                    { key: 'name', label: 'Name', sortable: true },
                    { key: 'present', label: 'Present', sortable: true, align: 'center' },
                    { key: 'absent', label: 'Absent', sortable: true, align: 'center' },
                    { key: 'not_marked', label: 'Not Marked', sortable: true, align: 'center' },
                    { key: 'topics_achieved', label: 'Topics Achieved', sortable: true, align: 'center' },
                    { key: 'images_uploaded', label: 'Images Uploaded', sortable: true, align: 'center' },
                  ]}
                  striped
                  hoverable
                  maxHeight="400px"
                />
              </HoverCard>

              {/* Student Performance Chart */}
              <BarChartWrapper
                data={studentChartData}
                dataKey="present"
                xAxisKey="name"
                label="Student Performance Summary"
                height={350}
                showLegend
                showGrid
              />
            </>
          ) : (
            <HoverCard style={styles.emptyState}>
              <svg style={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p>Select school and class to view student data</p>
            </HoverCard>
            
          )}
        </CollapsibleSection>
      </div>

      {/* Attendance Confirmation Modal */}
      <AttendanceConfirmationModal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        attendanceData={attendanceModalData}
      />
    </div>
  );
};

// Styles with glassmorphism - responsive helper function using LAYOUT
const getStyles = (isMobile) => ({
  pageContainer: {
    display: 'flex',
    minHeight: '100vh',
    background: COLORS.background.gradient,
    fontFamily: 'Inter, -apple-system, sans-serif',
  },
  mainContent: {
    marginLeft: '0', // Original sidebar from App.js will provide margin
    flex: 1,
    minHeight: '100vh',
    padding: isMobile ? SPACING.md : SPACING.xl,
    maxWidth: LAYOUT.maxWidth.lg,
    transition: `padding ${TRANSITIONS.normal}`,
  },
  completionSection: {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: isMobile ? 'center' : 'space-around',
    alignItems: 'center',
    gap: isMobile ? SPACING.lg : SPACING.xl,
    padding: isMobile ? SPACING.lg : SPACING.xl,
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
  },
  lessonScheduleHeader: {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'flex-start' : 'center',
    gap: isMobile ? SPACING.md : 0,
    padding: `${isMobile ? SPACING.lg : SPACING.xl} 0 ${SPACING.lg}`,
  },
  sectionTitle: {
    fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    fontFamily: 'Montserrat, -apple-system, sans-serif',
    margin: 0,
    lineHeight: '26px',
  },
  monthSelectorWrapper: {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'stretch' : 'center',
    gap: isMobile ? SPACING.md : SPACING.lg,
    ...MIXINS.glassmorphicSubtle,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    width: isMobile ? '100%' : 'auto',
  },
  monthLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.whiteMedium,
  },
  lessonScheduleSection: {
    padding: `0 0 ${isMobile ? SPACING.lg : SPACING.xl}`,
  },
  tableContainer: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    overflowX: isMobile ? 'auto' : 'visible',
  },
  emptyState: {
    padding: isMobile ? SPACING.lg : SPACING['2xl'],
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.lg,
  },
  emptyIcon: {
    width: isMobile ? '2.5rem' : '3rem',
    height: isMobile ? '2.5rem' : '3rem',
    margin: '0 auto 1rem',
    color: COLORS.text.whiteSubtle,
  },
});

export default TeacherDashboardFigma;