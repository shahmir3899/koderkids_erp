// ============================================
// PROFILE PHOTO UPLOADER - Teacher Profile Photo Component
// ============================================
// Location: src/components/teacher/ProfilePhotoUploader.js

import React, { useRef, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import Compressor from 'compressorjs';
import { uploadProfilePhoto, deleteProfilePhoto } from '../../services/teacherService';

/**
 * ProfilePhotoUploader Component
 * Handles profile photo selection, compression, upload, and deletion
 * 
 * @param {Object} props
 * @param {string} props.currentPhotoUrl - Current profile photo URL
 * @param {Function} props.onPhotoChange - Callback when photo changes (receives new URL or null)
 * @param {boolean} props.disabled - Whether uploads are disabled
 * @param {number} props.size - Size of the photo preview in pixels (default: 120)
 */
export const ProfilePhotoUploader = ({
  currentPhotoUrl,
  onPhotoChange,
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
          // Upload to server
          const response = await uploadProfilePhoto(compressedFile);
          
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
  }, [onPhotoChange]);

  // Handle photo deletion
  const handleDelete = useCallback(async () => {
    if (!currentPhotoUrl || isDeleting) return;

    const confirmed = window.confirm('Are you sure you want to remove your profile photo?');
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      await deleteProfilePhoto();
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
  }, [currentPhotoUrl, isDeleting, onPhotoChange]);

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
        disabled={disabled || isProcessing || isUploading}
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
          disabled={disabled || isProcessing || isUploading}
          style={{
            ...styles.button,
            ...styles.uploadButton,
            opacity: disabled || isProcessing || isUploading ? 0.6 : 1,
          }}
        >
          {isProcessing ? 'Processing...' : isUploading ? 'Uploading...' : 'Change Photo'}
        </button>

        {currentPhotoUrl && (
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
    gap: '0.75rem',
  },
  photoContainer: {
    position: 'relative',
    borderRadius: '50%',
    overflow: 'hidden',
    cursor: 'pointer',
    border: '4px solid #E5E7EB',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
  },
  photo: {
    objectFit: 'cover',
    borderRadius: '50%',
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
    borderRadius: '50%',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease',
    ':hover': {
      opacity: 1,
    },
  },
  cameraIcon: {
    width: '2rem',
    height: '2rem',
    color: '#FFFFFF',
  },
  spinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerIcon: {
    width: '2rem',
    height: '2rem',
    color: '#FFFFFF',
    animation: 'spin 1s linear infinite',
  },
  buttonContainer: {
    display: 'flex',
    gap: '0.5rem',
  },
  button: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  uploadButton: {
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: '0.75rem',
    color: '#9CA3AF',
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