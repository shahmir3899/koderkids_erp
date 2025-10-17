import React, { useState, useEffect, useMemo, useReducer } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Treemap, Cell } from "recharts";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import axios from "axios";

/**
 * Reducer for managing data fetching states.
 * @param {Object} state - Current state.
 * @param {Object} action - Action to dispatch.
 * @returns {Object} New state.
 */
const dataReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
};

/**
 * Processes fee data for charting.
 * @param {Array} data - Raw fee data.
 * @param {Array} schools - List of schools.
 * @returns {Array} Processed chart data.
 */
const processFeeData = (data, schools = []) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.warn("No valid fee data provided");
    return [];
  }

  // Create school name mapping
  const defaultSchoolMap = { 3: "School A", 5: "School B" };
  const schoolMap = schools.length > 0
    ? schools.reduce((acc, school) => {
        acc[school.id] = school.name || `School ${school.id}`;
        return acc;
      }, {})
    : defaultSchoolMap;

  // Get last 3 months
  const today = new Date();
  const last3Months = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    last3Months.push(d.toLocaleString('default', { month: 'short' }) + '-' + d.getFullYear());
  }

  // Process data for each month
  const chartData = last3Months.map(month => {
    // Filter data for the current month
    const monthData = data.filter(entry => entry.month === month);

    // Calculate fees per school for this month
    const schoolFees = monthData.reduce((acc, entry) => {
      const schoolId = entry.school;
      const schoolName = schoolMap[schoolId] || `School ${schoolId}`;
      const total_fee = Number(entry.total_fee) || 0;
      acc[schoolName] = (acc[schoolName] || 0) + total_fee;
      return acc;
    }, {});

    // Get top 3 schools for this month, sorting by fee (desc) and school name (asc) for tiebreaker
    const topSchools = Object.entries(schoolFees)
      .map(([school, fee]) => ({ school, fee }))
      .sort((a, b) => b.fee - a.fee || a.school.localeCompare(b.school))
      .slice(0, 3)
      .map(item => item.school);

    // Build row for chart
    const row = { month };
    topSchools.forEach(school => {
      row[school] = schoolFees[school] || 0;
    });

    return row;
  });

  return chartData;
};

/**
 * Students Per School Treemap Component.
 */
