// ============================================
// USE INVENTORY HOOK - Now Uses Global Context
// ============================================
// Location: src/hooks/useInventory.js
//
// UPDATED: This hook now reads from InventoryContext instead of making API calls
// This eliminates duplicate API requests and provides instant page loads

import { useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react';
import { toast } from 'react-toastify';
import InventoryContext from '../contexts/InventoryContext';
import {
  deleteInventoryItem,
  exportInventory,
  generateItemDetailReport,
} from '../services/inventoryService';

// ============================================
// CONSTANTS
// ============================================

export const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'Available', label: 'Available' },
  { value: 'Assigned', label: 'Assigned' },
  { value: 'Damaged', label: 'Damaged' },
  { value: 'Lost', label: 'Lost' },
  { value: 'Disposed', label: 'Disposed' },
];

// Location options - filtered by role in the hook
export const ALL_LOCATION_OPTIONS = [
  { value: '', label: '📍 All Locations' },
  { value: 'School', label: '🏫 School' },
  { value: 'Headquarters', label: '🏢 Headquarters' },
  { value: 'Unassigned', label: '📦 Unassigned' },
];

// ============================================
// HOOK
// ============================================

export const useInventory = () => {
  // ============================================
  // CONTEXT - Global cached data
  // ============================================
  const context = useContext(InventoryContext);

  if (!context) {
    throw new Error('useInventory must be used within InventoryProvider');
  }

  const {
    inventoryItems: allItems,
    summary,
    categories,
    schools,
    users,
    userContext,
    loading: contextLoading,
    refetchItems,
    refetchSummary,
    refetchCategories,
    refetchAll,
    addItemToCache,
    updateItemInCache,
    removeItemFromCache,
  } = context;

  // ============================================
  // LOCAL STATE (UI-specific, not cached)
  // ============================================
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Filter state
  const [filters, setFilters] = useState({
    location: '',
    schoolId: '',
    categoryId: '',
    status: '',
    assignedTo: '',
    search: '',
  });

  // Selection state
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  // Modal state
  const [modals, setModals] = useState({
    add: false,
    details: false,
    category: false,
    transfer: false,
    reassign: false,
    report: false,
    confirmDelete: false,
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Action loading states (not data loading)
  const [actionLoading, setActionLoading] = useState({
    delete: false,
    export: false,
    certificate: {},
  });

  // ============================================
  // COMPUTED: LOCATION OPTIONS (Role-filtered)
  // ============================================
  const locationOptions = useMemo(() => {
    if (userContext.isAdmin) {
      return ALL_LOCATION_OPTIONS;
    }
    // Teachers only see School option
    return [
      { value: '', label: '📍 All Schools' },
      { value: 'School', label: '🏫 School' },
    ];
  }, [userContext.isAdmin]);

  // ============================================
  // CLIENT-SIDE FILTERING
  // ============================================

  const filteredItems = useMemo(() => {
    const items = Array.isArray(allItems) ? allItems : [];

    return items.filter(item => {
      // Location filter (field is 'location', not 'location_type')
      if (filters.location && filters.location !== '') {
        if (filters.location === 'School' && item.location !== 'School') {
          return false;
        }
        if (filters.location === 'Headquarters' && item.location !== 'Headquarters') {
          return false;
        }
        if (filters.location === 'Unassigned' && item.location !== 'Unassigned' && item.location !== null) {
          return false;
        }
      }

      // School filter
      if (filters.schoolId && filters.schoolId !== '') {
        const schoolId = Number(filters.schoolId);
        // Backend returns 'school' as the FK ID directly (not school_id or school.id)
        const itemSchoolId = item.school;
        if (itemSchoolId !== schoolId) {
          return false;
        }
      }

      // Category filter (backend returns 'category' as the FK ID directly, same as 'school')
      if (filters.categoryId && filters.categoryId !== '') {
        const categoryId = Number(filters.categoryId);
        if (item.category !== categoryId) {
          return false;
        }
      }

      // Status filter
      if (filters.status && filters.status !== '') {
        if (item.status !== filters.status) {
          return false;
        }
      }

      // Assigned To filter
      if (filters.assignedTo && filters.assignedTo !== '') {
        const assignedToId = Number(filters.assignedTo);
        // Handle both 'assigned_to' (FK ID) and check for unassigned
        if (filters.assignedTo === 'unassigned') {
          // Show only unassigned items
          if (item.assigned_to !== null && item.assigned_to !== undefined) {
            return false;
          }
        } else {
          // Filter by specific user
          if (item.assigned_to !== assignedToId) {
            return false;
          }
        }
      }

      // Search filter (name, serial_number, asset_tag)
      if (filters.search && filters.search !== '') {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          (item.name && item.name.toLowerCase().includes(searchLower)) ||
          (item.serial_number && item.serial_number.toLowerCase().includes(searchLower)) ||
          (item.asset_tag && item.asset_tag.toLowerCase().includes(searchLower));

        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });
  }, [allItems, filters]);

  // ============================================
  // FILTER HANDLERS
  // ============================================

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };

      // Reset schoolId when location changes away from School
      if (key === 'location' && value !== 'School') {
        newFilters.schoolId = '';
      }

      return newFilters;
    });
    setSelectedItemIds([]); // Clear selection on filter change
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      location: '',
      schoolId: '',
      categoryId: '',
      status: '',
      assignedTo: '',
      search: '',
    });
    setSelectedItemIds([]);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(v => v !== '');
  }, [filters]);

  // ============================================
  // SELECTION HANDLERS
  // ============================================

  const toggleItemSelection = useCallback((itemId) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedItemIds.length === filteredItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredItems.map(item => item.id));
    }
  }, [selectedItemIds.length, filteredItems]);

  const clearSelection = useCallback(() => {
    setSelectedItemIds([]);
  }, []);

  // Get full item objects for selected IDs
  const selectedItems = useMemo(() => {
    return filteredItems.filter(item => selectedItemIds.includes(item.id));
  }, [filteredItems, selectedItemIds]);

  // ============================================
  // MODAL HANDLERS
  // ============================================

  const openModal = useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
  }, []);

  const closeModal = useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
    if (modalName === 'details' || modalName === 'add') {
      setSelectedItem(null);
      setIsEditMode(false);
    }
    if (modalName === 'confirmDelete') {
      setItemToDelete(null);
    }
  }, []);

  // ============================================
  // ITEM ACTION HANDLERS
  // ============================================

  const handleViewDetails = useCallback((item) => {
    setSelectedItem(item);
    setIsEditMode(false);
    openModal('details');
  }, [openModal]);

  const handleEdit = useCallback((item) => {
    setSelectedItem(item);
    setIsEditMode(true);
    openModal('add');
  }, [openModal]);

  const handleDeleteRequest = useCallback((item) => {
    if (!userContext.canDelete) {
      toast.error('You do not have permission to delete items');
      return;
    }
    setItemToDelete(item);
    openModal('confirmDelete');
  }, [userContext.canDelete, openModal]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!itemToDelete || !userContext.canDelete) return;

    if (!isMounted.current) return;

    setActionLoading(prev => ({ ...prev, delete: true }));
    try {
      await deleteInventoryItem(itemToDelete.id);

      if (!isMounted.current) return;

      toast.success(`"${itemToDelete.name}" deleted successfully`);
      closeModal('confirmDelete');

      // Update cache instead of refetching
      removeItemFromCache(itemToDelete.id);
      refetchSummary(); // Summary needs refresh
    } catch (error) {
      if (!isMounted.current) return;

      console.error('Delete error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to delete item';
      toast.error(errorMsg);
    } finally {
      if (isMounted.current) {
        setActionLoading(prev => ({ ...prev, delete: false }));
      }
    }
  }, [itemToDelete, userContext.canDelete, closeModal, removeItemFromCache, refetchSummary]);

  const handleAddSuccess = useCallback((result) => {
    closeModal('add');

    if (result?.item && !result.isBulk) {
      // Single create/edit - the API already returned the full item, so
      // merge it into the cache instantly instead of a full refetch.
      if (result.isEditMode) {
        updateItemInCache(result.item);
      } else {
        addItemToCache(result.item);
      }
    } else {
      // Bulk create - no single item to merge, fall back to a full refetch.
      refetchItems();
    }

    // Summary/categories are server-aggregated and can't be safely derived
    // client-side, so these always go through a background refetch.
    refetchSummary();
    refetchCategories();
  }, [closeModal, addItemToCache, updateItemInCache, refetchItems, refetchSummary, refetchCategories]);

  // ============================================
  // TRANSFER HANDLERS
  // ============================================

  const handleOpenTransfer = useCallback(() => {
    if (selectedItemIds.length === 0) {
      toast.warning('Please select items to transfer');
      return;
    }
    openModal('transfer');
  }, [selectedItemIds.length, openModal]);

  const handleTransferSuccess = useCallback(() => {
    closeModal('transfer');
    clearSelection();
    refetchItems();
    refetchSummary();
    toast.success('Transfer completed successfully');
  }, [closeModal, clearSelection, refetchItems, refetchSummary]);

  // ============================================
  // REASSIGN HANDLERS
  // ============================================

  const handleOpenReassign = useCallback(() => {
    if (selectedItemIds.length === 0) {
      toast.warning('Please select items to reassign');
      return;
    }
    openModal('reassign');
  }, [selectedItemIds.length, openModal]);

  const handleReassignSuccess = useCallback(() => {
    closeModal('reassign');
    clearSelection();
    refetchItems();
    refetchSummary();
  }, [closeModal, clearSelection, refetchItems, refetchSummary]);

  // ============================================
  // CERTIFICATE HANDLER
  // ============================================

  const handlePrintCertificate = useCallback(async (itemId) => {
    if (!isMounted.current) return;

    setActionLoading(prev => ({
      ...prev,
      certificate: { ...prev.certificate, [itemId]: true },
    }));

    try {
      const blob = await generateItemDetailReport(itemId);

      if (!isMounted.current) return;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Item_Certificate_${itemId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Certificate downloaded');
    } catch (error) {
      if (!isMounted.current) return;

      console.error('Certificate error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to generate certificate';
      toast.error(errorMsg);
    } finally {
      if (isMounted.current) {
        setActionLoading(prev => ({
          ...prev,
          certificate: { ...prev.certificate, [itemId]: false },
        }));
      }
    }
  }, []);

  // ============================================
  // EXPORT HANDLER
  // ============================================

  const handleExport = useCallback(async () => {
    if (!isMounted.current) return;

    setActionLoading(prev => ({ ...prev, export: true }));
    try {
      await exportInventory({
        locationId: filters.schoolId,
        categoryId: filters.categoryId,
        status: filters.status,
      });

      if (!isMounted.current) return;

      toast.success('Export completed');
    } catch (error) {
      if (!isMounted.current) return;

      console.error('Export error:', error);
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || 'Failed to export';
      toast.error(errorMsg);
    } finally {
      if (isMounted.current) {
        setActionLoading(prev => ({ ...prev, export: false }));
      }
    }
  }, [filters]);

  // ============================================
  // CATEGORY HANDLERS
  // ============================================

  const handleOpenCategories = useCallback(() => {
    if (!userContext.canManageCategories) {
      toast.error('You do not have permission to manage categories');
      return;
    }
    openModal('category');
  }, [userContext.canManageCategories, openModal]);

  const handleCategoryUpdate = useCallback(() => {
    refetchCategories();
    refetchItems();
  }, [refetchCategories, refetchItems]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const totalValue = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + Number(item.purchase_value || 0), 0);
  }, [filteredItems]);

  // Stats/charts below are derived from filteredItems (not the global `summary`
  // aggregate) so they react to the applied filters instead of always showing totals.

  const statusCounts = useMemo(() => {
    const counts = {};
    filteredItems.forEach(item => {
      if (item.status) {
        counts[item.status] = (counts[item.status] || 0) + 1;
      }
    });
    return counts;
  }, [filteredItems]);

  const getStatusCount = useCallback((statusName) => {
    return statusCounts[statusName] || 0;
  }, [statusCounts]);

  const categoryChartData = useMemo(() => {
    const counts = {};
    filteredItems.forEach(item => {
      const name = item.category_name;
      if (name) {
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredItems]);

  const statusChartData = useMemo(() => {
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [statusCounts]);

  // ============================================
  // COMBINED LOADING STATE
  // ============================================

  const loading = useMemo(() => ({
    items: contextLoading.items,
    summary: contextLoading.summary,
    initial: contextLoading.initial,
    delete: actionLoading.delete,
    export: actionLoading.export,
    certificate: actionLoading.certificate,
  }), [contextLoading, actionLoading]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // User Context (RBAC)
    userContext,

    // Data (from context, filtered client-side)
    inventoryItems: filteredItems,
    summary,
    categories,
    schools,
    users,

    // Filters
    filters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    locationOptions,

    // Selection
    selectedItemIds,
    selectedItems,
    toggleItemSelection,
    toggleSelectAll,
    clearSelection,

    // Modals
    modals,
    openModal,
    closeModal,
    selectedItem,
    isEditMode,
    itemToDelete,

    // Loading
    loading,

    // Handlers
    handleViewDetails,
    handleEdit,
    handleDeleteRequest,
    handleDeleteConfirm,
    handleAddSuccess,
    handleOpenTransfer,
    handleTransferSuccess,
    handleOpenReassign,
    handleReassignSuccess,
    handlePrintCertificate,
    handleExport,
    handleOpenCategories,
    handleCategoryUpdate,

    // Computed
    totalValue,
    getStatusCount,
    categoryChartData,
    statusChartData,

    // Refresh functions (now use context)
    refreshItems: refetchItems,
    refreshSummary: refetchSummary,
    refreshAll: refetchAll,
  };
};

export default useInventory;
