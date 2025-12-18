// ============================================
// TRANSACTION DETAILS MODAL COMPONENT
// ============================================
// Location: src/components/transactions/TransactionDetailsModal.js

import React from 'react';
import { Button } from '../common/ui/Button';

export const TransactionDetailsModal = ({ transaction, onClose }) => {
  const getTransactionTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'income':
        return '#10B981';
      case 'expense':
        return '#EF4444';
      case 'transfer':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  return (
    <>
      {/* Modal Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}
      >
        {/* Modal Content */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '1.5rem', borderBottom: '2px solid #E5E7EB', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1F2937', margin: 0 }}>
              📄 Transaction Details
            </h2>
          </div>

          {/* Transaction Type Badge */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                backgroundColor: `${getTransactionTypeColor(transaction.transaction_type)}20`,
                color: getTransactionTypeColor(transaction.transaction_type),
              }}
            >
              {transaction.transaction_type}
            </span>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gap: '1rem' }}>
            {/* Date */}
            <div>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem', fontWeight: '600' }}>
                Date
              </p>
              <p style={{ fontSize: '1rem', color: '#1F2937', margin: 0 }}>
                {new Date(transaction.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Amount */}
            <div>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem', fontWeight: '600' }}>
                Amount
              </p>
              <p
                style={{
                  fontSize: '1.5rem',
                  color: getTransactionTypeColor(transaction.transaction_type),
                  margin: 0,
                  fontWeight: 'bold',
                }}
              >
                PKR {parseFloat(transaction.amount).toLocaleString()}
              </p>
            </div>

            {/* Category */}
            <div>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem', fontWeight: '600' }}>
                Category
              </p>
              <p style={{ fontSize: '1rem', color: '#1F2937', margin: 0 }}>{transaction.category}</p>
            </div>

            {/* Account Information */}
            {transaction.transaction_type === 'Income' && (
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem', fontWeight: '600' }}>
                  To Account
                </p>
                <p style={{ fontSize: '1rem', color: '#1F2937', margin: 0 }}>
                  {transaction.to_account_name || 'N/A'}
                </p>
              </div>
            )}

            {transaction.transaction_type === 'Expense' && (
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem', fontWeight: '600' }}>
                  From Account
                </p>
                <p style={{ fontSize: '1rem', color: '#1F2937', margin: 0 }}>
                  {transaction.from_account_name || 'N/A'}
                </p>
              </div>
            )}

            {transaction.transaction_type === 'Transfer' && (
              <>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem', fontWeight: '600' }}>
                    From Account
                  </p>
                  <p style={{ fontSize: '1rem', color: '#1F2937', margin: 0 }}>
                    {transaction.from_account_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem', fontWeight: '600' }}>
                    To Account
                  </p>
                  <p style={{ fontSize: '1rem', color: '#1F2937', margin: 0 }}>
                    {transaction.to_account_name || 'N/A'}
                  </p>
                </div>
              </>
            )}

            {/* School */}
            <div>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem', fontWeight: '600' }}>
                School
              </p>
              <p style={{ fontSize: '1rem', color: '#1F2937', margin: 0 }}>{transaction.school_name || 'No School'}</p>
            </div>

            {/* Notes */}
            {transaction.notes && (
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem', fontWeight: '600' }}>
                  Notes
                </p>
                <p
                  style={{
                    fontSize: '1rem',
                    color: '#1F2937',
                    margin: 0,
                    padding: '0.75rem',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  {transaction.notes}
                </p>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div style={{ marginTop: '2rem', textAlign: 'right' }}>
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};