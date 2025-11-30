// ============================================
// STUDENT ACCORDION ITEM - Individual Student Row
// ============================================
// Location: src/components/progress/StudentAccordionItem.js

import React from 'react';
import { AttendanceButton } from '../common/ui/AttendanceButton';
import { ImageUploader } from '../common/ui/ImageUploader';

/**
 * StudentAccordionItem Component
 * Displays a single student row with attendance, achieved lesson, and image upload
 * 
 * @param {Object} props
 * @param {Object} props.student - Student object with id, name
 * @param {boolean} props.isExpanded - Whether the accordion is expanded
 * @param {Function} props.onToggle - Callback to toggle expansion
 * @param {string} props.attendanceStatus - Current attendance status
 * @param {Function} props.onAttendanceChange - Callback when attendance changes
 * @param {string} props.achievedLesson - Current achieved lesson text
 * @param {Function} props.onAchievedChange - Callback when achieved lesson changes
 * @param {string|Object} props.uploadedImage - Currently uploaded image
 * @param {Function} props.onImageUpload - Callback after image upload
 * @param {Function} props.onImageDelete - Callback after image delete
 * @param {Function} props.uploadHandler - Async function to handle image upload
 * @param {string} props.sessionDate - Current session date
 */
export const StudentAccordionItem = ({
  student,
  isExpanded,
  onToggle,
  attendanceStatus,
  onAttendanceChange,
  achievedLesson,
  onAchievedChange,
  uploadedImage,
  onImageUpload,
  onImageDelete,
  uploadHandler,
  sessionDate,
}) => {
  // Styles
  const accordionItemStyle = {
    marginBottom: '0.5rem',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    backgroundColor: isExpanded ? '#F3F4F6' : '#FFFFFF',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    borderBottom: isExpanded ? '1px solid #E5E7EB' : 'none',
  };

  const nameStyle = {
    fontSize: '0.95rem',
    fontWeight: '500',
    color: '#374151',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const headerActionsStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  };

  const toggleIconStyle = {
    fontSize: '0.75rem',
    color: '#6B7280',
    transition: 'transform 0.2s ease',
    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
  };

  const contentStyle = {
    padding: '1rem',
    backgroundColor: '#F9FAFB',
    display: isExpanded ? 'block' : 'none',
  };

  const formGroupStyle = {
    marginBottom: '1rem',
  };

  const labelStyle = {
    display: 'block',
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: '#374151',
    fontSize: '0.875rem',
  };

  const textareaStyle = {
    width: '100%',
    maxWidth: '400px',
    padding: '0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    resize: 'vertical',
    minHeight: '80px',
    transition: 'border-color 0.15s ease',
  };

  return (
    <div style={accordionItemStyle}>
      {/* Header */}
      <div
        style={headerStyle}
        onClick={onToggle}
        onMouseEnter={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.backgroundColor = '#F9FAFB';
          }
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }
        }}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <span style={nameStyle} title={student.name}>
          {student.name}
        </span>

        <div style={headerActionsStyle}>
          <AttendanceButton
            status={attendanceStatus}
            onChange={onAttendanceChange}
            size="medium"
          />
          <span style={toggleIconStyle}>▶</span>
        </div>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {/* Achieved Lesson */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>📝 Achieved Lesson:</label>
          <textarea
            value={achievedLesson || ''}
            onChange={(e) => onAchievedChange(e.target.value)}
            placeholder="Enter what the student achieved in this session..."
            style={textareaStyle}
            onFocus={(e) => {
              e.target.style.borderColor = '#3B82F6';
              e.target.style.outline = 'none';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#D1D5DB';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Image Upload */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>📷 Upload Image:</label>
          <ImageUploader
            studentId={student.id}
            sessionDate={sessionDate}
            uploadedImage={uploadedImage}
            onUpload={onImageUpload}
            onDelete={onImageDelete}
            uploadHandler={uploadHandler}
          />
        </div>
      </div>
    </div>
  );
};

export default StudentAccordionItem;