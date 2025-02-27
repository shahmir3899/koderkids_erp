import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";

function FeePage() {
    const [fees, setFees] = useState([]);
    const [schoolFilter, setSchoolFilter] = useState("");
    const [classFilter, setClassFilter] = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [editingRow, setEditingRow] = useState(null);
    const [modifiedFees, setModifiedFees] = useState({});
    const [error, setError] = useState(null);
    const [showResults, setShowResults] = useState(false); // Controls whether to show filtered results

    // Fetch fees data from the backend
    async function fetchFees() {
        try {
            console.log("🔄 Fetching fee data...");
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/fees/`, {
                headers: {
                    "ngrok-skip-browser-warning": "true",
                    "Content-Type": "application/json"
                }
            });
            console.log("Fetched Fees Data:", response.data);

            if (Array.isArray(response.data)) {
                setFees(response.data);
            } else {
                console.error("Expected an array but got:", response.data);
                setFees([]);
            }
        } catch (error) {
            console.error("Error fetching fees:", error);
            setError("Failed to fetch fees. Please try again.");
        }
    }

    useEffect(() => {
        fetchFees();
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
        setModifiedFees(prev => ({ ...prev, [id]: true })); // Mark this row as modified
    }

    // Handle changes in total fee
    function handleTotalFeeChange(id, amount) {
        const updatedFees = fees.map(fee =>
            fee.id === id ? { ...fee, total_fee: amount } : fee
        );
        setFees(updatedFees);
        setModifiedFees(prev => ({ ...prev, [id]: true })); // Mark this row as modified
    }

    // Handle changes in status
    function handleStatusChange(id, newStatus) {
        const updatedFees = fees.map(fee =>
            fee.id === id ? { ...fee, status: newStatus } : fee
        );
        setFees(updatedFees);
        setModifiedFees(prev => ({ ...prev, [id]: true })); // Mark this row as modified
    }

    // Save modified fees to the backend
    async function savePaidAmounts() {
        try {
            const modifiedData = fees.filter(fee => modifiedFees[fee.id]);
            console.log("🔄 Sending updated fee data:", modifiedData);

            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/fees/update/`, { fees: modifiedData });

            if (response.status === 200) {
                alert("✅ Payments updated successfully!");
                fetchFees(); // Refresh data after saving
                setModifiedFees({}); // Reset modified fees
            } else {
                alert("⚠️ Failed to update payments.");
            }
        } catch (error) {
            console.error("❌ Error updating payments:", error);
            alert("Failed to update payments!");
        }
    }

    // Create new month records
    async function createNewMonthRecords() {
        const month = prompt("Enter the month and year (e.g., January 2024):");
        if (!month) return;

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/fees/create/`, { month });

            alert(response.data.message);
            fetchFees();
        } catch (error) {
            console.error("Error creating new month records:", error);
            alert("Failed to create new month records.");
        }
    }

    // Filter fees based on school, class, and month
    const filteredFees = useMemo(() => {
        return fees.filter(fee =>
            (schoolFilter === "" || fee.school === schoolFilter) &&
            (classFilter === "" || fee.student_class === classFilter) &&
            (monthFilter === "" || fee.month === monthFilter)
        );
    }, [fees, schoolFilter, classFilter, monthFilter]);

    // Table styling
    const tableStyle = {
        width: "90%",
        borderCollapse: "collapse",
        marginTop: "7px",
        marginLeft: "auto",
        marginRight: "auto",
    };

    const thTdStyle = {
        border: "1px solid #ddd",
        padding: "2px",
        textAlign: "center",
    };

    const thStyle = {
        backgroundColor: "#007BFF",
        color: "white",
    };

    const trAlternate = {
        backgroundColor: "#f2f2f2",
    };

    // Button styling
    const buttonStyle = {
        padding: "12px 20px",
        fontSize: "16px",
        backgroundColor: "#007BFF",
        color: "white",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        fontWeight: "bold",
        transition: "0.3s",
    };

    const saveButtonStyle = {
        ...buttonStyle,
        backgroundColor: "#28a745",
    };

    const buttonHoverStyle = {
        backgroundColor: "#0056b3",
    };

    const saveButtonHoverStyle = {
        backgroundColor: "#218838",
    };

    // Filter styling
    const filterContainer = {
        marginBottom: "15px",
        display: "flex",
        alignItems: "center",
        gap: "15px",
        flexWrap: "wrap",
    };

    const filterLabel = {
        fontWeight: "bold",
    };

    const filterSelect = {
        padding: "5px",
        borderRadius: "5px",
        border: "1px solid #ccc",
    };

    return (
        <div className="App" style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            {/* Header */}
            <h1 style={{ color: "#2c3e50", marginBottom: "20px", textAlign: "center" }}>Fee Management</h1>

            {/* Filters Section */}
            <div style={filterContainer}>
                {/* School Filter */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <label style={filterLabel}>School: </label>
                    <select
                        value={schoolFilter}
                        onChange={(e) => setSchoolFilter(e.target.value)}
                        style={filterSelect}
                    >
                        <option value="">All Schools</option>
                        {Array.from(new Set(fees.map(fee => fee.school))).map((school, index) => (
                            <option key={index} value={school}>{school}</option>
                        ))}
                    </select>
                </div>

                {/* Class Filter */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <label style={filterLabel}>Class: </label>
                    <select
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                        style={filterSelect}
                    >
                        <option value="">All Classes</option>
                        {Array.from(new Set(fees.map(fee => fee.student_class)))
                            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                            .map((student_class, index) => (
                                <option key={index} value={student_class}>{student_class}</option>
                            ))}
                    </select>
                </div>

                {/* Month Filter */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <label style={filterLabel}>Month: </label>
                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        style={filterSelect}
                    >
                        <option value="">All Months</option>
                        {Array.from(new Set(fees.map(fee => fee.month))).map((month, index) => (
                            <option key={index} value={month}>{month}</option>
                        ))}
                    </select>
                </div>

                {/* Search Button */}
                <button
                    onClick={() => setShowResults(true)}
                    style={{
                        ...buttonStyle,
                        padding: "10px 20px",
                        backgroundColor: "#007BFF",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontWeight: "bold"
                    }}
                >
                    🔍 Search
                </button>
            </div>

            {/* Create New Month Button */}
            <button
                onClick={createNewMonthRecords}
                style={{
                    ...buttonStyle,
                    padding: "10px 20px",
                    borderRadius: "5px",
                    border: "none",
                    backgroundColor: "#3498db",
                    color: "#fff",
                    fontWeight: "bold",
                    cursor: "pointer",
                    transition: "background-color 0.3s ease",
                    marginBottom: "20px"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#2980b9"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "#3498db"}
            >
                ➕ Create New Month Record
            </button>

            {/* Fee Table */}
            {showResults && (
                <table style={tableStyle}>
                    <thead>
                        <tr style={{ backgroundColor: "#3498db", color: "#fff" }}>
                            <th style={{ ...thTdStyle, ...thStyle, padding: "12px", textAlign: "left" }}>Student Name</th>
                            <th style={{ ...thTdStyle, ...thStyle, padding: "12px", textAlign: "left" }}>School</th>
                            <th style={{ ...thTdStyle, ...thStyle, padding: "12px", textAlign: "left" }}>Class</th>
                            <th style={{ ...thTdStyle, ...thStyle, padding: "12px", textAlign: "left" }}>Month</th>
                            <th style={{ ...thTdStyle, ...thStyle, padding: "12px", textAlign: "left" }}>Monthly Fee</th>
                            <th style={{ ...thTdStyle, ...thStyle, padding: "12px", textAlign: "left" }}>Total Fee</th>
                            <th style={{ ...thTdStyle, ...thStyle, padding: "12px", textAlign: "left" }}>Paid Amount</th>
                            <th style={{ ...thTdStyle, ...thStyle, padding: "12px", textAlign: "left" }}>Balance Due</th>
                            <th style={{ ...thTdStyle, ...thStyle, padding: "12px", textAlign: "left" }}>Payment Date</th>
                            <th style={{ ...thTdStyle, ...thStyle, padding: "12px", textAlign: "left" }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFees.map((fee, index) => (
                            <tr key={fee.id} style={{ ...(index % 2 === 0 ? { backgroundColor: "#f9f9f9" } : trAlternate) }}>
                                <td style={{ ...thTdStyle, padding: "12px", textAlign: "left" }}>{fee.student_name}</td>
                                <td style={{ ...thTdStyle, padding: "12px", textAlign: "left" }}>{fee.school}</td>
                                <td style={{ ...thTdStyle, padding: "12px", textAlign: "left" }}>{fee.student_class}</td>
                                <td style={{ ...thTdStyle, padding: "12px", textAlign: "left" }}>{fee.month}</td>
                                <td style={{ ...thTdStyle, padding: "12px", textAlign: "left" }}>{fee.monthly_fee}</td>

                                {/* Editable Total Fee Column */}
                                <td>
                                    {editingRow === fee.id ? (
                                        <>
                                            <input
                                                type="number"
                                                value={fee.total_fee}
                                                onChange={(e) => handleTotalFeeChange(fee.id, e.target.value)}
                                                style={{ width: "80px", textAlign: "center" }}
                                            />
                                            <button
                                                onClick={() => setEditingRow(null)}
                                                style={{ marginLeft: "5px", padding: "3px 5px", fontSize: "12px", backgroundColor: "#28a745", color: "white", border: "none", cursor: "pointer", borderRadius: "3px" }}
                                            >
                                                ✅
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {fee.total_fee}
                                            <button
                                                onClick={() => setEditingRow(fee.id)}
                                                style={{ marginLeft: "5px", padding: "3px 5px", fontSize: "12px", backgroundColor: "#007BFF", color: "white", border: "none", cursor: "pointer", borderRadius: "3px" }}
                                            >
                                                ✏️
                                            </button>
                                        </>
                                    )}
                                </td>

                                {/* Editable Paid Amount Column */}
                                <td style={{ ...thTdStyle, padding: "12px", textAlign: "left" }}>
                                    <input
                                        type="number"
                                        value={fee.paid_amount}
                                        onChange={(e) => handlePaidAmountChange(fee.id, e.target.value)}
                                        style={{ width: "80px", padding: "5px", borderRadius: "5px", border: "1px solid #bdc3c7", textAlign: "center" }}
                                    />
                                </td>

                                <td style={{ ...thTdStyle, padding: "12px", textAlign: "left" }}>{fee.balance_due}</td>
                                <td style={{ ...thTdStyle, padding: "12px", textAlign: "left" }}>{fee.payment_date || "N/A"}</td>

                                {/* Editable Status Column */}
                                <td style={{ ...thTdStyle, padding: "12px", textAlign: "left" }}>
                                    <select
                                        value={fee.status}
                                        onChange={(e) => handleStatusChange(fee.id, e.target.value)}
                                        style={{ padding: "5px", borderRadius: "5px", border: "1px solid #bdc3c7", backgroundColor: "#ecf0f1", color: "#2c3e50" }}
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
            )}

            {/* Save Payments Button */}
            <button
                onClick={savePaidAmounts}
                style={{
                    ...saveButtonStyle,
                    padding: "10px 20px",
                    borderRadius: "5px",
                    border: "none",
                    backgroundColor: "#27ae60",
                    color: "#fff",
                    fontWeight: "bold",
                    cursor: "pointer",
                    transition: "background-color 0.3s ease"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#219653"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "#27ae60"}
            >
                💾 Save Payments
            </button>

            {/* Retry Button for Errors */}
            {error && (
                <div style={{ marginTop: "20px", textAlign: "center" }}>
                    <p style={{ color: "red" }}>{error}</p>
                    <button
                        onClick={fetchFees}
                        style={{
                            ...buttonStyle,
                            backgroundColor: "#dc3545",
                            marginTop: "10px"
                        }}
                    >
                        🔄 Retry
                    </button>
                </div>
            )}
        </div>
    );
}

export default FeePage;