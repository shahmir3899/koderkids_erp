// ============================================
// SCHOOLS PAGE - Glassmorphism Design Version
// Admin: Full CRUD | Teacher: Only assigned schools
// ============================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useSchools } from '../hooks/useSchools';
import { deleteSchool, reactivateSchool, fetchDeactivatedSchools } from '../api/services/schoolService';
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
import { ConfirmationModal } from '../components/common/modals/ConfirmationModal';
import { AddSchoolModal } from '../components/schools/AddSchoolModal';
import { SchoolDetailsModal } from '../components/schools/SchoolDetailsModal';
import { PageHeader } from '../components/common/PageHeader';

// Styles - responsive helper function
const getStyles = (isMobile) => ({
  pageContainer: {
    minHeight: '100vh',
    background: COLORS.background.gradient,
    padding: isMobile ? SPACING.md : SPACING.xl,
  },
  contentWrapper: {
    maxWidth: LAYOUT.maxWidth.md,
    margin: '0 auto',
  },
  pageTitle: {
    fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
    textAlign: 'center',
  },
  toolbar: {
    display: 'flex',
    gap: isMobile ? SPACING.md : SPACING.lg,
    marginBottom: isMobile ? SPACING.lg : SPACING['2xl'],
    flexWrap: 'wrap',
    alignItems: 'center',
    flexDirection: isMobile ? 'column' : 'row',
  },
  searchInput: {
    flex: '1',
    minWidth: isMobile ? '100%' : '250px',
    width: isMobile ? '100%' : 'auto',
    padding: `${SPACING.md} ${SPACING.lg}`,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    outline: 'none',
  },
  schoolsGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: isMobile ? SPACING.md : SPACING.xl,
    marginTop: isMobile ? SPACING.lg : SPACING['2xl'],
  },
  emptyState: {
    textAlign: 'center',
    padding: isMobile ? SPACING.lg : SPACING['2xl'],
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.lg,
  },
  emptyIcon: {
    fontSize: isMobile ? '3rem' : '4rem',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },
  tabsContainer: {
    display: 'flex',
    gap: SPACING.sm,
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
    flexWrap: 'wrap',
  },
  tab: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: 'none',
  },
  tabActive: {
    ...MIXINS.glassmorphic,
    color: COLORS.text.white,
  },
  tabInactive: {
    ...MIXINS.glassmorphicSubtle,
    color: COLORS.text.whiteSubtle,
  },
  deactivatedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  deactivationInfo: {
    marginTop: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  deactivationText: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
    margin: 0,
  },
  deactivationList: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.sm,
    marginBottom: 0,
    paddingLeft: SPACING.lg,
    lineHeight: 1.8,
    listStyleType: 'disc',
  },
});

