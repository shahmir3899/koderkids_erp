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

/**
 * Parse text to HTML for display
 */
const parseToHTML = (text) => {
  if (!text) return '';
  
  let html = text
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/~(.*?)~/g, '<s>$1</s>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/```(.*?)```/g, '<code style="background:#f0f0f0;padding:2px 4px;border-radius:3px;font-size:0.85em;">$1</code>')
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
    padding: '0.5rem',
    paddingTop: showToolbar ? '2rem' : '0.5rem',
    border: `1px solid ${isFocused ? '#3B82F6' : '#D1D5DB'}`,
    borderRadius: '0.375rem',
    fontSize: '0.8rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    transition: 'all 0.2s ease',
    outline: 'none',
    boxShadow: isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
  };

  const toolbarStyle = {
    position: 'absolute',
    top: '2px',
    left: '2px',
    right: '2px',
    display: showToolbar ? 'flex' : 'none',
    gap: '0.125rem',
    padding: '0.125rem',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
    borderRadius: '0.25rem 0.25rem 0 0',
    zIndex: 10,
  };

  const toolbarButtonStyle = {
    padding: '0.125rem 0.375rem',
    fontSize: '0.7rem',
    fontWeight: '600',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: '#6B7280',
    transition: 'all 0.15s ease',
  };

  const hintStyle = {
    position: 'absolute',
    bottom: '-1.25rem',
    left: 0,
    fontSize: '0.65rem',
    color: '#9CA3AF',
    display: isFocused ? 'block' : 'none',
  };

  return (
    <div style={containerStyle} className={className}>
      <div style={textareaContainerStyle}>
        {/* Mini Toolbar */}
        <div style={toolbarStyle}>
          <button
            type="button"
            style={{ ...toolbarButtonStyle, fontWeight: 'bold' }}
            onClick={() => formatText('bold')}
            title="Bold (*text*)"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E5E7EB';
              e.currentTarget.style.color = '#1F2937';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6B7280';
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
              e.currentTarget.style.backgroundColor = '#E5E7EB';
              e.currentTarget.style.color = '#1F2937';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6B7280';
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
              e.currentTarget.style.backgroundColor = '#E5E7EB';
              e.currentTarget.style.color = '#1F2937';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6B7280';
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
              e.currentTarget.style.backgroundColor = '#E5E7EB';
              e.currentTarget.style.color = '#1F2937';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6B7280';
            }}
          >
            {'</>'}
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={textareaStyle}
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