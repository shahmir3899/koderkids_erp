// ============================================
// RICH TEXT EDITOR - Text Editor with Formatting Toolbar
// ============================================
// Location: src/components/common/ui/RichTextEditor.js
//
// Features:
// - Bold, Italic, Strikethrough, Monospace formatting
// - Bullet and numbered lists
// - Line spacing options
// - Live HTML preview
// - Resizable textarea

import React, { useRef, useState, useCallback } from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../../utils/designConstants';

/**
 * Parse text to HTML for preview
 */
const parseToHTML = (text) => {
  let html = text
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>') // Bold
    .replace(/~(.*?)~/g, '<s>$1</s>') // Strikethrough
    .replace(/_(.*?)_/g, '<em>$1</em>') // Italic
    .replace(/```(.*?)```/g, '<code style="background:rgba(255,255,255,0.15);padding:2px 4px;border-radius:3px;">$1</code>') // Monospace
    .replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>') // Bulleted list
    .replace(/^\s*(\d+)\.\s+(.*)$/gm, "<li value='$1'>$2</li>") // Numbered list
    .replace(/\n/g, '<br>'); // New lines

  // Wrap lists
  html = html.replace(/<li>(.*?)<\/li>/g, (match) => {
    if (match.startsWith("<li value=")) return `<ol>${match}</ol>`;
    return `<ul style="margin-left:20px;">${match}</ul>`;
  });

  return html;
};

/**
 * RichTextEditor Component
 * @param {Object} props
 * @param {string} props.value - Text value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.label - Label text
 * @param {boolean} props.showPreview - Show live preview (default: true)
 * @param {boolean} props.showLineSpacing - Show line spacing control (default: true)
 * @param {string} props.lineSpacing - Line spacing value ('single', '1.5', 'double')
 * @param {Function} props.onLineSpacingChange - Line spacing change handler
 * @param {number} props.minHeight - Minimum height in pixels (default: 200)
 * @param {number} props.maxHeight - Maximum height in pixels (default: 600)
 * @param {boolean} props.required - Whether field is required
 * @param {string} props.className - Additional CSS classes
 */
