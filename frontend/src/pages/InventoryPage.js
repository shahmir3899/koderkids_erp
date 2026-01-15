// ============================================
// INVENTORY PAGE - Glassmorphism Design Version
// ============================================

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

// Design System
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  MIXINS,
  LAYOUT,
  TRANSITIONS,
} from '../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../hooks/useResponsive';

// Custom select styles for dark theme
const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: 'rgba(255, 255, 255, 0.08)',
    borderColor: state.isFocused ? COLORS.primary : 'rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.white,
    boxShadow: state.isFocused ? `0 0 0 1px ${COLORS.primary}` : 'none',
    '&:hover': {
      borderColor: COLORS.primary,
    },
  }),
  menu: (base) => ({
    ...base,
    background: '#1e1e2e',
    borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? COLORS.primary
      : state.isFocused
        ? 'rgba(176, 97, 206, 0.2)'
        : 'transparent',
    color: COLORS.text.white,
    cursor: 'pointer',
  }),
  singleValue: (base) => ({
    ...base,
    color: COLORS.text.white,
  }),
  placeholder: (base) => ({
    ...base,
    color: 'rgba(255, 255, 255, 0.5)',
  }),
  input: (base) => ({
    ...base,
    color: COLORS.text.white,
  }),
};

// Styles
const styles = {
  pageContainer: {
    minHeight: '100vh',
    background: COLORS.background.gradient,
    padding: SPACING.xl,
  },
  contentWrapper: {
    maxWidth: LAYOUT.maxWidth.lg,
    margin: '0 auto',
  },
  pageTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: `${SPACING.md} ${SPACING.xl}`,
    background: `linear-gradient(90deg, ${COLORS.status.success} 0%, #059669 100%)`,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: TRANSITIONS.normal,
    marginBottom: SPACING.lg,
  },
  tableContainer: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tableHeaderCell: {
    padding: SPACING.md,
    textAlign: 'left',
    color: COLORS.text.white,
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: FONT_SIZES.sm,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  tableRow: {
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    transition: TRANSITIONS.fast,
  },
  tableCell: {
    padding: SPACING.md,
    color: COLORS.text.whiteMedium,
    fontSize: FONT_SIZES.sm,
  },
  actionButton: (variant) => ({
    padding: SPACING.sm,
    backgroundColor: variant === 'edit'
      ? 'rgba(59, 130, 246, 0.2)'
      : 'rgba(239, 68, 68, 0.2)',
    color: variant === 'edit' ? '#60A5FA' : '#F87171',
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    cursor: 'pointer',
    transition: TRANSITIONS.fast,
  }),
  qrSection: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  qrTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    marginBottom: SPACING.lg,
  },
  qrGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: SPACING.lg,
  },
  qrCard: {
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    textAlign: 'center',
  },
  qrName: {
    marginTop: SPACING.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
  },
  qrId: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  exportButtonsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  exportButton: (color) => ({
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: color,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: TRANSITIONS.normal,
  }),
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    zIndex: 1000,
  },
  modalContent: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    marginBottom: SPACING.lg,
  },
  loadingText: {
    color: COLORS.text.whiteMedium,
    textAlign: 'center',
    padding: SPACING.xl,
  },
};

