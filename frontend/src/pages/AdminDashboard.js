import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ClipLoader } from "react-spinners"; // Import ClipLoader
import { toast } from "react-toastify"; // Import toast for notifications
import axios from "axios"; // Import axios for manual fetch handling

console.log("API URL:", process.env.REACT_APP_API_URL);

function HomePage() {
    const [studentsData, setStudentsData] = useState([]);
    const [feeData, setFeeData] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false); // State for retry loading

    const processFeeData = (data) => {
        if (!data || data.length === 0) return [];

        // Get the last 3 months dynamically
        const months = Array.from(new Set(data.map(entry => entry.month))).slice(-3);

        // Get the top 3 schools based on total fees
        const schoolTotals = {};
        data.forEach(entry => {
            if (!schoolTotals[entry.school]) {
                schoolTotals[entry.school] = 0;
            }
            schoolTotals[entry.school] += entry.total_fee;
        });

        const topSchools = Object.keys(schoolTotals)
            .sort((a, b) => schoolTotals[b] - schoolTotals[a])
            .slice(0, 3);

        // Structure data for Recharts
        const chartData = months.map(month => {
            const row = { month };
            topSchools.forEach(school => {
                row[school] = data.find(entry => entry.school === school && entry.month === month)?.total_fee || 0;
            });
            return row;
        });

        return chartData;
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [studentsRes, feeRes, registrationsRes] = await Promise.all([
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
                    })
                ]);

                if (!studentsRes.data || !Array.isArray(studentsRes.data)) throw new Error("Invalid students data");
                if (!feeRes.data || !Array.isArray(feeRes.data)) throw new Error("Invalid fee data");
                if (!registrationsRes.data || !Array.isArray(registrationsRes.data)) throw new Error("Invalid registrations data");

                setStudentsData(studentsRes.data);
                setFeeData(processFeeData(feeRes.data));
                setRegistrations(registrationsRes.data);
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

    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

const sortData = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    const sorted = [...registrations].sort((a, b) => {
        if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
        if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    setRegistrations(sorted);
    setSortConfig({ key, direction });
};
    
    const handleRetry = async () => {
        setIsRetrying(true);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
        setIsRetrying(false);
        // Retry the fetch here if needed, or call fetchData() directly
        // For now, we'll just reset the state to trigger a re-fetch
        setError(null);
        setLoading(true); // This will trigger the useEffect to run again
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
            {/* Main Content */}
            <div className="w-full p-0 bg-gray-100 min-h-screen">
                <header className="bg-white text-black py-3 flex items-center justify-between px-2 mb-6 shadow-md">
                    <div className="flex items-center">
                        <img src="/logo.png" alt="Koder Kids Logo" className="h-12 w-auto mr-2" />
                        <h1 className="heading-primary">Koder Kids Admin Dashboard</h1>
                    </div>
                </header>
    
                <div className="flex flex-wrap justify-center gap-6 w-full mb-6">
                    {/* Students Per School (Pie Chart) */}
                    <div className="w-full md:w-1/2 border p-4 rounded-lg shadow-md bg-white mb-6">
                        <h2 className="text-xl font-semibold mb-3 text-gray-700 text-center">Students Enrolled Per School</h2>
                        <div className="flex justify-center">
                        <ResponsiveContainer width="100%" height={400}>
                            <PieChart>
                                <Pie
                                    data={studentsData}
                                    dataKey="total_students"
                                    nameKey="school"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={150}
                                    fill="#8884d8"
                                    label
                                >
                                    {studentsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"][index % 4]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${value} students`} />
                                <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: '16px', paddingTop: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    </div>
    
                    {/* Fee Received Per Month (Bar Chart) */}
                    <div className="w-full md:w-1/2 border p-4 rounded bg-white shadow-md">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">Top 3 Schools - Fee Collection (Last 3 Months)</h2>
                        {feeData.length > 0 ? (
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
                            <p className="text-gray-500 text-center">No Data Available</p>
                        )}
                    </div>
                </div>
    
                {/* New Registrations */}
                <div className="border p-0 m-0 rounded-lg shadow-md bg-white">
                    <h2 className="text-xl font-semibold mb-3 text-gray-700">New Registrations</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse border bg-gray-100 text-gray-700">
                            <thead className="bg-gray-300 text-gray-800">
                                <tr>
                                    <th className="border p-3 text-center w-1/12 cursor-pointer" onClick={() => sortData('id')}>
                                        ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="border p-3 text-center w-3/12 cursor-pointer" onClick={() => sortData('name')}>
                                        Student Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="border p-3 text-center w-3/12 cursor-pointer" onClick={() => sortData('school')}>
                                        School {sortConfig.key === 'school' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="border p-3 text-center w-5/12">Date</th> {/* No sorting on Date for simplicity */}
                                </tr>
                            </thead>
                            <tbody>
                                {registrations.length > 0 ? (
                                    registrations.map((student, index) => (
                                        <tr key={index} className={index % 2 === 0 ? "bg-gray-200" : "bg-gray-50"}>
                                            <td className="border p-3 text-center w-1/12">{student.id}</td>
                                            <td className="border p-3 text-center w-3/12">{student.name}</td>
                                            <td className="border p-3 text-center w-3/12">
  {student.school_name} ({student.school})
</td>

                                            <td className="border p-3 text-center w-5/12">{student.date_of_registration}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td className="border p-4 text-center text-gray-500 italic" colSpan="4">
                                            No New Registrations Available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HomePage;