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
  const [loading, setLoading] = useState({
    user: false,
    todayLessons: false,
    monthlyLessons: false,
    upcomingLessons: false,
    lessonStatus: false,
    schoolLessons: false,
    engagement: false,
  });

  // Fetch logged-in user
  const fetchUser = async () => {
    setLoading((prev) => ({ ...prev, user: true }));
    try {
      const response = await axios.get(`${API_BASE_URL}/api/logged-in-user/`, {
        headers: getAuthHeaders(),
      });
      setUser(response.data);
    } catch (error) {
      toast.error('Failed to fetch user data');
    }
    setLoading((prev) => ({ ...prev, user: false }));
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

  // Fetch all summaries
  useEffect(() => {
    fetchUser();
    fetchTodayLessons();
    fetchSummary('/api/teacher-upcoming-lessons/', setUpcomingLessons, 'upcomingLessons');
  }, []);

  useEffect(() => {
    if (!selectedMonth) return;
    fetchSummary('/api/teacher-lessons-by-month/', setMonthlyLessons, 'monthlyLessons');
    fetchSummary('/api/teacher-lesson-status/', setLessonStatus, 'lessonStatus');
    fetchSummary('/api/teacher-lessons-by-school/', setSchoolLessons, 'schoolLessons');
    fetchSummary('/api/teacher-student-engagement/', setEngagement, 'engagement');
  }, [selectedMonth]);

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
    </div>
  );
};

export default TeacherDashboard;