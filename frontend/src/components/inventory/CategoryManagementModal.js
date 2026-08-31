// ============================================
// CATEGORY MANAGEMENT MODAL - Gradient Design System
// ============================================
// Location: src/components/inventory/CategoryManagementModal.js
//
// Restyled to match the glassmorphism gradient design used by
// TransferModal.js / ReassignModal.js. All add/edit/delete/validation
// logic below is unchanged from the previous light-theme version -
// only the styling layer, portal wrapping, and close-button markup changed.

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'react-toastify';
import { createCategory, updateCategory, deleteCategory } from '../../services/inventoryService';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  Z_INDEX,
} from '../../utils/designConstants';

// ============================================
// STYLES - matches TransferModal/ReassignModal's gradient design
// ============================================

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: Z_INDEX.modal,
    padding: SPACING.sm,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: COLORS.background.gradient,
    borderRadius: BORDER_RADIUS.xl,
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    background: 'rgba(255, 255, 255, 0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    margin: 0,
  },
  subtitle: {
    margin: `${SPACING.xs} 0 0`,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },
  closeButton: {
    padding: SPACING.sm,
    background: 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: '50%',
    cursor: 'pointer',
    color: COLORS.text.white,
    transition: `all ${TRANSITIONS.fast} ease`,
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    padding: SPACING.lg,
  },
  label: {
    display: 'block',
    marginBottom: SPACING.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
  },
  input: {
    width: '100%',
    padding: `${SPACING.sm} ${SPACING.md}`,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    boxSizing: 'border-box',
    background: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    outline: 'none',
  },
  footer: {
    padding: SPACING.lg,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    background: 'rgba(255, 255, 255, 0.03)',
  },
  cancelButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: COLORS.text.white,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
  },
  submitButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: '#8B5CF6',
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
  },
};

// ============================================
// CATEGORY ITEM COMPONENT
// ============================================

