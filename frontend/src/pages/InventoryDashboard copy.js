import React, { useEffect, useState } from "react";
import axios from "axios";
import { PieChart, Pie, Tooltip, Cell, Legend } from "recharts";
import { API_URL, getAuthHeaders } from "../api";

// Rebranded color palette for a professional, neutral theme
const COLORS = ["#4CAF50", "#2196F3", "#FFC107", "#F44336", "#9C27B0", "#FFEB3B"];

const InventoryDashboard = () => {
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (locationId) {
      fetchDashboard(locationId);
    }
  }, [locationId]);

  // Rebranded function name and labels from "schools" to "locations"
  const fetchLocations = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/schools/`, {
        headers: getAuthHeaders(),
      });
      setLocations(res.data);
      if (res.data.length > 0) setLocationId(res.data[0].id);
    } catch {
      alert("Failed to load locations");
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
      {/* Rebranded title for generality */}
      <h1 className="text-2xl font-bold mb-4">Inventory Summary Dashboard</h1>

      {/* Rebranded label */}
      <label className="block mb-2 font-medium">Select Location</label>
      <select
        className="p-2 border mb-6 w-full sm:w-auto"
        value={locationId}
        onChange={(e) => setLocationId(e.target.value)}
      >
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>{loc.name}</option>
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
            {/* Rebranded header */}
            <h2 className="text-md font-bold mb-4">By Category</h2>
            <PieChart width={400} height={300}>
              <Pie
                data={stats.by_category}
                dataKey="count"
                nameKey="category__name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"  // Default fill retained, but cells use rebranded COLORS
                label
              >
                {stats.by_category.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </div>
        </>
      )}
    </div>
  );
};

export default InventoryDashboard;