export const RichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'Enter text...',
  label = '',
  showPreview = true,
  showLineSpacing = true,
  lineSpacing = 'single',
  onLineSpacingChange,
  minHeight = 200,
  maxHeight = 600,
  required = false,
  className = '',
}) => {
  const textareaRef = useRef(null);
  const [textAreaHeight, setTextAreaHeight] = useState(256);

  /**
   * Apply formatting to selected text
   */
  const formatText = useCallback(
    (type) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.slice(start, end);
      let replacement = selected;
      let marker;

      switch (type) {
        case 'bold':
          marker = '*';
          replacement = `${marker}${selected}${marker}`;
          break;
        case 'italic':
          marker = '_';
          replacement = `${marker}${selected}${marker}`;
          break;
        case 'strike':
          marker = '~';
          replacement = `${marker}${selected}${marker}`;
          break;
        case 'mono':
          marker = '```';
          replacement = `${marker}${selected}${marker}`;
          break;
        case 'bullet':
          if (selected) {
            replacement = selected
              .split('\n')
              .map((line) => (line ? `- ${line}` : ''))
              .join('\n');
          } else {
            replacement = '- ';
          }
          break;
        case 'number':
          if (selected) {
            replacement = selected
              .split('\n')
              .map((line, i) => (line ? `${i + 1}. ${line}` : ''))
              .join('\n');
          } else {
            replacement = '1. ';
          }
          break;
        case 'newline':
          replacement = '\n';
          break;
        case 'emptyline':
          replacement = '\n\n';
          break;
        default:
          return;
      }

      const newText = value.slice(0, start) + replacement + value.slice(end);
      onChange(newText);

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        if (type === 'bold' || type === 'italic' || type === 'strike' || type === 'mono') {
          textarea.selectionStart = start + marker.length;
          textarea.selectionEnd = start + replacement.length - marker.length;
        } else {
          textarea.selectionStart = textarea.selectionEnd = start + replacement.length;
        }
      }, 0);
    },
    [value, onChange]
  );

  // Styles
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
  };

  const editorContainerStyle = {
    display: showPreview ? 'grid' : 'block',
    gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr',
    gap: SPACING.sm,
  };

  const toolbarStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.xs,
    ...MIXINS.glassmorphicSubtle,
    borderBottom: 'none',
    borderRadius: `${BORDER_RADIUS.sm} ${BORDER_RADIUS.sm} 0 0`,
  };

  const toolbarButtonStyle = {
    padding: `${SPACING.xs} 0.625rem`,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: BORDER_RADIUS.xs,
    cursor: 'pointer',
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    transition: `background-color ${TRANSITIONS.fast} ease`,
  };

  const textareaStyle = {
    width: '100%',
    height: `${textAreaHeight}px`,
    padding: SPACING.sm,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: `0 0 ${BORDER_RADIUS.sm} ${BORDER_RADIUS.sm}`,
    fontSize: FONT_SIZES.sm,
    fontFamily: 'inherit',
    resize: 'none',
    outline: 'none',
    color: COLORS.text.white,
    transition: `border-color ${TRANSITIONS.fast} ease`,
  };

  const previewStyle = {
    height: `${textAreaHeight}px`,
    padding: SPACING.sm,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'auto',
    fontSize: FONT_SIZES.sm,
    lineHeight: '1.6',
    color: COLORS.text.white,
  };

  const labelStyle = {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
  };

  const selectStyle = {
    padding: `${SPACING.xs} ${SPACING.xs}`,
    ...MIXINS.glassmorphicSelect,
    borderRadius: BORDER_RADIUS.xs,
    fontSize: FONT_SIZES.xs,
    cursor: 'pointer',
    color: COLORS.text.white,
  };

  const sliderContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
    marginLeft: 'auto',
  };

  return (
    <div style={containerStyle} className={className}>
      {/* Label */}
      {label && (
        <label style={labelStyle}>
          {label}
          {required && <span style={{ color: COLORS.status.error, marginLeft: '4px' }}>*</span>}
        </label>
      )}

      <div style={editorContainerStyle}>
        {/* Editor Section */}
        <div>
          {/* Toolbar */}
          <div style={toolbarStyle}>
            <button
              type="button"
              onClick={() => formatText('bold')}
              style={toolbarButtonStyle}
              title="Bold (*text*)"
              onMouseEnter={(e) => (e.target.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              onClick={() => formatText('italic')}
              style={toolbarButtonStyle}
              title="Italic (_text_)"
              onMouseEnter={(e) => (e.target.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
            >
              <em>I</em>
            </button>
            <button
              type="button"
              onClick={() => formatText('strike')}
              style={toolbarButtonStyle}
              title="Strikethrough (~text~)"
              onMouseEnter={(e) => (e.target.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
            >
              <s>S</s>
            </button>
            <button
              type="button"
              onClick={() => formatText('mono')}
              style={toolbarButtonStyle}
              title="Monospace (```text```)"
              onMouseEnter={(e) => (e.target.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
            >
              <code style={{ fontFamily: 'monospace' }}>M</code>
            </button>

            <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.2)', margin: `0 ${SPACING.xs}` }} />

            <button
              type="button"
              onClick={() => formatText('bullet')}
              style={toolbarButtonStyle}
              title="Bullet List"
              onMouseEnter={(e) => (e.target.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
            >
              •
            </button>
            <button
              type="button"
              onClick={() => formatText('number')}
              style={toolbarButtonStyle}
              title="Numbered List"
              onMouseEnter={(e) => (e.target.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
            >
              1.
            </button>

            <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.2)', margin: `0 ${SPACING.xs}` }} />

            <button
              type="button"
              onClick={() => formatText('newline')}
              style={toolbarButtonStyle}
              title="New Line"
              onMouseEnter={(e) => (e.target.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
            >
              ↵
            </button>
            <button
              type="button"
              onClick={() => formatText('emptyline')}
              style={toolbarButtonStyle}
              title="Empty Line"
              onMouseEnter={(e) => (e.target.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
            >
              ⏎
            </button>

            {/* Line Spacing */}
            {showLineSpacing && onLineSpacingChange && (
              <>
                <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.2)', margin: `0 ${SPACING.xs}` }} />
                <select
                  value={lineSpacing}
                  onChange={(e) => onLineSpacingChange(e.target.value)}
                  style={selectStyle}
                  title="Line Spacing"
                >
                  <option value="single" style={MIXINS.selectOption}>Single</option>
                  <option value="1.5" style={MIXINS.selectOption}>1.5</option>
                  <option value="double" style={MIXINS.selectOption}>Double</option>
                </select>
              </>
            )}

            {/* Height Slider */}
            <div style={sliderContainerStyle}>
              <span style={{ fontSize: FONT_SIZES.xs, color: COLORS.text.white }}>Height:</span>
              <input
                type="range"
                min={minHeight}
                max={maxHeight}
                value={textAreaHeight}
                onChange={(e) => setTextAreaHeight(parseInt(e.target.value))}
                style={{ width: '80px', cursor: 'pointer' }}
                title="Adjust Text Area Height"
              />
              <span style={{ fontSize: FONT_SIZES.xs, color: COLORS.text.white }}>{textAreaHeight}px</span>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={textareaStyle}
            required={required}
            onFocus={(e) => (e.target.style.borderColor = COLORS.status.info)}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.18)')}
          />
        </div>

        {/* Preview Section */}
        {showPreview && (
          <div>
            <div
              style={{
                ...labelStyle,
                padding: SPACING.xs,
                ...MIXINS.glassmorphicSubtle,
                borderRadius: `${BORDER_RADIUS.sm} ${BORDER_RADIUS.sm} 0 0`,
                borderBottom: 'none',
              }}
            >
              Preview
            </div>
            <div style={previewStyle} dangerouslySetInnerHTML={{ __html: parseToHTML(value) }} />
          </div>
        )}
      </div>

      {/* Help Text */}
      <div style={{ fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.7)' }}>
        Use *bold*, _italic_, ~strike~, ```mono``` for formatting. Use - or 1. for lists.
      </div>
    </div>
  );
};

export default RichTextEditor;