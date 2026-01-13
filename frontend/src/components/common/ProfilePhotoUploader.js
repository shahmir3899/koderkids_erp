// ============================================
// PROFILE PHOTO UPLOADER - Generic Photo Upload Component
// UPDATED: Now works for Teacher, Admin, AND Student
// ============================================
// Location: src/components/common/ProfilePhotoUploader.js

import React, { useRef, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import Compressor from 'compressorjs';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  TRANSITIONS,
} from '../../utils/designConstants';

/**
 * ProfilePhotoUploader Component
 * Handles profile photo selection, compression, upload, and deletion
 * NOW GENERIC - Works with any service by passing upload/delete functions
 * 
 * @param {Object} props
 * @param {string} props.currentPhotoUrl - Current profile photo URL
 * @param {Function} props.onPhotoChange - Callback when photo changes (receives new URL or null)
 * @param {Function} props.onUpload - Upload function (receives File) - returns Promise with { profile_photo_url }
 * @param {Function} props.onDelete - Delete function (no params) - returns Promise
 * @param {boolean} props.disabled - Whether uploads are disabled
 * @param {number} props.size - Size of the photo preview in pixels (default: 120)
 */
export const ProfilePhotoUploader = ({
  currentPhotoUrl,
  onPhotoChange,
  onUpload, // ← NEW: Function to handle upload
  onDelete, // ← NEW: Function to handle delete
  disabled = false,
  size = 120,
}) => {
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Open file dialog
  const openFileDialog = useCallback(() => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, isUploading]);

  // Handle file selection
  const handleFileSelect = useCallback(async (event) => {
    if (!event.target.files?.length) return;

    const file = event.target.files[0];
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image is too large. Please select an image under 10MB.');
      return;
    }

    console.log(`📷 Original image size: ${(file.size / 1024).toFixed(2)} KB`);
    setIsProcessing(true);

    // Compress the image
    new Compressor(file, {
      quality: 0.8,
      maxWidth: 400,
      maxHeight: 400,
      mimeType: 'image/jpeg',
      success: async (compressedBlob) => {
        console.log(`✅ Compressed image size: ${(compressedBlob.size / 1024).toFixed(2)} KB`);
        
        // Create file from blob
        const compressedFile = new File([compressedBlob], 'profile.jpg', { 
          type: 'image/jpeg' 
        });

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => setPreviewUrl(e.target.result);
        reader.readAsDataURL(compressedFile);

        setIsProcessing(false);
        setIsUploading(true);

        try {
          // Use the provided upload function
          if (!onUpload) {
            throw new Error('Upload function not provided');
          }

          const response = await onUpload(compressedFile);
          
          toast.success('Profile photo updated successfully!');
          setPreviewUrl(null);
          
          if (onPhotoChange) {
            onPhotoChange(response.profile_photo_url);
          }
        } catch (error) {
          console.error('❌ Upload failed:', error);
          toast.error('Failed to upload profile photo. Please try again.');
          setPreviewUrl(null);
        } finally {
          setIsUploading(false);
        }
      },
      error: (err) => {
        console.error('❌ Compression error:', err);
        toast.error('Failed to process image. Please try again.');
        setIsProcessing(false);
      },
    });

    // Reset file input
    event.target.value = '';
  }, [onPhotoChange, onUpload]);

  // Handle photo deletion
  const handleDelete = useCallback(async () => {
    if (!currentPhotoUrl || isDeleting) return;

    const confirmed = window.confirm('Are you sure you want to remove your profile photo?');
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      // Use the provided delete function
      if (!onDelete) {
        throw new Error('Delete function not provided');
      }

      await onDelete();
      toast.success('Profile photo removed successfully!');
      
      if (onPhotoChange) {
        onPhotoChange(null);
      }
    } catch (error) {
      console.error('❌ Delete failed:', error);
      toast.error('Failed to remove profile photo. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [currentPhotoUrl, isDeleting, onPhotoChange, onDelete]);

  // Determine which image to display
  const displayUrl = previewUrl || currentPhotoUrl;

  return (
    <div style={styles.container}>
      {/* Hidden file input */}
      <input
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        disabled={disabled || isProcessing || isUploading || !onUpload}
      />

      {/* Photo Preview */}
      <div 
        style={{
          ...styles.photoContainer,
          width: size,
          height: size,
        }}
        onClick={openFileDialog}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && openFileDialog()}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Profile"
            style={{
              ...styles.photo,
              width: size,
              height: size,
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div style={{
            ...styles.placeholder,
            width: size,
            height: size,
          }}>
            <svg 
              style={{ width: size * 0.4, height: size * 0.4 }} 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        )}

        {/* Overlay with camera icon */}
        <div style={styles.overlay}>
          {isProcessing || isUploading ? (
            <div style={styles.spinner}>
              <svg 
                style={styles.spinnerIcon}
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  style={{ opacity: 0.25 }} 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  style={{ opacity: 0.75 }} 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : (
            <svg style={styles.cameraIcon} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z" />
              <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
            </svg>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.buttonContainer}>
        <button
          onClick={openFileDialog}
          disabled={disabled || isProcessing || isUploading || !onUpload}
          style={{
            ...styles.button,
            ...styles.uploadButton,
            opacity: disabled || isProcessing || isUploading || !onUpload ? 0.6 : 1,
          }}
        >
          {isProcessing ? 'Processing...' : isUploading ? 'Uploading...' : 'Change Photo'}
        </button>

        {currentPhotoUrl && onDelete && (
          <button
            onClick={handleDelete}
            disabled={disabled || isDeleting}
            style={{
              ...styles.button,
              ...styles.deleteButton,
              opacity: disabled || isDeleting ? 0.6 : 1,
            }}
          >
            {isDeleting ? 'Removing...' : 'Remove'}
          </button>
        )}
      </div>

      {/* Helper Text */}
      <p style={styles.helperText}>
        Click to upload. Recommended: Square image, at least 200x200px.
      </p>
    </div>
  );
};

// Styles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  photoContainer: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    cursor: 'pointer',
    border: `4px solid ${COLORS.border.light}`,
    boxShadow: SHADOWS.md,
    transition: `all ${TRANSITIONS.normal} ease`,
  },
  photo: {
    objectFit: 'cover',
    borderRadius: BORDER_RADIUS.full,
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.offWhite,
    color: COLORS.text.tertiary,
    borderRadius: BORDER_RADIUS.full,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: COLORS.background.overlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: `opacity ${TRANSITIONS.normal} ease`,
    ':hover': {
      opacity: 1,
    },
  },
  cameraIcon: {
    width: SPACING.lg,
    height: SPACING.lg,
    color: COLORS.text.white,
  },
  spinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerIcon: {
    width: SPACING.lg,
    height: SPACING.lg,
    color: COLORS.text.white,
    animation: 'spin 1s linear infinite',
  },
  buttonContainer: {
    display: 'flex',
    gap: SPACING.xs,
  },
  button: {
    padding: `${SPACING.xs} ${SPACING.md}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
  },
  uploadButton: {
    backgroundColor: COLORS.status.info,
    color: COLORS.text.white,
  },
  deleteButton: {
    backgroundColor: COLORS.status.error,
    color: COLORS.text.white,
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    margin: 0,
  },
};

// Add CSS for hover and animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .profile-photo-container:hover .profile-photo-overlay {
    opacity: 1 !important;
  }
`;
document.head.appendChild(styleSheet);

export default ProfilePhotoUploader;