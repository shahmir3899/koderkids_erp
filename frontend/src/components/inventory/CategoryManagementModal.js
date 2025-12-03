// ============================================
// CATEGORY MANAGEMENT MODAL
// ============================================
// Location: src/components/inventory/CategoryManagementModal.js

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { createCategory, updateCategory, deleteCategory } from '../../services/inventoryService';

// ============================================
// STYLES
// ============================================

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem',
};

const modalContentStyle = {
  backgroundColor: 'white',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '500px',
  maxHeight: '80vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

const modalHeaderStyle = {
  padding: '1.5rem',
  borderBottom: '1px solid #E5E7EB',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const modalBodyStyle = {
  padding: '1.5rem',
  overflowY: 'auto',
  flex: 1,
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
        padding: '1rem',
        backgroundColor: '#F0F9FF',
        borderRadius: '8px',
        marginBottom: '0.75rem',
        border: '1px solid #BAE6FD',
      }}>
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Category name"
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
          }}
          autoFocus
        />
        <input
          type="text"
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Description (optional)"
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            marginBottom: '0.75rem',
            fontSize: '0.875rem',
          }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#10B981',
              color: 'white',
              fontSize: '0.75rem',
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
      padding: '1rem',
      backgroundColor: '#F9FAFB',
      borderRadius: '8px',
      marginBottom: '0.75rem',
      border: '1px solid #E5E7EB',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontWeight: '500', 
          color: '#1F2937',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          🏷️ {category.name}
          {category.item_count !== undefined && (
            <span style={{
              fontSize: '0.75rem',
              padding: '0.125rem 0.5rem',
              backgroundColor: '#E0E7FF',
              color: '#3730A3',
              borderRadius: '9999px',
            }}>
              {category.item_count} items
            </span>
          )}
        </div>
        {category.description && (
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#6B7280', 
            marginTop: '0.25rem' 
          }}>
            {category.description}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => setIsEditing(true)}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#3B82F6',
            color: 'white',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          ✏️
        </button>
        <button
          onClick={() => onDelete(category.id)}
          disabled={isDeleting}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: isDeleting ? '#9CA3AF' : '#EF4444',
            color: 'white',
            fontSize: '0.75rem',
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

    setIsSubmitting(true);
    try {
      await createCategory({ 
        name: newName.trim(), 
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
    
    if (category?.item_count > 0) {
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

  return (
    <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalContentStyle}>
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <div style={modalHeaderStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1F2937' }}>
              🏷️ Manage Categories
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '0.875rem' }}>
              {categories.length} categories total
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '0.5rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* ============================================ */}
        {/* BODY */}
        {/* ============================================ */}
        <div style={modalBodyStyle}>
          {/* Add New Category Section */}
          {isAdding ? (
            <div style={{
              padding: '1rem',
              backgroundColor: '#F0FDF4',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #BBF7D0',
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: '#166534' }}>
                ➕ Add New Category
              </h4>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name *"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  marginBottom: '0.75rem',
                  fontSize: '0.875rem',
                }}
                autoFocus
              />
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                }}
              />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setNewName('');
                    setNewDescription('');
                  }}
                  disabled={isSubmitting}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: 'white',
                    color: '#374151',
                    fontWeight: '500',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={isSubmitting}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isSubmitting ? '#9CA3AF' : '#10B981',
                    color: 'white',
                    fontWeight: '500',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
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
                padding: '1rem',
                border: '2px dashed #D1D5DB',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: '#6B7280',
                fontWeight: '500',
                cursor: 'pointer',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#10B981';
                e.currentTarget.style.color = '#10B981';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#D1D5DB';
                e.currentTarget.style.color = '#6B7280';
              }}
            >
              ➕ Add New Category
            </button>
          )}

          {/* Categories List */}
          <div>
            <h4 style={{ 
              margin: '0 0 1rem 0', 
              fontSize: '0.875rem', 
              color: '#374151',
              fontWeight: '600',
            }}>
              Existing Categories
            </h4>
            
            {categories.length === 0 ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#9CA3AF',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
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
    </div>
  );
};

export default CategoryManagementModal;