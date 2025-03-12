import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL, getAuthHeaders } from "../api";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import styled from "styled-components";

// Styled Components (unchanged)
const Container = styled.div`
    padding: 20px;
    max-width: 1400px;
    margin: 0 auto;
    font-family: "Arial, sans-serif";
    background-color: #f9f9f9;
    min-height: 100vh;
`;

const Title = styled.h1`
    text-align: center;
    color: #1a202c;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 24px;
    text-transform: uppercase;
`;

const TabContainer = styled.div`
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    justify-content: center;
`;

const TabButton = styled.button`
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    background-color: ${props => (props.active ? "#2b6cb0" : "#e2e8f0")};
    color: ${props => (props.active ? "#ffffff" : "#2d3748")};
    &:hover {
        background-color: ${props => (props.active ? "#2c5282" : "#d1d5db")};
    }
`;

const Form = styled.form`
    border-radius: 10px;
    padding: 24px;
    background: #ffffff;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    margin-bottom: 24px;
`;

const FormGroup = styled.div`
    margin-bottom: 16px;
    label {
        display: block;
        margin-bottom: 6px;
        font-weight: 600;
        color: #2d3748;
    }
    input,
    select,
    textarea {
        width: 100%;
        padding: 10px;
        border: 2px solid #e2e8f0;
        border-radius: 6px;
        font-size: 1rem;
        transition: border-color 0.3s ease;
        &:focus {
            border-color: #2b6cb0;
            outline: none;
        }
    }
    textarea {
        resize: vertical;
        min-height: 100px;
    }
`;

const CategoryButton = styled.button`
    padding: 10px 16px;
    border: 2px solid #e2e8f0;
    border-radius: 6px;
    margin: 4px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    background-color: ${props => (props.selected ? "#2b6cb0" : "#ffffff")};
    color: ${props => (props.selected ? "#ffffff" : "#2d3748")};
    &:hover {
        background-color: ${props => (props.selected ? "#2c5282" : "#edf2f7")};
    }
`;

const AddCategoryInput = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 12px;
`;

const SubmitButton = styled.button`
    padding: 12px 24px;
    background-color: ${props => (props.isLoading ? "#4a5568" : "#2d3748")};
    color: #ffffff;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: ${props => (props.isLoading ? "not-allowed" : "pointer")};
    transition: background-color 0.3s ease;
    &:hover:not(:disabled) {
        background-color: ${props => (props.isLoading ? "#4a5568" : "#1a202c")};
    }
    &:disabled {
        opacity: 0.7;
    }
`;

const Table = styled.table`
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: #ffffff;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    overflow: hidden;
`;

const TableHeader = styled.th`
    padding: 12px;
    background-color: #edf2f7;
    color: #2d3748;
    font-weight: 600;
    text-align: left;
    border-bottom: 2px solid #e2e8f0;
`;

const TableCell = styled.td`
    padding: 12px;
    border-bottom: 1px solid #e2e8f0;
    color: #4a5568;
`;

const ActionButton = styled.button`
    padding: 8px 12px;
    margin-right: 4px;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.3s ease;
    &:last-child {
        margin-right: 0;
    }
    &:hover {
        opacity: 0.9;
    }
`;

const ModalOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
`;

const ModalContent = styled.div`
    background: #ffffff;
    padding: 24px;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    max-width: 400px;
    width: 90%;
`;

const ModalCloseButton = styled.button`
    padding: 8px 16px;
    background-color: #4a5568;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.3s ease;
    &:hover {
        background-color: #2d3748;
    }
`;

const FetchingMessage = styled.div`
    text-align: center;
    padding: 12px;
    background-color: #edf2f7;
    color: #2d3748;
    margin-bottom: 12px;
    border-radius: 6px;
`;

