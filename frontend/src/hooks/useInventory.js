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

    console.log('🔍 Client-side filtering inventory...');
    console.log('   Total cached items:', items.length);
    console.log('   Filters:', filters);

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

      // Category filter
      if (filters.categoryId && filters.categoryId !== '') {
        const categoryId = Number(filters.categoryId);
        if (item.category_id !== categoryId && item.category?.id !== categoryId) {
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

  const handleAddSuccess = useCallback(() => {
    closeModal('add');
    // Refetch to get the new item with full data
    refetchItems();
    refetchSummary();
    refetchCategories();
  }, [closeModal, refetchItems, refetchSummary, refetchCategories]);

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
      toast.error(error.message || 'Failed to export');
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

  const getStatusCount = useCallback((statusName) => {
    const found = summary.by_status?.find(s => s.status === statusName);
    return found?.count || 0;
  }, [summary.by_status]);

  const categoryChartData = useMemo(() => {
    return (summary.by_category || [])
      .filter(c => c.category__name)
      .map(c => ({
        name: c.category__name,
        value: c.count,
      }));
  }, [summary.by_category]);

  const statusChartData = useMemo(() => {
    return (summary.by_status || []).map(s => ({
      name: s.status,
      value: s.count,
    }));
  }, [summary.by_status]);

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
