import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { API_URL, getAuthHeaders } from "../api";
import { toast } from "react-toastify";
import html2pdf from "html2pdf.js";
import QRCode from "react-qr-code";
import Select from "react-select";
import { PencilIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import AddInventory from "./AddInventory";

async function exportInventoryToPDF(filteredItems, userMap, locationMap, selectedLocationType, selectedLocationId) {
  try {
    const locationName = selectedLocationType === "School" ? (selectedLocationId ? locationMap[selectedLocationId] || "All Schools" : "All Schools") : selectedLocationType || '';

    // Create HTML template for the report
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 50px; background: url('public/bg.png') no-repeat center center / cover; }
            h1 { text-align: center; font-size: 18pt; }
            h2 { font-size: 12pt; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10pt; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .right-align { text-align: right; }
            .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 8pt; color: #777; }
          </style>
        </head>
        <body>
          <h1>Inventory Report</h1>
          <h2>Location: ${locationName}</h2>
          <h2>Inventory Items Summary</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th class="right-align">Unique ID</th>
               
                <th>Assigned To</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              ${filteredItems.map(item => `
                <tr>
                  <td>${item.name || '—'}</td>
                  <td>${item.category_name || '—'}</td>
                  <td class="right-align">${item.unique_id || '—'}</td>
                  
                  <td>${userMap[item.assigned_to] || item.assigned_to_name || '—'}</td>
                  <td>${selectedLocationType === "School" ? (selectedLocationId ? locationMap[selectedLocationId] || "School" : "School") : item.location || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} | Page <span class="pageNumber"></span>
          </div>
        </body>
      </html>
    `;

    // Configure html2pdf options for better rendering
    const opt = {
      margin: 1,
      filename: `inventory_report_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    // Generate PDF from HTML string
    await html2pdf().set(opt).from(htmlContent).save();
    toast.success("PDF exported successfully!");
  } catch (error) {
    console.error("PDF generation error:", error);
    toast.error("Failed to generate PDF.");
  }
}

const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]); // Derived from models LOCATION_CHOICES
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedAssignedTo, setSelectedAssignedTo] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schools, setSchools] = useState([]); // Fetch schools if needed
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true); // Added for debugging loading issues

  // Status options from models (for reference, but not used in filters)
  const statusOptions = [
    { value: '', label: 'Select Status' },
    { value: 'Available', label: 'Available' },
    { value: 'Assigned', label: 'Assigned' },
    { value: 'Damaged', label: 'Damaged' },
    { value: 'Lost', label: 'Lost' },
    { value: 'Disposed', label: 'Disposed' },
  ];

  // Location options from models
  const locationOptions = [
    { value: 'School', label: 'School' },
    { value: 'Headquarters', label: 'Headquarters' },
    { value: 'Unassigned', label: 'Unassigned' },
    // Add more if defined in models
  ];

  // Fetch initial data (categories, users, schools, etc.)
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [catsRes, usersRes, schoolsRes] = await Promise.all([
          axios.get(`${API_URL}/api/inventory/categories/`, { headers: getAuthHeaders() }),
          axios.get(`${API_URL}/api/inventory/assigned-users/`, { headers: getAuthHeaders() }),
          axios.get(`${API_URL}/api/schools/`, { headers: getAuthHeaders() }), // Assuming schools endpoint
        ]);
        console.log('Categories data:', catsRes.data); // Debug log
        console.log('Users data:', usersRes.data);
        console.log('Schools data:', schoolsRes.data);
        setCategories(catsRes.data.map(c => ({ value: c.id, label: c.name })));
        setUsers(usersRes.data.map(u => ({ value: u.id, label: u.name })));
        setSchools(schoolsRes.data.map(s => ({ value: s.id, label: s.name })));
        setLocations(locationOptions); // Static from models
      } catch (error) {
        console.error('Fetch initial data error:', error); // Debug log
        toast.error("Failed to load initial data");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch items with filters (backend filtering via query params)
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedSchool) params.append('school', selectedSchool.value);
        if (selectedAssignedTo) params.append('assigned_to', selectedAssignedTo.value);
        if (selectedLocation) params.append('location', selectedLocation.value);
        // Add more filters if needed

        const res = await axios.get(`${API_URL}/api/inventory/items/?${params.toString()}`, { headers: getAuthHeaders() });
        console.log('Items data:', res.data); // Debug log
        setItems(res.data);
      } catch (error) {
        console.error('Fetch items error:', error); // Debug log
        toast.error("Failed to load items");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [selectedSchool, selectedAssignedTo, selectedLocation]);

  // Table columns
  const columns = useMemo(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'unique_id', header: 'Unique ID' },
    { accessorKey: 'description', header: 'Description' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'category_name', header: 'Category' },
    { accessorKey: 'assigned_to_name', header: 'Assigned To' },
    { accessorKey: 'location', header: 'Location' },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button onClick={() => openEditModal(row.original)}><PencilIcon className="h-5 w-5" /></button>
          <button onClick={() => handleDelete(row.original.id)}><TrashIcon className="h-5 w-5" /></button>
        </div>
      ),
      header: 'Actions',
    },
  ], []);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Handlers
  const onAddSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/api/inventory/items/`, data, { headers: getAuthHeaders() });
      setItems(prev => [...prev, response.data]);
      toast.success("Item added successfully");
      setAddModalOpen(false);
    } catch (error) {
      toast.error("Failed to add item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await axios.put(`${API_URL}/api/inventory/items/${selectedItem.id}/`, data, { headers: getAuthHeaders() });
      setItems(prev => prev.map(i => i.id === selectedItem.id ? response.data : i));
      toast.success("Item updated successfully");
      setEditModalOpen(false);
    } catch (error) {
      toast.error("Failed to update item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure?")) {
      try {
        await axios.delete(`${API_URL}/api/inventory/items/${id}/`, { headers: getAuthHeaders() });
        setItems(prev => prev.filter(i => i.id !== id));
        toast.success("Item deleted");
      } catch (error) {
        toast.error("Failed to delete item");
      }
    }
  };

  const openAddModal = () => {
    setSelectedItem(null); // Clear for add
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
  };

  const openEditModal = (item) => {
    // Prepare initialValues, adjusting for Select values
    const initial = {
      ...item,
      category: categories.find(c => c.value === item.category) || null,
      assigned_to: users.find(u => u.value === item.assigned_to) || null,
    };
    setSelectedItem(initial);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedItem(null);
  };

  const handleExportTablePDF = async () => {
    try {
      const userMap = users.reduce((map, u) => ({ ...map, [u.value]: u.label }), {});
      const locationMap = locations.reduce((map, l) => ({ ...map, [l.value]: l.label }), {});
      await exportInventoryToPDF(items, userMap, locationMap, selectedLocation?.value, selectedSchool?.value);
    } catch (error) {
      toast.error("Failed to generate PDF");
    }
  };

  const handleDownloadQRAsPDF = () => {
    const element = document.getElementById('qr-pdf-content');
    html2pdf().from(element).save('qr_codes.pdf');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inventory Management</h1>

      {/* Filters - Aligned in one row on medium+ screens */}
      {loading ? (
        <p>Loading filters...</p>
      ) : (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            value={selectedSchool}
            onChange={setSelectedSchool}
            options={schools}
            placeholder="Filter by School"
            isClearable
          />
          <Select
            value={selectedAssignedTo}
            onChange={setSelectedAssignedTo}
            options={users}
            placeholder="Filter by Assigned To"
            isClearable
          />
          <Select
            value={selectedLocation}
            onChange={setSelectedLocation}
            options={locations}
            placeholder="Filter by Location"
            isClearable
          />
        </div>
      )}

      {/* Add Button */}
      <button
        onClick={openAddModal}
        className="mb-4 px-4 py-2 bg-green-500 text-white rounded flex items-center gap-2"
      >
        <PlusIcon className="h-5 w-5" />
        Add New Inventory
      </button>

      {/* Table */}
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full bg-white border">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="p-2 border">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="p-2 border">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Add New Item</h2>
            <AddInventory
              mode="add"
              onSubmit={onAddSubmit}
              onCancel={closeAddModal}
              categories={categories}
              availableUsers={users}
              statusOptions={statusOptions.slice(1)}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Edit Item</h2>
            <AddInventory
              mode="edit"
              initialValues={selectedItem}
              onSubmit={onEditSubmit}
              onCancel={closeEditModal}
              categories={categories}
              availableUsers={users}
              statusOptions={statusOptions.slice(1)}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* QR Section */}
      {showQR && (
        <div className="my-6">
          <h2 className="text-lg font-bold mb-4">QR Codes for Filtered Items</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {items.map((item) => (
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
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleExportTablePDF}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Export advanced PDF"
        >
          Export PDF
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label={showQR ? "Hide QR Codes" : "Generate QR Codes"}
        >
          {showQR ? "Hide QR Codes" : "Generate QR Codes"}
        </button>
        <button
          onClick={handleDownloadQRAsPDF}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Download QR PDF"
        >
          Download QR PDF
        </button>
      </div>

      {/* Hidden Elements for Exports */}
      <div id="qr-pdf-content" className="hidden p-4">
        <h2 className="text-xl font-bold mb-4">QR Codes for Filtered Inventory</h2>
        <div className="grid grid-cols-4 gap-6">
          {items.map((item) => (
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
};

export default InventoryPage;