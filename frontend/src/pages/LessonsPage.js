// ============================================
// LESSONS PAGE - Glassmorphism Design Version
// ============================================

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeaders } from '../api';
import { useAuth } from '../auth';
import { toast } from 'react-toastify';
import debounce from 'lodash.debounce';

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
import { FilterBar } from '../components/common/filters/FilterBar';
import { DataTable } from '../components/common/tables/DataTable';
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { CollapsibleSection } from '../components/common/cards/CollapsibleSection';
import { ExportButtons } from '../components/common/ui/ExportButtons';
import { RichTextEditor } from '../components/common/ui/RichTextEditor';
import { PageHeader } from '../components/common/PageHeader';

// Lesson-specific Components
import LessonPlanWizard from '../components/lessons/LessonPlanWizard';
import { ExportableLessonTable } from '../components/lessons/ExportableLessonTable';

// Hooks
import { useSchools } from '../hooks/useSchools';
import { useExportLessons } from '../hooks/useExportLessons';

const API_URL = process.env.REACT_APP_API_URL;

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
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: `${SPACING.sm} ${SPACING.lg}`,
    background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: TRANSITIONS.normal,
    boxShadow: '0 4px 15px rgba(176, 97, 206, 0.4)',
    width: isMobile ? '100%' : 'auto',
    justifyContent: 'center',
    minHeight: '44px', // Touch-friendly
    whiteSpace: 'nowrap',
  },
  actionButton: (variant) => ({
    padding: isMobile ? `${SPACING.sm} ${SPACING.md}` : `${SPACING.xs} ${SPACING.md}`,
    backgroundColor: variant === 'save'
      ? COLORS.status.success
      : variant === 'cancel'
        ? '#6B7280'
        : variant === 'edit'
          ? COLORS.status.info
          : COLORS.status.error,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.xs,
    cursor: 'pointer',
    minHeight: '44px', // Touch-friendly
    minWidth: isMobile ? '70px' : 'auto',
  }),
  actionsContainer: {
    display: 'flex',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    justifyContent: isMobile ? 'flex-start' : 'flex-start',
  },
  accessDenied: {
    textAlign: 'center',
    marginTop: SPACING['2xl'],
    ...MIXINS.glassmorphicCard,
    padding: isMobile ? SPACING.lg : SPACING['2xl'],
    borderRadius: BORDER_RADIUS.lg,
    maxWidth: '500px',
    margin: isMobile ? `${SPACING.lg} ${SPACING.md}` : '2rem auto',
  },
  accessDeniedText: {
    fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.lg,
    color: COLORS.status.error,
  },
});

// Static Styles (non-responsive)
const styles = {
  errorMessage: {
    padding: SPACING.lg,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.status.error,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    borderLeft: `4px solid ${COLORS.status.error}`,
  },
};

