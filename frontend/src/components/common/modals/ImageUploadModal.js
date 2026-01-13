// ============================================
// IMAGE UPLOAD MODAL - Modal for Image Upload
// ============================================
// Location: src/components/common/modals/ImageUploadModal.js

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import Compressor from 'compressorjs';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  TRANSITIONS,
  Z_INDEX,
} from '../../../utils/designConstants';

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
    backgroundColor: COLORS.background.overlay,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: Z_INDEX.modal,
    backdropFilter: 'blur(4px)',
  };

  const modalStyle = {
    backgroundColor: COLORS.background.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: SHADOWS.xl,
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottom: `1px solid ${COLORS.border.light}`,
  };

  const titleStyle = {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.primary,
    margin: 0,
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: FONT_SIZES['2xl'],
    cursor: 'pointer',
    color: COLORS.text.secondary,
    padding: SPACING.xs,
    lineHeight: 1,
  };

  const studentInfoStyle = {
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: COLORS.background.offWhite,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.lg,
  };

  const dropZoneStyle = {
    border: `2px dashed ${COLORS.border.light}`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xl,
    textAlign: 'center',
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal} ease`,
    backgroundColor: COLORS.background.lightGray,
  };

  const previewContainerStyle = {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.background.lightGray,
    borderRadius: BORDER_RADIUS.sm,
    textAlign: 'center',
  };

  const previewImageStyle = {
    maxWidth: '100%',
    maxHeight: '200px',
    borderRadius: BORDER_RADIUS.sm,
    boxShadow: SHADOWS.md,
  };

  const footerStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingTop: SPACING.sm,
    borderTop: `1px solid ${COLORS.border.light}`,
  };

  const buttonStyle = {
    padding: `${SPACING.sm} ${SPACING.md}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    borderRadius: BORDER_RADIUS.sm,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    backgroundColor: COLORS.background.offWhite,
    color: COLORS.text.primary,
    border: `1px solid ${COLORS.border.light}`,
  };

  const uploadButtonStyle = {
    ...buttonStyle,
    backgroundColor: selectedFile && !isUploading ? COLORS.status.info : COLORS.text.tertiary,
    color: COLORS.text.white,
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
          <p style={{ margin: 0, color: COLORS.text.primary }}>
            <strong>Student:</strong> {studentName}
          </p>
          <p style={{ margin: `${SPACING.xs} 0 0 0`, color: COLORS.text.secondary, fontSize: FONT_SIZES.sm }}>
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
            e.currentTarget.style.borderColor = COLORS.status.info;
            e.currentTarget.style.backgroundColor = COLORS.status.infoLight;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = COLORS.border.light;
            e.currentTarget.style.backgroundColor = COLORS.background.lightGray;
          }}
        >
          {isProcessing ? (
            <div>
              <LoadingSpinner size="medium" />
              <p style={{ marginTop: SPACING.sm, color: COLORS.text.secondary }}>
                Processing image...
              </p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: FONT_SIZES['4xl'], marginBottom: SPACING.sm }}>📁</div>
              <p style={{ margin: 0, color: COLORS.text.primary, fontWeight: FONT_WEIGHTS.medium }}>
                Click to browse or drag and drop
              </p>
              <p style={{ margin: `${SPACING.xs} 0 0 0`, color: COLORS.text.tertiary, fontSize: FONT_SIZES.sm }}>
                Supports: JPG, PNG, GIF (max 10MB)
              </p>
            </>
          )}
        </div>

        {/* Preview */}
        {previewUrl && (
          <div style={previewContainerStyle}>
            <p style={{ margin: `0 0 ${SPACING.sm} 0`, color: COLORS.text.primary, fontWeight: FONT_WEIGHTS.medium }}>
              Preview:
            </p>
            <img
              src={previewUrl}
              alt="Preview"
              style={previewImageStyle}
            />
            <p style={{ margin: `${SPACING.sm} 0 0 0`, color: COLORS.text.secondary, fontSize: FONT_SIZES.sm }}>
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
              e.currentTarget.style.backgroundColor = COLORS.border.light;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.background.offWhite;
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
                e.currentTarget.style.backgroundColor = COLORS.status.infoDark;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedFile && !isUploading) {
                e.currentTarget.style.backgroundColor = COLORS.status.info;
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