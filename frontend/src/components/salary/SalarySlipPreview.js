import React from 'react';
import { formatDateWithOrdinal, getMonthYear } from '../../utils/dateFormatters';
import { formatCurrency } from '../../utils/currencyFormatters';

export function SalarySlipPreview({ data }) {
  // Handle both newline and comma-separated schools
  const parseSchools = (schoolsStr) => {
    if (!schoolsStr) return ['None'];
    // Split by newline first, then by comma if needed
    const byNewline = schoolsStr.split('\n').map(s => s.trim()).filter(s => s);
    if (byNewline.length > 1) return byNewline;
    // If only one entry, check for commas (but not inside school names)
    const byComma = schoolsStr.split(',').map(s => s.trim()).filter(s => s);
    return byComma.length > 0 ? byComma : ['None'];
  };

  const schoolsList = parseSchools(data.schools);
  const monitoringVisits = Array.isArray(data.monitoringVisits) ? data.monitoringVisits : [];

  return (
    <div style={{
      padding: '1rem',
      backgroundColor: 'white',
      border: '1px solid #E5E7EB',
      borderRadius: '0.5rem',
      maxHeight: '400px',
      overflowY: 'auto',
      color: '#1F2937',
    }}>
      <h3 style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
        Salary Slip for {getMonthYear(data.fromDate)}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {/* Left Column */}
        <div style={{ minWidth: 0 }}>
          <p style={{ marginBottom: '0.5rem' }}><strong>Name:</strong> {data.name}</p>
          <p style={{ marginBottom: '0.5rem' }}><strong>Title:</strong> {data.title}</p>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Schools:</strong>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.25rem', listStyleType: 'disc' }}>
              {schoolsList.map((school, i) => (
                <li key={i} style={{ marginBottom: '0.25rem' }}>{school}</li>
              ))}
            </ul>
          </div>
          <p style={{ marginBottom: '0.5rem' }}><strong>Date of joining:</strong> {formatDateWithOrdinal(data.dateOfJoining)}</p>
        </div>

        {/* Right Column */}
        <div style={{ minWidth: 0 }}>
          <p style={{ marginBottom: '0.5rem' }}><strong>From Date:</strong> {formatDateWithOrdinal(data.fromDate)}</p>
          <p style={{ marginBottom: '0.5rem' }}><strong>Till Date:</strong> {formatDateWithOrdinal(data.tillDate)}</p>
          <p style={{ marginBottom: '0.5rem' }}><strong>Basic Salary:</strong> {formatCurrency(data.basicSalary)}</p>
          <p style={{ marginBottom: '0.5rem' }}><strong>Payment Date:</strong> {formatDateWithOrdinal(data.paymentDate)}</p>
          <p style={{ marginBottom: '0.5rem' }}><strong>Bank Name:</strong> {data.bankName}</p>
          <p style={{ marginBottom: '0.5rem' }}><strong>Acct #:</strong> {data.accountNumber}</p>
        </div>
      </div>

      {/* No of Days */}
      <p style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
        No of Days: {data.noOfDays} {data.noOfDays === 31 ? '(normalized to 30 for calculation)' : ''}
      </p>

      {/* Earnings */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Earnings:</p>
        {data.earnings && data.earnings.length > 0 ? (
          <ul style={{ marginLeft: '1.5rem', listStyleType: 'none' }}>
            {data.earnings.map((e, i) => (
              <li key={i}>{e.category}: {formatCurrency(e.amount)}</li>
            ))}
          </ul>
        ) : (
          <p style={{ marginLeft: '1.5rem', color: '#6B7280' }}>Salary: {formatCurrency(data.proratedSalary || data.basicSalary)}</p>
        )}
        <p style={{ fontWeight: 'bold', color: '#059669', marginTop: '0.5rem' }}>
          Total Earnings: {formatCurrency(data.totalEarning)}
        </p>
      </div>

      {/* Deductions */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Deductions:</p>
        {data.deductions && data.deductions.length > 0 ? (
          <ul style={{ marginLeft: '1.5rem', listStyleType: 'none' }}>
            {data.deductions.map((d, i) => (
              <li key={i}>{d.category}: {formatCurrency(d.amount)}</li>
            ))}
          </ul>
        ) : (
          <p style={{ marginLeft: '1.5rem', color: '#6B7280' }}>None</p>
        )}
        <p style={{ fontWeight: 'bold', color: '#DC2626', marginTop: '0.5rem' }}>
          Total Deductions: {formatCurrency(data.totalDeduction)}
        </p>
      </div>

      {/* Monitoring Visits */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Monitoring Visits ({monitoringVisits.length})
        </p>
        {monitoringVisits.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #E5E7EB', padding: '6px 4px' }}>Date</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #E5E7EB', padding: '6px 4px' }}>School</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #E5E7EB', padding: '6px 4px' }}>Status</th>
                  <th style={{ textAlign: 'right', borderBottom: '1px solid #E5E7EB', padding: '6px 4px' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {monitoringVisits.map((visit, idx) => (
                  <tr key={`${visit.visit_id || 'row'}-${idx}`}>
                    <td style={{ padding: '6px 4px', borderBottom: '1px solid #F3F4F6' }}>{formatDateWithOrdinal(visit.visit_date)}</td>
                    <td style={{ padding: '6px 4px', borderBottom: '1px solid #F3F4F6' }}>{visit.school_name || '-'}</td>
                    <td style={{ padding: '6px 4px', borderBottom: '1px solid #F3F4F6' }}>{visit.status || '-'}</td>
                    <td style={{ padding: '6px 4px', borderBottom: '1px solid #F3F4F6', textAlign: 'right' }}>
                      {visit.score === null || visit.score === undefined ? '-' : `${Number(visit.score).toFixed(2)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ marginLeft: '1.5rem', color: '#6B7280' }}>No monitoring visits in this period.</p>
        )}
      </div>

      {/* Net Payable */}
      <p style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1D4ED8' }}>
        Net Payable: {formatCurrency(data.netPay)}
      </p>
    </div>
  );
}
