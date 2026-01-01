// ============================================
// ASSIGN SCHOOLS MODAL - Manage Teacher Schools
// ============================================

import React, { useState, useEffect } from 'react';
import { Button } from '../common/ui/Button';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';

/**
 * AssignSchoolsModal Component
 * Modal for assigning/updating schools for teachers
 * 
 * @param {Object} props
 * @param {Object} props.user - User object (must be a teacher)
 * @param {Function} props.onClose - Close modal callback
 * @param {Function} props.onAssign - Assign schools callback
 * @param {Array} props.schools - Array of school objects
 * @param {boolean} props.isSubmitting - Submitting state
 */
export const AssignSchoolsModal = ({
  user,
  onClose,
  onAssign,
  schools = [],
  isSubmitting = false,
}) => {
  // ============================================
  // STATE
  // ============================================

  const [selectedSchools, setSelectedSchools] = useState([]);
  const [error, setError] = useState('');
  const [sendEmail, setSendEmail] = useState(true); // Email checkbox

  // Initialize with current assigned schools
  useEffect(() => {
    if (user) {
      let schoolIds = [];
      
      // If backend sent assigned_schools array with IDs
      if (user.assigned_schools && Array.isArray(user.assigned_schools)) {
        schoolIds = user.assigned_schools.map(s => {
          const id = typeof s === 'object' ? s.id : s;
          return Number(id);
        });
      } 
      // If we only have names, look up IDs from schools prop
      else if (user.assigned_schools_names && schools.length > 0) {
        const names = Array.isArray(user.assigned_schools_names) 
          ? user.assigned_schools_names 
          : [user.assigned_schools_names];
        
        schoolIds = names.map(name => {
          const school = schools.find(s => s.name === name);
          return school ? school.id : null;
        }).filter(id => id !== null);
      }
      
      setSelectedSchools(schoolIds);
      console.log('🏫 AssignSchools initialized with:', schoolIds);
      console.log('🏫 Original assigned_schools:', user.assigned_schools);
      console.log('🏫 Original assigned_schools_names:', user.assigned_schools_names);
    }
  }, [user, schools]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSchoolToggle = (schoolId) => {
    const id = Number(schoolId);
    setSelectedSchools(prev => {
      if (prev.includes(id)) {
        return prev.filter(sid => sid !== id);
      } else {
        return [...prev, id];
      }
    });
    setError('');
  };

  const handleSelectAll = () => {
    setSelectedSchools(schools.map(s => s.id));
    setError('');
  };

  const handleDeselectAll = () => {
    setSelectedSchools([]);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (selectedSchools.length === 0) {
      setError('Teachers must be assigned to at least one school');
      return;
    }

    console.log('📤 Assigning schools:', selectedSchools);
    console.log('📧 Send email:', sendEmail);

    if (onAssign) {
      await onAssign({
        school_ids: selectedSchools,
        send_email: sendEmail && user.email
      });
    }
  };

  // Check if school is selected (type-safe comparison)
  const isSchoolSelected = (schoolId) => {
    return selectedSchools.includes(Number(schoolId));
  };

  // ============================================
  // STYLES
  // ============================================

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '1rem',
  };

  const modalStyle = {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  };

  const headerStyle = {
    padding: '1.5rem',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  };

  const titleStyle = {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1F2937',
    margin: 0,
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#6B7280',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.375rem',
    transition: 'color 0.15s ease',
  };

  const contentStyle = {
    padding: '1.5rem',
  };

  const schoolItemStyle = (selected) => ({
    padding: '0.75rem',
    border: `2px solid ${selected ? '#3B82F6' : '#E5E7EB'}`,
    borderRadius: '0.5rem',
    marginBottom: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    backgroundColor: selected ? '#EFF6FF' : '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  });

  const checkboxStyle = {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  };

  const errorStyle = {
    fontSize: '0.875rem',
    color: '#EF4444',
    marginTop: '0.5rem',
    padding: '0.75rem',
    backgroundColor: '#FEF2F2',
    borderRadius: '0.5rem',
    border: '1px solid #EF4444',
  };

  const footerStyle = {
    padding: '1.5rem',
    borderTop: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.75rem',
    backgroundColor: '#F9FAFB',
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '0.5rem',
  };

  if (!user) return null;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>🏫 Assign Schools</h2>
            <div style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.25rem' }}>
              User: <strong>{user.username}</strong>
            </div>
          </div>
          <button
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={(e) => e.target.style.color = '#1F2937'}
            onMouseLeave={(e) => e.target.style.color = '#6B7280'}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div style={contentStyle}>
            {/* Quick Actions */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#EFF6FF',
                  color: '#3B82F6',
                  border: '1px solid #3B82F6',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                ✓ Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#F9FAFB',
                  color: '#6B7280',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                ✕ Deselect All
              </button>
            </div>

            {/* Schools List */}
            <div style={{ 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '0.75rem' 
            }}>
              Select Schools ({selectedSchools.length} selected)
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {schools.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem', 
                  color: '#6B7280' 
                }}>
                  No schools available
                </div>
              ) : (
                schools.map((school) => (
                  <div
                    key={school.id}
                    style={schoolItemStyle(isSchoolSelected(school.id))}
                    onClick={() => handleSchoolToggle(school.id)}
                  >
                    <input
                      type="checkbox"
                      checked={isSchoolSelected(school.id)}
                      onChange={() => {}}
                      style={checkboxStyle}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#1F2937',
                        marginBottom: '0.25rem',
                      }}>
                        {school.name}
                      </div>
                      {school.location && (
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#6B7280' 
                        }}>
                          📍 {school.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div style={errorStyle}>
                ⚠️ {error}
              </div>
            )}

            {/* Email Notification Section */}
            {user.email && selectedSchools.length > 0 && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#FEF3C7', borderRadius: '0.5rem', border: '1px solid #FCD34D' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937' }}>
                    📧 Notify teacher via email
                  </span>
                </label>
                <div style={{ fontSize: '0.75rem', color: '#92400E', marginTop: '0.5rem', marginLeft: '1.75rem' }}>
                  {user.first_name} {user.last_name} will receive an email at <strong>{user.email}</strong> about the school assignment
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={footerStyle}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="small" />
                  <span style={{ marginLeft: '0.5rem' }}>Saving...</span>
                </>
              ) : (
                `💾 Assign ${selectedSchools.length} School${selectedSchools.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignSchoolsModal;