import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Treemap, Cell } from "recharts";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import axios from "axios";

function HomePage() {
  const [studentsData, setStudentsData] = useState([]);
  const [feeData, setFeeData] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [schools, setSchools] = useState([]);
  const [feeSummary, setFeeSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
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

  // Colors for Treemap (unique for each school)
  const COLORS = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
    "#E7E9ED",
    "#C3E6CB",
    "#F06292",
    "#4DD0E1"
  ];


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

// Fetch classes when school changes
useEffect(() => {
  fetchClasses(selectedSchoolId);
}, [selectedSchoolId]);





  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [studentsRes, feeRes, registrationsRes, schoolsRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/students-per-school/`, {
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("access")}`,
              "Content-Type": "application/json"
            }
          }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/fee-per-month/`, {
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("access")}`,
              "Content-Type": "application/json"
            }
          }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/new-registrations/`, {
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("access")}`,
              "Content-Type": "application/json"
            }
          }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/schools/`, {
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("access")}`,
              "Content-Type": "application/json"
            }
          })
        ]);

        if (!studentsRes.data || !Array.isArray(studentsRes.data)) throw new Error("Invalid students data");
        if (!feeRes.data || !Array.isArray(feeRes.data)) throw new Error("Invalid fee data");
        if (!registrationsRes.data || !Array.isArray(registrationsRes.data)) throw new Error("Invalid registrations data");
        if (!schoolsRes.data || !Array.isArray(schoolsRes.data)) throw new Error("Invalid schools data");

        setStudentsData(studentsRes.data);
        setFeeData(processFeeData(feeRes.data, schoolsRes.data));
        setRegistrations(registrationsRes.data);
        setSchools(schoolsRes.data);

        // Extract unique months from fee data in MMM-YYYY format
        const uniqueMonths = Array.from(new Set(feeRes.data.map(entry => entry.month || "Unknown")))
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

        // Set default month to the most recent month in MMM-YYYY format
        const recentMonth = uniqueMonths.length > 0 ? uniqueMonths[uniqueMonths.length - 1] : "";
        setSelectedMonth(recentMonth);
      } catch (err) {
        console.error("❌ Error fetching data:", err);
        setError("Failed to fetch data. Please try again or check your authentication.");
        toast.error(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchFeeSummary = async () => {
      if (!selectedMonth) return;
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/fee-summary/`, {
          params: { month: selectedMonth }, // Already in MMM-YYYY format
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("access")}`,
            "Content-Type": "application/json"
          }
        });
        setFeeSummary(response.data);
      } catch (err) {
        console.error("❌ Error fetching fee summary:", err);
        toast.error(`Error fetching fee summary: ${err.message}`);
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

  const handleRetry = async () => {
    setIsRetrying(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRetrying(false);
    setError(null);
    setLoading(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 min-h-screen bg-gray-100">
        <ClipLoader color="#000000" size={50} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-500 flex flex-col items-center">
        <p>{error}</p>
        <button
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          onClick={handleRetry}
          disabled={isRetrying}
          aria-label="Retry fetching data"
        >
          {isRetrying ? "Retrying..." : "Retry"}
        </button>
      </div>
    );
  }

  return (
  <div className="container mx-auto p-6 bg-gray-100 min-h-screen">
    <header className="bg-blue-600 text-white p-6 rounded-lg shadow-md mb-6">
      <div className="flex items-center">
        <img src="/logo.png" alt="Koder Kids Logo" className="h-12 w-auto mr-4" />
        <h1 className="text-2xl font-bold">Koder Kids Admin Dashboard</h1>
      </div>
    </header>

    <div className="space-y-6">
      {/* Students Per School (Treemap) */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Students Enrolled Per School</h2>
          <button
            onClick={() => toggleSection("studentsPerSchool")}
            className="text-blue-600 hover:text-blue-800"
            aria-label={collapsedSections.studentsPerSchool ? "Expand Students Per School" : "Collapse Students Per School"}
          >
            {collapsedSections.studentsPerSchool ? "Expand ▼" : "Collapse ▲"}
          </button>
        </div>
        {!collapsedSections.studentsPerSchool && (
          <ResponsiveContainer width="100%" height={300}>
            <Treemap
              data={studentsData}
              dataKey="total_students"
              nameKey="school"
              ratio={4 / 3}
            >
              {studentsData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              <Tooltip formatter={(value) => `${value} students`} />
            </Treemap>
          </ResponsiveContainer>
        )}
      </div>

      {/* Fee Received Per Month (Bar Chart) */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Top 3 Schools - Fee Collection (Last 3 Months)</h2>
          <button
            onClick={() => toggleSection("feePerMonth")}
            className="text-blue-600 hover:text-blue-800"
            aria-label={collapsedSections.feePerMonth ? "Expand Fee Per Month" : "Collapse Fee Per Month"}
          >
            {collapsedSections.feePerMonth ? "Expand ▼" : "Collapse ▲"}
          </button>
        </div>
        {!collapsedSections.feePerMonth && (
          feeData.length > 0 && Object.keys(feeData[0]).length > 1 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={feeData}>
  <XAxis dataKey="month" />
  <YAxis domain={[0, 'auto']} />
  <Tooltip formatter={(value) => `PKR ${value.toLocaleString()}`} />
  <Legend />
  {[...new Set(feeData.flatMap(row => Object.keys(row).filter(key => key !== "month")))].map((school, index) => (
    <Bar key={index} dataKey={school} fill={["#8884d8", "#82ca9d", "#ffbb28", "#ff7300", "#ff4040"][index % 5]} />
  ))}
</BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center">No Fee Data Available</p>
          )
        )}
      </div>

      {/* Fee Summary by School */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Fee Summary by School</h2>
          <button
            onClick={() => toggleSection("feeSummary")}
            className="text-blue-600 hover:text-blue-800"
            aria-label={collapsedSections.feeSummary ? "Expand Fee Summary" : "Collapse Fee Summary"}
          >
            {collapsedSections.feeSummary ? "Expand ▼" : "Collapse ▲"}
          </button>
        </div>
        {!collapsedSections.feeSummary && (
          <>
            <div className="mb-4">
              <label htmlFor="month-selector" className="mr-2 text-gray-700">Select Month:</label>
              <select
                id="month-selector"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border rounded p-2"
              >
                {availableMonths.length > 0 ? (
                  availableMonths.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))
                ) : (
                  <option value="">No Months Available</option>
                )}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border bg-gray-100 text-gray-700">
                <thead className="bg-gray-300 text-gray-800">
                  <tr>
                    <th
                      className="border px-4 py-2 text-center cursor-pointer"
                      onClick={() => sortData("school_name")}
                    >
                      School {sortConfig.key === "school_name" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="border px-4 py-2 text-center cursor-pointer"
                      onClick={() => sortData("total_fee")}
                    >
                      Total Fee {sortConfig.key === "total_fee" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="border px-4 py-2 text-center cursor-pointer"
                      onClick={() => sortData("paid_amount")}
                    >
                      Received Fee {sortConfig.key === "paid_amount" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="border px-4 py-2 text-center cursor-pointer"
                      onClick={() => sortData("balance_due")}
                    >
                      Pending Fee {sortConfig.key === "balance_due" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sortedData = [...feeSummary].sort((a, b) => {
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

                    const totals = sortedData.reduce(
                      (acc, entry) => ({
                        total_fee: acc.total_fee + (Number(entry.total_fee) || 0),
                        paid_amount: acc.paid_amount + (Number(entry.paid_amount) || 0),
                        balance_due: acc.balance_due + (Number(entry.balance_due) || 0),
                      }),
                      { total_fee: 0, paid_amount: 0, balance_due: 0 }
                    );

                    return sortedData.length > 0 ? (
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
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* New Registrations */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">New Registrations by School</h2>
          <button
            onClick={() => toggleSection("newRegistrations")}
            className="text-blue-600 hover:text-blue-800"
            aria-label={collapsedSections.newRegistrations ? "Expand New Registrations" : "Collapse New Registrations"}
          >
            {collapsedSections.newRegistrations ? "Expand ▼" : "Collapse ▲"}
          </button>
        </div>
        {!collapsedSections.newRegistrations && (
          <div className="overflow-x-auto">
            {(() => {
              const summarizedData = registrations.reduce((acc, reg) => {
                const school = reg.school_name || "Unknown";
                acc[school] = (acc[school] || 0) + 1;
                return acc;
              }, {});
              const data = Object.entries(summarizedData).map(([school, count]) => ({
                school,
                count
              }));

              const sortedData = [...data].sort((a, b) => {
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

              return (
                <table className="w-full border-collapse border bg-gray-100 text-gray-700">
                  <thead className="bg-gray-300 text-gray-800">
                    <tr>
                      <th
                        className="border px-4 py-2 text-center cursor-pointer"
                        onClick={() => sortData("school")}
                      >
                        School {sortConfig.key === "school" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        className="border px-4 py-2 text-center cursor-pointer"
                        onClick={() => sortData("count")}
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
              );
            })()}
          </div>
        )}
      </div>

      {/* Student Data Reports */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Student Data Reports</h2>
          <button
            onClick={() => toggleSection("studentDataReports")}
            className="text-blue-600 hover:text-blue-800"
            aria-label={collapsedSections.studentDataReports ? "Expand Student Data Reports" : "Collapse Student Data Reports"}
          >
            {collapsedSections.studentDataReports ? "Expand ▼" : "Collapse ▲"}
          </button>
        </div>
        {!collapsedSections.studentDataReports && (
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
                  onChange={(e) => setSelectedReportMonth(e.target.value)}
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
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
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
                  onChange={(e) => setSelectedClass(e.target.value)}
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
                  onClick={fetchStudentData}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  disabled={studentDataLoading}
                >
                  {studentDataLoading ? "Loading..." : "Fetch Student Data"}
                </button>
              </div>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-gray-700">Student Performance Overview</h3>
              {studentDataLoading ? (
                <div className="flex justify-center">
                  <ClipLoader color="#000000" size={50} />
                </div>
              ) : studentAttendance.length > 0 ? (
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
                      {studentAttendance.map((attendance, index) => {
                        const topic = studentTopics.find(t => t.student_id === attendance.student_id) || { topics_achieved: 0 };
                        const image = studentImages.find(i => i.student_id === attendance.student_id) || { images_uploaded: 0 };
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
    </div>
  </div>
);
}

export default HomePage;