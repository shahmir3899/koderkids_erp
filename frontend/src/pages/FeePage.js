/**
 * FeePage - Fee Management Page
 * Path: frontend/src/pages/FeePage.js
 * 
 * Features:
 * - Create monthly fee records for entire school
 * - Create single fee record for individual student (NEW)
 * - Delete fee records (NEW)
 * - Inline editing for paid amount and date received
 * - Bulk update selected records
 * - PDF export with grouped data
 * - Search and filter functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ClipLoader } from 'react-spinners';

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  LAYOUT,
} from '../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../hooks/useResponsive';

// Hooks
import { useFees } from '../hooks/useFees';
import { useFeePDF } from '../hooks/useFeePDF';
import { useSchools } from '../hooks/useSchools';
import { useClasses } from '../hooks/useClasses';

// Components
import CreateRecordsSection from '../components/fees/CreateRecordsSection';
import FeeFilters from '../components/fees/FeeFilters';
import BulkActionsBar from '../components/fees/BulkActionsBar';
import FeeSummaryHeader from '../components/fees/FeeSummaryHeader';
import FeeTable from '../components/fees/FeeTable';
import SingleFeeModal from '../components/fees/SingleFeeModal';
import { PageHeader } from '../components/common/PageHeader';
import { CollapsibleSection } from '../components/common/cards/CollapsibleSection';
import FeeAgentChat from '../components/finance/FeeAgentChat';
import FloatingChatWindow from '../components/common/FloatingChatWindow';

// Responsive Styles Generator
const getResponsiveStyles = (isMobile, isTablet) => ({
  pageContainer: {
    minHeight: '100vh',
    background: COLORS.background.gradient,
    padding: isMobile ? SPACING.md : isTablet ? SPACING.lg : SPACING.xl,
  },
  contentWrapper: {
    maxWidth: LAYOUT.maxWidth.md,
    margin: '0 auto',
    width: '100%',
  },
  pageHeader: {
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
  },
  pageTitle: {
    fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },
  pageSubtitle: {
    color: COLORS.text.whiteMedium,
    marginTop: SPACING.xs,
    fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,
  },
  errorBanner: {
    backgroundColor: COLORS.status.errorLight,
    border: `1px solid ${COLORS.status.error}30`,
    color: COLORS.status.errorDark,
    padding: isMobile ? `${SPACING.sm} ${SPACING.md}` : `${SPACING.md} ${SPACING.lg}`,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  errorCloseButton: {
    color: COLORS.status.error,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: SPACING.xs,
    minWidth: '44px', // Touch-friendly
    minHeight: '44px', // Touch-friendly
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobile ? SPACING.xl : `${SPACING['2xl']} 0`,
  },
});

function FeePage() {
  // Responsive hook
  const { isMobile, isTablet } = useResponsive();
  const responsiveStyles = getResponsiveStyles(isMobile, isTablet);

  // Schools data
  const { schools, loading: schoolsLoading } = useSchools();

  // Classes data - fetched dynamically based on selected school
  const { fetchClassesBySchool } = useClasses();
  const [classes, setClasses] = useState([]);

  // Fee management hook - declare first to access filters
  const {
    fees,
    groupedFees,
    totals,
    students,
    filters,
    updateFilters,
    loading,
    isLoading,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    selectedFeeIds,
    toggleSelectFee,
    selectAllFees,
    isAllSelected,
    sortConfig,
    sortFees,
    fetchFees,
    fetchStudents,
    createMonthlyFees,
    createSingleFee,
    updateFee,
    bulkUpdateFees,
    deleteFeeRecords,
    updateLocalDateReceived,
  } = useFees();

  // Load classes when school changes
  useEffect(() => {
    const loadClasses = async () => {
      if (filters.schoolId) {
        // fetchClassesBySchool already handles caching internally
        const fetchedClasses = await fetchClassesBySchool(filters.schoolId);
        setClasses(fetchedClasses || []);
      } else {
        setClasses([]);
      }
    };
    loadClasses();
    // Note: Only depend on filters.schoolId and fetchClassesBySchool
    // getCachedClasses is not needed here as fetchClassesBySchool handles caching
  }, [filters.schoolId, fetchClassesBySchool]);

  // PDF export hook
  const { exportToPDF } = useFeePDF();

  // UI State
  const [showSingleFeeModal, setShowSingleFeeModal] = useState(false);
  const [editingFeeId, setEditingFeeId] = useState(null);
  const [editedValues, setEditedValues] = useState({
    paidAmount: '',
    dateReceived: null,
  });

  // Get school name for display
  const selectedSchool = schools.find(s => s.id === parseInt(filters.schoolId));
  const schoolName = selectedSchool?.name || 'All Schools';

  // Handle monthly fee creation with conflict handling
  const handleCreateMonthly = useCallback(async () => {
    const result = await createMonthlyFees(false);
    
    if (result.conflict) {
      const confirmOverwrite = window.confirm(
        `${result.warning}\n\nDo you want to overwrite existing records?`
      );
      
      if (confirmOverwrite) {
        await createMonthlyFees(true);
      } else {
        setError('Fee record creation was cancelled.');
      }
    }
  }, [createMonthlyFees, setError]);

  // Open single fee modal and fetch students
  const handleOpenSingleFeeModal = useCallback(async () => {
    if (filters.schoolId) {
      await fetchStudents(filters.schoolId);
      setShowSingleFeeModal(true);
    }
  }, [filters.schoolId, fetchStudents]);

  // Handle single fee creation
  const handleCreateSingleFee = useCallback(async (feeData) => {
    return await createSingleFee(feeData);
  }, [createSingleFee]);

  // Start editing a field
  const handleEditStart = useCallback((fee, field) => {
    setEditingFeeId(`${fee.id}-${field}`);
    if (field === 'paid_amount') {
      setEditedValues(prev => ({ ...prev, paidAmount: fee.paid_amount }));
    } else if (field === 'date_received') {
      setEditedValues(prev => ({ 
        ...prev, 
        dateReceived: fee.date_received ? new Date(fee.date_received) : null 
      }));
    }
  }, []);

  // Save edited value
  const handleEditSave = useCallback(async (feeId, totalFee, field) => {
    if (field === 'paid_amount') {
      const parsedAmount = parseFloat(editedValues.paidAmount);
      if (isNaN(parsedAmount) || parsedAmount < 0 || parsedAmount > totalFee) {
        setError('Invalid amount. Must be between 0 and total fee.');
        return;
      }
      
      const result = await updateFee(feeId, { paidAmount: parsedAmount });
      if (result.success) {
        setEditingFeeId(null);
        setEditedValues({ paidAmount: '', dateReceived: null });
      }
    } else if (field === 'date_received') {
      updateLocalDateReceived(feeId, editedValues.dateReceived);
      setEditingFeeId(null);
      setEditedValues({ paidAmount: '', dateReceived: null });
    }
  }, [editedValues, updateFee, updateLocalDateReceived, setError]);

  // Cancel editing
  const handleEditCancel = useCallback(() => {
    setEditingFeeId(null);
    setEditedValues({ paidAmount: '', dateReceived: null });
    setError(null);
  }, [setError]);

  // Update edited values
  const handleEditValueChange = useCallback((updates) => {
    setEditedValues(prev => ({ ...prev, ...updates }));
  }, []);

  // Handle bulk update
  const handleBulkUpdate = useCallback(async (paidAmount) => {
    await bulkUpdateFees(selectedFeeIds, paidAmount);
  }, [bulkUpdateFees, selectedFeeIds]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    await deleteFeeRecords(selectedFeeIds);
  }, [deleteFeeRecords, selectedFeeIds]);

  // Handle single delete
  const handleDeleteSingle = useCallback(async (feeId) => {
    await deleteFeeRecords([feeId]);
  }, [deleteFeeRecords]);

  // Handle PDF export
  const handleExportPDF = useCallback(() => {
    exportToPDF({
      groupedFees,
      totals,
      schoolName,
      classDisplay: filters.studentClass || 'All Classes',
      monthDisplay: filters.month 
        ? `${filters.month.toLocaleString('default', { month: 'short' })}-${filters.month.getFullYear()}`
        : 'N/A',
      schoolAddress: selectedSchool?.address || 'G-15 Markaz, Islamabad',
    });
  }, [exportToPDF, groupedFees, totals, schoolName, filters, selectedSchool]);

  const pageLoading = schoolsLoading || loading.fees;

  return (
    <div style={responsiveStyles.pageContainer}>
      <div style={responsiveStyles.contentWrapper}>
      {/* Page Header */}
      <PageHeader
        icon="💰"
        title="Fee Management"
        subtitle="Create, manage, and track student fee records"
      />

      {/* Create Records Section */}
      <CreateRecordsSection
        schools={schools}
        selectedSchoolId={filters.schoolId}
        onSchoolChange={(id) => updateFilters({ schoolId: id })}
        selectedMonth={filters.month}
        onMonthChange={(date) => updateFilters({ month: date })}
        onCreateMonthly={handleCreateMonthly}
        onOpenSingleFeeModal={handleOpenSingleFeeModal}
        loading={loading.create}
        loadingStudents={loading.students}
        successMessage={successMessage}
      />

      {/* Error Message */}
      {error && (
        <div style={responsiveStyles.errorBanner}>
          <div style={styles.errorContent}>
            <svg style={styles.errorIcon} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
          <button
            onClick={() => setError(null)}
            style={responsiveStyles.errorCloseButton}
          >
            <svg style={styles.errorIcon} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Filters */}
      <FeeFilters
        schools={schools}
        classes={classes}
        filters={filters}
        onFilterChange={updateFilters}
        onExportPDF={handleExportPDF}
        loading={pageLoading}
        hasData={fees.length > 0}
      />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedFeeIds.length}
        onBulkUpdate={handleBulkUpdate}
        onBulkDelete={handleBulkDelete}
        loading={loading.update || loading.delete}
      />

      {/* Summary Header */}
      {fees.length > 0 && (
        <FeeSummaryHeader
          schoolName={schoolName}
          studentClass={filters.studentClass}
          month={filters.month}
          totals={totals}
        />
      )}

      {/* Loading State */}
      {pageLoading && (
        <div style={responsiveStyles.loadingContainer}>
          <ClipLoader color={COLORS.status.info} size={isMobile ? 40 : 50} />
        </div>
      )}

      {/* Fee Table */}
      {!pageLoading && (
        <FeeTable
          groupedFees={groupedFees}
          totals={totals}
          selectedFeeIds={selectedFeeIds}
          onToggleSelect={toggleSelectFee}
          onSelectAll={selectAllFees}
          isAllSelected={isAllSelected}
          sortConfig={sortConfig}
          onSort={sortFees}
          editingFeeId={editingFeeId}
          onEditStart={handleEditStart}
          onEditSave={handleEditSave}
          onEditCancel={handleEditCancel}
          editedValues={editedValues}
          onEditValueChange={handleEditValueChange}
          onDelete={handleDeleteSingle}
          loading={isLoading}
        />
      )}

      {/* Single Fee Modal */}
      <SingleFeeModal
        isOpen={showSingleFeeModal}
        onClose={() => setShowSingleFeeModal(false)}
        onSubmit={handleCreateSingleFee}
        students={students}
        loading={loading.create || loading.students}
        selectedMonth={filters.month}
        schoolName={schoolName}
      />
      </div>

      {/* Floating Fee Agent Chat */}
      <FloatingChatWindow
        title="Fee Agent"
        subtitle="AI-powered fee management"
        icon="💰"
        fabPosition={{ bottom: '24px', right: '24px' }}
        windowSize={{ width: '420px', height: '550px' }}
        showBadge={true}
        badgeColor="#10B981"
        zIndex={1000}
      >
        <div style={{ padding: SPACING.md, height: '100%', overflow: 'hidden' }}>
          <FeeAgentChat
            schools={schools}
            students={students}
            onRefresh={fetchFees}
            onExportPDF={handleExportPDF}
            height="100%"
          />
        </div>
      </FloatingChatWindow>
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
  pageHeader: {
    marginBottom: SPACING.xl,
  },
  pageTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },
  pageSubtitle: {
    color: COLORS.text.whiteMedium,
    marginTop: SPACING.xs,
  },
  errorBanner: {
    backgroundColor: COLORS.status.errorLight,
    border: `1px solid ${COLORS.status.error}30`,
    color: COLORS.status.errorDark,
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorContent: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  errorIcon: {
    width: '20px',
    height: '20px',
  },
  errorCloseButton: {
    color: COLORS.status.error,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: SPACING.xs,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: `${SPACING['2xl']} 0`,
  },
};

export default FeePage;