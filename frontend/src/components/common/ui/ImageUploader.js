// ============================================
// IMAGE UPLOADER - File Select, Compress, Upload Component
// ============================================
// Location: src/components/common/ui/ImageUploader.js

import React, { useRef, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import Compressor from 'compressorjs';

/**
 * ImageUploader Component
 * Handles file selection, compression, upload, preview, and delete
 * 
 * @param {Object} props
 * @param {string} props.studentId - Student ID for the upload
 * @param {string} props.sessionDate - Session date for the upload
 * @param {string|Object} props.uploadedImage - Currently uploaded image URL or object with signedURL
 * @param {Function} props.onUpload - Callback after successful upload (receives image URL)
 * @param {Function} props.onDelete - Callback after delete
 * @param {Function} props.uploadHandler - Async function to handle the actual upload
 * @param {boolean} props.disabled - Whether uploads are disabled
 * @param {Object} props.compressionOptions - Image compression options
 */
export const ImageUploader = ({
  studentId,
  sessionDate,
  uploadedImage,
  onUpload,
  onDelete,
  uploadHandler,
  disabled = false,
  compressionOptions = {
    quality: 0.7,
    maxWidth: 800,
    maxHeight: 800,
  },
}) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Get the image URL from either string or object
  const imageUrl = typeof uploadedImage === 'object' 
    ? uploadedImage?.signedURL 
    : uploadedImage;

  // Open file dialog
  const openFileDialog = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // Handle file selection and compression
  const handleFileSelect = useCallback((event) => {
    if (!event.target.files?.length) return;

    const file = event.target.files[0];
    console.log(`📷 Original image size: ${(file.size / 1024).toFixed(2)} KB`);

    setIsProcessing(true);
    const processingToastId = toast.info('🛠️ Processing image...', { autoClose: false });

    new Compressor(file, {
      quality: compressionOptions.quality,
      maxWidth: compressionOptions.maxWidth,
      maxHeight: compressionOptions.maxHeight,
      mimeType: file.type,
      success(result) {
        const processedFile = new File([result], file.name, { type: file.type });
        console.log(`✅ Processed image size: ${(processedFile.size / 1024).toFixed(2)} KB`);

        setSelectedFile(processedFile);
        setIsProcessing(false);
        toast.dismiss(processingToastId);
        toast.success('✅ Image processed successfully!');
      },
      error(err) {
        console.error('❌ Compression error:', err);
        setIsProcessing(false);
        toast.dismiss(processingToastId);
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
    const uploadingToastId = toast.info('⬆️ Uploading image...', { autoClose: false });

    try {
      const imageUrl = await uploadHandler(studentId, selectedFile, sessionDate);
      
      setSelectedFile(null);
      toast.dismiss(uploadingToastId);
      toast.success('Image uploaded successfully!');
      
      if (onUpload) {
        onUpload(imageUrl);
      }
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      toast.dismiss(uploadingToastId);
      toast.error('Failed to upload image.');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, studentId, sessionDate, uploadHandler, onUpload]);

  // Handle delete
  const handleDelete = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onDelete) {
      onDelete();
    }
  }, [onDelete]);

  // Styles
  const containerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const buttonBaseStyle = {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
  };

  const browseButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#6B7280',
    color: '#FFFFFF',
  };

  const uploadButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: selectedFile ? '#3B82F6' : '#D1D5DB',
    color: '#FFFFFF',
    cursor: selectedFile && !isUploading ? 'pointer' : 'not-allowed',
    opacity: selectedFile ? 1 : 0.6,
  };

  const deleteButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
  };

  const imagePreviewStyle = {
    width: '80px',
    height: '80px',
    borderRadius: '0.5rem',
    border: '1px solid #D1D5DB',
    objectFit: 'cover',
  };

  const fileNameStyle = {
    fontSize: '0.75rem',
    color: '#6B7280',
    maxWidth: '150px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={containerStyle}>
      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        disabled={disabled}
      />

      {/* Browse button */}
      <button
        onClick={openFileDialog}
        disabled={disabled || isProcessing}
        style={browseButtonStyle}
        onMouseEnter={(e) => {
          if (!disabled) e.currentTarget.style.backgroundColor = '#4B5563';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#6B7280';
        }}
      >
        {isProcessing ? '⏳ Processing...' : '📁 Browse'}
      </button>

      {/* Selected file name */}
      {selectedFile && (
        <span style={fileNameStyle} title={selectedFile.name}>
          {selectedFile.name}
        </span>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || isUploading || disabled}
        style={uploadButtonStyle}
        onMouseEnter={(e) => {
          if (selectedFile && !isUploading) {
            e.currentTarget.style.backgroundColor = '#2563EB';
          }
        }}
        onMouseLeave={(e) => {
          if (selectedFile) {
            e.currentTarget.style.backgroundColor = '#3B82F6';
          }
        }}
      >
        {isUploading ? '⏳ Uploading...' : '⬆️ Upload'}
      </button>

      {/* Uploaded image preview */}
      {imageUrl && (
        <>
          <img
            src={imageUrl}
            alt="Uploaded"
            style={imagePreviewStyle}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <button
            onClick={handleDelete}
            disabled={disabled}
            style={deleteButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#DC2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#EF4444';
            }}
          >
            🗑️ Delete
          </button>
        </>
      )}
    </div>
  );
};

export default ImageUploader;