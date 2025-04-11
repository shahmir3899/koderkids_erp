import React, { useEffect, useState, useMemo } from "react";

import axios from "axios";
import { API_URL, getAuthHeaders } from "../api";
import { toast } from "react-toastify";

function InventoryPage() {
  const [items, setItems] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("name"); // or "purchase_value"
  const [sortOrder, setSortOrder] = useState("asc"); // or "desc"


  const [loading, setLoading] = useState(false);
  const initialFormState = {
    name: "",
    unique_id: "",
    description: "",
    purchase_value: "",
    purchase_date: "",
    status: "Available",
    category: "",
    assigned_to: "",
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchSchools();
    fetchCategories();
    const storedSchool = localStorage.getItem("selected_school");
  if (storedSchool) {
    setSelectedSchool(storedSchool);
    fetchInventory(storedSchool);
    fetchUsersForSchool(storedSchool);
  }
  }, []);

  // useEffect(() => {
  //   if (selectedSchool) {
  //     fetchInventory(selectedSchool);
  //   }
  // }, [selectedSchool]);

  const fetchUsersForSchool = async (schoolId) => {
    try {
      const res = await axios.get(`${API_URL}/api/inventory/assigned-users/?school=${schoolId}`, {
        headers: getAuthHeaders(),
      });
  
      const users = res.data;
      setAvailableUsers(users);
  
      if (users.length === 1) {
        // ✅ Auto-assign the only user
        setFormData((prev) => ({ ...prev, assigned_to: users[0].id }));
      } else if (users.length > 1) {
        // ❌ More than 1 user: raise error
        toast.error("Multiple users assigned to this school. Please resolve in backend.");
        setFormData((prev) => ({ ...prev, assigned_to: "" }));
      } else {
        // ❌ No users found: also an error
        toast.error("No user assigned to this school.");
        setFormData((prev) => ({ ...prev, assigned_to: "" }));
      }
  
    } catch {
      toast.error("Failed to load assigned users.");
    }
  };
  
  const filteredItems = useMemo(() => {
    let result = [...items];
  
    // 🔍 Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.unique_id.toLowerCase().includes(query)
      );
    }
  
    // 🧃 Filter by status
    if (statusFilter) {
      result = result.filter(item => item.status === statusFilter);
    }
  
    // 🔃 Sort by column
    result.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
  
      if (typeof valA === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
    });
  
    return result;
  }, [items, searchQuery, statusFilter, sortBy, sortOrder]);
  



  const handleEdit = (item) => {
    setFormData({
      ...item,
      category: item.category || "",
      assigned_to: item.assigned_to || "",
    });
    setEditingItem(item.id);
  };
  
  const handleDelete = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await axios.delete(`${API_URL}/api/inventory/items/${itemId}/`, {
        headers: getAuthHeaders(),
      });
      toast.success("Item deleted!");
      fetchInventory(selectedSchool);
    } catch {
      toast.error("Failed to delete item.");
    }
  };
  
  
  
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
  
    if (!selectedSchool || !formData.assigned_to) {
      toast.warning("School and assigned user are required.");
      return;
    }
  
    try {
      if (editingItem) {
        // Update
        await axios.put(
          `${API_URL}/api/inventory/items/${editingItem}/`,
          {
            ...formData,
            school: selectedSchool,
          },
          { headers: getAuthHeaders() }
        );
        toast.success("Item updated!");
      } else {
        // Add
        await axios.post(
          `${API_URL}/api/inventory/items/`,
          {
            ...formData,
            school: selectedSchool,
          },
          { headers: getAuthHeaders() }
        );
        toast.success("Item added!");
      }
  
      setEditingItem(null);
      setFormData({ ...initialFormState }); // reset
      fetchInventory(selectedSchool);
    } catch {
      toast.error("Failed to save item.");
    }
  };
  

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Inventory Management System</h1>
  
      {/* Section: Add New Inventory */}
      <h2 className="text-xl font-semibold mb-4">Add New Inventory</h2>
      <form className="bg-gray-100 p-4 rounded mb-6" onSubmit={handleCreateItem}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* School Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">School</label>
            <select
  className="w-full p-2 border"
  value={selectedSchool || ""}
  onChange={(e) => {
    const schoolId = e.target.value;
    setSelectedSchool(schoolId);
    localStorage.setItem("selected_school", schoolId);
    fetchInventory(schoolId);
    fetchUsersForSchool(schoolId);
  }}
>
  <option value="" disabled>Select School</option>
  {schools.map((s) => (
    <option key={s.id} value={s.id}>{s.name}</option>
  ))}
</select>

          </div>
  
          {/* Category */}
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
  
          {/* Item Name */}
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
  
          {/* Unique ID - Auto */}
          <input
            className="p-2 border bg-gray-200 text-gray-500"
            type="text"
            placeholder="Unique ID (auto)"
            value={"Generated Automatically"}
            disabled
          />
  
          {/* Description */}
          <input
            className="p-2 border"
            type="text"
            placeholder="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
  
          {/* Purchase Value */}
          <input
            className="p-2 border"
            type="number"
            placeholder="Purchase Value"
            value={formData.purchase_value}
            onChange={(e) =>
              setFormData({ ...formData, purchase_value: e.target.value })
            }
          />
  
          {/* Purchase Date */}
          <input
            className="p-2 border"
            type="date"
            placeholder="Purchase Date"
            value={formData.purchase_date}
            onChange={(e) =>
              setFormData({ ...formData, purchase_date: e.target.value })
            }
          />
  
          {/* Status */}
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
  
          {/* Assigned To (read-only) */}
          {availableUsers.length === 1 && (
            <div className="col-span-2">
              <p className="text-sm text-gray-600">
                Assigned To: <strong>{availableUsers[0].name}</strong>
              </p>
              <input
                type="hidden"
                value={formData.assigned_to}
              />
            </div>
          )}
        </div>
  
        <button
  type="submit"
  className={`px-4 py-2 ${editingItem ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded`}
>
  {editingItem ? 'Update Item' : 'Add Item'}
</button>

      </form>
  
      {/* Section: Inventory Table */}
      <h2 className="text-xl font-semibold mb-3">List of Available Inventory</h2>
      <div className="flex flex-wrap items-center gap-3 mb-4 bg-white p-4 rounded shadow-sm">
  <input
    type="text"
    className="p-2 border rounded w-full sm:w-60"
    placeholder="🔍 Search item name or ID"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />

  <select
    className="p-2 border rounded"
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
  >
    <option value="">All Statuses</option>
    <option value="Available">Available</option>
    <option value="Assigned">Assigned</option>
    <option value="Damaged">Damaged</option>
    <option value="Lost">Lost</option>
    <option value="Disposed">Disposed</option>
  </select>

  <select
    className="p-2 border rounded"
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value)}
  >
    <option value="name">Name</option>
    <option value="purchase_value">Value</option>
  </select>

  <button
    className="p-2 px-4 bg-gray-100 border rounded hover:bg-gray-200"
    onClick={() =>
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    }
    title="Toggle sort order"
  >
    {sortOrder === "asc" ? "⬆️ Asc" : "⬇️ Desc"}
  </button>
</div>


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
            filteredItems.map((item) => (
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
                <td className="p-2 border">{item.purchase_value}</td>
<td className="p-2 border flex gap-2">
  <button
    onClick={() => handleEdit(item)}
    className="text-blue-600 hover:underline"
  >
    Edit
  </button>
  <button
    onClick={() => handleDelete(item.id)}
    className="text-red-600 hover:underline"
  >
    Delete
  </button>
</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
  
  
}

export default InventoryPage;
