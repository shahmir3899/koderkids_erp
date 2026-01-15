// ============================================
// SETTINGS PAGE - User Management (Admin Only)
// Glassmorphism Design System
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
import { DataTable } from '../components/common/tables/DataTable';
import { ErrorDisplay } from '../components/common/ui/ErrorDisplay';
import { Button } from '../components/common/ui/Button';
import { ConfirmationModal } from '../components/common/modals/ConfirmationModal';
import { PageHeader } from '../components/common/PageHeader';

// Page-Specific Components
import { UserStatsCards } from '../components/settings/UserStatsCards';
import { UserFilterBar } from '../components/settings/UserFilterBar';
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
    assignSchools,
    resetPassword,
    clearError,
  } = useUsers();

  const { schools } = useSchools();

  // UI States
  const [hasSearched, setHasSearched] = useState(false);
  const [currentFilters, setCurrentFilters] = useState({
    role: '',
    school: '',
    is_active: 'true',
    search: '',
  });

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

  // ============================================
  // DATA FETCHING
  // ============================================

  // Load stats and roles on mount, but DON'T load users until Search clicked
  useEffect(() => {
    console.log('📦 Page Mount: Loading stats and roles...');
    fetchStats();
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // ============================================
  // FILTER HANDLERS
  // ============================================

  const handleFilter = useCallback(async (filters) => {
  console.log('🔍 Search clicked with filters:', filters);

  // Normalize filters - ensure is_active defaults to 'true'
  const normalizedFilters = {
    role: filters.role || '',
    school: filters.school || '',
    is_active: filters.is_active !== undefined ? filters.is_active : 'true', // Default active
    search: filters.search || '',
  };

  console.log('🔍 Normalized filters:', normalizedFilters);

  setCurrentFilters(normalizedFilters);

  // If this is the first search, load users
  if (!hasSearched) {
    try {
      console.log('🔄 First search - loading users...');
      await fetchUsers(normalizedFilters);  // ← Pass filters to initial fetch
      setHasSearched(true);
      console.log('✅ Users loaded, ready for client-side filtering');
    } catch (err) {
      console.error('❌ Error loading users:', err);
      toast.error('Failed to load users');
    }
  } else {
    console.log('🔍 Client-side filtering applied');
  }
}, [hasSearched, fetchUsers]);

  // ============================================
  // USER ACTIONS
  // ============================================

  const handleViewDetails = useCallback((user) => {
    setSelectedUser(user);
    setIsViewing(true);
    setIsEditing(false);
  }, []);

  const handleEdit = useCallback((user) => {
    // If user is passed, we're editing from the table
    if (user) {
      setSelectedUser(user);
      setIsViewing(true);
      setIsEditing(true);
    } else {
      // If no user passed, we're switching from view to edit mode
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

      // Update selectedUser state
      setSelectedUser(updatedUser);
      setIsEditing(false);

      // Refresh the list if search has been performed
      if (hasSearched) {
        fetchUsers(currentFilters);
      }

      // Refresh stats
      fetchStats();
    } catch (error) {
      console.error('❌ Error updating user:', error);
      const errorMsg = error.response?.data?.error || 
                      JSON.stringify(error.response?.data) || 
                      'Failed to update user';
      toast.error(`⚠️ ${errorMsg}`);
      throw error;
    }
  }, [selectedUser, updateUser, hasSearched, currentFilters, fetchUsers, fetchStats]);

  // ============================================
  // CREATE USER HANDLER
  // ============================================

  // frontend/src/pages/SettingsPage.js
// UPDATE YOUR handleCreateUser FUNCTION WITH THIS:

  // ============================================
// CORRECTED handleCreateUser FUNCTION
// Place this INSIDE your SettingsPage component (after line 195)
// ============================================

  const handleCreateUser = async (userData) => {
    try {
      console.log('📤 Creating user with data:', userData);
      
      const result = await createUser(userData);
      
      console.log('✅ User created successfully:', result);
      
      // Show success message
      toast.success('✅ User created successfully!');
      
      // Show email status if email was requested
      if (userData.send_email && result.email_sent) {
        toast.success(`📧 Welcome email sent to ${userData.email}`);
      } else if (userData.send_email && !result.email_sent) {
        toast.warning('⚠️ User created but email failed to send');
        if (result.email_error) {
          console.error('Email error:', result.email_error);
        }
      }
      
      // Refresh users list
      await fetchUsers({});
      
      // Close modal - FIXED: was setIsCreatingUser, now setIsCreating
      setIsCreating(false);
      
    } catch (error) {
      console.error('❌ Error creating user:', error);
      
      // Check if we have validation errors from backend
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        console.log('Backend validation errors:', errorData);
        
        // Display each field error to user
        if (typeof errorData === 'object' && !Array.isArray(errorData)) {
          Object.keys(errorData).forEach(fieldName => {
            const fieldErrors = errorData[fieldName];
            
            // Handle array of error messages
            if (Array.isArray(fieldErrors)) {
              fieldErrors.forEach(errorMsg => {
                // Make field name user-friendly
                const displayName = fieldName
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, l => l.toUpperCase());
                
                toast.error(`${displayName}: ${errorMsg}`);
              });
            } else {
              // Single error message
              toast.error(`${fieldName}: ${fieldErrors}`);
            }
          });
        } else if (errorData.error) {
          // Generic error message
          toast.error(errorData.error);
        } else {
          toast.error('Failed to create user');
        }
      } else {
        // Network error or other error
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

      // Close modal
      setIsAssigningSchools(false);
      setSelectedUser(null);

      // Refresh the list if search has been performed
      if (hasSearched) {
        fetchUsers(currentFilters);
      }

      // Refresh stats
      fetchStats();
    } catch (error) {
      console.error('❌ Error assigning schools:', error);
      const errorMsg = error.response?.data?.error || 
                      'Failed to assign schools';
      toast.error(`⚠️ ${errorMsg}`);
      throw error;
    }
  }, [selectedUser, assignSchools, hasSearched, currentFilters, fetchUsers, fetchStats]);

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

      // Return the result (which contains new_password)
      return result;
    } catch (error) {
      console.error('❌ Error resetting password:', error);
      const errorMsg = error.response?.data?.error || 
                      'Failed to reset password';
      toast.error(`⚠️ ${errorMsg}`);
      throw error;
    }
  }, [selectedUser, resetPassword]);

  // ============================================
  // DELETE HANDLERS
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

      // Refresh the list
      if (hasSearched) {
        fetchUsers(currentFilters);
      }
    } catch (error) {
      console.error('❌ Error deactivating user:', error);
      const errorMsg = error.response?.data?.error || 'Failed to deactivate user';
      toast.error(`⚠️ ${errorMsg}`);
    }
  }, [deleteConfirm.userId, deactivateUser, hasSearched, currentFilters, fetchUsers]);

  const cancelDelete = useCallback(() => {
    if (!loading.delete) {
      setDeleteConfirm({ isOpen: false, userId: null, userName: '' });
    }
  }, [loading.delete]);

  // ============================================
  // FILTERED DATA
  // ============================================

  // ============================================
  // CLIENT-SIDE FILTERING
  // ============================================

  const filteredUsers = useMemo(() => {
    if (!hasSearched) {
      return [];
    }

    console.log('🔍 Filtering users client-side...');
    console.log('   Total users:', users.length);
    console.log('   Filters:', currentFilters);

    return users.filter(user => {
      // ALWAYS exclude students (they have their own management page)
      if (user.role === 'Student') {
        return false;
      }

      // Role filter
      if (currentFilters.role && currentFilters.role !== '') {
        if (user.role !== currentFilters.role) {
          return false;
        }
      }

      // School filter (check if user has this school assigned)
      if (currentFilters.school && currentFilters.school !== '') {
        const schoolId = Number(currentFilters.school);
        if (!user.assigned_schools || !Array.isArray(user.assigned_schools)) {
          return false;
        }
        // Check if school ID is in assigned_schools
        const hasSchool = user.assigned_schools.some(s => {
          const sId = typeof s === 'object' ? s.id : s;
          return Number(sId) === schoolId;
        });
        if (!hasSchool) {
          return false;
        }
      }

      // Status filter
      if (currentFilters.is_active !== '' && currentFilters.is_active !== null && currentFilters.is_active !== undefined) {
        const filterActive = currentFilters.is_active === 'true' || currentFilters.is_active === true;
        if (user.is_active !== filterActive) {
          return false;
        }
      }

      // Search filter (username, email, first_name, last_name)
      if (currentFilters.search && currentFilters.search !== '') {
        const searchLower = currentFilters.search.toLowerCase();
        const matchesSearch = 
          (user.username && user.username.toLowerCase().includes(searchLower)) ||
          (user.email && user.email.toLowerCase().includes(searchLower)) ||
          (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
          (user.last_name && user.last_name.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });
  }, [users, hasSearched, currentFilters]);

  // ============================================
  // RENDER
  // ============================================

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
          hasSearched={hasSearched}
          isLoading={loading.stats}
        />

        {/* Error Display */}
        {error && (
          <ErrorDisplay
            error={error}
            onRetry={() => fetchUsers(currentFilters)}
            isRetrying={loading.users}
            onDismiss={clearError}
          />
        )}

        {/* Filter Bar */}
        <UserFilterBar
          onFilter={handleFilter}
          roles={roles}
          schools={schools}
          additionalActions={
            <Button onClick={handleCreate} variant="primary">
              ➕ Add New User
            </Button>
          }
        />

        {/* Users Table */}
        <DataTable
          data={filteredUsers}
          loading={loading.users}
          columns={[
            {
              key: 'id',
              label: 'ID',
              sortable: true,
              width: '80px',
            },
            {
              key: 'username',
              label: 'Username',
              sortable: true,
            },
            {
              key: 'name',
              label: 'Name',
              sortable: true,
              render: (_, user) => `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A',
            },
            {
              key: 'email',
              label: 'Email',
              sortable: true,
              render: (value) => value || 'N/A',
            },
            {
              key: 'role',
              label: 'Role',
              sortable: true,
              align: 'center',
              render: (value) => {
                const colors = {
                  Admin: '#8B5CF6',
                  Teacher: '#F59E0B',
                  Student: '#3B82F6',
                };
                return (
                  <span
                    style={{
                      backgroundColor: colors[value] || '#6B7280',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                    }}
                  >
                    {value}
                  </span>
                );
              },
            },
            {
              key: 'assigned_schools_count',
              label: 'Schools',
              sortable: true,
              align: 'center',
              render: (value, user) => {
                if (user.role !== 'Teacher') return '-';
                return value || 0;
              },
            },
            {
              key: 'is_active',
              label: 'Status',
              sortable: true,
              align: 'center',
              render: (value) => (
                <span
                  style={{
                    backgroundColor: value ? '#ECFDF5' : '#FEF2F2',
                    color: value ? '#10B981' : '#EF4444',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                  }}
                >
                  {value ? 'Active' : 'Inactive'}
                </span>
              ),
            },
            {
              key: 'actions',
              label: 'Actions',
              sortable: false,
              align: 'center',
              render: (_, user) => (
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleViewDetails(user)}
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
                    title="View Details"
                  >
                    👁️
                  </button>
                  <button
                    onClick={() => handleEdit(user)}
                    style={{
                      backgroundColor: '#10B981',
                      color: 'white',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#059669')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#10B981')}
                    title="Edit User"
                  >
                    ✏️
                  </button>
                  {user.role === 'Teacher' && (
                    <button
                      onClick={() => handleAssignSchools(user)}
                      style={{
                        backgroundColor: '#F59E0B',
                        color: 'white',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = '#D97706')}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = '#F59E0B')}
                      title="Assign Schools"
                    >
                      🏫
                    </button>
                  )}
                  <button
                    onClick={() => handleResetPassword(user)}
                    style={{
                      backgroundColor: '#8B5CF6',
                      color: 'white',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#7C3AED')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#8B5CF6')}
                    title="Reset Password"
                  >
                    🔑
                  </button>
                  {!user.is_super_admin && (
                    <button
                      onClick={() => openDeleteConfirm(user)}
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
                      title="Deactivate User"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          emptyMessage={
            hasSearched
              ? 'No users found. Try adjusting your filters.'
              : 'Select filters and click Search to view users.'
          }
          striped
          hoverable
        />

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

const pageStyles = {
  pageContainer: {
    minHeight: '100vh',
    background: COLORS.background.gradient,
    padding: SPACING.xl,
  },
  contentWrapper: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  pageHeader: {
    marginBottom: SPACING['2xl'],
    textAlign: 'center',
  },
  pageTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    marginBottom: SPACING.sm,
  },
  pageSubtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.whiteSubtle,
    margin: 0,
  },
};

export default SettingsPage;