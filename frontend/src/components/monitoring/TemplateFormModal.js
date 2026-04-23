import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPlus, faTrash, faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';

import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';
import { createTemplate, updateTemplate } from '../../services/monitoringService';

// ============================================
// CONSTANTS
// ============================================

const FIELD_TYPE_OPTIONS = [
  { value: 'rating_1_5', label: 'Rating 1–5' },
  { value: 'rating_1_10', label: 'Rating 1–10' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown Select' },
];

const EMPTY_FIELD = () => ({
  _key: Math.random().toString(36).slice(2),
  label: '',
  field_type: 'rating_1_5',
  is_required: true,
  weight: '1.00',
  options: [],
  order: 0,
});

// ============================================
// STYLES
// ============================================

const overlay = {
  position: 'fixed',
  inset: 0,
  zIndex: 10000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.6)',
  backdropFilter: 'blur(4px)',
  padding: SPACING.lg,
};

const modalBox = {
  ...MIXINS.glassmorphicCard,
  borderRadius: BORDER_RADIUS['2xl'],
  width: '100%',
  maxWidth: 700,
  maxHeight: '90vh',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.xl,
  padding: SPACING['2xl'],
};

const inputStyle = {
  width: '100%',
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: BORDER_RADIUS.lg,
  color: COLORS.text.white,
  fontSize: FONT_SIZES.sm,
  padding: `${SPACING.sm} ${SPACING.md}`,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: FONT_SIZES.xs,
  fontWeight: FONT_WEIGHTS.semibold,
  color: COLORS.text.whiteSubtle,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: SPACING.xs,
};

const btnBase = {
  border: 'none',
  borderRadius: BORDER_RADIUS.lg,
  cursor: 'pointer',
  fontSize: FONT_SIZES.sm,
  fontWeight: FONT_WEIGHTS.semibold,
  padding: `${SPACING.sm} ${SPACING.lg}`,
  transition: `all ${TRANSITIONS.fast}`,
};

// ============================================
// FIELD ROW
// ============================================

