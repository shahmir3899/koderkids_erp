// ============================================
// REPORTS PAGE - Glassmorphism Design Version
// ============================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getAuthHeaders, getClasses, API_URL } from '../api';

// Design System
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  MIXINS,
  LAYOUT,
  TRANSITIONS,
} from '../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../hooks/useResponsive';

// Common Components
import { DataTable } from '../components/common/tables/DataTable';
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { CollapsibleSection } from '../components/common/cards/CollapsibleSection';
import { ToggleSwitch } from '../components/common/ui/ToggleSwitch';
import { ModeSelector } from '../components/common/ui/ModeSelector';
import { PageHeader } from '../components/common/PageHeader';
import { MonthSelector } from '../components/common/ui/MonthSelector';

// Page-specific Components
import ImageManagementModal from './ImageManagementModal';
import { BulkReportProgress } from '../components/reports/BulkReportProgress';
import { runBulkReportJob, buildZipName } from '../services/bulkReportService';

// Hooks
import { useSchools } from '../hooks/useSchools';
import { useReportGeneration } from '../hooks/useReportGeneration';

// ============================================
// CONSTANTS
// ============================================

// Stable empty array to prevent infinite re-renders when passed as prop
const EMPTY_ARRAY = [];

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
    const [year, month] = dateStr.split('-');
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

