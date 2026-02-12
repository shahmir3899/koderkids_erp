// ============================================
// HOMEWORK UPLOADER - Activity proof upload
// ============================================
// Inline upload component for home_activity blocks.
// Handles image selection, compression, Supabase upload,
// then API call to create the ActivityProof record.

import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCamera,
  faImage,
  faUpload,
  faSpinner,
  faTimes,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import { uploadFile, getPublicUrl } from '../../services/Supabaseclient';
import { uploadActivityProof } from '../../services/courseService';
import {
  BOOK_COLORS,
  BOOK_FONTS,
  BOOK_FONT_SIZES,
  BOOK_RADIUS,
  BOOK_SHADOWS,
  BOOK_SPACING,
} from '../../utils/bookTheme';

const SOFTWARE_OPTIONS = [
  { value: '', label: 'Select software used...' },
  { value: 'scratch', label: 'Scratch / ScratchJr' },
  { value: 'python', label: 'Python' },
  { value: 'canva', label: 'Canva' },
  { value: 'ai_tool', label: 'AI Tool' },
  { value: 'vexcode', label: 'VEXcode VR' },
  { value: 'powerpoint', label: 'PowerPoint / Slides' },
  { value: 'other', label: 'Other' },
];

/**
 * Compress an image file before upload
 * @param {File} file - Original file
 * @param {number} maxWidth - Max width in pixels
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<Blob>}
 */
const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(blob || file),
          'image/jpeg',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const HomeworkUploader = ({
  topicId,
  topicTitle,
  onUploadSuccess, // callback(proof) when upload completes
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [softwareUsed, setSoftwareUsed] = useState('');
  const [studentNotes, setStudentNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Please select an image under 10MB.');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setSuccess(false);

    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }
    if (!softwareUsed) {
      setError('Please select the software you used');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress('Compressing image...');

    try {
      // 1. Compress image
      const compressed = await compressImage(selectedFile);

      // 2. Upload to Supabase
      setUploadProgress('Uploading to cloud...');
      const timestamp = Date.now();
      const ext = selectedFile.name.split('.').pop() || 'jpg';
      const path = `activity-proofs/topic-${topicId}/${timestamp}.${ext}`;
      const { data: uploadData, error: uploadError } = await uploadFile(
        'book-assets',
        path,
        compressed,
        { contentType: 'image/jpeg' }
      );

      if (uploadError) throw new Error('Failed to upload image. Please try again.');

      // 3. Get public URL
      const publicUrl = getPublicUrl('book-assets', path);

      // 4. Submit to backend API
      setUploadProgress('Saving homework...');
      const proof = await uploadActivityProof(topicId, publicUrl, softwareUsed, studentNotes);

      // 5. Success
      setSuccess(true);
      setUploadProgress('');
      onUploadSuccess?.(proof);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.successBanner}>
          <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '1.5rem', color: BOOK_COLORS.success }} />
          <div>
            <p style={styles.successTitle}>Homework Submitted!</p>
            <p style={styles.successSubtext}>Your teacher will review your work soon.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <FontAwesomeIcon icon={faUpload} style={{ color: BOOK_COLORS.homeActivity }} />
        <span style={styles.headerTitle}>Upload Your Work</span>
      </div>

      {/* File picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {!preview ? (
        <div
          style={styles.dropZone}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={styles.dropZoneInner}>
            <FontAwesomeIcon icon={faCamera} style={styles.dropIcon} />
            <p style={styles.dropText}>Take a Photo or Choose Image</p>
            <p style={styles.dropHint}>Tap here to upload your screenshot</p>
          </div>
        </div>
      ) : (
        <div style={styles.previewContainer}>
          <img src={preview} alt="Preview" style={styles.previewImage} />
          <button style={styles.clearBtn} onClick={clearSelection} disabled={uploading}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      )}

      {/* Software dropdown */}
      <div style={styles.field}>
        <label style={styles.label}>Software Used</label>
        <select
          value={softwareUsed}
          onChange={(e) => setSoftwareUsed(e.target.value)}
          style={styles.select}
          disabled={uploading}
        >
          {SOFTWARE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div style={styles.field}>
        <label style={styles.label}>Notes (optional)</label>
        <textarea
          value={studentNotes}
          onChange={(e) => setStudentNotes(e.target.value)}
          placeholder="Describe what you made..."
          style={styles.textarea}
          rows={2}
          disabled={uploading}
        />
      </div>

      {/* Error */}
      {error && <p style={styles.error}>{error}</p>}

      {/* Upload progress */}
      {uploading && uploadProgress && (
        <div style={styles.progressRow}>
          <FontAwesomeIcon icon={faSpinner} spin style={{ color: BOOK_COLORS.info }} />
          <span style={styles.progressText}>{uploadProgress}</span>
        </div>
      )}

      {/* Submit button */}
      <button
        style={{
          ...styles.submitBtn,
          opacity: uploading || !selectedFile ? 0.6 : 1,
          cursor: uploading || !selectedFile ? 'not-allowed' : 'pointer',
        }}
        onClick={handleUpload}
        disabled={uploading || !selectedFile}
      >
        {uploading ? (
          <>
            <FontAwesomeIcon icon={faSpinner} spin /> Uploading...
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faUpload} /> Submit Homework
          </>
        )}
      </button>
    </div>
  );
};

