// ============================================
// COMPACT RICH TEXT EDITOR - For Table Cells
// ============================================
// Location: src/components/common/ui/CompactRichTextEditor.js
//
// A simplified version of RichTextEditor for use in table cells
// - Smaller default size
// - Expandable on focus
// - Inline toolbar (minimal)

import React, { useRef, useState, useCallback } from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
} from '../../../utils/designConstants';

/**
 * Parse text to HTML for display
 */
const parseToHTML = (text) => {
  if (!text) return '';

  let html = text
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/~(.*?)~/g, '<s>$1</s>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/```(.*?)```/g, '<code style="background:rgba(255,255,255,0.15);padding:2px 6px;border-radius:3px;font-size:0.85em;font-family:monospace;">$1</code>')
    .replace(/\n/g, '<br>');

  return html;
};

/**
 * CompactRichTextEditor Component
 * @param {Object} props
 * @param {string} props.value - Text value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Whether editor is disabled
 * @param {string} props.className - Additional CSS classes
 */
export const CompactRichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'Enter text...',
  disabled = false,
  className = '',
}) => {
  const textareaRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);

  /**
   * Apply formatting to selected text
   */
  const formatText = useCallback((type) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);

    const formats = {
      bold: { prefix: '*', suffix: '*' },
      italic: { prefix: '_', suffix: '_' },
      strike: { prefix: '~', suffix: '~' },
      code: { prefix: '```', suffix: '```' },
    };

    const format = formats[type];
    if (!format) return;

    const newText = 
      value.slice(0, start) + 
      format.prefix + 
      selected + 
      format.suffix + 
      value.slice(end);

    onChange(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + format.prefix.length + selected.length + format.suffix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange]);

  // Styles
  const containerStyle = {
    position: 'relative',
    width: '100%',
  };

  const textareaContainerStyle = {
    position: 'relative',
  };

  const textareaStyle = {
    width: '100%',
    minHeight: isFocused ? '80px' : '40px',
    maxHeight: '150px',
    padding: SPACING.xs,
    paddingTop: showToolbar ? '2rem' : SPACING.xs,
    border: `1px solid ${isFocused ? COLORS.border.whiteMedium : COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    fontFamily: 'inherit',
    resize: 'vertical',
    transition: `all ${TRANSITIONS.fast} ease`,
    outline: 'none',
    boxShadow: isFocused ? `0 0 0 3px rgba(59, 130, 246, 0.3)` : 'none',
    background: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
  };

  const toolbarStyle = {
    position: 'absolute',
    top: '2px',
    left: '2px',
    right: '2px',
    display: showToolbar ? 'flex' : 'none',
    gap: SPACING.xs,
    padding: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: `${BORDER_RADIUS.xs} ${BORDER_RADIUS.xs} 0 0`,
    zIndex: 10,
  };

  const toolbarButtonStyle = {
    padding: `${SPACING.xs} 0.375rem`,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    border: 'none',
    borderRadius: BORDER_RADIUS.xs,
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: COLORS.text.whiteMedium,
    transition: `all ${TRANSITIONS.fast} ease`,
  };

  const hintStyle = {
    position: 'absolute',
    bottom: '-1.25rem',
    left: 0,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    display: isFocused ? 'block' : 'none',
  };

  const previewStyle = {
    width: '100%',
    minHeight: '40px',
    padding: SPACING.xs,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    fontFamily: 'inherit',
    background: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    cursor: 'text',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  // Show preview when not focused and has value
  const showPreview = !isFocused && value;

  return (
    <div style={containerStyle} className={className}>
      <div style={textareaContainerStyle}>
        {/* Preview Mode - shows formatted text when not editing */}
        {showPreview && (
          <div
            style={previewStyle}
            onClick={() => textareaRef.current?.focus()}
            dangerouslySetInnerHTML={{ __html: parseToHTML(value) }}
          />
        )}

        {/* Mini Toolbar */}
        <div style={{ ...toolbarStyle, display: showToolbar && !showPreview ? 'flex' : 'none' }}>
          <button
            type="button"
            style={{ ...toolbarButtonStyle, fontWeight: 'bold' }}
            onClick={() => formatText('bold')}
            title="Bold (*text*)"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.color = COLORS.text.white;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = COLORS.text.whiteMedium;
            }}
          >
            B
          </button>
          <button
            type="button"
            style={{ ...toolbarButtonStyle, fontStyle: 'italic' }}
            onClick={() => formatText('italic')}
            title="Italic (_text_)"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.color = COLORS.text.white;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = COLORS.text.whiteMedium;
            }}
          >
            I
          </button>
          <button
            type="button"
            style={{ ...toolbarButtonStyle, textDecoration: 'line-through' }}
            onClick={() => formatText('strike')}
            title="Strikethrough (~text~)"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.color = COLORS.text.white;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = COLORS.text.whiteMedium;
            }}
          >
            S
          </button>
          <button
            type="button"
            style={{ ...toolbarButtonStyle, fontFamily: 'monospace' }}
            onClick={() => formatText('code')}
            title="Code (```text```)"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.color = COLORS.text.white;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = COLORS.text.whiteMedium;
            }}
          >
            {'</>'}
          </button>
        </div>

        {/* Textarea - hidden when showing preview */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{ ...textareaStyle, display: showPreview ? 'none' : 'block' }}
          onFocus={() => {
            setIsFocused(true);
            setShowToolbar(true);
          }}
          onBlur={() => {
            setIsFocused(false);
            // Delay hiding toolbar to allow button clicks
            setTimeout(() => setShowToolbar(false), 200);
          }}
        />

        {/* Hint */}
        <span style={hintStyle}>
          *bold* _italic_ ~strike~ ```code```
        </span>
      </div>
    </div>
  );
};

export default CompactRichTextEditor;