function SchoolsPage() {
  // ============================================
  // RESPONSIVE HOOK
  // ============================================
  const { isMobile } = useResponsive();

  // Get responsive styles
  const styles = getStyles(isMobile);

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

  // Tab view state (active/deactivated schools)
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'deactivated'
  const [deactivatedSchools, setDeactivatedSchools] = useState([]);
  const [deactivatedLoading, setDeactivatedLoading] = useState(false);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    schoolId: null,
    schoolName: '',
  });

  const [isDeleting, setIsDeleting] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  // Fetch schools with statistics
  const { schools, overview, loading, error, refetch } = useSchools(true, true);

  // Get user role from localStorage
  const userRole = localStorage.getItem('role') || 'Teacher';
  const isAdmin = userRole === 'Admin';
  const isTeacher = userRole === 'Teacher';
  const isBDM = userRole === 'BDM';
  // Teachers can edit their assigned schools, BDM can edit all schools
  const canEdit = isAdmin || isTeacher || isBDM;
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
      if (isAdmin || isBDM) {
        console.log('Admin/BDM user detected - no need to fetch assigned schools');
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

  // Fetch deactivated schools when admin switches to deactivated tab
  useEffect(() => {
    const loadDeactivatedSchools = async () => {
      if (!isAdmin || viewMode !== 'deactivated') return;

      setDeactivatedLoading(true);
      try {
        const data = await fetchDeactivatedSchools();
        if (isMounted.current) {
          setDeactivatedSchools(data);
        }
      } catch (err) {
        console.error('Error fetching deactivated schools:', err);
        if (isMounted.current) {
          setDeactivatedSchools([]);
        }
      } finally {
        if (isMounted.current) {
          setDeactivatedLoading(false);
        }
      }
    };

    loadDeactivatedSchools();
  }, [isAdmin, viewMode]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const stats = useMemo(() => {
    const sourceSchools = !isAdmin && !isBDM && assignedSchoolNames.length > 0
      ? schools.filter(s => {
          const schoolName = String(s.name || '').trim().toLowerCase();
          return assignedSchoolNames.some(assigned =>
            String(assigned).trim().toLowerCase() === schoolName
          );
        })
      : schools;

    if (overview && (isAdmin || isBDM)) {
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
  }, [schools, overview, isAdmin, isBDM, assignedSchoolNames]);

  const filteredSchools = useMemo(() => {
    // For deactivated view, use deactivatedSchools
    if (viewMode === 'deactivated' && isAdmin) {
      if (!searchQuery.trim()) return deactivatedSchools;

      const query = searchQuery.toLowerCase();
      return deactivatedSchools.filter(
        (school) =>
          school.name?.toLowerCase().includes(query) ||
          school.address?.toLowerCase().includes(query) ||
          school.location?.toLowerCase().includes(query)
      );
    }

    // For active view
    let schoolsList = schools;

    if (!isAdmin && !isBDM && assignedSchoolNames.length > 0) {
      schoolsList = schools.filter(school => {
        const schoolName = String(school.name || '').trim().toLowerCase();
        return assignedSchoolNames.some(assigned =>
          String(assigned).trim().toLowerCase() === schoolName
        );
      });
    } else if (!isAdmin && !isBDM && !profileLoading) {
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
  }, [schools, deactivatedSchools, searchQuery, isAdmin, isBDM, assignedSchoolNames, profileLoading, viewMode]);

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
      const result = await deleteSchool(schoolId);

      setDeleteConfirm({ isOpen: false, schoolId: null, schoolName: '' });
      refetch();

      // Show detailed success message
      const details = result.details || {};
      toast.success(
        `School deactivated! ${details.students_deactivated || 0} students marked as Left, ${details.teachers_unassigned || 0} teachers unassigned.`
      );
    } catch (error) {
      console.error('Error deactivating school:', error);
      const errorMsg = error.response?.data?.error || 'Failed to deactivate school';
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

  const handleReactivate = async (school) => {
    setIsReactivating(true);
    try {
      await reactivateSchool(school.id);
      toast.success(`School "${school.name}" reactivated successfully!`);

      // Refresh both lists
      refetch();
      // Refresh deactivated schools list
      const data = await fetchDeactivatedSchools();
      setDeactivatedSchools(data);
    } catch (error) {
      console.error('Error reactivating school:', error);
      const errorMsg = error.response?.data?.error || 'Failed to reactivate school';
      toast.error(errorMsg);
    } finally {
      setIsReactivating(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const isLoading = loading || (!isAdmin && profileLoading) || (viewMode === 'deactivated' && deactivatedLoading);

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

        {/* View Mode Tabs (Admin only) */}
        {isAdmin && (
          <div style={styles.tabsContainer}>
            <button
              style={{
                ...styles.tab,
                ...(viewMode === 'active' ? styles.tabActive : styles.tabInactive),
              }}
              onClick={() => setViewMode('active')}
            >
              Active Schools ({schools.length})
            </button>
            <button
              style={{
                ...styles.tab,
                ...(viewMode === 'deactivated' ? styles.tabActive : styles.tabInactive),
              }}
              onClick={() => setViewMode('deactivated')}
            >
              Deactivated Schools ({deactivatedSchools.length})
            </button>
          </div>
        )}

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
                onEdit={viewMode === 'active' ? handleEditSchool : undefined}
                onDelete={viewMode === 'active' ? openDeleteConfirm : undefined}
                onReactivate={viewMode === 'deactivated' ? handleReactivate : undefined}
                isAdmin={isAdmin}
                canEdit={canEdit && viewMode === 'active'}
                isDeactivated={viewMode === 'deactivated'}
                isReactivating={isReactivating}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!error && filteredSchools.length === 0 && !isLoading && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              {searchQuery ? '🔍' : viewMode === 'deactivated' ? '✅' : !isAdmin && assignedSchoolNames.length === 0 ? '⚠️' : '🏫'}
            </div>
            <div style={styles.emptyTitle}>
              {searchQuery
                ? 'No schools found matching your search'
                : viewMode === 'deactivated'
                ? 'No Deactivated Schools'
                : !isAdmin && assignedSchoolNames.length === 0
                ? 'No Schools Assigned'
                : 'No schools available'}
            </div>
            <p style={styles.emptyText}>
              {searchQuery
                ? 'Try adjusting your search query'
                : viewMode === 'deactivated'
                ? 'All schools are currently active'
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
          canEdit={canEdit}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteConfirm.isOpen}
          title="Deactivate School"
          message={
            <div>
              <p style={{ marginBottom: SPACING.md, color: COLORS.text.white }}>
                Are you sure you want to deactivate <strong>{deleteConfirm.schoolName}</strong>?
              </p>
              <div style={styles.deactivationInfo}>
                <p style={{ ...styles.deactivationText, fontWeight: FONT_WEIGHTS.semibold, marginBottom: SPACING.sm }}>
                  What happens when you deactivate:
                </p>
                <ul style={styles.deactivationList}>
                  <li><strong>Dashboard:</strong> School will be removed from all dashboards and statistics</li>
                  <li><strong>Filters:</strong> School will not appear in any school filter or dropdown</li>
                  <li><strong>Students:</strong> All students will be marked as "Left" and won't be visible in student lists</li>
                  <li><strong>Teachers:</strong> All teachers assigned to this school will lose access to it</li>
                  <li><strong>Reports:</strong> School will be excluded from all active reports and analytics</li>
                  <li><strong>Fee Collection:</strong> No new fees can be collected for this school</li>
                </ul>
                <div style={{
                  marginTop: SPACING.md,
                  padding: SPACING.sm,
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: BORDER_RADIUS.sm,
                  border: '1px solid rgba(34, 197, 94, 0.3)'
                }}>
                  <p style={{ ...styles.deactivationText, color: '#22c55e', margin: 0 }}>
                    <strong>Note:</strong> This is a soft delete. All data is preserved and you can reactivate
                    this school anytime from the "Deactivated Schools" tab. Students and teachers will need
                    to be manually reassigned after reactivation.
                  </p>
                </div>
              </div>
            </div>
          }
          itemName=""
          confirmText="Deactivate School"
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
