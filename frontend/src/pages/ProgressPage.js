// ============================================
// PROGRESS PAGE - Refactored Version v2
// ============================================
// Location: src/pages/ProgressPage.js
//
// FEATURES:
// - Uses FilterBar with showDate (single school fetch, no duplicate)
// - Uses DataTable for student list with custom renders
// - Uses AttendanceButton for status toggle
// - Uses CompactRichTextEditor for achieved lessons
// - Uses ImageUploadModal for image uploads
// - Uses ProgressIndicator for completion status
// - Uses Pagination component
// - Bulk "Mark All Present" action
// - Clean, compact hybrid UI

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getAuthHeaders } from '../api';
import { useAuth } from '../auth';

// Common Components
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { DataTable } from '../components/common/tables/DataTable';
import { FilterBar } from '../components/common/filters/FilterBar';
import { Pagination } from '../components/common/ui/Pagination';
import { AttendanceButton } from '../components/common/ui/AttendanceButton';
import { ProgressIndicator } from '../components/common/ui/ProgressIndicator';
import { CompactRichTextEditor } from '../components/common/ui/CompactRichTextEditor';
import { ImageUploadModal } from '../components/common/modals/ImageUploadModal';

// ============================================
// CONSTANTS
// ============================================

const API_URL = process.env.REACT_APP_API_URL;

const STUDENTS_PER_PAGE = 5;

// ============================================
// MAIN COMPONENT
// ============================================

const ProgressPage = () => {
  const { user } = useAuth();

  // ============================================
  // STATE
  // ============================================

  // Filter state (received from FilterBar)
  const [filters, setFilters] = useState({
    date: '',
    schoolId: '',
    className: '',
  });

  // Data state
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [achievedLessons, setAchievedLessons] = useState({});
  const [uploadedImages, setUploadedImages] = useState({});
  const [plannedTopic, setPlannedTopic] = useState('');

  // UI state
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedStudentForImage, setSelectedStudentForImage] = useState(null);



  // ✅ ADD THESE LINES:
  // Cleanup ref
  const isMounted = useRef(true);

  // Cleanup effect
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ============================================
  // DERIVED VALUES
  // ============================================

  // Paginated students
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
    return students.slice(startIndex, startIndex + STUDENTS_PER_PAGE);
  }, [students, currentPage]);

  // Progress calculation
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

  // Handle filter submission from FilterBar
  const handleFilter = useCallback(async (filterValues) => {
  const { date, schoolId, className } = filterValues;

  if (!date || !schoolId || !className) {
    toast.error('Please select date, school, and class.');
    return;
  }

  // ✅ NEW: Check if mounted
  if (!isMounted.current) return;

  setFilters({ date, schoolId, className });
  setIsSearching(true);
  setHasSearched(true);
  setCurrentPage(1);

  // Clear previous data
  setStudents([]);
  setAttendanceData({});
  setAchievedLessons({});
  setUploadedImages({});
  setPlannedTopic('');

  try {
    // Format date for API (MM/DD/YYYY)
    const [year, month, day] = date.split('-');
    const formattedDate = `${month}/${day}/${year}`;

    // Fetch students
    const response = await axios.get(`${API_URL}/api/reports/students-progress/`, {
      params: {
        school_id: schoolId,
        class_id: className,
        session_date: formattedDate,
      },
      headers: getAuthHeaders(),
    });

    // ✅ NEW: Check before state updates
    if (!isMounted.current) return;

    const fetchedStudents = response.data.students || [];
    setStudents(fetchedStudents);

    // Process attendance and achieved lessons
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

    // Get planned topic
    const plannedTopicText = response.data.planned_topic || '';
    setPlannedTopic(plannedTopicText);

    toast.success(`Loaded ${fetchedStudents.length} students`);
  } catch (error) {
    // ✅ NEW: Check before showing error
    if (!isMounted.current) return;
    
    console.error('Error fetching data:', error);
    toast.error('Failed to load data. Please try again.');
    setStudents([]);
  } finally {
    // ✅ NEW: Check before clearing loading
    if (isMounted.current) {
      setIsSearching(false);
    }
  }
}, []);

  // Attendance change handler
  const handleAttendanceChange = useCallback((studentId, status) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  }, []);

  // Mark all present
  const handleMarkAllPresent = useCallback(() => {
    const newAttendanceData = { ...attendanceData };
    students.forEach((student) => {
      newAttendanceData[student.id] = { status: 'Present' };
    });
    setAttendanceData(newAttendanceData);
    toast.success('All students marked as Present.');
  }, [students, attendanceData]);

  // Achieved lesson change handler
  const handleAchievedChange = useCallback((studentId, text) => {
    setAchievedLessons((prev) => ({
      ...prev,
      [studentId]: text,
    }));
  }, []);

  // Open image upload modal
  const openImageModal = useCallback((student) => {
    setSelectedStudentForImage(student);
    setImageModalOpen(true);
  }, []);

  // Close image upload modal
  const closeImageModal = useCallback(() => {
    setImageModalOpen(false);
    setSelectedStudentForImage(null);
  }, []);

  // Image upload handler (passed to modal)
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

  // Update uploaded image after successful upload
  const handleImageUploadComplete = useCallback((imageUrl) => {
    if (selectedStudentForImage) {
      setUploadedImages((prev) => ({
        ...prev,
        [selectedStudentForImage.id]: imageUrl,
      }));
    }
  }, [selectedStudentForImage]);

  // Delete image
  const handleDeleteImage = useCallback((studentId) => {
    setUploadedImages((prev) => {
      const updated = { ...prev };
      delete updated[studentId];
      return updated;
    });
    toast.success('Image removed.');
  }, []);

  // Submit handler
  // ============================================
