// ============================================
// LOGO UPLOADER - Image Upload with Preview
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import Compressor from 'compressorjs';

/**
 * LogoUploader Component
 * Handles logo upload with drag-and-drop, preview, and compression
 * 
 * @param {Object} props
 * @param {string} props.currentLogo - Current logo URL (for edit mode)
 * @param {Function} props.onLogoChange - Callback when logo changes (receives File or URL)
 * @param {Function} props.onLogoRemove - Callback when logo is removed
 */
export const LogoUploader = ({ currentLogo, onLogoChange, onLogoRemove }) => {
  const [preview, setPreview] = useState(currentLogo || null);
  const [isNewUpload, setIsNewUpload] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Reset state when currentLogo prop changes (e.g., switching between schools)
  useEffect(() => {
    setPreview(currentLogo || null);
    setIsNewUpload(false);
    setError(null);
  }, [currentLogo]);

  // Validate file
  const validateFile = (file) => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Please upload a valid image file (JPG, PNG, or WebP)';
    }

    // Check file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return 'File size must be less than 2MB';
    }

    return null;
  };

  // Compress and process image
  const processImage = (file) => {
    setError(null);
    setIsUploading(true);

    new Compressor(file, {
      quality: 0.85,
      maxWidth: 800,
      maxHeight: 800,
      success(compressedFile) {
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
          setIsNewUpload(true);
          setIsUploading(false);

          // Pass the compressed file to parent
          if (onLogoChange) {
            onLogoChange(compressedFile);
          }
        };
        reader.readAsDataURL(compressedFile);
      },
      error(err) {
        console.error('Compression error:', err);
        setError('Failed to process image');
        setIsUploading(false);
      },
    });
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    processImage(file);
  };

  // Handle drag and drop
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    processImage(file);
  };

  // Handle remove
  const handleRemove = () => {
    setPreview(null);
    setIsNewUpload(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onLogoRemove) {
      onLogoRemove();
    }
  };

  // Styles
  const containerStyle = {
    marginBottom: '1.5rem',
  };

  const labelStyle = {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
    display: 'block',
  };

  const dropZoneStyle = {
    border: `2px dashed ${isDragging ? '#3B82F6' : '#D1D5DB'}`,
    borderRadius: '0.5rem',
    padding: '2rem',
    textAlign: 'center',
    backgroundColor: isDragging ? '#EFF6FF' : '#F9FAFB',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  const iconStyle = {
    fontSize: '2.5rem',
    marginBottom: '0.5rem',
  };

  const textStyle = {
    fontSize: '0.875rem',
    color: '#6B7280',
    marginBottom: '0.25rem',
  };

  const buttonStyle = {
    display: 'inline-block',
    padding: '0.5rem 1rem',
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    marginTop: '0.5rem',
    transition: 'background-color 0.15s ease',
  };

  const previewContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    border: '1px solid #E5E7EB',
    borderRadius: '0.5rem',
    backgroundColor: '#F9FAFB',
  };

  const previewImageStyle = {
    width: '80px',
    height: '80px',
    objectFit: 'cover',
    borderRadius: '0.5rem',
    border: '2px solid #E5E7EB',
  };

  const previewInfoStyle = {
    flex: 1,
  };

  const successTextStyle = {
    fontSize: '0.875rem',
    color: '#10B981',
    fontWeight: '500',
    marginBottom: '0.25rem',
  };

  const hintTextStyle = {
    fontSize: '0.75rem',
    color: '#6B7280',
  };

  const removeButtonStyle = {
    padding: '0.5rem 1rem',
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.15s ease',
  };

  const errorStyle = {
    fontSize: '0.875rem',
    color: '#EF4444',
    marginTop: '0.5rem',
  };

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>📸 School Logo</label>

      {!preview ? (
        <>
          {/* Drop Zone */}
          <div
            style={dropZoneStyle}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={iconStyle}>
              {isUploading ? '⏳' : isDragging ? '📥' : '📁'}
            </div>
            <div style={textStyle}>
              {isUploading
                ? 'Processing image...'
                : isDragging
                ? 'Drop image here'
                : 'Drag & drop image here'}
            </div>
            <div style={textStyle}>or</div>
            <button
              type="button"
              style={buttonStyle}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#2563EB')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#3B82F6')}
              disabled={isUploading}
            >
              Choose File
            </button>
            <div style={{ ...hintTextStyle, marginTop: '0.75rem' }}>
              Accepted: JPG, PNG, WebP • Max size: 2MB
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Error message */}
          {error && <div style={errorStyle}>❌ {error}</div>}
        </>
      ) : (
        <>
          {/* Preview */}
          <div style={previewContainerStyle}>
            <img src={preview} alt="Logo preview" style={previewImageStyle} />
            <div style={previewInfoStyle}>
              {isNewUpload ? (
                <>
                  <div style={successTextStyle}>New logo selected</div>
                  <div style={hintTextStyle}>
                    Will be uploaded when you save
                  </div>
                </>
              ) : (
                <>
                  <div style={{ ...hintTextStyle, fontWeight: '500', color: '#374151' }}>
                    Current logo
                  </div>
                  <div style={hintTextStyle}>
                    Upload a new image to replace
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              style={removeButtonStyle}
              onClick={handleRemove}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#DC2626')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#EF4444')}
            >
              Remove
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LogoUploader;