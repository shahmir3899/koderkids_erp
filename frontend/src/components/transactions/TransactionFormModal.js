// ============================================
// TRANSACTION FORM MODAL - Modal Wrapper for Transaction Form
// ============================================
// Location: src/components/transactions/TransactionFormModal.js
//
// Modal wrapper that contains the TransactionForm component.
// Includes a SegmentedControl for transaction type selection.

import React from 'react';
import { FormModal } from '../common/modals/FormModal';
import { TransactionForm } from './TransactionForm';
import { SegmentedControl } from '../common/ui/SegmentedControl';

// Design Constants
import {
  SPACING,
} from '../../utils/designConstants';

// Transaction type options for the segmented control
const TRANSACTION_TYPE_OPTIONS = [
  { value: 'income', label: 'Income', icon: '💵' },
  { value: 'expense', label: 'Expense', icon: '💸' },
  { value: 'transfers', label: 'Transfers', icon: '🔄' },
];

/**
 * TransactionFormModal - Modal wrapper for the transaction form
 *
 * @param {boolean} show - Whether to show the modal
 * @param {function} onClose - Callback when modal is closed
 * @param {string} activeTab - Current transaction type tab
 * @param {function} setActiveTab - Callback to change transaction type
 * @param {object} formData - Form state
 * @param {function} setFormData - Form state setter
 * @param {array} currentCategories - Available categories for current tab
 * @param {array} accounts - Available accounts
 * @param {array} schools - Available schools
 * @param {function} handleCategoryChange - Category selection handler
 * @param {function} handleAddCategory - Add new category handler
 * @param {function} handleSubmit - Form submission handler
 * @param {boolean} isEditing - Whether editing an existing transaction
 * @param {object} loading - Loading states object
 */
export const TransactionFormModal = ({
  show,
  onClose,
  activeTab,
  setActiveTab,
  formData,
  setFormData,
  currentCategories,
  accounts,
  schools,
  handleCategoryChange,
  handleAddCategory,
  handleSubmit,
  isEditing,
  loading,
}) => {
  // Handle form submission from modal
  const handleModalSubmit = (e) => {
    e.preventDefault();
    handleSubmit(e);
  };

  // Get modal title based on editing state
  const getModalTitle = () => {
    if (isEditing) {
      return '✏️ Edit Transaction';
    }
    return '➕ Add Transaction';
  };

  // Get subtitle based on active tab
  const getSubtitle = () => {
    const typeLabel = activeTab === 'transfers' ? 'transfer' : activeTab;
    return `Record a new ${typeLabel} transaction`;
  };

  return (
    <FormModal
      show={show}
      title={getModalTitle()}
      subtitle={getSubtitle()}
      onClose={onClose}
      onSubmit={handleModalSubmit}
      isLoading={loading.submit}
      submitText={isEditing ? 'Update Transaction' : 'Save Transaction'}
      size="lg"
      variant="primary"
    >
      {/* Transaction Type Selector - only show when adding, not editing */}
      {!isEditing && (
        <div style={styles.segmentedControlWrapper}>
          <SegmentedControl
            value={activeTab}
            onChange={setActiveTab}
            options={TRANSACTION_TYPE_OPTIONS}
            size="md"
            fullWidth
          />
        </div>
      )}

      {/* Transaction Form */}
      <TransactionForm
        formData={formData}
        setFormData={setFormData}
        activeTab={activeTab}
        currentCategories={currentCategories}
        accounts={accounts}
        schools={schools}
        handleCategoryChange={handleCategoryChange}
        handleAddCategory={handleAddCategory}
        handleSubmit={handleModalSubmit}
        isEditing={isEditing}
        loading={loading}
        hideSubmitButton={true}
      />
    </FormModal>
  );
};

// ============================================
// STYLES
// ============================================
const styles = {
  segmentedControlWrapper: {
    marginBottom: SPACING.xl,
    display: 'flex',
    justifyContent: 'center',
  },
};

export default TransactionFormModal;
