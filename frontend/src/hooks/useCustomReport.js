// ============================================
// USE CUSTOM REPORT HOOK - State management for custom reports
// ============================================
// Location: src/hooks/useCustomReport.js

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { reportService } from '../services/reportService';

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
  });

  // ============================================
  // ERROR STATE
  // ============================================
  const [error, setError] = useState('');

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
  }, [selectedHistoryReport, fetchReportHistory]);

  // ============================================
  // APPLY TEMPLATE
  // ============================================
  const applyTemplate = useCallback((templateKey) => {
    if (!templateKey || templateKey === 'custom') {
      // Clear to custom/blank
      setTemplateType('custom');
      return;
    }

    const template = templates[templateKey];
    if (template) {
      setTo(template.recipient);
      setSubject(template.subject);
      setBodyText(template.body_text);
      setTemplateType(templateKey);
      setSelectedHistoryReport(null);
      toast.success(`Template "${template.name}" applied`);
    }
  }, [templates]);

  // ============================================
  // CLEAR FORM
  // ============================================
  const clearForm = useCallback(() => {
    setTo('');
    setSubject('');
    setBodyText('');
    setLineSpacing('single');
    setTemplateType('custom');
    setSelectedHistoryReport(null);
    setError('');
  }, []);

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
      options.push({ value: key, label: template.name });
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
    clearForm,

    // State
    loading,
    error,
    setError,
    isFormValid,
  };
};

export default useCustomReport;
