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

// Hooks
import { useFees } from '../hooks/useFees';
import { useFeePDF } from '../hooks/useFeePDF';
import { useSchools } from '../hooks/useSchools';

// Components
import CreateRecordsSection from '../components/fees/CreateRecordsSection';
import FeeFilters from '../components/fees/FeeFilters';
import BulkActionsBar from '../components/fees/BulkActionsBar';
import FeeSummaryHeader from '../components/fees/FeeSummaryHeader';
import FeeTable from '../components/fees/FeeTable';
import SingleFeeModal from '../components/fees/SingleFeeModal';

function FeePage() {
  // Schools data
  const { schools, loading: schoolsLoading } = useSchools();
  
  // Extract unique classes from schools
  const [classes, setClasses] = useState([]);
  
  useEffect(() => {
    if (schools.length > 0) {
      const allClasses = new Set();
      schools.forEach((school) => {
        if (school.classes) {
          school.classes.forEach((cls) => allClasses.add(cls));
        }
      });
      setClasses(Array.from(allClasses).sort());
    }
  }, [schools]);

  // Fee management hook
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
    <div className="p-4 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
        <p className="text-gray-500 mt-1">Create, manage, and track student fee records</p>
      </div>

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
        successMessage={successMessage}
      />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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
        <div className="flex justify-center items-center py-12">
          <ClipLoader color="#2563eb" size={50} />
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
  );
}

export default FeePage;