// ============================================
// EMAIL PREVIEW MODAL - Preview Email Before Sending
// ============================================

import React, { useState, useEffect } from 'react';
import { Button } from '../common/ui/Button';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';

/**
 * EmailPreviewModal Component
 * Shows preview of email before sending
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Close modal callback
 * @param {Function} props.onConfirm - Confirm send callback
 * @param {string} props.emailType - Type of email (welcome, password_reset, school_assignment)
 * @param {Object} props.userData - User data for email
 * @param {Object} props.emailData - Additional email data (password, schools, etc.)
 * @param {boolean} props.isLoading - Loading state for preview
 */
export const EmailPreviewModal = ({
  isOpen,
  onClose,
  onConfirm,
  emailType,
  userData,
  emailData = {},
  isLoading = false,
}) => {
  // ============================================
  // STATE
  // ============================================

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);

  // ============================================
  // FETCH PREVIEW
  // ============================================

  useEffect(() => {
    if (isOpen && userData && emailType) {
      fetchPreview();
    }
  }, [isOpen, userData, emailType, emailData]);

  const fetchPreview = async () => {
    setError(null);
    
    try {
      const token = localStorage.getItem('access');
      
      const response = await fetch(`${process.env.REACT_APP_NGROK_URL}/api/auth/users/preview-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email_type: emailType,
          user_data: userData,
          email_data: emailData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const data = await response.json();
      setPreview(data);
      
    } catch (err) {
      console.error('Error fetching email preview:', err);
      setError(err.message);
    }
  };

  const handleConfirm = async () => {
    setIsSending(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Error sending email:', err);
    } finally {
      setIsSending(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={titleStyle}>📧 Email Preview</h2>
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
        <div style={contentStyle}>
          {isLoading || !preview ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <LoadingSpinner size="large" />
              <p style={{ marginTop: '1rem', color: '#6B7280' }}>Loading preview...</p>
            </div>
          ) : error ? (
            <div style={errorBoxStyle}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#DC2626' }}>❌ Error</h3>
              <p style={{ margin: 0, color: '#6B7280' }}>{error}</p>
              <Button 
                variant="secondary" 
                onClick={fetchPreview} 
                style={{ marginTop: '1rem' }}
              >
                🔄 Retry
              </Button>
            </div>
          ) : (
            <>
              {/* Email Details */}
              <div style={emailDetailsStyle}>
                <div style={detailRowStyle}>
                  <span style={labelStyle}>From:</span>
                  <span style={valueStyle}>{preview.from_email}</span>
                </div>
                <div style={detailRowStyle}>
                  <span style={labelStyle}>To:</span>
                  <span style={valueStyle}>{preview.recipient}</span>
                </div>
                <div style={detailRowStyle}>
                  <span style={labelStyle}>Subject:</span>
                  <span style={valueStyle}>{preview.subject}</span>
                </div>
              </div>

              {/* Email Content Preview */}
              <div style={previewContainerStyle}>
                <div style={previewHeaderStyle}>Email Content Preview</div>
                <div 
                  style={iframeContainerStyle}
                  dangerouslySetInnerHTML={{ __html: preview.html_content }}
                />
              </div>

              {/* Warning */}
              <div style={warningBoxStyle}>
                <strong>⚠️ Important:</strong> This email will be sent immediately after confirmation. 
                Please review the content carefully.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            disabled={isSending || isLoading || error || !preview}
          >
            {isSending ? (
              <>
                <LoadingSpinner size="small" />
                <span style={{ marginLeft: '0.5rem' }}>Sending...</span>
              </>
            ) : (
              '📧 Send Email'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
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
  zIndex: 2000, // Higher than other modals
  padding: '1rem',
};

const modalStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  maxWidth: '900px',
  width: '100%',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

const headerStyle = {
  padding: '1.5rem',
  borderBottom: '1px solid #E5E7EB',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#F9FAFB',
  borderRadius: '12px 12px 0 0',
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
  overflowY: 'auto',
  flex: 1,
};

const emailDetailsStyle = {
  backgroundColor: '#F9FAFB',
  border: '1px solid #E5E7EB',
  borderRadius: '0.5rem',
  padding: '1rem',
  marginBottom: '1.5rem',
};

const detailRowStyle = {
  display: 'flex',
  gap: '1rem',
  marginBottom: '0.5rem',
};

const labelStyle = {
  fontWeight: '600',
  color: '#6B7280',
  minWidth: '80px',
};

const valueStyle = {
  color: '#1F2937',
  flex: 1,
};

const previewContainerStyle = {
  border: '2px solid #E5E7EB',
  borderRadius: '0.5rem',
  overflow: 'hidden',
  marginBottom: '1rem',
};

const previewHeaderStyle = {
  backgroundColor: '#3B82F6',
  color: 'white',
  padding: '0.75rem 1rem',
  fontWeight: '600',
  fontSize: '0.875rem',
};

const iframeContainerStyle = {
  backgroundColor: '#FFFFFF',
  padding: '1.5rem',
  minHeight: '300px',
  maxHeight: '400px',
  overflowY: 'auto',
  fontFamily: 'Arial, sans-serif',
};

const warningBoxStyle = {
  backgroundColor: '#FEF3C7',
  border: '1px solid #FCD34D',
  borderRadius: '0.5rem',
  padding: '1rem',
  fontSize: '0.875rem',
  color: '#92400E',
};

const errorBoxStyle = {
  backgroundColor: '#FEE2E2',
  border: '1px solid #FCA5A5',
  borderRadius: '0.5rem',
  padding: '2rem',
  textAlign: 'center',
};

const footerStyle = {
  padding: '1.5rem',
  borderTop: '1px solid #E5E7EB',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  backgroundColor: '#F9FAFB',
  borderRadius: '0 0 12px 12px',
};

export default EmailPreviewModal;