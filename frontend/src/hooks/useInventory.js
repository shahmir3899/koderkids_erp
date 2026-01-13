// ============================================
// USE INVENTORY HOOK - With RBAC Support
// ============================================
// Location: src/hooks/useInventory.js
//
// Manages all inventory state and operations with role-based access control.
// - Fetches user context on mount
// - Filters data based on role
// - Provides permission flags to components

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import {
  fetchInventoryItems,
  fetchInventorySummary,
  fetchCategories,
  fetchAvailableUsers,
  fetchAllowedSchools,
  deleteInventoryItem,
  exportInventory,
  generateItemDetailReport,
  fetchUserInventoryContext,
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
  // USER CONTEXT STATE (RBAC)
  // ============================================
  const isMounted = useRef(true);
   // Cleanup effect
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [userContext, setUserContext] = useState({
    isAdmin: false,
    allowedSchools: [],
    allowedSchoolDetails: [],
    canDelete: false,
    canManageCategories: false,
    canAccessHeadquarters: false,
    canAccessUnassigned: false,
    userName: '',
    userId: null,
    loading: true,
  });

  // ============================================
  // DATA STATE
  // ============================================
  const [inventoryItems, setInventoryItems] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    total_value: 0,
    by_status: [],
    by_category: [],
    by_location: [],
  });
  const [categories, setCategories] = useState([]);
  const [schools, setSchools] = useState([]);
  const [users, setUsers] = useState([]);

  // ============================================
  // FILTER STATE
  // ============================================
  const [filters, setFilters] = useState({
    location: '',
    schoolId: '',
    categoryId: '',
    status: '',
    search: '',
  });

  // ============================================
  // SELECTION STATE
  // ============================================
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  // ============================================
  // MODAL STATE
  // ============================================
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

  // ============================================
  // LOADING STATE
  // ============================================
  const [loading, setLoading] = useState({
    items: false,
    summary: false,
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
  // FETCH USER CONTEXT (RBAC)
  // ============================================
  const loadUserContext = useCallback(async () => {
  try {
    const context = await fetchUserInventoryContext();
    
    // ✅ CHECK: Don't update state if unmounted
    if (!isMounted.current) return null;
    
    setUserContext({
      isAdmin: context.is_admin,
      allowedSchools: context.allowed_schools || [],
      allowedSchoolDetails: context.allowed_school_details || [],
      canDelete: context.can_delete,
      canManageCategories: context.can_manage_categories,
      canAccessHeadquarters: context.can_access_headquarters,
      canAccessUnassigned: context.can_access_unassigned,
      userName: context.name,
      userId: context.user_id,
      loading: false,
    });
    return context;
  } catch (error) {
    // ✅ CHECK: Don't show errors if unmounted
    if (!isMounted.current) return null;
    
    console.error('Failed to load user context:', error);
    toast.error('Failed to load user permissions');
    setUserContext(prev => ({ ...prev, loading: false }));
    return null;
  }
}, []);

  // ============================================
  // FETCH FUNCTIONS
  // ============================================
  
  const fetchItems = useCallback(async () => {
  if (!isMounted.current) return; // ✅ CHECK
  
  setLoading(prev => ({ ...prev, items: true }));
  try {
    const data = await fetchInventoryItems({
      locationId: filters.schoolId,
      categoryId: filters.categoryId,
      status: filters.status,
      search: filters.search,
      location: filters.location,
    });
    
    if (!isMounted.current) return; // ✅ CHECK
    
    setInventoryItems(data);
  } catch (error) {
    if (!isMounted.current) return; // ✅ CHECK
    
    console.error('Error fetching items:', error);
    toast.error('Failed to load inventory items');
  } finally {
    if (isMounted.current) { // ✅ CHECK
      setLoading(prev => ({ ...prev, items: false }));
    }
  }
}, [filters]);

  const fetchSummaryData = useCallback(async () => {
  if (!isMounted.current) return; // ✅ ADD
  
  setLoading(prev => ({ ...prev, summary: true }));
  try {
    const data = await fetchInventorySummary(filters.schoolId, filters.location);
    
    if (!isMounted.current) return; // ✅ ADD
    
    setSummary(data);
  } catch (error) {
    if (!isMounted.current) return; // ✅ ADD
    
    console.error('Error fetching summary:', error);
  } finally {
    if (isMounted.current) { // ✅ ADD
      setLoading(prev => ({ ...prev, summary: false }));
    }
  }
}, [filters.schoolId, filters.location]);

  const fetchCategoryList = useCallback(async () => {
  try {
    const data = await fetchCategories();
    
    if (!isMounted.current) return; // ✅ ADD
    
    setCategories(data);
  } catch (error) {
    if (!isMounted.current) return; // ✅ ADD
    
    console.error('Error fetching categories:', error);
  }
}, []);

  const fetchSchoolsList = useCallback(async () => {
  try {
    const data = await fetchAllowedSchools();
    
    if (!isMounted.current) return; // ✅ ADD
    
    setSchools(data);
  } catch (error) {
    if (!isMounted.current) return; // ✅ ADD
    
    console.error('Error fetching schools:', error);
  }
}, []);

  const fetchUsersList = useCallback(async () => {
  try {
    const data = await fetchAvailableUsers();
    
    if (!isMounted.current) return; // ✅ ADD
    
    setUsers(data);
  } catch (error) {
    if (!isMounted.current) return; // ✅ ADD
    
    console.error('Error fetching users:', error);
  }
}, []);

  // ============================================
  // INITIAL LOAD
  // ============================================
  
  useEffect(() => {
  const initializeData = async () => {
    if (!isMounted.current) return; // ✅ ADD
    
    setLoading(prev => ({ ...prev, initial: true }));
    
    // Load user context first (needed for role-based filtering)
    const context = await loadUserContext();
    
    if (!isMounted.current) return; // ✅ ADD
    
    // Load supporting data in parallel
    await Promise.all([
      fetchCategoryList(),
      fetchSchoolsList(),
      fetchUsersList(),
    ]);
    
    if (!isMounted.current) return; // ✅ ADD
    
    // Then load items and summary (these depend on role context)
    await Promise.all([
      fetchItems(),
      fetchSummaryData(),
    ]);
    
    if (isMounted.current) { // ✅ ADD
      setLoading(prev => ({ ...prev, initial: false }));
    }
  };
  

    
    initializeData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch items and summary when filters change
useEffect(() => {
  if (isMounted.current) {
    const refreshData = async () => {
      await Promise.all([
        fetchItems(),
        fetchSummaryData(),
      ]);
    };
    refreshData();
  }
}, [filters.schoolId, filters.location, filters.categoryId, filters.status, filters.search]); // eslint-disable-line react-hooks/exhaustive-deps
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
    if (selectedItemIds.length === inventoryItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(inventoryItems.map(item => item.id));
    }
  }, [selectedItemIds.length, inventoryItems]);

  const clearSelection = useCallback(() => {
    setSelectedItemIds([]);
  }, []);

  // Get full item objects for selected IDs
  const selectedItems = useMemo(() => {
    return inventoryItems.filter(item => selectedItemIds.includes(item.id));
  }, [inventoryItems, selectedItemIds]);

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
    // Only admins can delete
    if (!userContext.canDelete) {
      toast.error('You do not have permission to delete items');
      return;
    }
    setItemToDelete(item);
    openModal('confirmDelete');
  }, [userContext.canDelete, openModal]);

  const handleDeleteConfirm = useCallback(async () => {
  if (!itemToDelete || !userContext.canDelete) return;
  
  if (!isMounted.current) return; // ✅ ADD

  setLoading(prev => ({ ...prev, delete: true }));
  try {
    await deleteInventoryItem(itemToDelete.id);
    
    if (!isMounted.current) return; // ✅ ADD
    
    toast.success(`"${itemToDelete.name}" deleted successfully`);
    closeModal('confirmDelete');
    fetchItems();
    fetchSummaryData();
  } catch (error) {
    if (!isMounted.current) return; // ✅ ADD
    
    console.error('Delete error:', error);
    const errorMsg = error.response?.data?.detail || 'Failed to delete item';
    toast.error(errorMsg);
  } finally {
    if (isMounted.current) { // ✅ ADD
      setLoading(prev => ({ ...prev, delete: false }));
    }
  }
}, [itemToDelete, userContext.canDelete, closeModal, fetchItems, fetchSummaryData]);

  const handleAddSuccess = useCallback(() => {
    closeModal('add');
    fetchItems();
    fetchSummaryData();
    fetchCategoryList();
  }, [closeModal, fetchItems, fetchSummaryData, fetchCategoryList]);

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
    fetchItems();
    fetchSummaryData();
    toast.success('Transfer completed successfully');
  }, [closeModal, clearSelection, fetchItems, fetchSummaryData]);

  // ============================================
  // CERTIFICATE HANDLER
  // ============================================

  const handlePrintCertificate = useCallback(async (itemId) => {
  if (!isMounted.current) return; // ✅ ADD
  
  setLoading(prev => ({
    ...prev,
    certificate: { ...prev.certificate, [itemId]: true },
  }));

  try {
    const blob = await generateItemDetailReport(itemId);
    
    if (!isMounted.current) return; // ✅ ADD
    
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
    if (!isMounted.current) return; // ✅ ADD
    
    console.error('Certificate error:', error);
    const errorMsg = error.response?.data?.error || 'Failed to generate certificate';
    toast.error(errorMsg);
  } finally {
    if (isMounted.current) { // ✅ ADD
      setLoading(prev => ({
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
  if (!isMounted.current) return; // ✅ ADD
  
  setLoading(prev => ({ ...prev, export: true }));
  try {
    await exportInventory({
      locationId: filters.schoolId,
      categoryId: filters.categoryId,
      status: filters.status,
    });
    
    if (!isMounted.current) return; // ✅ ADD
    
    toast.success('Export completed');
  } catch (error) {
    if (!isMounted.current) return; // ✅ ADD
    
    console.error('Export error:', error);
    toast.error(error.message || 'Failed to export');
  } finally {
    if (isMounted.current) { // ✅ ADD
      setLoading(prev => ({ ...prev, export: false }));
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
    fetchCategoryList();
    fetchItems();
  }, [fetchCategoryList, fetchItems]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const totalValue = useMemo(() => {
    return inventoryItems.reduce((sum, item) => sum + Number(item.purchase_value || 0), 0);
  }, [inventoryItems]);

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
  // RETURN
  // ============================================

  return {
    // User Context (RBAC)
    userContext,
    
    // Data
    inventoryItems,
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

    // Refresh functions
    refreshItems: fetchItems,
    refreshSummary: fetchSummaryData,
    refreshAll: useCallback(() => {
      fetchItems();
      fetchSummaryData();
      fetchCategoryList();
    }, [fetchItems, fetchSummaryData, fetchCategoryList]),
  };
};

export default useInventory;