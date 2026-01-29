// ============================================
// SETTINGS PAGE - User Management (Admin Only)
// Glassmorphism Design System - Cards Layout
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../utils/designConstants';

// Hooks
import { useUsers } from '../hooks/useUsers';
import { useSchools } from '../hooks/useSchools';
import { useResponsive } from '../hooks/useResponsive';

// Common Components
import { ErrorDisplay } from '../components/common/ui/ErrorDisplay';
import { Button } from '../components/common/ui/Button';
import { ConfirmationModal } from '../components/common/modals/ConfirmationModal';
import { PageHeader } from '../components/common/PageHeader';

// Page-Specific Components
import { UserStatsCards } from '../components/settings/UserStatsCards';
import { UserCard } from '../components/settings/UserCard';
import { CreateUserModal } from '../components/settings/CreateUserModal';
import { UserDetailsModal } from '../components/settings/UserDetailsModal';
import { AssignSchoolsModal } from '../components/settings/AssignSchoolsModal';
import { ResetPasswordModal } from '../components/settings/ResetPasswordModal';

function SettingsPage() {
  // ============================================
  // RESPONSIVE HOOK
  // ============================================
  const { isMobile } = useResponsive();

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  // Hooks
  const {
    users,
    stats,
    roles,
    loading,
    error,
    fetchUsers,
    fetchStats,
    fetchRoles,
    createUser,
    updateUser,
    deactivateUser,
    reactivateUser,
    assignSchools,
    resetPassword,
    clearError,
  } = useUsers();

  const { schools } = useSchools();

  // UI States
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'inactive'
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState(''); // Quick filter chips

  // Modal States
  const [selectedUser, setSelectedUser] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);

  // Advanced Modal States
  const [isAssigningSchools, setIsAssigningSchools] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    userId: null,
    userName: '',
  });

  // Reactivating State
  const [reactivatingId, setReactivatingId] = useState(null);

  // ============================================
  // DATA FETCHING
  // ============================================

  // Load stats, roles, and ALL users on mount
  useEffect(() => {
    console.log('📦 Page Mount: Loading stats, roles, and users...');
    fetchStats();
    fetchRoles();
    fetchUsers({}).then(() => {
      console.log('✅ Users loaded');
    }).catch(err => {
      console.error('❌ Failed to load users:', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // FILTERED DATA
  // ============================================

  const filteredUsers = useMemo(() => {
    console.log('🔍 Filtering users...');
    console.log('   Total users:', users.length);
    console.log('   Active tab:', activeTab);
    console.log('   Search:', searchQuery);
    console.log('   Role filter:', roleFilter);

    return users.filter(user => {
      // Exclude students (they have their own management page)
      if (user.role === 'Student') {
        return false;
      }

      // Tab filter (active/inactive)
      const isActive = user.is_active;
      if (activeTab === 'active' && !isActive) return false;
      if (activeTab === 'inactive' && isActive) return false;

      // Role quick filter
      if (roleFilter && user.role !== roleFilter) {
        return false;
      }

      // Search filter
      if (searchQuery && searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          (user.username && user.username.toLowerCase().includes(query)) ||
          (user.email && user.email.toLowerCase().includes(query)) ||
          (user.first_name && user.first_name.toLowerCase().includes(query)) ||
          (user.last_name && user.last_name.toLowerCase().includes(query));

        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [users, activeTab, searchQuery, roleFilter]);

  // Count inactive users for tab badge
  const inactiveCount = useMemo(() => {
    return users.filter(u => !u.is_active && u.role !== 'Student').length;
  }, [users]);

  // Group users by role when "All" filter is selected
  const groupedUsers = useMemo(() => {
    if (roleFilter !== '') {
      // If a specific role is selected, don't group
      return null;
    }

    const groups = {
      Admin: [],
      Teacher: [],
      BDM: [],
    };

    filteredUsers.forEach(user => {
      if (groups[user.role]) {
        groups[user.role].push(user);
      }
    });

    return groups;
  }, [filteredUsers, roleFilter]);

  // Calculate total salaries for filtered users
  const totalSalaries = useMemo(() => {
    return filteredUsers.reduce((sum, user) => {
      return sum + (user.basic_salary || 0);
    }, 0);
  }, [filteredUsers]);

  // ============================================
  // USER ACTIONS
  // ============================================

  const handleViewDetails = useCallback((user) => {
    setSelectedUser(user);
    setIsViewing(true);
    setIsEditing(false);
  }, []);

  const handleEdit = useCallback((user) => {
    if (user) {
      setSelectedUser(user);
      setIsViewing(true);
      setIsEditing(true);
    } else {
      setIsEditing(true);
    }
  }, []);

  const handleCreate = useCallback(() => {
    setIsCreating(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedUser(null);
    setIsViewing(false);
    setIsEditing(false);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  // ============================================
  // UPDATE USER HANDLER
  // ============================================

  const handleUpdateUser = useCallback(async (userData) => {
    if (!selectedUser) return;

    try {
      const updatedUser = await updateUser(selectedUser.id, userData);
      console.log('✅ User updated successfully:', updatedUser);

      toast.success('✅ User updated successfully!');

      setSelectedUser(updatedUser);
      setIsEditing(false);

      // Refresh users and stats
      fetchUsers({});
      fetchStats();
    } catch (error) {
      console.error('❌ Error updating user:', error);
      const errorMsg = error.response?.data?.error ||
                      JSON.stringify(error.response?.data) ||
                      'Failed to update user';
      toast.error(`⚠️ ${errorMsg}`);
      throw error;
    }
  }, [selectedUser, updateUser, fetchUsers, fetchStats]);

  // ============================================
  // CREATE USER HANDLER
  // ============================================

  const handleCreateUser = async (userData) => {
    try {
      console.log('📤 Creating user with data:', userData);

      const result = await createUser(userData);

      console.log('✅ User created successfully:', result);

      toast.success('✅ User created successfully!');

      if (userData.send_email && result.email_sent) {
        toast.success(`📧 Welcome email sent to ${userData.email}`);
      } else if (userData.send_email && !result.email_sent) {
        toast.warning('⚠️ User created but email failed to send');
      }

      await fetchUsers({});
      setIsCreating(false);

    } catch (error) {
      console.error('❌ Error creating user:', error);

      if (error.response && error.response.data) {
        const errorData = error.response.data;

        if (typeof errorData === 'object' && !Array.isArray(errorData)) {
          Object.keys(errorData).forEach(fieldName => {
            const fieldErrors = errorData[fieldName];

            if (Array.isArray(fieldErrors)) {
              fieldErrors.forEach(errorMsg => {
                const displayName = fieldName
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, l => l.toUpperCase());

                toast.error(`${displayName}: ${errorMsg}`);
              });
            } else {
              toast.error(`${fieldName}: ${fieldErrors}`);
            }
          });
        } else if (errorData.error) {
          toast.error(errorData.error);
        } else {
          toast.error('Failed to create user');
        }
      } else {
        toast.error('Failed to create user. Please try again.');
      }
    }
  };

  // ============================================
  // ASSIGN SCHOOLS HANDLER
  // ============================================

  const handleAssignSchools = useCallback((user) => {
    if (user.role !== 'Teacher') {
      toast.error('⚠️ Only teachers can be assigned to schools');
      return;
    }
    setSelectedUser(user);
    setIsAssigningSchools(true);
  }, []);

  const handleAssignSchoolsSubmit = useCallback(async (schoolIds) => {
    if (!selectedUser) return;

    try {
      const result = await assignSchools(selectedUser.id, schoolIds);
      console.log('✅ Schools assigned successfully:', result);

      toast.success('✅ Schools assigned successfully!');

      setIsAssigningSchools(false);
      setSelectedUser(null);

      fetchUsers({});
      fetchStats();
    } catch (error) {
      console.error('❌ Error assigning schools:', error);
      const errorMsg = error.response?.data?.error || 'Failed to assign schools';
      toast.error(`⚠️ ${errorMsg}`);
      throw error;
    }
  }, [selectedUser, assignSchools, fetchUsers, fetchStats]);

  // ============================================
  // RESET PASSWORD HANDLER
  // ============================================

  const handleResetPassword = useCallback((user) => {
    setSelectedUser(user);
    setIsResettingPassword(true);
  }, []);

  const handleResetPasswordSubmit = useCallback(async (passwordData) => {
    if (!selectedUser) return;

    try {
      const result = await resetPassword(selectedUser.id, passwordData);
      console.log('✅ Password reset successfully:', result);

      toast.success('✅ Password reset successfully!');

      return result;
    } catch (error) {
      console.error('❌ Error resetting password:', error);
      const errorMsg = error.response?.data?.error || 'Failed to reset password';
      toast.error(`⚠️ ${errorMsg}`);
      throw error;
    }
  }, [selectedUser, resetPassword]);

  // ============================================
  // DEACTIVATE/REACTIVATE HANDLERS
  // ============================================

  const openDeleteConfirm = useCallback((user) => {
    setDeleteConfirm({
      isOpen: true,
      userId: user.id,
      userName: user.username || `User #${user.id}`,
    });
  }, []);

  const confirmDelete = useCallback(async () => {
    const userId = deleteConfirm.userId;

    try {
      await deactivateUser(userId);
      console.log('✅ User deactivated successfully');

      setDeleteConfirm({ isOpen: false, userId: null, userName: '' });
      toast.success('✅ User deactivated successfully!');

      fetchUsers({});
      fetchStats();
    } catch (error) {
      console.error('❌ Error deactivating user:', error);
      const errorMsg = error.response?.data?.error || 'Failed to deactivate user';
      toast.error(`⚠️ ${errorMsg}`);
    }
  }, [deleteConfirm.userId, deactivateUser, fetchUsers, fetchStats]);

  const cancelDelete = useCallback(() => {
    if (!loading.delete) {
      setDeleteConfirm({ isOpen: false, userId: null, userName: '' });
    }
  }, [loading.delete]);

  const handleReactivate = useCallback(async (user) => {
    setReactivatingId(user.id);
    try {
      if (reactivateUser) {
        await reactivateUser(user.id);
      } else {
        // Fallback: use updateUser to set is_active to true
        await updateUser(user.id, { is_active: true });
      }
      console.log('✅ User reactivated successfully');
      toast.success('✅ User reactivated successfully!');

      fetchUsers({});
      fetchStats();
    } catch (error) {
      console.error('❌ Error reactivating user:', error);
      const errorMsg = error.response?.data?.error || 'Failed to reactivate user';
      toast.error(`⚠️ ${errorMsg}`);
    } finally {
      setReactivatingId(null);
    }
  }, [reactivateUser, updateUser, fetchUsers, fetchStats]);

  // ============================================
  // RENDER
  // ============================================

  const pageStyles = getPageStyles(isMobile);

  return (
    <div style={pageStyles.pageContainer}>
      <div style={pageStyles.contentWrapper}>
        {/* Page Header */}
        <PageHeader
          icon="⚙️"
          title="User Management"
          subtitle="Manage users, roles, and permissions"
        />

        {/* Statistics Cards */}
        <UserStatsCards
          stats={stats}
          filteredCount={filteredUsers.length}
          hasSearched={true}
          isLoading={loading.stats}
          totalSalaries={totalSalaries}
        />

        {/* Error Display */}
        {error && (
          <ErrorDisplay
            error={error}
            onRetry={() => fetchUsers({})}
            isRetrying={loading.users}
            onDismiss={clearError}
          />
        )}

        {/* Search and Tabs Section */}
        <div style={pageStyles.filterSection}>
          {/* Tabs */}
          <div style={pageStyles.tabsContainer}>
            <button
              style={{
                ...pageStyles.tab,
                ...(activeTab === 'active' ? pageStyles.tabActive : {}),
              }}
              onClick={() => setActiveTab('active')}
            >
              Active Users
            </button>
            <button
              style={{
                ...pageStyles.tab,
                ...(activeTab === 'inactive' ? pageStyles.tabActive : {}),
              }}
              onClick={() => setActiveTab('inactive')}
            >
              Inactive Users
              {inactiveCount > 0 && (
                <span style={pageStyles.tabBadge}>{inactiveCount}</span>
              )}
            </button>
          </div>

          {/* Search and Actions Row */}
          <div style={pageStyles.searchRow}>
            {/* Search Input */}
            <div style={pageStyles.searchContainer}>
              <span style={pageStyles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search by name, username, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={pageStyles.searchInput}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={pageStyles.clearButton}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Role Filter Chips */}
            <div style={pageStyles.filterChips}>
              <button
                style={{
                  ...pageStyles.chip,
                  ...(roleFilter === '' ? pageStyles.chipActive : {}),
                }}
                onClick={() => setRoleFilter('')}
              >
                All
              </button>
              <button
                style={{
                  ...pageStyles.chip,
                  ...(roleFilter === 'Admin' ? pageStyles.chipActive : {}),
                  ...(roleFilter === 'Admin' ? { backgroundColor: 'rgba(139, 92, 246, 0.3)', borderColor: 'rgba(139, 92, 246, 0.5)' } : {}),
                }}
                onClick={() => setRoleFilter(roleFilter === 'Admin' ? '' : 'Admin')}
              >
                👑 Admins
              </button>
              <button
                style={{
                  ...pageStyles.chip,
                  ...(roleFilter === 'Teacher' ? pageStyles.chipActive : {}),
                  ...(roleFilter === 'Teacher' ? { backgroundColor: 'rgba(245, 158, 11, 0.3)', borderColor: 'rgba(245, 158, 11, 0.5)' } : {}),
                }}
                onClick={() => setRoleFilter(roleFilter === 'Teacher' ? '' : 'Teacher')}
              >
                📚 Teachers
              </button>
              <button
                style={{
                  ...pageStyles.chip,
                  ...(roleFilter === 'BDM' ? pageStyles.chipActive : {}),
                  ...(roleFilter === 'BDM' ? { backgroundColor: 'rgba(16, 185, 129, 0.3)', borderColor: 'rgba(16, 185, 129, 0.5)' } : {}),
                }}
                onClick={() => setRoleFilter(roleFilter === 'BDM' ? '' : 'BDM')}
              >
                💼 BDM
              </button>
            </div>

            {/* Add User Button */}
            <Button onClick={handleCreate} variant="primary">
              ➕ Add New User
            </Button>
          </div>
        </div>

        {/* Users Grid */}
        {loading.users ? (
          <div style={pageStyles.loadingContainer}>
            <div style={pageStyles.loadingSpinner}>⏳</div>
            <p style={pageStyles.loadingText}>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={pageStyles.emptyContainer}>
            <div style={pageStyles.emptyIcon}>
              {activeTab === 'inactive' ? '👻' : '👤'}
            </div>
            <p style={pageStyles.emptyText}>
              {searchQuery || roleFilter
                ? 'No users found matching your filters.'
                : activeTab === 'inactive'
                  ? 'No inactive users.'
                  : 'No users found.'}
            </p>
            {(searchQuery || roleFilter) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : groupedUsers ? (
          // Grouped view when "All" filter is selected
          <div style={pageStyles.groupedContainer}>
            {/* Admins Section */}
            {groupedUsers.Admin.length > 0 && (
              <div style={pageStyles.roleSection}>
                <div style={pageStyles.roleSectionHeader}>
                  <span style={{ ...pageStyles.roleSectionTitle, color: '#A78BFA' }}>
                    👑 Admins ({groupedUsers.Admin.length})
                  </span>
                  <div style={{ ...pageStyles.roleSectionLine, backgroundColor: 'rgba(139, 92, 246, 0.3)' }} />
                </div>
                <div style={pageStyles.cardsGrid}>
                  {groupedUsers.Admin.map(user => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onView={handleViewDetails}
                                            onAssignSchools={handleAssignSchools}
                      onResetPassword={handleResetPassword}
                      onDeactivate={openDeleteConfirm}
                      onReactivate={handleReactivate}
                      isInactive={activeTab === 'inactive'}
                      isReactivating={reactivatingId === user.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Teachers Section */}
            {groupedUsers.Teacher.length > 0 && (
              <div style={pageStyles.roleSection}>
                <div style={pageStyles.roleSectionHeader}>
                  <span style={{ ...pageStyles.roleSectionTitle, color: '#FBBF24' }}>
                    📚 Teachers ({groupedUsers.Teacher.length})
                  </span>
                  <div style={{ ...pageStyles.roleSectionLine, backgroundColor: 'rgba(245, 158, 11, 0.3)' }} />
                </div>
                <div style={pageStyles.cardsGrid}>
                  {groupedUsers.Teacher.map(user => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onView={handleViewDetails}
                                            onAssignSchools={handleAssignSchools}
                      onResetPassword={handleResetPassword}
                      onDeactivate={openDeleteConfirm}
                      onReactivate={handleReactivate}
                      isInactive={activeTab === 'inactive'}
                      isReactivating={reactivatingId === user.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* BDM Section */}
            {groupedUsers.BDM.length > 0 && (
              <div style={pageStyles.roleSection}>
                <div style={pageStyles.roleSectionHeader}>
                  <span style={{ ...pageStyles.roleSectionTitle, color: '#34D399' }}>
                    💼 BDM ({groupedUsers.BDM.length})
                  </span>
                  <div style={{ ...pageStyles.roleSectionLine, backgroundColor: 'rgba(16, 185, 129, 0.3)' }} />
                </div>
                <div style={pageStyles.cardsGrid}>
                  {groupedUsers.BDM.map(user => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onView={handleViewDetails}
                                            onAssignSchools={handleAssignSchools}
                      onResetPassword={handleResetPassword}
                      onDeactivate={openDeleteConfirm}
                      onReactivate={handleReactivate}
                      isInactive={activeTab === 'inactive'}
                      isReactivating={reactivatingId === user.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Flat view when a specific role filter is selected
          <div style={pageStyles.cardsGrid}>
            {filteredUsers.map(user => (
              <UserCard
                key={user.id}
                user={user}
                onView={handleViewDetails}
                                onAssignSchools={handleAssignSchools}
                onResetPassword={handleResetPassword}
                onDeactivate={openDeleteConfirm}
                onReactivate={handleReactivate}
                isInactive={activeTab === 'inactive'}
                isReactivating={reactivatingId === user.id}
              />
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteConfirm.isOpen}
          title="Deactivate User"
          message="Are you sure you want to deactivate this user? This will log them out from all devices and prevent them from logging in."
          itemName={deleteConfirm.userName}
          confirmText="Deactivate User"
          cancelText="Cancel"
          variant="danger"
          isLoading={loading.delete}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />

        {/* Create User Modal */}
        {isCreating && (
          <CreateUserModal
            onClose={() => setIsCreating(false)}
            onCreate={handleCreateUser}
            schools={schools}
            roles={roles}
            isSubmitting={loading.submit}
          />
        )}

        {/* User Details Modal (View/Edit) */}
        {isViewing && selectedUser && (
          <UserDetailsModal
            user={selectedUser}
            isEditing={isEditing}
            onClose={handleCloseDetails}
            onSave={handleUpdateUser}
            onEdit={() => handleEdit()}
            onCancel={handleCancelEdit}
            schools={schools}
            roles={roles}
            isSubmitting={loading.submit}
          />
        )}

        {/* Assign Schools Modal */}
        {isAssigningSchools && selectedUser && (
          <AssignSchoolsModal
            user={selectedUser}
            onClose={() => {
              setIsAssigningSchools(false);
              setSelectedUser(null);
            }}
            onAssign={handleAssignSchoolsSubmit}
            schools={schools}
            isSubmitting={loading.action}
          />
        )}

        {/* Reset Password Modal */}
        {isResettingPassword && selectedUser && (
          <ResetPasswordModal
            user={selectedUser}
            onClose={() => {
              setIsResettingPassword(false);
              setSelectedUser(null);
            }}
            onReset={handleResetPasswordSubmit}
            isSubmitting={loading.action}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// PAGE STYLES - Glassmorphism Design System
// ============================================

const getPageStyles = (isMobile) => ({
  pageContainer: {
    minHeight: '100vh',
    background: COLORS.background.gradient,
    padding: isMobile ? SPACING.md : SPACING.xl,
    transition: `padding ${TRANSITIONS.normal}`,
  },
  contentWrapper: {
    ...MIXINS.glassmorphicCard,
    maxWidth: '1400px',
    margin: '0 auto',
    padding: isMobile ? SPACING.md : SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    transition: `all ${TRANSITIONS.normal}`,
  },

  // Filter Section
  filterSection: {
    marginBottom: SPACING.xl,
  },

  // Tabs
  tabsContainer: {
    display: 'flex',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: SPACING.md,
  },
  tab: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: 'transparent',
    border: 'none',
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    borderRadius: BORDER_RADIUS.md,
    transition: `all ${TRANSITIONS.fast}`,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: COLORS.text.white,
  },
  tabBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: `2px ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
  },

  // Search Row
  searchRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: SPACING.md,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    minWidth: isMobile ? '100%' : '280px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: SPACING.md,
    fontSize: FONT_SIZES.md,
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.xl}`,
    paddingLeft: '44px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.lg,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    outline: 'none',
    transition: `all ${TRANSITIONS.fast}`,
  },
  clearButton: {
    position: 'absolute',
    right: SPACING.md,
    backgroundColor: 'transparent',
    border: 'none',
    color: COLORS.text.whiteSubtle,
    cursor: 'pointer',
    padding: SPACING.xs,
    fontSize: FONT_SIZES.sm,
  },

  // Filter Chips
  filterChips: {
    display: 'flex',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  chip: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.full,
    color: COLORS.text.whiteMedium,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
  },
  chipActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    color: COLORS.text.white,
  },

  // Cards Grid
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: isMobile ? SPACING.md : SPACING.xl,
  },

  // Grouped Container (when All filter is selected)
  groupedContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING['2xl'],
  },
  roleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.lg,
  },
  roleSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
  },
  roleSectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    whiteSpace: 'nowrap',
  },
  roleSectionLine: {
    flex: 1,
    height: '1px',
  },

  // Loading State
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING['3xl'],
  },
  loadingSpinner: {
    fontSize: '48px',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.md,
  },

  // Empty State
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING['3xl'],
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: SPACING.lg,
    opacity: 0.5,
  },
  emptyText: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.lg,
  },
});

export default SettingsPage;
