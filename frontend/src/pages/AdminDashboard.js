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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

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

  const processFeeData = (data, schools = []) => {
    console.log("Raw Fee Data:", data);
    console.log("Schools Data:", schools);
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn("No valid fee data provided");
      return [];
    }

    // Fallback school mapping
    const defaultSchoolMap = {
      3: "School A",
      5: "School B"
    };

    const schoolMap = schools.length > 0
      ? schools.reduce((acc, school) => {
          acc[school.id] = school.name || `School ${school.id}`;
          return acc;
        }, {})
      : defaultSchoolMap;

    const months = Array.from(new Set(data.map(entry => entry.month || "Unknown"))).slice(-3);
    const schoolTotals = {};
    data.forEach(entry => {
      const schoolId = entry.school;
      const schoolName = schoolMap[schoolId] || `School ${schoolId}`;
      const total_fee = Number(entry.total_fee) || 0;
      if (!schoolTotals[schoolName]) {
        schoolTotals[schoolName] = 0;
      }
      schoolTotals[schoolName] += total_fee;
    });

    const topSchools = Object.keys(schoolTotals)
      .filter(school => schoolTotals[school] > 0)
      .sort((a, b) => schoolTotals[b] - schoolTotals[a])
      .slice(0, 3);

    const chartData = months.map(month => {
      const row = { month };
      topSchools.forEach(school => {
        const entry = data.find(e => (schoolMap[e.school] || `School ${e.school}`) === school && e.month === month);
        row[school] = entry ? Number(entry.total_fee) || 0 : 0;
      });
      return row;
    });

    console.log("Processed Fee Data:", chartData);
    return chartData;
  };

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

        console.log("Fee Data Response:", feeRes.data);
        console.log("Schools Response:", schoolsRes.data);
        setStudentsData(studentsRes.data);
        setFeeData(processFeeData(feeRes.data, schoolsRes.data));
        setRegistrations(registrationsRes.data);
        setSchools(schoolsRes.data);
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
    <div className="flex">
      <div className="w-full p-0 bg-gray-100 min-h-screen">
        <header className="bg-white text-black py-3 flex items-center justify-between px-2 mb-6 shadow-md">
          <div className="flex items-center">
            <img src="/logo.png" alt="Koder Kids Logo" className="h-12 w-auto mr-2" />
            <h1 className="heading-primary">Koder Kids Admin Dashboard</h1>
          </div>
        </header>

        <div className="flex flex-wrap justify-center gap-6 w-full mb-6">
          {/* Students Per School (Treemap) */}
          <div className="w-full md:w-1/2 border p-4 rounded-lg shadow-md bg-white mb-6">
            <h2 className="text-xl font-semibold mb-3 text-gray-700 text-center">Students Enrolled Per School</h2>
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={400}>
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
            </div>
          </div>

          {/* Fee Received Per Month (Bar Chart) */}
          <div className="w-full md:w-1/2 border p-4 rounded bg-white shadow-md">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">Top 3 Schools - Fee Collection (Last 3 Months)</h2>
            {feeData.length > 0 && Object.keys(feeData[0]).length > 1 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={feeData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `PKR ${value.toLocaleString()}`} />
                  <Legend />
                  {Object.keys(feeData[0]).filter(key => key !== "month").map((school, index) => (
                    <Bar key={index} dataKey={school} fill={["#8884d8", "#82ca9d", "#ffbb28"][index % 3]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center">No Fee Data Available</p>
            )}
          </div>
        </div>

        {/* New Registrations (Summarized Table) */}
        <div className="border p-4 m-0 rounded-lg shadow-md bg-white">
          <h2 className="text-xl font-semibold mb-3 text-gray-700">New Registrations by School</h2>
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
                        className="border p-3 text-center cursor-pointer"
                        onClick={() => sortData("school")}
                      >
                        School {sortConfig.key === "school" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        className="border p-3 text-center cursor-pointer"
                        onClick={() => sortData("count")}
                      >
                        Number of Admissions {sortConfig.key === "count" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.length > 0 ? (
                      sortedData.map((entry, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-gray-200" : "bg-gray-50"}>
                          <td className="border p-3 text-center">{entry.school}</td>
                          <td className="border p-3 text-center">{entry.count}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="border p-4 text-center text-gray-500 italic" colSpan="2">
                          No New Registrations Available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;