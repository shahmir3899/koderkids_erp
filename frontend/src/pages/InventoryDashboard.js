// ============================================
// INVENTORY DASHBOARD - With RBAC Support
// ============================================
// Location: src/pages/InventoryDashboard.js
//
// Main orchestrator component for inventory management.
// Uses useInventory hook for all state and RBAC context.
// Passes userContext to child components for role-based UI.
//
// Layout Order:
// 1. Header
// 2. Stats Cards
// 3. Analytics/Charts
// 4. Filters
// 5. Table

import React from 'react';

// Hooks
import { useInventory } from '../hooks/useInventory';

// Common Components
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { ConfirmationModal } from '../components/common/modals/ConfirmationModal';

// Inventory Components
import { InventoryHeader } from '../components/inventory/InventoryHeader';
import { InventoryStats } from '../components/inventory/InventoryStats';
import { InventoryFilters } from '../components/inventory/InventoryFilters';
import { InventoryCharts } from '../components/inventory/InventoryCharts';
import { InventoryTable } from '../components/inventory/InventoryTable';

// Modals
import AddInventoryModal from '../components/inventory/AddInventoryModal';
import InventoryDetailsModal from '../components/inventory/InventoryDetailsModal';
import CategoryManagementModal from '../components/inventory/CategoryManagementModal';
import TransferModal from '../components/inventory/TransferModal';
import InventoryReportModal from '../components/inventory/InventoryReportModal';

// ============================================
// COMPONENT
// ============================================

const InventoryDashboard = () => {
  const {
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
    getStatusCount,
    categoryChartData,
    statusChartData,
  } = useInventory();

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={{ 
      maxWidth: '1600px', 
      margin: '0 auto', 
      padding: '1.5rem',
      backgroundColor: '#F9FAFB',
      minHeight: '100vh',
    }}>
      {/* 1. Header with Action Buttons */}
      <InventoryHeader
        userContext={userContext}
        onAddItem={() => openModal('add')}
        onOpenCategories={handleOpenCategories}
        onExport={handleExport}
        isExporting={loading.export}
      />

      {/* 2. Stats Cards - Pass individual props from summary */}
      <InventoryStats
        totalItems={summary.total || 0}
        totalValue={summary.total_value || 0}
        availableCount={getStatusCount('Available')}
        assignedCount={getStatusCount('Assigned')}
        loading={loading.summary}
      />

      {/* 3. Analytics/Charts - MOVED ABOVE FILTERS */}
      <InventoryCharts
        categoryChartData={categoryChartData}
        statusChartData={statusChartData}
      />

      {/* 4. Filters - NOW BELOW ANALYTICS */}
      <InventoryFilters
        userContext={userContext}
        filters={filters}
        updateFilter={updateFilter}
        resetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
        locationOptions={locationOptions}
        schools={schools}
        categories={categories}
      />

      {/* 5. Table */}
      <InventoryTable
        userContext={userContext}
        items={inventoryItems}
        loading={loading.items}
        selectedItemIds={selectedItemIds}
        toggleItemSelection={toggleItemSelection}
        toggleSelectAll={toggleSelectAll}
        clearSelection={clearSelection}
        onViewDetails={handleViewDetails}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
        onPrintCertificate={handlePrintCertificate}
        onOpenTransfer={handleOpenTransfer}
        onOpenReport={() => openModal('report')}
        certificateLoading={loading.certificate}
      />

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}

      {/* Add/Edit Item Modal */}
      {modals.add && (
        <AddInventoryModal
          isOpen={modals.add}
          onClose={() => closeModal('add')}
          onSuccess={handleAddSuccess}
          editItem={isEditMode ? selectedItem : null}
          categories={categories}
          schools={schools}
          users={users}
          userContext={userContext}
        />
      )}

      {/* Item Details Modal */}
      {modals.details && selectedItem && (
        <InventoryDetailsModal
          isOpen={modals.details}
          onClose={() => closeModal('details')}
          item={selectedItem}
          onEdit={() => {
            closeModal('details');
            handleEdit(selectedItem);
          }}
          onDelete={() => {
            closeModal('details');
            handleDeleteRequest(selectedItem);
          }}
          userContext={userContext}
        />
      )}

      {/* Category Management Modal - Admin Only */}
      {modals.category && userContext.canManageCategories && (
        <CategoryManagementModal
          isOpen={modals.category}
          onClose={() => closeModal('category')}
          categories={categories}  // ADD THIS LINE

          onUpdate={handleCategoryUpdate}
        />
      )}

      {/* Transfer Modal */}
      {modals.transfer && (
        <TransferModal
          isOpen={modals.transfer}
          onClose={() => closeModal('transfer')}
          onSuccess={handleTransferSuccess}
          selectedItems={selectedItems}
          schools={schools}
          userContext={userContext}
        />
      )}

      {/* Report Modal */}
      {modals.report && (
        <InventoryReportModal
          isOpen={modals.report}
          onClose={() => closeModal('report')}
          schools={schools}
          categories={categories}
          users={users}
          userContext={userContext}
        />
      )}

      {/* Delete Confirmation Modal - Admin Only */}
      {modals.confirmDelete && userContext.canDelete && (
        <ConfirmationModal
          isOpen={modals.confirmDelete}
          onClose={() => closeModal('confirmDelete')}
          onConfirm={handleDeleteConfirm}
          title="Delete Item"
          message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          confirmVariant="danger"
          isLoading={loading.delete}
        />
      )}
    </div>
  );
};

export default InventoryDashboard;