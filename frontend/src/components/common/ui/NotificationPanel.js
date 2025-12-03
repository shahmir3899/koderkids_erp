// ============================================
// NOTIFICATION PANEL - Notifications Dropdown
// ============================================
// Location: src/components/common/ui/NotificationPanel.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  getNotifications, 
  getUnreadNotificationCount,
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '../../../services/teacherService';

/**
 * NotificationPanel Component
 * Displays a dropdown with notifications
 * 
 * @param {Object} props
 * @param {Function} props.onNotificationClick - Callback when notification is clicked
 */
export const NotificationPanel = ({ onNotificationClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef(null);

  // Fetch unread count on mount
  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Fetch notifications when panel opens
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle panel
  const togglePanel = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    if (notification.related_url && onNotificationClick) {
      onNotificationClick(notification.related_url);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    const iconStyle = { width: '1.25rem', height: '1.25rem' };
    
    switch (type) {
      case 'success':
        return (
          <svg style={{ ...iconStyle, color: '#10B981' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        );
      case 'warning':
        return (
          <svg style={{ ...iconStyle, color: '#F59E0B' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
        );
      case 'error':
        return (
          <svg style={{ ...iconStyle, color: '#EF4444' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        );
      case 'message':
        return (
          <svg style={{ ...iconStyle, color: '#3B82F6' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
        );
      case 'reminder':
        return (
          <svg style={{ ...iconStyle, color: '#8B5CF6' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
          </svg>
        );
      default:
        return (
          <svg style={{ ...iconStyle, color: '#6B7280' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        );
    }
  };

  return (
    <div ref={panelRef} style={styles.container}>
      {/* Bell Button */}
      <button
        onClick={togglePanel}
        style={styles.bellButton}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <svg style={styles.bellIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span style={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div style={styles.panel}>
          {/* Panel Header */}
          <div style={styles.panelHeader}>
            <h3 style={styles.panelTitle}>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} style={styles.markAllButton}>
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={styles.notificationList}>
            {isLoading ? (
              <div style={styles.loadingState}>
                <div style={styles.spinner} />
                <span>Loading...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div style={styles.emptyState}>
                <svg style={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <span>No notifications yet</span>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    ...styles.notificationItem,
                    backgroundColor: notification.is_read ? 'transparent' : '#F0F9FF',
                  }}
                  onClick={() => handleNotificationClick(notification)}
                  role="button"
                  tabIndex={0}
                >
                  <div style={styles.notificationIcon}>
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div style={styles.notificationContent}>
                    <p style={styles.notificationTitle}>{notification.title}</p>
                    <p style={styles.notificationMessage}>{notification.message}</p>
                    <span style={styles.notificationTime}>{notification.time_ago}</span>
                  </div>
                  {!notification.is_read && (
                    <div style={styles.unreadDot} />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Panel Footer */}
          {notifications.length > 0 && (
            <div style={styles.panelFooter}>
              <button style={styles.viewAllButton}>
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Styles
const styles = {
  container: {
    position: 'relative',
  },
  bellButton: {
    position: 'relative',
    padding: '0.75rem',
    background: 'transparent',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    color: '#6B7280',
    transition: 'all 0.2s ease',
  },
  bellIcon: {
    width: '1.5rem',
    height: '1.5rem',
  },
  badge: {
    position: 'absolute',
    top: '0.25rem',
    right: '0.25rem',
    minWidth: '1.25rem',
    height: '1.25rem',
    padding: '0 0.25rem',
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    fontSize: '0.625rem',
    fontWeight: '600',
    borderRadius: '9999px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    position: 'absolute',
    top: '100%',
    right: 0,
    width: '360px',
    maxHeight: '480px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    zIndex: 1000,
    marginTop: '0.5rem',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    borderBottom: '1px solid #E5E7EB',
  },
  panelTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1F2937',
    margin: 0,
  },
  markAllButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: 'transparent',
    color: '#3B82F6',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  notificationList: {
    maxHeight: '360px',
    overflowY: 'auto',
  },
  notificationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '1rem',
    borderBottom: '1px solid #F3F4F6',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    position: 'relative',
  },
  notificationIcon: {
    flexShrink: 0,
    width: '2rem',
    height: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: '50%',
  },
  notificationContent: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1F2937',
    margin: 0,
    marginBottom: '0.25rem',
  },
  notificationMessage: {
    fontSize: '0.8125rem',
    color: '#6B7280',
    margin: 0,
    marginBottom: '0.25rem',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  notificationTime: {
    fontSize: '0.75rem',
    color: '#9CA3AF',
  },
  unreadDot: {
    width: '0.5rem',
    height: '0.5rem',
    backgroundColor: '#3B82F6',
    borderRadius: '50%',
    flexShrink: 0,
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    color: '#9CA3AF',
    gap: '0.5rem',
  },
  spinner: {
    width: '1.5rem',
    height: '1.5rem',
    border: '2px solid #E5E7EB',
    borderTopColor: '#3B82F6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    color: '#9CA3AF',
    gap: '0.5rem',
  },
  emptyIcon: {
    width: '3rem',
    height: '3rem',
    color: '#D1D5DB',
  },
  panelFooter: {
    padding: '0.75rem',
    borderTop: '1px solid #E5E7EB',
    textAlign: 'center',
  },
  viewAllButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    color: '#3B82F6',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default NotificationPanel;