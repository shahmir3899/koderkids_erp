import React from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../utils/designConstants';

// ============================================
// RATING LABELS
// ============================================

const RATING_1_5_LABELS = ['Poor', 'Below Average', 'Average', 'Good', 'Excellent'];
const RATING_1_10_LABELS = {
  1: 'Poor',
  4: 'Below Average',
  6: 'Average',
  8: 'Good',
  10: 'Excellent',
};

// ============================================
// FIELD RENDERERS
// ============================================

const Rating1to5Field = ({ field, value, onChange }) => {
  const currentValue = value?.numeric_value ? parseInt(value.numeric_value) : 0;

  return (
    <div style={styles.ratingContainer}>
      <div style={styles.ratingButtonGroup}>
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            style={styles.ratingButton(num === currentValue, num)}
            onClick={() => onChange(field.id, RATING_1_5_LABELS[num - 1], num)}
            onMouseEnter={(e) => {
              if (num !== currentValue) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (num !== currentValue) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <span style={styles.ratingNumber}>{num}</span>
            <span style={styles.ratingLabel}>{RATING_1_5_LABELS[num - 1]}</span>
          </button>
        ))}
      </div>
      {currentValue > 0 && (
        <div style={styles.selectedValueBadge}>
          Selected: {currentValue} - {RATING_1_5_LABELS[currentValue - 1]}
        </div>
      )}
    </div>
  );
};

const Rating1to10Field = ({ field, value, onChange }) => {
  const currentValue = value?.numeric_value ? parseInt(value.numeric_value) : 1;
  const hasValue = value?.numeric_value !== undefined && value?.numeric_value !== null;

  const getSliderLabel = (val) => {
    if (val <= 2) return 'Poor';
    if (val <= 4) return 'Below Average';
    if (val <= 6) return 'Average';
    if (val <= 8) return 'Good';
    return 'Excellent';
  };

  const getSliderColor = (val) => {
    if (val <= 2) return COLORS.status.error;
    if (val <= 4) return COLORS.status.warning;
    if (val <= 6) return '#F59E0B';
    if (val <= 8) return COLORS.status.success;
    return '#10B981';
  };

  return (
    <div style={styles.sliderContainer}>
      <div style={styles.sliderHeader}>
        <span style={styles.sliderValue(getSliderColor(hasValue ? currentValue : 0))}>
          {hasValue ? currentValue : '-'} / 10
        </span>
        {hasValue && (
          <span style={styles.sliderLabelText(getSliderColor(currentValue))}>
            {getSliderLabel(currentValue)}
          </span>
        )}
      </div>
      <div style={styles.sliderTrackContainer}>
        <input
          type="range"
          min="1"
          max="10"
          value={hasValue ? currentValue : 5}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            onChange(field.id, getSliderLabel(val), val);
          }}
          style={styles.sliderInput}
        />
        <div style={styles.sliderTickMarks}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <span
              key={num}
              style={styles.sliderTick(num === (hasValue ? currentValue : 0))}
            >
              {num}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const TextField = ({ field, value, onChange }) => {
  return (
    <input
      type="text"
      style={styles.textInput}
      value={value?.value || ''}
      placeholder={`Enter ${field.label.toLowerCase()}...`}
      onChange={(e) => onChange(field.id, e.target.value, null)}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.6)';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
};

const TextareaField = ({ field, value, onChange }) => {
  return (
    <textarea
      style={styles.textareaInput}
      value={value?.value || ''}
      placeholder={`Enter ${field.label.toLowerCase()}...`}
      rows={4}
      onChange={(e) => onChange(field.id, e.target.value, null)}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.6)';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
};

