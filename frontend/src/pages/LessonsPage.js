// ============================================
// LESSONS PAGE - Refactored Version
// ============================================
// Location: src/pages/LessonsPage.js
//
// REFACTORED: 
// - Uses FilterBar with date range support
// - Uses DataTable for lesson display
// - Uses LoadingSpinner instead of ClipLoader
// - Uses useSchools hook
// - Extracted export logic to useExportLessons hook
// - Extracted export table to ExportableLessonTable component
// - ADDED: RichTextEditor for editing lesson topics with formatting

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeaders } from '../api';
import { useAuth } from '../auth';
import { toast } from 'react-toastify';
import debounce from 'lodash.debounce';

// Common Components
import { FilterBar } from '../components/common/filters/FilterBar';
import { DataTable } from '../components/common/tables/DataTable';
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { CollapsibleSection } from '../components/common/cards/CollapsibleSection';
import { ExportButtons } from '../components/common/ui/ExportButtons';
import { RichTextEditor } from '../components/common/ui/RichTextEditor'; // NEW: Rich Text Editor

// Lesson-specific Components
import LessonPlanModal from '../components/LessonPlanModal';
import { ExportableLessonTable } from '../components/lessons/ExportableLessonTable';

// Hooks
//import { useSchools } from '../hooks/useSchools';
import { useExportLessons } from '../hooks/useExportLessons';

const API_URL = process.env.REACT_APP_API_URL;

