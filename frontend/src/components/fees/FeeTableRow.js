/**
 * FeeTableRow Component
 * Path: frontend/src/components/fees/FeeTableRow.js
 */

import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

const STATUS_COLORS = {
  Paid: 'text-green-600',
  Pending: 'text-yellow-600',
  Overdue: 'text-red-600',
  default: 'text-gray-800',
};

const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.default;

const formatCurrency = (value) => {
  const num = parseFloat(value || 0);
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const FeeTableRow = ({
  fee,
  isSelected,
  onToggleSelect,
  isEditing,
  onEditStart,
  onEditSave,
  onEditCancel,
  editedValues,
  onEditValueChange,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditingPaid = isEditing === `${fee.id}-paid_amount`;
  const isEditingDate = isEditing === `${fee.id}-date_received`;

  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      onEditSave(fee.id, fee.total_fee, field);
    } else if (e.key === 'Escape') {
      onEditCancel();
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    onDelete(fee.id);
    setShowDeleteConfirm(false);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'yyyy-MM-dd');
    } catch {
      return '-';
    }
  };

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="border border-gray-300 px-4 py-2 text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </td>

        <td className="border border-gray-300 px-4 py-2">
          <span className="font-medium text-gray-900">{fee.student_name}</span>
          {fee.reg_num && (
            <span className="text-xs text-gray-500 block">{fee.reg_num}</span>
          )}
        </td>

        <td className="border border-gray-300 px-4 py-2 text-right">
          {formatCurrency(fee.total_fee)}
        </td>

        <td className="border border-gray-300 px-4 py-2 text-right">
          {isEditingPaid ? (
            <div className="flex items-center justify-end gap-1">
              <input
                type="number"
                value={editedValues.paidAmount}
                onChange={(e) => onEditValueChange({ paidAmount: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, 'paid_amount')}
                className="border border-blue-400 p-1 rounded w-24 text-right focus:ring-2 focus:ring-blue-500"
                min="0"
                max={fee.total_fee}
                step="0.01"
                autoFocus
              />
              <button
                onClick={() => onEditSave(fee.id, fee.total_fee, 'paid_amount')}
                className="text-green-600 hover:text-green-800 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={onEditCancel}
                className="text-red-600 hover:text-red-800 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <span
              onClick={() => onEditStart(fee, 'paid_amount')}
              className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded inline-block transition-colors"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onEditStart(fee, 'paid_amount')}
            >
              {formatCurrency(fee.paid_amount)}
            </span>
          )}
        </td>

        <td className="border border-gray-300 px-4 py-2 text-center">
          {isEditingDate ? (
            <div className="flex items-center justify-center gap-1">
              <DatePicker
                selected={editedValues.dateReceived}
                onChange={(date) => onEditValueChange({ dateReceived: date })}
                dateFormat="yyyy-MM-dd"
                className="border border-blue-400 p-1 rounded w-28 text-center focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={() => onEditSave(fee.id, fee.total_fee, 'date_received')}
                className="text-green-600 hover:text-green-800 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={onEditCancel}
                className="text-red-600 hover:text-red-800 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <span
              onClick={() => onEditStart(fee, 'date_received')}
              className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded inline-block transition-colors"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onEditStart(fee, 'date_received')}
            >
              {formatDate(fee.date_received)}
            </span>
          )}
        </td>

        <td className={`border border-gray-300 px-4 py-2 text-right ${
          parseFloat(fee.balance_due) > 0 ? 'text-red-600' : 'text-green-600'
        }`}>
          {formatCurrency(fee.balance_due)}
        </td>

        <td className={`border border-gray-300 px-4 py-2 text-center font-semibold ${getStatusColor(fee.status)}`}>
          <span className={`px-2 py-1 rounded-full text-xs ${
            fee.status === 'Paid' ? 'bg-green-100' :
            fee.status === 'Pending' ? 'bg-yellow-100' :
            fee.status === 'Overdue' ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            {fee.status}
          </span>
        </td>

        <td className="border border-gray-300 px-4 py-2 text-center">
          <button
            onClick={handleDeleteClick}
            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </td>
      </tr>

      {showDeleteConfirm && (
        <tr>
          <td colSpan="8">
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Fee Record</h3>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete the fee record for <strong>{fee.student_name}</strong>? 
                  This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default FeeTableRow;