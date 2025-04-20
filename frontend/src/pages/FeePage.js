import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import html2pdf from "html2pdf.js";
import { getSchoolsWithClasses } from "../api";
import {
  useReactTable,
  getCoreRowModel,
  getGroupedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';



function FeePage() {
  // State declarations
  const [fees, setFees] = useState([]);
  const [schoolFilter, setSchoolFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [editingRow, setEditingRow] = useState(null);
  const [modifiedFees, setModifiedFees] = useState({});
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false); // Added for create button feedback
  const [allClasses, setAllClasses] = useState([]);
  const [allSchools, setAllSchools] = useState([]);
  const [schoolDetails, setSchoolDetails] = useState(null);

  const [allClassesBySchool, setAllClassesBySchool] = useState({});



  // Fetch fees data from the backend
  async function fetchFees() {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/fees/`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access")}`,
          "Content-Type": "application/json"
        }
      });
      if (Array.isArray(response.data)) {
        setFees(response.data);
      } else {
        setFees([]);
      }
    } catch (error) {
      setError("Failed to fetch fees. Please try again.");
    }
  }

  async function fetchStudents() {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/students/`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access")}`,
          "Content-Type": "application/json"
        }
      });
  
      if (Array.isArray(response.data)) {
        const uniqueSchools = [...new Set(response.data.map(student => student.school))];
  
        // Group classes by school
        const classesBySchool = {};
        response.data.forEach(student => {
          if (!classesBySchool[student.school]) {
            classesBySchool[student.school] = new Set();
          }
          classesBySchool[student.school].add(student.student_class);
        });
  
        setAllSchools(uniqueSchools);
        setAllClassesBySchool(classesBySchool);  // New state
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    }
  }
  
  


  // Initial data fetch
  useEffect(() => {
    fetchFees();
    fetchStudents();
    const loadSchoolDetails = async () => {
      try {
        const schools = await getSchoolsWithClasses();
        if (schoolFilter) {
          const matched = schools.find(s => s.name === schoolFilter);
          setSchoolDetails(matched || null);
        }
      } catch (error) {
        console.error("Failed to load school info for PDF receipt:", error);
      }
    };
  
    loadSchoolDetails();
  }, [schoolFilter]);
  

  // Handle changes in paid amount
  function handlePaidAmountChange(id, amount) {
    const updatedFees = fees.map(fee =>
      fee.id === id ? {
        ...fee,
        paid_amount: parseFloat(amount) || 0,
        balance_due: fee.total_fee - (parseFloat(amount) || 0)
      } : fee
    );
    setFees(updatedFees);
    setModifiedFees(prev => ({ ...prev, [id]: true }));
  }

  // Handle changes in total fee
  function handleTotalFeeChange(id, amount) {
    const updatedFees = fees.map(fee =>
      fee.id === id ? { ...fee, total_fee: amount } : fee
    );
    setFees(updatedFees);
    setModifiedFees(prev => ({ ...prev, [id]: true }));
  }

  // Handle changes in status
  function handleStatusChange(id, newStatus) {
    const updatedFees = fees.map(fee =>
      fee.id === id ? { ...fee, status: newStatus } : fee
    );
    setFees(updatedFees);
    setModifiedFees(prev => ({ ...prev, [id]: true }));
  }

  // Save modified fees to the backend
  async function savePaidAmounts() {
    try {
      const modifiedData = fees.filter(fee => modifiedFees[fee.id]);
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/fees/update/`, { fees: modifiedData });
      if (response.status === 200) {
        alert("✅ Payments updated successfully!");
        fetchFees();
        setModifiedFees({});
      } else {
        alert("⚠️ Failed to update payments.");
      }
    } catch (error) {
      alert("Failed to update payments!");
    }
  }

  // Adjusted "Create New Month Records" functionality
  async function createNextMonthRecords() {
    const uniqueMonths = [...new Set(fees.map(fee => fee.month))];
    let nextMonthString;

    // Determine the next month based on existing data or current month if no data exists
    if (uniqueMonths.length === 0) {
      const now = new Date();
      nextMonthString = now.toLocaleString('default', { month: 'long' }) + " " + now.getFullYear();
    } else {
      const dates = uniqueMonths.map(month => Date.parse(month.replace(" ", " 1, ")));
      const latestTimestamp = Math.max(...dates);
      const latestDate = new Date(latestTimestamp);
      const nextMonthDate = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 1);
      nextMonthString = nextMonthDate.toLocaleString('default', { month: 'long' }) + " " + nextMonthDate.getFullYear();
    }

    // Show confirmation dialog with the calculated next month
    if (window.confirm(`This will create records for ${nextMonthString}. Proceed?`)) {
      try {
        setLoading(true);
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/fees/create/`, {});
        alert(response.data.message || `Records created for ${nextMonthString}`);
        fetchFees(); // Refresh data after creation
      } catch (error) {
        alert("Failed to create new month records.");
      } finally {
        setLoading(false);
      }
    }
  }
  function generatePDFReceipt() {
    if (!schoolFilter || !monthFilter) {
      alert("Please select both School and Month to generate the receipt.");
      return;
    }
  
    if (filteredFees.length === 0) {
      alert("No fee records found for selected school and month.");
      return;
    }
  
    // Temporarily show the div to let html2pdf read it
    const element = document.getElementById("pdf-receipt");
    element.style.display = "block"; // 👈 Show it
  
    // Wait a moment so the DOM is ready
    setTimeout(() => {
      const options = {
        margin: 10,
        filename: `${schoolFilter}_${monthFilter}_Receipt.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      };
  
      html2pdf()
        .from(element)
        .set(options)
        .save()
        .then(() => {
          element.style.display = "none"; // 👈 Hide again after generation
        });
    }, 300);
  }
  
  
  // Filter fees based on selected filters
  const filteredFees = useMemo(() => {
    return fees.filter(fee =>
      (schoolFilter === "" || fee.school === schoolFilter) &&
      (classFilter === "" || fee.student_class === classFilter) &&
      (monthFilter === "" || fee.month === monthFilter)
    );
  }, [fees, schoolFilter, classFilter, monthFilter]);
  const columnHelper = createColumnHelper();

  const columns = [
    columnHelper.accessor('student_class', {
      header: 'Class',
      cell: info => info.getValue(),
      footer: info => null,
      enableGrouping: true,
    }),
    columnHelper.accessor('student_name', {
      header: 'Student',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('monthly_fee', {
      header: 'Current Fee',
      cell: info => `Rs. ${info.getValue()}`,
    }),
    columnHelper.accessor('paid_amount', {
      header: 'Paid',
      cell: info => `Rs. ${info.getValue()}`,
    }),
    columnHelper.accessor('balance_due', {
      header: 'Balance',
      cell: info => `Rs. ${info.getValue()}`,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => info.getValue(),
    }),
  ];

  const table = useReactTable({
    data: filteredFees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    state: {},
  });
  const sortedFees = [...filteredFees].sort((a, b) => {
    if (a.student_class !== b.student_class) {
      return a.student_class.localeCompare(b.student_class, undefined, { numeric: true });
    }
    return a.student_name.localeCompare(b.student_name);
  });
  
  return (
    <div className="fee-page">
      <h1 className="heading-primary">Fee Management</h1>
      {schoolDetails && (
  <div id="pdf-receipt" style={{ display: "none", fontFamily: "Arial", fontSize: "12px", padding: "20px" }}>
    {/* Header Row */}
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
      <div>
        <p><strong>MONTH:</strong> {monthFilter}</p>
        <p><strong>INVOICE NO:</strong> KK-{monthFilter.slice(0, 3).toUpperCase()}-{schoolFilter.replace(/\s/g, "")}</p>
        <p><strong>INVOICE TO:</strong> {schoolDetails.name}</p>
        <p>{schoolDetails.address}</p>
      </div>
      <div style={{ textAlign: "right" }}>
        <img src="/logo192.png" alt="Logo" width="60" />
        <p><strong>Koder Kids</strong></p>
        <p>G-15 Markaz, Islamabad</p>
        <p>0316-7394390</p>
        <p>koderkids24@gmail.com</p>
      </div>
    </div>

    {/* Invoice Table */}
    <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
      <thead style={{ backgroundColor: "#f0f0f0" }}>
        <tr>
          <th>Student</th>
          <th>Class</th>
          <th>Previous Fee</th>
          <th>Current Fee</th>
          <th>Total Fee</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
  {(() => {
    const grouped = {};

    // Group fees by student_class
    filteredFees.forEach(fee => {
      const cls = fee.student_class || "Unspecified";
      if (!grouped[cls]) grouped[cls] = [];
      grouped[cls].push(fee);
    });

    // Render grouped rows with class headings and subtotals
    return Object.entries(grouped).flatMap(([student_class, classFees], index) => {
      const classTotal = classFees.reduce((sum, f) => sum + Number(f.monthly_fee || 0), 0);

      return [
        // Class Header Row
        <tr key={`class-${student_class}`} style={{ backgroundColor: "#e0e0e0", fontWeight: "bold" }}>
          <td colSpan="6">Class: {student_class}</td>
        </tr>,

        // Student Rows
        ...classFees.map((fee, i) => {
          const previous = 0;
          const current = Number(fee.monthly_fee || 0);
          const total = previous + current;
          const paid = Number(fee.paid_amount || 0);
          const status = paid === 0 ? "Unpaid" : paid < total ? "Partial" : "Paid";

          return (
            <tr key={`fee-${student_class}-${i}`}>
              <td>{fee.student_name}</td>
              <td>{fee.student_class}</td>
              <td>Rs. {previous}</td>
              <td>Rs. {current}</td>
              <td>Rs. {total}</td>
              <td>{status}</td>
            </tr>
          );
        }),

        // Subtotal Row
        <tr key={`subtotal-${student_class}`} style={{ fontWeight: "bold", borderTop: "2px solid black" }}>
          <td colSpan="3">Subtotal for {student_class}</td>
          <td colSpan="3">Rs. {classTotal}</td>
        </tr>
      ];
    });
  })()}
</tbody>

    </table>

    {/* Totals */}
    <table style={{ width: "100%", marginTop: "20px" }}>
      <tbody>
        <tr>
          <td><strong>Total Previous Fee:</strong> Rs. 0</td>
          <td><strong>Total Current Fee:</strong> Rs. {filteredFees.reduce((sum, f) => sum + Number(f.monthly_fee || 0), 0)}</td>
          <td><strong>Total Fee:</strong> Rs. {filteredFees.reduce((sum, f) => sum + Number(f.monthly_fee || 0), 0)}</td>
        </tr>
      </tbody>
    </table>

    {/* Footer */}
    <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between" }}>
      <div>
        <p><strong>Authorized Signature</strong></p>
        <p>_________________________</p>
      </div>
    </div>
    <p style={{ marginTop: "30px", fontStyle: "italic", fontSize: "11px" }}>
      This is a system-generated document and does not require a physical signature.
    </p>
  </div>
)}

      {/* Filter Section */}
      <div className="filter-card">
        <div className="filter-container">
          <div className="filter-item">
            <label className="filter-label">School: </label>
            <select className="filter-select" value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}>
            <option value="">All Schools</option>
            {allSchools.map((school, index) => (
              <option key={index} value={school}>{school}</option>
            ))}
            </select>

          </div>
          <div className="filter-item">
            <label className="filter-label">Class: </label>
            <select className="filter-select" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">All Classes</option>
            {schoolFilter && allClassesBySchool[schoolFilter] 
              ? Array.from(allClassesBySchool[schoolFilter])
                  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                  .map((student_class, index) => (
                    <option key={index} value={student_class}>{student_class}</option>
                  ))
              : Object.values(allClassesBySchool).flat().map((student_class, index) => (
                  <option key={index} value={student_class}>{student_class}</option>
                ))
            }
          </select>

          </div>
          <div className="filter-item">
            <label className="filter-label">Month: </label>
            <select className="filter-select" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
              <option value="">All Months</option>
              {Array.from(new Set(fees.map(fee => fee.month))).map((month, index) => (
                <option key={index} value={month}>{month}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => setShowResults(true)}>
            🔍 Search
          </button>
        </div>
      </div>

      {/* Create New Month Records Button */}
      <button
        className={`btn btn-info ${loading ? 'btn-loading' : ''}`}
        onClick={createNextMonthRecords}
        disabled={loading}
        title="Creates records for the next month based on existing data"
      >
        {loading ? "Creating..." : "➕ Create Next Month Records"}
      </button>
      <div id="pdf-receipt" style={{ display: "none", padding: "20px", fontSize: "12px", fontFamily: "Arial" }}>
      <h2 style={{ textAlign: "center" }}>Koder Kids Fee System</h2>
      <p style={{ textAlign: "center", margin: 0 }}>G-15 Markaz, Islamabd, Pakistan | Phone: 0316-7394390</p>
      <p style={{ textAlign: "center", marginBottom: "20px" }}>Official School Fee Invoice</p>

      <table style={{ width: "100%", marginBottom: "10px" }}>
        <tbody>
          <tr>
            <td><strong>Invoice No:</strong> INV-{Date.now().toString().slice(-5)}</td>
            <td><strong>Date:</strong> {new Date().toLocaleDateString()}</td>
          </tr>
          <tr>
            <td><strong>School:</strong> {schoolFilter}</td>
            <td><strong>Month:</strong> {monthFilter}</td>
          </tr>
        </tbody>
      </table>

      <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead style={{ backgroundColor: "#f0f0f0" }}>
          <tr>
            <th>Student Name</th>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Fee</th>
            <th>Discount</th>
            <th>Tax</th>
            <th>Total</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Method</th>
          </tr>
        </thead>
        <tbody>
          {sortedFees.map((fee, index) => {
            const total = Number(fee.monthly_fee || 0);
            const paid = Number(fee.paid_amount || 0);
            const balance = Number(fee.balance_due || 0);
            const status = paid === 0 ? "Unpaid" : balance === 0 ? "Paid" : "Partial";

            return (
              <tr key={index}>
                <td>{fee.student_name}</td>
                <td>Monthly Tuition</td>
                <td>1</td>
                <td>{fee.monthly_fee}</td>
                <td>0</td>
                <td>0</td>
                <td>{total}</td>
                <td>{paid}</td>
                <td>{balance}</td>
                <td>{status}</td>
                <td>{fee.payment_method || "N/A"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <table style={{ width: "100%", marginTop: "20px" }}>
        <tbody>
          <tr>
            <td><strong>Total Payable:</strong> Rs. {filteredFees.reduce((sum, f) => sum + Number(f.monthly_fee || 0), 0)}</td>
            <td><strong>Total Paid:</strong> Rs. {filteredFees.reduce((sum, f) => sum + Number(f.paid_amount || 0), 0)}</td>
            <td><strong>Outstanding:</strong> Rs. {filteredFees.reduce((sum, f) => sum + Number(f.balance_due || 0), 0)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between" }}>
        <div>
          <p><strong>Authorized Signature</strong></p>
          <p>_________________________</p>
        </div>
        <div>
          <p><strong>Stamp</strong></p>
          <p style={{ border: "1px dashed #000", width: "100px", height: "60px" }}></p>
        </div>
      </div>

      <p style={{ marginTop: "30px", fontStyle: "italic", fontSize: "11px" }}>
        Note: This is a system-generated document and does not require a physical signature.
      </p>
    </div>

      {/* Fee Table */}
      {showResults && (
        <div className="table-container">
          <table className="fee-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>School</th>
                <th>Class</th>
                <th>Month</th>
                <th>Monthly Fee</th>
                <th>Total Fee</th>
                <th>Paid Amount</th>
                <th>Balance Due</th>
                <th>Payment Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedFees.map((fee, index) => (
                <tr key={fee.id}>
                  <td>{fee.student_name}</td>
                  <td>{fee.school}</td>
                  <td>{fee.student_class}</td>
                  <td>{fee.month}</td>
                  <td>{fee.monthly_fee}</td>
                  <td className="total-fee-cell">
                    {editingRow === fee.id ? (
                      <>
                        <input
                          type="number"
                          value={fee.total_fee}
                          onChange={(e) => handleTotalFeeChange(fee.id, e.target.value)}
                          className="total-fee-input"
                        />
                        <button onClick={() => setEditingRow(null)} className="save-edit-button">
                          ✅
                        </button>
                      </>
                    ) : (
                      <div className="fee-value-container">
                        {fee.total_fee}
                        <button onClick={() => setEditingRow(fee.id)} className="edit-button">
                          ✏️
                        </button>
                      </div>
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      value={fee.paid_amount}
                      onChange={(e) => handlePaidAmountChange(fee.id, e.target.value)}
                      className="paid-amount-input"
                    />
                  </td>
                  <td>{fee.balance_due}</td>
                  <td>{fee.payment_date || "N/A"}</td>
                  <td>
                    <select
                      value={fee.status}
                      onChange={(e) => handleStatusChange(fee.id, e.target.value)}
                      className="status-select"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Save Payments Button */}
      <button className="btn btn-success" onClick={savePaidAmounts}>
        💾 Save Payments
      </button>
      <button className="btn btn-secondary" onClick={generatePDFReceipt}>
        📄 Generate PDF Receipt
      </button>
      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
          <button className="btn btn-danger" onClick={fetchFees}>
            🔄 Retry
          </button>
        </div>
      )}
    </div>
  );
}

export default FeePage;