async function exportInventoryToPDF(filteredItems, userMap, locationMap, selectedLocationType, selectedLocationId) {
  try {
    const locationName = selectedLocationType === "School" ? (selectedLocationId ? locationMap[selectedLocationId] || "All Schools" : "All Schools") : selectedLocationType || '';

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 50px; }
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

    const opt = {
      margin: 1,
      filename: `inventory_report_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    await html2pdf().set(opt).from(htmlContent).save();
    toast.success("PDF exported successfully!");
  } catch (error) {
    console.error("PDF generation error:", error);
    toast.error("Failed to generate PDF.");
  }
}

// Responsive Styles Generator
const getResponsiveStyles = (isMobile, isTablet) => ({
  pageContainer: {
    minHeight: '100vh',
    background: COLORS.background.gradient,
    padding: isMobile ? SPACING.md : isTablet ? SPACING.lg : SPACING.xl,
  },
  contentWrapper: {
    maxWidth: LAYOUT.maxWidth.lg,
    margin: '0 auto',
    width: '100%',
  },
  pageTitle: {
    fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
    textAlign: 'center',
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: isMobile ? SPACING.md : SPACING.lg,
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: isMobile ? `${SPACING.md} ${SPACING.lg}` : `${SPACING.md} ${SPACING.xl}`,
    background: `linear-gradient(90deg, ${COLORS.status.success} 0%, #059669 100%)`,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: TRANSITIONS.normal,
    marginBottom: SPACING.lg,
    width: isMobile ? '100%' : 'auto',
    minHeight: '44px', // Touch-friendly
  },
  tableContainer: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'auto',
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
    WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
  },
  tableHeaderCell: {
    padding: isMobile ? SPACING.sm : SPACING.md,
    textAlign: 'left',
    color: COLORS.text.white,
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    whiteSpace: 'nowrap',
  },
  tableCell: {
    padding: isMobile ? SPACING.sm : SPACING.md,
    color: COLORS.text.whiteMedium,
    fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
  },
  qrGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile
      ? 'repeat(auto-fill, minmax(140px, 1fr))'
      : 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: isMobile ? SPACING.md : SPACING.lg,
  },
  qrCard: {
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
    padding: isMobile ? SPACING.md : SPACING.lg,
    textAlign: 'center',
  },
  exportButtonsContainer: {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  exportButton: (color) => ({
    padding: isMobile ? `${SPACING.md} ${SPACING.lg}` : `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: color,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: TRANSITIONS.normal,
    minHeight: '44px', // Touch-friendly
    width: isMobile ? '100%' : 'auto',
  }),
  modalContent: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: isMobile ? SPACING.md : SPACING.xl,
    width: isMobile ? '95%' : '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    margin: isMobile ? SPACING.md : 0,
  },
  actionButton: (variant) => ({
    padding: isMobile ? SPACING.md : SPACING.sm,
    backgroundColor: variant === 'edit'
      ? 'rgba(59, 130, 246, 0.2)'
      : 'rgba(239, 68, 68, 0.2)',
    color: variant === 'edit' ? '#60A5FA' : '#F87171',
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    cursor: 'pointer',
    transition: TRANSITIONS.fast,
    minWidth: '44px', // Touch-friendly
    minHeight: '44px', // Touch-friendly
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
});

const InventoryPage = () => {
  // Responsive hook
  const { isMobile, isTablet } = useResponsive();
  const responsiveStyles = getResponsiveStyles(isMobile, isTablet);

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedAssignedTo, setSelectedAssignedTo] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schools, setSchools] = useState([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);

  const statusOptions = [
    { value: '', label: 'Select Status' },
    { value: 'Available', label: 'Available' },
    { value: 'Assigned', label: 'Assigned' },
    { value: 'Damaged', label: 'Damaged' },
    { value: 'Lost', label: 'Lost' },
    { value: 'Disposed', label: 'Disposed' },
  ];

  const locationOptions = [
    { value: 'School', label: 'School' },
    { value: 'Headquarters', label: 'Headquarters' },
    { value: 'Unassigned', label: 'Unassigned' },
  ];

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [catsRes, usersRes, schoolsRes] = await Promise.all([
          axios.get(`${API_URL}/api/inventory/categories/`, { headers: getAuthHeaders() }),
          axios.get(`${API_URL}/api/inventory/assigned-users/`, { headers: getAuthHeaders() }),
          axios.get(`${API_URL}/api/schools/`, { headers: getAuthHeaders() }),
        ]);
        setCategories(catsRes.data.map(c => ({ value: c.id, label: c.name })));
        setUsers(usersRes.data.map(u => ({ value: u.id, label: u.name })));
        setSchools(schoolsRes.data.map(s => ({ value: s.id, label: s.name })));
        setLocations(locationOptions);
      } catch (error) {
        console.error('Fetch initial data error:', error);
        toast.error("Failed to load initial data");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedSchool) params.append('school', selectedSchool.value);
        if (selectedAssignedTo) params.append('assigned_to', selectedAssignedTo.value);
        if (selectedLocation) params.append('location', selectedLocation.value);

        const res = await axios.get(`${API_URL}/api/inventory/items/?${params.toString()}`, { headers: getAuthHeaders() });
        setItems(res.data);
      } catch (error) {
        console.error('Fetch items error:', error);
        toast.error("Failed to load items");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [selectedSchool, selectedAssignedTo, selectedLocation]);

  const columns = useMemo(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'unique_id', header: 'Unique ID' },
    ...(!isMobile ? [{ accessorKey: 'description', header: 'Description' }] : []),
    { accessorKey: 'status', header: 'Status' },
    ...(!isMobile ? [{ accessorKey: 'category_name', header: 'Category' }] : []),
    ...(!isMobile ? [{ accessorKey: 'assigned_to_name', header: 'Assigned To' }] : []),
    ...(!isMobile ? [{ accessorKey: 'location', header: 'Location' }] : []),
    {
      id: 'actions',
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: SPACING.sm }}>
          <button
            onClick={() => openEditModal(row.original)}
            style={responsiveStyles.actionButton('edit')}
          >
            <PencilIcon style={{ width: isMobile ? '18px' : '20px', height: isMobile ? '18px' : '20px' }} />
          </button>
          <button
            onClick={() => handleDelete(row.original.id)}
            style={responsiveStyles.actionButton('delete')}
          >
            <TrashIcon style={{ width: isMobile ? '18px' : '20px', height: isMobile ? '18px' : '20px' }} />
          </button>
        </div>
      ),
      header: 'Actions',
    },
  ], [isMobile, responsiveStyles]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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
    setSelectedItem(null);
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
  };

  const openEditModal = (item) => {
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
    <div style={responsiveStyles.pageContainer}>
      <div style={responsiveStyles.contentWrapper}>
        <h1 style={responsiveStyles.pageTitle}>Inventory Management</h1>

        {/* Filters */}
        {loading ? (
          <p style={styles.loadingText}>Loading filters...</p>
        ) : (
          <div style={responsiveStyles.filtersGrid}>
            <Select
              value={selectedSchool}
              onChange={setSelectedSchool}
              options={schools}
              placeholder="Filter by School"
              isClearable
              styles={selectStyles}
            />
            <Select
              value={selectedAssignedTo}
              onChange={setSelectedAssignedTo}
              options={users}
              placeholder="Filter by Assigned To"
              isClearable
              styles={selectStyles}
            />
            <Select
              value={selectedLocation}
              onChange={setSelectedLocation}
              options={locations}
              placeholder="Filter by Location"
              isClearable
              styles={selectStyles}
            />
          </div>
        )}

        {/* Add Button */}
        <button onClick={openAddModal} style={responsiveStyles.addButton}>
          <PlusIcon style={{ width: '20px', height: '20px' }} />
          Add New Inventory
        </button>

        {/* Table */}
        <div style={responsiveStyles.tableContainer}>
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} style={responsiveStyles.tableHeaderCell}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} style={styles.tableRow}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} style={responsiveStyles.tableCell}>
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
          <div style={styles.modalOverlay}>
            <div style={responsiveStyles.modalContent}>
              <h2 style={styles.modalTitle}>Add New Item</h2>
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
          <div style={styles.modalOverlay}>
            <div style={responsiveStyles.modalContent}>
              <h2 style={styles.modalTitle}>Edit Item</h2>
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
          <div style={styles.qrSection}>
            <h2 style={styles.qrTitle}>QR Codes for Filtered Items</h2>
            <div style={responsiveStyles.qrGrid}>
              {items.map((item) => (
                <div key={item.id} style={responsiveStyles.qrCard}>
                  <QRCode value={item.unique_id} size={isMobile ? 100 : 128} />
                  <p style={styles.qrName}>{item.name}</p>
                  <p style={styles.qrId}>{item.unique_id}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export Buttons */}
        <div style={responsiveStyles.exportButtonsContainer}>
          <button
            onClick={handleExportTablePDF}
            style={responsiveStyles.exportButton(COLORS.status.info)}
          >
            Export PDF
          </button>
          <button
            onClick={() => setShowQR(!showQR)}
            style={responsiveStyles.exportButton(COLORS.accent.purple)}
          >
            {showQR ? "Hide QR Codes" : "Generate QR Codes"}
          </button>
          <button
            onClick={handleDownloadQRAsPDF}
            style={responsiveStyles.exportButton('#9333EA')}
          >
            Download QR PDF
          </button>
        </div>

        {/* Hidden Elements for Exports */}
        <div id="qr-pdf-content" style={{ display: 'none', padding: SPACING.lg }}>
          <h2 style={{ fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, marginBottom: SPACING.lg }}>QR Codes for Filtered Inventory</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: SPACING.lg }}>
            {items.map((item) => (
              <div key={item.id} style={{ border: '1px solid #ddd', padding: SPACING.lg, borderRadius: BORDER_RADIUS.md, backgroundColor: 'white', textAlign: 'center', width: '170px' }}>
                <QRCode value={item.unique_id} size={128} />
                <p style={{ marginTop: SPACING.sm, fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.sm }}>{item.name}</p>
                <p style={{ fontSize: FONT_SIZES.xs, color: '#6B7280' }}>{item.unique_id}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