const FieldRow = ({ field, index, total, onChange, onRemove, onMove }) => {
  const handleChange = (key, value) => onChange(field._key, key, value);

  const isSelectType = field.field_type === 'select';

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.06)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.lg,
      display: 'flex',
      flexDirection: 'column',
      gap: SPACING.md,
    }}>
      {/* Row header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text.whiteMedium }}>
          Field {index + 1}
        </span>
        <div style={{ display: 'flex', gap: SPACING.sm }}>
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(index, 'up')}
            title="Move up"
            style={{
              ...btnBase,
              padding: `${SPACING.xs} ${SPACING.sm}`,
              background: index === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)',
              color: index === 0 ? 'rgba(255,255,255,0.3)' : COLORS.text.whiteMedium,
            }}
          >
            <FontAwesomeIcon icon={faArrowUp} />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove(index, 'down')}
            title="Move down"
            style={{
              ...btnBase,
              padding: `${SPACING.xs} ${SPACING.sm}`,
              background: index === total - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)',
              color: index === total - 1 ? 'rgba(255,255,255,0.3)' : COLORS.text.whiteMedium,
            }}
          >
            <FontAwesomeIcon icon={faArrowDown} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(field._key)}
            title="Remove field"
            style={{
              ...btnBase,
              padding: `${SPACING.xs} ${SPACING.sm}`,
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#F87171',
            }}
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      </div>

      {/* Label + Type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.md }}>
        <div>
          <label style={labelStyle}>Label *</label>
          <input
            style={inputStyle}
            value={field.label}
            placeholder="e.g. Classroom Management"
            onChange={(e) => handleChange('label', e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Field Type</label>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={field.field_type}
            onChange={(e) => handleChange('field_type', e.target.value)}
          >
            {FIELD_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} style={{ background: '#1e1e2e' }}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Weight + Required */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.md }}>
        <div>
          <label style={labelStyle}>Score Weight</label>
          <input
            style={inputStyle}
            type="number"
            min="0"
            step="0.5"
            value={field.weight}
            placeholder="1.00"
            onChange={(e) => handleChange('weight', e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: SPACING.xs }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={field.is_required}
              onChange={(e) => handleChange('is_required', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: COLORS.primary }}
            />
            <span style={{ fontSize: FONT_SIZES.sm, color: COLORS.text.whiteMedium }}>Required</span>
          </label>
        </div>
      </div>

      {/* Options — only for select type */}
      {isSelectType && (
        <div>
          <label style={labelStyle}>Options (one per line)</label>
          <textarea
            style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
            value={(field.options || []).join('\n')}
            placeholder="Good&#10;Average&#10;Poor"
            onChange={(e) =>
              handleChange('options', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))
            }
          />
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN MODAL
// ============================================

const TemplateFormModal = ({ isOpen, onClose, onSuccess, mode = 'create', initialTemplate = null }) => {
  const isEdit = mode === 'edit' && !!initialTemplate;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState([EMPTY_FIELD()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      if (isEdit && initialTemplate) {
        setName(initialTemplate.name || '');
        setDescription(initialTemplate.description || '');
        const existingFields = (initialTemplate.fields || []).map((f) => ({
          ...f,
          _key: f.id ? `existing-${f.id}` : Math.random().toString(36).slice(2),
          weight: String(f.weight ?? '0.00'),
          options: Array.isArray(f.options) ? f.options : [],
        }));
        setFields(existingFields.length > 0 ? existingFields : [EMPTY_FIELD()]);
      } else {
        setName('');
        setDescription('');
        setFields([EMPTY_FIELD()]);
      }
      setError('');
    }
  }, [isOpen, isEdit, initialTemplate]);

  const handleFieldChange = (key, prop, value) => {
    setFields((prev) => prev.map((f) => f._key === key ? { ...f, [prop]: value } : f));
  };

  const handleAddField = () => {
    setFields((prev) => [...prev, EMPTY_FIELD()]);
  };

  const handleRemoveField = (key) => {
    setFields((prev) => prev.filter((f) => f._key !== key));
  };

  const handleMoveField = (index, direction) => {
    setFields((prev) => {
      const next = [...prev];
      const swapIdx = direction === 'up' ? index - 1 : index + 1;
      [next[index], next[swapIdx]] = [next[swapIdx], next[index]];
      return next;
    });
  };

  const validate = () => {
    if (!name.trim()) { setError('Template name is required.'); return false; }
    if (fields.length === 0) { setError('Add at least one field.'); return false; }
    for (const f of fields) {
      if (!f.label.trim()) { setError('All fields must have a label.'); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        fields: fields.map((f, i) => ({
          label: f.label.trim(),
          field_type: f.field_type,
          is_required: f.is_required,
          weight: parseFloat(f.weight) || 0,
          order: i,
          options: f.options || [],
          ...(f.id ? { id: f.id } : {}),
        })),
      };

      if (isEdit) {
        await updateTemplate(initialTemplate.id, payload);
        toast.success('Template updated successfully');
      } else {
        await createTemplate(payload);
        toast.success('Template created successfully');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.name?.[0] ||
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        'Failed to save template. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.bold, color: COLORS.text.white }}>
            {isEdit ? 'Edit Template' : 'New Evaluation Template'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xl }}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Template meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
          <div>
            <label style={labelStyle}>Template Name *</label>
            <input
              style={inputStyle}
              value={name}
              placeholder="e.g. Standard Teacher Evaluation"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
              value={description}
              placeholder="Brief description of when to use this template"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Fields */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
            <h3 style={{ margin: 0, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text.white }}>
              Evaluation Fields ({fields.length})
            </h3>
            <button
              type="button"
              onClick={handleAddField}
              style={{ ...btnBase, background: 'rgba(99, 102, 241, 0.25)', color: '#818CF8' }}
            >
              <FontAwesomeIcon icon={faPlus} style={{ marginRight: SPACING.xs }} />
              Add Field
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
            {fields.map((field, i) => (
              <FieldRow
                key={field._key}
                field={field}
                index={i}
                total={fields.length}
                onChange={handleFieldChange}
                onRemove={handleRemoveField}
                onMove={handleMoveField}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: BORDER_RADIUS.lg,
            padding: `${SPACING.sm} ${SPACING.md}`,
            color: '#F87171',
            fontSize: FONT_SIZES.sm,
          }}>
            {error}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: SPACING.md }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ ...btnBase, background: 'rgba(255,255,255,0.08)', color: COLORS.text.whiteMedium }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ ...btnBase, background: 'rgba(99, 102, 241, 0.5)', color: '#fff', minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm }}
          >
            {isSubmitting
              ? <ClipLoader size={14} color="#fff" />
              : (isEdit ? 'Save Changes' : 'Create Template')
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TemplateFormModal;
