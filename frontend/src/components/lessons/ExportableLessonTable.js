// ============================================
// EXPORTABLE LESSON TABLE - Hidden Table for Export
// ============================================
// Location: src/components/lessons/ExportableLessonTable.js

import React from 'react';

/**
 * ExportableLessonTable Component - Hidden table used for image/PDF/print exports
 * @param {Object} props
 * @param {Array} props.lessons - Array of lesson objects
 * @param {string} props.schoolName - School name for header
 * @param {string} props.className - Class name for header
 * @param {string} props.dateRange - Date range string for header
 * @param {Function} props.formatDate - Function to format date
 * @param {string} props.id - Element ID for export (default: 'lessonTableExport')
 * @param {string} props.logoSrc - Logo image source (default: '/logo.png')
 */
export const ExportableLessonTable = ({
  lessons = [],
  schoolName = '',
  className = '',
  dateRange = '',
  formatDate,
  id = 'lessonTableExport',
  logoSrc = '/logo.png',
}) => {
  const containerStyle = {
    position: 'absolute',
    left: '-9999px',
    top: 0,
    opacity: 0,
    visibility: 'hidden',
  };

  const exportContainerStyle = {
    width: '800px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#FFFFFF',
    padding: '20px',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  };

  const logoStyle = {
    width: '120px',
    marginRight: '20px',
  };

  const headerTextStyle = {
    textAlign: 'left',
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  };

  const subtitleStyle = {
    fontSize: '16px',
    color: '#666',
    marginTop: '5px',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  };

  const thStyle = {
    border: '1px solid #ddd',
    padding: '12px',
    textAlign: 'left',
    backgroundColor: '#f4f4f4',
    fontWeight: 'bold',
    color: '#333',
  };

  const tdStyle = {
    border: '1px solid #ddd',
    padding: '12px',
    textAlign: 'left',
    color: '#666',
  };

  return (
    <div style={containerStyle}>
      <div id={id} style={exportContainerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <img src={logoSrc} alt="School Logo" style={logoStyle} />
          <div style={headerTextStyle}>
            <h1 style={titleStyle}>Lesson Plan</h1>
            <p style={subtitleStyle}>
              {schoolName || 'School'} - Class {className || 'N/A'}
            </p>
            <p style={subtitleStyle}>{dateRange}</p>
          </div>
        </div>

        {/* Table */}
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Planned Topic</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson) => (
              <tr key={lesson.id}>
                <td style={tdStyle}>
                  {formatDate ? formatDate(lesson.session_date) : lesson.session_date}
                </td>
                <td style={tdStyle}>
                  {lesson.planned_topic || '(No topic planned)'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExportableLessonTable;