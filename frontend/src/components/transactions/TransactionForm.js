// ============================================
// TRANSACTION FORM COMPONENT - Glassmorphism Design
// ============================================
// Location: src/components/transactions/TransactionForm.js

import React, { useState } from 'react';
import { Button } from '../common/ui/Button';

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';

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
  hideSubmitButton = false,
}) => {
  const [newCategory, setNewCategory] = useState('');
  const [hoveredButton, setHoveredButton] = useState(null);

  const handleAddCategoryClick = () => {
    handleAddCategory(newCategory);
    setNewCategory('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={styles.form}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >
      {/* Date and Amount Row */}
      <div style={styles.gridRow}>
        <div>
          <label style={styles.label}>Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            style={styles.input}
          />
        </div>

        <div>
          <label style={styles.label}>Amount (PKR) *</label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="Enter amount"
            required
            step="0.01"
            style={styles.input}
          />
        </div>
      </div>

      {/* Category Selection */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Category *</label>
        <div style={styles.buttonGroup}>
          {currentCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryChange(cat)}
              onMouseEnter={() => setHoveredButton(`cat-${cat}`)}
              onMouseLeave={() => setHoveredButton(null)}
              style={styles.selectionButton(
                formData.category === cat,
                'category',
                hoveredButton === `cat-${cat}`
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Add New Category */}
      {['income', 'expense'].includes(activeTab) && (
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Add New Category</label>
          <div style={styles.addCategoryRow}>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Enter new category name"
              style={styles.flexInput}
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
        <div style={styles.fieldGroup}>
          <label style={styles.label}>To Account (Where money is going) *</label>
          <div style={styles.buttonGroup}>
            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setFormData({ ...formData, to_account: acc.id })}
                onMouseEnter={() => setHoveredButton(`income-${acc.id}`)}
                onMouseLeave={() => setHoveredButton(null)}
                style={styles.selectionButton(
                  formData.to_account === acc.id,
                  'income',
                  hoveredButton === `income-${acc.id}`
                )}
              >
                {acc.account_name} (PKR {(acc.current_balance ?? 0).toLocaleString()})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Account Selection - Expense */}
      {activeTab === 'expense' && (
        <div style={styles.fieldGroup}>
          <label style={styles.label}>From Account (Where money is coming from) *</label>
          <div style={styles.buttonGroup}>
            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setFormData({ ...formData, from_account: acc.id })}
                onMouseEnter={() => setHoveredButton(`expense-${acc.id}`)}
                onMouseLeave={() => setHoveredButton(null)}
                style={styles.selectionButton(
                  formData.from_account === acc.id,
                  'expense',
                  hoveredButton === `expense-${acc.id}`
                )}
              >
                {acc.account_name} (PKR {(acc.current_balance ?? 0).toLocaleString()})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Account Selection - Transfers */}
      {activeTab === 'transfers' && (
        <div style={styles.gridRow}>
          <div>
            <label style={styles.label}>From Account (Source) *</label>
            <div style={styles.buttonGroup}>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, from_account: acc.id })}
                  onMouseEnter={() => setHoveredButton(`transfer-from-${acc.id}`)}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={styles.selectionButton(
                    formData.from_account === acc.id,
                    'transfer',
                    hoveredButton === `transfer-from-${acc.id}`
                  )}
                >
                  {acc.account_name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={styles.label}>To Account (Destination) *</label>
            <div style={styles.buttonGroup}>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, to_account: acc.id })}
                  onMouseEnter={() => setHoveredButton(`transfer-to-${acc.id}`)}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={styles.selectionButton(
                    formData.to_account === acc.id,
                    'transfer',
                    hoveredButton === `transfer-to-${acc.id}`
                  )}
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
        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            {formData.category === 'Loan Received' ? 'Received From (Lender) *' : 'Paid To (Lender) *'}
          </label>
          <div style={styles.buttonGroup}>
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
                  onMouseEnter={() => setHoveredButton(`loan-${acc.id}`)}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={styles.selectionButton(
                    formData.received_from === acc.id || formData.paid_to === acc.id,
                    'loan',
                    hoveredButton === `loan-${acc.id}`
                  )}
                >
                  {acc.account_name}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* School Selection */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>School (Optional)</label>
        <div style={styles.buttonGroup}>
          {schools.map((school) => (
            <button
              key={school.id}
              type="button"
              onClick={() => setFormData({ ...formData, school: school.id })}
              onMouseEnter={() => setHoveredButton(`school-${school.id}`)}
              onMouseLeave={() => setHoveredButton(null)}
              style={styles.selectionButton(
                formData.school === school.id,
                'school',
                hoveredButton === `school-${school.id}`
              )}
            >
              {school.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFormData({ ...formData, school: null })}
            onMouseEnter={() => setHoveredButton('school-none')}
            onMouseLeave={() => setHoveredButton(null)}
            style={styles.selectionButton(
              formData.school === null,
              'neutral',
              hoveredButton === 'school-none'
            )}
          >
            No School
          </button>
        </div>
      </div>

      {/* Notes */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Add any additional notes..."
          rows={3}
          style={styles.textarea}
        />
      </div>

      {/* Submit Button - hidden when used in modal */}
      {!hideSubmitButton && (
        <Button
          type="submit"
          variant="primary"
          disabled={loading.submit || loading.accounts}
          style={styles.submitButton}
        >
          {loading.submit
            ? isEditing
              ? 'Updating...'
              : 'Saving...'
            : isEditing
            ? 'Update Transaction'
            : 'Save Transaction'}
        </Button>
      )}
    </form>
  );
};

// ============================================
// STYLES - Glassmorphism Design
// ============================================

// Color mappings for different selection button types
const SELECTION_COLORS = {
  category: {
    active: '#3B82F6',
    activeBg: 'rgba(59, 130, 246, 0.25)',
    hoverBg: 'rgba(59, 130, 246, 0.15)',
  },
  income: {
    active: '#10B981',
    activeBg: 'rgba(16, 185, 129, 0.25)',
    hoverBg: 'rgba(16, 185, 129, 0.15)',
  },
  expense: {
    active: '#EF4444',
    activeBg: 'rgba(239, 68, 68, 0.25)',
    hoverBg: 'rgba(239, 68, 68, 0.15)',
  },
  transfer: {
    active: '#3B82F6',
    activeBg: 'rgba(59, 130, 246, 0.25)',
    hoverBg: 'rgba(59, 130, 246, 0.15)',
  },
  loan: {
    active: '#8B5CF6',
    activeBg: 'rgba(139, 92, 246, 0.25)',
    hoverBg: 'rgba(139, 92, 246, 0.15)',
  },
  school: {
    active: '#6366F1',
    activeBg: 'rgba(99, 102, 241, 0.25)',
    hoverBg: 'rgba(99, 102, 241, 0.15)',
  },
  neutral: {
    active: COLORS.text.whiteSubtle,
    activeBg: 'rgba(255, 255, 255, 0.2)',
    hoverBg: 'rgba(255, 255, 255, 0.1)',
  },
};

const styles = {
  form: {
    padding: SPACING.lg,
  },
  gridRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  fieldGroup: {
    marginBottom: SPACING.xl,
  },
  label: {
    display: 'block',
    marginBottom: SPACING.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
  },
  input: {
    width: '100%',
    padding: SPACING.md,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    outline: 'none',
    transition: `all ${TRANSITIONS.normal}`,
  },
  flexInput: {
    flex: 1,
    padding: SPACING.md,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    outline: 'none',
    transition: `all ${TRANSITIONS.normal}`,
  },
  textarea: {
    width: '100%',
    padding: SPACING.md,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    resize: 'vertical',
    outline: 'none',
    transition: `all ${TRANSITIONS.normal}`,
  },
  buttonGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  addCategoryRow: {
    display: 'flex',
    gap: SPACING.sm,
  },
  selectionButton: (isSelected, type, isHovered) => {
    const colors = SELECTION_COLORS[type] || SELECTION_COLORS.category;

    let backgroundColor = 'rgba(255, 255, 255, 0.08)';
    let borderColor = 'rgba(255, 255, 255, 0.2)';
    let textColor = COLORS.text.whiteSubtle;
    let transform = 'translateY(0)';
    let boxShadow = 'none';

    if (isSelected) {
      backgroundColor = colors.activeBg;
      borderColor = colors.active;
      textColor = colors.active;
      boxShadow = `0 0 15px ${colors.activeBg}`;
    } else if (isHovered) {
      backgroundColor = colors.hoverBg;
      borderColor = 'rgba(255, 255, 255, 0.3)';
      textColor = COLORS.text.white;
      transform = 'translateY(-2px)';
    }

    return {
      padding: `${SPACING.sm} ${SPACING.lg}`,
      borderRadius: BORDER_RADIUS.lg,
      border: `2px solid ${borderColor}`,
      backgroundColor: backgroundColor,
      color: textColor,
      cursor: 'pointer',
      fontSize: FONT_SIZES.sm,
      fontWeight: isSelected ? FONT_WEIGHTS.semibold : FONT_WEIGHTS.medium,
      transition: `all ${TRANSITIONS.normal}`,
      transform: transform,
      boxShadow: boxShadow,
      backdropFilter: 'blur(4px)',
    };
  },
  submitButton: {
    width: '100%',
    marginTop: SPACING.md,
  },
};
