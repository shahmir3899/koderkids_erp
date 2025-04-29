import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import moment from 'moment';
import Chart from 'chart.js/auto'; // Import Chart.js for bar chart

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://koderkids-erp.onrender.com';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
});

const TeacherDashboard = () => {
  const [user, setUser] = useState(null);
  const [lessons, setLessons] = useState([]); // Combined lessons (next 7 days)
  const [selectedMonth, setSelectedMonth] = useState(''); // Consolidated month selector
  const [monthlyLessons, setMonthlyLessons] = useState([]);
  const [lessonStatus, setLessonStatus] = useState([]);
  const [schoolLessons, setSchoolLessons] = useState([]);
  const [engagement, setEngagement] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState({
    user: false,
    lessons: false,
    monthlyLessons: false,
    lessonStatus: false,
    schoolLessons: false,
    engagement: false,
    schools: false,
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
    lessonStatus: false,
    schoolLessons: false,
    engagement: false,
    studentData: false,
  });

  // Fetch logged-in user
  const fetchUser = async () => {
    setLoading((prev) => ({ ...prev, user: true }));
    try {
      const response = await axios.get(`${API_BASE_URL}/api/user/`, {
        headers: getAuthHeaders(),
      });
      setUser(response.data);
    } catch (error) {
      toast.error('Failed to fetch user data');
    }
    setLoading((prev) => ({ ...prev, user: false }));
  };

  // Fetch schools
  const fetchSchools = async () => {
    setLoading((prev) => ({ ...prev, schools: true }));
    try {
      const response = await axios.get(`${API_BASE_URL}/api/schools/`, {
        headers: getAuthHeaders(),
      });
      setSchools(response.data);
    } catch (error) {
      toast.error('Failed to fetch schools');
    }
    setLoading((prev) => ({ ...prev, schools: false }));
  };

  // Fetch classes for selected school
  const fetchClasses = async (schoolId) => {
    if (!schoolId) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/classes/?school=${schoolId}`, {
        headers: getAuthHeaders(),
      });
      const uniqueClasses = [...new Set(response.data)];
      setClasses(uniqueClasses);
    } catch (error) {
      toast.error('Failed to fetch classes');
    }
  };

  // Fetch lessons for the next 7 days
  const fetchLessons = async () => {
    setLoading((prev) => ({ ...prev, lessons: true }));
    try {
      const response = await axios.get(`${API_BASE_URL}/api/teacher-upcoming-lessons/`, {
        headers: getAuthHeaders(),
      });
      setLessons(response.data.lessons || []);
    } catch (error) {
      toast.error('Failed to fetch lessons');
    }
    setLoading((prev) => ({ ...prev, lessons: false }));
  };

  // Generic fetch function for summaries
  const fetchSummary = async (endpoint, setter, key) => {
    if (!selectedMonth) return;
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

  // Fetch student data
  const fetchStudentData = async () => {
    if (!selectedMonth || !selectedSchoolId || !selectedClass) {
      toast.error('Please select month, school, and class');
      return;
    }

    setLoading((prev) => ({ ...prev, studentData: true }));
    try {
      const params = `month=${selectedMonth}&school_id=${selectedSchoolId}&student_class=${selectedClass}`;
      
      const attendanceResponse = await axios.get(
        `${API_BASE_URL}/api/student-attendance-counts/?${params}`,
        { headers: getAuthHeaders() }
      );
      setStudentAttendance(attendanceResponse.data);

      const topicsResponse = await axios.get(
        `${API_BASE_URL}/api/student-achieved-topics-count/?${params}`,
        { headers: getAuthHeaders() }
      );
      setStudentTopics(topicsResponse.data);

      const imagesResponse = await axios.get(
        `${API_BASE_URL}/api/student-image-uploads-count/?${params}`,
        { headers: getAuthHeaders() }
      );
      setStudentImages(imagesResponse.data);

      // Render chart after data is fetched
      renderStudentDataChart();
    } catch (error) {
      toast.error('Failed to fetch student data');
    }
    setLoading((prev) => ({ ...prev, studentData: false }));
  };

  // Render Chart.js bar chart for student data
  const renderStudentDataChart = () => {
    const ctx = document.getElementById('studentDataChart')?.getContext('2d');
    if (!ctx) return;

    // Destroy previous chart instance if exists
    if (window.studentDataChart instanceof Chart) {
      window.studentDataChart.destroy();
    }

    const labels = studentAttendance.map((student) => student.name);
    const presentData = studentAttendance.map((student) => student.present);
    const topicsData = studentTopics.map((topic) => topic.topics_achieved);
    const imagesData = studentImages.map((image) => image.images_uploaded);

    window.studentDataChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Days Present',
            data: presentData,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
          {
            label: 'Topics Achieved',
            data: topicsData,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
          {
            label: 'Images Uploaded',
            data: imagesData,
            backgroundColor: 'rgba(255, 206, 86, 0.6)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Count',
            },
          },
          x: {
            title: {
              display: true,
              text: 'Students',
            },
          },
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Student Performance Summary',
          },
        },
      },
    });
  };

  // Initial data fetch
  useEffect(() => {
    fetchUser();
    fetchSchools();
    fetchLessons();
  }, []);

  // Fetch summaries when month changes
  useEffect(() => {
    fetchSummary('/api/teacher-lessons-by-month/', setMonthlyLessons, 'monthlyLessons');
    fetchSummary('/api/teacher-lesson-status/', setLessonStatus, 'lessonStatus');
    fetchSummary('/api/teacher-lessons-by-school/', setSchoolLessons, 'schoolLessons');
    fetchSummary('/api/teacher-student-engagement/', setEngagement, 'engagement');
  }, [selectedMonth]);

  // Fetch classes when school changes
  useEffect(() => {
    fetchClasses(selectedSchoolId);
  }, [selectedSchoolId]);

  // Group lessons by class and date
  const groupedLessons = lessons.reduce((acc, lesson) => {
    const date = moment(lesson.session_date).format('YYYY-MM-DD');
    const day = moment(lesson.session_date).format('dddd');
    const className = lesson.class_name;

    if (!acc[className]) {
      acc[className] = {};
    }
    if (!acc[className][date]) {
      acc[className][date] = { day, lessons: [] };
    }
    acc[className][date].lessons.push(lesson);
    return acc;
  }, {});

  // Sorting state for tables
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

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

  // Toggle section collapse
  const toggleSection = (section) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold">
          {loading.user ? 'Loading...' : `Welcome, ${user?.username || 'Teacher'}`}
        </h1>
        <p>Role: {loading.user ? 'Loading...' : localStorage.getItem('role') || 'Not Assigned'}</p>
      </div>

      {/* Consolidated Month Selector */}
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

      {/* Lesson Schedule (Merged Table) */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Lesson Schedule (Next 7 Days)</h2>
          <button
            onClick={() => toggleSection('lessonSchedule')}
            className="text-blue-600 hover:text-blue-800"
            aria-label={collapsedSections.lessonSchedule ? 'Expand Lesson Schedule' : 'Collapse Lesson Schedule'}
          >
            {collapsedSections.lessonSchedule ? 'Expand ▼' : 'Collapse ▲'}
          </button>
        </div>
        {!collapsedSections.lessonSchedule && (
          loading.lessons ? (
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : Object.keys(groupedLessons).length > 0 ? (
            Object.keys(groupedLessons).map((className) => (
              <div key={className} className="mb-6">
                <h3 className="text-lg font-medium mb-2">Class: {className}</h3>
                {Object.keys(groupedLessons[className]).sort().map((date) => {
                  const { day, lessons: dayLessons } = groupedLessons[className][date];
                  const isToday = moment(date).isSame(moment(), 'day');
                  return (
                    <div key={date} className="mb-4">
                      <h4 className={`text-md font-medium ${isToday ? 'text-blue-600' : ''}`}>
                        {date}, {day}
                      </h4>
                      <table className="w-full border-collapse border border-gray-300 mt-2">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border px-4 py-2">School</th>
                            <th className="border px-4 py-2">Topic</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayLessons.map((lesson, index) => (
                            <tr
                              key={index}
                              className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100 ${
                                isToday ? 'bg-blue-50' : ''
                              }`}
                            >
                              <td className="border px-4 py-2">{lesson.school_name}</td>
                              <td className="border px-4 py-2">{lesson.topic}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <p className="text-gray-500">No lessons scheduled for the next 7 days.</p>
          )
        )}
      </div>

      {/* Monthly Lessons Summary */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Monthly Lessons by Class</h2>
          <button
            onClick={() => toggleSection('monthlyLessons')}
            className="text-blue-600 hover:text-blue-800"
            aria-label={collapsedSections.monthlyLessons ? 'Expand Monthly Lessons' : 'Collapse Monthly Lessons'}
          >
            {collapsedSections.monthlyLessons ? 'Expand ▼' : 'Collapse ▲'}
          </button>
        </div>
        {!collapsedSections.monthlyLessons && (
          loading.monthlyLessons ? (
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : monthlyLessons.length > 0 ? (
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2 cursor-pointer" onClick={() => setMonthlyLessons(sortTable(monthlyLessons, 'student_class'))}>
                    Class {sortConfig.key === 'student_class' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="border px-4 py-2 cursor-pointer" onClick={() => setMonthlyLessons(sortTable(monthlyLessons, 'school_name'))}>
                    School {sortConfig.key === 'school_name' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="border px-4 py-2 cursor-pointer" onClick={() => setMonthlyLessons(sortTable(monthlyLessons, 'lesson_count'))}>
                    Lessons Planned {sortConfig.key === 'lesson_count' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyLessons.map((summary, index) => (
                  <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}>
                    <td className="border px-4 py-2">{summary.student_class}</td>
                    <td className="border px-4 py-2">{summary.school_name}</td>
                    <td className="border px-4 py-2">{summary.lesson_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No lessons for selected month.</p>
          )
        )}
      </div>

      {/* Lesson Completion Status */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Lesson Completion Status</h2>
          <button
            onClick={() => toggleSection('lessonStatus')}
            className="text-blue-600 hover:text-blue-800"
            aria-label={collapsedSections.lessonStatus ? 'Expand Lesson Status' : 'Collapse Lesson Status'}
          >
            {collapsedSections.lessonStatus ? 'Expand ▼' : 'Collapse ▲'}
          </button>
        </div>
        {!collapsedSections.lessonStatus && (
          loading.lessonStatus ? (
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : lessonStatus.length > 0 ? (
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2 cursor-pointer" onClick={() => setLessonStatus(sortTable(lessonStatus, 'student_class'))}>
                    Class {sortConfig.key === 'student_class' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="border px-4 py-2 cursor-pointer" onClick={() => setLessonStatus(sortTable(lessonStatus, 'planned_lessons'))}>
                    Planned Lessons {sortConfig.key === 'planned_lessons' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="border px-4 py-2 cursor-pointer" onClick={() => setLessonStatus(sortTable(lessonStatus, 'completed_lessons'))}>
                    Completed Lessons {sortConfig.key === 'completed_lessons' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="border px-4 py-2 cursor-pointer" onClick={() => setLessonStatus(sortTable(lessonStatus, 'completion_rate'))}>
                    Completion Rate (%) {sortConfig.key === 'completion_rate' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {lessonStatus.map((status, index) => (
                  <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}>
                    <td className="border px-4 py-2">{status.student_class}</td>
                    <td className="border px-4 py-2">{status.planned_lessons}</td>
                    <td className="border px-4 py-2">{status.completed_lessons}</td>
                    <td className="border px-4 py-2">{status.completion_rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No lesson status data for selected month.</p>
          )
        )}
      </div>

      {/* School-Wise Lesson Distribution */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">School-Wise Lesson Distribution</h2>
          <button
            onClick={() => toggleSection('schoolLessons')}
            className="text-blue-600 hover:text-blue-800"
            aria-label={collapsedSections.schoolLessons ? 'Expand School Lessons' : 'Collapse School Lessons'}
          >
            {collapsedSections.schoolLessons ? 'Expand ▼' : 'Collapse ▲'}
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
                  <th className="border px-4 py-2 cursor-pointer" onClick={() => setSchoolLessons(sortTable(schoolLessons, 'school_name'))}>
                    School {sortConfig.key === 'school_name' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="border px-4 py-2 cursor-pointer" onClick={() => setSchoolLessons(sortTable(schoolLessons, 'total_lessons'))}>
                    Total Lessons {sortConfig.key === 'total_lessons' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="border px-4 py-2">Classes Covered</th>
                </tr>
              </thead>
              <tbody>
                {schoolLessons.map((summary, index) => (
                  <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}>
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

      {/* Student Engagement */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Student Engagement (Image Uploads)</h2>
          <button
            onClick={() => toggleSection('engagement')}
            className="text-blue-600 hover:text-blue-800"
            aria-label={collapsedSections.engagement ? 'Expand Engagement' : 'Collapse Engagement'}
          >
            {collapsedSections.engagement ? 'Expand ▼' : 'Collapse ▲'}
          </button>
        </div>
        {!collapsedSections.engagement && (
          loading.engagement ? (
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : engagement.length > 0 ? (
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2 cursor-pointer" onClick={() => setEngagement(sortTable(engagement, 'student_class'))}>
                    Class {sortConfig.key === 'student_class' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="border px-4 py-2 cursor-pointer" onClick={() => setEngagement(sortTable(engagement, 'image_count'))}>
                    Images Uploaded {sortConfig.key === 'image_count' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="border px-4 py-2 cursor-pointer" onClick={() => setEngagement(sortTable(engagement, 'student_count'))}>
                    Students Involved {sortConfig.key === 'student_count' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {engagement.map((summary, index) => (
                  <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}>
                    <td className="border px-4 py-2">{summary.student_class}</td>
                    <td className="border px-4 py-2">{summary.image_count}</td>
                    <td className="border px-4 py-2">{summary.student_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No engagement data for selected month.</p>
          )
        )}
      </div>

      {/* Student Data Reports */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Student Data Reports</h2>
          <button
            onClick={() => toggleSection('studentData')}
            className="text-blue-600 hover:text-blue-800"
            aria-label={collapsedSections.studentData ? 'Expand Student Data' : 'Collapse Student Data'}
          >
            {collapsedSections.studentData ? 'Expand ▼' : 'Collapse ▲'}
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
              <h3 className="text-lg font-semibold mb-2">Student Performance Chart</h3>
              <canvas id="studentDataChart" className="max-w-full"></canvas>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Student Performance Table</h3>
              {loading.studentData ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : studentAttendance.length > 0 ? (
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-4 py-2 cursor-pointer" onClick={() => setStudentAttendance(sortTable(studentAttendance, 'student_id'))}>
                        Student ID {sortConfig.key === 'student_id' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="border px-4 py-2 cursor-pointer" onClick={() => setStudentAttendance(sortTable(studentAttendance, 'name'))}>
                        Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="border px-4 py-2 bg-blue-100 cursor-pointer" onClick={() => setStudentAttendance(sortTable(studentAttendance, 'present'))}>
                        Present {sortConfig.key === 'present' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="border px-4 py-2 bg-blue-100 cursor-pointer" onClick={() => setStudentAttendance(sortTable(studentAttendance, 'absent'))}>
                        Absent {sortConfig.key === 'absent' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="border px-4 py-2 bg-blue-100 cursor-pointer" onClick={() => setStudentAttendance(sortTable(studentAttendance, 'not_marked'))}>
                        Not Marked {sortConfig.key === 'not_marked' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="border px-4 py-2 bg-green-100">Topics Achieved</th>
                      <th className="border px-4 py-2 bg-yellow-100">Images Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentAttendance.map((attendance, index) => {
                      const topic = studentTopics.find((t) => t.student_id === attendance.student_id) || { topics_achieved: 0 };
                      const image = studentImages.find((i) => i.student_id === attendance.student_id) || { images_uploaded: 0 };
                      return (
                        <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}>
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