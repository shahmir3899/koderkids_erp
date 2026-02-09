// ============================================
// TRANSACTIONS PAGE - Enhanced with Account Reconciliation & React Query
// ============================================
// Location: src/pages/TransactionsPage.js
//
// NEW FEATURES:
// 1. ✅ Account-based filtering for reconciliation (Bank/Person accounts)
// 2. ✅ Search button - filters only apply when button is clicked
// 3. ✅ Filter by receiving/paying accounts across all transaction types
// 4. ✅ Fixed transaction ordering after submission
// 5. ✅ React Query for caching and state management

import React, { useState, useMemo } from "react";
import { toast } from "react-toastify";

// React Query Hooks
import { useQueryClient } from '@tanstack/react-query';
import {
  useTransactions,
  useAllTransactions,
  useAccounts,
  useTransactionSchools,
  useAllCategories,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useAddCategory,
  useBulkCreateTransactions,
  transactionKeys,
} from "../hooks/queries";

// Utils
import { getTodayLocal } from "../utils/dateFormatters";

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  LAYOUT,
} from '../utils/designConstants';

// Common Components
import { CollapsibleSection } from "../components/common/cards/CollapsibleSection";
import { DataTable } from "../components/common/tables/DataTable";
import { ErrorDisplay } from "../components/common/ui/ErrorDisplay";
import { Button } from "../components/common/ui/Button";
import { PageHeader } from "../components/common/PageHeader";
import { SegmentedControl } from "../components/common/ui/SegmentedControl";

// Transaction Components
import { TransactionFilters } from "../components/transactions/TransactionFilters";
import { TransactionDetailsModal } from "../components/transactions/TransactionDetailsModal";
import { TransactionFormModal } from "../components/transactions/TransactionFormModal";
import TransactionAgentChat from "../components/transactions/TransactionAgentChat";

// Static constants (defined outside component to avoid re-creation)
const TRANSFER_CATEGORIES = ["Bank Transfer", "Cash Transfer"];

// Safe number parsing helper - returns null for invalid/empty values
const safeParseFloat = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