const styles = {
  container: {
    background: '#F0FDF4',
    border: `2px dashed ${BOOK_COLORS.homeActivity}`,
    borderRadius: BOOK_RADIUS.lg,
    padding: '1.25rem',
    marginTop: '1rem',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
  },

  headerTitle: {
    fontFamily: BOOK_FONTS.heading,
    fontSize: BOOK_FONT_SIZES.md,
    color: BOOK_COLORS.homeActivity,
    fontWeight: 700,
  },

  dropZone: {
    border: `2px dashed ${BOOK_COLORS.border}`,
    borderRadius: BOOK_RADIUS.md,
    padding: '1.5rem',
    textAlign: 'center',
    cursor: 'pointer',
    background: '#FFFFFF',
    transition: 'border-color 0.2s',
    marginBottom: '1rem',
  },

  dropZoneInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },

  dropIcon: {
    fontSize: '2rem',
    color: BOOK_COLORS.muted,
  },

  dropText: {
    fontFamily: BOOK_FONTS.heading,
    fontSize: BOOK_FONT_SIZES.base,
    color: BOOK_COLORS.body,
    margin: 0,
  },

  dropHint: {
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.xs,
    color: BOOK_COLORS.muted,
    margin: 0,
  },

  previewContainer: {
    position: 'relative',
    marginBottom: '1rem',
  },

  previewImage: {
    width: '100%',
    maxHeight: '300px',
    objectFit: 'contain',
    borderRadius: BOOK_RADIUS.md,
    border: `1px solid ${BOOK_COLORS.border}`,
    background: '#FFFFFF',
  },

  clearBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.6)',
    color: '#FFFFFF',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
  },

  field: {
    marginBottom: '0.75rem',
  },

  label: {
    display: 'block',
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.sm,
    color: BOOK_COLORS.bodyLight,
    marginBottom: '0.25rem',
    fontWeight: 600,
  },

  select: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: BOOK_RADIUS.md,
    border: `1px solid ${BOOK_COLORS.border}`,
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.sm,
    color: BOOK_COLORS.body,
    background: '#FFFFFF',
    outline: 'none',
  },

  textarea: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: BOOK_RADIUS.md,
    border: `1px solid ${BOOK_COLORS.border}`,
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.sm,
    color: BOOK_COLORS.body,
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  },

  error: {
    color: BOOK_COLORS.challenge,
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.sm,
    margin: '0 0 0.5rem',
  },

  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },

  progressText: {
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.sm,
    color: BOOK_COLORS.info,
  },

  submitBtn: {
    width: '100%',
    padding: '0.75rem 1.25rem',
    borderRadius: BOOK_RADIUS.md,
    border: 'none',
    background: `linear-gradient(135deg, ${BOOK_COLORS.homeActivity}, #34D399)`,
    color: '#FFFFFF',
    fontFamily: BOOK_FONTS.heading,
    fontSize: BOOK_FONT_SIZES.base,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'opacity 0.2s',
  },

  successBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.25rem',
  },

  successTitle: {
    fontFamily: BOOK_FONTS.heading,
    fontSize: BOOK_FONT_SIZES.base,
    color: BOOK_COLORS.success,
    margin: 0,
    fontWeight: 700,
  },

  successSubtext: {
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.sm,
    color: BOOK_COLORS.muted,
    margin: 0,
  },
};

export default HomeworkUploader;
