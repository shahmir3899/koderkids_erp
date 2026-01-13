// ============================================
// SCHOOLS PAGE - Final Version with Direct API Call
// Admin: Full CRUD | Teacher: Only assigned schools
// ============================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useSchools } from '../hooks/useSchools';
import { deleteSchool } from '../api/services/schoolService';
import { getTeacherDashboardData } from '../services/teacherService';

// Components
import { SchoolStatsCards } from '../components/schools/SchoolStatsCards';
import { SchoolCard } from '../components/schools/SchoolCard';
import { Button } from '../components/common/ui/Button';
import { ErrorDisplay } from '../components/common/ui/ErrorDisplay';
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { ConfirmationModal } from '../components/common/modals/ConfirmationModal';
import { AddSchoolModal } from '../components/schools/AddSchoolModal';
import { SchoolDetailsModal } from '../components/schools/SchoolDetailsModal';

function SchoolsPage() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Teacher assigned schools
  const [assignedSchoolNames, setAssignedSchoolNames] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    schoolId: null,
    schoolName: '',
  });

  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch schools with statistics
  const { schools, overview, loading, error, refetch } = useSchools(true, true);

  // Get user role from localStorage
  const userRole = localStorage.getItem('role') || 'Teacher';
  const isAdmin = userRole === 'Admin';
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);
  // ============================================
  // FETCH TEACHER'S ASSIGNED SCHOOLS
  // ============================================

  // ============================================
// FETCH TEACHER'S ASSIGNED SCHOOLS
// ============================================