function LessonsPage() {
  const { user } = useAuth();
  const { schools, loading: schoolsLoading } = useSchools();

  // Responsive hook
  const { isMobile, isTablet } = useResponsive();
  const responsiveStyles = getResponsiveStyles(isMobile, isTablet);

  // ============================================
  // STATE - Consolidated
  // ============================================
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    schoolId: '',
    className: '',
  });

  // Edit state
  const [editState, setEditState] = useState({
    editingId: null,
    editedTopic: '',
    saveLoading: null,
    deleteLoading: null,
  });

  // Cache for preventing duplicate fetches
  const [lastFetched, setLastFetched] = useState(null);

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
  const selectedSchoolName = useMemo(() => {
    if (!filters.schoolId || !schools.length) return '';
    const school = schools.find((s) => s.id === parseInt(filters.schoolId));
    return school?.name || 'Unknown School';
  }, [filters.schoolId, schools]);

  const dateRangeFormatted = useMemo(() => {
    if (!filters.startDate || !filters.endDate) return '';
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    };
    return `${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`;
  }, [filters.startDate, filters.endDate]);

  // ============================================
  // EXPORT HOOK
  // ============================================
  const { handleDownloadImage, handleDownloadPdf, handlePrint } = useExportLessons({
    exportElementId: 'lessonTableExport',
    schoolName: selectedSchoolName,
    className: filters.className,
    dateRange: dateRangeFormatted,
  });

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const formatDateWithDay = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const parseFormattedText = useCallback((text) => {
    if (!text) return '(No topic planned)';
    return text
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/~(.*?)~/g, '<s>$1</s>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/```(.*?)```/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 4px;border-radius:3px;">$1</code>')
      .replace(/\n/g, '<br>');
  }, []);

  // ============================================
  // API FUNCTIONS
  // ============================================
  const fetchLessonsAPI = async (startDate, endDate, schoolId, studentClass) => {
    const endpoint = `${API_URL}/api/lessons/range/?start_date=${startDate}&end_date=${endDate}&school_id=${schoolId}&student_class=${studentClass}`;
    const response = await axios.get(endpoint, { headers: getAuthHeaders() });
    return response.data;
  };

  const debouncedFetch = useMemo(
    () =>
      debounce(async (filterValues) => {
        const { startDate, endDate, schoolId, className } = filterValues;

        if (!startDate || !endDate || !schoolId || !className) {
          toast.warning('Please select all required fields.');
          return;
        }

        const cacheKey = `${startDate}_${endDate}_${schoolId}_${className}`;
        if (lastFetched === cacheKey) {
          return;
        }

        if (!isMounted.current) return;

        setLoading(true);
        setError(null);
        setLessons([]);

        try {
          const lessonsData = await fetchLessonsAPI(startDate, endDate, schoolId, className);

          if (!isMounted.current) return;

          setLessons(lessonsData);
          setLastFetched(cacheKey);
          setEditState((prev) => ({ ...prev, editingId: null, editedTopic: '' }));

          toast.success(`Found ${lessonsData.length} lessons`);
        } catch (err) {
          if (!isMounted.current) return;

          console.error('Error fetching lessons:', err);
          setError('Failed to fetch lessons.');
          toast.error('Failed to fetch lessons. Please try again.');
        } finally {
          if (isMounted.current) {
            setLoading(false);
          }
        }
      }, 500),
    [lastFetched]
  );

  // ============================================
  // HANDLERS
  // ============================================
  const handleFilter = (filterValues) => {
    setFilters({
      startDate: filterValues.startDate,
      endDate: filterValues.endDate,
      schoolId: filterValues.schoolId,
      className: filterValues.className,
    });
    debouncedFetch(filterValues);
  };

  const handleEdit = (lessonId, currentTopic) => {
    setEditState({
      ...editState,
      editingId: lessonId,
      editedTopic: currentTopic || '',
    });
  };

  const handleCancelEdit = () => {
    setEditState({
      ...editState,
      editingId: null,
      editedTopic: '',
    });
  };

  const handleSave = async (lessonId) => {
    if (!isMounted.current) return;

    setEditState((prev) => ({ ...prev, saveLoading: lessonId }));

    try {
      const endpoint = `${API_URL}/api/lessons/${lessonId}/update-planned/`;
      await axios.put(
        endpoint,
        { planned_topic: editState.editedTopic },
        { headers: getAuthHeaders() }
      );

      if (!isMounted.current) return;

      setLessons((prev) =>
        prev.map((lesson) =>
          lesson.id === lessonId
            ? { ...lesson, planned_topic: editState.editedTopic }
            : lesson
        )
      );

      setEditState({
        editingId: null,
        editedTopic: '',
        saveLoading: null,
        deleteLoading: null,
      });

      toast.success('Lesson updated successfully');
    } catch (err) {
      if (!isMounted.current) return;

      console.error('Error updating lesson:', err.response?.data || err.message);
      toast.error(`Failed to update lesson: ${err.response?.data?.detail || err.message}`);
    } finally {
      if (isMounted.current) {
        setEditState((prev) => ({ ...prev, saveLoading: null }));
      }
    }
  };

  const handleDelete = async (lessonId) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;

    if (!isMounted.current) return;

    setEditState((prev) => ({ ...prev, deleteLoading: lessonId }));

    try {
      const endpoint = `${API_URL}/api/lessons/${lessonId}/`;
      await axios.delete(endpoint, { headers: getAuthHeaders() });

      if (!isMounted.current) return;

      setLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId));

      toast.success('Lesson deleted successfully');
    } catch (err) {
      if (!isMounted.current) return;

      console.error('Error deleting lesson:', err.response?.data || err.message);
      toast.error(`Failed to delete lesson: ${err.response?.data?.detail || err.message}`);
    } finally {
      if (isMounted.current) {
        setEditState((prev) => ({ ...prev, deleteLoading: null }));
      }
    }
  };

  // ============================================
  // TABLE COLUMNS CONFIGURATION
  // ============================================
  const columns = useMemo(
    () => [
      {
        key: 'session_date',
        label: 'Date',
        sortable: true,
        width: '180px',
        render: (value) => formatDateWithDay(value),
      },
      {
        key: 'school_name',
        label: 'School',
        sortable: true,
      },
      {
        key: 'student_class',
        label: 'Class',
        sortable: true,
        width: '100px',
      },
      {
        key: 'planned_topic',
        label: 'Planned Topic',
        sortable: true,
        render: (value, row) => {
          if (editState.editingId === row.id) {
            return (
              <div style={{ minWidth: '400px' }}>
                <RichTextEditor
                  value={editState.editedTopic}
                  onChange={(newValue) =>
                    setEditState((prev) => ({ ...prev, editedTopic: newValue }))
                  }
                  placeholder="Edit planned topic... Use *bold*, _italic_, ~strike~, ```code```"
                  showPreview={true}
                  showLineSpacing={false}
                  minHeight={120}
                  maxHeight={300}
                />
              </div>
            );
          }
          return (
            <div
              style={{ whiteSpace: 'pre-line' }}
              dangerouslySetInnerHTML={{ __html: parseFormattedText(value) }}
            />
          );
        },
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        width: '200px',
        render: (_, row) => {
          const isEditing = editState.editingId === row.id;
          const isSaving = editState.saveLoading === row.id;
          const isDeleting = editState.deleteLoading === row.id;

          return (
            <div style={responsiveStyles.actionsContainer}>
              {isEditing ? (
                <>
                  <button
                    onClick={() => handleSave(row.id)}
                    disabled={isSaving}
                    style={{
                      ...responsiveStyles.actionButton('save'),
                      opacity: isSaving ? 0.6 : 1,
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    style={responsiveStyles.actionButton('cancel')}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleEdit(row.id, row.planned_topic)}
                  style={responsiveStyles.actionButton('edit')}
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => handleDelete(row.id)}
                disabled={isDeleting}
                style={{
                  ...responsiveStyles.actionButton('delete'),
                  opacity: isDeleting ? 0.6 : 1,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          );
        },
      },
    ],
    [editState, formatDateWithDay, parseFormattedText]
  );

  // ============================================
  // RENDER - Auth Checks
  // ============================================

  if (user && !['admin', 'teacher'].includes(user.role)) {
    return (
      <div style={responsiveStyles.pageContainer}>
        <div style={responsiveStyles.accessDenied}>
          <h2 style={responsiveStyles.accessDeniedText}>
            Access Denied: Only Admins and Teachers can manage lessons.
          </h2>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER - Main Content
  // ============================================
  return (
    <div style={responsiveStyles.pageContainer}>
      <div style={responsiveStyles.contentWrapper}>
        {/* Page Header */}
        <PageHeader
          icon="📚"
          title="Lesson Management"
          subtitle="Create and manage lesson plans"
          actions={
            <button
              onClick={() => setIsModalOpen(true)}
              style={responsiveStyles.addButton}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(176, 97, 206, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(176, 97, 206, 0.4)';
                }
              }}
            >
              + Add Lesson Plan
            </button>
          }
        />

        {/* Filters Section */}
        <CollapsibleSection title="Filter Lessons" defaultOpen={true}>
          <FilterBar
            onFilter={handleFilter}
            showSchool
            showClass
            showMonth={false}
            showDateRange={true}
            submitButtonText="Fetch Lessons"
            loading={loading}
            showResetButton={true}
          />
        </CollapsibleSection>

        {/* Error Message */}
        {error && (
          <div style={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* Lessons Table Section */}
        <CollapsibleSection
          title={
            lessons.length > 0
              ? `Lesson Plan - ${selectedSchoolName} - Class ${filters.className} (${lessons.length} lessons)`
              : 'Lessons'
          }
          defaultOpen={true}
          headerAction={
            lessons.length > 0 && (
              <ExportButtons
                onDownloadImage={handleDownloadImage}
                onDownloadPdf={handleDownloadPdf}
                onPrint={handlePrint}
                size="small"
              />
            )
          }
        >
          {loading ? (
            <LoadingSpinner size="medium" message="Fetching lessons..." />
          ) : (
            <DataTable
              data={lessons}
              columns={columns}
              loading={loading}
              emptyMessage="No lessons found. Select filters and click 'Fetch Lessons' to load data."
              striped
              hoverable
              maxHeight="500px"
            />
          )}
        </CollapsibleSection>

        {/* Hidden Export Table */}
        <ExportableLessonTable
          lessons={lessons}
          schoolName={selectedSchoolName}
          className={filters.className}
          dateRange={dateRangeFormatted}
          formatDate={formatDateWithDay}
          id="lessonTableExport"
        />

        {/* Lesson Plan Wizard */}
        {isModalOpen && (
          <LessonPlanWizard
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => {
              if (filters.startDate && filters.endDate && filters.schoolId && filters.className) {
                debouncedFetch(filters);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

export default LessonsPage;
