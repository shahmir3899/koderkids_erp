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

  /**
   * Lumpsum school invoice: school, classes covered, students enrolled, amount.
   * No student list.
   */
  const exportInvoicePDF = useCallback(({ invoice, schoolAddress }) => {
    const container = document.createElement('div');
    container.innerHTML = buildInvoiceHTML({
      invoice,
      schoolAddress: schoolAddress || invoice.school_address || '',
    });
    document.body.appendChild(container);

    const options = {
      margin: [8, 8, 8, 8],
      filename: `Invoice_${invoice.invoice_no}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
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

  return { exportToPDF, exportInvoicePDF };
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
            <img src="/logo512.png" alt="Koder Kids Logo" style="width: 120px; margin-bottom: 8px;" />
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

const buildInvoiceHTML = ({ invoice, schoolAddress }) => {
  const money = (v) => parseFloat(v || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const total = parseFloat(invoice.total_amount);
  const balance = parseFloat(invoice.balance_due);
  const paid = invoice.status === 'Paid';
  const badgeStyle = paid
    ? 'background:#dcfce7;color:#15803d;'
    : 'background:#fef3c7;color:#b45309;';
  const monthLong = (() => {
    try {
      return format(new Date(`1 ${invoice.month.replace('-', ' ')}`), 'MMMM yyyy');
    } catch {
      return invoice.month;
    }
  })();
  const received = invoice.date_received ? format(new Date(invoice.date_received), 'dd MMM yyyy') : null;
  const classNames = (invoice.class_names || []).join(', ');

  return `
    <div style="font-family: 'Helvetica', 'Arial', sans-serif; color: #333; padding: 10px; font-size: 12px;">
      <div style="background-color:#eff6ff;border-radius:8px;padding:16px;margin-bottom:18px;border:1px solid #bfdbfe;display:flex;justify-content:space-between;">
        <div>
          <h2 style="font-size:22px;font-weight:bold;color:#1e40af;margin:0 0 8px 0;">Fee Invoice</h2>
          <p style="margin:4px 0;color:#4b5563;"><strong>INVOICE NO:</strong> ${invoice.invoice_no}</p>
          <p style="margin:4px 0;color:#4b5563;"><strong>INVOICE TO:</strong> ${invoice.school_name}</p>
          ${schoolAddress ? `<p style="margin:4px 0;color:#4b5563;">${schoolAddress}</p>` : ''}
          <p style="margin:4px 0;color:#4b5563;"><strong>Billing month:</strong> ${monthLong} &nbsp;|&nbsp; <strong>Issued:</strong> ${format(new Date(), 'dd MMM yyyy')}</p>
        </div>
        <div style="text-align:right;">
          <img src="/logo512.png" alt="Koder Kids Logo" style="width:90px;margin-bottom:6px;" />
          <p style="font-weight:bold;font-size:14px;color:#1e40af;margin:0;">Koder Kids</p>
          <p style="font-size:11px;color:#4b5563;margin:2px 0;">G-15 Markaz, Islamabad</p>
          <p style="font-size:11px;color:#4b5563;margin:2px 0;">0316-7394390</p>
          <p style="font-size:11px;color:#4b5563;margin:2px 0;">koderkids24@gmail.com</p>
        </div>
      </div>

      <p style="color:#4b5563;margin:0 0 14px 0;">To: ${invoice.school_name} &mdash; please find below the fee invoice for ${monthLong}.</p>

      <div style="display:flex;gap:12px;margin-bottom:18px;">
        <div style="flex:1;border:1px solid #bfdbfe;background:#f8fbff;border-radius:8px;padding:12px 14px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Students enrolled</div>
          <div style="font-size:22px;font-weight:bold;color:#1e3a5f;margin-top:4px;">${invoice.students_count}</div>
        </div>
        <div style="flex:1;border:1px solid #bfdbfe;background:#f8fbff;border-radius:8px;padding:12px 14px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Classes covered</div>
          <div style="font-size:22px;font-weight:bold;color:#1e3a5f;margin-top:4px;">${invoice.classes_count}</div>
        </div>
        <div style="flex:1;border:1px solid #bfdbfe;background:#f8fbff;border-radius:8px;padding:12px 14px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Amount payable</div>
          <div style="font-size:22px;font-weight:bold;color:#1e3a5f;margin-top:4px;">PKR ${money(total).replace(/\.00$/, '')}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#dbeafe;color:#1e3a5f;">
            <th style="text-align:left;padding:10px 12px;border:1px solid #d1d5db;width:6%;">#</th>
            <th style="text-align:left;padding:10px 12px;border:1px solid #d1d5db;">Description</th>
            <th style="text-align:right;padding:10px 12px;border:1px solid #d1d5db;width:14%;">Classes</th>
            <th style="text-align:right;padding:10px 12px;border:1px solid #d1d5db;width:14%;">Students</th>
            <th style="text-align:right;padding:10px 12px;border:1px solid #d1d5db;width:20%;">Amount (PKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:12px;border:1px solid #d1d5db;vertical-align:top;">1</td>
            <td style="padding:12px;border:1px solid #d1d5db;vertical-align:top;">
              Koder Kids programme &mdash; monthly subscription
              <div style="color:#6b7280;margin-top:4px;font-size:11px;">Billing period: ${monthLong} &middot; Flat monthly fee for the whole school</div>
              ${classNames ? `<div style="color:#6b7280;margin-top:4px;font-size:11px;">Classes: ${classNames}</div>` : ''}
            </td>
            <td style="padding:12px;border:1px solid #d1d5db;text-align:right;vertical-align:top;">${invoice.classes_count}</td>
            <td style="padding:12px;border:1px solid #d1d5db;text-align:right;vertical-align:top;">${invoice.students_count}</td>
            <td style="padding:12px;border:1px solid #d1d5db;text-align:right;vertical-align:top;">${money(total)}</td>
          </tr>
        </tbody>
      </table>

      <table style="width:55%;margin-left:auto;margin-top:14px;border-collapse:collapse;font-size:12px;">
        <tr><td style="padding:8px 12px;border:1px solid #d1d5db;">Subtotal</td><td style="padding:8px 12px;border:1px solid #d1d5db;text-align:right;">${money(total)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #d1d5db;">Received${received ? ` (${received})` : ''}</td><td style="padding:8px 12px;border:1px solid #d1d5db;text-align:right;">${money(invoice.paid_amount)}</td></tr>
        <tr style="background:#dbeafe;font-weight:bold;color:#1e3a5f;font-size:13px;"><td style="padding:8px 12px;border:1px solid #d1d5db;">Balance due</td><td style="padding:8px 12px;border:1px solid #d1d5db;text-align:right;">PKR ${money(balance)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #d1d5db;">Status</td><td style="padding:8px 12px;border:1px solid #d1d5db;text-align:right;"><span style="display:inline-block;padding:3px 12px;border-radius:999px;font-weight:bold;font-size:11px;${badgeStyle}">${invoice.status}</span></td></tr>
      </table>

      <div style="text-align:center;font-size:11px;color:#4b5563;padding-top:14px;margin-top:26px;border-top:1px solid #e5e7eb;">
        <p style="margin:0 0 8px 0;">
          Please process the payment at the earliest. Bank details: IBAN PK62BKIP0312100062460001, Title: Early Bird Koder Kids Private Limited, Bank Islami. Thank you.
        </p>
        <p style="font-style:italic;margin:0 0 8px 0;">This is a system-generated document and does not require a physical signature.</p>
        <p style="margin:0;">Generated: ${format(new Date(), 'MMM dd, yyyy hh:mm a')}</p>
      </div>
    </div>
  `;
};

export default useFeePDF;