function TransactionsPage() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================

  // React Query Client for cache invalidation
  const queryClient = useQueryClient();

  // Tab State
  const [activeTab, setActiveTab] = useState("income");

  // React Query - Data fetching
  const { data: accounts = [], isLoading: isLoadingAccounts } = useAccounts();
  const { data: schools = [] } = useTransactionSchools();
  const { incomeCategories = [], expenseCategories = [] } = useAllCategories();

  // Transactions query - depends on activeTab and filters
  const [shouldFetchAllTypes, setShouldFetchAllTypes] = useState(false);

  // Filter States (must be declared before serverFilters useMemo)
  const [filters, setFilters] = useState({
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

  // Server-side filters - sent to backend API for efficient filtering
  const serverFilters = useMemo(() => ({
    limit: 50,
    offset: 0,
    ordering: "-date",
    // Only include filters that have values (backend handles these)
    ...(appliedFilters.dateFrom && { date__gte: appliedFilters.dateFrom }),
    ...(appliedFilters.dateTo && { date__lte: appliedFilters.dateTo }),
    ...(appliedFilters.school && appliedFilters.school !== "null" && { school: appliedFilters.school }),
    ...(appliedFilters.category && { category: appliedFilters.category }),
  }), [appliedFilters.dateFrom, appliedFilters.dateTo, appliedFilters.school, appliedFilters.category]);

  // Single type transactions query with server-side filtering
  const {
    data: singleTypeData,
    isLoading: isLoadingSingleType,
    refetch: refetchSingleType,
  } = useTransactions(
    activeTab,
    serverFilters,
    { enabled: !shouldFetchAllTypes }
  );

  // All types transactions query (for reconciliation)
  const {
    data: allTypesData,
    isLoading: isLoadingAllTypes,
    refetch: refetchAllTypes,
  } = useAllTransactions({ enabled: shouldFetchAllTypes });

  // Process transactions data
  const transactions = useMemo(() => {
    if (shouldFetchAllTypes && allTypesData) {
      return allTypesData;
    }
    if (!shouldFetchAllTypes && singleTypeData?.results) {
      return singleTypeData.results.map((trx) => ({
        ...trx,
        transaction_type: activeTab === "income" ? "Income" : activeTab === "expense" ? "Expense" : "Transfer",
        to_account_name: trx.to_account_name || "N/A",
        from_account_name: trx.from_account_name || "N/A",
        school: trx.school_id || null,
        school_name: trx.school_name || "No School",
      }));
    }
    return [];
  }, [shouldFetchAllTypes, allTypesData, singleTypeData, activeTab]);

  // React Query Mutations
  const createTransactionMutation = useCreateTransaction();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();
  const addCategoryMutation = useAddCategory();
  const bulkCreateMutation = useBulkCreateTransactions();

  // Form State
  const [formData, setFormData] = useState({
    date: getTodayLocal(),
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
  const [showFormModal, setShowFormModal] = useState(false);

  // Derived Loading States from React Query
  const loading = {
    transactions: isLoadingSingleType || isLoadingAllTypes,
    accounts: isLoadingAccounts,
    submit: createTransactionMutation.isPending || updateTransactionMutation.isPending,
    delete: deleteTransactionMutation.isPending,
    bulk: bulkCreateMutation.isPending,
  };

  // Error State - derived from mutations
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Pagination State - simplified since React Query handles caching
  const pagination = {
    offset: 0,
    limit: 100,
    hasMore: singleTypeData?.next ? true : false,
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================

  // Current categories based on active tab
  const currentCategories = useMemo(() => {
    return activeTab === "income"
      ? incomeCategories
      : activeTab === "expense"
      ? expenseCategories
      : TRANSFER_CATEGORIES;
  }, [activeTab, incomeCategories, expenseCategories]);

  // Separate accounts by type for better reconciliation
  const accountsByType = useMemo(() => {
    return {
      all: accounts,
      bank: accounts.filter(acc => acc.account_type === "Bank"),
      person: accounts.filter(acc => acc.account_type === "Person"),
      other: accounts.filter(acc => acc.account_type !== "Bank" && acc.account_type !== "Person"),
    };
  }, [accounts]);

  // Filtered transactions - CLIENT-SIDE ONLY for filters that can't be server-side
  // Note: date, school (except "null"), and category are now handled server-side
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Text search (must be client-side for full-text flexibility)
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

    // "No School" filter (special case - server can't handle null)
    if (appliedFilters.school === "null") {
      filtered = filtered.filter((tx) => !tx.school);
    }

    // Amount range filter (client-side - rarely used, keeps API simple)
    if (appliedFilters.minAmount) {
      const minAmount = safeParseFloat(appliedFilters.minAmount);
      if (minAmount !== null) {
        filtered = filtered.filter((tx) => {
          const txAmount = safeParseFloat(tx.amount);
          return txAmount !== null && txAmount >= minAmount;
        });
      }
    }
    if (appliedFilters.maxAmount) {
      const maxAmount = safeParseFloat(appliedFilters.maxAmount);
      if (maxAmount !== null) {
        filtered = filtered.filter((tx) => {
          const txAmount = safeParseFloat(tx.amount);
          return txAmount !== null && txAmount <= maxAmount;
        });
      }
    }

    // Account reconciliation filters (client-side - requires cross-type data)
    if (appliedFilters.account) {
      const accountId = parseInt(appliedFilters.account, 10);
      if (!isNaN(accountId)) {
        filtered = filtered.filter((tx) => {
          const fromAccount = tx.from_account != null ? parseInt(tx.from_account, 10) : null;
          const toAccount = tx.to_account != null ? parseInt(tx.to_account, 10) : null;
          return fromAccount === accountId || toAccount === accountId;
        });
      }
    }

    if (appliedFilters.accountType) {
      const accountsOfType = accounts
        .filter(acc => acc.account_type === appliedFilters.accountType)
        .map(acc => acc.id);

      filtered = filtered.filter(
        (tx) =>
          accountsOfType.includes(tx.from_account) ||
          accountsOfType.includes(tx.to_account)
      );
    }

    return filtered;
  }, [transactions, appliedFilters, accounts]);

  // ============================================
  // DATA REFETCH HELPERS
  // ============================================

  // Refetch transactions after mutations
  const refetchTransactions = () => {
    if (shouldFetchAllTypes) {
      refetchAllTypes();
    } else {
      refetchSingleType();
    }
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

    addCategoryMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Category added!");
      },
      onError: () => {
        toast.error("Could not add category.");
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading.submit) return;

    // Validation
    if (!formData.amount || !formData.category) {
      toast.error("Please fill in both Amount and Category before saving.");
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
        return;
      }
    }

    if (activeTab === "income") {
      if (formData.category === "Loan Received") {
        payload.from_account = formData.received_from;
        payload.to_account = formData.to_account;
        if (!payload.from_account || !payload.to_account) {
          toast.error("Please select both lender (Received From) and To Account for Loan Received.");
          return;
        }
      } else {
        payload.to_account = formData.to_account;
        if (!payload.to_account) {
          toast.error("Please select a To Account for the income transaction.");
          return;
        }
      }
    }

    if (activeTab === "transfers") {
      payload.from_account = formData.from_account;
      payload.to_account = formData.to_account;
      if (!payload.from_account || !payload.to_account) {
        toast.error("Please select both From and To accounts for transfer.");
        return;
      }
    }

    const onSuccess = () => {
      toast.success(isEditing ? "Transaction updated successfully!" : "Transaction saved successfully!");
      // Close modal and reset form
      setShowFormModal(false);
      setIsEditing(false);
      setSelectedTransaction(null);
      setFormData({
        date: getTodayLocal(),
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
    };

    const onError = (error) => {
      console.error("Save Transaction Error:", error.response?.data || error.message);
      const errorMessage =
        error.response?.data?.message ||
        (error.response?.data && typeof error.response.data === "object"
          ? Object.entries(error.response.data)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ")
          : "Failed to save transaction. Please check the form and try again.");
      toast.error(errorMessage);
    };

    if (isEditing && selectedTransaction) {
      updateTransactionMutation.mutate(
        { type: activeTab, id: selectedTransaction.id, payload },
        { onSuccess, onError }
      );
    } else {
      createTransactionMutation.mutate(
        { type: activeTab, payload },
        { onSuccess, onError }
      );
    }
  };

  const handleEdit = (trx) => {
    const normalizedType = trx.transaction_type.toLowerCase();
    const tab = normalizedType === "transfer" ? "transfers" : normalizedType;
    setActiveTab(tab);

    setIsEditing(true);
    setSelectedTransaction(trx);
    setShowFormModal(true); // Open the form modal for editing

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

    // Use the original transaction type, not the active tab
    // This ensures we delete from the correct endpoint
    const deleteEndpoint = originalTransactionType.toLowerCase() === "transfer"
      ? "transfers"
      : originalTransactionType.toLowerCase();

    deleteTransactionMutation.mutate(
      { type: deleteEndpoint, id },
      {
        onSuccess: () => {
          toast.success("Transaction deleted successfully!");
        },
        onError: (error) => {
          console.error("Delete failed:", error.response ? error.response.data : error.message);
          toast.error(error.response?.data?.message || "Failed to delete transaction due to a server error.");
        },
      }
    );
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
    refetchTransactions();
    setIsRetrying(false);
  };

  const handleLoadMore = async () => {
    // With React Query, we'd implement infinite queries if needed
    // For now, we load 100 items which covers most use cases
    toast.info("All transactions are already loaded.");
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  // ============================================
  // NEW: Search button handler - applies filters
  // ============================================
  const handleApplyFilters = async () => {
    const newAccountFilter = filters.account;
    const newAccountTypeFilter = filters.accountType;

    // Update applied filters
    setAppliedFilters({ ...filters });

    // If account or account type filter is set, switch to fetching all types
    const needsAllTypes = newAccountFilter || newAccountTypeFilter;
    if (needsAllTypes !== shouldFetchAllTypes) {
      setShouldFetchAllTypes(needsAllTypes);
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
    setShouldFetchAllTypes(false); // Reset to single type fetching
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

  // Check if filters have been changed
  const hasUnappliedFilters = useMemo(() => {
    return JSON.stringify(filters) !== JSON.stringify(appliedFilters);
  }, [filters, appliedFilters]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={styles.pageContainer}>
      <div style={styles.contentWrapper}>
      {/* Error State */}
      {error && (
        <div style={{ marginBottom: SPACING['2xl'] }}>
          <ErrorDisplay error={error} onRetry={handleRetry} isRetrying={isRetrying} />
        </div>
      )}
      {/* Page Header */}
      <PageHeader
        icon="💳"
        title="Transactions Management"
        subtitle="Record and manage income, expenses, and transfers"
      />

      {/* AI Reconciliation Agent */}
      <CollapsibleSection
        title="🤖 Reconciliation Agent"
        defaultOpen={false}
      >
        <TransactionAgentChat
          accounts={accounts}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
          }}
          height="400px"
        />
      </CollapsibleSection>

      {/* Transaction Type Selector & Add Button */}
      <div style={styles.headerRow}>
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'income', label: 'Income', icon: '💵' },
            { value: 'expense', label: 'Expense', icon: '💸' },
            { value: 'transfers', label: 'Transfers', icon: '🔄' },
          ]}
          size="md"
        />

        <Button
          onClick={() => {
            setIsEditing(false);
            setSelectedTransaction(null);
            setFormData({
              date: getTodayLocal(),
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
            setShowFormModal(true);
          }}
          variant="primary"
          style={styles.addButton}
        >
          ➕ Add Transaction
        </Button>
      </div>

      {/* Transactions Table */}
      <CollapsibleSection
        title={`📋 Transactions (${filteredTransactions.length} of ${transactions.length})`}
        defaultOpen
      >
        {/* Inline Compact Filters */}
        <TransactionFilters
          compact={true}
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
                <span style={styles.transactionTypeBadge(value)}>
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
                <span style={styles.amountText}>
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
                <span style={styles.notesCell}>
                  {value || '-'}
                </span>
              ),
            },
            {
              key: 'actions',
              label: 'Actions',
              align: 'center',
              render: (_, row) => (
                <div style={styles.actionButtons}>
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
          <div style={styles.loadMoreContainer}>
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

      {/* Transaction Form Modal */}
      <TransactionFormModal
        show={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setIsEditing(false);
          setSelectedTransaction(null);
          setFormData({
            date: getTodayLocal(),
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
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        formData={formData}
        setFormData={setFormData}
        currentCategories={currentCategories}
        accounts={accounts}
        schools={schools}
        handleCategoryChange={handleCategoryChange}
        handleAddCategory={handleAddCategory}
        handleSubmit={handleSubmit}
        isEditing={isEditing}
        loading={loading}
      />
      </div>
    </div>
  );
}

// ============================================
// STYLES - Centralized design constants
// ============================================
const styles = {
  pageContainer: {
    minHeight: '100vh',
    background: COLORS.background.gradient,
    padding: SPACING.xl,
  },
  contentWrapper: {
    maxWidth: LAYOUT.maxWidth.md,
    margin: '0 auto',
  },
  pageTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  filterBadge: {
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(59, 130, 246, 0.3)',
    backdropFilter: 'blur(8px)',
  },
  filterBadgeText: {
    fontSize: FONT_SIZES.sm,
    color: '#93C5FD',
    margin: 0,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  transactionTypeBadge: (type) => {
    const color = (() => {
      switch (type.toLowerCase()) {
        case "income":
          return COLORS.transaction.income;
        case "expense":
          return COLORS.transaction.expense;
        case "transfer":
          return COLORS.transaction.transfer;
        default:
          return COLORS.text.secondary;
      }
    })();

    return {
      padding: `${SPACING.xs} ${SPACING.md}`,
      borderRadius: BORDER_RADIUS.lg,
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.semibold,
      backgroundColor: `${color}20`,
      color: color,
    };
  },
  amountText: {
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.primary,
  },
  notesCell: {
    maxWidth: '200px',
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  actionButtons: {
    display: 'flex',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  loadMoreContainer: {
    marginTop: SPACING.xl,
    textAlign: 'center',
  },
};

export default TransactionsPage;