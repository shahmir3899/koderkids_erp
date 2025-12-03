import React from 'react';
import { formatDateWithOrdinal, getMonthYear } from '../../utils/dateFormatters';
import { formatCurrency } from '../../utils/currencyFormatters';

export function SalarySlipPreview({ data }) {
  const schoolsList = data.schools ? data.schools.split("\n").filter(s => s.trim()) : ["None"];
  
  return (
    <div style={{ 
      padding: '1rem', 
      backgroundColor: 'white', 
      border: '1px solid #E5E7EB', 
      borderRadius: '0.5rem',
      maxHeight: '400px',
      overflowY: 'auto'
    }}>
      <h3 style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '1rem' }}>
        Salary Slip for {getMonthYear(data.fromDate)}
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <p><strong>Name:</strong> {data.name}</p>
          <p><strong>Title:</strong> {data.title}</p>
          <p><strong>Schools:</strong></p>
          <ul style={{ marginLeft: '1rem', listStyleType: 'disc' }}>
            {schoolsList.map((school, i) => <li key={i}>{school}</li>)}
          </ul>
          <p><strong>Date of joining:</strong> {formatDateWithOrdinal(data.dateOfJoining)}</p>
        </div>
        <div>
          <p><strong>From Date:</strong> {formatDateWithOrdinal(data.fromDate)}</p>
          <p><strong>Till Date:</strong> {formatDateWithOrdinal(data.tillDate)}</p>
          <p><strong>Basic Salary:</strong> {formatCurrency(data.basicSalary)}</p>
          <p><strong>Payment Date:</strong> {formatDateWithOrdinal(data.paymentDate)}</p>
          <p><strong>Bank Name:</strong> {data.bankName}</p>
          <p><strong>Acct #:</strong> {data.accountNumber}</p>
        </div>
      </div>
      
      {/* Earnings & Deductions sections... */}
      <p style={{ fontWeight: 'bold' }}>Net Payable: {formatCurrency(data.netPay)}</p>
    </div>
  );
}