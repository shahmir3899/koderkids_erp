// ============================================
// STUDENTS PAGE - Refactored Version with React Query
// Client-side filtering with data load on mount
// Fixed: School filtering by NAME (not ID)
// Enhanced: Delete Confirmation Modal & Stats Cards
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';

// React Query Hooks
import { useActiveStudents, useUpdateStudent, useDeleteStudent } from '../hooks/queries';

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  LAYOUT,
} from '../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../hooks/useResponsive';

// Common Components
import { DataTable } from '../components/common/tables/DataTable';
import { ErrorDisplay } from '../components/common/ui/ErrorDisplay';
import { FilterBar } from '../components/common/filters/FilterBar';
import { useSchools } from '../hooks/useSchools';
import { Button } from '../components/common/ui/Button';
import { ConfirmationModal } from '../components/common/modals/ConfirmationModal';
import { PageHeader } from '../components/common/PageHeader';

// Page-Specific Components
import AddStudentPopup from './AddStudentPopup';
import { StudentDetailsModal } from '../components/students/StudentDetailsModal';
import { StudentStatsCards } from '../components/students/StudentStatsCards';

function StudentsPage() {
  // ============================================
  // RESPONSIVE HOOK
  // ============================================
  const { isMobile } = useResponsive();

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  // React Query - Fetch all active students
  const {
    data: students = [],
    isLoading: isLoadingStudents,
    error: studentsError,
    refetch: refetchStudents,
  } = useActiveStudents();

  // React Query Mutations
  const updateStudentMutation = useUpdateStudent();
  const deleteStudentMutation = useDeleteStudent();

  // Local UI States
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [classes, setClasses] = useState(['All Classes']);

  // UI States
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [currentFilters, setCurrentFilters] = useState({
    schoolId: '',
    className: '',
  });

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    studentId: null,
    studentName: '',
  });

  // Hover State for Buttons
  const [hoveredButton, setHoveredButton] = useState(null);

  // Derived loading states from React Query
  const loading = {
    students: isLoadingStudents,
    submit: updateStudentMutation.isPending,
    delete: deleteStudentMutation.isPending,
  };

  // Error state from React Query
  const error = studentsError?.message || null;

  // Use Schools Hook
  const { schools } = useSchools();

  // ============================================
  // HELPER: Get school name from school ID
  // ============================================
  const getSchoolNameById = useCallback((schoolId) => {
    if (!schoolId || !schools || schools.length === 0) return null;
    const school = schools.find(s => String(s.id) === String(schoolId));
    return school ? school.name : null;
  }, [schools]);

  // ============================================
  // EFFECTS
  // ============================================

  // Extract classes when students load OR when school filter changes
  useEffect(() => {
    if (students.length > 0) {
      let sourceStudents = students;

      // If school is selected, filter to that school's students for class extraction
      if (currentFilters.schoolId && schools.length > 0) {
        const selectedSchoolName = getSchoolNameById(currentFilters.schoolId);
        console.log('🏫 Looking for school name:', selectedSchoolName);
        
        if (selectedSchoolName) {
          sourceStudents = students.filter(s => {
            // Normalize both strings: trim whitespace and newlines, lowercase
            const studentSchool = String(s.school || '').trim().toLowerCase();
            const filterSchool = selectedSchoolName.trim().toLowerCase();
            return studentSchool === filterSchool;
          });
        }
        console.log(`🏫 Filtered to school "${selectedSchoolName}": ${sourceStudents.length} students`);
      }

      const uniqueClasses = Array.from(
        new Set(sourceStudents.map((student) => student.student_class).filter(Boolean))
      ).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

      setClasses(['All Classes', ...uniqueClasses]);
      console.log('✅ Extracted Classes:', uniqueClasses);
    }
  }, [students, currentFilters.schoolId, schools, getSchoolNameById]);

  // ============================================
  // FILTER HANDLERS
  // ============================================

  const handleFilter = (filters) => {
    console.log('🔍 Search clicked with filters:', filters);
    
    // Normalize the filters from FilterBar
    const normalizedFilters = {
      schoolId: filters.schoolId || filters.school || '',
      className: filters.className || filters.class || '',
    };
    
    console.log('🔍 Normalized filters:', normalizedFilters);
    
    // Get school name for debugging
    if (normalizedFilters.schoolId && schools.length > 0) {
      const schoolName = getSchoolNameById(normalizedFilters.schoolId);
      console.log('🏫 Will filter by school name:', schoolName);
    }
    
    setCurrentFilters(normalizedFilters);
    setHasSearched(true);
  };

  // ============================================
  // STUDENT ACTIONS
  // ============================================

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setIsEditing(false);
  };

  const handleCloseDetails = () => {
    setSelectedStudent(null);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSaveChanges = async (updatedStudent) => {
    console.log('📝 Updating student:', updatedStudent);

    if (!updatedStudent.student_class) {
      toast.error('⚠️ Please select a valid class.');
      return;
    }

    if (!updatedStudent.school) {
      toast.error('⚠️ Please select a valid school.');
      return;
    }

    const studentData = {
      reg_num: updatedStudent.reg_num,
      name: updatedStudent.name,
      school: Number(updatedStudent.school),
      student_class: String(updatedStudent.student_class),
      monthly_fee: updatedStudent.monthly_fee ? Number(updatedStudent.monthly_fee) : null,
      phone: updatedStudent.phone || '',
    };

    console.log('📡 Sending update request with:', studentData);

    updateStudentMutation.mutate(
      { studentId: selectedStudent.id, studentData },
      {
        onSuccess: (updated) => {
          console.log('✅ Student updated successfully:', updated);
          setSelectedStudent(updated);
          setIsEditing(false);
          toast.success('✅ Student updated successfully!');
        },
        onError: (error) => {
          console.error('❌ Error updating student:', error);
          if (error.response) {
            console.log('🚨 Backend Error Response:', error.response.data);
            const errorMessage = typeof error.response.data === 'object'
              ? JSON.stringify(error.response.data)
              : error.response.data.error || 'Unknown Error';
            toast.error(`⚠️ Update Failed: ${errorMessage}`);
          } else {
            toast.error('⚠️ Failed to update student.');
          }
        },
      }
    );
  };

  // ============================================
  // DELETE HANDLERS (with Confirmation Modal)
  // ============================================

  // Opens confirmation modal
  const openDeleteConfirm = (student) => {
    setDeleteConfirm({
      isOpen: true,
      studentId: student.id,
      studentName: student.name || `Student #${student.reg_num}`,
    });
  };

  // Actual delete logic (called after confirmation)
  const confirmDelete = async () => {
    const studentId = deleteConfirm.studentId;

    deleteStudentMutation.mutate(studentId, {
      onSuccess: () => {
        console.log('✅ Student deleted successfully');
        setSelectedStudent(null);
        // Close the confirmation modal
        setDeleteConfirm({ isOpen: false, studentId: null, studentName: '' });
        toast.success('✅ Student deleted successfully!');
      },
      onError: (error) => {
        console.error('❌ Error deleting student:', error);
        toast.error('⚠️ Failed to delete student.');
      },
    });
  };

  // Cancel delete - close modal
  const cancelDelete = () => {
    if (!loading.delete) {
      setDeleteConfirm({ isOpen: false, studentId: null, studentName: '' });
    }
  };

  const handleAddNewStudent = () => {
    setIsAdding(true);
  };

  // ============================================
  // FILTERED DATA - Client-side filtering
  // ============================================

  const filteredStudents = useMemo(() => {
    // Don't show anything until user clicks Search
    if (!hasSearched) {
      console.log('⏸️ Not showing students - search not clicked yet');
      return [];
    }

    // Wait for schools data to be loaded for proper filtering
    if (currentFilters.schoolId && schools.length === 0) {
      console.log('⏳ Waiting for schools data to load...');
      return [];
    }

    console.log('🔍 Filtering students...');
    console.log('   Total students:', students.length);
    console.log('   Filters:', currentFilters);
    console.log('   Schools loaded:', schools.length);

    // Get the school name from the schoolId
    const selectedSchoolName = currentFilters.schoolId 
      ? getSchoolNameById(currentFilters.schoolId)
      : null;
    
    console.log('   Selected school name:', selectedSchoolName);

    const results = students.filter(student => {
      // School filter - COMPARE BY NAME
      if (currentFilters.schoolId && selectedSchoolName) {
        // Normalize both strings: trim whitespace/newlines and compare lowercase
        const studentSchool = String(student.school || '').trim().toLowerCase();
        const filterSchool = selectedSchoolName.trim().toLowerCase();
        
        if (studentSchool !== filterSchool) {
          return false;
        }
      }

      // Class filter
      if (currentFilters.className && currentFilters.className !== 'All Classes') {
        if (String(student.student_class) !== String(currentFilters.className)) {
          return false;
        }
      }

      return true;
    });

    console.log('✅ Filtered results:', results.length, 'students');
    return results;
  }, [students, currentFilters, hasSearched, schools, getSchoolNameById]);

  // ============================================
  // STATISTICS CALCULATION
  // ============================================

  const studentStats = useMemo(() => {
    const uniqueSchools = new Set(students.map(s => s.school).filter(Boolean));
    const totalFees = students.reduce((sum, s) => sum + (s.monthly_fee || 0), 0);

    return {
      totalStudents: students.length,
      filteredCount: filteredStudents.length,
      schoolsCount: uniqueSchools.size,
      totalFees: totalFees,
    };
  }, [students, filteredStudents]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={styles.pageContainer}>
      <div style={styles.contentWrapper}>
      {/* Page Header */}
      <PageHeader
        icon="👨‍🎓"
        title="Student Management"
        subtitle="View and manage all enrolled students"
        actions={
          <Button
            onClick={handleAddNewStudent}
            variant="success"
            size="large"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.5), 0 0 40px rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontWeight: 600,
              letterSpacing: '0.5px',
              padding: '12px 24px',
              fontSize: '15px',
            }}
          >
            ✨ Add New Student
          </Button>
        }
      />

      {/* Statistics Cards */}
      <StudentStatsCards
        totalStudents={studentStats.totalStudents}
        filteredCount={studentStats.filteredCount}
        schoolsCount={studentStats.schoolsCount}
        totalFees={studentStats.totalFees}
        hasSearched={hasSearched}
        isLoading={loading.students}
      />

      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={refetchStudents}
          isRetrying={loading.students}
        />
      )}

      {/* Filters */}
      <FilterBar
        onFilter={handleFilter}
        showSchool
        showClass
        showMonth={false}
        showSearch={false}
        searchPlaceholder="Search by Name or Reg Num"
        submitButtonText="🔍 Search"
      />

      {/* Students Table */}
      <DataTable
        data={filteredStudents}
        loading={loading.students}
        columns={[
          {
            key: 'reg_num',
            label: 'Reg Num',
            sortable: true,
            width: '120px',
          },
          {
            key: 'name',
            label: 'Name',
            sortable: true,
          },
          {
            key: 'school',
            label: 'School',
            sortable: false,
            render: (value) => {
              // Clean up the school name (remove trailing newlines/spaces)
              return value ? String(value).trim() : 'N/A';
            },
          },
          {
            key: 'student_class',
            label: 'Class',
            sortable: true,
            align: 'center',
          },
          {
            key: 'monthly_fee',
            label: 'Monthly Fee',
            sortable: true,
            align: 'right',
            render: (value) => (value ? `PKR ${value.toLocaleString()}` : 'N/A'),
          },
          {
            key: 'phone',
            label: 'Phone',
            sortable: false,
          },
          {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            align: 'center',
            render: (_, student) => (
              <div style={styles.actionButtonsContainer}>
                <button
                  onClick={() => handleViewDetails(student)}
                  style={styles.viewButton(hoveredButton === `view-${student.id}`)}
                  onMouseEnter={() => setHoveredButton(`view-${student.id}`)}
                  onMouseLeave={() => setHoveredButton(null)}
                >
                  👁️ View
                </button>
                <button
                  onClick={() => openDeleteConfirm(student)}
                  disabled={loading.delete}
                  style={styles.deleteButton(
                    loading.delete,
                    hoveredButton === `delete-${student.id}`
                  )}
                  onMouseEnter={() => !loading.delete && setHoveredButton(`delete-${student.id}`)}
                  onMouseLeave={() => setHoveredButton(null)}
                >
                  🗑️ Delete
                </button>
              </div>
            ),
          },
        ]}
        emptyMessage={
          hasSearched
            ? 'No students found. Try adjusting your filters.'
            : 'Select filters and click Search to view students.'
        }
        striped
        hoverable
      />

      {/* Student Details Modal */}
      {selectedStudent && (
        <StudentDetailsModal
          student={selectedStudent}
          isEditing={isEditing}
          onClose={handleCloseDetails}
          onSave={handleSaveChanges}
          onEdit={handleEdit}
          onCancel={handleCancel}
          onDelete={() => openDeleteConfirm(selectedStudent)}
          schools={schools}
          classes={classes}
          isSubmitting={loading.submit}
          isDeleting={loading.delete}
        />
      )}

      {/* Add Student Popup */}
      {isAdding && (
        <AddStudentPopup
          onClose={() => setIsAdding(false)}
          onStudentAdded={() => {
            setIsAdding(false);
            refetchStudents();
          }}
          schools={schools}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Student"
        message="Are you sure you want to delete this student? This action cannot be undone."
        itemName={deleteConfirm.studentName}
        confirmText="Delete Student"
        cancelText="Cancel"
        variant="danger"
        isLoading={loading.delete}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      </div>
    </div>
  );
}

