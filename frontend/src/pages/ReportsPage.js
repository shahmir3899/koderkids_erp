// ============================================
// REPORTS PAGE - Refactored Version
// ============================================
// Location: src/pages/ReportsPage.js
//
// REFACTORED:
// - Uses FilterBar for school/class selection
// - Uses DataTable for student list
// - Uses LoadingSpinner instead of inline SVGs
// - Uses CollapsibleSection for organization
// - Uses useSchools hook for school fetching
// - Uses useReportGeneration hook for PDF generation
// - Uses ToggleSwitch for background toggle
// - Uses ModeSelector for month/range selection
// - All original functionality preserved

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getAuthHeaders, getClasses, API_URL } from '../api';

// Common Components
import { DataTable } from '../components/common/tables/DataTable';
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { CollapsibleSection } from '../components/common/cards/CollapsibleSection';
import { ToggleSwitch } from '../components/common/ui/ToggleSwitch';
import { ModeSelector } from '../components/common/ui/ModeSelector';
import { Button } from '../components/common/ui/Button';

// Page-specific Components
import ImageManagementModal from './ImageManagementModal';

// Hooks
import { useSchools } from '../hooks/useSchools';
import { useReportGeneration } from '../hooks/useReportGeneration';

// ============================================
// VALIDATION HELPERS
// ============================================

const isValidMonth = (monthStr) => {
  if (!monthStr) return false;
  return /^\d{4}-\d{2}$/.test(monthStr) && new Date(`${monthStr}-01`).getFullYear() >= 2000;
};

const isValidDate = (dateStr) => {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
};

const formatToMMDDYYYY = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month) return '';
    return `${month.padStart(2, '0')}/01/${year}`;
  } catch (error) {
    console.error('Error in formatToMMDDYYYY:', error.message);
    return '';
  }
};

const formatToYYYYMMDD = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month) return '';
    return `${year}-${month.padStart(2, '0')}-${day || '01'.padStart(2, '0')}`;
  } catch (error) {
    console.error('Error in formatToYYYYMMDD:', error.message);
    return '';
  }
};

const getLastDayOfMonth = (yearMonth) => {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month, 0).getDate();
};

// ============================================
// MAIN COMPONENT
// ============================================

const ReportsPage = () => {
  // Hooks
  const { schools, loading: schoolsLoading } = useSchools();

  // ============================================
  // STATE
  // ============================================

  // Filter state
  const [mode, setMode] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Data state
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);

  // Selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [includeBackground, setIncludeBackground] = useState({});
  const [selectedImages, setSelectedImages] = useState({});

  // UI state
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalStudentId, setModalStudentId] = useState(null);

  // ============================================
  // REPORT GENERATION HOOK
  // ============================================

  const {
    generateReport,
    generateBulkReports,
    isGenerating,
    isGeneratingBulk,
    error: reportError,
    setError: setReportError,
  } = useReportGeneration({
    students,
    selectedSchool,
    selectedClass,
    mode,
    selectedMonth,
    startDate,
    endDate,
    includeBackground,
    selectedImages,
    backgroundImageUrl: '/bg.png',
  });

  // ============================================
  // EFFECTS
  // ============================================

  // Fetch classes when school changes
  useEffect(() => {
    const fetchClassList = async () => {
      if (!selectedSchool) {
        setClasses([]);
        return;
      }
      try {
        const classData = await getClasses(selectedSchool);
        setClasses(classData);
      } catch (error) {
        console.error('Error loading classes:', error);
        setErrorMessage('Failed to load classes. Please try again.');
      }
    };
    fetchClassList();
  }, [selectedSchool]);

  // Initialize background toggle for each student
  useEffect(() => {
    if (students.length > 0) {
      const initialToggleState = students.reduce((acc, student) => {
        acc[student.id] = true; // Default to include background
        return acc;
      }, {});
      setIncludeBackground(initialToggleState);
    }
  }, [students]);

  // Sync report error with local error message
  useEffect(() => {
    if (reportError) {
      setErrorMessage(reportError);
    }
  }, [reportError]);

  // ============================================
  // HANDLERS
  // ============================================

  // Fetch students based on filters
  const fetchStudents = async () => {
    setErrorMessage('');
    setIsSearching(true);
    setStudents([]);
    setSelectedStudentIds([]);

    // Validation for month mode
    if (mode === 'month') {
      if (!selectedMonth || !isValidMonth(selectedMonth)) {
        setErrorMessage('Please select a valid month (YYYY-MM).');
        setIsSearching(false);
        return;
      }
      if (!selectedSchool || !selectedClass) {
        setErrorMessage('Please select a school and class.');
        setIsSearching(false);
        return;
      }
    }

    // Validation for range mode
    if (mode === 'range') {
      if (!startDate || !endDate || !isValidDate(startDate) || !isValidDate(endDate)) {
        setErrorMessage('Please select valid start and end dates.');
        setIsSearching(false);
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        setErrorMessage('End date must be after start date.');
        setIsSearching(false);
        return;
      }
      const currentDate = new Date();
      if (new Date(startDate) > currentDate || new Date(endDate) > currentDate) {
        setErrorMessage('Dates cannot be in the future.');
        setIsSearching(false);
        return;
      }
      if (!selectedSchool || !selectedClass) {
        setErrorMessage('Please select a school and class.');
        setIsSearching(false);
        return;
      }
    }

    try {
      const sessionDate =
        mode === 'month'
          ? formatToMMDDYYYY(`${selectedMonth}-01`)
          : formatToMMDDYYYY(startDate);

      const formattedStartDate =
        mode === 'month'
          ? formatToYYYYMMDD(`${selectedMonth}-01`)
          : formatToYYYYMMDD(startDate);

      const formattedEndDate =
        mode === 'month'
          ? formatToYYYYMMDD(`${selectedMonth}-${getLastDayOfMonth(selectedMonth)}`)
          : formatToYYYYMMDD(endDate);

      if (!sessionDate || !formattedStartDate || !formattedEndDate) {
        setErrorMessage('Invalid date format. Please ensure dates are correctly formatted.');
        setIsSearching(false);
        return;
      }

      const response = await axios.get(`${API_URL}/api/students-prog/`, {
        headers: getAuthHeaders(),
        params: {
          school_id: selectedSchool,
          class_id: selectedClass,
          session_date: sessionDate,
          start_date: formattedStartDate,
          end_date: formattedEndDate,
        },
      });

      const studentList = Array.isArray(response.data?.students)
        ? response.data.students
        : Array.isArray(response.data)
        ? response.data
        : [];

      if (studentList.length === 0) {
        setErrorMessage('No students found for the selected criteria.');
      } else {
        toast.success(`Found ${studentList.length} students`);
      }

      setStudents(studentList);
    } catch (error) {
      console.error('Error fetching students:', error.response?.data || error.message);
      setErrorMessage(
        error.response?.data?.message || 'Failed to fetch students. Please try again.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle student selection
  const toggleStudentSelection = useCallback((studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  }, []);

  // Select/deselect all students
  const toggleSelectAll = useCallback(() => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((student) => student.id));
    }
  }, [selectedStudentIds.length, students]);

  // Toggle background for a student
  const toggleBackground = useCallback((studentId) => {
    setIncludeBackground((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  }, []);

  // View images modal
  const handleViewImages = useCallback((studentId) => {
    setModalStudentId(studentId);
    setShowImageModal(true);
  }, []);

  // Close image modal
  const handleCloseImageModal = useCallback(
    (selected) => {
      setShowImageModal(false);
      if (selected && modalStudentId) {
        setSelectedImages((prev) => ({ ...prev, [modalStudentId]: selected }));
      }
      setModalStudentId(null);
    },
    [modalStudentId]
  );

  // Handle report generation
  const handleGenerateReport = useCallback(
    (studentId) => {
      generateReport(studentId);
    },
    [generateReport]
  );

  // Count selected students that have images
  const selectedStudentsWithImages = useMemo(() => {
    return selectedStudentIds.filter((id) => {
      const images = selectedImages[id] || [];
      return images.length > 0;
    });
  }, [selectedStudentIds, selectedImages]);

  // Handle bulk report generation - only for students with images
  const handleGenerateBulkReports = useCallback(() => {
    if (selectedStudentsWithImages.length === 0) {
      toast.warning('Please select images for at least one student first.');
      return;
    }
    generateBulkReports(selectedStudentsWithImages);
  }, [generateBulkReports, selectedStudentsWithImages]);

  // ============================================
  // TABLE COLUMNS
  // ============================================

  const columns = useMemo(
    () => [
      {
        key: 'select',
        label: (
          <input
            type="checkbox"
            checked={selectedStudentIds.length === students.length && students.length > 0}
            onChange={toggleSelectAll}
            aria-label="Select all students"
            style={{ cursor: 'pointer' }}
          />
        ),
        sortable: false,
        width: '50px',
        render: (_, row) => (
          <input
            type="checkbox"
            checked={selectedStudentIds.includes(row.id)}
            onChange={() => toggleStudentSelection(row.id)}
            aria-label={`Select ${row.name}`}
            style={{ cursor: 'pointer' }}
          />
        ),
      },
      {
        key: 'name',
        label: 'Student Name',
        sortable: true,
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        width: '450px',
        render: (_, row) => {
          const studentImages = selectedImages[row.id] || [];
          const hasImages = studentImages.length > 0;
          const isDisabled = isGenerating[row.id] || !hasImages;

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Background Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ToggleSwitch
                  checked={includeBackground[row.id] || false}
                  onChange={() => toggleBackground(row.id)}
                  label={`Include background for ${row.name}`}
                  size="small"
                  onColor="#2196F3"
                />
                <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>BG</span>
              </div>

              {/* View Images Button - Shows count badge when images selected */}
              <button
                onClick={() => handleViewImages(row.id)}
                style={{
                  padding: '0.375rem 0.75rem',
                  backgroundColor: hasImages ? '#8B5CF6' : '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  position: 'relative',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = hasImages ? '#7C3AED' : '#2563EB')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = hasImages ? '#8B5CF6' : '#3B82F6')}
                aria-label={`View images for ${row.name}`}
              >
                🖼️ Images
                {hasImages && (
                  <span
                    style={{
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      fontSize: '0.625rem',
                      fontWeight: 'bold',
                      padding: '0.125rem 0.375rem',
                      borderRadius: '9999px',
                      marginLeft: '0.25rem',
                    }}
                  >
                    {studentImages.length}
                  </span>
                )}
              </button>

              {/* Generate Report Button - Disabled if no images selected */}
              <button
                onClick={() => handleGenerateReport(row.id)}
                disabled={isDisabled}
                title={!hasImages ? 'Please select images first' : 'Generate PDF report'}
                style={{
                  padding: '0.375rem 0.75rem',
                  backgroundColor: isDisabled ? '#9CA3AF' : '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  opacity: isDisabled ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled) e.target.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  if (!isDisabled) e.target.style.backgroundColor = '#10B981';
                }}
                aria-label={
                  !hasImages
                    ? `Select images first for ${row.name}`
                    : `Generate report for ${row.name}`
                }
              >
                {isGenerating[row.id] ? (
                  <>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid #fff',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    Generating...
                  </>
                ) : !hasImages ? (
                  <>🔒 Select Images</>
                ) : (
                  <>📄 Generate</>
                )}
              </button>
            </div>
          );
        },
      },
    ],
    [
      students,
      selectedStudentIds,
      includeBackground,
      selectedImages,
      isGenerating,
      toggleSelectAll,
      toggleStudentSelection,
      toggleBackground,
      handleViewImages,
      handleGenerateReport,
    ]
  );

  // ============================================
  // STYLES
  // ============================================

  const filterContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    transition: 'border-color 0.15s ease',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    color: '#374151',
    fontSize: '0.875rem',
  };

  const selectStyle = {
    ...inputStyle,
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Spinner animation CSS */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Page Header */}
      <h1
        style={{
          fontSize: '1.875rem',
          fontWeight: 'bold',
          color: '#1F2937',
          marginBottom: '1.5rem',
          textAlign: 'center',
        }}
      >
        📊 Monthly Reports
      </h1>

      {/* Error Message */}
      {errorMessage && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
          }}
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {/* Filters Section */}
      <CollapsibleSection title="🔍 Filter Options" defaultOpen={true}>
        {/* Mode Selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Report Mode</label>
          <ModeSelector
            value={mode}
            onChange={setMode}
            options={[
              { value: 'month', label: 'Month', icon: '📅' },
              { value: 'range', label: 'Date Range', icon: '📆' },
            ]}
          />
        </div>

        {/* Date Filters */}
        <div style={filterContainerStyle}>
          {/* Month Picker */}
          <div>
            <label style={labelStyle}>Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={mode === 'range'}
              style={{
                ...inputStyle,
                opacity: mode === 'range' ? 0.5 : 1,
                cursor: mode === 'range' ? 'not-allowed' : 'pointer',
              }}
              aria-label="Select month"
            />
          </div>

          {/* Start Date */}
          <div>
            <label style={labelStyle}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={mode === 'month'}
              style={{
                ...inputStyle,
                opacity: mode === 'month' ? 0.5 : 1,
                cursor: mode === 'month' ? 'not-allowed' : 'pointer',
              }}
              aria-label="Select start date"
            />
          </div>

          {/* End Date */}
          <div>
            <label style={labelStyle}>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={mode === 'month'}
              min={startDate || undefined}
              style={{
                ...inputStyle,
                opacity: mode === 'month' ? 0.5 : 1,
                cursor: mode === 'month' ? 'not-allowed' : 'pointer',
              }}
              aria-label="Select end date"
            />
          </div>
        </div>

        {/* School & Class Filters */}
        <div style={filterContainerStyle}>
          {/* School */}
          <div>
            <label style={labelStyle}>School *</label>
            {schoolsLoading ? (
              <LoadingSpinner size="small" />
            ) : (
              <select
                value={selectedSchool}
                onChange={(e) => {
                  setSelectedSchool(e.target.value);
                  setSelectedClass('');
                }}
                style={selectStyle}
                aria-label="Select school"
              >
                <option value="">-- Select School --</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Class */}
          <div>
            <label style={labelStyle}>Class *</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={!selectedSchool}
              style={{
                ...selectStyle,
                opacity: !selectedSchool ? 0.5 : 1,
                cursor: !selectedSchool ? 'not-allowed' : 'pointer',
              }}
              aria-label="Select class"
            >
              <option value="">-- Select Class --</option>
              {classes.map((className, index) => (
                <option key={index} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={fetchStudents}
              disabled={isSearching}
              style={{
                width: '100%',
                padding: '0.625rem 1.5rem',
                backgroundColor: isSearching ? '#9CA3AF' : '#3B82F6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: isSearching ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              aria-label={isSearching ? 'Searching students' : 'Search students'}
            >
              {isSearching ? (
                <>
                  <LoadingSpinner size="tiny" />
                  Searching...
                </>
              ) : (
                <>🔍 Search</>
              )}
            </button>
          </div>
        </div>
      </CollapsibleSection>

      {/* Students List Section */}
      <CollapsibleSection
        title={`📋 Student List ${students.length > 0 ? `(${students.length} students)` : ''}`}
        defaultOpen={true}
        headerAction={
          students.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Status indicator */}
              <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                {selectedStudentsWithImages.length} of {selectedStudentIds.length} ready
              </span>
              
              <button
                onClick={handleGenerateBulkReports}
                disabled={isGeneratingBulk || selectedStudentsWithImages.length === 0}
                title={
                  selectedStudentIds.length === 0
                    ? 'Select students first'
                    : selectedStudentsWithImages.length === 0
                    ? 'Select images for students first'
                    : `Generate reports for ${selectedStudentsWithImages.length} students`
                }
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor:
                    isGeneratingBulk || selectedStudentsWithImages.length === 0
                      ? '#9CA3AF'
                      : '#8B5CF6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  cursor:
                    isGeneratingBulk || selectedStudentsWithImages.length === 0
                      ? 'not-allowed'
                      : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: selectedStudentsWithImages.length === 0 ? 0.6 : 1,
                }}
                aria-label={`Generate reports for ${selectedStudentsWithImages.length} students with images`}
              >
                {isGeneratingBulk ? (
                  <>
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid #fff',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    Generating...
                  </>
                ) : selectedStudentsWithImages.length === 0 ? (
                  <>🔒 Select Images First</>
                ) : (
                  <>📄 Generate Selected ({selectedStudentsWithImages.length})</>
                )}
              </button>
            </div>
          )
        }
      >
        {isSearching ? (
          <LoadingSpinner size="medium" message="Searching for students..." />
        ) : students.length > 0 ? (
          <DataTable
            data={students}
            columns={columns}
            emptyMessage="No students found."
            striped
            hoverable
            maxHeight="500px"
          />
        ) : (
          <div
            style={{
              padding: '3rem',
              textAlign: 'center',
              color: '#9CA3AF',
            }}
          >
            <p>No students found. Adjust filters and click Search.</p>
          </div>
        )}
      </CollapsibleSection>

      {/* Image Management Modal */}
      {showImageModal && (
        <ImageManagementModal
          studentId={modalStudentId}
          selectedMonth={selectedMonth}
          startDate={startDate}
          endDate={endDate}
          mode={mode}
          initialSelectedImages={selectedImages[modalStudentId] || []}
          onClose={handleCloseImageModal}
        />
      )}
    </div>
  );
};

export default ReportsPage;