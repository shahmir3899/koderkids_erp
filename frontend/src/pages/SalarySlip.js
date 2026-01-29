// ============================================
// SALARY SLIP PAGE - Glassmorphism Design
// With History Feature
// ============================================
// Location: src/pages/SalarySlip.js

import React, { useEffect, useState } from 'react';

// Hooks
import { useSalarySlip } from '../hooks/useSalarySlip';

// Components
import { CollapsibleSection } from '../components/common/cards/CollapsibleSection';
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { Button } from '../components/common/ui/Button';
import { ErrorDisplay } from '../components/common/ui/ErrorDisplay';
import { EarningsDeductionsList } from '../components/salary/EarningsDeductionsList';
import { CalculatedValues } from '../components/salary/CalculatedValues';
import { SalarySlipPreview } from '../components/salary/SalarySlipPreview';
import { PageHeader } from '../components/common/PageHeader';

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  LAYOUT,
} from '../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../hooks/useResponsive';

// ============================================
// RESPONSIVE STYLES GENERATOR
// ============================================
const getResponsiveStyles = (isMobile, isTablet) => ({
  pageContainer: {
    padding: isMobile ? SPACING.md : isTablet ? SPACING.lg : SPACING.xl,
    maxWidth: LAYOUT.maxWidth.lg,
    margin: '0 auto',
    background: COLORS.background.gradient,
    minHeight: '100vh',
    width: '100%',
    boxSizing: 'border-box',
  },
  pageTitle: {
    fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
    textAlign: 'center',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: isMobile ? SPACING.md : SPACING.lg,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.sm,
    color: COLORS.text.white,
    fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
  },
  input: {
    padding: isMobile ? SPACING.md : SPACING.md,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    fontSize: '16px', // Prevent iOS zoom
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    outline: 'none',
    transition: `all ${TRANSITIONS.normal}`,
    minHeight: '44px', // Touch-friendly
  },
  select: {
    padding: isMobile ? SPACING.md : SPACING.md,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    fontSize: '16px', // Prevent iOS zoom
    backgroundColor: 'rgba(30, 30, 60, 0.9)',
    color: COLORS.text.white,
    outline: 'none',
    transition: `all ${TRANSITIONS.normal}`,
    minHeight: '44px', // Touch-friendly
    cursor: 'pointer',
  },
  selectOption: {
    backgroundColor: 'rgba(30, 30, 60, 0.95)',
    color: '#FFFFFF',
    padding: SPACING.sm,
  },
  textarea: {
    padding: SPACING.md,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    fontSize: '16px', // Prevent iOS zoom
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    resize: 'vertical',
    outline: 'none',
    transition: `all ${TRANSITIONS.normal}`,
    minHeight: '88px', // Touch-friendly
  },
  readOnlyInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    cursor: 'not-allowed',
    opacity: 0.8,
  },
  earningsDeductionsGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: isMobile ? SPACING.lg : SPACING['2xl'],
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: isMobile ? SPACING.lg : SPACING.xl,
  },
  generateButton: {
    marginTop: SPACING.lg,
    width: '100%',
    minHeight: '44px', // Touch-friendly
  },
  // History styles
  historyTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
  },
  historyHeader: {
    padding: isMobile ? SPACING.sm : SPACING.md,
    textAlign: 'left',
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FBBF24',
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderBottom: '2px solid rgba(251, 191, 36, 0.4)',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  historyRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    transition: `background-color ${TRANSITIONS.fast}`,
    cursor: 'pointer',
  },
  historyCell: {
    padding: isMobile ? SPACING.sm : SPACING.md,
    color: COLORS.text.white,
  },
  actionButton: {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.md,
    border: 'none',
    cursor: 'pointer',
    fontSize: FONT_SIZES.xs,
    transition: `all ${TRANSITIONS.fast}`,
    marginRight: SPACING.xs,
  },
  loadButton: {
    backgroundColor: 'rgba(96, 165, 250, 0.3)',
    color: '#60A5FA',
  },
  deleteButton: {
    backgroundColor: 'rgba(248, 113, 113, 0.3)',
    color: '#F87171',
  },
  emptyHistory: {
    textAlign: 'center',
    padding: SPACING.xl,
    color: COLORS.text.whiteSubtle,
  },
  historyBadge: {
    display: 'inline-block',
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    color: '#FBBF24',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.xs,
    marginLeft: SPACING.sm,
  },
});

