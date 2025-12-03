import React from 'react';
import { formatCurrency } from '../../utils/currencyFormatters';

export function CalculatedValues({ calculations }) {
  const { noOfDays, proratedSalary, totalEarning, totalDeduction, netPay } = calculations;
  
  return (
    <div style={{ padding: '1rem', backgroundColor: '#F9FAFB', borderRadius: '0.5rem' }}>
      <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
        Calculated Values:
      </h3>
      <p>No of Days: {noOfDays === 31 ? `${noOfDays} (normalized to 30)` : noOfDays}</p>
      <p>Prorated Salary: {formatCurrency(proratedSalary)}</p>
      <p>Total Earning: {formatCurrency(totalEarning)}</p>
      <p>Total Deduction: {formatCurrency(totalDeduction)}</p>
      <p style={{ fontWeight: 'bold', color: '#059669' }}>Net Pay: {formatCurrency(netPay)}</p>
    </div>
  );
}