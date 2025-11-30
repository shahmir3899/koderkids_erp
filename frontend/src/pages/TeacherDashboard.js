// ============================================
// TEACHER DASHBOARD - Refactored Version
// ============================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import moment from 'moment';
import { ProfileHeader } from '../components/teacher/ProfileHeader';
import { LessonCalendar } from '../components/teacher/LessonCalendar';
import { CollapsibleSection } from '../components/common/cards/CollapsibleSection';
import { MonthFilter } from '../components/common/filters/MonthFilter';
import { FilterBar } from '../components/common/filters/FilterBar';
import { DataTable } from '../components/common/tables/DataTable';
import { BarChartWrapper } from '../components/common/charts/BarChartWrapper';
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { useSchools } from '../hooks/useSchools';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://koderkids-erp.onrender.com';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
  'Content-Type': 'application/json',
});

const TeacherDashboard = () => {
  // State
  const [user, setUser] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
  const [monthlyLessonData, setMonthlyLessonData] = useState([]);
  const [schoolLessons, setSchoolLessons] = useState([]);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [studentTopics, setStudentTopics] = useState([]);
  const [studentImages, setStudentImages] = useState([]);
  
  const [loading, setLoading] = useState({
    user: true,
    lessons: true,
    monthlyData: false,
    schoolData: false,
    studentData: false,
  });

  // Hooks
  const { schools } = useSchools();

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(prev => ({ ...prev, user: true }));
      try {
        const response = await axios.get(`${API_BASE_URL}/api/user/`, { headers: getAuthHeaders() });
        setUser(response.data);
      } catch (error) {
        toast.error('Failed to fetch user data');
      }
      setLoading(prev => ({ ...prev, user: false }));
    };

    fetchUser();
  }, []);

  // Fetch lessons
  useEffect(() => {
    const fetchLessons = async () => {
      setLoading(prev => ({ ...prev, lessons: true }));
      try {
        const response = await axios.get(`${API_BASE_URL}/api/teacher-upcoming-lessons/`, { 
          headers: getAuthHeaders() 
        });
        setLessons(response.data.lessons || []);
      } catch (error) {
        toast.error('Failed to fetch lessons');
      }
      setLoading(prev => ({ ...prev, lessons: false }));
    };

    fetchLessons();
  }, []);

  // Fetch monthly data when month changes
  useEffect(() => {
    const fetchMonthlyData = async () => {
      setLoading(prev => ({ ...prev, monthlyData: true, schoolData: true }));
      
      try {
        const [lessonStatusRes, schoolLessonsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/teacher-lesson-status/?month=${selectedMonth}`, {
            headers: getAuthHeaders(),
          }),
          axios.get(`${API_BASE_URL}/api/teacher-lessons-by-school/?month=${selectedMonth}`, {
            headers: getAuthHeaders(),
          }),
        ]);

        setMonthlyLessonData(lessonStatusRes.data);
        setSchoolLessons(schoolLessonsRes.data);
      } catch (error) {
        toast.error('Failed to fetch monthly data');
      }
      
      setLoading(prev => ({ ...prev, monthlyData: false, schoolData: false }));
    };

    fetchMonthlyData();
  }, [selectedMonth]);

  // Fetch student data
  const fetchStudentData = async (filters) => {
    if (!filters.schoolId || !filters.className) {
      toast.error('Please select month, school, and class');
      return;
    }

    setLoading(prev => ({ ...prev, studentData: true }));
    
    try {
      const params = `month=${filters.month || selectedMonth}&school_id=${filters.schoolId}&student_class=${filters.className}`;

      const [attendanceRes, topicsRes, imagesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/student-attendance-counts/?${params}`, {
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_BASE_URL}/api/student-achieved-topics-count/?${params}`, {
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_BASE_URL}/api/student-image-uploads-count/?${params}`, {
          headers: getAuthHeaders(),
        }),
      ]);

      setStudentAttendance(attendanceRes.data);
      setStudentTopics(topicsRes.data);
      setStudentImages(imagesRes.data);
    } catch (error) {
      toast.error('Failed to fetch student data');
    }
    
    setLoading(prev => ({ ...prev, studentData: false }));
  };

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

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Profile Header */}
      <ProfileHeader user={user} loading={loading.user} />

      {/* Month Selector */}
      <div style={{ marginBottom: '2rem' }}>
        <MonthFilter
          value={selectedMonth}
          onChange={setSelectedMonth}
          label="Select Month"
          defaultToCurrent
        />
      </div>

      {/* Lesson Schedule */}
      <CollapsibleSection title="Lesson Schedule (Next 7 Days)">
        <LessonCalendar lessons={lessons} loading={loading.lessons} />
      </CollapsibleSection>

      {/* Lesson Summary */}
      <CollapsibleSection title="Lesson Summary">
        <DataTable
          data={monthlyLessonData}
          loading={loading.monthlyData}
          columns={[
            { key: 'school_name', label: 'School', sortable: true },
            { key: 'student_class', label: 'Class', sortable: true, align: 'center' },
            { key: 'planned_lessons', label: 'Lessons Planned', sortable: true, align: 'center' },
            { 
              key: 'completion_rate', 
              label: 'Completion Rate (%)', 
              sortable: true, 
              align: 'center',
              render: (value) => `${value.toFixed(1)}%`
            },
          ]}
          emptyMessage="No lesson data for selected month"
          striped
          hoverable
        />
      </CollapsibleSection>

      {/* School-Wise Lesson Distribution */}
      <CollapsibleSection title="School-Wise Lesson Distribution">
        <DataTable
          data={schoolLessons}
          loading={loading.schoolData}
          columns={[
            { key: 'school_name', label: 'School', sortable: true },
            { key: 'total_lessons', label: 'Total Lessons', sortable: true, align: 'center' },
            { 
              key: 'classes_covered', 
              label: 'Classes Covered', 
              sortable: false,
              render: (value) => Array.isArray(value) ? value.join(', ') : value
            },
          ]}
          emptyMessage="No school-wise lessons for selected month"
          striped
          hoverable
        />
      </CollapsibleSection>

      {/* Student Reports */}
      <CollapsibleSection title="Student Reports - Data">
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
            <div style={{ marginBottom: '2rem' }}>
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
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#9CA3AF',
            backgroundColor: '#F9FAFB',
            borderRadius: '8px',
            marginTop: '1rem',
          }}>
            Select school and class to view student data
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
};

export default TeacherDashboard;