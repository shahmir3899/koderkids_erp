// ============================================
// IMAGE UPLOAD MODAL - Modal for Image Upload
// ============================================
// Location: src/components/common/modals/ImageUploadModal.js

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import Compressor from 'compressorjs';
import { LoadingSpinner } from '../ui/LoadingSpinner';

/**
 * ImageUploadModal Component
 * Modal for uploading images with compression and preview
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.studentName - Student name to display
 * @param {string} props.studentId - Student ID for upload
 * @param {string} props.sessionDate - Session date for upload
 * @param {Function} props.onUploadComplete - Callback after successful upload (receives imageUrl)
 * @param {Function} props.uploadHandler - Async function to handle the actual upload
 * @param {Object} props.compressionOptions - Image compression options
 */
export const ImageUploadModal = ({
  isOpen,
  onClose,
  studentName,
  studentId,
  sessionDate,
  onUploadComplete,
  uploadHandler,
  compressionOptions = {
    quality: 0.7,
    maxWidth: 800,
    maxHeight: 800,
  },
}) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsProcessing(false);
      setIsUploading(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Open file dialog
  const openFileDialog = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Handle file selection and compression
  const handleFileSelect = useCallback((event) => {
    if (!event.target.files?.length) return;

    const file = event.target.files[0];
    console.log(`📷 Original image size: ${(file.size / 1024).toFixed(2)} KB`);

    setIsProcessing(true);

    new Compressor(file, {
      quality: compressionOptions.quality,
      maxWidth: compressionOptions.maxWidth,
      maxHeight: compressionOptions.maxHeight,
      mimeType: file.type,
      success(result) {
        const processedFile = new File([result], file.name, { type: file.type });
        console.log(`✅ Processed image size: ${(processedFile.size / 1024).toFixed(2)} KB`);

        setSelectedFile(processedFile);
        
        // Create preview URL
        const url = URL.createObjectURL(processedFile);
        setPreviewUrl(url);
        
        setIsProcessing(false);
        toast.success('Image processed successfully!');
      },
      error(err) {
        console.error('❌ Compression error:', err);
        setIsProcessing(false);
        toast.error('Failed to process image.');
      },
    });

    // Reset file input
    event.target.value = '';
  }, [compressionOptions]);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      toast.error('Please select a file first.');
      return;
    }

    setIsUploading(true);

    try {
      const imageUrl = await uploadHandler(studentId, selectedFile, sessionDate);
      
      toast.success('Image uploaded successfully!');
      
      if (onUploadComplete) {
        onUploadComplete(imageUrl);
      }
      
      onClose();
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      toast.error('Failed to upload image.');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, studentId, sessionDate, uploadHandler, onUploadComplete, onClose]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Don't render if not open
  if (!isOpen) return null;

  // Styles
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
    backdropFilter: 'blur(4px)',
  };

  const modalStyle = {
    backgroundColor: '#FFFFFF',
    borderRadius: '1rem',
    padding: '1.5rem',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #E5E7EB',
  };

  const titleStyle = {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1F2937',
    margin: 0,
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#6B7280',
    padding: '0.25rem',
    lineHeight: 1,
  };

  const studentInfoStyle = {
    padding: '0.75rem 1rem',
    backgroundColor: '#F3F4F6',
    borderRadius: '0.5rem',
    marginBottom: '1.5rem',
  };

  const dropZoneStyle = {
    border: '2px dashed #D1D5DB',
    borderRadius: '0.75rem',
    padding: '2rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: '#F9FAFB',
  };

  const previewContainerStyle = {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#F9FAFB',
    borderRadius: '0.5rem',
    textAlign: 'center',
  };

  const previewImageStyle = {
    maxWidth: '100%',
    maxHeight: '200px',
    borderRadius: '0.5rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  };

  const footerStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #E5E7EB',
  };

  const buttonStyle = {
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#F3F4F6',
    color: '#374151',
    border: '1px solid #D1D5DB',
  };

  const uploadButtonStyle = {
    ...buttonStyle,
    backgroundColor: selectedFile && !isUploading ? '#3B82F6' : '#9CA3AF',
    color: '#FFFFFF',
    border: 'none',
    cursor: selectedFile && !isUploading ? 'pointer' : 'not-allowed',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={titleStyle}>📷 Upload Image</h2>
          <button 
            style={closeButtonStyle} 
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Student Info */}
        <div style={studentInfoStyle}>
          <p style={{ margin: 0, color: '#374151' }}>
            <strong>Student:</strong> {studentName}
          </p>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '0.875rem' }}>
            <strong>Date:</strong> {sessionDate}
          </p>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {/* Drop Zone / Browse Area */}
        <div
          style={dropZoneStyle}
          onClick={openFileDialog}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#3B82F6';
            e.currentTarget.style.backgroundColor = '#EFF6FF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#D1D5DB';
            e.currentTarget.style.backgroundColor = '#F9FAFB';
          }}
        >
          {isProcessing ? (
            <div>
              <LoadingSpinner size="medium" />
              <p style={{ marginTop: '0.75rem', color: '#6B7280' }}>
                Processing image...
              </p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📁</div>
              <p style={{ margin: 0, color: '#374151', fontWeight: '500' }}>
                Click to browse or drag and drop
              </p>
              <p style={{ margin: '0.5rem 0 0 0', color: '#9CA3AF', fontSize: '0.875rem' }}>
                Supports: JPG, PNG, GIF (max 10MB)
              </p>
            </>
          )}
        </div>

        {/* Preview */}
        {previewUrl && (
          <div style={previewContainerStyle}>
            <p style={{ margin: '0 0 0.75rem 0', color: '#374151', fontWeight: '500' }}>
              Preview:
            </p>
            <img 
              src={previewUrl} 
              alt="Preview" 
              style={previewImageStyle}
            />
            <p style={{ margin: '0.75rem 0 0 0', color: '#6B7280', fontSize: '0.875rem' }}>
              {selectedFile?.name} ({(selectedFile?.size / 1024).toFixed(1)} KB)
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={footerStyle}>
          <button
            style={cancelButtonStyle}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E5E7EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
          >
            Cancel
          </button>
          <button
            style={uploadButtonStyle}
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            onMouseEnter={(e) => {
              if (selectedFile && !isUploading) {
                e.currentTarget.style.backgroundColor = '#2563EB';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedFile && !isUploading) {
                e.currentTarget.style.backgroundColor = '#3B82F6';
              }
            }}
          >
            {isUploading ? (
              <>
                <LoadingSpinner size="tiny" />
                Uploading...
              </>
            ) : (
              <>⬆️ Upload</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadModal;