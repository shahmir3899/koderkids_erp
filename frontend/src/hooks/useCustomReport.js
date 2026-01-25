// ============================================
// USE CUSTOM REPORT HOOK - State management for custom reports
// ============================================
// Location: src/hooks/useCustomReport.js

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { reportService } from '../services/reportService';
import { getSchools } from '../api';
import { salaryService } from '../services/salaryService';

/**
 * Custom hook for managing custom report state and operations.
 * Handles form state, history, templates, and PDF generation.
 */
export const useCustomReport = () => {
  // ============================================
  // FORM STATE
  // ============================================
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [lineSpacing, setLineSpacing] = useState('single');
  const [templateType, setTemplateType] = useState('custom');

  // ============================================
  // RECIPIENT PICKER STATE
  // ============================================
  const [recipientType, setRecipientType] = useState('custom'); // 'custom' | 'school' | 'employee'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null); // Track selected employee ID for prefill
  const [schools, setSchools] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);

  // ============================================
  // HISTORY STATE
  // ============================================
  const [reportHistory, setReportHistory] = useState([]);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState(null);

  // ============================================
  // TEMPLATES STATE
  // ============================================
  const [templates, setTemplates] = useState({});

  // ============================================
  // LOADING STATES
  // ============================================
  const [loading, setLoading] = useState({
    history: false,
    templates: false,
    saving: false,
    deleting: false,
    schools: false,
    employees: false,
  });

  // ============================================
  // ERROR STATE
  // ============================================
  const [error, setError] = useState('');

  // ============================================
  // FETCH SCHOOLS
  // ============================================
  const fetchSchools = useCallback(async () => {
    setLoading(prev => ({ ...prev, schools: true }));
    try {
      const data = await getSchools();
      setSchools(data || []);
    } catch (err) {
      console.error('Error fetching schools:', err);
      toast.error('Failed to load schools');
    } finally {
      setLoading(prev => ({ ...prev, schools: false }));
    }
  }, []);

  // ============================================
  // FETCH EMPLOYEES
  // ============================================
  const fetchEmployees = useCallback(async () => {
    setLoading(prev => ({ ...prev, employees: true }));
    try {
      const data = await salaryService.fetchTeachers();
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
      toast.error('Failed to load employees');
    } finally {
      setLoading(prev => ({ ...prev, employees: false }));
    }
  }, []);

  // ============================================
  // SELECT RECIPIENT FROM PICKER
  // ============================================
  const selectRecipient = useCallback((type, value, employeeId = null) => {
    setTo(value);
    setRecipientType(type);
    setSelectedEmployeeId(type === 'employee' ? employeeId : null);
    setShowRecipientPicker(false);
  }, []);

  // ============================================
  // OPEN RECIPIENT PICKER
  // ============================================
  const openRecipientPicker = useCallback((type) => {
    setRecipientType(type);
    if (type === 'school' && schools.length === 0) {
      fetchSchools();
    } else if (type === 'employee' && employees.length === 0) {
      fetchEmployees();
    }
    setShowRecipientPicker(true);
  }, [schools.length, employees.length, fetchSchools, fetchEmployees]);

  // ============================================
  // CLOSE RECIPIENT PICKER
  // ============================================
  const closeRecipientPicker = useCallback(() => {
    setShowRecipientPicker(false);
  }, []);

  // ============================================
  // FETCH REPORT HISTORY
  // ============================================
  const fetchReportHistory = useCallback(async () => {
    setLoading(prev => ({ ...prev, history: true }));
    try {
      const data = await reportService.fetchCustomReports({ limit: 50 });
      setReportHistory(data);
    } catch (err) {
      console.error('Error fetching report history:', err);
      toast.error('Failed to load report history');
    } finally {
      setLoading(prev => ({ ...prev, history: false }));
    }
  }, []);

  // ============================================
  // FETCH TEMPLATES
  // ============================================
  const fetchTemplates = useCallback(async () => {
    setLoading(prev => ({ ...prev, templates: true }));
    try {
      const data = await reportService.fetchReportTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Error fetching templates:', err);
      toast.error('Failed to load templates');
    } finally {
      setLoading(prev => ({ ...prev, templates: false }));
    }
  }, []);

  // ============================================
  // SAVE REPORT TO DATABASE
  // ============================================
  const saveReportToDb = useCallback(async () => {
    if (!to || !subject || !bodyText.trim()) {
      return null;
    }

    setLoading(prev => ({ ...prev, saving: true }));
    try {
      const reportData = {
        recipient: to,
        subject,
        body_text: bodyText,
        line_spacing: lineSpacing,
        template_type: templateType,
      };

      const savedReport = await reportService.saveCustomReport(reportData);
      toast.success('Report saved to history');

      // Refresh history
      await fetchReportHistory();

      return savedReport;
    } catch (err) {
      console.error('Error saving report:', err);
      toast.error('Failed to save report to history');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, saving: false }));
    }
  }, [to, subject, bodyText, lineSpacing, templateType, fetchReportHistory]);

  // ============================================
  // UPDATE EXISTING REPORT IN DATABASE
  // ============================================
  const updateReportInDb = useCallback(async (reportId) => {
    if (!to || !subject || !bodyText.trim()) {
      return null;
    }

    setLoading(prev => ({ ...prev, saving: true }));
    try {
      const reportData = {
        recipient: to,
        subject,
        body_text: bodyText,
        line_spacing: lineSpacing,
        template_type: templateType,
      };

      const updatedReport = await reportService.updateCustomReport(reportId, reportData);
      toast.success('Report updated successfully');

      // Refresh history
      await fetchReportHistory();

      return updatedReport;
    } catch (err) {
      console.error('Error updating report:', err);
      toast.error('Failed to update report');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, saving: false }));
    }
  }, [to, subject, bodyText, lineSpacing, templateType, fetchReportHistory]);

  // ============================================
  // LOAD HISTORICAL REPORT
  // ============================================
  const loadHistoricalReport = useCallback(async (reportId) => {
    setLoading(prev => ({ ...prev, history: true }));
    try {
      const report = await reportService.fetchCustomReportById(reportId);

      // Populate form with historical data
      setTo(report.recipient);
      setSubject(report.subject);
      setBodyText(report.body_text);
      setLineSpacing(report.line_spacing);
      setTemplateType(report.template_type);
      setSelectedHistoryReport(report);

      toast.success('Report loaded successfully');
    } catch (err) {
      console.error('Error loading historical report:', err);
      toast.error('Failed to load report');
    } finally {
      setLoading(prev => ({ ...prev, history: false }));
    }
  }, []);

  // ============================================
  // PREFILL TEMPLATE WITH EMPLOYEE DATA
  // ============================================
  const prefillTemplateData = useCallback(async (templateBody, employeeId) => {
    if (!templateBody || !employeeId) return templateBody;

    try {
      const result = await reportService.prefillTemplate(templateBody, employeeId);
      return result.prefilled_body || templateBody;
    } catch (err) {
      console.error('Error prefilling template:', err);
      return templateBody;
    }
  }, []);

  // ============================================
  // APPLY TEMPLATE
  // ============================================
  const applyTemplate = useCallback(async (templateKey) => {
    if (!templateKey || templateKey === 'custom') {
      // Clear to custom/blank
      setTemplateType('custom');
      return;
    }

    const template = templates[templateKey];
    if (template) {
      let body = template.default_body || '';
      let subject = template.default_subject || '';

      // If employee is selected, prefill the template with their data
      if (selectedEmployeeId) {
        setLoading(prev => ({ ...prev, templates: true }));
        try {
          body = await prefillTemplateData(body, selectedEmployeeId);
          // Also prefill subject if it has placeholders
          if (subject.includes('{')) {
            subject = await prefillTemplateData(subject, selectedEmployeeId);
          }
        } finally {
          setLoading(prev => ({ ...prev, templates: false }));
        }
      }

      setSubject(subject);
      setBodyText(body);
      setTemplateType(templateKey);
      setSelectedHistoryReport(null);
      toast.success(`Template "${template.name}" applied`);
    }
  }, [templates, selectedEmployeeId, prefillTemplateData]);

  // ============================================
  // PREFILL CURRENT BODY WITH EMPLOYEE DATA
  // ============================================
  const prefillCurrentBody = useCallback(async (employeeId) => {
    if (!bodyText || !employeeId) return;

    setLoading(prev => ({ ...prev, templates: true }));
    try {
      const prefilledBody = await prefillTemplateData(bodyText, employeeId);
      if (prefilledBody !== bodyText) {
        setBodyText(prefilledBody);
        // Also prefill subject if it has placeholders
        if (subject.includes('{')) {
          const prefilledSubject = await prefillTemplateData(subject, employeeId);
          setSubject(prefilledSubject);
        }
        toast.success('Template prefilled with employee data');
      }
    } finally {
      setLoading(prev => ({ ...prev, templates: false }));
    }
  }, [bodyText, subject, prefillTemplateData]);

  // ============================================
  // CLEAR FORM
  // ============================================
  const clearForm = useCallback(() => {
    setTo('');
    setSubject('');
    setBodyText('');
    setLineSpacing('single');
    setTemplateType('custom');
    setRecipientType('custom');
    setSelectedEmployeeId(null);
    setSelectedHistoryReport(null);
    setError('');
  }, []);

  // ============================================
  // DELETE HISTORICAL REPORT
  // ============================================
  const deleteHistoricalReport = useCallback(async (reportId) => {
    setLoading(prev => ({ ...prev, deleting: true }));
    try {
      await reportService.deleteCustomReport(reportId);
      toast.success('Report deleted');

      // If deleted report is currently loaded, clear form
      if (selectedHistoryReport?.id === reportId) {
        clearForm();
      }

      // Refresh history
      await fetchReportHistory();
    } catch (err) {
      console.error('Error deleting report:', err);
      toast.error('Failed to delete report');
    } finally {
      setLoading(prev => ({ ...prev, deleting: false }));
    }
  }, [selectedHistoryReport, fetchReportHistory, clearForm]);

  // ============================================
  // CLEAR HISTORICAL REPORT (back to new)
  // ============================================
  const clearHistoricalReport = useCallback(() => {
    setSelectedHistoryReport(null);
  }, []);

  // ============================================
  // VALIDATION
  // ============================================
  const isFormValid = useMemo(() => {
    return to.trim() && subject.trim() && bodyText.trim();
  }, [to, subject, bodyText]);

  // ============================================
  // TEMPLATE OPTIONS FOR DROPDOWN
  // ============================================
  const templateOptions = useMemo(() => {
    const options = [{ value: 'custom', label: 'Custom Report' }];
    Object.entries(templates).forEach(([key, template]) => {
      if (key !== 'custom') {
        options.push({ value: key, label: template.name });
      }
    });
    return options;
  }, [templates]);

  // ============================================
  // INITIAL DATA FETCH
  // ============================================
  useEffect(() => {
    fetchReportHistory();
    fetchTemplates();
  }, [fetchReportHistory, fetchTemplates]);

  // ============================================
  // RETURN VALUES
  // ============================================
  return {
    // Form state
    to,
    setTo,
    subject,
    setSubject,
    bodyText,
    setBodyText,
    lineSpacing,
    setLineSpacing,
    templateType,
    setTemplateType,

    // Recipient picker
    recipientType,
    setRecipientType,
    selectedEmployeeId,
    schools,
    employees,
    showRecipientPicker,
    openRecipientPicker,
    closeRecipientPicker,
    selectRecipient,
    fetchSchools,
    fetchEmployees,
    prefillCurrentBody,

    // History
    reportHistory,
    selectedHistoryReport,
    fetchReportHistory,
    loadHistoricalReport,
    deleteHistoricalReport,
    clearHistoricalReport,

    // Templates
    templates,
    templateOptions,
    applyTemplate,

    // Actions
    saveReportToDb,
    updateReportInDb,
    clearForm,

    // State
    loading,
    error,
    setError,
    isFormValid,
  };
};

export default useCustomReport;
