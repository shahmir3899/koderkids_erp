// ============================================
// INVENTORY DASHBOARD - Glassmorphism Design Version
// ============================================

import React from 'react';

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  LAYOUT,
  BORDER_RADIUS,
  MIXINS,
} from '../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../hooks/useResponsive';

// Hooks
import { useInventory } from '../hooks/useInventory';

// Common Components
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { ConfirmationModal } from '../components/common/modals/ConfirmationModal';
import { CollapsibleSection } from '../components/common/cards/CollapsibleSection';

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

// AI Agent
import InventoryAgentChat from '../components/inventory/InventoryAgentChat';

// Responsive Styles Generator
const getStyles = (isMobile, isTablet) => ({
  pageContainer: {
    minHeight: '100vh',
    background: COLORS.background.gradient,
    padding: isMobile ? SPACING.md : isTablet ? SPACING.lg : SPACING.xl,
  },
  contentWrapper: {
    maxWidth: LAYOUT.maxWidth.lg,
    margin: '0 auto',
    width: '100%',
  },
  pageTitle: {
    fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
    textAlign: 'center',
  },
});

// ============================================
// COMPONENT
// ============================================

const InventoryDashboard = () => {
  // Responsive hook
  const { isMobile, isTablet } = useResponsive();
  const styles = getStyles(isMobile, isTablet);

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

    // Refetch
    refetchAll,
  } = useInventory();

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={styles.pageContainer}>
      <div style={styles.contentWrapper}>
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

        {/* 3.5. AI Assistant */}
        <CollapsibleSection
          title="🤖 AI Assistant"
          defaultOpen={false}
        >
          <div style={{ padding: SPACING.md }}>
            <InventoryAgentChat
              schools={schools}
              categories={categories}
              users={users}
              currentUserId={userContext.userId}
              onRefresh={refetchAll}
              height="500px"
            />
          </div>
        </CollapsibleSection>

        {/* 4 & 5. Filters + Table in one collapsible section */}
        <CollapsibleSection
          title="📦 Inventory Items"
          defaultOpen={true}
        >
          {/* Filters */}
          <InventoryFilters
            userContext={userContext}
            filters={filters}
            updateFilter={updateFilter}
            resetFilters={resetFilters}
            hasActiveFilters={hasActiveFilters}
            locationOptions={locationOptions}
            schools={schools}
            categories={categories}
            users={users}
            noCollapse={true}
          />

          {/* Table */}
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
            noCollapse={true}
          />
        </CollapsibleSection>

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
            categories={categories}
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
    </div>
  );
};

export default InventoryDashboard;