const StudentsPerSchoolTreemap = ({ data, collapsed, onToggle }) => {
  const COLORS = [
    "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
    "#FF9F40", "#E7E9ED", "#C3E6CB", "#F06292", "#4DD0E1"
  ];

  const totalStudents = useMemo(() => {
    return data.reduce((sum, entry) => sum + (entry.total_students || 0), 0);
  }, [data]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-700">Students Enrolled Per School</h2>
        <button
          onClick={onToggle}
          onKeyDown={(e) => e.key === 'Enter' && onToggle()}
          className="text-blue-600 hover:text-blue-800"
          aria-label={collapsed ? "Expand Students Per School" : "Collapse Students Per School"}
        >
          {collapsed ? "Expand ▼" : "Collapse ▲"}
        </button>
      </div>
      {!collapsed && (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <Treemap
              data={data}
              dataKey="total_students"
              nameKey="school"
              ratio={4 / 3}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              <Tooltip formatter={(value) => `${value} students`} />
            </Treemap>
          </ResponsiveContainer>
          <div className="mt-4">
            <p className="text-lg font-medium text-gray-800">
              Total Number of Enrolled Students: {totalStudents.toLocaleString()}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Fee Per Month Bar Chart Component.
 */
const FeePerMonthChart = ({ data, collapsed, onToggle }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-700">Top 3 Schools - Fee Collection (Last 3 Months)</h2>
        <button
          onClick={onToggle}
          onKeyDown={(e) => e.key === 'Enter' && onToggle()}
          className="text-blue-600 hover:text-blue-800"
          aria-label={collapsed ? "Expand Fee Per Month" : "Collapse Fee Per Month"}
        >
          {collapsed ? "Expand ▼" : "Collapse ▲"}
        </button>
      </div>
      {!collapsed && (
        data.length > 0 && Object.keys(data[0]).length > 1 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.keys(data[0])
                .filter(key => key !== "month")
                .map((key, index) => (
                  <Bar key={key} dataKey={key} fill={`#${Math.floor(Math.random() * 16777215).toString(16)}`} />
                ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center">No Fee Data Available</p>
        )
      )}
    </div>
  );
};

/**
 * Fee Summary Table Component.
 */
const FeeSummaryTable = ({ data, sortConfig, onSort, selectedMonth, availableMonths, onMonthChange, collapsed, onToggle }) => {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      if (sortConfig.key === "school_name") {
        return sortConfig.direction === "asc"
          ? a.school_name.localeCompare(b.school_name)
          : b.school_name.localeCompare(a.school_name);
      }
      if (sortConfig.key === "total_fee") {
        return sortConfig.direction === "asc"
          ? a.total_fee - b.total_fee
          : b.total_fee - a.total_fee;
      }
      if (sortConfig.key === "paid_amount") {
        return sortConfig.direction === "asc"
          ? a.paid_amount - b.paid_amount
          : b.paid_amount - a.paid_amount;
      }
      if (sortConfig.key === "balance_due") {
        return sortConfig.direction === "asc"
          ? a.balance_due - b.balance_due
          : b.balance_due - a.balance_due;
      }
      return 0;
    });
  }, [data, sortConfig]);

  const totals = useMemo(() => {
    return sortedData.reduce(
      (acc, entry) => ({
        total_fee: acc.total_fee + (Number(entry.total_fee) || 0),
        paid_amount: acc.paid_amount + (Number(entry.paid_amount) || 0),
        balance_due: acc.balance_due + (Number(entry.balance_due) || 0),
      }),
      { total_fee: 0, paid_amount: 0, balance_due: 0 }
    );
  }, [sortedData]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-700">Fee Summary for Selected Month</h2>
        <button
          onClick={onToggle}
          onKeyDown={(e) => e.key === 'Enter' && onToggle()}
          className="text-blue-600 hover:text-blue-800"
          aria-label={collapsed ? "Expand Fee Summary" : "Collapse Fee Summary"}
        >
          {collapsed ? "Expand ▼" : "Collapse ▲"}
        </button>
      </div>
      {!collapsed && (
        <>
          <div className="mb-4">
            <label htmlFor="feeMonth" className="block text-sm font-medium mb-1 text-gray-700">
              Select Month
            </label>
            <select
              id="feeMonth"
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="border rounded p-2 w-full max-w-xs"
              aria-label="Select month for fee summary"
            >
              {availableMonths.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border bg-gray-100 text-gray-700">
              <thead className="bg-gray-300 text-gray-800">
                <tr>
                  <th
                    className="border px-4 py-2 text-center cursor-pointer"
                    onClick={() => onSort("school_name")}
                    onKeyDown={(e) => e.key === 'Enter' && onSort("school_name")}
                    tabIndex={0}
                    aria-sort={sortConfig.key === "school_name" ? sortConfig.direction : 'none'}
                  >
                    School {sortConfig.key === "school_name" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="border px-4 py-2 text-center cursor-pointer"
                    onClick={() => onSort("total_fee")}
                    onKeyDown={(e) => e.key === 'Enter' && onSort("total_fee")}
                    tabIndex={0}
                    aria-sort={sortConfig.key === "total_fee" ? sortConfig.direction : 'none'}
                  >
                    Total Fee {sortConfig.key === "total_fee" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="border px-4 py-2 text-center cursor-pointer"
                    onClick={() => onSort("paid_amount")}
                    onKeyDown={(e) => e.key === 'Enter' && onSort("paid_amount")}
                    tabIndex={0}
                    aria-sort={sortConfig.key === "paid_amount" ? sortConfig.direction : 'none'}
                  >
                    Paid Amount {sortConfig.key === "paid_amount" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="border px-4 py-2 text-center cursor-pointer"
                    onClick={() => onSort("balance_due")}
                    onKeyDown={(e) => e.key === 'Enter' && onSort("balance_due")}
                    tabIndex={0}
                    aria-sort={sortConfig.key === "balance_due" ? sortConfig.direction : 'none'}
                  >
                    Balance Due {sortConfig.key === "balance_due" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.length > 0 ? (
                  <>
                    {sortedData.map((entry, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-gray-200 hover:bg-gray-100" : "bg-gray-50 hover:bg-gray-100"}>
                        <td className="border px-4 py-2 text-center">{entry.school_name}</td>
                        <td className="border px-4 py-2 text-center">PKR {entry.total_fee.toLocaleString()}</td>
                        <td className="border px-4 py-2 text-center">PKR {entry.paid_amount.toLocaleString()}</td>
                        <td className="border px-4 py-2 text-center">PKR {entry.balance_due.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-300 font-bold">
                      <td className="border px-4 py-2 text-center">Total</td>
                      <td className="border px-4 py-2 text-center">PKR {totals.total_fee.toLocaleString()}</td>
                      <td className="border px-4 py-2 text-center">PKR {totals.paid_amount.toLocaleString()}</td>
                      <td className="border px-4 py-2 text-center">PKR {totals.balance_due.toLocaleString()}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td className="border px-4 py-2 text-center text-gray-500 italic" colSpan="4">
                      No Fee Summary Available for {selectedMonth}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * New Registrations Table Component.
 */
const NewRegistrationsTable = ({ data, sortConfig, onSort, collapsed, onToggle }) => {
  const summarizedData = useMemo(() => {
    return data.reduce((acc, reg) => {
      const school = reg.school_name || "Unknown";
      acc[school] = (acc[school] || 0) + 1;
      return acc;
    }, {});
  }, [data]);

  const tableData = useMemo(() => {
    return Object.entries(summarizedData).map(([school, count]) => ({
      school,
      count
    }));
  }, [summarizedData]);

  const sortedData = useMemo(() => {
    return [...tableData].sort((a, b) => {
      if (sortConfig.key === "count") {
        return sortConfig.direction === "asc" ? a.count - b.count : b.count - a.count;
      }
      if (sortConfig.key === "school") {
        return sortConfig.direction === "asc"
          ? a.school.localeCompare(b.school)
          : b.school.localeCompare(a.school);
      }
      return 0;
    });
  }, [tableData, sortConfig]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-700">New Registrations by School</h2>
        <button
          onClick={onToggle}
          onKeyDown={(e) => e.key === 'Enter' && onToggle()}
          className="text-blue-600 hover:text-blue-800"
          aria-label={collapsed ? "Expand New Registrations" : "Collapse New Registrations"}
        >
          {collapsed ? "Expand ▼" : "Collapse ▲"}
        </button>
      </div>
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border bg-gray-100 text-gray-700">
            <thead className="bg-gray-300 text-gray-800">
              <tr>
                <th
                  className="border px-4 py-2 text-center cursor-pointer"
                  onClick={() => onSort("school")}
                  onKeyDown={(e) => e.key === 'Enter' && onSort("school")}
                  tabIndex={0}
                  aria-sort={sortConfig.key === "school" ? sortConfig.direction : 'none'}
                >
                  School {sortConfig.key === "school" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="border px-4 py-2 text-center cursor-pointer"
                  onClick={() => onSort("count")}
                  onKeyDown={(e) => e.key === 'Enter' && onSort("count")}
                  tabIndex={0}
                  aria-sort={sortConfig.key === "count" ? sortConfig.direction : 'none'}
                >
                  Number of Admissions {sortConfig.key === "count" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length > 0 ? (
                sortedData.map((entry, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-gray-200 hover:bg-gray-100" : "bg-gray-50 hover:bg-gray-100"}>
                    <td className="border px-4 py-2 text-center">{entry.school}</td>
                    <td className="border px-4 py-2 text-center">{entry.count}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="border px-4 py-2 text-center text-gray-500 italic" colSpan="2">
                    No New Registrations Available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/**
 * Student Data Reports Component.
 */
const StudentDataReports = ({ 
  selectedReportMonth, 
  onMonthChange, 
  selectedSchoolId, 
  onSchoolChange, 
  schools, 
  selectedClass, 
  onClassChange, 
  classes, 
  onFetchData, 
  loading, 
  attendance, 
  topics, 
  images, 
  collapsed, 
  onToggle 
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-700">Student Data Reports</h2>
        <button
          onClick={onToggle}
          onKeyDown={(e) => e.key === 'Enter' && onToggle()}
          className="text-blue-600 hover:text-blue-800"
          aria-label={collapsed ? "Expand Student Data Reports" : "Collapse Student Data Reports"}
        >
          {collapsed ? "Expand ▼" : "Collapse ▲"}
        </button>
      </div>
      {!collapsed && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label htmlFor="reportMonth" className="block text-sm font-medium mb-1 text-gray-700">
                Select Month
              </label>
              <input
                type="month"
                id="reportMonth"
                value={selectedReportMonth}
                onChange={(e) => onMonthChange(e.target.value)}
                className="border rounded p-2 w-full max-w-xs"
                aria-label="Select month for student data reports"
              />
            </div>
            <div>
              <label htmlFor="schoolId" className="block text-sm font-medium mb-1 text-gray-700">
                Select School
              </label>
              <select
                id="schoolId"
                value={selectedSchoolId}
                onChange={(e) => onSchoolChange(e.target.value)}
                className="border rounded p-2 w-full max-w-xs"
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
              <label htmlFor="studentClass" className="block text-sm font-medium mb-1 text-gray-700">
                Select Class
              </label>
              <select
                id="studentClass"
                value={selectedClass}
                onChange={(e) => onClassChange(e.target.value)}
                className="border rounded p-2 w-full max-w-xs"
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
                onClick={onFetchData}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                disabled={loading}
              >
                {loading ? "Loading..." : "Fetch Student Data"}
              </button>
            </div>
          </div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">Student Performance Overview</h3>
            {loading ? (
              <div className="flex justify-center">
                <ClipLoader color="#000000" size={50} />
              </div>
            ) : attendance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border bg-gray-100 text-gray-700">
                  <thead className="bg-gray-300 text-gray-800">
                    <tr>
                      <th className="border px-4 py-2 text-center">Student ID</th>
                      <th className="border px-4 py-2 text-center">Name</th>
                      <th className="border px-4 py-2 text-center bg-blue-100">Present</th>
                      <th className="border px-4 py-2 text-center bg-blue-100">Absent</th>
                      <th className="border px-4 py-2 text-center bg-blue-100">Not Marked</th>
                      <th className="border px-4 py-2 text-center bg-green-100">Topics Achieved</th>
                      <th className="border px-4 py-2 text-center bg-yellow-100">Images Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((attendance, index) => {
                      const topic = topics.find(t => t.student_id === attendance.student_id) || { topics_achieved: 0 };
                      const image = images.find(i => i.student_id === attendance.student_id) || { images_uploaded: 0 };
                      return (
                        <tr key={index} className={index % 2 === 0 ? "bg-gray-200 hover:bg-gray-100" : "bg-gray-50 hover:bg-gray-100"}>
                          <td className="border px-4 py-2 text-center">{attendance.student_id}</td>
                          <td className="border px-4 py-2 text-center">{attendance.name}</td>
                          <td className="border px-4 py-2 text-center bg-blue-50">{attendance.present}</td>
                          <td className="border px-4 py-2 text-center bg-blue-50">{attendance.absent}</td>
                          <td className="border px-4 py-2 text-center bg-blue-50">{attendance.not_marked}</td>
                          <td className="border px-4 py-2 text-center bg-green-50">{topic.topics_achieved}</td>
                          <td className="border px-4 py-2 text-center bg-yellow-50">{image.images_uploaded}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center">No student data available.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

function HomePage() {
  const [studentsState, studentsDispatch] = useReducer(dataReducer, { loading: true, error: null, data: [] });
  const [feeState, feeDispatch] = useReducer(dataReducer, { loading: true, error: null, data: [] });
  const [registrationsState, registrationsDispatch] = useReducer(dataReducer, { loading: true, error: null, data: [] });
  const [schoolsState, schoolsDispatch] = useReducer(dataReducer, { loading: true, error: null, data: [] });
  const [feeSummaryState, feeSummaryDispatch] = useReducer(dataReducer, { loading: false, error: null, data: [] });

  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedMonth, setSelectedMonth] = useState("");
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedReportMonth, setSelectedReportMonth] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [classes, setClasses] = useState([]);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [studentTopics, setStudentTopics] = useState([]);
  const [studentImages, setStudentImages] = useState([]);
  const [studentDataLoading, setStudentDataLoading] = useState(false);

  const [collapsedSections, setCollapsedSections] = useState({
    studentsPerSchool: false,
    feePerMonth: false,
    feeSummary: false,
    newRegistrations: false,
    studentDataReports: false,
  });

  const toggleSection = (section) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Fetch classes for selected school
  const fetchClasses = async (schoolId) => {
    if (!schoolId) return;
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/classes/?school=${schoolId}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access")}`,
          "Content-Type": "application/json"
        }
      });
      // Remove duplicates by converting to Set and back to array
      const uniqueClasses = [...new Set(response.data)];
      setClasses(uniqueClasses);
    } catch (error) {
      toast.error("Failed to fetch classes");
    }
  };

  // Fetch student data for reports
  const fetchStudentData = async () => {
    if (!selectedReportMonth || !selectedSchoolId || !selectedClass) {
      toast.error("Please select month, school, and class");
      return;
    }

    setStudentDataLoading(true);
    try {
      const params = `month=${selectedReportMonth}&school_id=${selectedSchoolId}&student_class=${selectedClass}`;

      // Fetch attendance counts
      const attendanceResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/student-attendance-counts/?${params}`,
        {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("access")}`,
            "Content-Type": "application/json"
          }
        }
      );
      setStudentAttendance(attendanceResponse.data);

      // Fetch achieved topics count
      const topicsResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/student-achieved-topics-count/?${params}`,
        {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("access")}`,
            "Content-Type": "application/json"
          }
        }
      );
      setStudentTopics(topicsResponse.data);

      // Fetch image uploads count
      const imagesResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/student-image-uploads-count/?${params}`,
        {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("access")}`,
            "Content-Type": "application/json"
          }
        }
      );
      setStudentImages(imagesResponse.data);
    } catch (error) {
      toast.error("Failed to fetch student data");
    }
    setStudentDataLoading(false);
  };

  useEffect(() => {
    fetchClasses(selectedSchoolId);
  }, [selectedSchoolId]);

  useEffect(() => {
    const fetchInitialData = async () => {
      studentsDispatch({ type: 'FETCH_START' });
      feeDispatch({ type: 'FETCH_START' });
      registrationsDispatch({ type: 'FETCH_START' });
      schoolsDispatch({ type: 'FETCH_START' });

      try {
        const [studentsRes, feeRes, registrationsRes, schoolsRes] = await Promise.allSettled([
          axios.get(`${process.env.REACT_APP_API_URL}/api/students-per-school/`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("access")}`, "Content-Type": "application/json" }
          }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/fee-per-month/`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("access")}`, "Content-Type": "application/json" }
          }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/new-registrations/`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("access")}`, "Content-Type": "application/json" }
          }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/schools/`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("access")}`, "Content-Type": "application/json" }
          })
        ]);

        if (studentsRes.status === 'fulfilled') {
          if (!studentsRes.value.data || !Array.isArray(studentsRes.value.data)) throw new Error("Invalid students data");
          studentsDispatch({ type: 'FETCH_SUCCESS', payload: studentsRes.value.data });
        } else {
          studentsDispatch({ type: 'FETCH_ERROR', error: studentsRes.reason.message });
          toast.error(`Students data error: ${studentsRes.reason.message}`);
        }

        if (feeRes.status === 'fulfilled') {
          if (!feeRes.value.data || !Array.isArray(feeRes.value.data)) throw new Error("Invalid fee data");
          const processedFee = processFeeData(feeRes.value.data, schoolsRes.value?.data || []);
          feeDispatch({ type: 'FETCH_SUCCESS', payload: processedFee });

          // Extract unique months
          const uniqueMonths = Array.from(new Set(feeRes.value.data.map(entry => entry.month || "Unknown")))
            .filter(month => month !== "Unknown")
            .sort((a, b) => {
              const [monthA, yearA] = a.split('-');
              const [monthB, yearB] = b.split('-');
              if (yearA === yearB) {
                return new Date(`${monthA} 1, ${yearA}`) - new Date(`${monthB} 1, ${yearB}`);
              }
              return yearA - yearB;
            });
          setAvailableMonths(uniqueMonths);
          const recentMonth = uniqueMonths.length > 0 ? uniqueMonths[uniqueMonths.length - 1] : "";
          setSelectedMonth(recentMonth);
        } else {
          feeDispatch({ type: 'FETCH_ERROR', error: feeRes.reason.message });
          toast.error(`Fee data error: ${feeRes.reason.message}`);
        }

        if (registrationsRes.status === 'fulfilled') {
          if (!registrationsRes.value.data || !Array.isArray(registrationsRes.value.data)) throw new Error("Invalid registrations data");
          registrationsDispatch({ type: 'FETCH_SUCCESS', payload: registrationsRes.value.data });
        } else {
          registrationsDispatch({ type: 'FETCH_ERROR', error: registrationsRes.reason.message });
          toast.error(`Registrations data error: ${registrationsRes.reason.message}`);
        }

        if (schoolsRes.status === 'fulfilled') {
          if (!schoolsRes.value.data || !Array.isArray(schoolsRes.value.data)) throw new Error("Invalid schools data");
          schoolsDispatch({ type: 'FETCH_SUCCESS', payload: schoolsRes.value.data });
        } else {
          schoolsDispatch({ type: 'FETCH_ERROR', error: schoolsRes.reason.message });
          toast.error(`Schools data error: ${schoolsRes.reason.message}`);
        }
      } catch (err) {
        // Global error if needed
        toast.error(`General error: ${err.message}`);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchFeeSummary = async () => {
      if (!selectedMonth) return;
      feeSummaryDispatch({ type: 'FETCH_START' });
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/fee-summary/`, {
          params: { month: selectedMonth },
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("access")}`,
            "Content-Type": "application/json"
          }
        });
        feeSummaryDispatch({ type: 'FETCH_SUCCESS', payload: response.data });
      } catch (err) {
        let errorMessage = "Failed to fetch fee summary";
        if (err.response?.status === 401) {
          errorMessage = "Authentication failed. Please log in again.";
        } else if (err.message) {
          errorMessage += `: ${err.message}`;
        }
        feeSummaryDispatch({ type: 'FETCH_ERROR', error: errorMessage });
        toast.error(errorMessage);
      }
    };

    fetchFeeSummary();
  }, [selectedMonth]);

  const sortData = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const isLoading = studentsState.loading || feeState.loading || registrationsState.loading || schoolsState.loading;
  const hasError = studentsState.error || feeState.error || registrationsState.error || schoolsState.error;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 min-h-screen bg-gray-100">
        <ClipLoader color="#000000" size={50} />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="p-6 text-red-500 flex flex-col items-center">
        <p>Errors occurred while fetching data. Check console for details.</p>
        {/* Add per-section retry if needed */}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-gray-100 min-h-screen">
      <header className="bg-blue-600 text-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex items-center">
          <img src="/whiteLogo.png" alt="Koder Kids Logo" className="h-12 w-auto mr-4" align="center" />
          <h1 className="text-2xl font-bold">Koder Kids Admin Dashboard </h1>
        </div>
      </header>

      <div className="space-y-6">
        <StudentsPerSchoolTreemap
          data={studentsState.data}
          collapsed={collapsedSections.studentsPerSchool}
          onToggle={() => toggleSection("studentsPerSchool")}
        />

        <FeePerMonthChart
          data={feeState.data}
          collapsed={collapsedSections.feePerMonth}
          onToggle={() => toggleSection("feePerMonth")}
        />

        <FeeSummaryTable
          data={feeSummaryState.data}
          sortConfig={sortConfig}
          onSort={sortData}
          selectedMonth={selectedMonth}
          availableMonths={availableMonths}
          onMonthChange={setSelectedMonth}
          collapsed={collapsedSections.feeSummary}
          onToggle={() => toggleSection("feeSummary")}
        />

        <NewRegistrationsTable
          data={registrationsState.data}
          sortConfig={sortConfig}
          onSort={sortData}
          collapsed={collapsedSections.newRegistrations}
          onToggle={() => toggleSection("newRegistrations")}
        />

        <StudentDataReports
          selectedReportMonth={selectedReportMonth}
          onMonthChange={setSelectedReportMonth}
          selectedSchoolId={selectedSchoolId}
          onSchoolChange={setSelectedSchoolId}
          schools={schoolsState.data}
          selectedClass={selectedClass}
          onClassChange={setSelectedClass}
          classes={classes}
          onFetchData={fetchStudentData}
          loading={studentDataLoading}
          attendance={studentAttendance}
          topics={studentTopics}
          images={studentImages}
          collapsed={collapsedSections.studentDataReports}
          onToggle={() => toggleSection("studentDataReports")}
        />
      </div>
    </div>
  );
}

export default HomePage;