// Responsive Styles Generator
const getResponsiveStyles = (isMobile, isTablet) => ({
  pageContainer: {
    minHeight: '100vh',
    background: COLORS.background.gradient,
    padding: isMobile ? SPACING.md : isTablet ? SPACING.lg : SPACING.xl,
  },
  contentWrapper: {
    maxWidth: LAYOUT.maxWidth.md,
    margin: '0 auto',
    width: '100%',
  },
  pageTitle: {
    fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
    textAlign: 'center',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: isMobile ? SPACING.md : SPACING.lg,
    marginBottom: SPACING.lg,
  },
  label: {
    display: 'block',
    marginBottom: SPACING.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
  },
  input: {
    width: '100%',
    padding: isMobile ? SPACING.md : `${SPACING.md} ${SPACING.lg}`,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
    fontSize: '16px', // Prevent iOS zoom
    color: COLORS.text.white,
    outline: 'none',
    transition: TRANSITIONS.normal,
    minHeight: '44px', // Touch-friendly
  },
  select: {
    width: '100%',
    padding: isMobile ? SPACING.md : `${SPACING.md} ${SPACING.lg}`,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
    fontSize: '16px', // Prevent iOS zoom
    color: COLORS.text.white,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    outline: 'none',
    minHeight: '44px', // Touch-friendly
  },
  searchButton: (isSearching) => ({
    width: '100%',
    padding: isMobile ? SPACING.md : `${SPACING.md} ${SPACING.xl}`,
    backgroundColor: isSearching ? '#9CA3AF' : COLORS.status.info,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: isSearching ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    transition: TRANSITIONS.normal,
    minHeight: '44px', // Touch-friendly
  }),
  actionsContainer: {
    display: 'flex',
    alignItems: isMobile ? 'stretch' : 'center',
    gap: SPACING.md,
    flexWrap: 'wrap',
    flexDirection: isMobile ? 'column' : 'row',
  },
  imageButton: (hasImages) => ({
    padding: isMobile ? `${SPACING.sm} ${SPACING.md}` : `${SPACING.xs} ${SPACING.md}`,
    backgroundColor: hasImages ? COLORS.accent.purple : COLORS.status.info,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.xs,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    transition: TRANSITIONS.normal,
    minHeight: '44px', // Touch-friendly
    minWidth: isMobile ? '100px' : 'auto',
  }),
  generateButton: (isDisabled) => ({
    padding: isMobile ? `${SPACING.sm} ${SPACING.md}` : `${SPACING.xs} ${SPACING.md}`,
    backgroundColor: isDisabled ? '#9CA3AF' : COLORS.status.success,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.xs,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    transition: TRANSITIONS.normal,
    minHeight: '44px', // Touch-friendly
    minWidth: isMobile ? '100px' : 'auto',
  }),
  bulkButton: (isDisabled) => ({
    padding: isMobile ? `${SPACING.md} ${SPACING.lg}` : `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: isDisabled ? '#9CA3AF' : COLORS.accent.purple,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    transition: TRANSITIONS.normal,
    minHeight: '44px', // Touch-friendly
    width: isMobile ? '100%' : 'auto',
  }),
  headerActions: {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'stretch' : 'center',
    gap: SPACING.md,
  },
  statusText: {
    fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    textAlign: isMobile ? 'center' : 'left',
  },
  emptyState: {
    padding: isMobile ? SPACING.xl : SPACING['2xl'],
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
  },
  sliderWrapper: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
  },
  sliderInput: (value) => ({
    flex: 1,
    height: '6px',
    borderRadius: BORDER_RADIUS.full,
    appearance: 'none',
    WebkitAppearance: 'none',
    background: `linear-gradient(to right, ${COLORS.primary} 0%, ${COLORS.primary} ${((value - 1) / 11) * 100}%, rgba(255, 255, 255, 0.18) ${((value - 1) / 11) * 100}%, rgba(255, 255, 255, 0.18) 100%)`,
    outline: 'none',
    cursor: 'pointer',
    minHeight: isMobile ? '44px' : 'auto',
  }),
});

// Static Styles (non-responsive)
const styles = {
  errorMessage: {
    padding: SPACING.lg,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.status.error,
    marginBottom: SPACING.lg,
    borderLeft: `4px solid ${COLORS.status.error}`,
  },
  inputDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  selectOption: {
    backgroundColor: '#1e1e2e',
    color: '#ffffff',
  },
  modeSelectorWrapper: {
    marginBottom: SPACING.xl,
  },
  toggleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: '44px',
  },
  toggleLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  imageBadge: {
    backgroundColor: COLORS.status.success,
    color: COLORS.text.white,
    fontSize: '0.625rem',
    fontWeight: FONT_WEIGHTS.bold,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.full,
    marginLeft: SPACING.xs,
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid #fff',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  sliderValue: {
    minWidth: '32px',
    textAlign: 'center',
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.base,
  },
  sliderHint: {
    marginTop: SPACING.sm,
    marginBottom: 0,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
};

// ============================================
// MAIN COMPONENT
// ============================================

const ReportsPage = () => {
  const { schools, loading: schoolsLoading } = useSchools();

  // Responsive hook
  const { isMobile, isTablet } = useResponsive();
  const responsiveStyles = getResponsiveStyles(isMobile, isTablet);

  // ============================================
  // STATE
  // ============================================

  const [mode, setMode] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [maxImagesPerReport, setMaxImagesPerReport] = useState(4);

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);

  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [includeBackground, setIncludeBackground] = useState({});
  const [selectedImages, setSelectedImages] = useState({});

  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [showImageModal, setShowImageModal] = useState(false);
  const [modalStudentId, setModalStudentId] = useState(null);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null);
  const bulkAbortRef = useRef(null);

  // ============================================
  // REPORT GENERATION HOOK
  // ============================================

  const {
    generateReport,
    isGenerating,
    error: reportError,
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
    maxImagesPerReport,
  });

  // ============================================
  // EFFECTS
  // ============================================

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

  useEffect(() => {
    if (students.length > 0) {
      const initialToggleState = students.reduce((acc, student) => {
        acc[student.id] = true;
        return acc;
      }, {});
      setIncludeBackground(initialToggleState);
    }
  }, [students]);

  useEffect(() => {
    if (reportError) {
      setErrorMessage(reportError);
    }
  }, [reportError]);

  // Trim any existing per-student image selections down to the new cap
  useEffect(() => {
    setSelectedImages((prev) => {
      let changed = false;
      const trimmed = Object.fromEntries(
        Object.entries(prev).map(([studentId, images]) => {
          if (images.length > maxImagesPerReport) {
            changed = true;
            return [studentId, images.slice(0, maxImagesPerReport)];
          }
          return [studentId, images];
        })
      );
      return changed ? trimmed : prev;
    });
  }, [maxImagesPerReport]);

  // ============================================
  // HANDLERS
  // ============================================

  const fetchStudents = async () => {
    setErrorMessage('');
    setIsSearching(true);
    setStudents([]);
    setSelectedStudentIds([]);

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

      const response = await axios.get(`${API_URL}/api/reports/students-progress/`, {
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

  const toggleStudentSelection = useCallback((studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((student) => student.id));
    }
  }, [selectedStudentIds.length, students]);

  const toggleBackground = useCallback((studentId) => {
    setIncludeBackground((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  }, []);

  const handleViewImages = useCallback((studentId) => {
    setModalStudentId(studentId);
    setShowImageModal(true);
  }, []);

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

  const handleGenerateReport = useCallback(
    (studentId) => {
      generateReport(studentId);
    },
    [generateReport]
  );

  const selectedStudentsWithImages = useMemo(() => {
    return selectedStudentIds.filter((id) => {
      const images = selectedImages[id] || [];
      return images.length > 0;
    });
  }, [selectedStudentIds, selectedImages]);

  const downloadBlob = useCallback((blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
  }, []);

  const handleCancelBulk = useCallback(() => {
    bulkAbortRef.current?.abort();
  }, []);

  const handleCloseBulkProgress = useCallback(() => setBulkProgress(null), []);

  const handleGenerateBulkReports = useCallback(async () => {
    if (selectedStudentIds.length === 0) {
      toast.warning('Please select at least one student first.');
      return;
    }

    const controller = new AbortController();
    bulkAbortRef.current = controller;
    setIsGeneratingBulk(true);
    setBulkProgress({ phase: 'running', batches: [], totalStudents: selectedStudentIds.length, generated: 0, failedCount: 0, elapsedMs: 0 });

    const schoolName = schools.find((sc) => String(sc.id) === String(selectedSchool))?.name;
    const period = mode === 'month' ? selectedMonth : `${startDate}_to_${endDate}`;

    try {
      const result = await runBulkReportJob({
        studentIds: selectedStudentIds,
        params: {
          mode,
          month: selectedMonth,
          start_date: startDate,
          end_date: endDate,
          school_id: selectedSchool,
          student_class: selectedClass,
          max_images: maxImagesPerReport,
        },
        selectedImages,
        includeBackground,
        zipName: buildZipName({ schoolName, className: selectedClass, period }),
        signal: controller.signal,
        onProgress: (snapshot) => setBulkProgress((prev) => ({ ...(prev || {}), ...snapshot })),
      });

      setBulkProgress((prev) => ({ ...(prev || {}), result }));

      if (result.blob) {
        downloadBlob(result.blob, result.filename);
      }

      if (result.cancelled) {
        toast.info(result.blob ? `Cancelled - downloaded the ${result.generated} reports finished so far.` : 'Cancelled.');
      } else if (!result.blob) {
        toast.error('No reports could be generated. See the details in the progress window.');
      } else if (result.failed.length) {
        toast.warning(`${result.generated} of ${selectedStudentIds.length} reports downloaded; ${result.failed.length} failed (see FAILED.txt in the ZIP).`);
      } else {
        toast.success(`ZIP with ${result.generated} reports downloaded!`);
      }
    } catch (error) {
      console.error('Bulk ZIP error:', error);
      setBulkProgress((prev) => ({ ...(prev || {}), phase: 'finished', result: { failed: [{ student_id: '-', name: 'Unexpected error', stage: 'client', reason: error?.message || String(error) }] } }));
      toast.error(`Bulk report failed unexpectedly: ${error?.message || error}`);
    } finally {
      bulkAbortRef.current = null;
      setIsGeneratingBulk(false);
    }
  }, [
    selectedStudentIds,
    schools,
    mode,
    selectedMonth,
    startDate,
    endDate,
    selectedSchool,
    selectedClass,
    selectedImages,
    includeBackground,
    maxImagesPerReport,
    downloadBlob,
  ]);

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
          const isDisabled = isGenerating[row.id];

          return (
            <div style={responsiveStyles.actionsContainer}>
              {/* Background Toggle */}
              <div style={styles.toggleContainer}>
                <ToggleSwitch
                  checked={includeBackground[row.id] || false}
                  onChange={() => toggleBackground(row.id)}
                  label={`Include background for ${row.name}`}
                  size="small"
                  onColor="#2196F3"
                />
                <span style={styles.toggleLabel}>BG</span>
              </div>

              {/* View Images Button */}
              <button
                onClick={() => handleViewImages(row.id)}
                style={responsiveStyles.imageButton(hasImages)}
                aria-label={`View images for ${row.name}`}
              >
                Images
                {hasImages && (
                  <span style={styles.imageBadge}>
                    {studentImages.length}
                  </span>
                )}
              </button>

              {/* Generate Report Button */}
              <button
                onClick={() => handleGenerateReport(row.id)}
                disabled={isDisabled}
                title="Generate PDF report"
                style={responsiveStyles.generateButton(isDisabled)}
              >
                {isGenerating[row.id] ? (
                  <>
                    <span style={styles.spinner} /> Generating...
                  </>
                ) : (
                  <>Generate</>
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
      responsiveStyles,
    ]
  );

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={responsiveStyles.pageContainer}>
      <div style={responsiveStyles.contentWrapper}>
        {/* Spinner animation CSS */}
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>

        {/* Page Header */}
        <PageHeader
          icon="📋"
          title="Monthly Reports"
          subtitle="Generate and export monthly student reports"
        />

        {/* Error Message */}
        {errorMessage && (
          <div style={styles.errorMessage} role="alert">
            {errorMessage}
          </div>
        )}

        {/* Filters Section */}
        <CollapsibleSection title="Filter Options" defaultOpen={true}>
          {/* Mode Selector */}
          <div style={styles.modeSelectorWrapper}>
            <label style={styles.label}>Report Mode</label>
            <ModeSelector
              value={mode}
              onChange={setMode}
              options={[
                { value: 'month', label: 'Month', icon: '' },
                { value: 'range', label: 'Date Range', icon: '' },
              ]}
            />
          </div>

          {/* Date Filters */}
          <div style={responsiveStyles.filterGrid}>
            {/* Month Picker */}
            <MonthSelector
              label="Month"
              value={selectedMonth}
              onChange={setSelectedMonth}
              disabled={mode === 'range'}
              variant="glass"
              monthsCount={24}
              placeholder="Select Month"
            />

            {/* Start Date */}
            <div>
              <label style={responsiveStyles.label}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={mode === 'month'}
                style={{
                  ...responsiveStyles.input,
                  ...(mode === 'month' ? styles.inputDisabled : {}),
                }}
                aria-label="Select start date"
              />
            </div>

            {/* End Date */}
            <div>
              <label style={responsiveStyles.label}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={mode === 'month'}
                min={startDate || undefined}
                style={{
                  ...responsiveStyles.input,
                  ...(mode === 'month' ? styles.inputDisabled : {}),
                }}
                aria-label="Select end date"
              />
            </div>
          </div>

          {/* School & Class Filters */}
          <div style={responsiveStyles.filterGrid}>
            {/* School */}
            <div>
              <label style={responsiveStyles.label}>School *</label>
              {schoolsLoading ? (
                <LoadingSpinner size="small" />
              ) : (
                <select
                  value={selectedSchool}
                  onChange={(e) => {
                    setSelectedSchool(e.target.value);
                    setSelectedClass('');
                  }}
                  style={responsiveStyles.select}
                  aria-label="Select school"
                >
                  <option value="" style={styles.selectOption}>-- Select School --</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id} style={styles.selectOption}>
                      {school.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Class */}
            <div>
              <label style={responsiveStyles.label}>Class *</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={!selectedSchool}
                style={{
                  ...responsiveStyles.select,
                  ...(!selectedSchool ? styles.inputDisabled : {}),
                }}
                aria-label="Select class"
              >
                <option value="" style={styles.selectOption}>-- Select Class --</option>
                {classes.map((className, index) => (
                  <option key={index} value={className} style={styles.selectOption}>
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
                style={responsiveStyles.searchButton(isSearching)}
                onMouseEnter={(e) => {
                  if (!isSearching) {
                    e.currentTarget.style.backgroundColor = COLORS.status.infoDark;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSearching) {
                    e.currentTarget.style.backgroundColor = COLORS.status.info;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
                aria-label={isSearching ? 'Searching students' : 'Search students'}
              >
                {isSearching ? (
                  <>
                    <LoadingSpinner size="tiny" />
                    Searching...
                  </>
                ) : (
                  <>Search</>
                )}
              </button>
            </div>
          </div>

          {/* Max Images Per Report */}
          <div style={responsiveStyles.sliderWrapper}>
            <label style={responsiveStyles.label} htmlFor="maxImagesSlider">
              Max images per report
            </label>
            <div style={responsiveStyles.sliderRow}>
              <input
                id="maxImagesSlider"
                type="range"
                min={1}
                max={12}
                step={1}
                value={maxImagesPerReport}
                onChange={(e) => setMaxImagesPerReport(Number(e.target.value))}
                style={responsiveStyles.sliderInput(maxImagesPerReport)}
                aria-label="Maximum progress images per report"
              />
              <span style={styles.sliderValue}>{maxImagesPerReport}</span>
            </div>
            <p style={styles.sliderHint}>
              Applies to every report generated below — single and bulk ZIP alike.
            </p>
          </div>
        </CollapsibleSection>

        {/* Students List Section */}
        <CollapsibleSection
          title={`Student List ${students.length > 0 ? `(${students.length} students)` : ''}`}
          defaultOpen={true}
          headerAction={
            students.length > 0 && (
              <div style={responsiveStyles.headerActions}>
                <span style={responsiveStyles.statusText}>
                  {selectedStudentsWithImages.length} student{selectedStudentsWithImages.length !== 1 ? 's' : ''} with picture{selectedStudentsWithImages.length !== 1 ? 's' : ''} of {selectedStudentIds.length} selected
                </span>

                <button
                  onClick={handleGenerateBulkReports}
                  disabled={isGeneratingBulk || selectedStudentIds.length === 0}
                  title={
                    selectedStudentIds.length === 0
                      ? 'Select at least one student first'
                      : `Generate reports for ${selectedStudentIds.length} student${selectedStudentIds.length > 1 ? 's' : ''}`
                  }
                  style={responsiveStyles.bulkButton(isGeneratingBulk || selectedStudentIds.length === 0)}
                  aria-label={`Generate reports for ${selectedStudentIds.length} selected students`}
                >
                  {isGeneratingBulk ? (
                    <>
                      <span style={styles.spinner} />
                      Generating...
                    </>
                  ) : (
                    <>Generate Selected ({selectedStudentIds.length})</>
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
              maxHeight={isMobile ? "400px" : "500px"}
            />
          ) : (
            <div style={responsiveStyles.emptyState}>
              <p>No students found. Adjust filters and click Search.</p>
            </div>
          )}
        </CollapsibleSection>

        {/* Bulk generation progress */}
        <BulkReportProgress
          state={bulkProgress}
          onCancel={handleCancelBulk}
          onClose={handleCloseBulkProgress}
          onDownload={() => bulkProgress?.result?.blob && downloadBlob(bulkProgress.result.blob, bulkProgress.result.filename)}
        />

        {/* Image Management Modal */}
        {showImageModal && (
          <ImageManagementModal
            studentId={modalStudentId}
            selectedMonth={selectedMonth}
            startDate={startDate}
            endDate={endDate}
            mode={mode}
            initialSelectedImages={selectedImages[modalStudentId] || EMPTY_ARRAY}
            maxSelections={maxImagesPerReport}
            onClose={handleCloseImageModal}
          />
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
