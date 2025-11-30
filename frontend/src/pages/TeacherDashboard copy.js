import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import moment from 'moment';
import Chart from 'chart.js/auto';
import FullCalendar from '@fullcalendar/react';
import styles from './TeacherD.module.css';

import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://koderkids-erp.onrender.com';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
});

const TeacherDashboard = () => {
  const [user, setUser] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
  const [monthlyLessonData, setMonthlyLessonData] = useState([]);
  const [schoolLessons, setSchoolLessons] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState({
    user: true,
    lessons: true,
    monthlyLessonData: false,
    schoolLessons: false,
    schools: true,
    studentData: false,
  });
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses] = useState([]);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [studentTopics, setStudentTopics] = useState([]);
  const [studentImages, setStudentImages] = useState([]);
  const [collapsedSections, setCollapsedSections] = useState({
    lessonSchedule: false,
    monthlyLessons: false,
    schoolLessons: false,
    studentData: false,
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // ----- NEW STATE FOR CALENDAR -----
  const [calendarEvents, setCalendarEvents] = useState([]);

  /* ==============================================================
     FETCH FUNCTIONS (unchanged)
  ============================================================== */
  const fetchUser = async () => {
    setLoading((prev) => ({ ...prev, user: true }));
    try {
      const response = await axios.get(`${API_BASE_URL}/api/user/`, { headers: getAuthHeaders() });
      setUser(response.data);
    } catch (error) {
      toast.error('Failed to fetch user data');
    }
    setLoading((prev) => ({ ...prev, user: false }));
  };

  const fetchSchools = async () => {
    setLoading((prev) => ({ ...prev, schools: true }));
    try {
      const response = await axios.get(`${API_BASE_URL}/api/schools/`, { headers: getAuthHeaders() });
      setSchools(response.data);
    } catch (error) {
      toast.error('Failed to fetch schools');
    }
    setLoading((prev) => ({ ...prev, schools: false }));
  };

  const fetchClasses = async (schoolId) => {
    if (!schoolId) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/classes/?school=${schoolId}`, { headers: getAuthHeaders() });
      const uniqueClasses = [...new Set(response.data)];
      setClasses(uniqueClasses);
    } catch (error) {
      toast.error('Failed to fetch classes');
    }
  };

  const fetchLessons = async () => {
    setLoading((prev) => ({ ...prev, lessons: true }));
    try {
      const response = await axios.get(`${API_BASE_URL}/api/teacher-upcoming-lessons/`, { headers: getAuthHeaders() });
      const fetchedLessons = response.data.lessons || [];
      setLessons(response.data.lessons || []);
      console.log('Fetched lessons from API:', fetchedLessons);  // Log the raw data
    } catch (error) {
      toast.error('Failed to fetch lessons');
      console.error('API error:', error);  // Log any errors
    }
    setLoading((prev) => ({ ...prev, lessons: false }));
  };

  const fetchSummary = async (endpoint, setter, key) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const url = `${API_BASE_URL}${endpoint}?month=${selectedMonth}`;
      const response = await axios.get(url, { headers: getAuthHeaders() });
      setter(response.data);
    } catch (error) {
      toast.error(`Failed to fetch ${key}`);
    }
    setLoading((prev) => ({ ...prev, [key]: false }));
  };

  const fetchStudentData = async () => {
    if (!selectedMonth || !selectedSchoolId || !selectedClass) {
      toast.error('Please select month, school, and class');
      return;
    }
    setLoading((prev) => ({ ...prev, studentData: true }));
    try {
      const params = `month=${selectedMonth}&school_id=${selectedSchoolId}&student_class=${selectedClass}`;
      const attendanceResponse = await axios.get(`${API_BASE_URL}/api/student-attendance-counts/?${params}`, { headers: getAuthHeaders() });
      setStudentAttendance(attendanceResponse.data);
      const topicsResponse = await axios.get(`${API_BASE_URL}/api/student-achieved-topics-count/?${params}`, { headers: getAuthHeaders() });
      setStudentTopics(topicsResponse.data);
      const imagesResponse = await axios.get(`${API_BASE_URL}/api/student-image-uploads-count/?${params}`, { headers: getAuthHeaders() });
      setStudentImages(imagesResponse.data);
      renderStudentDataChart();
    } catch (error) {
      toast.error('Failed to fetch student data');
    }
    setLoading((prev) => ({ ...prev, studentData: false }));
  };

  const renderStudentDataChart = () => {
    const ctx = document.getElementById('studentDataChart')?.getContext('2d');
    if (!ctx) return;
    if (window.studentDataChart instanceof Chart) window.studentDataChart.destroy();
    const labels = studentAttendance.map((student) => student.name);
    const presentData = studentAttendance.map((student) => student.present);
    const topicsData = studentTopics.map((topic) => topic.topics_achieved);
    const imagesData = studentImages.map((image) => image.images_uploaded);
    window.studentDataChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Days Present', data: presentData, backgroundColor: 'rgba(54, 162, 235, 0.6)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1 },
          { label: 'Topics Achieved', data: topicsData, backgroundColor: 'rgba(75, 192, 192, 0.6)', borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 1 },
          { label: 'Images Uploaded', data: imagesData, backgroundColor: 'rgba(255, 206, 86, 0.6)', borderColor: 'rgba(255, 206, 86, 1)', borderWidth: 1 },
        ],
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Count' } }, x: { title: { display: true, text: 'Students' } } },
        plugins: { legend: { position: 'top' }, title: { display: true, text: 'Student Performance Summary' } },
      },
    });
  };

  const sortTable = (data, key) => {
    const sortedData = [...data];
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    sortedData.sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setSortConfig({ key, direction });
    return sortedData;
  };

  const toggleSection = (section) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  /* ==============================================================
     EFFECTS
  ============================================================== */
  useEffect(() => {
    fetchUser();
    fetchSchools();
    fetchLessons();
  }, []);

  useEffect(() => {
    fetchSummary('/api/teacher-lesson-status/', setMonthlyLessonData, 'monthlyLessonData');
    fetchSummary('/api/teacher-lessons-by-school/', setSchoolLessons, 'schoolLessons');
  }, [selectedMonth]);

  useEffect(() => {
    fetchClasses(selectedSchoolId);
  }, [selectedSchoolId]);

  /* ----- BUILD CALENDAR EVENTS ----- */
  useEffect(() => {
  if (!lessons.length) {
    setCalendarEvents([]);
    console.log('No lessons available to map to events.');
    return;
  }

  const events = lessons.map((lesson) => {
    const eventDate = lesson.session_date.split('T')[0];
    console.log('Mapping lesson:', lesson, 'to date:', eventDate);
    return {
      title: '',  // Leave blank; we'll use custom content
      date: eventDate,
      allDay: true,
      extendedProps: {  // Store details for custom rendering
        className: lesson.class_name,
        schoolName: lesson.school_name,
        topic: lesson.topic,
      },
      backgroundColor:
        lesson.class_name === 'Class A' ? '#10b981' :
        lesson.class_name === 'Class B' ? '#3b82f6' :
        '#f59e0b',
      borderColor: 'transparent',
      textColor: '#fff',
    };
  });

  setCalendarEvents(events);
  console.log('Generated calendar events:', events);
}, [lessons]);

  /* ==============================================================
     RENDER
  ============================================================== */
return (
    <div className="container mx-auto p-6 space-y-8">

      {/* ==================== FIGMA-ACCURATE TOP HEADER (EXACT MATCH) ==================== */}
<div className="relative bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
  <div className="px-12 py-10 relative">

    {/* Teacher Avatar */}
    <img
      src={user?.profile_photo || "/images/teacher-avatar.jpg"}
      alt="Teacher"
      className="absolute left-12 top-12 w-28 h-28 rounded-full object-cover border-4 border-gray-100 shadow-md"
    />

    {/* Welcome Text - Large Purple Montserrat */}
    <h1 className="absolute left-52 top-20 text-3xl font-extrabold text-purple-600"
        style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {loading.user ? 'Loading...' : `Welcome, ${user?.fullName || 'Unknown'}`}
    </h1>

    {/* Right Icons */}
    <div className="absolute right-12 top-12 flex gap-7">
      <button className="p-3 hover:bg-gray-100 rounded-full transition">
        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </button>
      <button className="p-3 hover:bg-gray-100 rounded-full transition">
        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </button>
      <button className="p-3 hover:bg-gray-100 rounded-full transition">
        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>

    {/* Profile Details Grid - Exactly Like Figma */}
    <div className="mt-36 ml-48 grid grid-cols-12 gap-x-12 gap-y-3 text-sm">
      <span className="text-gray-500 font-semibold">Emp #</span>
      <span className="text-gray-800 font-semibold col-span-2">{user?.employee_id || '21556'}</span>

      <span className="text-gray-500 font-semibold">Role:</span>
      <span className="text-gray-800 font-semibold col-span-2">{localStorage.getItem('role') || 'Teacher'}</span>

      <span className="text-gray-500 font-semibold">Gender</span>
      <span className="text-gray-800 font-semibold">{user?.gender || 'Female'}</span>

      <span className="text-gray-500 font-semibold">Joining Date</span>
      <span className="text-gray-800 font-semibold">
        {user?.joining_date ? moment(user.joining_date).format('DD-MMM-YYYY') : '29-Nov-2025'}
      </span>

      <span className="text-gray-500 font-semibold">Blood Group</span>
      <span className="text-gray-800 font-semibold">{user?.blood_group || 'A+'}</span>

      <span className="text-gray-500 font-semibold">Schools</span>
      <span className="text-gray-800 font-semibold col-span-5">
        {user?.school_name || 'Creative School Gauri Town'}
      </span>
    </div>

    {/* Bottom Border Line - Matches Figma */}
    <div className="absolute bottom-0 left-12 right-12 h-px bg-gray-300"></div>
  </div>
</div>

      {/* ==== MONTH SELECTOR ==== */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <label htmlFor="month" className="block text-lg font-semibold mb-2">
          Select Month
        </label>
        <input
          type="month"
          id="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="p-2 border rounded-md w-full max-w-xs"
          aria-label="Select month for summaries and reports"
        />
      </div>

      {/* ==== LESSON SCHEDULE (CALENDAR) ==== */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Lesson Schedule (Next 7 Days)</h2>
          <button
            onClick={() => toggleSection('lessonSchedule')}
            className="text-blue-600 hover:text-blue-800"
            aria-label={
              collapsedSections.lessonSchedule
                ? 'Expand Lesson Schedule'
                : 'Collapse Lesson Schedule'
            }
          >
            
            <FontAwesomeIcon 
  icon={collapsedSections.lessonSchedule ? faChevronDown : faChevronUp} 
  className="ml-2 text-lg"
/>
          </button>
        </div>

        {!collapsedSections.lessonSchedule && (
          <>
            {loading.lessons ? (
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : calendarEvents.length > 0 ? (
              <FullCalendar
  plugins={[dayGridPlugin,  interactionPlugin]}
  initialView="dayGridWeek"
  headerToolbar={false}  // Remove all navigation buttons for static view
  height="auto"
  events={calendarEvents}
  initialDate={moment().format('YYYY-MM-DD')}
  validRange={{  // Lock to next 7 days only
    start: moment().startOf('day').toDate(),
    end: moment().add(7, 'days').endOf('day').toDate(),
  }}
  eventContent={(eventInfo) => (  // Custom rendering for full details
    <div style={{ padding: '4px', fontSize: '12px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
      <strong>Class:</strong> {eventInfo.event.extendedProps.className}<br />
      <strong>School:</strong> {eventInfo.event.extendedProps.schoolName}<br />
      <strong>Topic:</strong> {eventInfo.event.extendedProps.topic}
    </div>
  )}
/>
            ) : (
              <p className="text-gray-500">
                No lessons scheduled for the next 7 days.
              </p>
            )}
          </>
        )}
      </div>

      {/* ==== LESSON SUMMARY ==== */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Lesson Summary</h2>
          <button
            onClick={() => toggleSection('monthlyLessons')}
            className="text-blue-600 hover:text-blue-800"
            aria-label={
              collapsedSections.monthlyLessons
                ? 'Expand Lesson Summary'
                : 'Collapse Lesson Summary'
            }
          >
            
            <FontAwesomeIcon 
  icon={collapsedSections.monthlyLessons ? faChevronDown : faChevronUp} 
  className="ml-2 text-lg"
/>
          </button>
        </div>

        {!collapsedSections.monthlyLessons && (
          loading.monthlyLessonData ? (
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : monthlyLessonData.length > 0 ? (
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th
                    className="border px-4 py-2 cursor-pointer"
                    onClick={() => setMonthlyLessonData(sortTable(monthlyLessonData, 'school_name'))}
                  >
                    School{' '}
                    {sortConfig.key === 'school_name' && (
                      <FontAwesomeIcon
                        icon={sortConfig.direction === 'asc' ? faSortUp : faSortDown}
                        className="ml-1"
                      />
                    )}
                  </th>
                  <th
                    className="border px-4 py-2 cursor-pointer"
                    onClick={() => setMonthlyLessonData(sortTable(monthlyLessonData, 'student_class'))}
                  >
                    Class{' '}
                    {sortConfig.key === 'student_class' &&
                      <FontAwesomeIcon
                        icon={sortConfig.direction === 'asc' ? faSortUp : faSortDown}
                        className="ml-1"
                      />}
                  </th>
                  <th
                    className="border px-4 py-2 cursor-pointer"
                    onClick={() => setMonthlyLessonData(sortTable(monthlyLessonData, 'planned_lessons'))}
                  >
                    Lessons Planned{' '}
                    {sortConfig.key === 'planned_lessons' &&
                      <FontAwesomeIcon
                        icon={sortConfig.direction === 'asc' ? faSortUp : faSortDown}
                        className="ml-1"
                      />}
                  </th>
                  <th
                    className="border px-4 py-2 cursor-pointer"
                    onClick={() => setMonthlyLessonData(sortTable(monthlyLessonData, 'completion_rate'))}
                  >
                    Completion Rate (%) {' '}
                    {sortConfig.key === 'completion_rate' &&
                      <FontAwesomeIcon
                        icon={sortConfig.direction === 'asc' ? faSortUp : faSortDown}
                        className="ml-1"
                      />}
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyLessonData.map((data, index) => (
                  <tr
                    key={index}
                    className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}
                  >
                    <td className="border px-4 py-2">{data.school_name}</td>
                    <td className="border px-4 py-2">{data.student_class}</td>
                    <td className="border px-4 py-2">{data.planned_lessons}</td>
                    <td className="border px-4 py-2">{data.completion_rate.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No lesson data for selected month.</p>
          )
        )}
      </div>

      {/* ==== SCHOOL-WISE LESSON DISTRIBUTION ==== */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">School-Wise Lesson Distribution</h2>
          <button
            onClick={() => toggleSection('schoolLessons')}
            className="text-blue-600 hover:text-blue-800"
            aria-label={
              collapsedSections.schoolLessons
                ? 'Expand School Lessons'
                : 'Collapse School Lessons'
            }
          >
            
            <FontAwesomeIcon 
  icon={collapsedSections.schoolLessons ? faChevronDown : faChevronUp} 
  className="ml-2 text-lg"
/>
          </button>
        </div>

        {!collapsedSections.schoolLessons && (
          loading.schoolLessons ? (
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : schoolLessons.length > 0 ? (
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th
                    className="border px-4 py-2 cursor-pointer"
                    onClick={() => setSchoolLessons(sortTable(schoolLessons, 'school_name'))}
                  >
                    School{' '}
                    {sortConfig.key === 'school_name' &&
                      (sortConfig.direction === 'asc' ? 'Up Arrow' : 'Down Arrow')}
                  </th>
                  <th
                    className="border px-4 py-2 cursor-pointer"
                    onClick={() => setSchoolLessons(sortTable(schoolLessons, 'total_lessons'))}
                  >
                    Total Lessons{' '}
                    {sortConfig.key === 'total_lessons' &&
                      (sortConfig.direction === 'asc' ? 'Up Arrow' : 'Down Arrow')}
                  </th>
                  <th className="border px-4 py-2">Classes Covered</th>
                </tr>
              </thead>
              <tbody>
                {schoolLessons.map((summary, index) => (
                  <tr
                    key={index}
                    className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}
                  >
                    <td className="border px-4 py-2">{summary.school_name}</td>
                    <td className="border px-4 py-2">{summary.total_lessons}</td>
                    <td className="border px-4 py-2">{summary.classes_covered.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No school-wise lessons for selected month.</p>
          )
        )}
      </div>

      {/* ==== STUDENT REPORTS ==== */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Student Reports - Data</h2>
          <button
            onClick={() => toggleSection('studentData')}
            className="text-blue-600 hover:text-blue-800"
            aria-label={
              collapsedSections.studentData
                ? 'Expand Student Data'
                : 'Collapse Student Data'
            }
          >
            
            <FontAwesomeIcon 
  icon={collapsedSections.studentData ? faChevronDown : faChevronUp} 
  className="ml-2 text-lg"
/>
          </button>
        </div>

        {!collapsedSections.studentData && (
          <>
            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <label htmlFor="schoolId" className="block text-sm font-medium mb-1">
                  Select School
                </label>
                <select
                  id="schoolId"
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="p-2 border rounded-md w-full max-w-xs"
                  aria-label="Select school for student data reports"
                >
                  <option value="">Select School</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="studentClass" className="block text-sm font-medium mb-1">
                  Select Class
                </label>
                <select
                  id="studentClass"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="p-2 border rounded-md w-full max-w-xs"
                  aria-label="Select class for student data reports"
                  disabled={!selectedSchoolId}
                >
                  <option value="">Select Class</option>
                  {classes.map((cls, index) => (
                    <option key={index} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchStudentData}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  disabled={loading.studentData}
                  aria-label="Fetch student data"
                >
                  {loading.studentData ? 'Loading...' : 'Fetch Data'}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Student Reports Data Summary</h3>
              {loading.studentData ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : studentAttendance.length > 0 ? (
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th
                        className="border px-4 py-2 cursor-pointer"
                        onClick={() => setStudentAttendance(sortTable(studentAttendance, 'student_id'))}
                      >
                        Student ID{' '}
                        {sortConfig.key === 'student_id' &&
                          (sortConfig.direction === 'asc' ? 'Up Arrow' : 'Down Arrow')}
                      </th>
                      <th
                        className="border px-4 py-2 cursor-pointer"
                        onClick={() => setStudentAttendance(sortTable(studentAttendance, 'name'))}
                      >
                        Name{' '}
                        {sortConfig.key === 'name' &&
                          (sortConfig.direction === 'asc' ? 'Up Arrow' : 'Down Arrow')}
                      </th>
                      <th
                        className="border px-4 py-2 bg-blue-100 cursor-pointer"
                        onClick={() => setStudentAttendance(sortTable(studentAttendance, 'present'))}
                      >
                        Present{' '}
                        {sortConfig.key === 'present' &&
                          (sortConfig.direction === 'asc' ? 'Up Arrow' : 'Down Arrow')}
                      </th>
                      <th
                        className="border px-4 py-2 bg-blue-100 cursor-pointer"
                        onClick={() => setStudentAttendance(sortTable(studentAttendance, 'absent'))}
                      >
                        Absent{' '}
                        {sortConfig.key === 'absent' &&
                          (sortConfig.direction === 'asc' ? 'Up Arrow' : 'Down Arrow')}
                      </th>
                      <th
                        className="border px-4 py-2 bg-blue-100 cursor-pointer"
                        onClick={() => setStudentAttendance(sortTable(studentAttendance, 'not_marked'))}
                      >
                        Not Marked{' '}
                        {sortConfig.key === 'not_marked' &&
                          (sortConfig.direction === 'asc' ? 'Up Arrow' : 'Down Arrow')}
                      </th>
                      <th className="border px-4 py-2 bg-green-100">Topics Achieved</th>
                      <th className="border px-4 py-2 bg-yellow-100">Images Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentAttendance.map((attendance, index) => {
                      const topic =
                        studentTopics.find((t) => t.student_id === attendance.student_id) || {
                          topics_achieved: 0,
                        };
                      const image =
                        studentImages.find((i) => i.student_id === attendance.student_id) || {
                          images_uploaded: 0,
                        };
                      return (
                        <tr
                          key={index}
                          className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}
                        >
                          <td className="border px-4 py-2">{attendance.student_id}</td>
                          <td className="border px-4 py-2">{attendance.name}</td>
                          <td className="border px-4 py-2 bg-blue-50">{attendance.present}</td>
                          <td className="border px-4 py-2 bg-blue-50">{attendance.absent}</td>
                          <td className="border px-4 py-2 bg-blue-50">{attendance.not_marked}</td>
                          <td className="border px-4 py-2 bg-green-50">{topic.topics_achieved}</td>
                          <td className="border px-4 py-2 bg-yellow-50">{image.images_uploaded}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500">No student data available.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );



};									
                    										


export default TeacherDashboard;