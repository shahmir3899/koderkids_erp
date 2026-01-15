// ============================================
// USE SALARY SLIP HOOK - Corrected Version
// ============================================
// Location: src/hooks/useSalarySlip.js

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import { salaryService } from '../services/salaryService';
import {
  calculateActualDays,
  calculateNormalizedDays,
  calculateProratedSalary,
  calculateTotals,
} from '../utils/salaryCalculations';
import { PDFGenerator } from '../utils/pdfGenerator';

// ============================================
// CONSTANTS
// ============================================

// Helper to get default dates based on current date
const getDefaultDates = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
  const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
  const currentDate = today.toISOString().split('T')[0];
  return { fromDate: firstDay, tillDate: lastDay, paymentDate: currentDate };
};

const INITIAL_FORM_STATE = {
  companyName: "EARLY BIRD KODER KIDS PVT LTD",
  name: "",
  title: "",
  schools: "",
  dateOfJoining: "",
  basicSalary: 0,
  bankName: "",
  accountNumber: "",
  lineSpacing: "1.5",
  ...getDefaultDates(),  // Dynamically set default dates
};

// Helper function for filename
const getMonthYear = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${month} ${year}`;
};

// ============================================
// HOOK
// ============================================

export function useSalarySlip() {
  // ============================================
  // STATE
  // ============================================
  
  // Form state (consolidated)
  const isMounted = useRef(true);
  const prevTeacherIdRef = useRef(null);
  const isLoadingHistoricalRef = useRef(false);

  // Cleanup effect
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  
  // Dynamic lists
  const [earnings, setEarnings] = useState([]);
  const [deductions, setDeductions] = useState([]);
  
  // Selection state
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  
  // Loading states (consolidated - following project pattern)
  const [loading, setLoading] = useState({
    teachers: false,
    profile: false,
    generating: false,
    history: false,
    saving: false,
  });

  // Error state
  const [error, setError] = useState(null);

  // Salary slip history state
  const [salarySlipHistory, setSalarySlipHistory] = useState([]);
  const [selectedHistorySlip, setSelectedHistorySlip] = useState(null);

  // ============================================
  // HELPERS
  // ============================================
  
  // Update form field helper
  const updateFormField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // ============================================
  // DATA FETCHING EFFECTS
  // ============================================

  // Fetch teachers on mount
  useEffect(() => {
    const loadTeachers = async () => {
      // ✅ CHECK: Don't start if unmounted
      if (!isMounted.current) return;
      
      setLoading(prev => ({ ...prev, teachers: true }));
      try {
        const data = await salaryService.fetchTeachers();
        
        // ✅ CHECK: Don't update state if unmounted
        if (!isMounted.current) return;
        
        setTeachers(data);
      } catch (err) {
        // ✅ CHECK: Don't show errors if unmounted
        if (!isMounted.current) return;
        
        console.error('Error fetching teachers:', err);
        toast.error('Failed to load teacher list');
      } finally {
        // ✅ CHECK: Only clear loading if mounted
        if (isMounted.current) {
          setLoading(prev => ({ ...prev, teachers: false }));
        }
      }
    };
    loadTeachers();
  }, []);

  // Fetch teacher profile when selection changes (merged single effect)
  useEffect(() => {
  if (!selectedTeacherId) {
    // Reset to initial state (including default dates)
    setFormData(INITIAL_FORM_STATE);
    setEarnings([]);
    setDeductions([]);
    prevTeacherIdRef.current = null;
    return;
  }

  // Skip fetch if we're loading historical data (data already loaded from history)
  if (isLoadingHistoricalRef.current) {
    isLoadingHistoricalRef.current = false;
    return;
  }

  // Prevent duplicate fetch if same teacher is selected again
  if (selectedTeacherId === prevTeacherIdRef.current) {
    return;
  }
  prevTeacherIdRef.current = selectedTeacherId;

  const loadTeacherProfile = async () => {
    // ✅ CHECK: Don't start if unmounted
    if (!isMounted.current) return;
    
    setLoading(prev => ({ ...prev, profile: true }));
    try {
      const data = await salaryService.fetchTeacherProfile(selectedTeacherId);
      
      // ✅ CHECK: Don't update state if unmounted
      if (!isMounted.current) return;
      
      // Fallback name from local teachers list if backend data lacks it
      const fallbackName = teachers.find(t => t.id === selectedTeacherId)?.name || '';
      const profileName = data.full_name || fallbackName;

      setFormData(prev => ({
        ...prev,
        name: profileName,
        title: data.title || "",
        schools: 
          (data.school_names || 
           (data.assigned_schools?.map(s => s.name) || [])
          ).join('\n'),
        dateOfJoining: data.date_of_joining?.split('T')[0] || "",
        basicSalary: data.basic_salary || 0,
        bankName: data.bank_name || "",
        accountNumber: data.account_number || "",
      }));
      setEarnings(data.earnings || []);
      setDeductions(data.deductions || []);
    } catch (err) {
      // ✅ CHECK: Don't show errors if unmounted
      if (!isMounted.current) return;
      
      console.error('Error fetching teacher profile:', err);
      toast.error('Failed to load teacher profile');
    } finally {
      // ✅ CHECK: Only clear loading if mounted
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, profile: false }));
      }
    }
  };
  loadTeacherProfile();
}, [selectedTeacherId]);

  // ============================================
  // CALCULATED VALUES (Memoized)
  // ============================================
  
  const calculations = useMemo(() => {
    const actualDays = calculateActualDays(formData.fromDate, formData.tillDate);
    const normalizedDays = calculateNormalizedDays(formData.fromDate, formData.tillDate);
    const proratedSalary = calculateProratedSalary(formData.basicSalary, normalizedDays);
    const { totalEarning, totalDeduction, netPay } = calculateTotals(
      proratedSalary,
      earnings,
      deductions
    );

    return {
      noOfDays: actualDays,
      normalizedDays,
      proratedSalary,
      totalEarning,
      totalDeduction,
      netPay,
    };
  }, [formData.fromDate, formData.tillDate, formData.basicSalary, earnings, deductions]);

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  // Earnings CRUD
  const earningsActions = {
    add: () => setEarnings(prev => [...prev, { category: '', amount: 0 }]),
    update: (index, field, value) => {
      setEarnings(prev => {
        const updated = [...prev];
        updated[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
        return updated;
      });
    },
    remove: (index) => setEarnings(prev => prev.filter((_, i) => i !== index)),
  };

  // Deductions CRUD
  const deductionsActions = {
    add: () => setDeductions(prev => [...prev, { category: '', amount: 0 }]),
    update: (index, field, value) => {
      setDeductions(prev => {
        const updated = [...prev];
        updated[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
        return updated;
      });
    },
    remove: (index) => setDeductions(prev => prev.filter((_, i) => i !== index)),
  };

  // ============================================
  // VALIDATION
  // ============================================

  const validateForm = useCallback(() => {
    const required = ['name', 'title', 'dateOfJoining', 'fromDate', 'tillDate', 'paymentDate', 'bankName', 'accountNumber'];
    const missing = required.filter(field => !formData[field]);
    
    if (missing.length > 0) {
      const errorMsg = `Please fill: ${missing.join(', ')}`;
      setError(errorMsg);
      toast.warning(errorMsg);
      return false;
    }
    
    if (calculations.noOfDays <= 0) {
      setError("Invalid date range: Till Date must be after From Date.");
      toast.warning("Invalid date range.");
      return false;
    }
    
    setError(null);
    return true;
  }, [formData, calculations.noOfDays]);

  // ============================================
  // PDF GENERATION (Outside useMemo!)
  // ============================================

  const downloadPDF = useCallback(async () => {
    // Validate first
    if (!validateForm()) return;

    // ✅ CHECK: Don't start if unmounted
    if (!isMounted.current) return;

    setLoading(prev => ({ ...prev, generating: true }));

    try {
      // Initialize PDF Generator
      const pdfGen = new PDFGenerator({
        lineSpacing: formData.lineSpacing,
        backgroundImage: '/bg.png',
        companyName: formData.companyName,
      });

      // Prepare data for PDF
      // Prepare data for PDF
      const pdfData = {
        ...formData,
        ...calculations,
        earnings: [{ category: 'Salary', amount: calculations.proratedSalary }, ...earnings],
        deductions,
      };

      // Generate PDF blob
      const pdfBlob = await pdfGen.generateSalarySlipPDF(pdfData);

      // ✅ CHECK: Don't download if unmounted
      if (!isMounted.current) return;

      // Download using static helper
      const filename = `Salary_Slip_${formData.name.replace(/\s+/g, '_')}_${getMonthYear(formData.fromDate).replace(/\s+/g, '_')}.pdf`;
      PDFGenerator.downloadPDF(pdfBlob, filename);

      toast.success('Salary slip generated successfully!');

      // Auto-save slip after successful PDF generation
      await saveSalarySlipToDb();
    } catch (error) {
      // ✅ CHECK: Don't show errors if unmounted
      if (!isMounted.current) return;

      console.error('PDF generation error:', error);
      toast.error(`Failed to generate salary slip: ${error.message}`);
    } finally {
      // ✅ CHECK: Only clear loading if mounted
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, generating: false }));
      }
    }
  }, [formData, earnings, deductions, calculations, validateForm]);

  // ============================================
  // SALARY SLIP HISTORY FUNCTIONS
  // ============================================

  /**
   * Fetch salary slip history from API
   * @param {Object} filters - Optional filters { teacher_id }
   */
  const fetchSalarySlipHistory = useCallback(async (filters = {}) => {
    if (!isMounted.current) return;

    setLoading(prev => ({ ...prev, history: true }));
    try {
      const data = await salaryService.fetchSalarySlips(filters);
      if (!isMounted.current) return;
      setSalarySlipHistory(data);
    } catch (err) {
      if (!isMounted.current) return;
      console.error('Error fetching salary slip history:', err);
      toast.error('Failed to load salary slip history');
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, history: false }));
      }
    }
  }, []);

  /**
   * Save current salary slip to database
   */
  const saveSalarySlipToDb = useCallback(async () => {
    if (!isMounted.current || !selectedTeacherId) return;

    setLoading(prev => ({ ...prev, saving: true }));
    try {
      // Find teacher to get employee_id
      const teacher = teachers.find(t => String(t.id) === String(selectedTeacherId));

      const slipData = {
        teacher: parseInt(selectedTeacherId),
        from_date: formData.fromDate,
        till_date: formData.tillDate,
        payment_date: formData.paymentDate,
        company_name: formData.companyName,
        employee_name: formData.name,
        employee_id_snapshot: teacher?.employee_id || '',
        title: formData.title,
        schools: formData.schools,
        date_of_joining: formData.dateOfJoining || null,
        bank_name: formData.bankName,
        account_number: formData.accountNumber,
        basic_salary: parseFloat(formData.basicSalary) || 0,
        no_of_days: calculations.noOfDays,
        normalized_days: calculations.normalizedDays,
        prorated_salary: calculations.proratedSalary,
        total_earnings: calculations.totalEarning,
        total_deductions: calculations.totalDeduction,
        net_pay: calculations.netPay,
        earnings_snapshot: earnings.map(e => ({ category: e.category, amount: parseFloat(e.amount) || 0 })),
        deductions_snapshot: deductions.map(d => ({ category: d.category, amount: parseFloat(d.amount) || 0 })),
        line_spacing: formData.lineSpacing,
      };

      await salaryService.saveSalarySlip(slipData);
      if (!isMounted.current) return;
      toast.success('Salary slip saved to history');

      // Refresh history
      fetchSalarySlipHistory();
    } catch (err) {
      if (!isMounted.current) return;
      console.error('Error saving salary slip:', err);
      // Don't show error toast - slip was generated successfully, just failed to save
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, saving: false }));
      }
    }
  }, [selectedTeacherId, formData, earnings, deductions, calculations, teachers, fetchSalarySlipHistory]);

  /**
   * Load a historical salary slip into the form
   * @param {number} slipId - ID of the salary slip to load
   */
  const loadHistoricalSlip = useCallback(async (slipId) => {
    if (!isMounted.current) return;

    setLoading(prev => ({ ...prev, profile: true }));
    try {
      const slip = await salaryService.fetchSalarySlipById(slipId);
      if (!isMounted.current) return;

      setSelectedHistorySlip(slip);

      // Update form with historical data
      setFormData(prev => ({
        ...prev,
        companyName: slip.company_name,
        name: slip.employee_name,
        title: slip.title || '',
        schools: slip.schools || '',
        dateOfJoining: slip.date_of_joining || '',
        basicSalary: parseFloat(slip.basic_salary) || 0,
        bankName: slip.bank_name || '',
        accountNumber: slip.account_number || '',
        fromDate: slip.from_date,
        tillDate: slip.till_date,
        paymentDate: slip.payment_date,
        lineSpacing: slip.line_spacing || '1.5',
      }));

      // Update earnings and deductions from snapshot
      setEarnings(slip.earnings_snapshot || []);
      setDeductions(slip.deductions_snapshot || []);

      // Update selected teacher - set flags FIRST to prevent useEffect from re-fetching
      isLoadingHistoricalRef.current = true;
      prevTeacherIdRef.current = String(slip.teacher);
      setSelectedTeacherId(String(slip.teacher));

      toast.info(`Loaded slip from ${slip.period_display}`);
    } catch (err) {
      if (!isMounted.current) return;
      console.error('Error loading historical slip:', err);
      toast.error('Failed to load salary slip');
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, profile: false }));
      }
    }
  }, []);

  /**
   * Delete a salary slip from history
   * @param {number} slipId - ID of the salary slip to delete
   */
  const deleteHistoricalSlip = useCallback(async (slipId) => {
    if (!isMounted.current) return;

    try {
      await salaryService.deleteSalarySlip(slipId);
      if (!isMounted.current) return;
      toast.success('Salary slip deleted');

      // Refresh history
      fetchSalarySlipHistory();

      // Clear selected if it was the deleted one
      if (selectedHistorySlip?.id === slipId) {
        setSelectedHistorySlip(null);
      }
    } catch (err) {
      if (!isMounted.current) return;
      console.error('Error deleting salary slip:', err);
      toast.error('Failed to delete salary slip');
    }
  }, [fetchSalarySlipHistory, selectedHistorySlip]);

  /**
   * Clear loaded historical slip (start fresh)
   */
  const clearHistoricalSlip = useCallback(() => {
    setSelectedHistorySlip(null);
    setSelectedTeacherId('');
    prevTeacherIdRef.current = null;
    setFormData(INITIAL_FORM_STATE);
    setEarnings([]);
    setDeductions([]);
  }, []);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    formData,
    earnings,
    deductions,
    teachers,
    selectedTeacherId,
    loading,
    error,
    calculations,

    // History State
    salarySlipHistory,
    selectedHistorySlip,

    // Actions
    updateFormField,
    setSelectedTeacherId,
    setLoading,
    earningsActions,
    deductionsActions,
    validateForm,
    downloadPDF,

    // History Actions
    fetchSalarySlipHistory,
    loadHistoricalSlip,
    deleteHistoricalSlip,
    clearHistoricalSlip,
  };
}