// ============================================
// TRANSACTION FORM COMPONENT
// ============================================
// Location: src/components/transactions/TransactionForm.js

import React, { useState } from 'react';
import { Button } from '../common/ui/Button';

export const TransactionForm = ({
  formData,
  setFormData,
  activeTab,
  currentCategories,
  accounts,
  schools,
  handleCategoryChange,
  handleAddCategory,
  handleSubmit,
  isEditing,
  loading,
}) => {
  const [newCategory, setNewCategory] = useState('');

  const handleAddCategoryClick = () => {
    handleAddCategory(newCategory);
    setNewCategory('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >
      {/* Date and Amount Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem',
            }}
          >
            Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem',
            }}
          >
            Amount (PKR) *
          </label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="Enter amount"
            required
            step="0.01"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}
          />
        </div>
      </div>

      {/* Category Selection */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '600',
            color: '#374151',
            fontSize: '0.875rem',
          }}
        >
          Category *
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {currentCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryChange(cat)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: formData.category === cat ? '2px solid #1E40AF' : '1px solid #D1D5DB',
                backgroundColor: formData.category === cat ? '#EFF6FF' : 'white',
                color: formData.category === cat ? '#1E40AF' : '#6B7280',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: formData.category === cat ? '600' : '400',
                transition: 'all 0.2s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Add New Category */}
      {['income', 'expense'].includes(activeTab) && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem',
            }}
          >
            Add New Category
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Enter new category name"
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            />
            <Button
              type="button"
              onClick={handleAddCategoryClick}
              variant="secondary"
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Account Selection - Income */}
      {activeTab === 'income' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem',
            }}
          >
            To Account (Where money is going) *
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setFormData({ ...formData, to_account: acc.id })}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: formData.to_account === acc.id ? '2px solid #10B981' : '1px solid #D1D5DB',
                  backgroundColor: formData.to_account === acc.id ? '#ECFDF5' : 'white',
                  color: formData.to_account === acc.id ? '#10B981' : '#6B7280',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: formData.to_account === acc.id ? '600' : '400',
                  transition: 'all 0.2s',
                }}
              >
                {acc.account_name} (PKR {acc.current_balance.toLocaleString()})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Account Selection - Expense */}
      {activeTab === 'expense' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem',
            }}
          >
            From Account (Where money is coming from) *
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setFormData({ ...formData, from_account: acc.id })}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: formData.from_account === acc.id ? '2px solid #EF4444' : '1px solid #D1D5DB',
                  backgroundColor: formData.from_account === acc.id ? '#FEF2F2' : 'white',
                  color: formData.from_account === acc.id ? '#EF4444' : '#6B7280',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: formData.from_account === acc.id ? '600' : '400',
                  transition: 'all 0.2s',
                }}
              >
                {acc.account_name} (PKR {acc.current_balance.toLocaleString()})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Account Selection - Transfers */}
      {activeTab === 'transfers' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#374151',
                fontSize: '0.875rem',
              }}
            >
              From Account (Source) *
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, from_account: acc.id })}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: formData.from_account === acc.id ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                    backgroundColor: formData.from_account === acc.id ? '#EFF6FF' : 'white',
                    color: formData.from_account === acc.id ? '#3B82F6' : '#6B7280',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: formData.from_account === acc.id ? '600' : '400',
                    transition: 'all 0.2s',
                  }}
                >
                  {acc.account_name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#374151',
                fontSize: '0.875rem',
              }}
            >
              To Account (Destination) *
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, to_account: acc.id })}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: formData.to_account === acc.id ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                    backgroundColor: formData.to_account === acc.id ? '#EFF6FF' : 'white',
                    color: formData.to_account === acc.id ? '#3B82F6' : '#6B7280',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: formData.to_account === acc.id ? '600' : '400',
                    transition: 'all 0.2s',
                  }}
                >
                  {acc.account_name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loan Specific Fields */}
      {(formData.category === 'Loan Received' || formData.category === 'Loan Paid') && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem',
            }}
          >
            {formData.category === 'Loan Received' ? 'Received From (Lender) *' : 'Paid To (Lender) *'}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {accounts
              .filter((acc) => acc.account_type === 'Person')
              .map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      received_from: formData.category === 'Loan Received' ? acc.id : null,
                      paid_to: formData.category === 'Loan Paid' ? acc.id : null,
                    });
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border:
                      formData.received_from === acc.id || formData.paid_to === acc.id
                        ? '2px solid #8B5CF6'
                        : '1px solid #D1D5DB',
                    backgroundColor:
                      formData.received_from === acc.id || formData.paid_to === acc.id
                        ? '#F5F3FF'
                        : 'white',
                    color:
                      formData.received_from === acc.id || formData.paid_to === acc.id
                        ? '#8B5CF6'
                        : '#6B7280',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight:
                      formData.received_from === acc.id || formData.paid_to === acc.id ? '600' : '400',
                    transition: 'all 0.2s',
                  }}
                >
                  {acc.account_name}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* School Selection */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '600',
            color: '#374151',
            fontSize: '0.875rem',
          }}
        >
          School (Optional)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {schools.map((school) => (
            <button
              key={school.id}
              type="button"
              onClick={() => setFormData({ ...formData, school: school.id })}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: formData.school === school.id ? '2px solid #6366F1' : '1px solid #D1D5DB',
                backgroundColor: formData.school === school.id ? '#EEF2FF' : 'white',
                color: formData.school === school.id ? '#6366F1' : '#6B7280',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: formData.school === school.id ? '600' : '400',
                transition: 'all 0.2s',
              }}
            >
              {school.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFormData({ ...formData, school: null })}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: formData.school === null ? '2px solid #6B7280' : '1px solid #D1D5DB',
              backgroundColor: formData.school === null ? '#F3F4F6' : 'white',
              color: formData.school === null ? '#1F2937' : '#6B7280',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: formData.school === null ? '600' : '400',
              transition: 'all 0.2s',
            }}
          >
            No School
          </button>
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '600',
            color: '#374151',
            fontSize: '0.875rem',
          }}
        >
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Add any additional notes..."
          rows={3}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #D1D5DB',
            borderRadius: '8px',
            fontSize: '0.875rem',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        disabled={loading.submit || loading.accounts}
        style={{ width: '100%' }}
      >
        {loading.submit
          ? isEditing
            ? 'Updating...'
            : 'Saving...'
          : isEditing
          ? '✏️ Update Transaction'
          : '💾 Save Transaction'}
      </Button>
    </form>
  );
};