import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL, getAuthHeaders } from "../api";
import { toast } from "react-toastify";

function InventoryPage() {
  const [items, setItems] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [categories, setCategories] = useState([]);

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
    fetchCategories();
  }, []);

  // useEffect(() => {
  //   if (selectedSchool) {
  //     fetchInventory(selectedSchool);
  //   }
  // }, [selectedSchool]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/inventory/categories/`, {
        headers: getAuthHeaders(),
      });
      setCategories(res.data);
    } catch {
      toast.error("Failed to load categories.");
    }
  };


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
        category: "",
      });
      fetchInventory(selectedSchool);
    } catch {
      toast.error("Failed to add item.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Inventory Management System</h1>
  
      {/* Section: Add New Inventory */}
      <h2 className="text-xl font-semibold mb-4">Add New Inventory</h2>
      <form className="bg-gray-100 p-4 rounded mb-6" onSubmit={handleCreateItem}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">School</label>
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
  
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              className="w-full p-2 border"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
  
          <input
            className="p-2 border"
            type="text"
            placeholder="Item Name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            required
          />
  
          <input
            className="p-2 border bg-gray-200 text-gray-500"
            type="text"
            placeholder="Unique ID (auto)"
            value={"Generated Automatically"}
            disabled
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
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Add Item
        </button>
      </form>
  
      {/* Section: Inventory Table */}
      <h2 className="text-xl font-semibold mb-3">List of Available Inventory</h2>
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
