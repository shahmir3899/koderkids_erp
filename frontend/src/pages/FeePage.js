import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { API_URL, getAuthHeaders } from "../api";
import html2pdf from "html2pdf.js";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import debounce from "lodash/debounce";
import { ClipLoader } from "react-spinners";

function FeePage() {
  const [fees, setFees] = useState([]);
  const [filteredFees, setFilteredFees] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [schoolId, setSchoolId] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [month, setMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingFeeId, setEditingFeeId] = useState(null);
  const [editedPaidAmount, setEditedPaidAmount] = useState("");
  const [editedDateReceived, setEditedDateReceived] = useState(null);
  const [error, setError] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedFeeIds, setSelectedFeeIds] = useState([]);
  const [bulkPaidAmount, setBulkPaidAmount] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Fetch schools and extract unique classes
  const fetchSchools = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/schools/`, {
        headers: getAuthHeaders(),
      });
      setSchools(response.data);
      const allClasses = new Set();
      response.data.forEach((school) => {
        if (school.classes) {
          school.classes.forEach((cls) => allClasses.add(cls));
        }
      });
      const classList = Array.from(allClasses).sort();
      console.log("Classes from schools:", classList);
      setClasses(classList);
      setError(null);
    } catch (error) {
      console.error("Error fetching schools:", error);
      setError("Failed to load schools. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch fees with filters
  const fetchFees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/fees/`, {
        headers: getAuthHeaders(),
        params: {
          school_id: schoolId || undefined,
          class: studentClass || undefined,
          month: month
            ? month.toLocaleString("default", { month: "short" }) +
              "-" +
              month.getFullYear()
            : undefined,
          sort: "student_class",
        },
      });
      const sortedFees = response.data
        .sort((a, b) => a.student_class.localeCompare(b.student_class))
        .map((fee) => ({ ...fee, date_received: null })); // Initialize date_received
      console.log("Fees response:", response.data);
      console.log("Unique student_class values:", [...new Set(sortedFees.map(fee => fee.student_class))]);
      setFees(sortedFees);
      setError(null);
    } catch (error) {
      console.error("Failed to fetch fees:", error);
      setError("Failed to load fees. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Create new month fees
  const createNewMonthFees = async () => {
    if (!schoolId || !month) return;
    setCreateLoading(true);
    setSuccessMessage("");
    setError(null);

    const formattedMonth = `${month.toLocaleString("default", { month: "short" })}-${month.getFullYear()}`;

    try {
      const response = await axios.post(
        `${API_URL}/api/fees/create/`,
        { school_id: schoolId, month: formattedMonth },
        { headers: getAuthHeaders() }
      );
      setSuccessMessage(response.data.message);
      await fetchFees();
    } catch (error) {
      if (error.response?.status === 409) {
        const confirmOverwrite = window.confirm(
          `${error.response.data.warning}\n\nDo you want to overwrite existing records?`
        );
        if (confirmOverwrite) {
          try {
            const retry = await axios.post(
              `${API_URL}/api/fees/create/`,
              { school_id: schoolId, month: formattedMonth, force_overwrite: true },
              { headers: getAuthHeaders() }
            );
            setSuccessMessage(retry.data.message);
            await fetchFees();
          } catch (overwriteErr) {
            setError(
              overwriteErr.response?.data?.error ||
                "Overwrite failed. Please try again."
            );
          }
        } else {
          setError("Fee record creation was cancelled.");
        }
      } else {
        setError(
          error.response?.data?.error ||
          "Failed to create new fee records. Please try again."
        );
      }
    } finally {
      setCreateLoading(false);
    }
  };

  // Update fee via API (for paid_amount only)
  const updateFee = async (feeId, paidAmount) => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      console.log("Auth Headers:", headers);
      if (!headers.Authorization) {
        throw new Error("Authentication token missing");
      }
      const response = await axios.post(
        `${API_URL}/api/fees/update/`,
        { fees: [{ id: feeId, paid_amount: paidAmount.toString() }] },
        { headers }
      );
      console.log("Update Fee Response:", response.data);
      const updatedFee = response.data.fees.find((f) => f.id === feeId);
      if (!updatedFee) {
        throw new Error("Updated fee not found in response");
      }
      setFees((prevFees) =>
        prevFees.map((fee) =>
          fee.id === feeId
            ? {
                ...fee,
                paid_amount: parseFloat(updatedFee.paid_amount),
                balance_due: parseFloat(updatedFee.balance_due),
                status: updatedFee.status,
              }
            : fee
        )
      );
      setEditingFeeId(null);
      setError(null);
    } catch (error) {
      console.error("Failed to update fee:", error.response?.data, error.response?.status);
      setError(`Failed to update fee: ${error.response?.data?.error || error.message || "Unknown error"}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update date_received in local state
  const updateDateReceived = (feeId, date) => {
    setFees((prevFees) =>
      prevFees.map((fee) =>
        fee.id === feeId ? { ...fee, date_received: date } : fee
      )
    );
    setFilteredFees((prevFiltered) =>
      prevFiltered.map((fee) =>
        fee.id === feeId ? { ...fee, date_received: date } : fee
      )
    );
    setEditingFeeId(null);
    setEditedDateReceived(null);
  };

  // Sort fees
  const sortFees = (key) => {
    const direction =
      sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });
    setFilteredFees((prevFees) =>
      [...prevFees].sort((a, b) => {
        const aValue = a[key] || (key === "date_received" ? null : "");
        const bValue = b[key] || (key === "date_received" ? null : "");
        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return direction === "asc" ? 1 : -1;
        if (bValue === null) return direction === "asc" ? -1 : 1;
        if (aValue < bValue) return direction === "asc" ? -1 : 1;
        if (aValue > bValue) return direction === "asc" ? 1 : -1;
        return 0;
      })
    );
  };

  // Debounced search
  const debouncedSetSearchTerm = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  // Bulk update fees
  const handleBulkUpdate = async () => {
    if (!bulkPaidAmount || selectedFeeIds.length === 0) return;
    setLoading(true);
    try {
      const updates = selectedFeeIds.map((id) => {
        const fee = fees.find((f) => f.id === id);
        const parsedAmount = parseFloat(bulkPaidAmount);
        if (isNaN(parsedAmount) || parsedAmount < 0 || parsedAmount > fee.total_fee) {
          throw new Error(`Invalid amount for ${fee.student_name}`);
        }
        return { id, paid_amount: parsedAmount.toString() };
      });
      const response = await axios.post(
        `${API_URL}/api/fees/update/`,
        { fees: updates },
        { headers: getAuthHeaders() }
      );
      const updatedFees = response.data.fees;
      setFees((prevFees) =>
        prevFees.map((fee) => {
          const updatedFee = updatedFees.find((uf) => uf.id === fee.id);
          if (updatedFee) {
            return {
              ...fee,
              paid_amount: parseFloat(updatedFee.paid_amount),
              balance_due: parseFloat(updatedFee.balance_due),
              status: updatedFee.status,
            };
          }
          return fee;
        })
      );
      setSelectedFeeIds([]);
      setBulkPaidAmount("");
      setShowConfirmDialog(false);
      setError(null);
    } catch (error) {
      setError(`Failed to update fees: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchSchools();
  }, []);

  // Fetch fees on filter change
  useEffect(() => {
    if (schoolId || studentClass) {
      fetchFees();
    }
  }, [schoolId, studentClass, month]);

  // Filter fees based on search term
  useEffect(() => {
    const filtered = fees.filter((fee) =>
      fee.student_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFees(filtered);
  }, [fees, searchTerm]);

  // Handle inline editing
  const handleEditClick = (fee, field) => {
    setEditingFeeId(fee.id + "-" + field);
    if (field === "paid_amount") {
      setEditedPaidAmount(fee.paid_amount);
    } else if (field === "date_received") {
      setEditedDateReceived(fee.date_received);
    }
  };

  const handleSaveEdit = async (feeId, totalFee, field) => {
    if (field === "paid_amount") {
      const parsedAmount = parseFloat(editedPaidAmount);
      if (isNaN(parsedAmount) || parsedAmount < 0 || parsedAmount > totalFee) {
        setError("Invalid amount. Must be between 0 and total fee.");
        return;
      }
      try {
        await updateFee(feeId, parsedAmount);
        setEditingFeeId(null);
        setEditedPaidAmount("");
        setError(null);
      } catch (error) {
        setError(`Failed to save changes: ${error.message}`);
      }
    } else if (field === "date_received") {
      if (editedDateReceived === null) {
        setError("Please select a valid date.");
        return;
      }
      updateDateReceived(feeId, editedDateReceived);
      setError(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingFeeId(null);
    setEditedPaidAmount("");
    setEditedDateReceived(null);
    setError(null);
  };

  // PDF export
  const exportToPDF = () => {
    const printable = document.createElement("div");
    printable.innerHTML = document.getElementById("pdf-template").innerHTML;

    document.body.appendChild(printable);

    const opt = {
      margin: [5, 5, 5, 5],
      filename: `FeeReport_${format(new Date(), "yyyy-MM-dd")}.pdf`,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"], avoid: "tr", before: ".page-break" },
    };

    html2pdf()
      .set(opt)
      .from(printable)
      .save()
      .then(() => document.body.removeChild(printable));
  };

  // Status color mapping
  const statusColors = {
    Paid: "text-green-600",
    Pending: "text-yellow-600",
    Overdue: "text-red-600",
    default: "text-gray-800",
  };

  const getStatusColor = (status) => statusColors[status] || statusColors.default;

  // Calculate totals
  const totalSummary = filteredFees.reduce(
    (acc, fee) => {
      acc.total_fee += parseFloat(fee.total_fee);
      acc.paid_amount += parseFloat(fee.paid_amount);
      acc.balance_due += parseFloat(fee.balance_due);
      return acc;
    },
    { total_fee: 0, paid_amount: 0, balance_due: 0 }
  );

  // Group fees by student_class with subtotals
  const getGroupedFees = (fees) => {
    const grouped = fees.reduce((acc, fee) => {
      const cls = fee.student_class || "Unknown";
      if (!acc[cls]) acc[cls] = [];
      acc[cls].push(fee);
      return acc;
    }, {});
    return Object.keys(grouped)
      .sort()
      .map((cls) => ({
        class: cls,
        fees: grouped[cls],
        subtotals: grouped[cls].reduce(
          (acc, fee) => {
            acc.total_fee += parseFloat(fee.total_fee);
            acc.paid_amount += parseFloat(fee.paid_amount);
            acc.balance_due += parseFloat(fee.balance_due);
            return acc;
          },
          { total_fee: 0, paid_amount: 0, balance_due: 0 }
        ),
      }));
  };

  const schoolName = schools.find((s) => s.id === parseInt(schoolId))?.name || "All Schools";
  const classDisplay = studentClass ? `Class: ${studentClass}` : "All Classes";
  const monthDisplay = month ? format(month, "MMM-yyyy") : "N/A";
  const invoiceNo = `KK-${format(month, "MMM")}-${schoolName.replace(/\s/g, "")}`;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Fee Management</h1>

      {/* Create New Records Section */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Create New Fee Records</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className="border p-2 rounded w-64"
            aria-label="Select school"
          >
            <option value="">Select School</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <DatePicker
            selected={month}
            onChange={(date) => setMonth(date)}
            dateFormat="MMM-yyyy"
            showMonthYearPicker
            className="border p-2 rounded"
            placeholderText="Select Month"
            aria-label="Select month"
          />

          <button
            onClick={createNewMonthFees}
            disabled={!schoolId || !month || createLoading}
            className={`px-4 py-2 rounded text-white ${
              !schoolId || !month || createLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            aria-label="Create new fee records"
          >
            {createLoading ? "Creating Records..." : "Create New Records"}
          </button>
        </div>
        {successMessage && (
          <div className="mt-3 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded">
            {successMessage}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <select
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          className="border p-2 rounded"
          aria-label="Select school"
        >
          <option value="">All Schools</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={studentClass}
          onChange={(e) => setStudentClass(e.target.value)}
          className="border p-2 rounded"
          aria-label="Select class"
        >
          <option value="">All Classes</option>
          {classes.map((cls, index) => (
            <option key={index} value={cls}>
              {cls}
            </option>
          ))}
        </select>

        <DatePicker
          selected={month}
          onChange={(date) => setMonth(date)}
          dateFormat="MMM-yyyy"
          showMonthYearPicker
          className="border p-2 rounded"
          aria-label="Select month"
        />

        <input
          type="text"
          onChange={(e) => debouncedSetSearchTerm(e.target.value)}
          placeholder="Search by Name"
          className="border p-2 rounded flex-1"
          aria-label="Search by student name"
        />

        <button
          onClick={exportToPDF}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-green-400"
          disabled={loading || filteredFees.length === 0}
          aria-label="Export to PDF"
        >
          Export PDF
        </button>
      </div>

      {/* Bulk Action UI */}
      <div className="mb-4 flex gap-4 items-center">
        <input
          type="number"
          value={bulkPaidAmount}
          onChange={(e) => setBulkPaidAmount(e.target.value)}
          placeholder="Enter bulk paid amount"
          className="border p-2 rounded"
          min="0"
          step="0.01"
          aria-label="Bulk paid amount"
        />
        <button
          onClick={() => setShowConfirmDialog(true)}
          disabled={selectedFeeIds.length === 0 || !bulkPaidAmount || loading}
          className={`px-4 py-2 rounded text-white ${
            selectedFeeIds.length === 0 || !bulkPaidAmount || loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          aria-label="Apply bulk update"
        >
          Apply to Selected
        </button>
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg">
              <p className="mb-4">
                Update {selectedFeeIds.length} fees with paid amount {bulkPaidAmount}?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleBulkUpdate}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  aria-label="Confirm bulk update"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  aria-label="Cancel bulk update"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Display School, Class, Month on top */}
      <div className="mb-4 text-lg font-semibold">
        School: {schoolName} | {classDisplay} | Month: {monthDisplay}
      </div>

      {/* Table without Pagination */}
      <div className="overflow-x-auto">
        {loading && (
          <div className="text-center py-4">
            <ClipLoader
              color="#2563eb"
              loading={loading}
              size={50}
              aria-label="Loading fees"
              data-testid="loader"
            />
          </div>
        )}
        {!loading && filteredFees.length === 0 && (
          <div className="text-center py-4">No fees found.</div>
        )}
        {!loading && filteredFees.length > 0 && (
          <table id="fee-table" className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th scope="col" className="border px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedFeeIds.length === filteredFees.length && filteredFees.length > 0}
                    onChange={(e) =>
                      setSelectedFeeIds(e.target.checked ? filteredFees.map((f) => f.id) : [])
                    }
                    aria-label="Select all fees"
                  />
                </th>
                <th
                  scope="col"
                  className="border px-4 py-2 cursor-pointer"
                  onClick={() => sortFees("student_name")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && sortFees("student_name")}
                  aria-label="Sort by Student Name"
                  tabIndex={0}
                  role="button"
                >
                  Name {sortConfig.key === "student_name" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th
                  scope="col"
                  className="border px-4 py-2 cursor-pointer"
                  onClick={() => sortFees("total_fee")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && sortFees("total_fee")}
                  aria-label="Sort by Total Fee"
                  tabIndex={0}
                  role="button"
                >
                  Total Fee {sortConfig.key === "total_fee" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th
                  scope="col"
                  className="border px-4 py-2 cursor-pointer"
                  onClick={() => sortFees("paid_amount")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && sortFees("paid_amount")}
                  aria-label="Sort by Paid Amount"
                  tabIndex={0}
                  role="button"
                >
                  Paid {sortConfig.key === "paid_amount" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th
                  scope="col"
                  className="border px-4 py-2 cursor-pointer"
                  onClick={() => sortFees("date_received")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && sortFees("date_received")}
                  aria-label="Sort by Date Received"
                  tabIndex={0}
                  role="button"
                >
                  Date Received {sortConfig.key === "date_received" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th
                  scope="col"
                  className="border px-4 py-2 cursor-pointer"
                  onClick={() => sortFees("balance_due")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && sortFees("balance_due")}
                  aria-label="Sort by Balance Due"
                  tabIndex={0}
                  role="button"
                >
                  Balance {sortConfig.key === "balance_due" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th
                  scope="col"
                  className="border px-4 py-2 cursor-pointer"
                  onClick={() => sortFees("status")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && sortFees("status")}
                  aria-label="Sort by Payment Status"
                  tabIndex={0}
                  role="button"
                >
                  Status {sortConfig.key === "status" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody>
              {getGroupedFees(filteredFees).map((group) => (
                <React.Fragment key={group.class}>
                  <tr className="bg-gray-200">
                    <td className="border px-4 py-2 font-semibold" colSpan="7">
                      Class: {group.class}
                    </td>
                  </tr>
                  {group.fees.map((fee) => (
                    <tr key={fee.id} className="text-center">
                      <td className="border px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedFeeIds.includes(fee.id)}
                          onChange={(e) => {
                            setSelectedFeeIds((prev) =>
                              e.target.checked ? [...prev, fee.id] : prev.filter((id) => id !== fee.id)
                            );
                          }}
                          aria-label={`Select fee for ${fee.student_name}`}
                        />
                      </td>
                      <td className="border px-4 py-2">{fee.student_name}</td>
                      <td className="border px-4 py-2">{fee.total_fee}</td>
                      <td className="border px-4 py-2">
                        {editingFeeId === `${fee.id}-paid_amount` ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editedPaidAmount}
                              onChange={(e) => setEditedPaidAmount(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit(fee.id, fee.total_fee, "paid_amount");
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              className="border p-1 rounded w-20"
                              min="0"
                              max={fee.total_fee}
                              step="0.01"
                              aria-label={`Edit paid amount for ${fee.student_name}`}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(fee.id, fee.total_fee, "paid_amount")}
                              className="text-green-600 hover:text-green-800"
                              aria-label={`Save paid amount for ${fee.student_name}`}
                            >
                              ✓
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-red-600 hover:text-red-800"
                              aria-label={`Cancel editing for ${fee.student_name}`}
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => handleEditClick(fee, "paid_amount")}
                            className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === "Enter" && handleEditClick(fee, "paid_amount")}
                            aria-label={`Edit paid amount ${fee.paid_amount} for ${fee.student_name}`}
                          >
                            {fee.paid_amount}
                          </span>
                        )}
                      </td>
                      <td className="border px-4 py-2">
                        {editingFeeId === `${fee.id}-date_received` ? (
                          <div className="flex items-center gap-2">
                            <DatePicker
                              selected={editedDateReceived}
                              onChange={(date) => setEditedDateReceived(date)}
                              dateFormat="yyyy-MM-dd"
                              className="border p-1 rounded w-32"
                              aria-label={`Edit date received for ${fee.student_name}`}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(fee.id, fee.total_fee, "date_received")}
                              className="text-green-600 hover:text-green-800"
                              aria-label={`Save date received for ${fee.student_name}`}
                            >
                              ✓
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-red-600 hover:text-red-800"
                              aria-label={`Cancel editing date for ${fee.student_name}`}
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => handleEditClick(fee, "date_received")}
                            className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === "Enter" && handleEditClick(fee, "date_received")}
                            aria-label={`Edit date received ${fee.date_received || '-'} for ${fee.student_name}`}
                          >
                            {fee.date_received ? format(fee.date_received, "yyyy-MM-dd") : '-'}
                          </span>
                        )}
                      </td>
                      <td className="border px-4 py-2">{fee.balance_due}</td>
                      <td className={`border px-4 py-2 font-semibold ${getStatusColor(fee.status)}`}>
                        {fee.status}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold bg-gray-100">
                    <td className="border px-4 py-2 text-right" colSpan="2">
                      Subtotal for {group.class}:
                    </td>
                    <td className="border px-4 py-2">{group.subtotals.total_fee.toFixed(2)}</td>
                    <td className="border px-4 py-2">{group.subtotals.paid_amount.toFixed(2)}</td>
                    <td className="border px-4 py-2"></td>
                    <td className="border px-4 py-2">{group.subtotals.balance_due.toFixed(2)}</td>
                    <td className="border px-4 py-2"></td>
                  </tr>
                </React.Fragment>
              ))}
              <tr className="font-bold bg-gray-50">
                <td className="border px-4 py-2 text-right" colSpan="2">
                  Total:
                </td>
                <td className="border px-4 py-2">{totalSummary.total_fee.toFixed(2)}</td>
                <td className="border px-4 py-2">{totalSummary.paid_amount.toFixed(2)}</td>
                <td className="border px-4 py-2"></td>
                <td className="border px-4 py-2">{totalSummary.balance_due.toFixed(2)}</td>
                <td className="border px-4 py-2"></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* PDF Template */}
      <div id="pdf-template" style={{ display: "none", fontFamily: "'Helvetica', sans-serif", color: "#333" }}>
        {/* Header */}
        <div className="bg-blue-50 rounded p-4 mb-4 border border-blue-200">
          <div className="grid grid-cols-2 gap-4 items-start">
            <div>
              <h2 className="text-2xl font-bold text-blue-800">Fee Management Report</h2>
              <div className="text-sm text-gray-700 mt-2">
                <p><strong>INVOICE NO:</strong> {invoiceNo}</p>
                <p><strong>INVOICE TO:</strong> {schoolName}</p>
                <p>{schools.find((s) => s.id === parseInt(schoolId))?.address || "G-15 Markaz, Islamabad"}</p>
                <p><strong>Month:</strong> {monthDisplay}</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <img src="/logo512.png" alt="Koder Kids Logo" style={{ width: "80px", marginBottom: "10px" }} />
              <p className="font-bold text-lg text-blue-800">Koder Kids</p>
              <p className="text-sm text-gray-700">G-15 Markaz, Islamabad</p>
              <p className="text-sm text-gray-700">0316-7394390</p>
              <p className="text-sm text-gray-700">koderkids24@gmail.com</p>
            </div>
          </div>
        </div>

        {/* Introduction */}
        <p className="text-sm text-gray-700 mb-4">
          To: {schoolName}, Here is the attached fee for {monthDisplay}
        </p>
        <p className="text-sm text-gray-700 mb-4">
          The following details outline the fee records for the specified period.
        </p>

        {/* Body */}
        <table className="min-w-full text-sm" style={{ width: "100%", maxWidth: "190mm", borderCollapse: "collapse" }}>
          <thead>
            <tr className="bg-blue-100 text-gray-800">
              <th className="px-3 py-2 font-bold text-left border">Name</th>
              <th className="px-3 py-2 font-bold text-center border">Total Fee</th>
              <th className="px-3 py-2 font-bold text-center border">Paid</th>
              <th className="px-3 py-2 font-bold text-center border">Date Received</th>
              <th className="px-3 py-2 font-bold text-center border">Balance</th>
              <th className="px-3 py-2 font-bold text-center border">Status</th>
            </tr>
          </thead>
          <tbody>
            {getGroupedFees(filteredFees).map((group, index) => (
              <React.Fragment key={group.class}>
                <tr className="bg-blue-200" style={{ breakInside: "avoid" }}>
                  <td className="px-3 py-2 font-bold text-gray-800 text-left border" colSpan="6">
                    Class: {group.class}
                  </td>
                </tr>
                {group.fees.map((fee) => (
                  <tr
                    key={fee.id}
                    className={`text-center ${index % 2 === 0 ? "bg-white" : "bg-blue-50"}`}
                    style={{ breakInside: "avoid" }}
                  >
                    <td className="px-3 py-2 text-left border align-middle">{fee.student_name}</td>
                    <td className="px-3 py-2 border align-middle">{fee.total_fee}</td>
                    <td className="px-3 py-2 border align-middle">{fee.paid_amount}</td>
                    <td className="px-3 py-2 border align-middle">
                      {fee.date_received ? format(fee.date_received, "yyyy-MM-dd") : '-'}
                    </td>
                    <td className="px-3 py-2 border align-middle">{fee.balance_due}</td>
                    <td className={`px-3 py-2 font-semibold border align-middle ${getStatusColor(fee.status)}`}>
                      {fee.status}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold bg-blue-100" style={{ breakInside: "avoid" }}>
                  <td className="px-3 py-2 text-right text-gray-800 border align-middle" colSpan="1">
                    Subtotal for {group.class}:
                  </td>
                  <td className="px-3 py-2 border align-middle">{group.subtotals.total_fee.toFixed(2)}</td>
                  <td className="px-3 py-2 border align-middle">{group.subtotals.paid_amount.toFixed(2)}</td>
                  <td className="px-3 py-2 border align-middle"></td>
                  <td className="px-3 py-2 border align-middle">{group.subtotals.balance_due.toFixed(2)}</td>
                  <td className="px-3 py-2 border align-middle"></td>
                </tr>
              </React.Fragment>
            ))}
            <tr className="font-bold bg-blue-50" style={{ breakInside: "avoid" }}>
              <td className="px-3 py-2 text-right text-gray-800 border align-middle" colSpan="1">
                Total:
              </td>
              <td className="px-3 py-2 border align-middle">{totalSummary.total_fee.toFixed(2)}</td>
              <td className="px-3 py-2 border align-middle">{totalSummary.paid_amount.toFixed(2)}</td>
              <td className="px-3 py-2 border align-middle"></td>
              <td className="px-3 py-2 border align-middle">{totalSummary.balance_due.toFixed(2)}</td>
              <td className="px-3 py-2 border align-middle"></td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div className="text-center text-sm text-gray-700 pt-4 mt-4 border-t">
          <p className="mb-2">
            Please process the payment at earliest. Bank details are: Bank IBAN Number: PK62BKIP0312100062460001, Title: Early Bird Koder Kids Private Limited, Bank Islami. Thank you.
          </p>
          <p className="italic mb-2">
            This is a system-generated document and does not require a physical signature.
          </p>
          <p className="mt-4">
            Page <span className="pageNumber"></span> of <span className="totalPages"></span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default FeePage;