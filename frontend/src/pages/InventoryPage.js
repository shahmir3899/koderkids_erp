import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { API_URL, getAuthHeaders } from "../api";
import { toast } from "react-toastify";
import html2pdf from "html2pdf.js";
import QRCode from "react-qr-code";
import { useForm } from "react-hook-form";
import Select from "react-select";
import { PencilIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";

function InventoryPage() {
  const [items, setItems] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState("School"); // Default to 'School'
  const [selectedItems, setSelectedItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(false);

  const locationOptions = [
    { value: "School", label: "School" },
    { value: "Headquarters", label: "Headquarters" },
    { value: "Unassigned", label: "Unassigned" },
  ];

  const initialFormState = {
    name: "",
    unique_id: "",
    description: "",
    purchase_value: "",
    purchase_date: "",
    status: "Available",
    category: "",
    assigned_to: null,
    school: "",
    location: "School",
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({ defaultValues: initialFormState });

  useEffect(() => {
    fetchSchools();
    fetchCategories();
    const storedSchool = localStorage.getItem("selected_school");
    if (storedSchool) {
      setSelectedSchool(storedSchool);
      fetchInventory(storedSchool, selectedLocation);
      fetchUsers(storedSchool, selectedLocation);
    }
  }, []);

  useEffect(() => {
    if (selectedSchool || selectedLocation) {
      fetchInventory(selectedSchool, selectedLocation);
      fetchUsers(selectedSchool, selectedLocation);
    }
  }, [selectedSchool, selectedLocation]);

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

  const fetchInventory = async (schoolId, location) => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/inventory/items/`;
      const params = {};
      if (schoolId) params.school = schoolId;
      if (location) params.location = location;
      const res = await axios.get(url, {
        params,
        headers: getAuthHeaders(),
      });
      setItems(res.data);
    } catch {
      toast.error("Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/inventory/assigned-users/`, {
      headers: getAuthHeaders(),
    });
    setAvailableUsers(
      res.data.map((u) => ({ value: u.id, label: u.name }))
    );
  } catch {
    toast.error("Failed to load users.");
  }
};

  const onSubmit = async (data) => {
    const url = editingItem
      ? `${API_URL}/api/inventory/items/${editingItem}/`
      : `${API_URL}/api/inventory/items/`;
    const method = editingItem ? "put" : "post";

    try {
      await axios({
        method,
        url,
        data: {
          ...data,
          assigned_to: data.assigned_to?.value || null,
          category: data.category || null,
          school: data.location === "School" ? selectedSchool : null,
        },
        headers: getAuthHeaders(),
      });
      toast.success(editingItem ? "Item updated!" : "Item created!");
      reset(initialFormState);
      setEditingItem(null);
      fetchInventory(selectedSchool, selectedLocation);
    } catch {
      toast.error("Failed to save item.");
    }
  };

  const handleEdit = (item) => {
    reset({
      ...item,
      category: item.category || "",
      assigned_to: item.assigned_to
        ? { value: item.assigned_to, label: item.assigned_to_name }
        : null,
      location: item.location || "School",
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
      fetchInventory(selectedSchool, selectedLocation);
    } catch {
      toast.error("Failed to delete item.");
    }
  };

  const handleExportPDF = () => {
    const table = document.getElementById("inventoryTableExport");
    if (!table) return toast.error("Inventory table not found.");

    toast.info("Generating PDF...");
    const options = {
      margin: 10,
      filename: `Inventory_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    html2pdf().set(options).from(table).save().then(() => toast.success("PDF downloaded!"));
  };

  const handleDownloadQRAsPDF = () => {
    const content = document.getElementById("qr-pdf-content");
    if (!content) return toast.error("QR content not found.");

    toast.info("Generating QR PDF...");
    const options = {
      margin: 10,
      filename: `QR_Codes_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    html2pdf().set(options).from(content).save().then(() => toast.success("QR PDF downloaded!"));
  };

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.unique_id.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      result = result.filter((item) => item.status === statusFilter);
    }

    if (showUnassigned) {
      result = result.filter((item) => !item.assigned_to);
    }

    if (selectedLocation) {
      result = result.filter((item) => item.location === selectedLocation);
    }

    return result;
  }, [items, searchQuery, statusFilter, showUnassigned, selectedLocation]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
      },
      {
        accessorKey: "unique_id",
        header: "ID",
      },
      {
        accessorKey: "status",
        header: "Status",
      },
      {
        accessorKey: "assigned_to_name",
        header: "Assigned To",
      },
      {
        accessorKey: "purchase_value",
        header: "Value",
      },
      {
        accessorKey: "location",
        header: "Location",
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(row.original)}
              className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Edit item"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleDelete(row.original.id)}
              className="text-red-600 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Delete item"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        ),
        header: "Actions",
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-center">Inventory Management</h1>

      {/* Location and School Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <Select
            id="location"
            options={locationOptions}
            value={locationOptions.find((opt) => opt.value === selectedLocation)}
            onChange={(opt) => setSelectedLocation(opt.value)}
            aria-label="Select location"
          />
        </div>
        {selectedLocation === "School" && (
          <div>
            <label htmlFor="school" className="block text-sm font-medium text-gray-700">
              School
            </label>
            <select
              id="school"
              className="p-2 border rounded w-full"
              value={selectedSchool || ""}
              onChange={(e) => {
                setSelectedSchool(e.target.value);
                localStorage.setItem("selected_school", e.target.value);
              }}
              aria-label="Select school"
            >
              <option value="">Select School</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Form for Add/Edit */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white p-6 rounded shadow space-y-4"
        role="form"
        aria-labelledby="inventory-form-title"
      >
        <h2 id="inventory-form-title" className="text-lg font-semibold">
          {editingItem ? "Edit Item" : "Add New Item"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="name"
              className="p-2 border rounded w-full"
              {...register("name", { required: "Name is required" })}
              aria-invalid={errors.name ? "true" : "false"}
            />
            {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
          </div>
          {/* Add similar fields for description, purchase_value, purchase_date, status, category */}
          <div>
            <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700">
              Assigned To
            </label>
            <Select
              id="assigned_to"
              options={availableUsers}
              isClearable
              onChange={(opt) => setValue("assigned_to", opt)}
              aria-label="Select assigned user"
            />
          </div>
          {selectedLocation === "School" && (
            <div>
              <label htmlFor="school" className="block text-sm font-medium text-gray-700">
                School
              </label>
              <select
                id="school"
                className="p-2 border rounded w-full"
                {...register("school")}
                aria-label="Select school for item"
              >
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <select
              id="location"
              className="p-2 border rounded w-full"
              {...register("location", { required: "Location is required" })}
              aria-invalid={errors.location ? "true" : "false"}
            >
              {locationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.location && <p className="text-red-600 text-sm">{errors.location.message}</p>}
          </div>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          {editingItem ? "Update Item" : "Add Item"}
        </button>
      </form>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by name or ID"
          className="p-2 border rounded flex-1"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search inventory"
        />
        <select
          className="p-2 border rounded"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          {/* Options for statuses */}
        </select>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showUnassigned}
            onChange={(e) => setShowUnassigned(e.target.checked)}
            aria-label="Show unassigned only"
          />
          Show Unassigned Only
        </label>
      </div>

      {/* Table with React Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left p-2 border cursor-pointer"
                    onClick={header.column.getToggleSortingHandler()}
                    aria-sort={header.column.getIsSorted() ? header.column.getIsSorted() : "none"}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() ? (header.column.getIsSorted() === "asc" ? " 🔼" : " 🔽") : null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-2 border">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between mt-4">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Previous
          </button>
          <span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Next
          </button>
        </div>
      </div>

      {/* QR Section */}
      {showQR && (
        <div className="my-6">
          <h2 className="text-lg font-bold mb-4">QR Codes for Filtered Items</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div key={item.id} className="border p-4 rounded shadow bg-white text-center">
                <QRCode value={item.unique_id} size={128} />
                <p className="mt-2 font-semibold text-sm">{item.name}</p>
                <p className="text-xs text-gray-500">{item.unique_id}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleExportPDF}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Export PDF
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          {showQR ? "Hide QR Codes" : "Generate QR Codes"}
        </button>
        <button
          onClick={handleDownloadQRAsPDF}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Download QR PDF
        </button>
      </div>

      {/* Hidden Elements for Exports */}
      <div className="hidden">
        <table id="inventoryTableExport" className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Unique ID</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Assigned To</th>
              <th className="p-2 border">Value</th>
              <th className="p-2 border">Purchase Date</th>
              <th className="p-2 border">Category</th>
              <th className="p-2 border">Location</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td className="p-2 border">{item.name}</td>
                <td className="p-2 border">{item.unique_id}</td>
                <td className="p-2 border">{item.status}</td>
                <td className="p-2 border">{item.assigned_to_name || "—"}</td>
                <td className="p-2 border">{item.purchase_value}</td>
                <td className="p-2 border">{item.purchase_date}</td>
                <td className="p-2 border">{item.category_name || "—"}</td>
                <td className="p-2 border">{item.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div id="qr-pdf-content" className="hidden p-4">
        <h2 className="text-xl font-bold mb-4">QR Codes for Filtered Inventory</h2>
        <div className="grid grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="border p-4 rounded shadow bg-white text-center w-[170px]">
              <QRCode value={item.unique_id} size={128} />
              <p className="mt-2 font-semibold text-sm">{item.name}</p>
              <p className="text-xs text-gray-500">{item.unique_id}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default InventoryPage;