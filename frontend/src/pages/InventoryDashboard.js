// ============================================
// INVENTORY DASHBOARD - FIXED VERSION
// ============================================
// Location: src/pages/InventoryDashboard.js
// 
// FIXES APPLIED:
// 1. STATUS_OPTIONS now matches backend model choices
// 2. Stats cards use correct status values ('Assigned' not 'In Use')
// 3. Total value uses summary.total_value from backend

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

import {
  fetchInventoryItems,
  fetchInventorySummary,
  fetchCategories,
  fetchLocations,
  fetchAvailableUsers,
  deleteInventoryItem,
  exportInventory,
} from '../services/inventoryService';

import { CollapsibleSection } from '../components/common/cards/CollapsibleSection';
import { DataTable } from '../components/common/tables/DataTable';
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { Button } from '../components/common/ui/Button';

import { AddInventoryModal } from '../components/inventory/AddInventoryModal';
import { InventoryDetailsModal } from '../components/inventory/InventoryDetailsModal';
import { CategoryManagementModal } from '../components/inventory/CategoryManagementModal';

// ============================================
// FIXED: STATUS_OPTIONS matches backend model
// ============================================
const STATUS_OPTIONS = [
  { value: 'Available', label: 'Available', color: '#10B981' },
  { value: 'Assigned', label: 'Assigned', color: '#3B82F6' },   // Was 'In Use'
  { value: 'Damaged', label: 'Damaged', color: '#F59E0B' },     // Was 'Maintenance'
  { value: 'Lost', label: 'Lost', color: '#EF4444' },
  { value: 'Disposed', label: 'Disposed', color: '#6B7280' },   // Was 'Retired'
];