// PROGRESSPAGE.JS - CORRECTED handleSubmit
// ============================================
// Location: Lines 270-343
// Replace your current handleSubmit with this:

const handleSubmit = useCallback(async () => {
  // ✅ CHECK 1: Initial check
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

    // Create new attendance records
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

    // Update existing attendance records
    for (const update of attendanceUpdates) {
      if (!update.attendance_id) continue;

      await axios.put(
        `${API_URL}/api/attendance/${update.attendance_id}/update/`,
        update,
        { headers: getAuthHeaders() }
      );
    }
    
    // ✅ CHECK 2: Before state updates/toast
    if (!isMounted.current) return;

    toast.success('Progress saved successfully!');
  } catch (err) {
    // ✅ CHECK 3: Before showing error (MISSING IN YOUR CODE)
    if (!isMounted.current) return;
    
    console.error('Error saving progress:', err);
    toast.error(`Failed to save: ${err.response?.data?.detail || err.message}`);
  } finally {
    // ✅ CHECK 4: Before clearing loading (MISSING IN YOUR CODE)
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
        <span style={{ fontWeight: '500', color: '#1F2937' }}>{value}</span>
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
      render: (_, row) => (
        <CompactRichTextEditor
          value={achievedLessons[row.id] || ''}
          onChange={(text) => handleAchievedChange(row.id, text)}
          placeholder="Enter achieved lesson..."
        />
      ),
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <button
              onClick={() => openImageModal(row)}
              style={{
                padding: '0.375rem 0.625rem',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3B82F6')}
            >
              📷 {imageUrl ? 'Change' : 'Upload'}
            </button>

            {imageUrl && (
              <>
                <img
                  src={imageUrl}
                  alt="Uploaded"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '0.25rem',
                    objectFit: 'cover',
                    border: '1px solid #E5E7EB',
                  }}
                  onError={(e) => (e.target.style.display = 'none')}
                />
                <button
                  onClick={() => handleDeleteImage(row.id)}
                  style={{
                    padding: '0.25rem',
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '0.25rem',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#DC2626')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#EF4444')}
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
  ], [attendanceData, achievedLessons, uploadedImages, handleAttendanceChange, handleAchievedChange, openImageModal, handleDeleteImage]);

  // ============================================
  // STYLES
  // ============================================

  const pageContainerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1.5rem',
  };

  const headerStyle = {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: '1.5rem',
    textAlign: 'center',
  };

  const plannedTopicStyle = {
    padding: '1rem',
    backgroundColor: '#EFF6FF',
    borderRadius: '0.5rem',
    borderLeft: '4px solid #3B82F6',
    marginBottom: '1rem',
  };

  const actionBarStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1rem',
    padding: '1rem',
    backgroundColor: '#F9FAFB',
    borderRadius: '0.5rem',
  };

  const bulkActionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  };

  const submitContainerStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '1.5rem',
  };

  const submitButtonStyle = {
    padding: '0.75rem 2rem',
    backgroundColor: isSubmitting ? '#9CA3AF' : '#10B981',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: isSubmitting ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const emptyStateStyle = {
    padding: '3rem',
    textAlign: 'center',
    color: '#9CA3AF',
    backgroundColor: '#F9FAFB',
    borderRadius: '0.5rem',
  };

  // ============================================
  // RENDER - Loading State
  // ============================================

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <LoadingSpinner size="large" message="Loading..." />
      </div>
    );
  }

  // ============================================
  // RENDER - Main Content
  // ============================================

  return (
    <div style={pageContainerStyle}>
      {/* Page Header */}
      <h1 style={headerStyle}>📊 Session Progress</h1>

      {/* Filter Bar */}
      <FilterBar
        showDate={true}
        showSchool={true}
        showClass={true}
        showMonth={false}
        preventFutureDates={true}
        submitButtonText="🔍 Fetch Students"
        showResetButton={true}
        onFilter={handleFilter}
      />

      {/* Loading State */}
      {isSearching && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <LoadingSpinner size="large" message="Fetching students..." />
        </div>
      )}

      {/* Results Section */}
      {!isSearching && hasSearched && students.length > 0 && (
        <>
          {/* Planned Topic */}
          <div style={plannedTopicStyle}>
            <strong style={{ color: '#1E40AF' }}>📚 Planned Lesson:</strong>{' '}
            <span style={{ color: '#374151' }}>{plannedTopic}</span>
          </div>

          {/* Action Bar */}
          <div style={actionBarStyle}>
            <div style={bulkActionStyle}>
              <button
                onClick={handleMarkAllPresent}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10B981')}
              >
                ✓ Mark All Present
              </button>
            </div>

            <ProgressIndicator
              completed={progressStats.completed}
              total={progressStats.total}
              label="Progress:"
              size="medium"
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
          <div style={submitContainerStyle}>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={submitButtonStyle}
              onMouseEnter={(e) => {
                if (!isSubmitting) e.currentTarget.style.backgroundColor = '#059669';
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) e.currentTarget.style.backgroundColor = '#10B981';
              }}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="tiny" />
                  Saving...
                </>
              ) : (
                <>✅ Save Progress</>
              )}
            </button>
          </div>
        </>
      )}

      {/* Empty State */}
      {!isSearching && hasSearched && students.length === 0 && (
        <div style={emptyStateStyle}>
          <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
            No students found for the selected criteria.
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            Try selecting a different date, school, or class.
          </p>
        </div>
      )}

      {/* Initial State */}
      {!hasSearched && !isSearching && (
        <div style={emptyStateStyle}>
          <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
            👆 Select date, school, and class above
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            Then click "Fetch Students" to load student data.
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
    </div>
  );
};

export default ProgressPage;