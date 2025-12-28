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

const INITIAL_FORM_STATE = {
  companyName: "EARLY BIRD KODER KIDS PVT LTD",
  name: "",
  title: "",
  schools: "",
  dateOfJoining: "",
  fromDate: "",
  tillDate: "",
  basicSalary: 0,
  paymentDate: "",
  bankName: "",
  accountNumber: "",
  lineSpacing: "1.5",
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
  });
  
  // Error state
  const [error, setError] = useState(null);

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

  // Fetch default dates on mount
  // Inside useSalarySlip.js
useEffect(() => {
  // Only fetch when a valid teacher is actually selected
  if (!selectedTeacherId || selectedTeacherId === '') {
    // Reset form to defaults when no teacher is selected
    setFormData(prev => ({
      ...prev,
      name: '',
      title: '',
      basicSalary: 0,
      fromDate: '',
      tillDate: '',
      // ... any other fields
    }));
    return; // Exit early → no API call
  }

  const loadTeacherData = async () => {
    // ✅ CHECK: Don't start if unmounted
    if (!isMounted.current) return;
    
    setLoading(prev => ({ ...prev, profile: true }));
    try {
      const profile = await salaryService.fetchTeacherProfile(selectedTeacherId);
      
      // ✅ CHECK: Don't update state if unmounted
      if (!isMounted.current) return;
      
      // Populate form with real data
      setFormData(prev => ({
        ...prev,
        name: profile.name || '',
        title: profile.title || '',
        basicSalary: profile.basic_salary || 0,
        fromDate: profile.from_date || '',
        tillDate: profile.till_date || '',
        // ... other fields
      }));
    } catch (err) {
      // ✅ CHECK: Don't show errors if unmounted
      if (!isMounted.current) return;
      
      toast.error('Failed to load teacher data');
      console.error(err);
    } finally {
      // ✅ CHECK: Only clear loading if mounted
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, profile: false }));
      }
    }
  };

  loadTeacherData();
}, [selectedTeacherId]);

  // Fetch teacher profile when selection changes
  // Fetch teacher profile when selection changes
useEffect(() => {
  if (!selectedTeacherId) {
    // Reset to initial state
    setFormData(prev => ({
      ...prev,
      name: "",
      title: "",
      schools: "",
      dateOfJoining: "",
      basicSalary: 0,
      bankName: "",
      accountNumber: "",
    }));
    setEarnings([]);
    setDeductions([]);
    return;
  }

  const loadTeacherProfile = async () => {
    // ✅ CHECK: Don't start if unmounted
    if (!isMounted.current) return;
    
    setLoading(prev => ({ ...prev, profile: true }));
    try {
      const data = await salaryService.fetchTeacherProfile(selectedTeacherId);
      
      // ✅ CHECK: Don't update state if unmounted
      if (!isMounted.current) return;
      
      setFormData(prev => ({
        ...prev,
        name: data.name || "Unknown",
        title: data.title || "",
        schools: data.schools?.join('\n') || "",
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
    const pdfData = { /* ... */ };

    // Generate PDF blob
    const pdfBlob = await pdfGen.generateSalarySlipPDF(pdfData);

    // ✅ CHECK: Don't download if unmounted
    if (!isMounted.current) return;

    // Download using static helper
    const filename = `Salary_Slip_${formData.name.replace(/\s+/g, '_')}_${getMonthYear(formData.fromDate).replace(/\s+/g, '_')}.pdf`;
    PDFGenerator.downloadPDF(pdfBlob, filename);

    toast.success('Salary slip generated successfully!');
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
    
    // Actions
    updateFormField,
    setSelectedTeacherId,
    setLoading,
    earningsActions,
    deductionsActions,
    validateForm,
    downloadPDF,  // ✅ Now properly exported!
  };
}