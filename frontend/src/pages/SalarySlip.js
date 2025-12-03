// ============================================
// SALARY SLIP PAGE - Corrected Version
// ============================================
// Location: src/pages/SalarySlip.js

import React from 'react';

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

// ============================================
// COMPONENT
// ============================================

function SalarySlipPage() {
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
    downloadPDF,  // ✅ Use this directly from hook
  } = useSalarySlip();

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', backgroundColor: '#F3F4F6', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#374151', marginBottom: '1.5rem' }}>
        📊 Salary Slip Generator
      </h1>

      {error && <ErrorDisplay error={error} />}

      {loading.teachers || loading.profile ? (
        <LoadingSpinner size="medium" message="Loading data..." />
      ) : (
        <>
          {/* ============================================ */}
          {/* EMPLOYEE INFORMATION SECTION */}
          {/* ============================================ */}
          <CollapsibleSection title="Employee Information">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              
              {/* Teacher Selection */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                  Select Teacher:
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                  }}
                >
                  <option value="">-- Select a Teacher --</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name || `Teacher ID ${teacher.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Company Name */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                  Company Name:
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => updateFormField('companyName', e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                  }}
                />
              </div>

              {/* Name */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                  Employee Name:
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormField('name', e.target.value)}
                  placeholder="Employee name"
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                  }}
                />
              </div>

              {/* Title */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                  Title:
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateFormField('title', e.target.value)}
                  placeholder="Job title"
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                  }}
                />
              </div>

              {/* Schools */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                  Schools (one per line):
                </label>
                <textarea
                  value={formData.schools}
                  onChange={(e) => updateFormField('schools', e.target.value)}
                  placeholder="Enter schools, one per line"
                  rows={3}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Date of Joining */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                  Date of Joining:
                </label>
                <input
                  type="date"
                  value={formData.dateOfJoining}
                  onChange={(e) => updateFormField('dateOfJoining', e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                  }}
                />
              </div>

              {/* From Date */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                  From Date:
                </label>
                <input
                  type="date"
                  value={formData.fromDate}
                  onChange={(e) => updateFormField('fromDate', e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                  }}
                />
              </div>

              {/* Till Date */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                  Till Date:
                </label>
                <input
                  type="date"
                  value={formData.tillDate}
                  onChange={(e) => updateFormField('tillDate', e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                  }}
                />
              </div>

              {/* Basic Salary */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                  Basic Salary (PKR):
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.basicSalary}
                  onChange={(e) => updateFormField('basicSalary', parseFloat(e.target.value) || 0)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                  }}
                />
              </div>

              {/* Payment Date */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                  Payment Date:
                </label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => updateFormField('paymentDate', e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                  }}
                />
              </div>

              {/* Bank Name */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                  Bank Name:
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => updateFormField('bankName', e.target.value)}
                  placeholder="Bank name"
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                  }}
                />
              </div>

              {/* Account Number */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                  Account Number:
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => updateFormField('accountNumber', e.target.value)}
                  placeholder="Account number"
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                  }}
                />
              </div>

              {/* Line Spacing */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                  PDF Line Spacing:
                </label>
                <select
                  value={formData.lineSpacing}
                  onChange={(e) => updateFormField('lineSpacing', e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                  }}
                >
                  <option value="single">Single</option>
                  <option value="1.5">1.5</option>
                  <option value="double">Double</option>
                </select>
              </div>
            </div>
          </CollapsibleSection>

          {/* ============================================ */}
          {/* EARNINGS & DEDUCTIONS SECTION */}
          {/* ============================================ */}
          <CollapsibleSection title="Earnings & Deductions">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <EarningsDeductionsList
                items={earnings}
                type="earning"
                onAdd={earningsActions.add}
                onUpdate={earningsActions.update}
                onRemove={earningsActions.remove}
              />
              <EarningsDeductionsList
                items={deductions}
                type="deduction"
                onAdd={deductionsActions.add}
                onUpdate={deductionsActions.update}
                onRemove={deductionsActions.remove}
              />
            </div>
          </CollapsibleSection>

          {/* ============================================ */}
          {/* SUMMARY & PREVIEW SECTION */}
          {/* ============================================ */}
          <CollapsibleSection title="Summary & Preview">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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
          <Button
            onClick={downloadPDF}
            disabled={loading.generating}
            variant="primary"
            style={{ marginTop: '1rem' }}
          >
            {loading.generating ? '⏳ Generating...' : '📄 Generate Salary Slip'}
          </Button>
        </>
      )}
    </div>
  );
}

export default SalarySlipPage;