function TransactionsPage() {
    // State Declarations
    const [activeTab, setActiveTab] = useState("income");
    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [schools, setSchools] = useState([]);
    const [incomeCategories, setIncomeCategories] = useState([
        "School Invoice",
        "Books",
        "Donations",
        "Loan Received",
        "Other Income",
    ]);
    const [expenseCategories, setExpenseCategories] = useState([
        "Salaries",
        "Books",
        "Rent",
        "Utilities",
        "Loan Paid",
        "Marketing",
        "Other Expense",
    ]);
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

    // Fetch Functions
    const fetchAccounts = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/accounts/`, { headers: getAuthHeaders() });
            setAccounts(response.data);
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || "Failed to fetch accounts.";
            setError(errorMessage);
            toast.error(errorMessage);
        }
    };

    const fetchInitialData = async () => {
        setLoading(true);
        setError(null);
        try {
            const schoolsResponse = await axios.get(`${API_URL}/api/schools/`, { headers: getAuthHeaders() });
            setSchools(schoolsResponse.data);
            await fetchAccounts();
            await fetchTransactions();
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
            const response = await axios.get(`${API_URL}/api/${activeTab}/`, { headers: getAuthHeaders() });
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

    const handleAddCategory = () => {
        if (!newCategory.trim()) return;
        if (activeTab === "income") {
            setIncomeCategories([...incomeCategories, newCategory.trim()]);
        } else if (activeTab === "expense") {
            setExpenseCategories([...expenseCategories, newCategory.trim()]);
        }
        setNewCategory("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Validate required fields
        if (!formData.amount || !formData.category) {
            toast.error("Please fill in both Amount and Category before saving.");
            setIsSubmitting(false);
            return;
        }

        let transactionType;
        if (activeTab === "income") {
            transactionType = "Income";
        } else if (activeTab === "expense") {
            transactionType = "Expense";
        } else if (activeTab === "transfers") {
            transactionType = "Transfer";
        }

        let payload = {
            date: formData.date,
            transaction_type: transactionType,
            amount: formData.amount,
            category: formData.category,
            notes: formData.notes,
            school: formData.school,
        };

        // Add account fields based on tab
        if (activeTab === "income") {
            payload.to_account = formData.to_account || null;
            payload.from_account = formData.received_from || null;
            if (formData.category === "Loan Received" && (!payload.to_account || !payload.from_account)) {
                toast.error("Both accounts must be selected for a Loan Received transaction.");
                setIsSubmitting(false);
                return;
            }
        } else if (activeTab === "expense") {
            payload.from_account = formData.from_account || null;
            payload.to_account = formData.paid_to || null;
            if (formData.category === "Loan Paid" && (!payload.from_account || !payload.to_account)) {
                toast.error("Both accounts must be selected for a Loan Paid transaction.");
                setIsSubmitting(false);
                return;
            }
        } else if (activeTab === "transfers") {
            payload.from_account = formData.from_account || null;
            payload.to_account = formData.to_account || null;
            if (!payload.from_account || !payload.to_account) {
                toast.error("Both accounts must be selected for a Transfer transaction.");
                setIsSubmitting(false);
                return;
            }
            if (payload.from_account === payload.to_account) {
                toast.error("Cannot transfer to the same account.");
                setIsSubmitting(false);
                return;
            }
        }

        try {
            console.log("Sending payload:", payload); // Debug the payload
            if (isEditing) {
                await axios.put(`${API_URL}/api/${activeTab}/${selectedTransaction.id}/`, payload, {
                    headers: getAuthHeaders(),
                });
                setIsEditing(false);
                setSelectedTransaction(null);
                toast.success("Transaction updated successfully!");
            } else {
                await axios.post(`${API_URL}/api/${activeTab}/`, payload, { headers: getAuthHeaders() });
                toast.success("Transaction saved successfully!");
            }
            fetchTransactions();
            fetchAccounts();
            setFormData({
                date: new Date().toISOString().split("T")[0],
                transaction_type: activeTab,
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
            const errorMessage = error.response?.data?.message || error.message || "Failed to save transaction.";
            console.error("API Error:", error); // Debug the error
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (trx) => {
        setIsEditing(true);
        setSelectedTransaction(trx);
        setFormData({
            date: trx.date,
            transaction_type: activeTab,
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

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this transaction?")) return;
        setIsDeleting(true);
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
        <Container>
            <Title>Transactions</Title>

            {/* Tabs */}
            <TabContainer>
                {["income", "expense", "transfers"].map((tab) => (
                    <TabButton
                        key={tab}
                        active={activeTab === tab}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </TabButton>
                ))}
            </TabContainer>

            {/* Form */}
            <Form
                onSubmit={handleSubmit}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
                        e.preventDefault(); // Prevent form submission on Enter for inputs
                    }
                }}
            >
                <div className="grid grid-cols-2 gap-6">
                    <FormGroup>
                        <label>Date:</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                    </FormGroup>
                    <FormGroup>
                        <label>Amount:</label>
                        <input
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                        />
                    </FormGroup>
                </div>

                <FormGroup>
                    <label>Category:</label>
                    <div className="flex flex-wrap gap-2">
                        {currentCategories.map((cat) => (
                            <CategoryButton
                                key={cat}
                                selected={formData.category === cat}
                                onClick={() => handleCategoryChange(cat)}
                            >
                                {cat}
                            </CategoryButton>
                        ))}
                    </div>
                </FormGroup>

                {["income", "expense"].includes(activeTab) && (
                    <FormGroup>
                        <label>Add New Category:</label>
                        <AddCategoryInput>
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
                        </AddCategoryInput>
                    </FormGroup>
                )}

                {activeTab === "income" && (
                    <FormGroup>
                        <label>To Account (Where money is going):</label>
                        <div className="flex flex-wrap gap-2">
                            {accounts.map((acc) => (
                                <CategoryButton
                                    key={acc.id}
                                    selected={formData.to_account === acc.id}
                                    onClick={() => setFormData({ ...formData, to_account: acc.id })}
                                >
                                    {acc.account_name} ({acc.current_balance})
                                </CategoryButton>
                            ))}
                        </div>
                    </FormGroup>
                )}

                {activeTab === "expense" && (
                    <FormGroup>
                        <label>From Account (Where money is coming from):</label>
                        <div className="flex flex-wrap gap-2">
                            {accounts.map((acc) => (
                                <CategoryButton
                                    key={acc.id}
                                    selected={formData.from_account === acc.id}
                                    onClick={() => setFormData({ ...formData, from_account: acc.id })}
                                >
                                    {acc.account_name} ({acc.current_balance})
                                </CategoryButton>
                            ))}
                        </div>
                    </FormGroup>
                )}

                {activeTab === "transfers" && (
                    <div className="grid grid-cols-2 gap-6">
                        <FormGroup>
                            <label>From Account (Source of transfer):</label>
                            <div className="flex flex-wrap gap-2">
                                {accounts.map((acc) => (
                                    <CategoryButton
                                        key={acc.id}
                                        selected={formData.from_account === acc.id}
                                        onClick={() => setFormData({ ...formData, from_account: acc.id })}
                                    >
                                        {acc.account_name} ({acc.current_balance})
                                    </CategoryButton>
                                ))}
                            </div>
                        </FormGroup>
                        <FormGroup>
                            <label>To Account (Destination of transfer):</label>
                            <div className="flex flex-wrap gap-2">
                                {accounts.map((acc) => (
                                    <CategoryButton
                                        key={acc.id}
                                        selected={formData.to_account === acc.id}
                                        onClick={() => setFormData({ ...formData, to_account: acc.id })}
                                    >
                                        {acc.account_name} ({acc.current_balance})
                                    </CategoryButton>
                                ))}
                            </div>
                        </FormGroup>
                    </div>
                )}

                {(formData.category === "Loan Received" || formData.category === "Loan Paid") && (
                    <FormGroup>
                        <label>
                            {formData.category === "Loan Received" ? "Received From (Lender):" : "Paid To (Lender):"}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {accounts
                                .filter((acc) => acc.account_type === "Person")
                                .map((acc) => (
                                    <CategoryButton
                                        key={acc.id}
                                        selected={formData.received_from === acc.id || formData.paid_to === acc.id}
                                        onClick={() => {
                                            setFormData({
                                                ...formData,
                                                received_from: formData.category === "Loan Received" ? acc.id : null,
                                                paid_to: formData.category === "Loan Paid" ? acc.id : null,
                                            });
                                        }}
                                    >
                                        {acc.account_name}
                                    </CategoryButton>
                                ))}
                        </div>
                    </FormGroup>
                )}

                <FormGroup>
                    <label>School (Optional):</label>
                    <div className="flex flex-wrap gap-2">
                        {schools.map((school) => (
                            <CategoryButton
                                key={school.id}
                                selected={formData.school === school.id}
                                onClick={() => setFormData({ ...formData, school: school.id })}
                            >
                                {school.name}
                            </CategoryButton>
                        ))}
                        <CategoryButton
                            selected={formData.school === 0}
                            onClick={() => setFormData({ ...formData, school: 0 })}
                        >
                            All School
                        </CategoryButton>
                        <CategoryButton
                            selected={formData.school === null}
                            onClick={() => setFormData({ ...formData, school: null })}
                        >
                            No School
                        </CategoryButton>
                    </div>
                </FormGroup>

                <FormGroup>
                    <label>Notes:</label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                </FormGroup>

                <SubmitButton type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                    {isSubmitting ? (isEditing ? "Updating..." : "Submitting...") : isEditing ? "Update Transaction" : "Save Transaction"}
                </SubmitButton>
            </Form>

            {/* Fetching Indicator */}
            {isFetchingTransactions && (
                <FetchingMessage>Fetching transactions...</FetchingMessage>
            )}

            {/* Transactions Table */}
            <Table>
                <thead>
                    <tr>
                        <TableHeader>Date</TableHeader>
                        <TableHeader>Type</TableHeader>
                        <TableHeader>Amount</TableHeader>
                        <TableHeader>Category</TableHeader>
                        <TableHeader>Account</TableHeader>
                        <TableHeader>School</TableHeader>
                        <TableHeader>Notes</TableHeader>
                        <TableHeader>Actions</TableHeader>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((trx) => (
                        <tr key={trx.id}>
                            <TableCell>{trx.date}</TableCell>
                            <TableCell>{trx.transaction_type}</TableCell>
                            <TableCell>{trx.amount}</TableCell>
                            <TableCell>{trx.category}</TableCell>
                            <TableCell>
                                {trx.transaction_type === "Income"
                                    ? trx.to_account_name || "N/A"
                                    : trx.from_account_name || "N/A"}
                            </TableCell>
                            <TableCell>
                                {trx.school === 0
                                    ? "All School"
                                    : trx.school
                                    ? schools.find((s) => s.id === trx.school)?.name || "Unknown"
                                    : "No School"}
                            </TableCell>
                            <TableCell>{trx.notes}</TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <ActionButton
                                        className="bg-blue-600 text-white"
                                        onClick={() => handleView(trx)}
                                    >
                                        View
                                    </ActionButton>
                                    <ActionButton
                                        className="bg-yellow-600 text-white"
                                        onClick={() => handleEdit(trx)}
                                    >
                                        Edit
                                    </ActionButton>
                                    <ActionButton
                                        className="bg-red-600 text-white"
                                        onClick={() => handleDelete(trx.id)}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? "Deleting..." : "Delete"}
                                    </ActionButton>
                                </div>
                            </TableCell>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Modal */}
            {modalOpen && selectedTransaction && (
                <ModalOverlay>
                    <ModalContent>
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Transaction Details</h2>
                        <p><strong>Date:</strong> {selectedTransaction.date}</p>
                        <p><strong>Type:</strong> {selectedTransaction.transaction_type}</p>
                        <p><strong>Amount:</strong> {selectedTransaction.amount}</p>
                        <p><strong>Category:</strong> {selectedTransaction.category}</p>
                        <p><strong>Account:</strong> {selectedTransaction.transaction_type === "Income" ? selectedTransaction.to_account_name : selectedTransaction.from_account_name}</p>
                        <p><strong>School:</strong> {selectedTransaction.school === 0 ? "All School" : selectedTransaction.school ? schools.find(s => s.id === selectedTransaction.school)?.name || "Unknown" : "No School"}</p>
                        <p><strong>Notes:</strong> {selectedTransaction.notes}</p>
                        <ModalCloseButton className="mt-4" onClick={closeModal}>
                            Close
                        </ModalCloseButton>
                    </ModalContent>
                </ModalOverlay>
            )}
        </Container>
    );
}

export default TransactionsPage;