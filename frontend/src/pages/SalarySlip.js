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

  return (
    <div style={styles.pageContainer}>
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
          {/* EMPLOYEE INFORMATION SECTION */}
          {/* ============================================ */}
          <CollapsibleSection title="Employee Information">
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
                <label style={styles.label}>Title:</label>
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
                <label style={styles.label}>Schools (one per line):</label>
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

              {/* Bank Name */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Bank Name:</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => updateFormField('bankName', e.target.value)}
                  placeholder="Bank name"
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
                  placeholder="Account number"
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
          <CollapsibleSection title="Earnings & Deductions">
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
          <CollapsibleSection title="Summary & Preview">
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
              onClick={downloadPDF}
              disabled={loading.generating || loading.saving}
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
    </div>
  );
}

export default SalarySlipPage;
