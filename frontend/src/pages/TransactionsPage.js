import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL, getAuthHeaders } from "../api";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";

function TransactionsPage() {
    // State Declarations
    const [activeTab, setActiveTab] = useState("income");
    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [schools, setSchools] = useState([]);
    const [incomeCategories, setIncomeCategories] = useState([]);
    const [expenseCategories, setExpenseCategories] = useState([]);

    const [transferCategories] = useState(["Bank Transfer", "Cash Transfer"]);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        transaction_type: "income",
        amount: "",
        category: "",
        notes: "",
        from_account: null,
        to_account: null,
        received_from: null,
        paid_to: null,
        school: null,
    });
    const [newCategory, setNewCategory] = useState("");
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isFetchingTransactions, setIsFetchingTransactions] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [isAccountsLoading, setIsAccountsLoading] = useState(false);
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState("asc");


    // Fetch Functions
    const fetchAccounts = async () => {
        setIsAccountsLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/accounts/`, { headers: getAuthHeaders() });
            setAccounts(response.data);
        } catch (error) {
            toast.error("Failed to fetch accounts.");
        } finally {
            setIsAccountsLoading(false);
        }
    };

    const fetchInitialData = async () => {
        const fetchCategories = async () => {
            try {
                const [incomeRes, expenseRes] = await Promise.all([
                    axios.get(`${API_URL}/api/categories/?type=income`, { headers: getAuthHeaders() }),
                    axios.get(`${API_URL}/api/categories/?type=expense`, { headers: getAuthHeaders() })
                ]);
                setIncomeCategories(incomeRes.data.map(c => c.name));
                setExpenseCategories(expenseRes.data.map(c => c.name));
            } catch (error) {
                toast.error("Failed to load categories.");
            }
        };
    
        setLoading(true);
        setError(null);
        try {
            const schoolsResponse = await axios.get(`${API_URL}/api/schools/`, { headers: getAuthHeaders() });
            setSchools(schoolsResponse.data);
            await fetchAccounts();
            await fetchTransactions();
            await fetchCategories(); // ✅ ADD THIS LINE
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || "Failed to load initial data.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };
    

    const fetchTransactions = async () => {
        setIsFetchingTransactions(true);
        try {
            const response = await axios.get(`${API_URL}/api/${activeTab}/?limit=10&ordering=-date`, { headers: getAuthHeaders() });
            const transactions = response.data.map((trx) => ({
                ...trx,
                to_account_name: trx.to_account_name || "N/A",
                from_account_name: trx.from_account_name || "N/A",
                school: trx.school ? trx.school : null,
            }));
            setTransactions(transactions);
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || "Failed to fetch transactions.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsFetchingTransactions(false);
        }
    };

    // Effects
    useEffect(() => {
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (loading) return;
        fetchTransactions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Handlers
    const handleCategoryChange = (category) => {
        setFormData({
            ...formData,
            category,
            received_from: category === "Loan Received" ? formData.received_from : null,
            paid_to: category === "Loan Paid" ? formData.paid_to : null,
        });
    };

    const handleAddCategory = async () => {
        if (!newCategory.trim()) return;
    
        const payload = {
            name: newCategory.trim(),
            category_type: activeTab
        };
    
        try {
            await axios.post(`${API_URL}/api/categories/`, payload, { headers: getAuthHeaders() });
            toast.success("Category added!");
    
            if (activeTab === "income") {
                setIncomeCategories(prev => [...prev, payload.name]);
            } else if (activeTab === "expense") {
                setExpenseCategories(prev => [...prev, payload.name]);
            }
    
            setNewCategory("");
        } catch (err) {
            toast.error("Could not add category.");
        }
    };
    

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
    
        if (!formData.amount || !formData.category) {
            toast.error("Please fill in both Amount and Category before saving.");
            setIsSubmitting(false);
            return;
        }
    
        // Normalize transaction type
        const transactionType =
            activeTab === "expense" ? "Expense" :
            activeTab === "income" ? "Income" :
            activeTab === "transfers" ? "Transfer" : "";
    
        let payload = {
            date: formData.date,
            transaction_type: transactionType,
            amount: formData.amount,
            category: formData.category,
            notes: formData.notes,
            school: formData.school,
        };
    
        if (activeTab === "expense") {
            payload.from_account = formData.from_account;
            payload.to_account = formData.paid_to || null;
            if (!payload.from_account) {
                toast.error("Please select a From Account for the expense.");
                setIsSubmitting(false);
                return;
            }
        }
    
        if (activeTab === "income") {
            if (formData.category === "Loan Received") {
                payload.received_from = formData.received_from;
                payload.to_account = formData.to_account;
                if (!payload.received_from || !payload.to_account) {
                    toast.error("Please select both lender (Received From) and To Account for Loan Received.");
                    setIsSubmitting(false);
                    return;
                }
            } else {
                payload.to_account = formData.to_account;
                if (!payload.to_account) {
                    toast.error("Please select a To Account for the income transaction.");
                    setIsSubmitting(false);
                    return;
                }
            }
        }
    
        if (activeTab === "transfers") {
            payload.from_account = formData.from_account;
            payload.to_account = formData.to_account;
            if (!payload.from_account || !payload.to_account) {
                toast.error("Please select both From and To accounts for transfer.");
                setIsSubmitting(false);
                return;
            }
        }
    
        try {
            if (isEditing && selectedTransaction) {
                await axios.put(`${API_URL}/api/${activeTab}/${selectedTransaction.id}/`, payload, {
                    headers: getAuthHeaders(),
                });
                toast.success("Transaction updated successfully!");
            } else {
                await axios.post(`${API_URL}/api/${activeTab}/`, payload, {
                    headers: getAuthHeaders(),
                });
                toast.success("Transaction saved successfully!");
            }
    
            fetchTransactions();
            fetchAccounts();
    
            setIsEditing(false);
            setFormData({
                date: new Date().toISOString().split("T")[0],
                transaction_type: "income",
                amount: "",
                category: "",
                notes: "",
                from_account: null,
                to_account: null,
                received_from: null,
                paid_to: null,
                school: null,
            });
        } catch (error) {
            console.error("API Error:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || "Failed to save transaction.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    

    const handleEdit = (trx) => {
        // Fix: map backend "Transfer" to frontend "transfers"
        const normalizedType = trx.transaction_type.toLowerCase();
        const tab = normalizedType === "transfer" ? "transfers" : normalizedType;
        setActiveTab(tab);
    
        setIsEditing(true);
        setSelectedTransaction(trx);
        console.log("Editing Transaction Date:", trx.date);
    
        setFormData({
            date: trx.date ? trx.date.split("T")[0] : "",
            transaction_type: normalizedType,
            amount: trx.amount,
            category: trx.category,
            notes: trx.notes,
            from_account: trx.from_account || null,
            to_account: trx.to_account || null,
            received_from: trx.received_from || null,
            paid_to: trx.paid_to || null,
            school: trx.school || null,
        });
    };
    

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(column);
            setSortOrder("asc");
        }
    };
    


    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this transaction?")) return;
        setIsDeleting(true);
        await fetchTransactions();
        await fetchAccounts(); // Ensure sequential execution
        try {
            console.log(`Attempting DELETE to ${API_URL}/api/${activeTab}/${id}/`);
            const response = await axios.delete(`${API_URL}/api/${activeTab}/${id}/`, { headers: getAuthHeaders() });
            console.log("Delete response:", response);
            fetchTransactions();
            toast.success("Transaction deleted successfully!");
        } catch (error) {
            console.error("Delete failed:", error.response ? error.response.data : error.message);
            toast.error(error.response?.data?.message || "Failed to delete transaction due to a server error.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleView = (trx) => {
        setSelectedTransaction(trx);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedTransaction(null);
    };

    const handleRetry = async () => {
        setIsRetrying(true);
        setError(null);
        await fetchInitialData();
        setIsRetrying(false);
    };

    const sortedTransactions = [...transactions].sort((a, b) => {
        if (!sortBy) return 0;
    
        let valA = a[sortBy];
        let valB = b[sortBy];
    
        if (sortBy === "date") {
            valA = new Date(valA);
            valB = new Date(valB);
        }
    
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
    
        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
    });
    
    
    
    const currentCategories =
        activeTab === "income"
            ? incomeCategories
            : activeTab === "expense"
            ? expenseCategories
            : transferCategories;

    // Render Logic
    if (loading) {
        return (
            <div className="flex items-center justify-center p-6 min-h-screen bg-gray-100">
                <ClipLoader color="#000000" size={50} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-red-600 flex flex-col items-center">
                <p>{error}</p>
                <button
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    onClick={handleRetry}
                    disabled={isRetrying}
                    aria-label="Retry fetching data"
                >
                    {isRetrying ? "Retrying..." : "Retry"}
                </button>
            </div>
        );
    }

    return (
        <div className="container">
            <h1 className="title">Transactions</h1>
    
            {/* Tabs */}
            <div className="tab-container">
                {["income", "expense", "transfers"].map((tab) => (
                    <button
                        className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>
    
            {/* Form */}
            <form
                className="form"
                onSubmit={handleSubmit}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
                        e.preventDefault(); // Prevent form submission on Enter for inputs
                    }
                }}
            >
                <div className="grid grid-cols-2 gap-6">
                    <div className="form-group">
                        <label>Date:</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Amount:</label>
                        <input
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                        />
                    </div>
                </div>
    
                <div className="form-group">
                    <label>Category:</label>
                    <div className="flex flex-wrap gap-2">
                        {currentCategories.map((cat) => (
                            <button
                                className={`category-button ${formData.category === cat ? 'selected' : ''}`}
                                type="button"
                                key={cat}
                                onClick={() => handleCategoryChange(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
    
                {["income", "expense"].includes(activeTab) && (
                    <div className="form-group">
                        <label>Add New Category:</label>
                        <div className="add-category-input">
                            <input
                                type="text"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                placeholder="Enter new category"
                            />
                            <button
                                type="button"
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                onClick={handleAddCategory}
                            >
                                Add
                            </button>
                        </div>
                    </div>
                )}
    
                {activeTab === "income" && (
                    <div className="form-group">
                        <label>To Account (Where money is going):</label>
                        <div className="flex flex-wrap gap-2">
                            {accounts.map((acc) => (
                                <button
                                    className={`category-button ${formData.to_account === acc.id ? 'selected' : ''}`}
                                    type="button"
                                    key={acc.id}
                                    onClick={() => setFormData({ ...formData, to_account: acc.id })}
                                >
                                    {acc.account_name} ({acc.current_balance})
                                </button>
                            ))}
                        </div>
                    </div>
                )}
    
                {activeTab === "expense" && (
                    <div className="form-group">
                        <label>From Account (Where money is coming from):</label>
                        <div className="flex flex-wrap gap-2">
                            {accounts.map((acc) => (
                                <button
                                    className={`category-button ${formData.from_account === acc.id ? 'selected' : ''}`}
                                    type="button"
                                    key={acc.id}
                                    onClick={() => setFormData({ ...formData, from_account: acc.id })}
                                >
                                    {acc.account_name} ({acc.current_balance})
                                </button>
                            ))}
                        </div>
                    </div>
                )}
    
                {activeTab === "transfers" && (
                    <div className="grid grid-cols-2 gap-6">
                        <div className="form-group">
                            <label>From Account (Source of transfer):</label>
                            <div className="flex flex-wrap gap-2">
                                {accounts.map((acc) => (
                                    <button
                                        className={`category-button ${formData.from_account === acc.id ? 'selected' : ''}`}
                                        type="button"
                                        key={acc.id}
                                        onClick={() => setFormData({ ...formData, from_account: acc.id })}
                                    >
                                        {acc.account_name} ({acc.current_balance})
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>To Account (Destination of transfer):</label>
                            <div className="flex flex-wrap gap-2">
                                {accounts.map((acc) => (
                                    <button
                                        className={`category-button ${formData.to_account === acc.id ? 'selected' : ''}`}
                                        type="button"
                                        key={acc.id}
                                        onClick={() => setFormData({ ...formData, to_account: acc.id })}
                                    >
                                        {acc.account_name} ({acc.current_balance})
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
    
                {(formData.category === "Loan Received" || formData.category === "Loan Paid") && (
                    <div className="form-group">
                        <label>
                            {formData.category === "Loan Received" ? "Received From (Lender):" : "Paid To (Lender):"}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {accounts
                                .filter((acc) => acc.account_type === "Person")
                                .map((acc) => (
                                    <button
                                        className={`category-button ${formData.received_from === acc.id || formData.paid_to === acc.id ? 'selected' : ''}`}
                                        type="button"
                                        key={acc.id}
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
    
                <div className="form-group">
                    <label>School (Optional):</label>
                    <div className="flex flex-wrap gap-2">
                        {schools.map((school) => (
                            <button
                                className={`category-button ${formData.school === school.id ? 'selected' : ''}`}
                                type="button"
                                key={school.id}
                                onClick={() => setFormData({ ...formData, school: school.id })}
                            >
                                {school.name}
                            </button>
                        ))}
                        <button
                            className={`category-button ${formData.school === null ? 'selected' : ''}`}
                            type="button"
                            onClick={() => setFormData({ ...formData, school: null })}
                        >
                            No School
                        </button>
                    </div>
                </div>
    
                <div className="form-group">
                    <label>Notes:</label>
                    <textarea className="textbox"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>
    
                <button
                    type="submit"
                    className={`submit-button ${isSubmitting || isAccountsLoading ? 'disabled' : ''}`}
                    disabled={isSubmitting || isAccountsLoading}
                >
                    {isSubmitting ? (isEditing ? "Updating..." : "Submitting...") : isEditing ? "Update Transaction" : "Save Transaction"}
                </button>
            </form>
    
            {/* Fetching Indicator */}
            {isFetchingTransactions && (
                <div className="fetching-message">Fetching transactions...</div>
            )}
    
            {/* Transactions Table */}
            <table className="table">
                <thead>
                    <tr>
                    <th className="table-header cursor-pointer" onClick={() => handleSort("date")}>
                        Date {sortBy === "date" ? (sortOrder === "asc" ? "▲" : "▼") : ""} </th>


                        <th className="table-header">Type</th>
                       
                        <th className="table-header cursor-pointer" onClick={() => handleSort("amount")}>
                            Amount {sortBy === "amount" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                        </th>
                        <th className="table-header cursor-pointer" onClick={() => handleSort("category")}>
                            Category {sortBy === "category" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                        </th>
                        <th className="table-header">Account</th>
                        <th className="table-header">School</th>
                        <th className="table-header">Notes</th>
                        <th className="table-header">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedTransactions.map((trx) => (
                        <tr key={trx.id}>
                            <td className="table-cell">{trx.date}</td>
                            <td className="table-cell">{trx.transaction_type}</td>
                            <td className="table-cell">{trx.amount}</td>
                            <td className="table-cell">{trx.category}</td>
                            <td className="table-cell">
                                {trx.transaction_type === "Income"
                                    ? trx.to_account_name || "N/A"
                                    : trx.from_account_name || "N/A"}
                            </td>
                            <td className="table-cell">
                                {trx.school === null
                                    ? "No School"
                                    : schools.find((s) => s.id === trx.school)?.name || "Unknown"}
                            </td>
                            <td className="table-cell">{trx.notes}</td>
                            <td className="table-cell">
                                <div className="flex gap-2">
                                    <button
                                        className="action-button bg-blue-600 text-white"
                                        onClick={() => handleView(trx)}
                                    >
                                        View
                                    </button>
                                    <button
                                        className="action-button bg-yellow-600 text-white"
                                        onClick={() => handleEdit(trx)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="action-button bg-red-600 text-white"
                                        onClick={() => handleDelete(trx.id)}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? "Deleting..." : "Delete"}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
    
            {/* Modal */}
            {modalOpen && selectedTransaction && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Transaction Details</h2>
                        <p><strong>Date:</strong> {selectedTransaction.date}</p>
                        <p><strong>Type:</strong> {selectedTransaction.transaction_type}</p>
                        <p><strong>Amount:</strong> {selectedTransaction.amount}</p>
                        <p><strong>Category:</strong> {selectedTransaction.category}</p>
                        <p><strong>Account:</strong> {selectedTransaction.transaction_type === "Income" ? selectedTransaction.to_account_name : selectedTransaction.from_account_name}</p>
                        <p><strong>School:</strong> {selectedTransaction.school === 0 ? "All School" : selectedTransaction.school ? schools.find(s => s.id === selectedTransaction.school)?.name || "Unknown" : "No School"}</p>
                        <p><strong>Notes:</strong> {selectedTransaction.notes}</p>
                        <button className="modal-close-button mt-4" onClick={closeModal}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TransactionsPage;