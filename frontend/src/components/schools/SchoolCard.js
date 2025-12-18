// ============================================
// SCHOOL CARD - Individual School Display
// ============================================

import React from 'react';
import { Button } from '../common/ui/Button';

/**
 * SchoolCard Component
 * Displays a school's information in a beautiful card format
 * 
 * @param {Object} props
 * @param {Object} props.school - School object
 * @param {Function} props.onView - Callback when view button is clicked
 * @param {Function} props.onEdit - Callback when edit button is clicked (Admin only)
 * @param {Function} props.onDelete - Callback when delete button is clicked (Admin only)
 * @param {boolean} props.isAdmin - Whether user is admin
 */
export const SchoolCard = ({ school, onView, onEdit, onDelete, isAdmin = false }) => {
  const {
    id,
    name,
    logo,
    address,
    location,
    contact_phone,
    total_students = 0,
    total_classes = 0,
    monthly_revenue = 0,
    capacity_utilization = 0,
    total_capacity,
  } = school;

  // Calculate capacity bar width
  const capacityWidth = Math.min(capacity_utilization || 0, 100);
  
  // Determine capacity color
  const getCapacityColor = () => {
    if (capacityWidth >= 90) return '#EF4444'; // Red - overcrowded
    if (capacityWidth >= 70) return '#10B981'; // Green - good
    if (capacityWidth >= 50) return '#F59E0B'; // Orange - moderate
    return '#6B7280'; // Gray - low
  };

  const capacityColor = getCapacityColor();

  // Styles
  const cardStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  };

  const cardHoverStyle = {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  };

  const logoStyle = {
    width: '56px',
    height: '56px',
    borderRadius: '8px',
    objectFit: 'cover',
    border: '2px solid #E5E7EB',
    backgroundColor: '#F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#3B82F6',
  };

  const nameStyle = {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: '0.25rem',
    lineHeight: '1.3',
  };

  const addressStyle = {
    fontSize: '0.875rem',
    color: '#6B7280',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    marginBottom: '0.25rem',
  };

  const statsContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
    marginTop: '1rem',
    marginBottom: '1rem',
    padding: '1rem',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
  };

  const statItemStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  };

  const statLabelStyle = {
    fontSize: '0.75rem',
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const statValueStyle = {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1F2937',
  };

  const capacityContainerStyle = {
    marginTop: '1rem',
    marginBottom: '1rem',
  };

  const capacityLabelStyle = {
    fontSize: '0.875rem',
    color: '#374151',
    fontWeight: '500',
    marginBottom: '0.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const capacityBarBgStyle = {
    width: '100%',
    height: '8px',
    backgroundColor: '#E5E7EB',
    borderRadius: '4px',
    overflow: 'hidden',
  };

  const capacityBarFillStyle = {
    height: '100%',
    width: `${capacityWidth}%`,
    backgroundColor: capacityColor,
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  };

  const actionsStyle = {
    display: 'flex',
    gap: '0.5rem',
    marginTop: 'auto',
    paddingTop: '1rem',
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => {
        Object.assign(e.currentTarget.style, cardHoverStyle);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      }}
    >
      {/* Header with Logo and Name */}
      <div style={headerStyle}>
        {logo ? (
          <img src={logo} alt={name} style={logoStyle} />
        ) : (
          <div style={logoStyle}>{name?.charAt(0) || '🏫'}</div>
        )}
        <div style={{ flex: 1 }}>
          <div style={nameStyle}>{name}</div>
          <div style={addressStyle}>
            <span>📍</span>
            <span>{address || location || 'No address'}</span>
          </div>
          {contact_phone && (
            <div style={addressStyle}>
              <span>📞</span>
              <span>{contact_phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Grid */}
      <div style={statsContainerStyle}>
        <div style={statItemStyle}>
          <span style={statLabelStyle}>Students</span>
          <span style={statValueStyle}>👥 {total_students}</span>
        </div>
        <div style={statItemStyle}>
          <span style={statLabelStyle}>Classes</span>
          <span style={statValueStyle}>📚 {total_classes}</span>
        </div>
        <div style={statItemStyle}>
          <span style={statLabelStyle}>Revenue</span>
          <span style={statValueStyle}>💰 {(monthly_revenue / 1000).toFixed(0)}K</span>
        </div>
        <div style={statItemStyle}>
          <span style={statLabelStyle}>Capacity</span>
          <span style={statValueStyle}>
            {total_students}/{total_capacity || 'N/A'}
          </span>
        </div>
      </div>

      {/* Capacity Bar */}
      {capacity_utilization > 0 && (
        <div style={capacityContainerStyle}>
          <div style={capacityLabelStyle}>
            <span>Capacity Utilization</span>
            <span style={{ color: capacityColor, fontWeight: '600' }}>
              {capacity_utilization}%
            </span>
          </div>
          <div style={capacityBarBgStyle}>
            <div style={capacityBarFillStyle} />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={actionsStyle}>
        <Button
          variant="primary"
          onClick={() => onView && onView(school)}
          style={{ flex: 1 }}
        >
          👁️ View
        </Button>
        {isAdmin && (
          <>
            <Button
              variant="secondary"
              onClick={() => onEdit && onEdit(school)}
              style={{ flex: 1 }}
            >
              ✏️ Edit
            </Button>
            <Button
              variant="danger"
              onClick={() => onDelete && onDelete(school)}
              style={{ flex: 1 }}
            >
              🗑️ Delete
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default SchoolCard;