// ============================================
// FETCH TEACHER'S ASSIGNED SCHOOLS
// ============================================

  useEffect(() => {
    const fetchAssignedSchools = async () => {
      // ✅ CRITICAL FIX: Only fetch for teachers, not admins!
      if (isAdmin) {
        console.log('👑 Admin user detected - no need to fetch assigned schools');
        return;
      }

      // Check if mounted before starting
      if (!isMounted.current) return;

      setProfileLoading(true);
      try {
        console.log('👨‍🏫 Fetching teacher dashboard data...');
        
        // Use the same service as TeacherDashboardFigma
        const dashboardData = await getTeacherDashboardData();
        
        // Check before state updates
        if (!isMounted.current) return;
        
        console.log('✅ Teacher dashboard data loaded:', dashboardData);
        console.log('👨‍🏫 Profile:', dashboardData.profile);
        
        // Extract assigned school names from profile
        const schoolNames = dashboardData.profile?.school_names || [];
        setAssignedSchoolNames(schoolNames);
        
        console.log('👨‍🏫 Assigned school names:', schoolNames);
      } catch (err) {
        // Check before showing errors
        if (!isMounted.current) return;
        
        console.error('❌ Error fetching assigned schools:', err);
        console.error('Error details:', err.response?.data);
        
        // Set empty array on error for teachers
        setAssignedSchoolNames([]);
      } finally {
        // Check before clearing loading
        if (isMounted.current) {
          setProfileLoading(false);
        }
      }
    };

    fetchAssignedSchools();
  }, [isAdmin]); // Include isAdmin in dependencies

  console.log('👤 User Info:', { 
    userRole, 
    isAdmin, 
    assignedSchoolNames,
    profileLoading 
  });

  // ============================================
  // COMPUTED VALUES
  // ============================================

  // Calculate stats for cards (use filtered schools for teachers)
  const stats = useMemo(() => {
    // For teachers, calculate stats from their assigned schools only
    const sourceSchools = !isAdmin && assignedSchoolNames.length > 0
      ? schools.filter(s => {
          const schoolName = String(s.name || '').trim().toLowerCase();
          return assignedSchoolNames.some(assigned => 
            String(assigned).trim().toLowerCase() === schoolName
          );
        })
      : schools;

    if (overview && isAdmin) {
      // Admin sees overall stats from API
      return {
        totalSchools: overview.total_schools || 0,
        totalStudents: overview.total_students || 0,
        totalRevenue: overview.total_monthly_revenue || 0,
        avgCapacity: schools.length > 0
          ? Math.round(
              schools.reduce((sum, s) => sum + (s.capacity_utilization || 0), 0) / schools.length
            )
          : 0,
      };
    }

    // Teacher or fallback calculation from filtered schools
    return {
      totalSchools: sourceSchools.length,
      totalStudents: sourceSchools.reduce((sum, s) => sum + (s.total_students || 0), 0),
      totalRevenue: sourceSchools.reduce((sum, s) => sum + (s.monthly_revenue || 0), 0),
      avgCapacity: sourceSchools.length > 0
        ? Math.round(
            sourceSchools.reduce((sum, s) => sum + (s.capacity_utilization || 0), 0) / sourceSchools.length
          )
        : 0,
    };
  }, [schools, overview, isAdmin, assignedSchoolNames]);

  // Filter schools by search query AND teacher assignment
  const filteredSchools = useMemo(() => {
  let schoolsList = schools;

  // ✅ FIX: Only filter for teachers, not admins
  if (!isAdmin && assignedSchoolNames.length > 0) {
    // Teacher has assigned schools - filter by school names
    schoolsList = schools.filter(school => {
      const schoolName = String(school.name || '').trim().toLowerCase();
      return assignedSchoolNames.some(assigned => 
        String(assigned).trim().toLowerCase() === schoolName
      );
    });
    console.log(`👨‍🏫 Teacher filter: ${assignedSchoolNames.join(', ')} → Found ${schoolsList.length} schools`);
  } else if (!isAdmin && !profileLoading) {
    // Teacher profile loaded but has NO assigned schools - show empty list
    console.warn('⚠️ Teacher has no assigned schools - showing empty list');
    schoolsList = [];
  }
  // ✅ ELSE: Admin sees ALL schools (no filtering)

  // Apply search query
  if (!searchQuery.trim()) return schoolsList;

  const query = searchQuery.toLowerCase();
  return schoolsList.filter(
    (school) =>
      school.name?.toLowerCase().includes(query) ||
      school.address?.toLowerCase().includes(query) ||
      school.location?.toLowerCase().includes(query)
  );
}, [schools, searchQuery, isAdmin, assignedSchoolNames, profileLoading]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleAddSchool = () => {
    setIsAddModalOpen(true);
  };

  const handleViewSchool = (school) => {
    setSelectedSchool(school);
    setIsEditMode(false);
    setIsDetailsModalOpen(true);
  };

  const handleEditSchool = (school) => {
    setSelectedSchool(school);
    setIsEditMode(false);
    setIsDetailsModalOpen(true);
  };

  const handleEnableEdit = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const handleSchoolAdded = () => {
    refetch();
  };

  const handleSchoolUpdated = () => {
    setIsDetailsModalOpen(false);
    setSelectedSchool(null);
    setIsEditMode(false);
    refetch();
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedSchool(null);
    setIsEditMode(false);
  };

  // Delete handlers
  const openDeleteConfirm = (school) => {
    setDeleteConfirm({
      isOpen: true,
      schoolId: school.id,
      schoolName: school.name,
    });
  };

  const confirmDelete = async () => {
    const schoolId = deleteConfirm.schoolId;
    setIsDeleting(true);

    try {
      await deleteSchool(schoolId);
      console.log('✅ School deleted successfully');

      // Close modal and refresh
      setDeleteConfirm({ isOpen: false, schoolId: null, schoolName: '' });
      refetch();

      toast.success('✅ School deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting school:', error);
      const errorMsg = error.response?.data?.error || 'Failed to delete school';
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    if (!isDeleting) {
      setDeleteConfirm({ isOpen: false, schoolId: null, schoolName: '' });
    }
  };

  // ============================================
  // RENDER
  // ============================================

  // Show loading while fetching assigned schools
  const isLoading = loading || (!isAdmin && profileLoading);

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
        {isAdmin ? '🏫 School Management' : '🏫 My Schools'}
      </h1>

      {/* Statistics Cards */}
      <SchoolStatsCards
        totalSchools={stats.totalSchools}
        totalStudents={stats.totalStudents}
        totalRevenue={stats.totalRevenue}
        avgCapacity={stats.avgCapacity}
        isLoading={isLoading}
      />

      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={refetch}
          isRetrying={loading}
        />
      )}

      {/* Toolbar: Search + Add Button */}
      {!isLoading && !error && (
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="🔍 Search schools by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: '1',
              minWidth: '250px',
              padding: '0.625rem 1rem',
              border: '1px solid #D1D5DB',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              color: '#374151',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3B82F6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#D1D5DB';
              e.target.style.boxShadow = 'none';
            }}
          />

          {isAdmin && (
            <Button variant="primary" onClick={handleAddSchool}>
              ➕ Add New School
            </Button>
          )}
        </div>
      )}

      {/* Schools Grid */}
      {!error && filteredSchools.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
            marginTop: '2rem',
          }}
        >
          {filteredSchools.map((school) => (
            <SchoolCard
              key={school.id}
              school={school}
              onView={handleViewSchool}
              onEdit={handleEditSchool}
              onDelete={openDeleteConfirm}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!error && filteredSchools.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: '#6B7280',
          }}
        >
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
            {searchQuery ? '🔍' : !isAdmin && assignedSchoolNames.length === 0 ? '⚠️' : '🏫'}
          </div>
          <div
            style={{
              fontSize: '1.125rem',
              fontWeight: '500',
              marginBottom: '0.5rem',
            }}
          >
            {searchQuery
              ? 'No schools found matching your search'
              : !isAdmin && assignedSchoolNames.length === 0
              ? 'No Schools Assigned'
              : 'No schools available'}
          </div>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
            {searchQuery
              ? 'Try adjusting your search query'
              : !isAdmin && assignedSchoolNames.length === 0
              ? 'Please contact your administrator to assign you to a school'
              : isAdmin
              ? 'Click "Add New School" to get started'
              : 'Schools will appear here once added'}
          </p>
        </div>
      )}

      {/* Add School Modal */}
      <AddSchoolModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleSchoolAdded}
      />

      {/* School Details Modal */}
      <SchoolDetailsModal
        school={selectedSchool}
        isOpen={isDetailsModalOpen}
        isEditing={isEditMode}
        onClose={handleCloseDetailsModal}
        onEdit={handleEnableEdit}
        onCancel={handleCancelEdit}
        onSave={handleSchoolUpdated}
        isAdmin={isAdmin}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        title="Delete School"
        message="Are you sure you want to delete this school? This action cannot be undone."
        itemName={deleteConfirm.schoolName}
        confirmText="Delete School"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}

export default SchoolsPage;