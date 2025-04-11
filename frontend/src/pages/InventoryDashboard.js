import React, { useEffect, useState } from "react";
import axios from "axios";
import { PieChart, Pie, Tooltip, Cell } from "recharts";
import { API_URL, getAuthHeaders } from "../api";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#00c49f", "#ffbb28"];

const InventoryDashboard = () => {
  const [schoolId, setSchoolId] = useState("");
  const [schools, setSchools] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (schoolId) {
      fetchDashboard(schoolId);
    }
  }, [schoolId]);

  const fetchSchools = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/schools/`, {
        headers: getAuthHeaders(),
      });
      setSchools(res.data);
      if (res.data.length > 0) setSchoolId(res.data[0].id);
    } catch {
      alert("Failed to load schools");
    }
  };

  const fetchDashboard = async (id) => {
    try {
      const res = await axios.get(`${API_URL}/api/inventory/summary/?school=${id}`, {
        headers: getAuthHeaders(),
      });
      setStats(res.data);
    } catch {
      alert("Failed to load dashboard data");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inventory Dashboard</h1>

      <label className="block mb-2 font-medium">Select School</label>
      <select
        className="p-2 border mb-6"
        value={schoolId}
        onChange={(e) => setSchoolId(e.target.value)}
      >
        {schools.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white rounded shadow text-center">
              <h3 className="text-lg font-bold">Total</h3>
              <p>{stats.total}</p>
            </div>

            {stats.by_status.map((s, i) => (
              <div key={i} className="p-4 bg-white rounded shadow text-center">
                <h3 className="text-sm font-semibold">{s.status}</h3>
                <p>{s.count}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded shadow p-4">
            <h2 className="text-md font-bold mb-4">By Category</h2>
            <PieChart width={400} height={300}>
              <Pie
                data={stats.by_category}
                dataKey="count"
                nameKey="category__name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label
              >
                {stats.by_category.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </div>
        </>
      )}
    </div>
  );
};

export default InventoryDashboard;