const CategoryItem = ({ category, onEdit, onDelete, isDeleting }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editDescription, setEditDescription] = useState(category.description || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error('Category name is required');
      return;
    }

    setIsSaving(true);
    try {
      await onEdit(category.id, {
        name: editName.trim(),
        description: editDescription.trim()
      });
      setIsEditing(false);
    } catch (error) {
      // Error handled in parent
    }
    setIsSaving(false);
  };

  const handleCancel = () => {
    setEditName(category.name);
    setEditDescription(category.description || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div style={{
        padding: SPACING.md,
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.sm,
        border: '1px solid rgba(139, 92, 246, 0.3)',
      }}>
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Category name"
          style={{ ...styles.input, marginBottom: SPACING.sm }}
          autoFocus
        />
        <input
          type="text"
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Description (optional)"
          style={{ ...styles.input, marginBottom: SPACING.md }}
        />
        <div style={{ display: 'flex', gap: SPACING.sm, justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            style={{
              ...styles.cancelButton,
              padding: `${SPACING.xs} ${SPACING.md}`,
              fontSize: FONT_SIZES.xs,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: `${SPACING.xs} ${SPACING.md}`,
              borderRadius: BORDER_RADIUS.md,
              border: 'none',
              backgroundColor: isSaving ? 'rgba(16, 185, 129, 0.5)' : COLORS.status.success,
              color: COLORS.text.white,
              fontSize: FONT_SIZES.xs,
              fontWeight: FONT_WEIGHTS.medium,
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving ? '⏳ Saving...' : '✓ Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: SPACING.md,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
      border: `1px solid ${COLORS.border.whiteTransparent}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          fontWeight: FONT_WEIGHTS.medium,
          color: COLORS.text.white,
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.sm,
        }}>
          🏷️ {category.name}
          {category.item_count !== undefined && (
            <span style={{
              fontSize: FONT_SIZES.xs,
              padding: `2px ${SPACING.sm}`,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: COLORS.text.whiteSubtle,
              borderRadius: BORDER_RADIUS.full,
            }}>
              {category.item_count} items
            </span>
          )}
        </div>
        {category.description && (
          <div style={{
            fontSize: FONT_SIZES.xs,
            color: COLORS.text.whiteSubtle,
            marginTop: SPACING.xs,
          }}>
            {category.description}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: SPACING.sm }}>
        <button
          onClick={() => setIsEditing(true)}
          style={{
            padding: `${SPACING.xs} ${SPACING.md}`,
            borderRadius: BORDER_RADIUS.md,
            border: 'none',
            backgroundColor: COLORS.status.infoDark,
            color: COLORS.text.white,
            fontSize: FONT_SIZES.xs,
            cursor: 'pointer',
          }}
        >
          ✏️
        </button>
        <button
          onClick={() => onDelete(category.id)}
          disabled={isDeleting}
          style={{
            padding: `${SPACING.xs} ${SPACING.md}`,
            borderRadius: BORDER_RADIUS.md,
            border: 'none',
            backgroundColor: isDeleting ? 'rgba(156, 163, 175, 0.6)' : COLORS.status.errorDark,
            color: COLORS.text.white,
            fontSize: FONT_SIZES.xs,
            cursor: isDeleting ? 'not-allowed' : 'pointer',
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const CategoryManagementModal = ({
  isOpen,
  onClose,
  categories = [],
  onUpdate,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Add new category
  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error('Category name is required');
      return;
    }

    const trimmedName = newName.trim();
    if (categories.some(c => c.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
      toast.error('A category with this name already exists');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCategory({
        name: trimmedName,
        description: newDescription.trim()
      });
      toast.success('Category added successfully');
      setNewName('');
      setNewDescription('');
      setIsAdding(false);
      onUpdate();
    } catch (error) {
      console.error('Add category error:', error);
      toast.error('Failed to add category');
    }
    setIsSubmitting(false);
  };

  // Edit category
  const handleEdit = async (id, data) => {
    try {
      await updateCategory(id, data);
      toast.success('Category updated successfully');
      onUpdate();
    } catch (error) {
      console.error('Edit category error:', error);
      toast.error('Failed to update category');
      throw error;
    }
  };

  // Delete category
  const handleDelete = async (id) => {
    const category = categories.find(c => c.id === id);

    if ((category?.item_count ?? 0) > 0) {
      toast.error(`Cannot delete: ${category.item_count} items are using this category`);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this category?')) return;

    setDeletingId(id);
    try {
      await deleteCategory(id);
      toast.success('Category deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Delete category error:', error);
      toast.error('Failed to delete category');
    }
    setDeletingId(null);
  };

  // Close on escape
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .category-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
          .category-input:focus {
            border-color: rgba(139, 92, 246, 0.6) !important;
            box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2) !important;
          }
        `}
      </style>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>🏷️ Manage Categories</h2>
            <p style={styles.subtitle}>{categories.length} categories total</p>
          </div>
          <button onClick={onClose} style={styles.closeButton} title="Close">
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={styles.content}>
          {/* Add New Category Section */}
          {isAdding ? (
            <div style={{
              padding: SPACING.md,
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              borderRadius: BORDER_RADIUS.md,
              marginBottom: SPACING.lg,
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}>
              <h4 style={{ margin: `0 0 ${SPACING.sm} 0`, fontSize: FONT_SIZES.sm, color: COLORS.text.white }}>
                ➕ Add New Category
              </h4>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name *"
                className="category-input"
                style={{ ...styles.input, marginBottom: SPACING.sm }}
                autoFocus
              />
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                className="category-input"
                style={{ ...styles.input, marginBottom: SPACING.md }}
              />
              <div style={{ display: 'flex', gap: SPACING.sm, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setNewName('');
                    setNewDescription('');
                  }}
                  disabled={isSubmitting}
                  style={{
                    ...styles.cancelButton,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={isSubmitting}
                  style={{
                    padding: `${SPACING.sm} ${SPACING.lg}`,
                    borderRadius: BORDER_RADIUS.md,
                    border: 'none',
                    backgroundColor: isSubmitting ? 'rgba(16, 185, 129, 0.5)' : COLORS.status.success,
                    color: COLORS.text.white,
                    fontWeight: FONT_WEIGHTS.medium,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: FONT_SIZES.sm,
                  }}
                >
                  {isSubmitting ? '⏳ Adding...' : '✓ Add Category'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              style={{
                width: '100%',
                padding: SPACING.md,
                border: `2px dashed ${COLORS.border.whiteTransparent}`,
                borderRadius: BORDER_RADIUS.md,
                backgroundColor: 'transparent',
                color: COLORS.text.whiteSubtle,
                fontWeight: FONT_WEIGHTS.medium,
                cursor: 'pointer',
                marginBottom: SPACING.lg,
                fontSize: FONT_SIZES.sm,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: SPACING.sm,
                transition: `all ${TRANSITIONS.normal}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = COLORS.status.success;
                e.currentTarget.style.color = COLORS.status.success;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = COLORS.border.whiteTransparent;
                e.currentTarget.style.color = COLORS.text.whiteSubtle;
              }}
            >
              ➕ Add New Category
            </button>
          )}

          {/* Categories List */}
          <div>
            <h4 style={{
              margin: `0 0 ${SPACING.md} 0`,
              fontSize: FONT_SIZES.sm,
              color: COLORS.text.white,
              fontWeight: FONT_WEIGHTS.semibold,
            }}>
              Existing Categories
            </h4>

            {categories.length === 0 ? (
              <div style={{
                padding: SPACING['2xl'],
                textAlign: 'center',
                color: COLORS.text.whiteSubtle,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: BORDER_RADIUS.md,
              }}>
                No categories yet. Add your first category above.
              </div>
            ) : (
              categories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDeleting={deletingId === category.id}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CategoryManagementModal;
