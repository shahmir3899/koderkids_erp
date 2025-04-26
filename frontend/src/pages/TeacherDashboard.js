import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import ClipLoader from 'react-spinners/ClipLoader';
import moment from 'moment';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://koderkids-erp.onrender.com';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
});

const TeacherDashboard = () => {
  const [user, setUser] = useState(null);
  const [todayLessons, setTodayLessons] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [monthlyLessons, setMonthlyLessons] = useState([]);
  const [upcomingLessons, setUpcomingLessons] = useState([]);
  const [lessonStatus, setLessonStatus] = useState([]);
  const [schoolLessons, setSchoolLessons] = useState([]);
  const [engagement, setEngagement] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState({
    user: false,
    todayLessons: false,
    monthlyLessons: false,
    upcomingLessons: false,
    lessonStatus: false,
    schoolLessons: false,
    engagement: false,
    schools: false,
    studentData: false,
  });

  // State for new section
  const [selectedReportMonth, setSelectedReportMonth] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses] = useState([]);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [studentTopics, setStudentTopics] = useState([]);
  const [studentImages, setStudentImages] = useState([]);

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
      // Remove duplicates by converting to Set and back to array
      const uniqueClasses = [...new Set(response.data)];
      setClasses(uniqueClasses);
    } catch (error) {
      toast.error('Failed to fetch classes');
    }
  };

  // Fetch today's lessons
  const fetchTodayLessons = async () => {
    setLoading((prev) => ({ ...prev, todayLessons: true }));
    try {
      const response = await axios.get(`${API_BASE_URL}/api/teacher-dashboard-lessons/`, {
        headers: getAuthHeaders(),
      });
      setTodayLessons(response.data.lessons || []);
    } catch (error) {
      toast.error('Failed to fetch today’s lessons');
    }
    setLoading((prev) => ({ ...prev, todayLessons: false }));
  };

  // Generic fetch function for summaries
  const fetchSummary = async (endpoint, setter, key) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const url = selectedMonth && endpoint !== '/api/teacher-upcoming-lessons/'
        ? `${API_BASE_URL}${endpoint}?month=${selectedMonth}`
        : `${API_BASE_URL}${endpoint}`;
      const response = await axios.get(url, { headers: getAuthHeaders() });
      setter(endpoint === '/api/teacher-upcoming-lessons/' ? response.data.lessons : response.data);
    } catch (error) {
      toast.error(`Failed to fetch ${key}`);
    }
    setLoading((prev) => ({ ...prev, [key]: false }));
  };

  // Fetch student data for new section
  const fetchStudentData = async () => {
    if (!selectedReportMonth || !selectedSchoolId || !selectedClass) {
      toast.error('Please select month, school, and class');
      return;
    }

    setLoading((prev) => ({ ...prev, studentData: true }));
    try {
      const params = `month=${selectedReportMonth}&school_id=${selectedSchoolId}&student_class=${selectedClass}`;
      
      // Fetch attendance counts
      const attendanceResponse = await axios.get(
        `${API_BASE_URL}/api/student-attendance-counts/?${params}`,
        { headers: getAuthHeaders() }
      );
      setStudentAttendance(attendanceResponse.data);

      // Fetch achieved topics count
      const topicsResponse = await axios.get(
        `${API_BASE_URL}/api/student-achieved-topics-count/?${params}`,
        { headers: getAuthHeaders() }
      );
      setStudentTopics(topicsResponse.data);

      // Fetch image uploads count
      const imagesResponse = await axios.get(
        `${API_BASE_URL}/api/student-image-uploads-count/?${params}`,
        { headers: getAuthHeaders() }
      );
      setStudentImages(imagesResponse.data);
    } catch (error) {
      toast.error('Failed to fetch student data');
    }
    setLoading((prev) => ({ ...prev, studentData: false }));
  };

  // Fetch initial data
  useEffect(() => {
    fetchUser();
    fetchSchools();
    fetchTodayLessons();
    fetchSummary('/api/teacher-upcoming-lessons/', setUpcomingLessons, 'upcomingLessons');
  }, []);

  // Fetch summaries when month changes
  useEffect(() => {
    if (!selectedMonth) return;
    fetchSummary('/api/teacher-lessons-by-month/', setMonthlyLessons, 'monthlyLessons');
    fetchSummary('/api/teacher-lesson-status/', setLessonStatus, 'lessonStatus');
    fetchSummary('/api/teacher-lessons-by-school/', setSchoolLessons, 'schoolLessons');
    fetchSummary('/api/teacher-student-engagement/', setEngagement, 'engagement');
  }, [selectedMonth]);

  // Fetch classes when school changes
  useEffect(() => {
    fetchClasses(selectedSchoolId);
  }, [selectedSchoolId]);

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-md mb-6">
        <h1 className="text-2xl font-bold">
          {loading.user ? 'Loading...' : `Welcome, ${user?.username || 'Teacher'}`}
        </h1>
        <p>Role: {user?.role || 'Loading...'}</p>
      </div>

      {/* Today's Lessons */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Today's Lessons</h2>
        {loading.todayLessons ? (
          <div className="flex justify-center">
            <ClipLoader color="#2563eb" size={50} />
          </div>
        ) : todayLessons.length > 0 ? (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Date</th>
                <th className="border px-4 py-2">School</th>
                <th className="border px-4 py-2">Class</th>
                <th className="border px-4 py-2">Topic</th>
              </tr>
            </thead>
            <tbody>
              {todayLessons.map((lesson, index) => (
                <tr key={index}>
                  <td className="border px-4 py-2">{moment(lesson.date).format('YYYY-MM-DD')}</td>
                  <td className="border px-4 py-2">{lesson.school_name}</td>
                  <td className="border px-4 py-2">{lesson.class_name}</td>
                  <td className="border px-4 py-2">{lesson.topic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">No lessons for today.</p>
        )}
      </div>

      {/* Month Selector */}
      <div className="mb-4">
        <label htmlFor="month" className="block text-lg font-semibold mb-2">
          Select Month for Summaries
        </label>
        <input
          type="month"
          id="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="p-2 border rounded-md w-full max-w-xs"
          aria-label="Select month for lesson summaries"
        />
      </div>

      {/* Monthly Lessons Summary */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Monthly Lessons by Class</h2>
        {loading.monthlyLessons ? (
          <div className="flex justify-center">
            <ClipLoader color="#2563eb" size={50} />
          </div>
        ) : monthlyLessons.length > 0 ? (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Class</th>
                <th className="border px-4 py-2">School</th>
                <th className="border px-4 py-2">Lessons Planned</th>
              </tr>
            </thead>
            <tbody>
              {monthlyLessons.map((summary, index) => (
                <tr key={index}>
                  <td className="border px-4 py-2">{summary.student_class}</td>
                  <td className="border px-4 py-2">{summary.school_name}</td>
                  <td className="border px-4 py-2">{summary.lesson_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">No lessons for selected month.</p>
        )}
      </div>

      {/* Upcoming Lessons */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Upcoming Lessons (Next 7 Days)</h2>
        {loading.upcomingLessons ? (
          <div className="flex justify-center">
            <ClipLoader color="#2563eb" size={50} />
          </div>
        ) : upcomingLessons.length > 0 ? (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Date</th>
                <th className="border px-4 py-2">Class</th>
                <th className="border px-4 py-2">School</th>
                <th className="border px-4 py-2">Topic</th>
              </tr>
            </thead>
            <tbody>
              {upcomingLessons.map((lesson, index) => (
                <tr key={index}>
                  <td className="border px-4 py-2">{moment(lesson.session_date).format('YYYY-MM-DD')}</td>
                  <td className="border px-4 py-2">{lesson.class_name}</td>
                  <td className="border px-4 py-2">{lesson.school_name}</td>
                  <td className="border px-4 py-2">{lesson.topic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">No upcoming lessons.</p>
        )}
      </div>

      {/* Lesson Completion Status */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Lesson Completion Status</h2>
        {loading.lessonStatus ? (
          <div className="flex justify-center">
            <ClipLoader color="#2563eb" size={50} />
          </div>
        ) : lessonStatus.length > 0 ? (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Class</th>
                <th className="border px-4 py-2">Planned Lessons</th>
                <th className="border px-4 py-2">Completed Lessons</th>
                <th className="border px-4 py-2">Completion Rate (%)</th>
              </tr>
            </thead>
            <tbody>
              {lessonStatus.map((status, index) => (
                <tr key={index}>
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
        )}
      </div>

      {/* School-Wise Lesson Distribution */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">School-Wise Lesson Distribution</h2>
        {loading.schoolLessons ? (
          <div className="flex justify-center">
            <ClipLoader color="#2563eb" size={50} />
          </div>
        ) : schoolLessons.length > 0 ? (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">School</th>
                <th className="border px-4 py-2">Total Lessons</th>
                <th className="border px-4 py-2">Classes Covered</th>
              </tr>
            </thead>
            <tbody>
              {schoolLessons.map((summary, index) => (
                <tr key={index}>
                  <td className="border px-4 py-2">{summary.school_name}</td>
                  <td className="border px-4 py-2">{summary.total_lessons}</td>
                  <td className="border px-4 py-2">{summary.classes_covered.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">No school-wise lessons for selected month.</p>
        )}
      </div>

      {/* Student Engagement */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Student Engagement (Image Uploads)</h2>
        {loading.engagement ? (
          <div className="flex justify-center">
            <ClipLoader color="#2563eb" size={50} />
          </div>
        ) : engagement.length > 0 ? (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Class</th>
                <th className="border px-4 py-2">Images Uploaded</th>
                <th className="border px-4 py-2">Students Involved</th>
              </tr>
            </thead>
            <tbody>
              {engagement.map((summary, index) => (
                <tr key={index}>
                  <td className="border px-4 py-2">{summary.student_class}</td>
                  <td className="border px-4 py-2">{summary.image_count}</td>
                  <td className="border px-4 py-2">{summary.student_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">No engagement data for selected month.</p>
        )}
      </div>

      {/* New Section: Student Data Reports */}
      <div className="mb-8">
  <h2 className="text-xl font-semibold mb-4">Student Data Reports</h2>
  <div className="flex flex-wrap gap-4 mb-4">
    {/* Month Selector */}
    <div>
      <label htmlFor="reportMonth" className="block text-sm font-medium mb-1">
        Select Month
      </label>
      <input
        type="month"
        id="reportMonth"
        value={selectedReportMonth}
        onChange={(e) => setSelectedReportMonth(e.target.value)}
        className="p-2 border rounded-md w-full max-w-xs"
        aria-label="Select month for student data reports"
      />
    </div>

    {/* School Selector */}
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

    {/* Class Selector */}
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

    {/* Fetch Button */}
    <div className="flex items-end">
      <button
        onClick={fetchStudentData}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        disabled={loading.studentData}
      >
        {loading.studentData ? 'Loading...' : 'Fetch Student Data'}
      </button>
    </div>
  </div>

  {/* Combined Student Data Table */}
  <div className="mb-6">
    <h3 className="text-lg font-semibold mb-2">Student Performance Overview</h3>
    {loading.studentData ? (
      <div className="flex justify-center">
        <ClipLoader color="#2563eb" size={50} />
      </div>
    ) : studentAttendance.length > 0 ? (
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">Student ID</th>
            <th className="border px-4 py-2">Name</th>
            <th className="border px-4 py-2 bg-blue-100">Present</th>
            <th className="border px-4 py-2 bg-blue-100">Absent</th>
            <th className="border px-4 py-2 bg-blue-100">Not Marked</th>
            <th className="border px-4 py-2 bg-green-100">Topics Achieved</th>
            <th className="border px-4 py-2 bg-yellow-100">Images Uploaded</th>
          </tr>
        </thead>
        <tbody>
          {studentAttendance.map((attendance, index) => {
            const topic = studentTopics.find(t => t.student_id === attendance.student_id) || { topics_achieved: 0 };
            const image = studentImages.find(i => i.student_id === attendance.student_id) || { images_uploaded: 0 };
            return (
              <tr key={index}>
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
</div>
    </div>
  );
};

export default TeacherDashboard;