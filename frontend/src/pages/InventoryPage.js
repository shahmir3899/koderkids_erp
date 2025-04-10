import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL, getAuthHeaders } from "../api";
import { toast } from "react-toastify";

function InventoryPage() {
  const [items, setItems] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    unique_id: "",
    description: "",
    purchase_value: "",
    purchase_date: "",
    status: "Available",
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      fetchInventory(selectedSchool);
    }
  }, [selectedSchool]);

  const fetchSchools = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/schools/`, {
        headers: getAuthHeaders(),
      });
      setSchools(res.data);
    } catch {
      toast.error("Failed to load schools.");
    }
  };

  const fetchInventory = async (schoolId) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/inventory/items/?school=${schoolId}`,
        { headers: getAuthHeaders() }
      );
      setItems(res.data);
    } catch {
      toast.error("Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  const handleItemToggle = (itemId) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!selectedSchool) {
      toast.warning("Select a school first.");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/inventory/items/`,
        { ...formData, school: selectedSchool },
        { headers: getAuthHeaders() }
      );
      toast.success("Item added!");
      setFormData({
        name: "",
        unique_id: "",
        description: "",
        purchase_value: "",
        purchase_date: "",
        status: "Available",
      });
      fetchInventory(selectedSchool);
    } catch {
      toast.error("Failed to add item.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inventory Management</h1>

      <div className="mb-6">
        <label>School:</label>
        <select
          className="w-full p-2 border"
          value={selectedSchool || ""}
          onChange={(e) => setSelectedSchool(e.target.value)}
        >
          <option value="" disabled>
            Select School
          </option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <form
        className="bg-gray-100 p-4 mb-6 rounded"
        onSubmit={handleCreateItem}
      >
        <h2 className="text-lg font-semibold mb-2">Add Inventory Item</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            className="p-2 border"
            type="text"
            placeholder="Item Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <input
            className="p-2 border"
            type="text"
            placeholder="Unique ID"
            value={formData.unique_id}
            onChange={(e) =>
              setFormData({ ...formData, unique_id: e.target.value })
            }
            required
          />
          <input
            className="p-2 border"
            type="text"
            placeholder="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
          <input
            className="p-2 border"
            type="number"
            placeholder="Purchase Value"
            value={formData.purchase_value}
            onChange={(e) =>
              setFormData({ ...formData, purchase_value: e.target.value })
            }
          />
          <input
            className="p-2 border"
            type="date"
            placeholder="Purchase Date"
            value={formData.purchase_date}
            onChange={(e) =>
              setFormData({ ...formData, purchase_date: e.target.value })
            }
          />
          <select
            className="p-2 border"
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
          >
            <option value="Available">Available</option>
            <option value="Assigned">Assigned</option>
            <option value="Damaged">Damaged</option>
            <option value="Lost">Lost</option>
            <option value="Disposed">Disposed</option>
          </select>
        </div>
        <button
          type="submit"
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Add Item
        </button>
      </form>

      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th></th>
            <th className="text-left p-2 border">Name</th>
            <th className="text-left p-2 border">ID</th>
            <th className="text-left p-2 border">Status</th>
            <th className="text-left p-2 border">Assigned To</th>
            <th className="text-left p-2 border">Value</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="6" className="text-center p-4">
                Loading...
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td className="p-2 border">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => handleItemToggle(item.id)}
                  />
                </td>
                <td className="p-2 border">{item.name}</td>
                <td className="p-2 border">{item.unique_id}</td>
                <td className="p-2 border">{item.status}</td>
                <td className="p-2 border">{item.assigned_to_name || "—"}</td>
                <td className="p-2 border">{item.purchase_value}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default InventoryPage;
