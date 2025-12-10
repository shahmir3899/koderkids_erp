/**
 * useFeePDF Hook - Handles PDF export functionality
 * Path: frontend/src/hooks/useFeePDF.js
 */

import { useCallback } from 'react';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';

export const useFeePDF = () => {
  const exportToPDF = useCallback(({ 
    groupedFees, 
    totals, 
    schoolName, 
    classDisplay, 
    monthDisplay,
    schoolAddress = 'G-15 Markaz, Islamabad',
  }) => {
    const invoiceNo = `KK-${monthDisplay.split('-')[0]}-${schoolName.replace(/\s/g, '')}`;
    
    const htmlContent = buildPDFHTML({
      groupedFees,
      totals,
      schoolName,
      classDisplay,
      monthDisplay,
      invoiceNo,
      schoolAddress,
    });

    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    const options = {
      margin: [5, 5, 5, 5],
      filename: `FeeReport_${schoolName.replace(/\s/g, '_')}_${monthDisplay}_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: 'tr', before: '.page-break' },
    };

    return html2pdf()
      .set(options)
      .from(container)
      .save()
      .then(() => {
        document.body.removeChild(container);
      })
      .catch(err => {
        document.body.removeChild(container);
        throw err;
      });
  }, []);

  return { exportToPDF };
};

const buildPDFHTML = ({
  groupedFees,
  totals,
  schoolName,
  monthDisplay,
  invoiceNo,
  schoolAddress,
}) => {
  const statusColors = {
    Paid: 'color: #16a34a;',
    Pending: 'color: #ca8a04;',
    Overdue: 'color: #dc2626;',
  };

  const getStatusStyle = (status) => statusColors[status] || 'color: #374151;';
  const formatCurrency = (value) => parseFloat(value || 0).toFixed(2);

  const formatDate = (date) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'yyyy-MM-dd');
    } catch {
      return '-';
    }
  };

  const tableRows = groupedFees.map((group) => {
    const classHeader = `
      <tr style="background-color: #bfdbfe; break-inside: avoid;">
        <td colspan="6" style="padding: 8px 12px; font-weight: bold; color: #1e3a5f; text-align: left; border: 1px solid #d1d5db;">
          Class: ${group.class}
        </td>
      </tr>
    `;

    const feeRows = group.fees.map((fee, index) => `
      <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#eff6ff'}; break-inside: avoid;">
        <td style="padding: 8px 12px; text-align: left; border: 1px solid #d1d5db; vertical-align: middle;">${fee.student_name}</td>
        <td style="padding: 8px 12px; text-align: center; border: 1px solid #d1d5db; vertical-align: middle;">${formatCurrency(fee.total_fee)}</td>
        <td style="padding: 8px 12px; text-align: center; border: 1px solid #d1d5db; vertical-align: middle;">${formatCurrency(fee.paid_amount)}</td>
        <td style="padding: 8px 12px; text-align: center; border: 1px solid #d1d5db; vertical-align: middle;">${formatDate(fee.date_received)}</td>
        <td style="padding: 8px 12px; text-align: center; border: 1px solid #d1d5db; vertical-align: middle;">${formatCurrency(fee.balance_due)}</td>
        <td style="padding: 8px 12px; text-align: center; border: 1px solid #d1d5db; vertical-align: middle; font-weight: 600; ${getStatusStyle(fee.status)}">${fee.status}</td>
      </tr>
    `).join('');

    const subtotalRow = `
      <tr style="background-color: #dbeafe; font-weight: bold; break-inside: avoid;">
        <td style="padding: 8px 12px; text-align: right; border: 1px solid #d1d5db; color: #1e3a5f;">Subtotal for ${group.class}:</td>
        <td style="padding: 8px 12px; text-align: center; border: 1px solid #d1d5db;">${formatCurrency(group.subtotals.total_fee)}</td>
        <td style="padding: 8px 12px; text-align: center; border: 1px solid #d1d5db;">${formatCurrency(group.subtotals.paid_amount)}</td>
        <td style="padding: 8px 12px; text-align: center; border: 1px solid #d1d5db;"></td>
        <td style="padding: 8px 12px; text-align: center; border: 1px solid #d1d5db;">${formatCurrency(group.subtotals.balance_due)}</td>
        <td style="padding: 8px 12px; text-align: center; border: 1px solid #d1d5db;"></td>
      </tr>
    `;

    return classHeader + feeRows + subtotalRow;
  }).join('');

  return `
    <div style="font-family: 'Helvetica', 'Arial', sans-serif; color: #333; padding: 10px;">
      <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid #bfdbfe;">
        <div style="display: flex; justify-content: space-between;">
          <div>
            <h2 style="font-size: 20px; font-weight: bold; color: #1e40af; margin: 0 0 8px 0;">Fee Management Report</h2>
            <p style="font-size: 12px; color: #4b5563; margin: 4px 0;"><strong>INVOICE NO:</strong> ${invoiceNo}</p>
            <p style="font-size: 12px; color: #4b5563; margin: 4px 0;"><strong>INVOICE TO:</strong> ${schoolName}</p>
            <p style="font-size: 12px; color: #4b5563; margin: 4px 0;">${schoolAddress}</p>
            <p style="font-size: 12px; color: #4b5563; margin: 4px 0;"><strong>Month:</strong> ${monthDisplay}</p>
          </div>
          <div style="text-align: right;">
            <img src="/logo512.png" alt="Koder Kids Logo" style="width: 60px; margin-bottom: 8px;" />
            <p style="font-weight: bold; font-size: 14px; color: #1e40af; margin: 0;">Koder Kids</p>
            <p style="font-size: 11px; color: #4b5563; margin: 2px 0;">G-15 Markaz, Islamabad</p>
            <p style="font-size: 11px; color: #4b5563; margin: 2px 0;">0316-7394390</p>
            <p style="font-size: 11px; color: #4b5563; margin: 2px 0;">koderkids24@gmail.com</p>
          </div>
        </div>
      </div>

      <p style="font-size: 12px; color: #4b5563; margin-bottom: 8px;">
        To: ${schoolName}, Here is the attached fee for ${monthDisplay}
      </p>
      <p style="font-size: 12px; color: #4b5563; margin-bottom: 16px;">
        The following details outline the fee records for the specified period.
      </p>

      <table style="width: 100%; max-width: 190mm; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background-color: #dbeafe; color: #1e3a5f;">
            <th style="padding: 10px 12px; font-weight: bold; text-align: left; border: 1px solid #d1d5db;">Name</th>
            <th style="padding: 10px 12px; font-weight: bold; text-align: center; border: 1px solid #d1d5db;">Total Fee</th>
            <th style="padding: 10px 12px; font-weight: bold; text-align: center; border: 1px solid #d1d5db;">Paid</th>
            <th style="padding: 10px 12px; font-weight: bold; text-align: center; border: 1px solid #d1d5db;">Date Received</th>
            <th style="padding: 10px 12px; font-weight: bold; text-align: center; border: 1px solid #d1d5db;">Balance</th>
            <th style="padding: 10px 12px; font-weight: bold; text-align: center; border: 1px solid #d1d5db;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
          <tr style="background-color: #eff6ff; font-weight: bold; break-inside: avoid;">
            <td style="padding: 10px 12px; text-align: right; border: 1px solid #d1d5db; color: #1e3a5f;">Total:</td>
            <td style="padding: 10px 12px; text-align: center; border: 1px solid #d1d5db;">${formatCurrency(totals.total_fee)}</td>
            <td style="padding: 10px 12px; text-align: center; border: 1px solid #d1d5db;">${formatCurrency(totals.paid_amount)}</td>
            <td style="padding: 10px 12px; text-align: center; border: 1px solid #d1d5db;"></td>
            <td style="padding: 10px 12px; text-align: center; border: 1px solid #d1d5db;">${formatCurrency(totals.balance_due)}</td>
            <td style="padding: 10px 12px; text-align: center; border: 1px solid #d1d5db;"></td>
          </tr>
        </tbody>
      </table>

      <div style="text-align: center; font-size: 11px; color: #4b5563; padding-top: 16px; margin-top: 16px; border-top: 1px solid #e5e7eb;">
        <p style="margin-bottom: 8px;">
          Please process the payment at earliest. Bank details are: Bank IBAN Number: PK62BKIP0312100062460001, Title: Early Bird Koder Kids Private Limited, Bank Islami. Thank you.
        </p>
        <p style="font-style: italic; margin-bottom: 8px;">
          This is a system-generated document and does not require a physical signature.
        </p>
        <p style="margin-top: 16px;">
          Generated: ${format(new Date(), 'MMM dd, yyyy hh:mm a')}
        </p>
      </div>
    </div>
  `;
};

export default useFeePDF;