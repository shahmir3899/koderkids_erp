import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";

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
  }, []);

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

  // Filter fees based on selected filters
  const filteredFees = useMemo(() => {
    return fees.filter(fee =>
      (schoolFilter === "" || fee.school === schoolFilter) &&
      (classFilter === "" || fee.student_class === classFilter) &&
      (monthFilter === "" || fee.month === monthFilter)
    );
  }, [fees, schoolFilter, classFilter, monthFilter]);

  return (
    <div className="fee-page">
      <h1 className="page-header">Fee Management</h1>

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
              {filteredFees.map((fee, index) => (
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