function LessonsPage() {
  const { user } = useAuth();
  //const { schools, loading: schoolsLoading } = useSchools();

  // ============================================
  // STATE - Consolidated
  // ============================================
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchoolName, setSelectedSchoolName] = useState('');

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

  // ============================================
  // DERIVED VALUES
  // ============================================
  //const selectedSchoolName = useMemo(() => {
    //if (!filters.schoolId || !schools.length) return '';
    //const school = schools.find((s) => s.id === parseInt(filters.schoolId));
    //return school?.name || 'Unknown School';
  //}, [filters.schoolId, schools]);

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

  // NEW: Parse formatted text for display (converts *bold*, _italic_, etc. to HTML)
  const parseFormattedText = useCallback((text) => {
    if (!text) return '(No topic planned)';
    return text
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/~(.*?)~/g, '<s>$1</s>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/```(.*?)```/g, '<code style="background:#f0f0f0;padding:2px 4px;border-radius:3px;">$1</code>')
      .replace(/\n/g, '<br>');
  }, []);

  // ============================================
  // API FUNCTIONS
  // ============================================
  const fetchLessonsAPI = async (startDate, endDate, schoolId, studentClass) => {
    const endpoint = `${API_URL}/api/lessons/range/?start_date=${startDate}&end_date=${endDate}&school_id=${schoolId}&student_class=${studentClass}`;
    console.log(`🔍 Fetching lessons from: ${endpoint}`);
    const response = await axios.get(endpoint, { headers: getAuthHeaders() });
    return response.data;
  };

  // Debounced fetch
  // ✅ UPDATED: Debounced fetch with isMounted checks
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
          console.log('📦 Using cached lessons');
          return;
        }

        // ✅ CHECK: Don't start if unmounted
        if (!isMounted.current) return;

        setLoading(true);
        setError(null);
        setLessons([]);

        try {
          const lessonsData = await fetchLessonsAPI(startDate, endDate, schoolId, className);
          
          // ✅ CHECK: Don't update state if unmounted during fetch
          if (!isMounted.current) return;
          
          setLessons(lessonsData);
          setLastFetched(cacheKey);
          setEditState((prev) => ({ ...prev, editingId: null, editedTopic: '' }));
          
          toast.success(`Found ${lessonsData.length} lessons`);
        } catch (err) {
          // ✅ CHECK: Don't show errors if unmounted
          if (!isMounted.current) return;
          
          console.error('❌ Error fetching lessons:', err);
          setError('Failed to fetch lessons.');
          toast.error('Failed to fetch lessons. Please try again.');
        } finally {
          // ✅ CHECK: Only update loading if still mounted
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
    console.log('Editing lesson:', lessonId, 'Current topic:', currentTopic);
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

  // ============================================
// LESSONS PAGE - handleSave with isMounted
// ============================================
// Location: src/pages/LessonsPage.js
// Replace handleSave function (around line 207-241) with this:

const handleSave = async (lessonId) => {
  // ✅ CHECK: Don't start if unmounted
  if (!isMounted.current) return;
  
  setEditState((prev) => ({ ...prev, saveLoading: lessonId }));
  
  try {
    const endpoint = `${API_URL}/api/lessons/${lessonId}/update-planned/`;
    await axios.put(
      endpoint,
      { planned_topic: editState.editedTopic },
      { headers: getAuthHeaders() }
    );

    // ✅ CHECK: Don't update state if unmounted during save
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
    // ✅ CHECK: Don't show errors if unmounted
    if (!isMounted.current) return;
    
    console.error('❌ Error updating lesson:', err.response?.data || err.message);
    toast.error(`Failed to update lesson: ${err.response?.data?.detail || err.message}`);
  } finally {
    // ✅ CHECK: Only clear loading if still mounted
    if (isMounted.current) {
      setEditState((prev) => ({ ...prev, saveLoading: null }));
    }
  }
};

  // ============================================
// LESSONS PAGE - handleDelete with isMounted
// ============================================
// Location: src/pages/LessonsPage.js
// Replace handleDelete function (around line 243-260) with this:

const handleDelete = async (lessonId) => {
  if (!window.confirm('Are you sure you want to delete this lesson?')) return;

  // ✅ CHECK: Don't start if unmounted
  if (!isMounted.current) return;

  setEditState((prev) => ({ ...prev, deleteLoading: lessonId }));

  try {
    const endpoint = `${API_URL}/api/lessons/${lessonId}/`;
    await axios.delete(endpoint, { headers: getAuthHeaders() });

    // ✅ CHECK: Don't update state if unmounted during delete
    if (!isMounted.current) return;

    setLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId));
    
    toast.success('Lesson deleted successfully');
  } catch (err) {
    // ✅ CHECK: Don't show errors if unmounted
    if (!isMounted.current) return;
    
    console.error('❌ Error deleting lesson:', err.response?.data || err.message);
    toast.error(`Failed to delete lesson: ${err.response?.data?.detail || err.message}`);
  } finally {
    // ✅ CHECK: Only clear loading if still mounted
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
        // UPDATED: Now uses RichTextEditor for editing with preview
        key: 'planned_topic',
        label: 'Planned Topic',
        sortable: true,
        render: (value, row) => {
          if (editState.editingId === row.id) {
            // EDIT MODE: Show RichTextEditor with formatting toolbar and preview
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
          // VIEW MODE: Display formatted text
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
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {isEditing ? (
                <>
                  <button
                    onClick={() => handleSave(row.id)}
                    disabled={isSaving}
                    style={{
                      padding: '0.375rem 0.75rem',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      opacity: isSaving ? 0.6 : 1,
                    }}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      padding: '0.375rem 0.75rem',
                      backgroundColor: '#6B7280',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleEdit(row.id, row.planned_topic)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => handleDelete(row.id)}
                disabled={isDeleting}
                style={{
                  padding: '0.375rem 0.75rem',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.6 : 1,
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

  useEffect(() => {
  return () => {
    isMounted.current = false;
  };
}, []);

  // ============================================
  // RENDER - Auth Checks
  // ============================================
  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LoadingSpinner size="large" message="Loading..." />
      </div>
    );
  }

  if (!['admin', 'teacher'].includes(user.role)) {
    return (
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#EF4444' }}>
          Access Denied: Only Admins and Teachers can manage lessons.
        </h2>
      </div>
    );
  }

 

  // ============================================
  // RENDER - Main Content
  // ============================================
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
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
        Lesson Management
      </h1>

      {/* Filters Section */}
      <CollapsibleSection title="Filter Lessons" defaultOpen={true}>
        <FilterBar
          onFilter={handleFilter}
          showSchool
          showClass
          showMonth={false}
          showDateRange={true}
          submitButtonText="🔍 Fetch Lessons"
          loading={loading}
          showResetButton={true}
        />
      </CollapsibleSection>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            borderRadius: '0.5rem',
            textAlign: 'center',
            marginBottom: '1rem',
          }}
        >
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

      {/* Add Lesson Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = '#2563EB')}
          onMouseLeave={(e) => (e.target.style.backgroundColor = '#3B82F6')}
        >
          ➕ Add Lesson Plan
        </button>
      </div>

      {/* Hidden Export Table */}
      <ExportableLessonTable
        lessons={lessons}
        schoolName={selectedSchoolName}
        className={filters.className}
        dateRange={dateRangeFormatted}
        formatDate={formatDateWithDay}
        id="lessonTableExport"
      />

      {/* Lesson Plan Modal */}
      {isModalOpen && (
        <LessonPlanModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

export default LessonsPage;