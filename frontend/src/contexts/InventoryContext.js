// ============================================
// INVENTORY CONTEXT - Global State with Caching
// ============================================
// Location: src/contexts/InventoryContext.js
//
// PURPOSE: Cache inventory data globally to eliminate redundant API calls
// BENEFIT: Instant page loads when navigating to/from inventory dashboard

import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { getCachedData, setCachedData, clearCache } from '../utils/cacheUtils';
import {
  fetchInventoryItems,
  fetchInventorySummary,
  fetchCategories,
  fetchAvailableUsers,
  fetchAllowedSchools,
  fetchUserInventoryContext,
} from '../services/inventoryService';

// Create Context
const InventoryContext = createContext();

// Cache keys
const CACHE_KEYS = {
  items: 'inventory_items',
  summary: 'inventory_summary',
  categories: 'inventory_categories',
  schools: 'inventory_schools',
  users: 'inventory_users',
  userContext: 'inventory_user_context',
};

/**
 * InventoryProvider Component
 * Wraps the app and provides inventory data to all children
 * WITH CLIENT-SIDE CACHING!
 */
export const InventoryProvider = ({ children }) => {
  // ============================================
  // STATE
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

  const [loading, setLoading] = useState({
    items: false,
    summary: false,
    categories: false,
    schools: false,
    users: false,
    userContext: false,
    initial: true,
  });

  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ============================================
  // FETCH FUNCTIONS WITH CACHING
  // ============================================

  const loadUserContext = useCallback(async (forceRefresh = false) => {
    const token = localStorage.getItem('access');
    if (!token) {
      console.log('⏸️ InventoryContext: No auth token, skipping fetch');
      return null;
    }

    // Try cache first
    if (!forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.userContext);
      if (cached) {
        console.log('⚡ InventoryContext: Using cached user context');
        if (isMounted.current) {
          setUserContext({
            isAdmin: cached.is_admin,
            allowedSchools: cached.allowed_schools || [],
            allowedSchoolDetails: cached.allowed_school_details || [],
            canDelete: cached.can_delete,
            canManageCategories: cached.can_manage_categories,
            canAccessHeadquarters: cached.can_access_headquarters,
            canAccessUnassigned: cached.can_access_unassigned,
            userName: cached.name,
            userId: cached.user_id,
            loading: false,
          });
        }
        return cached;
      }
    }

    // Fetch from API
    try {
      console.log('🌐 InventoryContext: Fetching user context from API...');
      const context = await fetchUserInventoryContext();

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

      // Cache for next time
      setCachedData(CACHE_KEYS.userContext, context);
      return context;
    } catch (error) {
      if (!isMounted.current) return null;
      console.error('❌ InventoryContext: Error loading user context:', error);
      setError(error.message || 'Failed to load user context');
      setUserContext(prev => ({ ...prev, loading: false }));
      return null;
    }
  }, []);

  const loadItems = useCallback(async (forceRefresh = false) => {
    const token = localStorage.getItem('access');
    if (!token) return;

    // Try cache first
    if (!forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.items);
      if (cached) {
        console.log('⚡ InventoryContext: Using cached items:', cached.length);
        if (isMounted.current) {
          setInventoryItems(cached);
          setLoading(prev => ({ ...prev, items: false }));
        }
        return cached;
      }
    }

    // Fetch from API
    if (isMounted.current) {
      setLoading(prev => ({ ...prev, items: true }));
    }

    try {
      console.log('🌐 InventoryContext: Fetching items from API...');
      const data = await fetchInventoryItems({});

      if (!isMounted.current) return;

      const items = Array.isArray(data) ? data : [];
      console.log('✅ InventoryContext: Items loaded:', items.length);
      setInventoryItems(items);
      setCachedData(CACHE_KEYS.items, items);
      return items;
    } catch (error) {
      if (!isMounted.current) return;
      console.error('❌ InventoryContext: Error loading items:', error);
      setError(error.message || 'Failed to load inventory items');
      toast.error('Failed to load inventory items');
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, items: false }));
      }
    }
  }, []);

  const loadSummary = useCallback(async (forceRefresh = false) => {
    const token = localStorage.getItem('access');
    if (!token) return;

    // Try cache first
    if (!forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.summary);
      if (cached) {
        console.log('⚡ InventoryContext: Using cached summary');
        if (isMounted.current) {
          setSummary(cached);
          setLoading(prev => ({ ...prev, summary: false }));
        }
        return cached;
      }
    }

    // Fetch from API
    if (isMounted.current) {
      setLoading(prev => ({ ...prev, summary: true }));
    }

    try {
      console.log('🌐 InventoryContext: Fetching summary from API...');
      const data = await fetchInventorySummary();

      if (!isMounted.current) return;

      console.log('✅ InventoryContext: Summary loaded');
      setSummary(data);
      setCachedData(CACHE_KEYS.summary, data);
      return data;
    } catch (error) {
      if (!isMounted.current) return;
      console.error('❌ InventoryContext: Error loading summary:', error);
      setError(error.message || 'Failed to load inventory summary');
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, summary: false }));
      }
    }
  }, []);

  const loadCategories = useCallback(async (forceRefresh = false) => {
    const token = localStorage.getItem('access');
    if (!token) return;

    // Try cache first
    if (!forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.categories);
      if (cached) {
        console.log('⚡ InventoryContext: Using cached categories');
        if (isMounted.current) {
          setCategories(cached);
        }
        return cached;
      }
    }

    // Fetch from API
    try {
      console.log('🌐 InventoryContext: Fetching categories from API...');
      const data = await fetchCategories();

      if (!isMounted.current) return;

      console.log('✅ InventoryContext: Categories loaded:', data.length);
      setCategories(data);
      setCachedData(CACHE_KEYS.categories, data);
      return data;
    } catch (error) {
      if (!isMounted.current) return;
      console.error('❌ InventoryContext: Error loading categories:', error);
      setError(error.message || 'Failed to load categories');
    }
  }, []);

  const loadSchools = useCallback(async (forceRefresh = false) => {
    const token = localStorage.getItem('access');
    if (!token) return;

    // Try cache first
    if (!forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.schools);
      if (cached) {
        console.log('⚡ InventoryContext: Using cached schools');
        if (isMounted.current) {
          setSchools(cached);
        }
        return cached;
      }
    }

    // Fetch from API
    try {
      console.log('🌐 InventoryContext: Fetching schools from API...');
      const data = await fetchAllowedSchools();

      if (!isMounted.current) return;

      console.log('✅ InventoryContext: Schools loaded:', data.length);
      setSchools(data);
      setCachedData(CACHE_KEYS.schools, data);
      return data;
    } catch (error) {
      if (!isMounted.current) return;
      console.error('❌ InventoryContext: Error loading schools:', error);
      setError(error.message || 'Failed to load schools');
    }
  }, []);

  const loadUsers = useCallback(async (forceRefresh = false) => {
    const token = localStorage.getItem('access');
    if (!token) return;

    // Try cache first
    if (!forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.users);
      if (cached) {
        console.log('⚡ InventoryContext: Using cached users');
        if (isMounted.current) {
          setUsers(cached);
        }
        return cached;
      }
    }

    // Fetch from API
    try {
      console.log('🌐 InventoryContext: Fetching users from API...');
      const data = await fetchAvailableUsers();

      if (!isMounted.current) return;

      console.log('✅ InventoryContext: Users loaded:', data.length);
      setUsers(data);
      setCachedData(CACHE_KEYS.users, data);
      return data;
    } catch (error) {
      if (!isMounted.current) return;
      console.error('❌ InventoryContext: Error loading users:', error);
      setError(error.message || 'Failed to load users');
    }
  }, []);

  // ============================================
  // INITIAL LOAD
  // ============================================

  useEffect(() => {
    const initializeData = async () => {
      const token = localStorage.getItem('access');
      if (!token) {
        console.log('⏸️ InventoryContext: No auth token, skipping initialization');
        if (isMounted.current) {
          setLoading(prev => ({ ...prev, initial: false }));
          setIsInitialized(true);
        }
        return;
      }

      // Check user role - Students don't need inventory data
      const userRole = localStorage.getItem('role');
      if (userRole === 'Student') {
        console.log('⏸️ InventoryContext: Student role detected, skipping inventory data fetch');
        if (isMounted.current) {
          setLoading(prev => ({ ...prev, initial: false }));
          setIsInitialized(true);
        }
        return;
      }

      console.log('🏭 InventoryContext: Initializing for role:', userRole);

      // Load user context first
      await loadUserContext();

      if (!isMounted.current) return;

      // Load all data in parallel
      await Promise.all([
        loadItems(),
        loadSummary(),
        loadCategories(),
        loadSchools(),
        loadUsers(),
      ]);

      if (isMounted.current) {
        setLoading(prev => ({ ...prev, initial: false }));
        setIsInitialized(true);
        console.log('✅ InventoryContext: Initialization complete');
      }
    };

    initializeData();

    // Listen for logout
    const handleStorageChange = () => {
      const token = localStorage.getItem('access');
      if (!token && isMounted.current) {
        console.log('🚪 InventoryContext: User logged out, clearing data');
        setInventoryItems([]);
        setSummary({ total: 0, total_value: 0, by_status: [], by_category: [], by_location: [] });
        setCategories([]);
        setSchools([]);
        setUsers([]);
        setIsInitialized(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================
  // REFETCH FUNCTIONS (Bypass Cache)
  // ============================================

  const refetchItems = useCallback(async () => {
    console.log('🔄 InventoryContext: Force refetching items...');
    clearCache(CACHE_KEYS.items);
    return loadItems(true);
  }, [loadItems]);

  const refetchSummary = useCallback(async () => {
    console.log('🔄 InventoryContext: Force refetching summary...');
    clearCache(CACHE_KEYS.summary);
    return loadSummary(true);
  }, [loadSummary]);

  const refetchCategories = useCallback(async () => {
    console.log('🔄 InventoryContext: Force refetching categories...');
    clearCache(CACHE_KEYS.categories);
    return loadCategories(true);
  }, [loadCategories]);

  const refetchAll = useCallback(async () => {
    console.log('🔄 InventoryContext: Force refetching all data...');
    // Clear all inventory caches
    Object.values(CACHE_KEYS).forEach(key => clearCache(key));

    await Promise.all([
      loadUserContext(true),
      loadItems(true),
      loadSummary(true),
      loadCategories(true),
      loadSchools(true),
      loadUsers(true),
    ]);
  }, [loadUserContext, loadItems, loadSummary, loadCategories, loadSchools, loadUsers]);

  // ============================================
  // UPDATE FUNCTIONS (Update cache after mutations)
  // ============================================

  const updateItemsCache = useCallback((newItems) => {
    setInventoryItems(newItems);
    setCachedData(CACHE_KEYS.items, newItems);
  }, []);

  const addItemToCache = useCallback((newItem) => {
    setInventoryItems(prev => {
      const updated = [newItem, ...prev];
      setCachedData(CACHE_KEYS.items, updated);
      return updated;
    });
  }, []);

  const updateItemInCache = useCallback((updatedItem) => {
    setInventoryItems(prev => {
      const updated = prev.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      );
      setCachedData(CACHE_KEYS.items, updated);
      return updated;
    });
  }, []);

  const removeItemFromCache = useCallback((itemId) => {
    setInventoryItems(prev => {
      const updated = prev.filter(item => item.id !== itemId);
      setCachedData(CACHE_KEYS.items, updated);
      return updated;
    });
  }, []);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value = {
    // Data
    inventoryItems,
    summary,
    categories,
    schools,
    users,
    userContext,

    // State
    loading,
    error,
    isInitialized,

    // Refetch functions
    refetchItems,
    refetchSummary,
    refetchCategories,
    refetchAll,

    // Cache update functions
    updateItemsCache,
    addItemToCache,
    updateItemInCache,
    removeItemFromCache,

    // Direct setters (for useInventory hook)
    setInventoryItems,
    setSummary,
    setCategories,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};

export default InventoryContext;