// ============================================
// COMPONENT
// ============================================

function SalarySlipPage() {
  // Responsive hook
  const { isMobile, isTablet } = useResponsive();
  const styles = getResponsiveStyles(isMobile, isTablet);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  // Update/Create dialog state
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  // Track existing slip found during duplicate check (for fresh prints)
  const [existingSlipForPeriod, setExistingSlipForPeriod] = useState(null);

  const {
    formData,
    earnings,
    deductions,
    teachers,
    selectedTeacherId,
    loading,
    error,
    calculations,
    updateFormField,
    setSelectedTeacherId,
    earningsActions,
    deductionsActions,
    downloadPDF,
    // Self-Service Mode
    isSelfServiceMode,
    userRole,
    // History
    salarySlipHistory,
    selectedHistorySlip,
    fetchSalarySlipHistory,
    loadHistoricalSlip,
    deleteHistoricalSlip,
    clearHistoricalSlip,
    saveSalarySlipToDb,
    updateSalarySlipInDb,
  } = useSalarySlip();

  // Fetch history on mount
  useEffect(() => {
    fetchSalarySlipHistory();
  }, [fetchSalarySlipHistory]);

  // Handle delete confirmation
  const handleDelete = (slipId) => {
    if (deleteConfirmId === slipId) {
      deleteHistoricalSlip(slipId);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(slipId);
      // Auto-clear confirmation after 3 seconds
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `PKR ${parseFloat(amount || 0).toLocaleString()}`
  };

  // Handle generate button click
  const handleGenerateClick = () => {
    // If loaded from history, ask user whether to update or create new
    if (selectedHistorySlip) {
      setExistingSlipForPeriod(null);
      setShowUpdateDialog(true);
      return;
    }

    // Check if a slip already exists for this teacher + period (fresh print)
    if (selectedTeacherId && formData.fromDate && formData.tillDate) {
      const existingSlip = salarySlipHistory.find(slip =>
        String(slip.teacher) === String(selectedTeacherId) &&
        slip.from_date === formData.fromDate &&
        slip.till_date === formData.tillDate
      );

      if (existingSlip) {
        // Found existing slip for same period - ask user
        setExistingSlipForPeriod(existingSlip);
        setShowUpdateDialog(true);
        return;
      }
    }

    // No duplicate found - generate and save as new
    downloadPDF();
  };

  // Execute PDF generation with update or create
  const executeGeneration = async (shouldUpdate) => {
    setIsGeneratingPDF(true);
    try {
      // Download PDF first (skip auto-save since we'll handle it)
      await downloadPDF({ skipAutoSave: true });

      // Determine which slip to update (loaded from history OR found duplicate)
      const slipToUpdate = selectedHistorySlip || existingSlipForPeriod;

      // Then save or update based on user choice
      if (shouldUpdate && slipToUpdate) {
        await updateSalarySlipInDb(slipToUpdate.id);
      } else {
        await saveSalarySlipToDb();
      }

      // Close modal and clear state
      setShowUpdateDialog(false);
      setExistingSlipForPeriod(null);
      if (selectedHistorySlip) {
        clearHistoricalSlip();
      }
    } catch (err) {
      console.error('Error generating salary slip:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Modal styles
  const modalStyles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    box: {
      background: 'linear-gradient(135deg, rgba(30, 30, 60, 0.95) 0%, rgba(20, 20, 40, 0.98) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.xl,
      maxWidth: '420px',
      width: '90%',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    },
    icon: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto',
      marginBottom: SPACING.md,
      fontSize: '28px',
    },
    title: {
      color: COLORS.text.white,
      fontSize: FONT_SIZES.xl,
      fontWeight: FONT_WEIGHTS.bold,
      marginBottom: SPACING.sm,
      textAlign: 'center',
    },
    text: {
      color: COLORS.text.whiteSubtle,
      fontSize: FONT_SIZES.sm,
      marginBottom: SPACING.lg,
      textAlign: 'center',
      lineHeight: 1.6,
    },
    buttons: {
      display: 'flex',
      flexDirection: 'column',
      gap: SPACING.sm,
    },
    button: {
      padding: `${SPACING.md} ${SPACING.lg}`,
      border: 'none',
      borderRadius: BORDER_RADIUS.lg,
      color: COLORS.text.white,
      cursor: 'pointer',
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.semibold,
      transition: `all ${TRANSITIONS.normal}`,
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
    },
    buttonSuccess: {
      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
    },
    buttonCancel: {
      background: 'rgba(107, 114, 128, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  };

  return (
    <div style={styles.pageContainer}>
      {/* Update/Create Modal */}
      {showUpdateDialog && (
        <div style={modalStyles.overlay} onClick={isGeneratingPDF ? undefined : () => { setShowUpdateDialog(false); setExistingSlipForPeriod(null); }}>
          <div style={modalStyles.box} onClick={(e) => e.stopPropagation()}>
            <div style={modalStyles.icon}>
              {isGeneratingPDF ? '⏳' : '💵'}
            </div>
            <h3 style={modalStyles.title}>
              {isGeneratingPDF ? 'Generating Salary Slip...' : 'Save Salary Slip'}
            </h3>
            <p style={modalStyles.text}>
              {isGeneratingPDF
                ? 'Please wait while your salary slip is being generated and saved.'
                : existingSlipForPeriod
                  ? `A salary slip already exists for this employee for the period ${existingSlipForPeriod.period_display || `${formData.fromDate} to ${formData.tillDate}`}. How would you like to proceed?`
                  : 'This salary slip was loaded from history. How would you like to save your changes?'
              }
            </p>
            <div style={modalStyles.buttons}>
              <button
                onClick={() => executeGeneration(true)}
                disabled={isGeneratingPDF}
                style={{
                  ...modalStyles.button,
                  ...modalStyles.buttonPrimary,
                  ...(isGeneratingPDF ? modalStyles.buttonDisabled : {}),
                }}
              >
                {isGeneratingPDF ? (
                  <>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    Update Existing
                  </>
                )}
              </button>
              <button
                onClick={() => executeGeneration(false)}
                disabled={isGeneratingPDF}
                style={{
                  ...modalStyles.button,
                  ...modalStyles.buttonSuccess,
                  ...(isGeneratingPDF ? modalStyles.buttonDisabled : {}),
                }}
              >
                <span>➕</span>
                Create New Copy
              </button>
              <button
                onClick={() => {
                  setShowUpdateDialog(false);
                  setExistingSlipForPeriod(null);
                }}
                disabled={isGeneratingPDF}
                style={{
                  ...modalStyles.button,
                  ...modalStyles.buttonCancel,
                  ...(isGeneratingPDF ? modalStyles.buttonDisabled : {}),
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        icon="💵"
        title={isSelfServiceMode ? "My Salary Slip" : "Salary Slip Generator"}
        subtitle={isSelfServiceMode
          ? "View and download your salary slips"
          : "Generate and download employee salary slips"
        }
      />

      {error && <ErrorDisplay error={error} />}

      {/* ============================================ */}
      {/* SELF-SERVICE MODE: Simple list of saved salary slips */}
      {/* ============================================ */}
      {isSelfServiceMode ? (
        <div>
          {loading.history ? (
            <LoadingSpinner size="medium" message="Loading your salary slips..." />
          ) : salarySlipHistory.length === 0 ? (
            <CollapsibleSection title="My Salary Slips" defaultOpen={true}>
              <div style={{
                textAlign: 'center',
                padding: SPACING.xl,
                color: COLORS.text.whiteSubtle,
              }}>
                <div style={{ fontSize: '48px', marginBottom: SPACING.md }}>📄</div>
                <p style={{ fontSize: FONT_SIZES.lg, marginBottom: SPACING.sm }}>No salary slips available</p>
                <p style={{ fontSize: FONT_SIZES.sm }}>
                  Your salary slips will appear here once generated by admin.
                </p>
              </div>
            </CollapsibleSection>
          ) : (
            <CollapsibleSection
              title={
                <span>
                  My Salary Slips
                  <span style={styles.historyBadge}>{salarySlipHistory.length}</span>
                </span>
              }
              defaultOpen={true}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.historyTable}>
                  <thead>
                    <tr>
                      <th style={styles.historyHeader}>Period</th>
                      {!isMobile && <th style={styles.historyHeader}>Payment Date</th>}
                      <th style={{ ...styles.historyHeader, textAlign: 'right' }}>Net Pay</th>
                      <th style={{ ...styles.historyHeader, textAlign: 'center' }}>Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salarySlipHistory.map((slip) => (
                      <tr
                        key={slip.id}
                        style={styles.historyRow}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={styles.historyCell}>
                          <div style={{ fontWeight: FONT_WEIGHTS.semibold }}>{slip.month || slip.period_display}</div>
                          {isMobile && (
                            <div style={{ fontSize: FONT_SIZES.xs, color: COLORS.text.whiteSubtle, marginTop: '2px' }}>
                              {formatDate(slip.payment_date)}
                            </div>
                          )}
                        </td>
                        {!isMobile && (
                          <td style={{ ...styles.historyCell, color: COLORS.text.whiteSubtle }}>
                            {formatDate(slip.payment_date)}
                          </td>
                        )}
                        <td style={{ ...styles.historyCell, textAlign: 'right', color: '#34D399', fontWeight: FONT_WEIGHTS.bold }}>
                          {formatCurrency(slip.net_pay)}
                        </td>
                        <td style={{ ...styles.historyCell, textAlign: 'center' }}>
                          <button
                            style={{
                              ...styles.actionButton,
                              backgroundColor: 'rgba(139, 92, 246, 0.3)',
                              color: '#A78BFA',
                              padding: `${SPACING.sm} ${SPACING.md}`,
                            }}
                            onClick={() => loadHistoricalSlip(slip.id)}
                            title="Download salary slip"
                          >
                            {isMobile ? '📥' : '📥 Download'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {/* Show selected slip preview and download */}
          {selectedHistorySlip && (
            <CollapsibleSection title="Salary Slip Preview" defaultOpen={true}>
              <SalarySlipPreview
                data={{
                  ...formData,
                  ...calculations,
                  earnings: [{ category: 'Salary', amount: calculations.proratedSalary }, ...earnings],
                  deductions,
                }}
              />
              <div style={{ marginTop: SPACING.lg }}>
                <Button
                  onClick={downloadPDF}
                  disabled={loading.generating}
                  variant="primary"
                  style={{ width: '100%' }}
                >
                  {loading.generating ? 'Generating PDF...' : '📥 Download PDF'}
                </Button>
              </div>
            </CollapsibleSection>
          )}
        </div>
      ) : (
        /* ============================================ */
        /* ADMIN MODE: Full form with all fields */
        /* ============================================ */
        loading.teachers || loading.profile ? (
          <LoadingSpinner size="medium" message="Loading data..." />
        ) : (
        <>
          {/* ============================================ */}
          {/* EMPLOYEE BASIC INFO SECTION */}
          {/* ============================================ */}
          <CollapsibleSection title="👤 Employee Basic Info">
            <div style={styles.formGrid}>

              {/* Teacher Selection - Only show for Admin */}
              {!isSelfServiceMode && (
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Select Employee:</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    style={styles.select}
                  >
                    <option value="" style={styles.selectOption}>-- Select an Employee --</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id} style={styles.selectOption}>
                        {teacher.name || `Employee ID ${teacher.id}`} ({teacher.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Self-Service Mode indicator */}
              {isSelfServiceMode && (
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Employee:</label>
                  <div style={{
                    ...styles.input,
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    <span style={{ marginRight: '8px' }}>👤</span>
                    {formData.name || 'Loading...'}
                  </div>
                </div>
              )}

              {/* Company Name */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Company Name:</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => updateFormField('companyName', e.target.value)}
                  style={{...styles.input, ...(isSelfServiceMode ? styles.readOnlyInput : {})}}
                  readOnly={isSelfServiceMode}
                />
              </div>

              {/* Name */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Employee Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormField('name', e.target.value)}
                  placeholder="Employee name"
                  style={{...styles.input, ...(isSelfServiceMode ? styles.readOnlyInput : {})}}
                  readOnly={isSelfServiceMode}
                />
              </div>

              {/* Title */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Job Title:</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateFormField('title', e.target.value)}
                  placeholder="Job title"
                  style={{...styles.input, ...(isSelfServiceMode ? styles.readOnlyInput : {})}}
                  readOnly={isSelfServiceMode}
                />
              </div>

              {/* Schools */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Assigned Schools:</label>
                <textarea
                  value={formData.schools}
                  onChange={(e) => updateFormField('schools', e.target.value)}
                  placeholder="Enter schools, one per line"
                  rows={3}
                  style={{...styles.textarea, ...(isSelfServiceMode ? styles.readOnlyInput : {})}}
                  readOnly={isSelfServiceMode}
                />
              </div>

              {/* Date of Joining */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Date of Joining:</label>
                <input
                  type="date"
                  value={formData.dateOfJoining}
                  onChange={(e) => updateFormField('dateOfJoining', e.target.value)}
                  style={{...styles.input, ...(isSelfServiceMode ? styles.readOnlyInput : {})}}
                  readOnly={isSelfServiceMode}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* ============================================ */}
          {/* BANK DETAILS SECTION */}
          {/* ============================================ */}
          <CollapsibleSection title="🏦 Bank Details">
            <div style={styles.formGrid}>
              {/* Bank Name */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Bank Name:</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => updateFormField('bankName', e.target.value)}
                  placeholder="e.g., HBL, MCB, UBL"
                  style={{...styles.input, ...(isSelfServiceMode ? styles.readOnlyInput : {})}}
                  readOnly={isSelfServiceMode}
                />
              </div>

              {/* Account Title */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Account Title:</label>
                <input
                  type="text"
                  value={formData.accountTitle}
                  onChange={(e) => updateFormField('accountTitle', e.target.value)}
                  placeholder="Account holder name"
                  style={{...styles.input, ...(isSelfServiceMode ? styles.readOnlyInput : {})}}
                  readOnly={isSelfServiceMode}
                />
              </div>

              {/* Account Number */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Account Number:</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => updateFormField('accountNumber', e.target.value)}
                  placeholder="Account number / IBAN"
                  style={{...styles.input, ...(isSelfServiceMode ? styles.readOnlyInput : {})}}
                  readOnly={isSelfServiceMode}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* ============================================ */}
          {/* SALARY PERIOD & SETTINGS SECTION */}
          {/* ============================================ */}
          <CollapsibleSection title="📅 Salary Period & Settings">
            <div style={styles.formGrid}>
              {/* From Date */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>From Date:</label>
                <input
                  type="date"
                  value={formData.fromDate}
                  onChange={(e) => updateFormField('fromDate', e.target.value)}
                  style={styles.input}
                />
              </div>

              {/* Till Date */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Till Date:</label>
                <input
                  type="date"
                  value={formData.tillDate}
                  onChange={(e) => updateFormField('tillDate', e.target.value)}
                  style={styles.input}
                />
              </div>

              {/* Payment Date */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Payment Date:</label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => updateFormField('paymentDate', e.target.value)}
                  style={{...styles.input, ...(isSelfServiceMode ? styles.readOnlyInput : {})}}
                  readOnly={isSelfServiceMode}
                />
              </div>

              {/* Basic Salary */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Basic Salary (PKR):</label>
                <input
                  type="number"
                  min="0"
                  value={formData.basicSalary}
                  onChange={(e) => updateFormField('basicSalary', parseFloat(e.target.value) || 0)}
                  style={{...styles.input, ...(isSelfServiceMode ? styles.readOnlyInput : {})}}
                  readOnly={isSelfServiceMode}
                />
              </div>

              {/* Line Spacing */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>PDF Line Spacing:</label>
                <select
                  value={formData.lineSpacing}
                  onChange={(e) => updateFormField('lineSpacing', e.target.value)}
                  style={styles.select}
                >
                  <option value="single" style={styles.selectOption}>Single</option>
                  <option value="1.5" style={styles.selectOption}>1.5</option>
                  <option value="double" style={styles.selectOption}>Double</option>
                </select>
              </div>
            </div>
          </CollapsibleSection>

          {/* ============================================ */}
          {/* EARNINGS & DEDUCTIONS SECTION */}
          {/* ============================================ */}
          <CollapsibleSection title="💰 Earnings & Deductions">
            <div style={styles.earningsDeductionsGrid}>
              <EarningsDeductionsList
                items={earnings}
                type="earning"
                onAdd={earningsActions.add}
                onUpdate={earningsActions.update}
                onRemove={earningsActions.remove}
                readOnly={isSelfServiceMode}
              />
              <EarningsDeductionsList
                items={deductions}
                type="deduction"
                onAdd={deductionsActions.add}
                onUpdate={deductionsActions.update}
                onRemove={deductionsActions.remove}
                readOnly={isSelfServiceMode}
              />
            </div>
          </CollapsibleSection>

          {/* ============================================ */}
          {/* SUMMARY & PREVIEW SECTION */}
          {/* ============================================ */}
          <CollapsibleSection title="📊 Summary & Preview">
            <div style={styles.summaryGrid}>
              <CalculatedValues calculations={calculations} />
              <SalarySlipPreview
                data={{
                  ...formData,
                  ...calculations,
                  earnings: [{ category: 'Salary', amount: calculations.proratedSalary }, ...earnings],
                  deductions,
                }}
              />
            </div>
          </CollapsibleSection>

          {/* ============================================ */}
          {/* GENERATE BUTTON */}
          {/* ============================================ */}
          <div style={{ display: 'flex', gap: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.xl }}>
            <Button
              onClick={handleGenerateClick}
              disabled={loading.generating || loading.saving || showUpdateDialog}
              variant="primary"
              style={{ ...styles.generateButton, marginTop: 0, flex: 1 }}
            >
              {loading.generating ? 'Generating...' : loading.saving ? 'Saving...' : isSelfServiceMode ? 'Download Salary Slip' : 'Generate Salary Slip'}
            </Button>
            {selectedHistorySlip && !isSelfServiceMode && (
              <Button
                onClick={clearHistoricalSlip}
                variant="secondary"
                style={{ ...styles.generateButton, marginTop: 0, flex: 0, minWidth: '120px' }}
              >
                New Slip
              </Button>
            )}
          </div>

          {/* ============================================ */}
          {/* SALARY SLIP HISTORY SECTION - Admin Only */}
          {/* ============================================ */}
          {!isSelfServiceMode && (
          <CollapsibleSection
            title={
              <span>
                Salary Slip History
                {salarySlipHistory.length > 0 && (
                  <span style={styles.historyBadge}>{salarySlipHistory.length}</span>
                )}
              </span>
            }
            defaultOpen={false}
          >
            {loading.history ? (
              <LoadingSpinner size="small" message="Loading history..." />
            ) : salarySlipHistory.length === 0 ? (
              <div style={styles.emptyHistory}>
                <p>No salary slips generated yet.</p>
                <p style={{ fontSize: FONT_SIZES.xs, marginTop: SPACING.sm }}>
                  Generated slips will appear here for easy access.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.historyTable}>
                  <thead>
                    <tr>
                      <th style={styles.historyHeader}>Employee</th>
                      {!isMobile && <th style={styles.historyHeader}>Emp ID</th>}
                      <th style={styles.historyHeader}>Period</th>
                      {!isMobile && <th style={styles.historyHeader}>Payment</th>}
                      <th style={{ ...styles.historyHeader, textAlign: 'right' }}>Net Pay</th>
                      <th style={{ ...styles.historyHeader, textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salarySlipHistory.map((slip) => (
                      <tr
                        key={slip.id}
                        style={{
                          ...styles.historyRow,
                          backgroundColor: selectedHistorySlip?.id === slip.id
                            ? 'rgba(251, 191, 36, 0.1)'
                            : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedHistorySlip?.id !== slip.id) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedHistorySlip?.id !== slip.id) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <td style={styles.historyCell}>{slip.employee_name}</td>
                        {!isMobile && (
                          <td style={{ ...styles.historyCell, color: COLORS.text.whiteSubtle }}>
                            {slip.employee_id_snapshot || '-'}
                          </td>
                        )}
                        <td style={styles.historyCell}>{slip.period_display}</td>
                        {!isMobile && (
                          <td style={{ ...styles.historyCell, color: COLORS.text.whiteSubtle }}>
                            {formatDate(slip.payment_date)}
                          </td>
                        )}
                        <td style={{ ...styles.historyCell, textAlign: 'right', color: '#34D399', fontWeight: FONT_WEIGHTS.semibold }}>
                          {formatCurrency(slip.net_pay)}
                        </td>
                        <td style={{ ...styles.historyCell, textAlign: 'center' }}>
                          <button
                            style={{ ...styles.actionButton, ...styles.loadButton }}
                            onClick={() => loadHistoricalSlip(slip.id)}
                            title="Load this slip"
                          >
                            {isMobile ? '📄' : 'Load'}
                          </button>
                          <button
                            style={{ ...styles.actionButton, ...styles.deleteButton }}
                            onClick={() => handleDelete(slip.id)}
                            title={deleteConfirmId === slip.id ? 'Click again to confirm' : 'Delete this slip'}
                          >
                            {deleteConfirmId === slip.id ? (isMobile ? '✓' : 'Confirm?') : (isMobile ? '🗑️' : 'Delete')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleSection>
          )}
        </>
        )
      )}

      {/* Keyframe animations */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

export default SalarySlipPage;
