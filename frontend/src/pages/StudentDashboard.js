import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL, getAuthHeaders } from "../api";  // Adjust path

const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Fetch user info
    axios.get(`${API_URL}/api/user/`, { headers: getAuthHeaders() })
      .then(res => setUser(res.data))
      .catch(() => {});
    // Fetch student dashboard data
    axios.get(`${API_URL}/api/students/my-data/`, { headers: getAuthHeaders() })
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load data");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error || !data) return <div className="p-6 text-red-500">{error || "No data"}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Student Dashboard</h1>
      <h1 className="text-3xl font-bold mb-2">Welcome, {user?.fullName || "Student"}! </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-blue-50 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">School</h2>
          <p className="text-2xl">{data.school}</p>
        </div>
        <div className="p-6 bg-green-50 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Class</h2>
          <p className="text-2xl">{data.class}</p>
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold mb-4">Recent Fees (Last 10)</h2>
          <div className="overflow-x-auto">
            <table className="w-full bg-white border rounded shadow">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 text-left">Month</th>
                  <th className="p-3 text-left">Balance Due</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.fees.map((fee, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3">{fee.month}</td>
                    <td className="p-3 font-bold">PKR{fee.balance_due}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        fee.status === 'Paid' ? 'bg-green-200' : 'bg-red-200'
                      }`}>
                        {fee.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Recent Attendance (Last 30)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.attendance.map((att, i) => (
              <div key={i} className={`p-4 rounded shadow text-center ${
                att.status === 'Present' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <p className="font-bold">{att.session_date}</p>
                <p>{att.status}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default StudentDashboard;