const CHART_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const StatCard = ({ title, value, subtitle, icon, color = '#3B82F6' }) => (
  <div style={{
    backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #E5E7EB',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: '500' }}>{title}</span>
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
    </div>
    <div style={{ fontSize: '2rem', fontWeight: '700', color }}>{value}</div>
    {subtitle && <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{subtitle}</div>}
  </div>
);

const QuickActionButton = ({ icon, label, onClick, color = '#3B82F6' }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
      padding: '1rem', backgroundColor: 'white', border: '1px solid #E5E7EB',
      borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', minWidth: '100px',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = color;
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '#E5E7EB';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <span style={{ fontSize: '1.5rem' }}>{icon}</span>
    <span style={{ fontSize: '0.75rem', color: '#374151', fontWeight: '500' }}>{label}</span>
  </button>
);

const InventoryDashboard = () => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);

  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedItem, setSelectedItem] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [loading, setLoading] = useState({
    initial: true, items: false, summary: false, delete: false, export: false,
  });

  // Load initial data
  useEffect(() => {
    const load = async () => {
      setLoading(prev => ({ ...prev, initial: true }));
      try {
        const [locs, cats, usrs] = await Promise.all([
          fetchLocations(),
          fetchCategories(),
          fetchAvailableUsers(),
        ]);
        setLocations(locs || []);
        setCategories(cats || []);
        setUsers(usrs || []);
        // Don't auto-select location - let it load all items first
      } catch (err) {
        console.error('Initial load error:', err);
        toast.error('Failed to load initial data');
      } finally {
        setLoading(prev => ({ ...prev, initial: false }));
      }
    };
    load();
  }, []);

  // FIXED: fetchItems - now fetches all items when no location selected
  const fetchItems = useCallback(async () => {
    setLoading(prev => ({ ...prev, items: true }));
    try {
      const items = await fetchInventoryItems({
        locationId: selectedLocation || undefined,
        categoryId: selectedCategory || undefined,
        status: selectedStatus || undefined,
        search: searchQuery || undefined,
      });
      console.log('📦 Fetched items:', items);
      setInventoryItems(items || []);
    } catch (err) {
      console.error('❌ Fetch items error:', err);
      toast.error('Failed to load items');
      setInventoryItems([]);
    } finally {
      setLoading(prev => ({ ...prev, items: false }));
    }
  }, [selectedLocation, selectedCategory, selectedStatus, searchQuery]);

  // FIXED: fetchSummaryData - works without location filter too
  const fetchSummaryData = useCallback(async () => {
    setLoading(prev => ({ ...prev, summary: true }));
    try {
      const data = await fetchInventorySummary(selectedLocation || undefined);
      console.log('📊 Fetched summary:', data);
      setSummary(data);
    } catch (err) {
      console.error('❌ Fetch summary error:', err);
      toast.error('Failed to load summary');
    } finally {
      setLoading(prev => ({ ...prev, summary: false }));
    }
  }, [selectedLocation]);

  // FIXED: Load items and summary on mount AND when filters change
  useEffect(() => {
    fetchItems();
    fetchSummaryData();
  }, [fetchItems, fetchSummaryData]);

  const handleSearch = () => fetchItems();

  const handleViewDetails = (item) => { setSelectedItem(item); setIsDetailsModalOpen(true); };
  const handleEdit = (item) => { setEditingItem(item); setIsAddModalOpen(true); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    setLoading(prev => ({ ...prev, delete: true }));
    try {
      await deleteInventoryItem(id);
      toast.success('Deleted');
      fetchItems();
      fetchSummaryData();
      setIsDetailsModalOpen(false);
    } catch (err) {
      toast.error('Delete failed');
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
    }
  };

  const handleExport = async (format = 'csv') => {
    setLoading(prev => ({ ...prev, export: true }));
    try {
      await exportInventory({ locationId: selectedLocation, categoryId: selectedCategory, status: selectedStatus }, format);
      toast.success('Exported!');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setLoading(prev => ({ ...prev, export: false }));
    }
  };

  const handleAddSuccess = () => {
    setIsAddModalOpen(false);
    setEditingItem(null);
    fetchItems();
    fetchSummaryData();
    toast.success(editingItem ? 'Updated' : 'Added');
  };

  const handleCategoryUpdate = () => {
    fetchCategories().then(setCategories);
    fetchItems();
  };

  // CHARTS DATA
  const categoryChartData = useMemo(() => {
    if (!summary?.by_category) return [];
    return (summary.by_category || []).map(cat => ({
      name: cat.category__name || 'Uncategorized',
      value: cat.count,
    }));
  }, [summary]);

  const statusChartData = useMemo(() => {
    if (!summary?.by_status) return [];
    return (summary.by_status || []).map(stat => ({
      name: stat.status,
      count: stat.count,
      fill: STATUS_OPTIONS.find(s => s.value === stat.status)?.color || '#6B7280',
    }));
  }, [summary]);

  // FIXED: Use summary.total_value from backend, fallback to calculated
  const totalValue = useMemo(() => {
    // Prefer backend-calculated total
    if (summary?.total_value) {
      return Number(summary.total_value);
    }
    // Fallback to frontend calculation
    return inventoryItems.reduce((sum, i) => sum + (Number(i.purchase_value) || 0), 0);
  }, [summary, inventoryItems]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return inventoryItems;
    const q = searchQuery.toLowerCase();
    return inventoryItems.filter(i =>
      i.name?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q) ||
      i.category_name?.toLowerCase().includes(q)
    );
  }, [inventoryItems, searchQuery]);

  // FIXED: Helper to get status count safely
  const getStatusCount = (statusValue) => {
    if (!summary?.by_status) return 0;
    const found = summary.by_status.find(s => s.status === statusValue);
    return found?.count || 0;
  };

  if (loading.initial) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner size="large" message="Loading inventory..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1F2937', margin: 0 }}>
            📦 Inventory Management
          </h1>
          <p style={{ color: '#6B7280', margin: '0.5rem 0 0 0' }}>
            Track and manage your assets across all locations
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            variant="primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            ➕ Add Item
          </Button>
          <Button
            onClick={() => setIsCategoryModalOpen(true)}
            variant="secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            🏷️ Categories
          </Button>
          <Button
            onClick={() => handleExport('csv')}
            variant="outline"
            disabled={loading.export}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {loading.export ? '⏳ Exporting...' : '📥 Export CSV'}
          </Button>
        </div>
      </div>

      {/* ============================================ */}
      {/* LOCATION SELECTOR */}
      {/* ============================================ */}
      <div style={{
        backgroundColor: 'white',
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <label style={{ fontWeight: '600', color: '#374151' }}>📍 Location:</label>
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          style={{
            padding: '0.75rem 1rem',
            border: '1px solid #D1D5DB',
            borderRadius: '8px',
            fontSize: '1rem',
            minWidth: '250px',
            cursor: 'pointer',
          }}
        >
          <option value="">All Locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            Last updated: {new Date().toLocaleString()}
          </span>
          <button
            onClick={() => { fetchItems(); fetchSummaryData(); }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: '0.5rem',
            }}
            title="Refresh data"
          >
            🔄
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* STATS CARDS - FIXED STATUS VALUES */}
      {/* ============================================ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <StatCard
          title="Total Items"
          value={summary?.total || filteredItems.length}
          subtitle={`Across ${categories.length} categories`}
          icon="📦"
          color="#3B82F6"
        />
        <StatCard
          title="Total Value"
          value={`PKR ${totalValue.toLocaleString()}`}
          subtitle="Combined asset value"
          icon="💰"
          color="#10B981"
        />
        <StatCard
          title="Available"
          value={getStatusCount('Available')}
          subtitle="Ready for use"
          icon="✅"
          color="#10B981"
        />
        {/* FIXED: Changed from 'In Use' to 'Assigned' */}
        <StatCard
          title="Assigned"
          value={getStatusCount('Assigned')}
          subtitle="Currently assigned"
          icon="👤"
          color="#3B82F6"
        />
        {/* FIXED: Changed from 'Maintenance' to 'Damaged' */}
        <StatCard
          title="Damaged"
          value={getStatusCount('Damaged')}
          subtitle="Needs repair"
          icon="⚠️"
          color="#F59E0B"
        />
        {/* FIXED: Changed from 'Retired' to 'Disposed' + Lost */}
        <StatCard
          title="Disposed/Lost"
          value={getStatusCount('Disposed') + getStatusCount('Lost')}
          subtitle="Out of service"
          icon="❌"
          color="#EF4444"
        />
      </div>

      {/* ============================================ */}
      {/* QUICK ACTIONS */}
      {/* ============================================ */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        overflowX: 'auto',
        padding: '0.5rem 0',
      }}>
        <QuickActionButton
          icon="➕"
          label="Add Item"
          onClick={() => setIsAddModalOpen(true)}
          color="#10B981"
        />
        <QuickActionButton
          icon="🏷️"
          label="Categories"
          onClick={() => setIsCategoryModalOpen(true)}
          color="#8B5CF6"
        />
        <QuickActionButton
          icon="📥"
          label="Export"
          onClick={() => handleExport('csv')}
          color="#3B82F6"
        />
        <QuickActionButton
          icon="🔍"
          label="Search"
          onClick={() => document.getElementById('inventory-search')?.focus()}
          color="#F59E0B"
        />
      </div>

      {/* ============================================ */}
      {/* CHARTS SECTION */}
      {/* ============================================ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        {/* Category Distribution */}
        <CollapsibleSection title="📊 Items by Category" defaultOpen>
          <div style={{ height: '300px' }}>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine
                  >
                    {categoryChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
                No category data available
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Status Distribution */}
        <CollapsibleSection title="📈 Items by Status" defaultOpen>
          <div style={{ height: '300px' }}>
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
                No status data available
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>

      {/* ============================================ */}
      {/* FILTERS & SEARCH */}
      {/* ============================================ */}
      <CollapsibleSection title="🔍 Filter & Search Inventory" defaultOpen>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}>
          {/* Category Filter */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151', fontSize: '0.875rem' }}>
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter - FIXED OPTIONS */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151', fontSize: '0.875rem' }}>
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151', fontSize: '0.875rem' }}>
              Search
            </label>
            <input
              id="inventory-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, description..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            />
          </div>

          {/* Search Button */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              onClick={handleSearch}
              variant="primary"
              style={{ width: '100%' }}
              disabled={loading.items}
            >
              {loading.items ? '⏳ Searching...' : '🔍 Search'}
            </Button>
          </div>
        </div>

        {/* Clear Filters */}
        {(selectedCategory || selectedStatus || searchQuery) && (
          <button
            onClick={() => {
              setSelectedCategory('');
              setSelectedStatus('');
              setSearchQuery('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
              fontSize: '0.875rem',
              textDecoration: 'underline',
            }}
          >
            Clear all filters
          </button>
        )}
      </CollapsibleSection>

      {/* ============================================ */}
      {/* INVENTORY TABLE */}
      {/* ============================================ */}
      <CollapsibleSection title={`📋 Inventory Items (${filteredItems.length})`} defaultOpen>
        <DataTable
          data={filteredItems}
          loading={loading.items}
          columns={[
            {
              key: 'name',
              label: 'Item Name',
              sortable: true,
              render: (value, item) => (
                <div>
                  <div style={{ fontWeight: '600', color: '#1F2937' }}>{value}</div>
                  {item.unique_id && (
                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: '0.125rem' }}>
                      {item.unique_id}
                    </div>
                  )}
                  {item.description && (
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                      {item.description.length > 50 ? item.description.substring(0, 50) + '...' : item.description}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'category_name',
              label: 'Category',
              sortable: true,
              render: (value) => (
                <span style={{
                  padding: '0.25rem 0.75rem',
                  backgroundColor: '#E0E7FF',
                  color: '#3730A3',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                }}>
                  {value || 'Uncategorized'}
                </span>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              sortable: true,
              align: 'center',
              render: (value) => {
                const statusConfig = STATUS_OPTIONS.find(s => s.value === value);
                return (
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: (statusConfig?.color || '#6B7280') + '20',
                    color: statusConfig?.color || '#6B7280',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                  }}>
                    {value}
                  </span>
                );
              },
            },
            {
              key: 'location',
              label: 'Location',
              sortable: true,
              render: (value, item) => (
                <div>
                  <div style={{ fontWeight: '500' }}>{value}</div>
                  {item.school_name && (
                    <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>{item.school_name}</div>
                  )}
                </div>
              ),
            },
            {
              key: 'purchase_value',
              label: 'Value',
              sortable: true,
              align: 'right',
              render: (value) => `PKR ${Number(value || 0).toLocaleString()}`,
            },
            {
              key: 'purchase_date',
              label: 'Purchase Date',
              sortable: true,
              align: 'center',
              render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A',
            },
            {
              key: 'assigned_to_name',
              label: 'Assigned To',
              sortable: true,
              render: (value) => value || <span style={{ color: '#9CA3AF' }}>Unassigned</span>,
            },
            {
              key: 'actions',
              label: 'Actions',
              align: 'center',
              render: (_, item) => (
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button
                    onClick={() => handleViewDetails(item)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      backgroundColor: '#EFF6FF',
                      color: '#3B82F6',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                    }}
                  >
                    👁️ View
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      backgroundColor: '#FEF3C7',
                      color: '#D97706',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      backgroundColor: '#FEE2E2',
                      color: '#DC2626',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ),
            },
          ]}
          emptyMessage="No inventory items found. Add your first item!"
          onRowClick={handleViewDetails}
        />
      </CollapsibleSection>

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}
      <AddInventoryModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setEditingItem(null); }}
        onSuccess={handleAddSuccess}
        editingItem={editingItem}
        categories={categories}
        locations={locations}
        users={users}
      />

      <InventoryDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => { setIsDetailsModalOpen(false); setSelectedItem(null); }}
        item={selectedItem}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onUpdate={handleCategoryUpdate}
      />
    </div>
  );
};

export default InventoryDashboard;