// ============================================
// STUDENTS PAGE - Refactored Version
// Client-side filtering with data load on mount
// Fixed: School filtering by NAME (not ID)
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { fetchStudents as fetchStudentsAPI, updateStudent, deleteStudent } from '../services/studentService';
import { toast } from 'react-toastify';

// Common Components
import { DataTable } from '../components/common/tables/DataTable';
import { ErrorDisplay } from '../components/common/ui/ErrorDisplay';
import { FilterBar } from '../components/common/filters/FilterBar';
import { useSchools } from '../hooks/useSchools';
import { Button } from '../components/common/ui/Button';

// Page-Specific Components
import AddStudentPopup from './AddStudentPopup';
import { StudentDetailsModal } from '../components/students/StudentDetailsModal';

function StudentsPage() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================

  // Data States
  const [students, setStudents] = useState([]);
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

  // Loading States (Consolidated)
  const [loading, setLoading] = useState({
    students: false,
    submit: false,
    delete: false,
  });

  // Error State
  const [error, setError] = useState(null);

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
  // DATA FETCHING
  // ============================================

  // Fetch ALL students once (no filters - we filter client-side)
  const fetchStudents = useCallback(async () => {
    setLoading((prev) => ({ ...prev, students: true }));
    setError(null);

    try {
      console.log('🔍 Fetching ALL students from server...');

      const response = await fetchStudentsAPI({
        schoolId: '',
        studentClass: '',
        status: 'Active'
      });

      if (!Array.isArray(response)) {
        console.error('❌ Error: Expected an array but received:', response);
        setError('Invalid data received from server');
        setStudents([]);
        return;
      }

      console.log('✅ Student Data Loaded:', response.length, 'students');
      
      // Debug: Log sample student structure
      if (response.length > 0) {
        console.log('📋 Sample student structure:', {
          id: response[0].id,
          name: response[0].name,
          school: response[0].school,
          schoolType: typeof response[0].school,
          student_class: response[0].student_class,
        });
      }
      
      setStudents(response);

    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to fetch students.');
      toast.error('Failed to fetch students');
    } finally {
      setLoading((prev) => ({ ...prev, students: false }));
    }
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  // Fetch ALL students once on mount
  useEffect(() => {
    console.log('📦 Page Mount: Fetching all students...');
    fetchStudents();
  }, [fetchStudents]);

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

    setLoading((prev) => ({ ...prev, submit: true }));

    try {
      const studentData = {
        reg_num: updatedStudent.reg_num,
        name: updatedStudent.name,
        school: Number(updatedStudent.school),
        student_class: String(updatedStudent.student_class),
        monthly_fee: updatedStudent.monthly_fee ? Number(updatedStudent.monthly_fee) : null,
        phone: updatedStudent.phone || '',
      };

      console.log('📡 Sending update request with:', studentData);

      const updated = await updateStudent(selectedStudent.id, studentData);
      console.log('✅ Student updated successfully:', updated);

      // Update local state
      setStudents((prev) =>
        prev.map((s) => (s.id === selectedStudent.id ? updated : s))
      );
      setSelectedStudent(updated);
      setIsEditing(false);

      toast.success('✅ Student updated successfully!');
    } catch (error) {
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
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  const handleDeleteStudent = async (studentId) => {
    setLoading((prev) => ({ ...prev, delete: true }));

    try {
      await deleteStudent(studentId);
      console.log('✅ Student deleted successfully');

      // Remove from local state
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      setSelectedStudent(null);

      toast.success('✅ Student deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting student:', error);
      toast.error('⚠️ Failed to delete student.');
    } finally {
      setLoading((prev) => ({ ...prev, delete: false }));
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
  // RENDER
  // ============================================

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Title */}
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1F2937',
          marginBottom: '1.5rem',
          textAlign: 'center',
        }}
      >
        Student Management
      </h1>

      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={fetchStudents}
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
        additionalActions={
          <Button onClick={handleAddNewStudent} variant="primary">
            ➕ Add New Student
          </Button>
        }
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
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button
                  onClick={() => handleViewDetails(student)}
                  style={{
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = '#2563EB')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = '#3B82F6')}
                >
                  👁️ View
                </button>
                <button
                  onClick={() => handleDeleteStudent(student.id)}
                  disabled={loading.delete}
                  style={{
                    backgroundColor: loading.delete ? '#9CA3AF' : '#DC2626',
                    color: 'white',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: loading.delete ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'background-color 0.15s ease',
                    opacity: loading.delete ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading.delete) e.target.style.backgroundColor = '#B91C1C';
                  }}
                  onMouseLeave={(e) => {
                    if (!loading.delete) e.target.style.backgroundColor = '#DC2626';
                  }}
                >
                  {loading.delete ? 'Deleting...' : '🗑️ Delete'}
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
          onDelete={handleDeleteStudent}
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
            fetchStudents();
          }}
        />
      )}
    </div>
  );
}

export default StudentsPage;