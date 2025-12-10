/**
 * FeeTable Component
 * Path: frontend/src/components/fees/FeeTable.js
 */

import React from 'react';
import FeeTableRow from './FeeTableRow';

const formatCurrency = (value) => {
  const num = parseFloat(value || 0);
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const FeeTable = ({
  groupedFees,
  totals,
  selectedFeeIds,
  onToggleSelect,
  onSelectAll,
  isAllSelected,
  sortConfig,
  onSort,
  editingFeeId,
  onEditStart,
  onEditSave,
  onEditCancel,
  editedValues,
  onEditValueChange,
  onDelete,
  loading,
}) => {
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const renderSortableHeader = (key, label, align = 'left') => (
    <th
      scope="col"
      className={`border border-gray-300 px-4 py-3 cursor-pointer hover:bg-gray-200 transition-colors ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      }`}
      onClick={() => onSort(key)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSort(key)}
      tabIndex={0}
      role="button"
    >
      <span className="flex items-center gap-1 justify-between">
        {label}
        <span className="text-blue-600">{getSortIcon(key)}</span>
      </span>
    </th>
  );

  if (groupedFees.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-500 text-lg">No fee records found</p>
        <p className="text-gray-400 text-sm mt-1">Select filters or create new records to get started</p>
      </div>
    );
  }

  const totalFeeCount = groupedFees.reduce((sum, g) => sum + g.fees.length, 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full bg-white">
        <thead>
          <tr className="bg-gray-100">
            <th scope="col" className="border border-gray-300 px-4 py-3 w-12">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            {renderSortableHeader('student_name', 'Name')}
            {renderSortableHeader('total_fee', 'Total Fee', 'right')}
            {renderSortableHeader('paid_amount', 'Paid', 'right')}
            {renderSortableHeader('date_received', 'Date Received', 'center')}
            {renderSortableHeader('balance_due', 'Balance', 'right')}
            {renderSortableHeader('status', 'Status', 'center')}
            <th scope="col" className="border border-gray-300 px-4 py-3 w-16 text-center">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {groupedFees.map((group) => (
            <React.Fragment key={group.class}>
              <tr className="bg-blue-100">
                <td colSpan="8" className="border border-gray-300 px-4 py-2">
                  <span className="font-semibold text-blue-800">
                    Class: {group.class}
                  </span>
                  <span className="text-blue-600 text-sm ml-2">
                    ({group.fees.length} student{group.fees.length !== 1 ? 's' : ''})
                  </span>
                </td>
              </tr>

              {group.fees.map((fee) => (
                <FeeTableRow
                  key={fee.id}
                  fee={fee}
                  isSelected={selectedFeeIds.includes(fee.id)}
                  onToggleSelect={() => onToggleSelect(fee.id)}
                  isEditing={editingFeeId}
                  onEditStart={onEditStart}
                  onEditSave={onEditSave}
                  onEditCancel={onEditCancel}
                  editedValues={editedValues}
                  onEditValueChange={onEditValueChange}
                  onDelete={onDelete}
                />
              ))}

              <tr className="bg-gray-100 font-semibold">
                <td className="border border-gray-300 px-4 py-2" />
                <td className="border border-gray-300 px-4 py-2 text-right">
                  Subtotal for {group.class}:
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right">
                  {formatCurrency(group.subtotals.total_fee)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right">
                  {formatCurrency(group.subtotals.paid_amount)}
                </td>
                <td className="border border-gray-300 px-4 py-2" />
                <td className="border border-gray-300 px-4 py-2 text-right">
                  {formatCurrency(group.subtotals.balance_due)}
                </td>
                <td className="border border-gray-300 px-4 py-2" />
                <td className="border border-gray-300 px-4 py-2" />
              </tr>
            </React.Fragment>
          ))}

          <tr className="bg-gray-200 font-bold">
            <td className="border border-gray-300 px-4 py-3" />
            <td className="border border-gray-300 px-4 py-3 text-right">
              Grand Total ({totalFeeCount} records):
            </td>
            <td className="border border-gray-300 px-4 py-3 text-right">
              {formatCurrency(totals.total_fee)}
            </td>
            <td className="border border-gray-300 px-4 py-3 text-right text-green-700">
              {formatCurrency(totals.paid_amount)}
            </td>
            <td className="border border-gray-300 px-4 py-3" />
            <td className="border border-gray-300 px-4 py-3 text-right text-red-700">
              {formatCurrency(totals.balance_due)}
            </td>
            <td className="border border-gray-300 px-4 py-3" />
            <td className="border border-gray-300 px-4 py-3" />
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default FeeTable;