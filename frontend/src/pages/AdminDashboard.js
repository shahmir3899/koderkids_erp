import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

//import Sidebar from "../components/Sidebar";  // ✅ Import Sidebar


console.log("API URL:", process.env.REACT_APP_API_URL);
//console.log("API Response:", studentsData);



function HomePage() {
    const [studentsData, setStudentsData] = useState([]);
    const [feeData, setFeeData] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
        Promise.all([
            fetch(`${process.env.REACT_APP_API_URL}/api/students-per-school/`, {
                headers: {
                    "ngrok-skip-browser-warning": "true"
                }
            }) // ✅ Use REACT_APP_API_URL

                .then((res) => {
                    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                    return res.json();
                })
                .then((data) => setStudentsData(data))
                .catch((error) => console.error("❌ Error fetching students:", error)),
    
                fetch(`${process.env.REACT_APP_API_URL}/api/fee-per-month/`, {
                    headers: {
                        "ngrok-skip-browser-warning": "true"
                }}) // ✅ Use REACT_APP_API_URL
                .then((res) => {
                    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                    return res.json();
                })
                .then((data) => {
                    const processedData = processFeeData(data);
                    setFeeData(processedData);
                })
                .catch((error) => console.error("❌ Error fetching fees:", error)),
            
    
                fetch(`${process.env.REACT_APP_API_URL}/api/new-registrations/`, {
                headers: {
                    "ngrok-skip-browser-warning": "true"
                }
            })
                .then((res) => {
                    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                    return res.json();
                })
                .then((data) => setRegistrations(data))
                .catch((error) => console.error("❌ Error fetching registrations:", error))
        ])
        .finally(() => setLoading(false)); // ✅ Set loading to false once all requests finish
    }, []);
    
    

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    if (error) {
        return <div className="p-6 text-red-500">Error: {error}</div>;
    }

    return (
        <div className="flex">
            {/* Sidebar Navigation */}
            {/* ✅ Use Sidebar Component Instead of Hardcoded Sidebar */}
        
            
            {/* Main Content */}
            <div className="w-full p-0 bg-gray-100 min-h-screen">
                <header className="bg-white text-black py-3 flex items-center justify-between px-2 mb-6 shadow-md">

                    <div className="flex items-center">
                        <img src="/logo.png" alt="Koder Kids Logo" className="h-12 w-auto mr-2" />
                        <h1 className="text-2xl font-bold ">Koder Kids Dashboard</h1>
                    </div>
                </header>
    
                <div className="flex flex-wrap justify-center gap-6 w-full mb-6">
    {/* Students Per School (Pie Chart) */}
    <div className="w-full md:w-1/2 border p-4 rounded-lg shadow-md bg-white mb-6">
        <h2 className="text-xl font-semibold mb-3 text-gray-700 text-center">Students Enrolled Per School</h2>
        <div className="flex justify-center">
            <PieChart width={400} height={400}>
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
                <Tooltip />
                <Legend />
            </PieChart>
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
                    <Tooltip />
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
                <div className="border p-0 m=0 rounded-lg shadow-md bg-white">
                    <h2 className="text-xl font-semibold mb-3 text-gray-700">New Registrations</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse border bg-gray-100 text-gray-700">
                            <thead className="bg-gray-300 text-gray-800">
                                <tr>
                                    <th className="border p-3 text-center">ID</th>
                                    <th className="border p-3 text-center">Student Name</th>
                                    <th className="border p-3 text-center">School</th>
                                    <th className="border p-3 text-center">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrations.length > 0 ? (
                                    registrations.map((student, index) => (
                                        <tr key={index} className={index % 2 === 0 ? "bg-gray-200" : "bg-gray-50"}>
                                            <td className="border p-3 text-center">{student.id}</td>
                                            <td className="border p-3 text-center">{student.name}</td>
                                            <td className="border p-3 text-center">{student.school}</td>
                                            <td className="border p-3 text-center">{student.date_of_registration}</td>
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