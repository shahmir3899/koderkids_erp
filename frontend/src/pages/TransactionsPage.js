import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL, getAuthHeaders } from "../api";
//import { DataGrid } from '@mui/x-data-grid'; // For the table
//import { Button, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material'; // For form elements
//import { ThemeProvider, createTheme } from '@mui/material/styles'; // For custom theme

function TransactionsPage() {
    const [activeTab, setActiveTab] = useState("income"); // Default tab: Income
    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [schools, setSchools] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState("all");  // ✅ Ensure it exists

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        transaction_type: "income",
        amount: "",
        category: "",
        notes: "",
        from_account: null,
        to_account: null,
        received_from: null, // ✅ New field for Loan Received
    });
    const handleCategoryChange = (category) => {
        setFormData({
            ...formData,
            category,
            received_from: category === "Loan Received" ? formData.received_from : null,
            paid_to: category === "Loan Paid" ? formData.paid_to : null, // ✅ For Loan Paid in Expense tab
            transfer_to: category === "Loan Repayment" ? formData.transfer_to : null, // ✅ For Loan Repayment in Transfers
        });
    };
    
    
    useEffect(() => {
        fetchSchools();
        fetchAccounts();
        fetchCategories();
        fetchTransactions();
        // eslint-disable-next-line
    }, [activeTab]);

    const fetchSchools = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/schools/`, { headers: getAuthHeaders() });
            setSchools(response.data);
        } catch (error) {
            console.error("Error fetching schools:", error.response?.data || error.message);
        }
    };

    const fetchAccounts = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/accounts/`, { headers: getAuthHeaders() });
            setAccounts(response.data);
            console.log("Fetched accounts:", response.data); // ✅ Debug log
        } catch (error) {
            console.error("Error fetching accounts:", error.response?.data || error.message);
        }
    };

    const fetchCategories = async () => {
    const incomeCategories = ["School Invoice", "Donations", "Loan Received", "Other Income"];
    const expenseCategories = ["Salaries", "Rent", "Utilities", "Loan Paid", "Marketing", "Other Expense"];
    const transferCategories = ["Bank Transfer", "Cash Transfer"];

    setCategories(
        activeTab === "income" ? incomeCategories :
        activeTab === "expense" ? expenseCategories : transferCategories
    );
};

    const fetchTransactions = async () => {
        try {
            let url = `${API_URL}/api/${activeTab}/`;
            if (typeof selectedSchool !== "undefined" && selectedSchool !== "all") {  // ✅ Fixed undefined error
                url += `?school=${selectedSchool === "none" ? "" : selectedSchool}`;
            }
            const response = await axios.get(url, { headers: getAuthHeaders() });
            const transactions = response.data.map((trx) => ({
                ...trx,
                to_account_name: trx.to_account_name || "N/A",  // ✅ Prevents undefined accounts
                from_account_name: trx.from_account_name || "N/A"
            }));
            setTransactions(transactions);
        } catch (error) {
            console.error("Error fetching transactions:", error.response?.data || error.message);
        }
    };



    // In handleSubmit:
    const handleSubmit = async (e) => {
        e.preventDefault();
        let payload = {
            date: formData.date,
            transaction_type: activeTab.charAt(0).toUpperCase() + activeTab.slice(1),
            amount: formData.amount,
            category: formData.category,
            notes: formData.notes
        };
        if (activeTab === "income") {
            payload.transaction_type = "Income";
            payload.to_account = formData.to_account || null;
            payload.from_account = formData.received_from || null;
            payload.received_from = formData.received_from || null;
            if (formData.category === "Loan Received" && (!payload.to_account || !payload.from_account)) {
                alert("Both accounts must be selected for a Loan Received transaction.");
                return;
            }
        } else if (activeTab === "expense") {
            payload.transaction_type = "Expense";
            payload.from_account = formData.from_account || null;
            payload.to_account = formData.paid_to || null;
            if (formData.category === "Loan Paid" && (!payload.from_account || !payload.to_account)) {
                alert("Both accounts must be selected for a Loan Paid transaction.");
                return;
            }
        } else if (activeTab === "transfers") {
            payload.transaction_type = "Transfer";
            payload.from_account = formData.from_account || null;
            payload.to_account = formData.to_account || null;
            if (!payload.from_account || !payload.to_account) {
                alert("Both accounts must be selected for a Transfer transaction.");
                return;
            }
            if (payload.from_account === payload.to_account) {
                alert("Cannot transfer to the same account.");
                return;
            }
        }
        try {
            const response = await axios.post(`${API_URL}/api/${activeTab}/`, payload, { headers: getAuthHeaders() });
            fetchTransactions();
            fetchAccounts(); // Update balances
            setFormData({ ...formData, amount: "", notes: "" });
        } catch (error) {
            console.error("Error saving transaction:", error.response?.data || error.message);
        }
    };
        
    
    

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold">Transactions</h1>
    
            {/* Tabs for Transaction Types */}
            <div className="flex space-x-4 mb-6">
                {["income", "expense", "transfers"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded font-medium transition-colors ${
                            activeTab === tab ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>
    
            {/* Transaction Entry Form */}
            <form onSubmit={handleSubmit} className="border p-6 bg-white shadow-lg rounded-lg">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block font-semibold text-gray-700">Date:</label>
                        <input
                            type="date"
                            className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block font-semibold text-gray-700">Amount:</label>
                        <input
                            type="number"
                            className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                        />
                    </div>
                </div>
    
                {/* Category Selection */}
                <div className="mt-6">
                    <label className="block font-semibold text-gray-700">Category:</label>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                className={`px-4 py-2 border rounded transition-colors ${
                                    formData.category === cat
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                                onClick={() => setFormData({ ...formData, category: cat })}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
    
                {/* Account Selection Based on Active Tab */}
                {activeTab === "income" && (
                    <div className="mt-6">
                        <label className="block font-semibold text-gray-700">To Account (Where money is going):</label>
                        <div className="flex flex-wrap gap-2">
                            {accounts.map((acc) => (
                                <button
                                    key={acc.id}
                                    type="button"
                                    className={`px-4 py-2 border rounded transition-colors ${
                                        formData.to_account === acc.id
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                    onClick={() => setFormData({ ...formData, to_account: acc.id })}
                                >
                                    {acc.account_name} ({acc.current_balance})
                                </button>
                            ))}
                        </div>
                    </div>
                )}
    
                {activeTab === "expense" && (
                    <div className="mt-6">
                        <label className="block font-semibold text-gray-700">From Account (Where money is coming from):</label>
                        <div className="flex flex-wrap gap-2">
                            {accounts.map((acc) => (
                                <button
                                    key={acc.id}
                                    type="button"
                                    className={`px-4 py-2 border rounded transition-colors ${
                                        formData.from_account === acc.id
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                    onClick={() => setFormData({ ...formData, from_account: acc.id })}
                                >
                                    {acc.account_name} ({acc.current_balance})
                                </button>
                            ))}
                        </div>
                    </div>
                )}
    
                {activeTab === "transfers" && (
                    <div className="mt-6 grid grid-cols-2 gap-6">
                        <div>
                            <label className="block font-semibold text-gray-700">From Account (Source of transfer):</label>
                            <div className="flex flex-wrap gap-2">
                                {accounts.map((acc) => (
                                    <button
                                        key={acc.id}
                                        type="button"
                                        className={`px-4 py-2 border rounded transition-colors ${
                                            formData.from_account === acc.id
                                                ? "bg-red-600 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                        onClick={() => setFormData({ ...formData, from_account: acc.id })}
                                    >
                                        {acc.account_name} ({acc.current_balance})
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block font-semibold text-gray-700">To Account (Destination of transfer):</label>
                            <div className="flex flex-wrap gap-2">
                                {accounts.map((acc) => (
                                    <button
                                        key={acc.id}
                                        type="button"
                                        className={`px-4 py-2 border rounded transition-colors ${
                                            formData.to_account === acc.id
                                                ? "bg-green-600 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                        onClick={() => setFormData({ ...formData, to_account: acc.id })}
                                    >
                                        {acc.account_name} ({acc.current_balance})
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
    
                {/* Conditional Fields for Loans */}
                {(formData.category === "Loan Received" || formData.category === "Loan Paid") && (
                    <div className="mt-6">
                        <label className="block font-semibold text-gray-700">
                            {formData.category === "Loan Received" ? "Received From (Lender):" : "Paid To (Lender):"}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {accounts
                                .filter((acc) => acc.account_type === "Person")
                                .map((acc) => (
                                    <button
                                        key={acc.id}
                                        type="button"
                                        className={`px-4 py-2 border rounded transition-colors ${
                                            formData.received_from === acc.id || formData.paid_to === acc.id
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                        onClick={() => {
                                            setFormData({
                                                ...formData,
                                                received_from: formData.category === "Loan Received" ? acc.id : null,
                                                paid_to: formData.category === "Loan Paid" ? acc.id : null,
                                            });
                                        }}
                                    >
                                        {acc.account_name}
                                    </button>
                                ))}
                        </div>
                    </div>
                )}
    
                {/* School Selection */}
                <div className="mt-6">
                    <label className="block font-semibold text-gray-700">School (Optional):</label>
                    <div className="flex flex-wrap gap-2">
                        {schools.map((school) => (
                            <button
                                key={school.id}
                                type="button"
                                className={`px-4 py-2 border rounded transition-colors ${
                                    formData.school === school.id
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                                onClick={() => setFormData({ ...formData, school: school.id })}
                            >
                                {school.name}
                            </button>
                        ))}
                    </div>
                </div>
    
                {/* Notes */}
                <div className="mt-6">
                    <label className="block font-semibold text-gray-700">Notes:</label>
                    <textarea
                        className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>
    
                {/* Submit Button */}
                <button
                    type="submit"
                    className="mt-6 bg-green-600 text-white px-6 py-2 rounded font-medium hover:bg-green-700 transition-colors"
                >
                    Save Transaction
                </button>
            </form>
    
            {/* Transactions Table */}
            <table className="w-full border-collapse border border-gray-300 mt-8">
                <thead>
                    <tr className="bg-gray-100 text-gray-700">
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Account</th>
                        <th className="p-3">School</th>
                        <th className="p-3">Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((trx) => (
                        <tr key={trx.id} className="border-t">
                            <td className="p-3">{trx.date}</td>
                            <td className="p-3">{trx.transaction_type}</td>
                            <td className="p-3">{trx.amount}</td>
                            <td className="p-3">{trx.category}</td>
                            <td className="p-3">
                                {trx.transaction_type === "Income"
                                    ? trx.to_account_name || "N/A"
                                    : trx.from_account_name || "N/A"}
                            </td>
                            <td className="p-3">{trx.school ? trx.school.name : "No School"}</td>
                            <td className="p-3">{trx.notes}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default TransactionsPage;
