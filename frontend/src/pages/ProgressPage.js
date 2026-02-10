// ============================================
// PROGRESS PAGE - Glassmorphism Design Version
// ============================================

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getAuthHeaders } from '../api';
import { useAuth } from '../auth';

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
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { DataTable } from '../components/common/tables/DataTable';
import { FilterBar } from '../components/common/filters/FilterBar';
import { Pagination } from '../components/common/ui/Pagination';
import { AttendanceButton } from '../components/common/ui/AttendanceButton';
import { ProgressIndicator } from '../components/common/ui/ProgressIndicator';
import { CompactRichTextEditor } from '../components/common/ui/CompactRichTextEditor';
import { ImageUploadModal } from '../components/common/modals/ImageUploadModal';
import { PageHeader } from '../components/common/PageHeader';

// ============================================
// CONSTANTS
// ============================================

const API_URL = process.env.REACT_APP_API_URL;
const STUDENTS_PER_PAGE = 5;

// Responsive Styles Generator
const getResponsiveStyles = (isMobile, isTablet) => ({
  pageContainer: {
    minHeight: '100vh',
    background: COLORS.background.gradient,
    padding: isMobile ? SPACING.md : isTablet ? SPACING.lg : SPACING.xl,
  },
  contentWrapper: {
    maxWidth: '1200px',
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
  plannedTopicCard: {
    padding: isMobile ? SPACING.md : SPACING.lg,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
    borderLeft: `4px solid ${COLORS.accent.purple}`,
    marginBottom: SPACING.lg,
  },
  plannedTopicLabel: {
    color: COLORS.text.white,
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,
  },
  plannedTopicText: {
    color: COLORS.text.whiteMedium,
    fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,
  },
  actionBar: {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'stretch' : 'center',
    flexWrap: 'wrap',
    gap: isMobile ? SPACING.md : SPACING.lg,
    marginBottom: SPACING.lg,
    padding: isMobile ? SPACING.md : SPACING.lg,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
  },
  markAllButton: {
    padding: isMobile ? `${SPACING.md} ${SPACING.lg}` : `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: COLORS.status.success,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    transition: TRANSITIONS.normal,
    minHeight: '44px', // Touch-friendly
    width: isMobile ? '100%' : 'auto',
  },
  submitContainer: {
    display: 'flex',
    justifyContent: isMobile ? 'stretch' : 'flex-end',
    marginTop: isMobile ? SPACING.lg : SPACING.xl,
  },
  submitButton: (isSubmitting) => ({
    padding: isMobile ? `${SPACING.md} ${SPACING.lg}` : `${SPACING.md} ${SPACING['2xl']}`,
    backgroundColor: isSubmitting ? '#9CA3AF' : COLORS.status.success,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: isSubmitting ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    transition: TRANSITIONS.normal,
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
    minHeight: '44px', // Touch-friendly
    width: isMobile ? '100%' : 'auto',
  }),
  emptyState: {
    padding: isMobile ? SPACING.xl : SPACING['2xl'],
    textAlign: 'center',
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyStateTitle: {
    fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.lg,
    color: COLORS.text.white,
    marginBottom: SPACING.sm,
  },
  emptyStateText: {
    fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },
  imageButton: {
    padding: isMobile ? `${SPACING.sm} ${SPACING.md}` : `${SPACING.xs} ${SPACING.md}`,
    backgroundColor: COLORS.status.info,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.xs,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
    minHeight: '44px', // Touch-friendly
    minWidth: isMobile ? '80px' : 'auto',
    justifyContent: 'center',
  },
  deleteImageButton: {
    padding: isMobile ? SPACING.sm : SPACING.xs,
    backgroundColor: COLORS.status.error,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.xs,
    fontSize: '0.7rem',
    cursor: 'pointer',
    lineHeight: 1,
    minWidth: '44px', // Touch-friendly
    minHeight: '44px', // Touch-friendly
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Static Styles (non-responsive)
const styles = {
  bulkActionContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingContainer: {
    padding: SPACING['2xl'],
    textAlign: 'center',
  },
  imageActionContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  imageThumbnail: {
    width: '32px',
    height: '32px',
    borderRadius: BORDER_RADIUS.xs,
    objectFit: 'cover',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  studentName: {
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
  },
};

// ============================================
// MAIN COMPONENT
// ============================================

const ProgressPage = () => {
  const { user } = useAuth();

  // Responsive hook
  const { isMobile, isTablet } = useResponsive();
  const responsiveStyles = getResponsiveStyles(isMobile, isTablet);

  // ============================================
  // STATE
  // ============================================

  const [filters, setFilters] = useState({
    date: '',
    schoolId: '',
    className: '',
  });

  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [achievedLessons, setAchievedLessons] = useState({});
  const [uploadedImages, setUploadedImages] = useState({});
  const [plannedTopic, setPlannedTopic] = useState('');

  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedStudentForImage, setSelectedStudentForImage] = useState(null);

  // Feature 2: Apply to All
  const [sharedTopicText, setSharedTopicText] = useState('');

  // Feature 3: AI Rewrite
  const [rewritingStudent, setRewritingStudent] = useState(null);
  const [rewriteDropdownOpen, setRewriteDropdownOpen] = useState(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ============================================
  // DERIVED VALUES
  // ============================================

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
    return students.slice(startIndex, startIndex + STUDENTS_PER_PAGE);
  }, [students, currentPage]);

  const progressStats = useMemo(() => {
    const total = students.length;
    const completed = students.filter((s) => {
      const hasAttendance = attendanceData[s.id]?.status;
      const hasLesson = achievedLessons[s.id]?.trim();
      return hasAttendance && hasLesson;
    }).length;
    return { completed, total };
  }, [students, attendanceData, achievedLessons]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleFilter = useCallback(async (filterValues) => {
    const { date, schoolId, className } = filterValues;

    if (!date || !schoolId || !className) {
      toast.error('Please select date, school, and class.');
      return;
    }

    if (!isMounted.current) return;

    setFilters({ date, schoolId, className });
    setIsSearching(true);
    setHasSearched(true);
    setCurrentPage(1);

    setStudents([]);
    setAttendanceData({});
    setAchievedLessons({});
    setUploadedImages({});
    setPlannedTopic('');
    setSharedTopicText('');

    try {
      const [year, month, day] = date.split('-');
      const formattedDate = `${month}/${day}/${year}`;

      const response = await axios.get(`${API_URL}/api/reports/students-progress/`, {
        params: {
          school_id: schoolId,
          class_id: className,
          session_date: formattedDate,
        },
        headers: getAuthHeaders(),
      });

      if (!isMounted.current) return;

      const fetchedStudents = response.data.students || [];
      setStudents(fetchedStudents);

      const newAttendanceData = {};
      const newAchievedLessons = {};

      fetchedStudents.forEach((student) => {
        if (student.status && student.status !== 'N/A') {
          newAttendanceData[student.id] = { status: student.status };
        }
        if (student.achieved_topic) {
          newAchievedLessons[student.id] = student.achieved_topic;
        }
      });

      setAttendanceData(newAttendanceData);
      setAchievedLessons(newAchievedLessons);

      const plannedTopicText = response.data.planned_topic || '';
      setPlannedTopic(plannedTopicText);
      setSharedTopicText(plannedTopicText);

      toast.success(`Loaded ${fetchedStudents.length} students`);
    } catch (error) {
      if (!isMounted.current) return;

      console.error('Error fetching data:', error);
      toast.error('Failed to load data. Please try again.');
      setStudents([]);
    } finally {
      if (isMounted.current) {
        setIsSearching(false);
      }
    }
  }, []);

  const handleAttendanceChange = useCallback((studentId, status) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));

    if (status === 'Absent') {
      setAchievedLessons((prev) => ({
        ...prev,
        [studentId]: 'Absent',
      }));
    } else if (status === 'Present') {
      setAchievedLessons((prev) => {
        if (prev[studentId] === 'Absent') {
          return { ...prev, [studentId]: '' };
        }
        return prev;
      });
    }
  }, []);

  const handleMarkAllPresent = useCallback(() => {
    const newAttendanceData = { ...attendanceData };
    students.forEach((student) => {
      newAttendanceData[student.id] = { status: 'Present' };
    });
    setAttendanceData(newAttendanceData);

    setAchievedLessons((prev) => {
      const updated = { ...prev };
      students.forEach((student) => {
        if (updated[student.id] === 'Absent') {
          updated[student.id] = '';
        }
      });
      return updated;
    });

    toast.success('All students marked as Present.');
  }, [students, attendanceData]);

  const handleAchievedChange = useCallback((studentId, text) => {
    setAchievedLessons((prev) => ({
      ...prev,
      [studentId]: text,
    }));
  }, []);

  const openImageModal = useCallback((student) => {
    setSelectedStudentForImage(student);
    setImageModalOpen(true);
  }, []);

  const closeImageModal = useCallback(() => {
    setImageModalOpen(false);
    setSelectedStudentForImage(null);
  }, []);

  const handleImageUpload = useCallback(async (studentId, file, sessionDate) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('student_id', studentId);
    formData.append('session_date', sessionDate);

    const response = await axios.post(`${API_URL}/api/upload-student-image/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data', ...getAuthHeaders() },
    });

    return response.data.image_url;
  }, []);

  const handleImageUploadComplete = useCallback((imageUrl) => {
    if (selectedStudentForImage) {
      setUploadedImages((prev) => ({
        ...prev,
        [selectedStudentForImage.id]: imageUrl,
      }));
    }
  }, [selectedStudentForImage]);

  const handleDeleteImage = useCallback((studentId) => {
    setUploadedImages((prev) => {
      const updated = { ...prev };
      delete updated[studentId];
      return updated;
    });
    toast.success('Image removed.');
  }, []);

  // Feature 2: Apply to All handler
  const handleApplyToAll = useCallback(() => {
    const textToApply = sharedTopicText.trim() || plannedTopic;
    if (!textToApply) {
      toast.error('Please enter a topic to apply.');
      return;
    }

    setAchievedLessons((prev) => {
      const updated = { ...prev };
      students.forEach((student) => {
        const isAbsent = attendanceData[student.id]?.status === 'Absent';
        if (!isAbsent) {
          updated[student.id] = textToApply;
        }
      });
      return updated;
    });

    toast.success('Topic applied to all present students.');
  }, [sharedTopicText, plannedTopic, students, attendanceData]);

  // Feature 3: AI Rewrite handler
  const handleAIRewrite = useCallback(async (studentId, style) => {
    const currentText = achievedLessons[studentId];
    if (!currentText || currentText.trim() === '' || currentText === 'Absent') {
      toast.error('No text to rewrite.');
      return;
    }

    setRewriteDropdownOpen(null);
    setRewritingStudent(studentId);

    try {
      const response = await axios.post(
        `${API_URL}/api/ai/rewrite/`,
        { text: currentText, style },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        setAchievedLessons((prev) => ({
          ...prev,
          [studentId]: response.data.rewritten_text,
        }));
        toast.success(`Text rewritten (${style})`);
      } else {
        toast.error(response.data.error || 'AI rewrite failed.');
      }
    } catch (err) {
      console.error('AI rewrite error:', err);
      toast.error(err.response?.data?.error || 'Failed to rewrite text.');
    } finally {
      if (isMounted.current) {
        setRewritingStudent(null);
      }
    }
  }, [achievedLessons]);

  // Feature 3: Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      if (rewriteDropdownOpen !== null) {
        setRewriteDropdownOpen(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [rewriteDropdownOpen]);

  const handleSubmit = useCallback(async () => {
    if (!isMounted.current) return;

    if (!filters.date || !filters.schoolId || !filters.className) {
      toast.error('Please search for students first.');
      return;
    }

    if (students.length === 0) {
      toast.error('No students to submit.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newAttendanceRecords = [];

      const attendanceUpdates = students.map((student) => {
        const attendanceId = student.attendance_id || null;
        const status = attendanceData[student.id]?.status || 'N/A';
        const achievedTopic = achievedLessons[student.id] || '';
        const lessonPlanId = student.lesson_plan_id || null;

        if (!attendanceId) {
          newAttendanceRecords.push({
            student_id: student.id,
            session_date: filters.date,
            status: status,
            achieved_topic: achievedTopic,
            lesson_plan_id: lessonPlanId,
          });
        }

        return {
          attendance_id: attendanceId,
          status,
          achieved_topic: achievedTopic,
          lesson_plan_id: lessonPlanId,
        };
      });

      if (newAttendanceRecords.length > 0) {
        await axios.post(
          `${API_URL}/api/attendance/mark/`,
          {
            session_date: filters.date,
            attendance: newAttendanceRecords,
          },
          { headers: getAuthHeaders() }
        );
      }

      for (const update of attendanceUpdates) {
        if (!update.attendance_id) continue;

        await axios.put(
          `${API_URL}/api/attendance/${update.attendance_id}/update/`,
          update,
          { headers: getAuthHeaders() }
        );
      }

      if (!isMounted.current) return;

      toast.success('Progress saved successfully!');
    } catch (err) {
      if (!isMounted.current) return;

      console.error('Error saving progress:', err);
      toast.error(`Failed to save: ${err.response?.data?.detail || err.message}`);
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  }, [filters, students, attendanceData, achievedLessons]);

  // ============================================
  // TABLE COLUMNS
  // ============================================

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Student Name',
      sortable: true,
      width: '200px',
      render: (value) => (
        <span style={styles.studentName}>{value}</span>
      ),
    },
    {
      key: 'attendance',
      label: 'Status',
      sortable: false,
      width: '120px',
      align: 'center',
      render: (_, row) => (
        <AttendanceButton
          status={attendanceData[row.id]?.status}
          onChange={(status) => handleAttendanceChange(row.id, status)}
          size="small"
        />
      ),
    },
    {
      key: 'achieved',
      label: 'Achieved Lesson',
      sortable: false,
      render: (_, row) => {
        const isAbsent = attendanceData[row.id]?.status === 'Absent';
        const hasText = achievedLessons[row.id] && achievedLessons[row.id].trim() !== '' && achievedLessons[row.id] !== 'Absent';
        const isRewriting = rewritingStudent === row.id;
        const isDropdownOpen = rewriteDropdownOpen === row.id;

        return (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACING.xs }}>
            <div style={{ flex: 1 }}>
              <CompactRichTextEditor
                value={achievedLessons[row.id] || ''}
                onChange={(text) => handleAchievedChange(row.id, text)}
                placeholder={isAbsent ? 'Student is absent' : 'Enter achieved lesson...'}
                disabled={isAbsent || isRewriting}
              />
            </div>
            {hasText && !isAbsent && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRewriteDropdownOpen(isDropdownOpen ? null : row.id);
                  }}
                  style={{
                    padding: SPACING.xs,
                    backgroundColor: isRewriting ? 'rgba(176, 97, 206, 0.2)' : 'rgba(176, 97, 206, 0.3)',
                    color: COLORS.text.whiteMedium,
                    border: '1px solid rgba(176, 97, 206, 0.4)',
                    borderRadius: BORDER_RADIUS.xs,
                    fontSize: FONT_SIZES.xs,
                    cursor: isRewriting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: TRANSITIONS.fast,
                    minWidth: '28px',
                    minHeight: '28px',
                    opacity: isRewriting ? 0.5 : 1,
                  }}
                  disabled={isRewriting}
                  title="AI Rewrite"
                >
                  {isRewriting ? '...' : 'AI'}
                </button>
                {isDropdownOpen && !isRewriting && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: SPACING.xs,
                      backgroundColor: 'rgba(55, 40, 80, 0.95)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: `1px solid ${COLORS.border.whiteMedium}`,
                      borderRadius: BORDER_RADIUS.sm,
                      padding: SPACING.xs,
                      zIndex: 20,
                      minWidth: '160px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {[
                      { label: 'Make Professional', style: 'professional' },
                      { label: 'Make Concise', style: 'concise' },
                      { label: 'Fix Grammar', style: 'grammar' },
                    ].map((option) => (
                      <button
                        key={option.style}
                        onClick={() => handleAIRewrite(row.id, option.style)}
                        style={{
                          padding: `${SPACING.sm} ${SPACING.md}`,
                          color: COLORS.text.white,
                          fontSize: FONT_SIZES.xs,
                          cursor: 'pointer',
                          borderRadius: BORDER_RADIUS.xs,
                          display: 'block',
                          width: '100%',
                          border: 'none',
                          backgroundColor: 'transparent',
                          textAlign: 'left',
                          transition: TRANSITIONS.fast,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'image',
      label: 'Image',
      sortable: false,
      width: '150px',
      align: 'center',
      render: (_, row) => {
        const image = uploadedImages[row.id];
        const imageUrl = typeof image === 'object' ? image?.signedURL : image;

        return (
          <div style={styles.imageActionContainer}>
            <button
              onClick={() => openImageModal(row)}
              style={responsiveStyles.imageButton}
            >
              {imageUrl ? 'Change' : 'Upload'}
            </button>

            {imageUrl && (
              <>
                <img
                  src={imageUrl}
                  alt="Uploaded"
                  style={styles.imageThumbnail}
                  onError={(e) => (e.target.style.display = 'none')}
                />
                <button
                  onClick={() => handleDeleteImage(row.id)}
                  style={responsiveStyles.deleteImageButton}
                  title="Remove image"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ], [attendanceData, achievedLessons, uploadedImages, handleAttendanceChange, handleAchievedChange, openImageModal, handleDeleteImage, rewritingStudent, rewriteDropdownOpen, handleAIRewrite]);

  // ============================================
  // RENDER - Main Content
  // ============================================

  return (
    <div style={responsiveStyles.pageContainer}>
      <div style={responsiveStyles.contentWrapper}>
        {!user ? null : (
          <>
            {/* Page Header */}
            <PageHeader
              icon="📈"
              title="Session Progress"
              subtitle="Track daily student attendance and topics covered"
            />

            {/* Filter Bar */}
            <FilterBar
              showDate={true}
              showSchool={true}
              showClass={true}
              showMonth={false}
              preventFutureDates={true}
              submitButtonText="📊 Show Students"
              showResetButton={true}
              onFilter={handleFilter}
            />

            {/* Loading State */}
            {isSearching && (
              <div style={styles.loadingContainer}>
                <LoadingSpinner size="large" message="Fetching students..." />
              </div>
            )}

            {/* Results Section */}
            {!isSearching && hasSearched && students.length > 0 && (
              <>
                {/* Planned Topic */}
                <div style={responsiveStyles.plannedTopicCard}>
                  <span style={responsiveStyles.plannedTopicLabel}>Planned Lesson: </span>
                  <span style={responsiveStyles.plannedTopicText}>{plannedTopic}</span>
                </div>

                {/* Action Bar */}
                <div style={responsiveStyles.actionBar}>
                  <div style={styles.bulkActionContainer}>
                    <button
                      onClick={handleMarkAllPresent}
                      style={responsiveStyles.markAllButton}
                    >
                      ✓ Mark All Present
                    </button>
                  </div>

                  {/* Apply to All */}
                  <div style={{
                    display: 'flex',
                    alignItems: isMobile ? 'stretch' : 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: SPACING.sm,
                    flex: isMobile ? 'unset' : 1,
                    maxWidth: isMobile ? '100%' : '500px',
                  }}>
                    <input
                      type="text"
                      value={sharedTopicText}
                      onChange={(e) => setSharedTopicText(e.target.value)}
                      placeholder="Topic to apply to all..."
                      style={{
                        flex: 1,
                        padding: `${SPACING.sm} ${SPACING.md}`,
                        border: `1px solid ${COLORS.border.whiteTransparent}`,
                        borderRadius: BORDER_RADIUS.sm,
                        fontSize: FONT_SIZES.sm,
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: COLORS.text.white,
                        outline: 'none',
                        minHeight: '44px',
                      }}
                    />
                    <button
                      onClick={handleApplyToAll}
                      style={{
                        padding: `${SPACING.sm} ${SPACING.lg}`,
                        backgroundColor: COLORS.accent.purple,
                        color: COLORS.text.white,
                        border: 'none',
                        borderRadius: BORDER_RADIUS.sm,
                        fontSize: FONT_SIZES.sm,
                        fontWeight: FONT_WEIGHTS.medium,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: SPACING.xs,
                        transition: TRANSITIONS.normal,
                        minHeight: '44px',
                        whiteSpace: 'nowrap',
                        width: isMobile ? '100%' : 'auto',
                      }}
                    >
                      Apply to All
                    </button>
                  </div>

                  <ProgressIndicator
                    completed={progressStats.completed}
                    total={progressStats.total}
                    label="Progress:"
                    size={isMobile ? "small" : "medium"}
                  />
                </div>

                {/* Data Table */}
                <DataTable
                  data={paginatedStudents}
                  columns={columns}
                  loading={false}
                  emptyMessage="No students found"
                  striped={true}
                  hoverable={true}
                />

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalItems={students.length}
                  itemsPerPage={STUDENTS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />

                {/* Submit Button */}
                <div style={responsiveStyles.submitContainer}>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    style={responsiveStyles.submitButton(isSubmitting)}
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="tiny" />
                        Saving...
                      </>
                    ) : (
                      <>Save Progress</>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Empty State */}
            {!isSearching && hasSearched && students.length === 0 && (
              <div style={responsiveStyles.emptyState}>
                <p style={responsiveStyles.emptyStateTitle}>
                  No students found for the selected criteria.
                </p>
                <p style={responsiveStyles.emptyStateText}>
                  Try selecting a different date, school, or class.
                </p>
              </div>
            )}

            {/* Initial State */}
            {!hasSearched && !isSearching && (
              <div style={responsiveStyles.emptyState}>
                <p style={responsiveStyles.emptyStateTitle}>
                  Select date, school, and class above
                </p>
                <p style={responsiveStyles.emptyStateText}>
                  Then click "Show Students" to load student data.
                </p>
              </div>
            )}

            {/* Image Upload Modal */}
            <ImageUploadModal
              isOpen={imageModalOpen}
              onClose={closeImageModal}
              studentName={selectedStudentForImage?.name || ''}
              studentId={selectedStudentForImage?.id}
              sessionDate={filters.date}
              onUploadComplete={handleImageUploadComplete}
              uploadHandler={handleImageUpload}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ProgressPage;