const YesNoField = ({ field, value, onChange }) => {
  const currentValue = value?.numeric_value !== undefined && value?.numeric_value !== null
    ? String(value.numeric_value)
    : null;

  return (
    <div style={styles.yesNoContainer}>
      <button
        type="button"
        style={styles.yesNoButton(currentValue === '1', true)}
        onClick={() => onChange(field.id, 'Yes', '1')}
        onMouseEnter={(e) => {
          if (currentValue !== '1') {
            e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (currentValue !== '1') {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        Yes
      </button>
      <button
        type="button"
        style={styles.yesNoButton(currentValue === '0', false)}
        onClick={() => onChange(field.id, 'No', '0')}
        onMouseEnter={(e) => {
          if (currentValue !== '0') {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (currentValue !== '0') {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        No
      </button>
    </div>
  );
};

const SelectField = ({ field, value, onChange }) => {
  const options = Array.isArray(field.options) ? field.options : [];

  return (
    <select
      style={styles.selectInput}
      value={value?.value || ''}
      onChange={(e) => onChange(field.id, e.target.value, null)}
    >
      <option value="" style={styles.selectOption}>-- Select --</option>
      {options.map((opt, idx) => (
        <option key={idx} value={typeof opt === 'object' ? opt.value : opt} style={styles.selectOption}>
          {typeof opt === 'object' ? opt.label : opt}
        </option>
      ))}
    </select>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const DynamicFormRenderer = ({ fields, values, onChange, errors }) => {
  if (!fields || fields.length === 0) {
    return (
      <div style={styles.emptyState}>
        No form fields available for this template.
      </div>
    );
  }

  const renderField = (field) => {
    const fieldValue = values?.[field.id] || {};
    const fieldError = errors?.[field.id];

    switch (field.field_type) {
      case 'rating_1_5':
        return <Rating1to5Field field={field} value={fieldValue} onChange={onChange} />;
      case 'rating_1_10':
        return <Rating1to10Field field={field} value={fieldValue} onChange={onChange} />;
      case 'text':
        return <TextField field={field} value={fieldValue} onChange={onChange} />;
      case 'textarea':
        return <TextareaField field={field} value={fieldValue} onChange={onChange} />;
      case 'yes_no':
        return <YesNoField field={field} value={fieldValue} onChange={onChange} />;
      case 'select':
        return <SelectField field={field} value={fieldValue} onChange={onChange} />;
      default:
        return (
          <div style={styles.unsupportedField}>
            Unsupported field type: {field.field_type}
          </div>
        );
    }
  };

  const isRatingField = (type) => type === 'rating_1_5' || type === 'rating_1_10';

  return (
    <div style={styles.formContainer}>
      {fields.map((field, index) => (
        <div key={field.id} style={styles.fieldWrapper(index === fields.length - 1)}>
          <div style={styles.fieldHeader}>
            <label style={styles.fieldLabel}>
              {field.label}
              {field.is_required && <span style={styles.requiredIndicator}> *</span>}
            </label>
            {isRatingField(field.field_type) && field.weight > 0 && (
              <span style={styles.weightBadge}>
                Weight: {field.weight}
              </span>
            )}
          </div>

          {renderField(field)}

          {errors?.[field.id] && (
            <div style={styles.errorMessage}>
              {errors[field.id]}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ============================================
// STYLES
// ============================================

const styles = {
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
  },

  fieldWrapper: (isLast) => ({
    padding: `${SPACING.lg} 0`,
    borderBottom: isLast ? 'none' : `1px solid rgba(255, 255, 255, 0.08)`,
  }),

  fieldHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },

  fieldLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    letterSpacing: '0.01em',
  },

  requiredIndicator: {
    color: '#FCA5A5',
    fontWeight: FONT_WEIGHTS.bold,
  },

  weightBadge: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: 'rgba(255, 255, 255, 0.7)',
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.full,
    border: '1px solid rgba(139, 92, 246, 0.3)',
  },

  errorMessage: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.xs,
    color: '#FCA5A5',
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: BORDER_RADIUS.sm,
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },

  emptyState: {
    textAlign: 'center',
    padding: SPACING['2xl'],
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },

  unsupportedField: {
    padding: SPACING.md,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: BORDER_RADIUS.md,
    color: '#FCD34D',
    fontSize: FONT_SIZES.sm,
    border: '1px solid rgba(245, 158, 11, 0.3)',
  },

  // Rating 1-5 styles
  ratingContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },

  ratingButtonGroup: {
    display: 'flex',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },

  ratingButton: (isActive, num) => {
    const getActiveColor = (n) => {
      if (n <= 2) return { bg: 'rgba(239, 68, 68, 0.3)', border: 'rgba(239, 68, 68, 0.5)', shadow: 'rgba(239, 68, 68, 0.3)' };
      if (n === 3) return { bg: 'rgba(245, 158, 11, 0.3)', border: 'rgba(245, 158, 11, 0.5)', shadow: 'rgba(245, 158, 11, 0.3)' };
      if (n === 4) return { bg: 'rgba(59, 130, 246, 0.3)', border: 'rgba(59, 130, 246, 0.5)', shadow: 'rgba(59, 130, 246, 0.3)' };
      return { bg: 'rgba(16, 185, 129, 0.3)', border: 'rgba(16, 185, 129, 0.5)', shadow: 'rgba(16, 185, 129, 0.3)' };
    };

    const activeColors = getActiveColor(num);

    return {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: SPACING.xs,
      padding: `${SPACING.md} ${SPACING.lg}`,
      minWidth: '80px',
      flex: '1 1 80px',
      border: isActive
        ? `2px solid ${activeColors.border}`
        : '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: isActive ? activeColors.bg : 'rgba(255, 255, 255, 0.08)',
      color: COLORS.text.white,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
      boxShadow: isActive ? `0 4px 12px ${activeColors.shadow}` : 'none',
    };
  },

  ratingNumber: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },

  ratingLabel: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },

  selectedValueBadge: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
    paddingLeft: SPACING.xs,
  },

  // Slider (Rating 1-10) styles
  sliderContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
  },

  sliderHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
  },

  sliderValue: (color) => ({
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: color || COLORS.text.white,
  }),

  sliderLabelText: (color) => ({
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: color || 'rgba(255, 255, 255, 0.7)',
    backgroundColor: `${color}22`,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.full,
  }),

  sliderTrackContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },

  sliderInput: {
    width: '100%',
    height: '8px',
    WebkitAppearance: 'none',
    appearance: 'none',
    background: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.full,
    outline: 'none',
    cursor: 'pointer',
    accentColor: '#8B5CF6',
  },

  sliderTickMarks: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingLeft: '2px',
    paddingRight: '2px',
  },

  sliderTick: (isActive) => ({
    fontSize: FONT_SIZES.xs,
    color: isActive ? COLORS.text.white : 'rgba(255, 255, 255, 0.4)',
    fontWeight: isActive ? FONT_WEIGHTS.bold : FONT_WEIGHTS.normal,
    width: '20px',
    textAlign: 'center',
  }),

  // Text input styles
  textInput: {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: COLORS.text.white,
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },

  // Textarea styles
  textareaInput: {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: COLORS.text.white,
    outline: 'none',
    transition: 'all 0.2s ease',
    resize: 'vertical',
    minHeight: '100px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },

  // Yes/No toggle styles
  yesNoContainer: {
    display: 'flex',
    gap: SPACING.md,
  },

  yesNoButton: (isActive, isYes) => ({
    flex: 1,
    padding: `${SPACING.md} ${SPACING.xl}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    border: isActive
      ? `2px solid ${isYes ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'}`
      : '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: isActive
      ? (isYes ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)')
      : 'rgba(255, 255, 255, 0.08)',
    color: isActive
      ? (isYes ? '#6EE7B7' : '#FCA5A5')
      : COLORS.text.white,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
    boxShadow: isActive
      ? `0 4px 12px ${isYes ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
      : 'none',
  }),

  // Select dropdown styles
  selectInput: {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    outline: 'none',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23FFFFFF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1.25rem',
    paddingRight: '2.5rem',
  },

  selectOption: {
    backgroundColor: '#1e293b',
    color: COLORS.text.white,
    padding: SPACING.sm,
  },
};

export default DynamicFormRenderer;