// ============================================
// STYLES - Centralized design constants
// ============================================
const styles = {
  pageContainer: {
    minHeight: '100vh',
    background: COLORS.background.gradient,
    padding: SPACING.xl,
  },
  contentWrapper: {
    maxWidth: LAYOUT.maxWidth.md,
    margin: '0 auto',
  },
  pageTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    display: 'flex',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  viewButton: (isHovered) => ({
    backgroundColor: isHovered ? COLORS.status.infoDark : COLORS.status.info,
    color: COLORS.text.white,
    padding: `${SPACING.sm} ${SPACING.md}`,
    borderRadius: BORDER_RADIUS.sm,
    border: 'none',
    cursor: 'pointer',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    transition: `background-color ${TRANSITIONS.fast} ease`,
  }),
  deleteButton: (isDisabled, isHovered) => ({
    backgroundColor: isDisabled
      ? COLORS.interactive.disabled
      : (isHovered ? COLORS.status.errorDarker : COLORS.status.errorDark),
    color: COLORS.text.white,
    padding: `${SPACING.sm} ${SPACING.md}`,
    borderRadius: BORDER_RADIUS.sm,
    border: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    transition: `background-color ${TRANSITIONS.fast} ease`,
    opacity: isDisabled ? 0.6 : 1,
  }),
};

export default StudentsPage;