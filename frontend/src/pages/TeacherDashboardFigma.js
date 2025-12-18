// ============================================
// TEACHER DASHBOARD - Figma Redesign
// ============================================
// Location: src/pages/TeacherDashboardFigma.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import moment from 'moment';

// Components
import { ProfileHeaderFigma } from '../components/teacher/ProfileHeaderFigma';
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

// Hooks
import { useSchools } from '../hooks/useSchools';

// Services
import { getTeacherProfile, getTeacherDashboardData } from '../services/teacherService';

// Constants
import { COLORS, SPACING, LAYOUT } from '../utils/designConstants';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://koderkids-erp.onrender.com';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
  'Content-Type': 'application/json',
});

const TeacherDashboardFigma = () => {
  // ============================================
  // STATE
  // ============================================
  
  // Profile State
  const [profile, setProfile] = useState(null);
  
  // Lessons State
  const [lessons, setLessons] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
  const [monthlyLessonData, setMonthlyLessonData] = useState([]);
  const [schoolLessons, setSchoolLessons] = useState([]);
  
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

  // Hooks
  const { schools } = useSchools();

  // ============================================
  // DATA FETCHING
  // ============================================
  // Inside TeacherDashboardFigma component
const teacherSchools = profile?.assigned_schools || [];


const teacherName = profile?.full_name || '';
  // Fetch teacher profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(prev => ({ ...prev, profile: true }));
      try {
        const profileData = await getTeacherProfile();
        console.log('✅ Profile loaded:', profileData);
        setProfile(profileData);
      } catch (error) {
        console.error('❌ Failed to fetch profile:', error);
        toast.error('Failed to load profile data');
      }
      setLoading(prev => ({ ...prev, profile: false }));
    };

    fetchProfile();
  }, []);

  // Fetch lessons
  useEffect(() => {
    const fetchLessons = async () => {
      setLoading(prev => ({ ...prev, lessons: true }));
      try {
        const response = await axios.get(`${API_BASE_URL}/api/dashboards/teacher-upcoming-lessons/`, { 
          headers: getAuthHeaders() 
        });
        setLessons(response.data.lessons || []);
      } catch (error) {
        console.error('❌ Failed to fetch lessons:', error);
        toast.error('Failed to fetch lessons');
      }
      setLoading(prev => ({ ...prev, lessons: false }));
    };

    fetchLessons();
  }, []);

  // Fetch monthly data when month changes
  useEffect(() => {
    const fetchMonthlyData = async () => {
      setLoading(prev => ({ ...prev, monthlyData: true, schoolData: true, completion: true }));
      
      try {
        const [lessonStatusRes, schoolLessonsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/dashboards/teacher-lesson-status/?month=${selectedMonth}`, {
            headers: getAuthHeaders(),
          }),
          axios.get(`${API_BASE_URL}/api/dashboards/teacher-lessons-by-school/?month=${selectedMonth}`, {
            headers: getAuthHeaders(),
          }),
        ]);

        setMonthlyLessonData(lessonStatusRes.data);
        setSchoolLessons(schoolLessonsRes.data);
        
        console.log('📊 Lesson Status Data:', lessonStatusRes.data);
        console.log('🏫 School Lessons Data:', schoolLessonsRes.data);
        
        // Calculate completion data for charts
        // Group by school and calculate average completion
        const completionBySchool = schoolLessonsRes.data.reduce((acc, school) => {
          const schoolData = lessonStatusRes.data.filter(
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
      } catch (error) {
        console.error('❌ Failed to fetch monthly data:', error);
        toast.error('Failed to fetch monthly data');
      }
      
      setLoading(prev => ({ ...prev, monthlyData: false, schoolData: false, completion: false }));
    };

    fetchMonthlyData();
  }, [selectedMonth]);

  // Fetch student data
  const fetchStudentData = async (filters) => {
    if (!filters.schoolId || !filters.className) {
      toast.error('Please select school and class');
      return;
    }

    setLoading(prev => ({ ...prev, studentData: true }));
    
    try {
      const params = `month=${filters.month || selectedMonth}&school_id=${filters.schoolId}&student_class=${filters.className}`;

      const [attendanceRes, topicsRes, imagesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/attendance/student-counts/?${params}`, {
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_BASE_URL}/api/reports/student-achieved-topics-count/?${params}`, {
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_BASE_URL}/api/reports/student-image-uploads-count/?${params}`, {
          headers: getAuthHeaders(),
        }),
      ]);

      setStudentAttendance(attendanceRes.data);
      setStudentTopics(topicsRes.data);
      setStudentImages(imagesRes.data);
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
        <ProfileHeaderFigma 
          profile={profile} 
          loading={loading.profile} 
          onProfileUpdate={handleProfileUpdate}
        />

        {/* Course Completion Charts */}
        {!loading.completion && completionData.length > 0 && (
          <div style={styles.completionSection}>
            {completionData.slice(0, 2).map((school, idx) => (
              <CircularProgress
                key={idx}
                percentage={school.completion_rate}
                schoolName={school.school_name}
                size={173}
                strokeWidth={20}
              />
            ))}
          </div>
        )}

        {/* Lesson Schedule Header */}
        <div style={styles.lessonScheduleHeader}>
          <h2 style={styles.sectionTitle}>
            Lesson Schedule (Next 7 Days)
          </h2>
          <div style={styles.monthSelectorWrapper}>
            <span style={styles.monthLabel}>Select Month</span>
            <MonthFilter
              value={selectedMonth}
              onChange={setSelectedMonth}
              defaultToCurrent
            />
          </div>
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
{/* Teacher Inventory Widget */}
<CollapsibleSection title="📚 Teaching Resources" defaultOpen={false}>
  <TeacherInventoryWidget 
    teacherSchools={teacherSchools}
    teacherName={teacherName}
  />
</CollapsibleSection>

        {/* Student Reports */}
        <CollapsibleSection title="👨‍🎓 Student Reports">
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
              <div style={styles.tableContainer}>
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
              </div>

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
            <div style={styles.emptyState}>
              <svg style={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p>Select school and class to view student data</p>
            </div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
};

// Styles
const styles = {
  pageContainer: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: COLORS.background.white,
    fontFamily: 'Inter, -apple-system, sans-serif',
  },
  mainContent: {
    marginLeft: '0', // Original sidebar from App.js will provide margin
    flex: 1,
    backgroundColor: COLORS.background.white,
    minHeight: '100vh',
  },
  completionSection: {
    display: 'flex',
    justifyContent: 'space-between', // Equal spacing between charts
    alignItems: 'center',
    padding: '2rem 3rem',
    backgroundColor: COLORS.background.white,
    maxWidth: '900px', // Limit max width for better appearance
  },
  lessonScheduleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '2rem 3rem 1rem',
  },
  sectionTitle: {
    fontSize: '26px',
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: 'Montserrat, -apple-system, sans-serif',
    margin: 0,
    lineHeight: '26px',
  },
  monthSelectorWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  monthLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  lessonScheduleSection: {
    padding: '0 3rem 2rem',
  },
  tableContainer: {
    marginBottom: SPACING.lg,
  },
  emptyState: {
    padding: '3rem',
    textAlign: 'center',
    color: COLORS.text.tertiary,
    backgroundColor: COLORS.background.lightGray,
    borderRadius: '8px',
    marginTop: '1rem',
  },
  emptyIcon: {
    width: '3rem',
    height: '3rem',
    margin: '0 auto 1rem',
    color: COLORS.text.light,
  },
};

export default TeacherDashboardFigma;