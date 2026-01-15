// ============================================
// SCHOOLS PAGE - Glassmorphism Design Version
// Admin: Full CRUD | Teacher: Only assigned schools
// ============================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useSchools } from '../hooks/useSchools';
import { deleteSchool } from '../api/services/schoolService';
import { getTeacherDashboardData } from '../services/teacherService';

// Design System
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  MIXINS,
  LAYOUT,
} from '../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../hooks/useResponsive';

// Components
import { SchoolStatsCards } from '../components/schools/SchoolStatsCards';
import { SchoolCard } from '../components/schools/SchoolCard';
import { Button } from '../components/common/ui/Button';
import { ErrorDisplay } from '../components/common/ui/ErrorDisplay';
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { ConfirmationModal } from '../components/common/modals/ConfirmationModal';
import { AddSchoolModal } from '../components/schools/AddSchoolModal';
import { SchoolDetailsModal } from '../components/schools/SchoolDetailsModal';
import { PageHeader } from '../components/common/PageHeader';

// Styles
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
  toolbar: {
    display: 'flex',
    gap: SPACING.lg,
    marginBottom: SPACING['2xl'],
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchInput: {
    flex: '1',
    minWidth: '250px',
    padding: `${SPACING.md} ${SPACING.lg}`,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    outline: 'none',
  },
  schoolsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: SPACING.xl,
    marginTop: SPACING['2xl'],
  },
  emptyState: {
    textAlign: 'center',
    padding: SPACING['2xl'],
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.lg,
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },
};

function SchoolsPage() {
  // ============================================
  // RESPONSIVE HOOK
  // ============================================
  const { isMobile } = useResponsive();

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

  useEffect(() => {
    const fetchAssignedSchools = async () => {
      if (isAdmin) {
        console.log('Admin user detected - no need to fetch assigned schools');
        return;
      }

      if (!isMounted.current) return;

      setProfileLoading(true);
      try {
        console.log('Fetching teacher dashboard data...');

        const dashboardData = await getTeacherDashboardData();

        if (!isMounted.current) return;

        const schoolNames = dashboardData.profile?.school_names || [];
        setAssignedSchoolNames(schoolNames);

      } catch (err) {
        if (!isMounted.current) return;

        console.error('Error fetching assigned schools:', err);
        setAssignedSchoolNames([]);
      } finally {
        if (isMounted.current) {
          setProfileLoading(false);
        }
      }
    };

    fetchAssignedSchools();
  }, [isAdmin]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const stats = useMemo(() => {
    const sourceSchools = !isAdmin && assignedSchoolNames.length > 0
      ? schools.filter(s => {
          const schoolName = String(s.name || '').trim().toLowerCase();
          return assignedSchoolNames.some(assigned =>
            String(assigned).trim().toLowerCase() === schoolName
          );
        })
      : schools;

    if (overview && isAdmin) {
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

  const filteredSchools = useMemo(() => {
    let schoolsList = schools;

    if (!isAdmin && assignedSchoolNames.length > 0) {
      schoolsList = schools.filter(school => {
        const schoolName = String(school.name || '').trim().toLowerCase();
        return assignedSchoolNames.some(assigned =>
          String(assigned).trim().toLowerCase() === schoolName
        );
      });
    } else if (!isAdmin && !profileLoading) {
      schoolsList = [];
    }

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
    setIsEditMode(true);
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

      setDeleteConfirm({ isOpen: false, schoolId: null, schoolName: '' });
      refetch();

      toast.success('School deleted successfully!');
    } catch (error) {
      console.error('Error deleting school:', error);
      const errorMsg = error.response?.data?.error || 'Failed to delete school';
      toast.error(errorMsg);
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

  const isLoading = loading || (!isAdmin && profileLoading);

  return (
    <div style={styles.pageContainer}>
      <div style={styles.contentWrapper}>
        {/* Page Header */}
        <PageHeader
          icon="🏫"
          title={isAdmin ? 'School Management' : 'My Schools'}
          subtitle={isAdmin ? 'Manage all schools and their details' : 'View your assigned schools'}
        />

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
          <div style={styles.toolbar}>
            <input
              type="text"
              placeholder="Search schools by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />

            {isAdmin && (
              <Button variant="primary" onClick={handleAddSchool}>
                Add New School
              </Button>
            )}
          </div>
        )}

        {/* Schools Grid */}
        {!error && filteredSchools.length > 0 && (
          <div style={styles.schoolsGrid}>
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
        {!error && filteredSchools.length === 0 && !isLoading && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              {searchQuery ? '🔍' : !isAdmin && assignedSchoolNames.length === 0 ? '⚠️' : '🏫'}
            </div>
            <div style={styles.emptyTitle}>
              {searchQuery
                ? 'No schools found matching your search'
                : !isAdmin && assignedSchoolNames.length === 0
                ? 'No Schools Assigned'
                : 'No schools available'}
            </div>
            <p style={styles.emptyText}>
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
    </div>
  );
}

export default SchoolsPage;
