// ============================================
// TRANSACTIONS PAGE - Enhanced with Account Reconciliation
// ============================================
// Location: src/pages/TransactionsPage.js
//
// NEW FEATURES:
// 1. ✅ Account-based filtering for reconciliation (Bank/Person accounts)
// 2. ✅ Search button - filters only apply when button is clicked
// 3. ✅ Filter by receiving/paying accounts across all transaction types
// 4. ✅ Fixed transaction ordering after submission

import React, { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";

// API
import { API_URL, getAuthHeaders } from "../api";
import { transactionService } from "../services/transactionService";

// Common Components
import { CollapsibleSection } from "../components/common/cards/CollapsibleSection";
import { DataTable } from "../components/common/tables/DataTable";
import { LoadingSpinner } from "../components/common/ui/LoadingSpinner";
import { ErrorDisplay } from "../components/common/ui/ErrorDisplay";
import { Button } from "../components/common/ui/Button";

// Transaction Components
import { TransactionStats } from "../components/transactions/TransactionStats";
import { TransactionForm } from "../components/transactions/TransactionForm";
import { TransactionFilters } from "../components/transactions/TransactionFilters";
import { TransactionDetailsModal } from "../components/transactions/TransactionDetailsModal";

function TransactionsPage() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  // Tab State
  const [activeTab, setActiveTab] = useState("income");

  // Data States
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [transferCategories] = useState(["Bank Transfer", "Cash Transfer"]);

  // Form State
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

  // Modal States
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Loading States
  const [loading, setLoading] = useState({
    transactions: false,
    accounts: false,
    submit: false,
    delete: false,
  });

  // Error State
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Pagination State
  const [pagination, setPagination] = useState({ 
    offset: 0, 
    limit: 20, 
    hasMore: true 
  });

  // Filter States (not applied until Search button clicked)
  const [filters, setFilters] = useState({
    search: "",
    dateFrom: "",
    dateTo: "",
    school: "",
    category: "",
    minAmount: "",
    maxAmount: "",
    account: "", // Specific account for reconciliation
    accountType: "", // Bank or Person account type
  });

  // Applied Filters (actually used for filtering)
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    dateFrom: "",
    dateTo: "",
    school: "",
    category: "",
    minAmount: "",
    maxAmount: "",
    account: "",
    accountType: "",
  });

  // ============================================
  // COMPUTED VALUES
  // ============================================

  // Current categories based on active tab
  const currentCategories = useMemo(() => {
    return activeTab === "income"
      ? incomeCategories
      : activeTab === "expense"
      ? expenseCategories
      : transferCategories;
  }, [activeTab, incomeCategories, expenseCategories, transferCategories]);

  // Separate accounts by type for better reconciliation
  const accountsByType = useMemo(() => {
    return {
      all: accounts,
      bank: accounts.filter(acc => acc.account_type === "Bank"),
      person: accounts.filter(acc => acc.account_type === "Person"),
      other: accounts.filter(acc => acc.account_type !== "Bank" && acc.account_type !== "Person"),
    };
  }, [accounts]);

  // Filtered transactions (using APPLIED filters only)
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Search filter
    if (appliedFilters.search) {
      const searchLower = appliedFilters.search.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.category?.toLowerCase().includes(searchLower) ||
          tx.notes?.toLowerCase().includes(searchLower) ||
          tx.school_name?.toLowerCase().includes(searchLower) ||
          tx.from_account_name?.toLowerCase().includes(searchLower) ||
          tx.to_account_name?.toLowerCase().includes(searchLower)
      );
    }

    // Date range filter
    if (appliedFilters.dateFrom) {
      filtered = filtered.filter((tx) => tx.date >= appliedFilters.dateFrom);
    }
    if (appliedFilters.dateTo) {
      filtered = filtered.filter((tx) => tx.date <= appliedFilters.dateTo);
    }

    // School filter
    if (appliedFilters.school) {
      if (appliedFilters.school === "null") {
        filtered = filtered.filter((tx) => !tx.school);
      } else {
        filtered = filtered.filter((tx) => tx.school === parseInt(appliedFilters.school));
      }
    }

    // Category filter
    if (appliedFilters.category) {
      filtered = filtered.filter((tx) => tx.category === appliedFilters.category);
    }

    // Amount range filter
    if (appliedFilters.minAmount) {
      filtered = filtered.filter((tx) => parseFloat(tx.amount) >= parseFloat(appliedFilters.minAmount));
    }
    if (appliedFilters.maxAmount) {
      filtered = filtered.filter((tx) => parseFloat(tx.amount) <= parseFloat(appliedFilters.maxAmount));
    }

    // ============================================
    // NEW: Account-based filtering for reconciliation
    // ============================================
    
    // Filter by specific account (checks both from_account and to_account)
    if (appliedFilters.account) {
      const accountId = parseInt(appliedFilters.account);
      console.log("Filtering by account:", accountId);
      console.log("Total transactions before filter:", filtered.length);
      
      filtered = filtered.filter(
        (tx) => {
          const matches = tx.from_account === accountId || tx.to_account === accountId;
          if (matches) {
            console.log("Match found:", tx);
          }
          return matches;
        }
      );
      
      console.log("Total transactions after account filter:", filtered.length);
    }

    // Filter by account type (Bank or Person)
    if (appliedFilters.accountType) {
      const accountsOfType = accounts
        .filter(acc => acc.account_type === appliedFilters.accountType)
        .map(acc => acc.id);
      
      console.log("Filtering by account type:", appliedFilters.accountType);
      console.log("Accounts of this type:", accountsOfType);
      console.log("Total transactions before filter:", filtered.length);
      
      filtered = filtered.filter(
        (tx) => 
          accountsOfType.includes(tx.from_account) || 
          accountsOfType.includes(tx.to_account)
      );
      
      console.log("Total transactions after account type filter:", filtered.length);
    }

    return filtered;
  }, [transactions, appliedFilters, accounts]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalAmount = filteredTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
    const avgAmount = filteredTransactions.length > 0 ? totalAmount / filteredTransactions.length : 0;

    return {
      count: filteredTransactions.length,
      total: totalAmount,
      average: avgAmount,
    };
  }, [filteredTransactions]);

  // ============================================
  // DATA FETCHING
  // ============================================

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch transactions when tab changes
  useEffect(() => {
    resetAndFetchTransactions();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setError(null);

    try {
      // Fetch schools
      const schoolsResponse = await transactionService.getSchools();
      setSchools(schoolsResponse.data);

      // Fetch accounts
      await fetchAccounts();

      // Fetch categories
      await fetchCategories();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to load initial data.";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const fetchAccounts = async () => {
    setLoading((prev) => ({ ...prev, accounts: true }));
    try {
      const response = await transactionService.getAccounts();
      setAccounts(response.data);
    } catch (error) {
      toast.error("Failed to fetch accounts.");
    } finally {
      setLoading((prev) => ({ ...prev, accounts: false }));
    }
  };

  const fetchCategories = async () => {
    try {
      const [incomeRes, expenseRes] = await Promise.all([
        transactionService.getCategories("income"),
        transactionService.getCategories("expense"),
      ]);
      setIncomeCategories(incomeRes.data.map((c) => c.name));
      setExpenseCategories(expenseRes.data.map((c) => c.name));
    } catch (error) {
      toast.error("Failed to load categories.");
    }
  };

  const fetchTransactions = async (append = false) => {
    if (!pagination.hasMore && append) return;
    
    setLoading((prev) => ({ ...prev, transactions: true }));
    
    try {
      // When account filter is applied, load ALL transaction types
      // Otherwise, load only the active tab
      const shouldLoadAllTypes = appliedFilters.account || appliedFilters.accountType;
      
      let allTransactions = [];
      
      if (shouldLoadAllTypes) {
        // Load all three transaction types for reconciliation
        const [incomeRes, expenseRes, transferRes] = await Promise.all([
          transactionService.getTransactions("income", {
            limit: 100, // Load more for filtering
            offset: 0,
            ordering: "-date",
          }),
          transactionService.getTransactions("expense", {
            limit: 100,
            offset: 0,
            ordering: "-date",
          }),
          transactionService.getTransactions("transfers", {
            limit: 100,
            offset: 0,
            ordering: "-date",
          }),
        ]);

        const incomeTxs = incomeRes.data.results.map((trx) => ({
          ...trx,
          transaction_type: "Income",
          to_account_name: trx.to_account_name || "N/A",
          from_account_name: trx.from_account_name || "N/A",
          school: trx.school_id || null,
          school_name: trx.school_name || "No School",
        }));

        const expenseTxs = expenseRes.data.results.map((trx) => ({
          ...trx,
          transaction_type: "Expense",
          to_account_name: trx.to_account_name || "N/A",
          from_account_name: trx.from_account_name || "N/A",
          school: trx.school_id || null,
          school_name: trx.school_name || "No School",
        }));

        const transferTxs = transferRes.data.results.map((trx) => ({
          ...trx,
          transaction_type: "Transfer",
          to_account_name: trx.to_account_name || "N/A",
          from_account_name: trx.from_account_name || "N/A",
          school: trx.school_id || null,
          school_name: trx.school_name || "No School",
        }));

        allTransactions = [...incomeTxs, ...expenseTxs, ...transferTxs];
        // Sort by date descending
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setPagination((prev) => ({
          ...prev,
          offset: allTransactions.length,
          hasMore: false, // Disable load more when showing all types
        }));
      } else {
        // Normal single-tab loading
        const response = await transactionService.getTransactions(activeTab, {
          limit: pagination.limit,
          offset: append ? pagination.offset : 0,
          ordering: "-date",
        });

        allTransactions = response.data.results.map((trx) => ({
          ...trx,
          to_account_name: trx.to_account_name || "N/A",
          from_account_name: trx.from_account_name || "N/A",
          school: trx.school_id || null,
          school_name: trx.school_name || "No School",
        }));
        
        setPagination((prev) => ({
          ...prev,
          offset: append ? prev.offset + allTransactions.length : allTransactions.length,
          hasMore: !!response.data.next,
        }));
      }

      setTransactions((prev) => (append ? [...prev, ...allTransactions] : allTransactions));
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch transactions.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading((prev) => ({ ...prev, transactions: false }));
    }
  };

  // ============================================
  // CRITICAL FIX: Reset pagination and fetch fresh after submission
  // ============================================
  const resetAndFetchTransactions = async () => {
    setPagination({ offset: 0, limit: 20, hasMore: true });
    setTransactions([]);
    await fetchTransactions(false);
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleCategoryChange = (category) => {
    setFormData({
      ...formData,
      category,
      received_from: category === "Loan Received" ? formData.received_from : null,
      paid_to: category === "Loan Paid" ? formData.paid_to : null,
    });
  };

  const handleAddCategory = async (newCategory) => {
    if (!newCategory.trim()) return;

    const payload = {
      name: newCategory.trim(),
      category_type: activeTab,
    };

    try {
      await transactionService.addCategory(payload);
      toast.success("Category added!");

      if (activeTab === "income") {
        setIncomeCategories((prev) => [...prev, payload.name]);
      } else if (activeTab === "expense") {
        setExpenseCategories((prev) => [...prev, payload.name]);
      }
    } catch (err) {
      toast.error("Could not add category.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading.submit) return;

    setLoading((prev) => ({ ...prev, submit: true }));

    // Validation
    if (!formData.amount || !formData.category) {
      toast.error("Please fill in both Amount and Category before saving.");
      setLoading((prev) => ({ ...prev, submit: false }));
      return;
    }

    // Build payload
    const transactionType =
      activeTab === "expense" ? "Expense" :
      activeTab === "income" ? "Income" :
      activeTab === "transfers" ? "Transfer" : "";

    const amount = parseFloat(formData.amount).toFixed(2);

    let payload = {
      date: formData.date,
      transaction_type: transactionType,
      amount: amount,
      category: formData.category,
      notes: formData.notes || "",
      school: formData.school,
      from_account: null,
      to_account: null,
    };

    // Add account logic based on transaction type
    if (activeTab === "expense") {
      payload.from_account = formData.from_account;
      if (formData.category === "Loan Paid") {
        payload.to_account = formData.paid_to;
      }
      if (!payload.from_account) {
        toast.error("Please select a From Account for the expense.");
        setLoading((prev) => ({ ...prev, submit: false }));
        return;
      }
    }

    if (activeTab === "income") {
      if (formData.category === "Loan Received") {
        payload.from_account = formData.received_from;
        payload.to_account = formData.to_account;
        if (!payload.from_account || !payload.to_account) {
          toast.error("Please select both lender (Received From) and To Account for Loan Received.");
          setLoading((prev) => ({ ...prev, submit: false }));
          return;
        }
      } else {
        payload.to_account = formData.to_account;
        if (!payload.to_account) {
          toast.error("Please select a To Account for the income transaction.");
          setLoading((prev) => ({ ...prev, submit: false }));
          return;
        }
      }
    }

    if (activeTab === "transfers") {
      payload.from_account = formData.from_account;
      payload.to_account = formData.to_account;
      if (!payload.from_account || !payload.to_account) {
        toast.error("Please select both From and To accounts for transfer.");
        setLoading((prev) => ({ ...prev, submit: false }));
        return;
      }
    }

    try {
      if (isEditing && selectedTransaction) {
        await transactionService.updateTransaction(activeTab, selectedTransaction.id, payload);
        toast.success("Transaction updated successfully!");
      } else {
        await transactionService.createTransaction(activeTab, payload);
        toast.success("Transaction saved successfully!");
      }

      // CRITICAL FIX: Reset pagination and fetch fresh transactions
      await resetAndFetchTransactions();
      await fetchAccounts();

      // Reset form
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
      console.error("Save Transaction Error:", error.response?.data || error.message);
      const errorMessage =
        error.response?.data?.message ||
        (error.response?.data && typeof error.response.data === "object"
          ? Object.entries(error.response.data)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ")
          : "Failed to save transaction. Please check the form and try again.");
      toast.error(errorMessage);
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  const handleEdit = (trx) => {
    const normalizedType = trx.transaction_type.toLowerCase();
    const tab = normalizedType === "transfer" ? "transfers" : normalizedType;
    setActiveTab(tab);

    setIsEditing(true);
    setSelectedTransaction(trx);

    setFormData({
      date: trx.date ? trx.date.split("T")[0] : "",
      transaction_type: normalizedType,
      amount: trx.amount,
      category: trx.category,
      notes: trx.notes,
      from_account: trx.from_account || null,
      to_account: trx.to_account || null,
      received_from: trx.from_account || null,
      paid_to: trx.to_account || null,
      school: trx.school || null,
    });
  };

  const handleDelete = async (id, originalTransactionType) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    
    setLoading((prev) => ({ ...prev, delete: true }));
    
    try {
      // Use the original transaction type, not the active tab
      // This ensures we delete from the correct endpoint
      const deleteEndpoint = originalTransactionType.toLowerCase() === "transfer" 
        ? "transfers" 
        : originalTransactionType.toLowerCase();
      
      console.log(`Deleting transaction ${id} from endpoint: ${deleteEndpoint}`);
      
      await transactionService.deleteTransaction(deleteEndpoint, id);
      
      // CRITICAL FIX: Reset pagination and fetch fresh transactions
      await resetAndFetchTransactions();
      
      toast.success("Transaction deleted successfully!");
    } catch (error) {
      console.error("Delete failed:", error.response ? error.response.data : error.message);
      toast.error(error.response?.data?.message || "Failed to delete transaction due to a server error.");
    } finally {
      setLoading((prev) => ({ ...prev, delete: false }));
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

  const handleLoadMore = async () => {
    await fetchTransactions(true);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  // ============================================
  // NEW: Search button handler - applies filters
  // ============================================
  const handleApplyFilters = async () => {
    const previousAccountFilter = appliedFilters.account;
    const previousAccountTypeFilter = appliedFilters.accountType;
    const newAccountFilter = filters.account;
    const newAccountTypeFilter = filters.accountType;
    
    // Update applied filters
    setAppliedFilters({ ...filters });
    
    // If account or account type filter changed, refetch all transactions
    if (
      newAccountFilter !== previousAccountFilter || 
      newAccountTypeFilter !== previousAccountTypeFilter
    ) {
      await resetAndFetchTransactions();
    }
    
    toast.success("Filters applied!");
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      search: "",
      dateFrom: "",
      dateTo: "",
      school: "",
      category: "",
      minAmount: "",
      maxAmount: "",
      account: "",
      accountType: "",
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    toast.info("Filters cleared!");
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const getAccountName = (trx) => {
    if (trx.transaction_type === "Income") {
      return trx.to_account_name || "N/A";
    } else if (trx.transaction_type === "Expense") {
      return trx.from_account_name || "N/A";
    } else {
      return `${trx.from_account_name || "N/A"} → ${trx.to_account_name || "N/A"}`;
    }
  };

  const getTransactionTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case "income":
        return "#10B981"; // Green
      case "expense":
        return "#EF4444"; // Red
      case "transfer":
        return "#3B82F6"; // Blue
      default:
        return "#6B7280"; // Gray
    }
  };

  // Check if filters have been changed
  const hasUnappliedFilters = useMemo(() => {
    return JSON.stringify(filters) !== JSON.stringify(appliedFilters);
  }, [filters, appliedFilters]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
      {/* Error State */}
      {error && (
        <div style={{ marginBottom: '2rem' }}>
          <ErrorDisplay error={error} onRetry={handleRetry} isRetrying={isRetrying} />
        </div>
      )}
      {/* Page Title */}
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1E40AF',
          marginBottom: '1.5rem',
          textAlign: 'center',
        }}
      >
        💰 Transactions Management
      </h1>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1.5rem',
        borderBottom: '2px solid #E5E7EB',
        paddingBottom: '0.5rem',
      }}>
        {["income", "expense", "transfers"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              backgroundColor: activeTab === tab ? '#1E40AF' : 'transparent',
              color: activeTab === tab ? 'white' : '#6B7280',
              transition: 'all 0.2s',
            }}
          >
            {tab === "income" ? "💵 Income" : tab === "expense" ? "💸 Expense" : "🔄 Transfers"}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <TransactionStats 
        stats={stats}
        activeTab={activeTab}
      />

      {/* Transaction Form */}
      <CollapsibleSection title={`${isEditing ? "✏️ Edit" : "➕ Add"} Transaction`} defaultOpen>
        <TransactionForm
          formData={formData}
          setFormData={setFormData}
          activeTab={activeTab}
          currentCategories={currentCategories}
          accounts={accounts}
          schools={schools}
          handleCategoryChange={handleCategoryChange}
          handleAddCategory={handleAddCategory}
          handleSubmit={handleSubmit}
          isEditing={isEditing}
          loading={loading}
        />
      </CollapsibleSection>

      {/* Filters with Search Button */}
      <CollapsibleSection title="🔍 Filter Transactions for Reconciliation" defaultOpen={false}>
        <TransactionFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          onApplyFilters={handleApplyFilters}
          schools={schools}
          categories={currentCategories}
          accounts={accounts}
          accountsByType={accountsByType}
          hasUnappliedFilters={hasUnappliedFilters}
        />
      </CollapsibleSection>

      {/* Transactions Table */}
      <CollapsibleSection 
        title={`📋 Transactions (${filteredTransactions.length} of ${transactions.length})`} 
        defaultOpen
      >
        {/* Active Filters Display */}
        {Object.values(appliedFilters).some(v => v !== "") && (
          <div style={{ 
            marginBottom: '1rem', 
            padding: '1rem', 
            backgroundColor: '#EFF6FF', 
            borderRadius: '8px',
            border: '1px solid #BFDBFE'
          }}>
            <p style={{ fontSize: '0.875rem', color: '#1E40AF', margin: 0, fontWeight: '600' }}>
              🔍 Active Filters: 
              {appliedFilters.account && ` Account (${accounts.find(a => a.id === parseInt(appliedFilters.account))?.account_name})`}
              {appliedFilters.accountType && ` | Account Type (${appliedFilters.accountType})`}
              {(appliedFilters.dateFrom || appliedFilters.dateTo) && (
                ` | Date Range: ${
                  appliedFilters.dateFrom 
                    ? new Date(appliedFilters.dateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '...'
                } - ${
                  appliedFilters.dateTo 
                    ? new Date(appliedFilters.dateTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '...'
                }`
              )}
              {appliedFilters.category && ` | Category (${appliedFilters.category})`}
              {appliedFilters.school && ` | School (${schools.find(s => s.id === parseInt(appliedFilters.school))?.name || 'N/A'})`}
              {appliedFilters.search && ` | Search (${appliedFilters.search})`}
              {(appliedFilters.minAmount || appliedFilters.maxAmount) && (
                ` | Amount: ${appliedFilters.minAmount ? `PKR ${parseFloat(appliedFilters.minAmount).toLocaleString()}` : '...'} - ${appliedFilters.maxAmount ? `PKR ${parseFloat(appliedFilters.maxAmount).toLocaleString()}` : '...'}`
              )}
            </p>
          </div>
        )}

        <DataTable
          data={filteredTransactions}
          loading={loading.transactions}
          columns={[
            {
              key: 'date',
              label: 'Date',
              sortable: true,
              render: (value) => new Date(value).toLocaleDateString(),
            },
            {
              key: 'transaction_type',
              label: 'Type',
              sortable: true,
              render: (value) => (
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: `${getTransactionTypeColor(value)}20`,
                    color: getTransactionTypeColor(value),
                  }}
                >
                  {value}
                </span>
              ),
            },
            {
              key: 'amount',
              label: 'Amount',
              sortable: true,
              align: 'right',
              render: (value) => (
                <span style={{ fontWeight: '600', color: '#1F2937' }}>
                  PKR {parseFloat(value).toLocaleString()}
                </span>
              ),
            },
            {
              key: 'category',
              label: 'Category',
              sortable: true,
            },
            {
              key: 'account',
              label: 'Account',
              render: (_, row) => getAccountName(row),
            },
            {
              key: 'school_name',
              label: 'School',
              sortable: true,
            },
            {
              key: 'notes',
              label: 'Notes',
              render: (value) => (
                <span style={{ 
                  maxWidth: '200px', 
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {value || '-'}
                </span>
              ),
            },
            {
              key: 'actions',
              label: 'Actions',
              align: 'center',
              render: (_, row) => (
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <Button
                    onClick={() => handleView(row)}
                    variant="info"
                    size="small"
                  >
                    👁️ View
                  </Button>
                  <Button
                    onClick={() => handleEdit(row)}
                    variant="warning"
                    size="small"
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(row.id, row.transaction_type)}
                    variant="danger"
                    size="small"
                    disabled={loading.delete}
                  >
                    🗑️ Delete
                  </Button>
                </div>
              ),
            },
          ]}
          emptyMessage="No transactions found. Try adjusting your filters or add your first transaction above!"
          striped
          hoverable
        />

        {/* Load More Button */}
        {pagination.hasMore && !Object.values(appliedFilters).some(v => v !== "") && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Button
              onClick={handleLoadMore}
              variant="secondary"
              disabled={loading.transactions}
            >
              {loading.transactions ? "Loading..." : "Load More Transactions"}
            </Button>
          </div>
        )}
      </CollapsibleSection>

      {/* Transaction Details Modal */}
      {modalOpen && selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

export default TransactionsPage;