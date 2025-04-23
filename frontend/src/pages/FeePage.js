import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { API_URL, getAuthHeaders } from "../api";
import html2pdf from "html2pdf.js";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import debounce from "lodash/debounce";


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
  const [error, setError] = useState(null);

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
      setClasses(Array.from(allClasses).sort());
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
        },
      });
      setFees(response.data);
      setError(null);
    } catch (error) {
      console.error("Failed to fetch fees:", error);
      setError("Failed to load fees. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Update fee via API
  const updateFee = async (feeId, paidAmount) => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      if (!headers.Authorization) {
        throw new Error("Authentication token missing");
      }
      await axios.post(
        `${API_URL}/api/fees/update/`,
        { fees: [{ id: feeId, paid_amount: paidAmount.toString() }] }, // Stringify paid_amount
        { headers }
      );
      setFees((prevFees) =>
        prevFees.map((fee) =>
          fee.id === feeId
            ? {
                ...fee,
                paid_amount: paidAmount,
                balance_due: parseFloat(fee.total_fee) - paidAmount,
                status: parseFloat(fee.total_fee) - paidAmount === 0 ? "Paid" : "Pending",
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

  // Debounced search
  const debouncedSetSearchTerm = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  // Initial data fetch
  useEffect(() => {
    fetchSchools();
  }, []);

  // Fetch fees on filter change
  useEffect(() => {
    fetchFees();
  }, [schoolId, studentClass, month]);

  // Filter fees based on search term
  useEffect(() => {
    const filtered = fees.filter((fee) =>
      fee.student_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFees(filtered);
  }, [fees, searchTerm]);

  // Handle inline editing
  const handleEditClick = (fee) => {
    setEditingFeeId(fee.id);
    setEditedPaidAmount(fee.paid_amount);
  };

  const handleSaveEdit = async (feeId, totalFee) => {
    const parsedAmount = parseFloat(editedPaidAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0 || parsedAmount > totalFee) {
      setError("Invalid amount. Must be between 0 and total fee.");
      return;
    }
    const originalFee = fees.find((fee) => fee.id === feeId);
    setFees((prevFees) =>
      prevFees.map((fee) =>
        fee.id === feeId
          ? {
              ...fee,
              paid_amount: parsedAmount,
              balance_due: parseFloat(fee.total_fee) - parsedAmount,
              status:
                parseFloat(fee.total_fee) - parsedAmount === 0
                  ? "Paid"
                  : "Pending",
            }
          : fee
      )
    );
    try {
      await updateFee(feeId, parsedAmount);
    } catch {
      setFees((prevFees) =>
        prevFees.map((fee) =>
          fee.id === feeId ? { ...fee, ...originalFee } : fee
        )
      );
    }
  };

  const handleCancelEdit = () => {
    setEditingFeeId(null);
    setEditedPaidAmount("");
    setError(null);
  };

  // PDF export with header, body, footer
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
      .then(() => document.body.removeChild(printable)); // Cleanup
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
  const schoolName = schools.find((s) => s.id === parseInt(schoolId))?.name || "AllSchools";
  const invoiceNo = `KK-${format(month, "MMM")}-${schoolName.replace(/\s/g, "")}`;
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Fee Management</h1>

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
        >
          Export PDF
        </button>
      </div>

      {/* Table with Loading and Empty States */}
      <div className="overflow-x-auto">
        {loading && <div className="text-center py-4">Loading...</div>}
        {!loading && filteredFees.length === 0 && (
          <div className="text-center py-4">No fees found.</div>
        )}
        {!loading && filteredFees.length > 0 && (
          <table
            id="fee-table"
            className="min-w-full bg-white border border-gray-300"
          >
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Name</th>
                
                <th className="border px-4 py-2">Class</th>
                <th className="border px-4 py-2">Month</th>
                <th className="border px-4 py-2">Total Fee</th>
                <th className="border px-4 py-2">Paid</th>
                <th className="border px-4 py-2">Balance</th>
                <th className="border px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {getGroupedFees(filteredFees).map((group) => (
                <React.Fragment key={group.class}>
                  <tr className="bg-gray-200">
                    <td className="border px-4 py-2 font-semibold" colSpan="8">
                      Class: {group.class}
                    </td>
                  </tr>
                  {group.fees.map((fee) => (
                    <tr key={fee.id} className="text-center">
                      <td className="border px-4 py-2">{fee.student_name}</td>
                     
                      <td className="border px-4 py-2">{fee.student_class}</td>
                      <td className="border px-4 py-2">{fee.month}</td>
                      <td className="border px-4 py-2">{fee.total_fee}</td>
                      <td className="border px-4 py-2">
                        {editingFeeId === fee.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editedPaidAmount}
                              onChange={(e) => setEditedPaidAmount(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleSaveEdit(fee.id, fee.total_fee);
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              className="border p-1 rounded w-20"
                              min="0"
                              max={fee.total_fee}
                              aria-label={`Edit paid amount for ${fee.student_name}`}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(fee.id, fee.total_fee)}
                              className="text-green-600 hover:text-green-800"
                              aria-label="Save"
                            >
                              ✓
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-red-600 hover:text-red-800"
                              aria-label="Cancel"
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => handleEditClick(fee)}
                            className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleEditClick(fee)
                            }
                            aria-label={`Edit paid amount ${fee.paid_amount} for ${fee.student_name}`}
                          >
                            {fee.paid_amount}
                          </span>
                        )}
                      </td>
                      <td className="border px-4 py-2">{fee.balance_due}</td>
                      <td
                        className={`border px-4 py-2 font-semibold ${getStatusColor(
                          fee.status
                        )}`}
                      >
                        {fee.status}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold bg-gray-100">
                    <td className="border px-4 py-2 text-right" colSpan="4">
                      Subtotal for {group.class}:
                    </td>
                    <td className="border px-4 py-2">
                      {group.subtotals.total_fee.toFixed(2)}
                    </td>
                    <td className="border px-4 py-2">
                      {group.subtotals.paid_amount.toFixed(2)}
                    </td>
                    <td className="border px-4 py-2">
                      {group.subtotals.balance_due.toFixed(2)}
                    </td>
                    <td className="border px-4 py-2"></td>
                  </tr>
                </React.Fragment>
              ))}
              <tr className="font-bold bg-gray-50">
                <td className="border px-4 py-2 text-right" colSpan="4">
                  Total:
                </td>
                <td className="border px-4 py-2">
                  {totalSummary.total_fee.toFixed(2)}
                </td>
                <td className="border px-4 py-2">
                  {totalSummary.paid_amount.toFixed(2)}
                </td>
                <td className="border px-4 py-2">
                  {totalSummary.balance_due.toFixed(2)}
                </td>
                <td className="border px-4 py-2"></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Hidden PDF Template */}
      <div id="pdf-template" style={{ display: "none" }}>
  {/* Header */}
  <div className="flex justify-between items-center mb-2 border-b pb-2">
  <div>
    <p><strong>MONTH:</strong> {month ? format(month, "MMM-yyyy") : "N/A"}</p>
    <p><strong>INVOICE NO:</strong> {invoiceNo}</p>
    <p><strong>INVOICE TO:</strong> {schoolName}</p>
    <p>{schoolId && schools.find((s) => s.id === schoolId)?.address || "G-15 Markaz, Islamabad"}</p>
  </div>
  <div className="flex flex-col items-end">
  <img src="/logo512.png" alt="Logo" style={{ width: "80px" }} />

    <p className="font-bold">Koder Kids</p>
    <p>G-15 Markaz, Islamabad</p>
    <p>0316-7394390</p>
    <p>koderkids24@gmail.com</p>
  </div>
</div>


  {/* Body */}
  <table className="min-w-full border border-gray-300 text-xs" style={{ width: "100%", maxWidth: "190mm" }}>
    <thead>
      <tr className="bg-gray-100">
        <th className=" px-2 py-1">Name</th>
        <th className=" px-2 py-1">School</th>
        <th className=" px-2 py-1">Class</th>
        <th className=" px-2 py-1">Month</th>
        <th className=" px-2 py-1">Total Fee</th>
        <th className=" px-2 py-1">Paid</th>
        <th className=" px-2 py-1">Balance</th>
        <th className=" px-2 py-1">Status</th>
      </tr>
    </thead>
    <tbody>
      {getGroupedFees(filteredFees).map((group) => (
        <React.Fragment key={group.class}>
          <tr className="bg-gray-200" style={{ breakInside: "avoid" }}>
            <td className="border px-2 py-1 font-semibold" colSpan="8">
              Class: {group.class}
            </td>
          </tr>
          {group.fees.map((fee) => (
            <tr key={fee.id} className="text-center" style={{ breakInside: "avoid" }}>
              <td className="border px-2 py-1">{fee.student_name}</td>
              <td className="border px-2 py-1">{fee.school || ""}</td>
              <td className="border px-2 py-1">{fee.student_class}</td>
              <td className="border px-2 py-1">{fee.month}</td>
              <td className="border px-2 py-1">{fee.total_fee}</td>
              <td className="border px-2 py-1">{fee.paid_amount}</td>
              <td className="border px-2 py-1">{fee.balance_due}</td>
              <td
                className={`border px-2 py-1 font-semibold ${getStatusColor(
                  fee.status
                )}`}
              >
                {fee.status}
              </td>
            </tr>
          ))}
          <tr className="font-semibold bg-gray-100" style={{ breakInside: "avoid" }}>
            <td className="border px-2 py-1 text-right" colSpan="4">
              Subtotal for {group.class}:
            </td>
            <td className="border px-2 py-1">
              {group.subtotals.total_fee.toFixed(2)}
            </td>
            <td className="border px-2 py-1">
              {group.subtotals.paid_amount.toFixed(2)}
            </td>
            <td className="border px-2 py-1">
              {group.subtotals.balance_due.toFixed(2)}
            </td>
            <td className="border px-2 py-1"></td>
          </tr>
        </React.Fragment>
      ))}
      <tr className="font-bold bg-gray-50" style={{ breakInside: "avoid" }}>
        <td className="border px-2 py-1 text-right" colSpan="4">
          Total:
        </td>
        <td className="border px-2 py-1">
          {totalSummary.total_fee.toFixed(2)}
        </td>
        <td className="border px-2 py-1">
          {totalSummary.paid_amount.toFixed(2)}
        </td>
        <td className="border px-2 py-1">
          {totalSummary.balance_due.toFixed(2)}
        </td>
        <td className="border px-2 py-1"></td>
      </tr>
    </tbody>
  </table>

  {/* Footer */}
  <div className="text-xs text-gray-600 pt-3 mt-4 border-t">
  <p className="mt-2 font-semibold">Authorized Signature</p>
  <p>_____________________________</p>
  <p className="mt-2 italic">This is a system-generated document and does not require a physical signature.</p>
  <p className="mt-2">Page <span className="pageNumber"></span> of <span className="totalPages"></span></p>
</div>
</div>
    </div>
  );
}

export default FeePage;