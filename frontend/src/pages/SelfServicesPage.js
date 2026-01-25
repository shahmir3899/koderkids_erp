// ============================================
// SELF SERVICES PAGE - Employee Self-Service Portal
// ============================================
// Location: src/pages/SelfServicesPage.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { reportRequestService } from '../services/reportRequestService';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../utils/designConstants';

/**
 * SelfServicesPage Component
 * Portal for employees to access self-service features
 * - Salary slips (direct access)
 * - Report requests (with approval workflow)
 */
function SelfServicesPage() {
  const [myRequests, setMyRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const userRole = localStorage.getItem('role') || '';
  const userName = localStorage.getItem('username') || 'User';

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const data = await reportRequestService.fetchMyRequests();
      setMyRequests(data.results || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      // Silently fail - API might not be ready yet
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return COLORS.status.success;
      case 'REJECTED': return COLORS.status.error;
      case 'SUBMITTED': return COLORS.status.warning;
      case 'GENERATED': return '#10B981';
      case 'DRAFT': return COLORS.text.whiteSubtle;
      default: return COLORS.text.whiteSubtle;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Handle downloading approved report
  const handleDownloadReport = async (request) => {
    try {
      toast.info('Generating report...');
      const response = await reportRequestService.downloadReport(request.id);

      // Create blob and download
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${request.request_number}-${request.subject.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Report downloaded successfully!');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report. Please try again.');
    }
  };

  // Services available to employees
  const services = [
    {
      id: 'salary-slip',
      title: 'My Salary Slips',
      description: 'View and download your salary slips',
      icon: (
        <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: '#10B981',
      link: '/salary-slip',
      badge: null,
    },
    {
      id: 'request-report',
      title: 'Request a Report',
      description: 'Request official reports and certificates',
      icon: (
        <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: '#8B5CF6',
      link: '/self-services/request-report',
      badge: null,
    },
  ];

  // Stats for the header
  const stats = {
    pending: myRequests.filter(r => r.status === 'SUBMITTED').length,
    approved: myRequests.filter(r => r.status === 'APPROVED' || r.status === 'GENERATED').length,
    total: myRequests.length,
  };

  return (
    <div style={styles.pageContainer}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Self Services</h1>
          <p style={styles.subtitle}>
            Welcome, {userName}! Access your employee services below.
          </p>
        </div>
        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{stats.total}</span>
            <span style={styles.statLabel}>Total Requests</span>
          </div>
          <div style={styles.statItem}>
            <span style={{ ...styles.statValue, color: COLORS.status.warning }}>{stats.pending}</span>
            <span style={styles.statLabel}>Pending</span>
          </div>
          <div style={styles.statItem}>
            <span style={{ ...styles.statValue, color: COLORS.status.success }}>{stats.approved}</span>
            <span style={styles.statLabel}>Approved</span>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Available Services</h2>
        <div style={styles.servicesGrid}>
          {services.map((service) => (
            <Link
              key={service.id}
              to={service.link}
              style={styles.serviceCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = service.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <div style={{ ...styles.serviceIcon, backgroundColor: `${service.color}20`, color: service.color }}>
                {service.icon}
              </div>
              <div style={styles.serviceContent}>
                <h3 style={styles.serviceTitle}>{service.title}</h3>
                <p style={styles.serviceDescription}>{service.description}</p>
              </div>
              <div style={styles.serviceArrow}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* My Requests Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>My Report Requests</h2>
          <Link to="/self-services/request-report" style={styles.newRequestButton}>
            + New Request
          </Link>
        </div>

        {isLoadingRequests ? (
          <div style={styles.loadingState}>Loading your requests...</div>
        ) : myRequests.length === 0 ? (
          <div style={styles.emptyState}>
            <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.3 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p style={styles.emptyText}>You haven't made any report requests yet.</p>
            <Link to="/self-services/request-report" style={styles.emptyAction}>
              Make your first request
            </Link>
          </div>
        ) : (
          <div style={styles.requestsList}>
            {myRequests.slice(0, 5).map((request) => (
              <div key={request.id} style={styles.requestItem}>
                <div style={styles.requestInfo}>
                  <span style={styles.requestNumber}>{request.request_number}</span>
                  <span style={styles.requestSubject}>{request.subject}</span>
                </div>
                <div style={styles.requestMeta}>
                  <span style={styles.requestDate}>{formatDate(request.created_at)}</span>
                  <span style={{ ...styles.requestStatus, color: getStatusColor(request.status) }}>
                    {request.status}
                  </span>
                  {(request.status === 'APPROVED' || request.status === 'GENERATED') && (
                    <button
                      onClick={() => handleDownloadReport(request)}
                      style={styles.downloadButton}
                      title="Download Report"
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                  )}
                </div>
              </div>
            ))}
            {myRequests.length > 5 && (
              <Link to="/self-services/my-requests" style={styles.viewAllLink}>
                View all {myRequests.length} requests
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Quick Info */}
      <div style={styles.infoBox}>
        <div style={styles.infoIcon}>
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div style={styles.infoContent}>
          <h4 style={styles.infoTitle}>How it works</h4>
          <ul style={styles.infoList}>
            <li>Salary slips can be accessed directly - no approval needed</li>
            <li>Report requests are submitted for admin approval</li>
            <li>You'll be notified when your request is approved or rejected</li>
            <li>Approved reports can be downloaded from this portal</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: '100vh',
    padding: SPACING.xl,
    background: COLORS.background.gradient,
  },
  header: {
    ...MIXINS.glassmorphicCard,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xl,
  },
  headerContent: {
    marginBottom: SPACING.lg,
  },
  title: {
    margin: 0,
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },
  subtitle: {
    margin: `${SPACING.sm} 0 0`,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.whiteMedium,
  },
  statsRow: {
    display: 'flex',
    gap: SPACING.xl,
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.md,
    minWidth: '100px',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  section: {
    ...MIXINS.glassmorphicCard,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    margin: 0,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  newRequestButton: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: '#8B5CF6',
    color: COLORS.text.white,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    textDecoration: 'none',
    transition: `all ${TRANSITIONS.fast}`,
  },
  servicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  serviceCard: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.md,
    textDecoration: 'none',
    transition: `all ${TRANSITIONS.normal}`,
    cursor: 'pointer',
  },
  serviceIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    borderRadius: BORDER_RADIUS.md,
    flexShrink: 0,
  },
  serviceContent: {
    flex: 1,
  },
  serviceTitle: {
    margin: 0,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  serviceDescription: {
    margin: `${SPACING.xs} 0 0`,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },
  serviceArrow: {
    color: COLORS.text.whiteSubtle,
  },
  loadingState: {
    padding: SPACING.xl,
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
  },
  emptyState: {
    padding: SPACING['2xl'],
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyText: {
    margin: 0,
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },
  emptyAction: {
    marginTop: SPACING.sm,
    color: '#8B5CF6',
    textDecoration: 'none',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  requestsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  requestItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BORDER_RADIUS.sm,
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  requestInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
  },
  requestNumber: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    padding: `2px ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.xs,
  },
  requestSubject: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
  },
  requestMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
  },
  requestDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  requestStatus: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    textTransform: 'uppercase',
  },
  downloadButton: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: COLORS.status.success,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
  },
  viewAllLink: {
    display: 'block',
    textAlign: 'center',
    padding: SPACING.md,
    color: '#8B5CF6',
    textDecoration: 'none',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  infoBox: {
    display: 'flex',
    gap: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: BORDER_RADIUS.md,
  },
  infoIcon: {
    color: '#6366F1',
    flexShrink: 0,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    margin: `0 0 ${SPACING.sm}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  infoList: {
    margin: 0,
    paddingLeft: SPACING.lg,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
    lineHeight: 1.8,
  },
};

export default SelfServicesPage;
