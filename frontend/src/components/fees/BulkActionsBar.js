/**
 * BulkActionsBar Component
 * Path: frontend/src/components/fees/BulkActionsBar.js
 */

import React, { useState } from 'react';

const BulkActionsBar = ({
  selectedCount,
  onBulkUpdate,
  onBulkDelete,
  loading,
}) => {
  const [bulkPaidAmount, setBulkPaidAmount] = useState('');
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleBulkUpdate = () => {
    onBulkUpdate(parseFloat(bulkPaidAmount));
    setBulkPaidAmount('');
    setShowUpdateConfirm(false);
  };

  const handleBulkDelete = () => {
    onBulkDelete();
    setShowDeleteConfirm(false);
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-blue-700 font-medium">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{selectedCount} record{selectedCount > 1 ? 's' : ''} selected</span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="bulk-amount" className="text-sm text-gray-600">
              Set Paid Amount:
            </label>
            <input
              id="bulk-amount"
              type="number"
              value={bulkPaidAmount}
              onChange={(e) => setBulkPaidAmount(e.target.value)}
              placeholder="Enter amount"
              className="border border-gray-300 p-2 rounded-md w-32 focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
            <button
              onClick={() => setShowUpdateConfirm(true)}
              disabled={!bulkPaidAmount || loading}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                !bulkPaidAmount || loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Apply to Selected
            </button>
          </div>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading}
            className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
              loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Selected
          </button>
        </div>
      </div>

      {showUpdateConfirm && (
        <ConfirmModal
          title="Confirm Bulk Update"
          message={`Are you sure you want to update ${selectedCount} fee record${selectedCount > 1 ? 's' : ''} with paid amount PKR ${parseFloat(bulkPaidAmount).toFixed(2)}?`}
          confirmLabel="Update"
          confirmColor="blue"
          onConfirm={handleBulkUpdate}
          onCancel={() => setShowUpdateConfirm(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="Confirm Delete"
          message={`Are you sure you want to delete ${selectedCount} fee record${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmColor="red"
          onConfirm={handleBulkDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
};

const ConfirmModal = ({
  title,
  message,
  confirmLabel,
  confirmColor = 'blue',
  onConfirm,
  onCancel,
}) => {
  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    red: 'bg-red-600 hover:bg-red-700',
    green: 'bg-green-600 hover:bg-green-700',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${colorClasses[confirmColor]}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsBar;