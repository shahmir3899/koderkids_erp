/**
 * useFees Hook - Manages fee state and operations
 * Path: frontend/src/hooks/useFees.js
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as feeService from '../services/feeService';

export const useFees = (initialFilters = {}) => {
  // Data state
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);
  
  // Filter state
  const [filters, setFilters] = useState({
    schoolId: '',
    studentClass: '',
    month: new Date(),
    searchTerm: '',
    ...initialFilters,
  });

  // Loading states
  const [loading, setLoading] = useState({
    fees: false,
    create: false,
    update: false,
    delete: false,
    students: false,
  });

  // UI state
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedFeeIds, setSelectedFeeIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Clear messages after delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  /**
   * Fetch fees with current filters
   */
  const fetchFees = useCallback(async () => {
    if (!filters.schoolId && !filters.studentClass) return;
    
    setLoading(prev => ({ ...prev, fees: true }));
    setError(null);

    try {
      const monthStr = feeService.formatMonthForAPI(filters.month);
      const data = await feeService.fetchFees({
        schoolId: filters.schoolId,
        studentClass: filters.studentClass,
        month: monthStr,
      });

      const sortedFees = data
        .sort((a, b) => (a.student_class || '').localeCompare(b.student_class || ''))
        .map(fee => ({ ...fee, date_received: fee.date_received || null }));

      setFees(sortedFees);
    } catch (err) {
      console.error('Failed to fetch fees:', err);
      setError('Failed to load fees. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, fees: false }));
    }
  }, [filters.schoolId, filters.studentClass, filters.month]);

  /**
   * Fetch students for single fee creation
   */
  const fetchStudents = useCallback(async (schoolId) => {
    if (!schoolId) return;
    
    setLoading(prev => ({ ...prev, students: true }));
    try {
      const data = await feeService.fetchStudentsBySchool(schoolId);
      setStudents(data);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(prev => ({ ...prev, students: false }));
    }
  }, []);

  /**
   * Create monthly fee records for a school
   */
  const createMonthlyFees = useCallback(async (forceOverwrite = false) => {
    if (!filters.schoolId || !filters.month) return { success: false };

    setLoading(prev => ({ ...prev, create: true }));
    setError(null);
    setSuccessMessage('');

    try {
      const monthStr = feeService.formatMonthForAPI(filters.month);
      const response = await feeService.createMonthlyFees({
        schoolId: filters.schoolId,
        month: monthStr,
        forceOverwrite,
      });

      setSuccessMessage(response.message);
      await fetchFees();
      return { success: true };
    } catch (err) {
      if (err.response?.status === 409) {
        return {
          success: false,
          conflict: true,
          warning: err.response.data.warning,
        };
      }
      setError(err.response?.data?.error || 'Failed to create fee records.');
      return { success: false };
    } finally {
      setLoading(prev => ({ ...prev, create: false }));
    }
  }, [filters.schoolId, filters.month, fetchFees]);

  /**
   * Create a single fee record
   */
  const createSingleFee = useCallback(async (feeData) => {
    setLoading(prev => ({ ...prev, create: true }));
    setError(null);

    try {
      const monthStr = feeService.formatMonthForAPI(feeData.month || filters.month);
      await feeService.createSingleFee({
        studentId: feeData.studentId,
        month: monthStr,
        totalFee: feeData.totalFee,
        paidAmount: feeData.paidAmount || 0,
        dateReceived: feeData.dateReceived,
      });

      setSuccessMessage('Fee record created successfully.');
      await fetchFees();
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to create fee record.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(prev => ({ ...prev, create: false }));
    }
  }, [filters.month, fetchFees]);

  /**
   * Update a single fee record
   */
  const updateFee = useCallback(async (feeId, updates) => {
    setLoading(prev => ({ ...prev, update: true }));
    setError(null);

    try {
      const feeUpdate = {
        id: feeId,
        paid_amount: updates.paidAmount?.toString(),
        date_received: updates.dateReceived,
      };

      Object.keys(feeUpdate).forEach(key => 
        feeUpdate[key] === undefined && delete feeUpdate[key]
      );

      const response = await feeService.updateFees([feeUpdate]);
      const updatedFee = response.fees.find(f => f.id === feeId);

      if (updatedFee) {
        setFees(prev => prev.map(fee =>
          fee.id === feeId
            ? {
                ...fee,
                paid_amount: parseFloat(updatedFee.paid_amount),
                balance_due: parseFloat(updatedFee.balance_due),
                status: updatedFee.status,
                date_received: updatedFee.date_received || fee.date_received,
              }
            : fee
        ));
      }

      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to update fee.';
      setError(`Failed to update fee: ${errorMsg}`);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(prev => ({ ...prev, update: false }));
    }
  }, []);

  /**
   * Bulk update fees
   */
  const bulkUpdateFees = useCallback(async (feeIds, paidAmount) => {
    if (!paidAmount || feeIds.length === 0) return { success: false };

    setLoading(prev => ({ ...prev, update: true }));
    setError(null);

    try {
      const updates = feeIds.map(id => {
        const fee = fees.find(f => f.id === id);
        const parsedAmount = parseFloat(paidAmount);
        
        if (isNaN(parsedAmount) || parsedAmount < 0 || parsedAmount > fee.total_fee) {
          throw new Error(`Invalid amount for ${fee.student_name}`);
        }
        
        return { id, paid_amount: parsedAmount.toString() };
      });

      const response = await feeService.updateFees(updates);
      const updatedFees = response.fees;

      setFees(prev => prev.map(fee => {
        const updatedFee = updatedFees.find(uf => uf.id === fee.id);
        if (updatedFee) {
          return {
            ...fee,
            paid_amount: parseFloat(updatedFee.paid_amount),
            balance_due: parseFloat(updatedFee.balance_due),
            status: updatedFee.status,
          };
        }
        return fee;
      }));

      setSelectedFeeIds([]);
      setSuccessMessage(`Successfully updated ${feeIds.length} fee records.`);
      return { success: true };
    } catch (err) {
      setError(`Failed to update fees: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setLoading(prev => ({ ...prev, update: false }));
    }
  }, [fees]);

  /**
   * Delete fee records
   */
  const deleteFeeRecords = useCallback(async (feeIds) => {
    if (feeIds.length === 0) return { success: false };

    setLoading(prev => ({ ...prev, delete: true }));
    setError(null);

    try {
      await feeService.deleteFees(feeIds);
      
      setFees(prev => prev.filter(fee => !feeIds.includes(fee.id)));
      setSelectedFeeIds(prev => prev.filter(id => !feeIds.includes(id)));
      setSuccessMessage(`Successfully deleted ${feeIds.length} fee record(s).`);
      
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to delete fee records.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
    }
  }, []);

  /**
   * Update local date_received
   */
  const updateLocalDateReceived = useCallback((feeId, date) => {
    setFees(prev => prev.map(fee =>
      fee.id === feeId ? { ...fee, date_received: date } : fee
    ));
  }, []);

  /**
   * Sort fees by key
   */
  const sortFees = useCallback((key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  }, [sortConfig]);

  /**
   * Filter and sort fees
   */
  const filteredFees = useMemo(() => {
    let result = fees;

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(fee =>
        fee.student_name?.toLowerCase().includes(term)
      );
    }

    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        const aValue = a[sortConfig.key] ?? (sortConfig.key === 'date_received' ? null : '');
        const bValue = b[sortConfig.key] ?? (sortConfig.key === 'date_received' ? null : '');

        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return sortConfig.direction === 'asc' ? 1 : -1;
        if (bValue === null) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [fees, filters.searchTerm, sortConfig]);

  /**
   * Calculate totals
   */
  const totals = useMemo(() => {
    return filteredFees.reduce(
      (acc, fee) => ({
        total_fee: acc.total_fee + parseFloat(fee.total_fee || 0),
        paid_amount: acc.paid_amount + parseFloat(fee.paid_amount || 0),
        balance_due: acc.balance_due + parseFloat(fee.balance_due || 0),
        count: acc.count + 1,
      }),
      { total_fee: 0, paid_amount: 0, balance_due: 0, count: 0 }
    );
  }, [filteredFees]);

  /**
   * Group fees by class with subtotals
   */
  const groupedFees = useMemo(() => {
    const grouped = filteredFees.reduce((acc, fee) => {
      const cls = fee.student_class || 'Unknown';
      if (!acc[cls]) acc[cls] = [];
      acc[cls].push(fee);
      return acc;
    }, {});

    return Object.keys(grouped)
      .sort()
      .map(cls => ({
        class: cls,
        fees: grouped[cls],
        subtotals: grouped[cls].reduce(
          (acc, fee) => ({
            total_fee: acc.total_fee + parseFloat(fee.total_fee || 0),
            paid_amount: acc.paid_amount + parseFloat(fee.paid_amount || 0),
            balance_due: acc.balance_due + parseFloat(fee.balance_due || 0),
          }),
          { total_fee: 0, paid_amount: 0, balance_due: 0 }
        ),
      }));
  }, [filteredFees]);

  /**
   * Selection handlers
   */
  const toggleSelectFee = useCallback((feeId) => {
    setSelectedFeeIds(prev =>
      prev.includes(feeId)
        ? prev.filter(id => id !== feeId)
        : [...prev, feeId]
    );
  }, []);

  const selectAllFees = useCallback((selected) => {
    setSelectedFeeIds(selected ? filteredFees.map(f => f.id) : []);
  }, [filteredFees]);

  const isAllSelected = useMemo(() => {
    return filteredFees.length > 0 && selectedFeeIds.length === filteredFees.length;
  }, [filteredFees, selectedFeeIds]);

  /**
   * Update filters
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Fetch fees when filters change
  useEffect(() => {
    if (filters.schoolId || filters.studentClass) {
      fetchFees();
    }
  }, [filters.schoolId, filters.studentClass, filters.month, fetchFees]);

  return {
    fees: filteredFees,
    groupedFees,
    totals,
    students,
    filters,
    updateFilters,
    loading,
    isLoading: Object.values(loading).some(Boolean),
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
  };
};

export default useFees;