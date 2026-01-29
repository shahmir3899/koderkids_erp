// ============================================
// IMAGE MANAGEMENT MODAL - Glassmorphism Design
// ============================================
// Location: src/pages/ImageManagementModal.js
//
// OPTIMIZATIONS:
// - Extracted ImageCard component for better performance
// - Uses LoadingSpinner component
// - Consolidated styles
// - Improved accessibility
// - Better selection UX with visual feedback
// - useCallback for handlers to prevent re-renders
// - Native lazy loading for images
// - Cleaner code structure
// - Glassmorphic dark theme

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL, getAuthHeaders } from '../api';
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../utils/designConstants';

// ============================================
// CONSTANTS
// ============================================

const MAX_SELECTIONS = 4;

// ============================================
// STYLES - Glassmorphism Design
// ============================================

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,  // Above sidebar (which is 100-120)
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    padding: SPACING.lg,
  },
  modal: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING['2xl'],
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    margin: 0,
  },
  selectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    border: '1px solid rgba(99, 102, 241, 0.5)',
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.lg,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  footerHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
  },
  buttonGroup: {
    display: 'flex',
    gap: SPACING.md,
  },
  confirmButton: {
    padding: `${SPACING.sm} ${SPACING.xl}`,
    background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    transition: TRANSITIONS.normal,
    boxShadow: '0 4px 15px rgba(176, 97, 206, 0.4)',
  },
  confirmButtonDisabled: {
    background: 'rgba(156, 163, 175, 0.5)',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  cancelButton: {
    padding: `${SPACING.sm} ${SPACING.xl}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: TRANSITIONS.normal,
  },
  errorMessage: {
    padding: SPACING.md,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#F87171',
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    fontSize: FONT_SIZES.sm,
  },
  warningMessage: {
    padding: SPACING.md,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    color: '#FBBF24',
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    fontSize: FONT_SIZES.sm,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyState: {
    padding: SPACING['3xl'],
    textAlign: 'center',
    color: COLORS.text.whiteMedium,
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: SPACING.md,
  },
  loadingContainer: {
    padding: SPACING['3xl'],
    textAlign: 'center',
  },
};

// ============================================
// IMAGE CARD COMPONENT
// ============================================

const ImageCard = React.memo(({
  image,
  index,
  isSelected,
  selectionOrder,
  onSelect,
  onDelete,
  disabled,
  isDeleting,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const cardStyle = {
    position: 'relative',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: isSelected
      ? '2px solid rgba(139, 92, 246, 0.8)'
      : '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: isSelected
      ? '0 0 20px rgba(139, 92, 246, 0.4)'
      : '0 4px 12px rgba(0, 0, 0, 0.2)',
    transition: `all ${TRANSITIONS.normal}`,
    cursor: disabled && !isSelected ? 'not-allowed' : 'pointer',
    opacity: disabled && !isSelected ? 0.5 : 1,
    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
  };

  const imageContainerStyle = {
    position: 'relative',
    width: '100%',
    height: '120px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const imageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: imageLoaded ? 1 : 0,
    transition: `opacity ${TRANSITIONS.normal}`,
  };

  const selectionBadgeStyle = {
    position: 'absolute',
    top: '8px',
    left: '8px',
    width: '28px',
    height: '28px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: isSelected ? COLORS.primary : 'rgba(255, 255, 255, 0.2)',
    border: isSelected ? 'none' : '2px solid rgba(255, 255, 255, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    zIndex: 10,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    transition: `all ${TRANSITIONS.normal}`,
  };

  const deleteButtonStyle = {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '28px',
    height: '28px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.status.error,
    color: COLORS.text.white,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES.sm,
    cursor: 'pointer',
    zIndex: 10,
    opacity: 0.9,
    transition: `all ${TRANSITIONS.normal}`,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  };

  const dateStyle = {
    padding: SPACING.sm,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: isSelected ? COLORS.text.white : COLORS.text.whiteMedium,
    textAlign: 'center',
    backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  };

  const handleClick = (e) => {
    if (e.target.closest('button')) return;
    if (!disabled || isSelected) {
      onSelect(image);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled || isSelected) {
        onSelect(image);
      }
    }
  };

  const extractDate = (filename) => {
    const name = filename.split('?')[0];
    const dateMatch = name.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const date = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    return 'Unknown Date';
  };

  return (
    <div
      style={cardStyle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`Image from ${extractDate(image.name)}${isSelected ? ', selected' : ''}`}
      tabIndex={0}
    >
      {/* Selection Badge */}
      <div style={selectionBadgeStyle}>
        {isSelected ? selectionOrder : ''}
      </div>

      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!isDeleting) onDelete(image.name);
        }}
        style={{
          ...deleteButtonStyle,
          opacity: isDeleting ? 0.6 : 0.9,
          cursor: isDeleting ? 'not-allowed' : 'pointer',
        }}
        disabled={isDeleting}
        onMouseEnter={(e) => {
          if (!isDeleting) {
            e.currentTarget.style.backgroundColor = COLORS.status.errorDark;
            e.currentTarget.style.transform = 'scale(1.1)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = COLORS.status.error;
          e.currentTarget.style.transform = 'scale(1)';
        }}
        aria-label={isDeleting ? 'Deleting...' : `Delete image from ${extractDate(image.name)}`}
      >
        {isDeleting ? '...' : '✕'}
      </button>

      {/* Image Container */}
      <div style={imageContainerStyle}>
        {!imageLoaded && !imageError && (
          <div style={{ position: 'absolute' }}>
            <LoadingSpinner size="small" />
          </div>
        )}

        {imageError ? (
          <div style={{ textAlign: 'center', color: COLORS.text.whiteSubtle, padding: SPACING.md }}>
            <div style={{ fontSize: '2rem', marginBottom: SPACING.xs }}>🖼️</div>
            <div style={{ fontSize: FONT_SIZES.xs }}>Image unavailable</div>
          </div>
        ) : (
          <img
            src={image.url}
            alt={`Progress - ${extractDate(image.name)}`}
            style={imageStyle}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* Date Label */}
      <div style={dateStyle}>
        {extractDate(image.name)}
      </div>
    </div>
  );
});

ImageCard.displayName = 'ImageCard';

// ============================================
// HELPER FUNCTIONS
// ============================================

const getMonthsBetweenDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = new Set();
  let current = new Date(start);

  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    months.add(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
    current.setDate(1);
  }

  return Array.from(months);
};

/**
 * Extract filename from URL for comparison
 * URLs may have different query params (signed URL tokens), so we compare by filename
 */
const extractFilename = (url) => {
  if (!url) return '';
  return url.split('/').pop().split('?')[0];
};

// ============================================
// MAIN COMPONENT
// ============================================

const ImageManagementModal = ({
  studentId,
  selectedMonth,
  startDate,
  endDate,
  mode,
  onClose,
  initialSelectedImages = [], // NEW: Accept pre-selected images
}) => {
  // State
  const [images, setImages] = useState([]);
  const [selectedImages, setSelectedImages] = useState(initialSelectedImages);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(null);

  // Ref to track if initial sync has been done (prevents infinite loop)
  const hasInitializedRef = useRef(false);

  // Fetch images on mount
  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      setError('');

      try {
        let imageData = [];

        if (mode === 'month') {
          const response = await axios.get(`${API_URL}/api/reports/student-progress-images/`, {
            headers: getAuthHeaders(),
            params: { student_id: studentId, month: selectedMonth },
          });
          imageData = response.data.progress_images || [];
        } else if (mode === 'range') {
          const months = getMonthsBetweenDates(startDate, endDate);

          // Fetch all months in parallel for better performance
          const responses = await Promise.all(
            months.map((month) =>
              axios.get(`${API_URL}/api/reports/student-progress-images/`, {
                headers: getAuthHeaders(),
                params: { student_id: studentId, month },
              })
            )
          );

          // Combine and deduplicate
          const allImages = responses.flatMap((r) => r.data.progress_images || []);
          const uniqueUrls = new Set();
          imageData = allImages.filter((img) => {
            if (uniqueUrls.has(img.signedURL)) return false;
            uniqueUrls.add(img.signedURL);
            return true;
          });
        }

        // Process images
        const validImages = imageData
          .map((img) => ({
            name: img.signedURL.split('/').pop().split('?')[0] || 'Unknown',
            url: img.signedURL || '',
          }))
          .filter((img) => img.url);

        setImages(validImages);

        // IMPORTANT: Sync initial selections with fresh URLs (only once on mount)
        // The initialSelectedImages may have old signed URLs, so we match by filename
        // Using hasInitializedRef to prevent infinite loop from re-syncing
        if (!hasInitializedRef.current && initialSelectedImages.length > 0 && validImages.length > 0) {
          hasInitializedRef.current = true;
          const initialFilenames = initialSelectedImages.map(extractFilename);
          const matchedUrls = [];

          // Preserve the original selection order
          initialFilenames.forEach((filename) => {
            const matchedImage = validImages.find(
              (img) => extractFilename(img.url) === filename
            );
            if (matchedImage) {
              matchedUrls.push(matchedImage.url);
            }
          });

          if (matchedUrls.length > 0) {
            setSelectedImages(matchedUrls);
          }
        }

        if (validImages.length === 0) {
          setError('No images available for this student in the selected period.');
        }
      } catch (err) {
        console.error('Error fetching images:', err);
        setError('Failed to load images. Please try again.');
        toast.error('Failed to load images');
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, selectedMonth, startDate, endDate, mode]); // Removed initialSelectedImages to prevent infinite loop

  // Handlers
  const handleImageSelect = useCallback((image) => {
    setSelectedImages((prev) => {
      // Check if already selected (by URL or filename)
      const isAlreadySelected = prev.includes(image.url) ||
        prev.some((url) => extractFilename(url) === extractFilename(image.url));

      if (isAlreadySelected) {
        // Remove by matching URL or filename
        return prev.filter((url) =>
          url !== image.url && extractFilename(url) !== extractFilename(image.url)
        );
      }

      if (prev.length >= MAX_SELECTIONS) {
        toast.warning(`You can only select up to ${MAX_SELECTIONS} images.`);
        return prev;
      }

      return [...prev, image.url];
    });
  }, []);

  const handleDeleteImage = useCallback(async (filename) => {
    if (!window.confirm('Are you sure you want to delete this image? This cannot be undone.')) {
      return;
    }

    setIsDeleting(filename);

    try {
      await axios.delete(
        `${API_URL}/api/student-progress-images/${studentId}/${filename}/`,
        { headers: getAuthHeaders() }
      );

      // Remove from images list
      setImages((prev) => prev.filter((img) => img.name !== filename));

      // Remove from selection if selected
      setSelectedImages((prev) => {
        const imageToRemove = images.find((img) => img.name === filename);
        return imageToRemove ? prev.filter((url) => url !== imageToRemove.url) : prev;
      });

      toast.success('Image deleted successfully');
    } catch (err) {
      console.error('Error deleting image:', err);
      const errorMsg =
        err.response?.status === 404
          ? 'Image not found.'
          : err.response?.status === 403
          ? 'You do not have permission to delete this image.'
          : 'Failed to delete image.';
      toast.error(errorMsg);
    } finally {
      setIsDeleting(null);
    }
  }, [studentId, images]);

  const handleConfirm = useCallback(() => {
    onClose(selectedImages);
  }, [onClose, selectedImages]);

  const handleCancel = useCallback(() => {
    onClose(null);
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [handleCancel]);

  // Memoized selection order map - uses filename for matching
  const selectionOrderMap = useMemo(() => {
    const map = {};
    selectedImages.forEach((url, index) => {
      map[url] = index + 1;
      // Also map by filename for fallback matching
      const filename = extractFilename(url);
      if (filename) {
        map[`filename:${filename}`] = index + 1;
      }
    });
    return map;
  }, [selectedImages]);

  // Helper to check if an image is selected (matches by URL or filename)
  const isImageSelected = useCallback((imageUrl) => {
    if (selectedImages.includes(imageUrl)) return true;
    // Fallback: check by filename
    const filename = extractFilename(imageUrl);
    return selectedImages.some((url) => extractFilename(url) === filename);
  }, [selectedImages]);

  // Helper to get selection order
  const getSelectionOrder = useCallback((imageUrl) => {
    if (selectionOrderMap[imageUrl]) return selectionOrderMap[imageUrl];
    // Fallback: check by filename
    const filename = extractFilename(imageUrl);
    return selectionOrderMap[`filename:${filename}`] || null;
  }, [selectionOrderMap]);

  // Check if max selections reached
  const isMaxReached = selectedImages.length >= MAX_SELECTIONS;

  // ============================================
  // RENDER
  // ============================================

  // Use React Portal to render modal at document body level
  // This ensures it appears above all other elements including sidebar
  return ReactDOM.createPortal(
    <div
      style={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={handleCancel}
    >
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 id="modal-title" style={styles.title}>
            Select Images
          </h2>
          <div style={styles.selectionBadge}>
            <span>{selectedImages.length}</span>
            <span>/</span>
            <span>{MAX_SELECTIONS}</span>
            <span>selected</span>
          </div>
        </div>

        {/* Error Message */}
        {error && !isLoading && images.length === 0 && (
          <div style={styles.errorMessage}>{error}</div>
        )}

        {/* Content */}
        {isLoading ? (
          <div style={styles.loadingContainer}>
            <LoadingSpinner size="large" message="Loading images..." />
          </div>
        ) : images.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📷</div>
            <p style={{ margin: 0, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text.white }}>
              No images available
            </p>
            <p style={{ margin: `${SPACING.sm} 0 0`, fontSize: FONT_SIZES.sm }}>
              There are no progress images for this student in the selected period.
            </p>
          </div>
        ) : (
          <>
            {/* Selection hint when max reached */}
            {isMaxReached && (
              <div style={styles.warningMessage}>
                <span>⚠️</span>
                <span>Maximum {MAX_SELECTIONS} images selected. Deselect an image to choose a different one.</span>
              </div>
            )}

            {/* Image Grid */}
            <div style={styles.grid}>
              {images.map((image, index) => {
                const selected = isImageSelected(image.url);
                const order = getSelectionOrder(image.url);

                return (
                  <ImageCard
                    key={image.url}
                    image={image}
                    index={index}
                    isSelected={selected}
                    selectionOrder={order}
                    onSelect={handleImageSelect}
                    onDelete={handleDeleteImage}
                    disabled={isMaxReached && !selected}
                    isDeleting={isDeleting === image.name}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerHint}>
            {images.length > 0 && (
              <>
                Click images to select (max {MAX_SELECTIONS}).
                Selected images will appear in the report.
              </>
            )}
          </div>

          <div style={styles.buttonGroup}>
            <button
              onClick={handleCancel}
              style={styles.cancelButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleConfirm}
              disabled={selectedImages.length === 0}
              style={{
                ...styles.confirmButton,
                ...(selectedImages.length === 0 ? styles.confirmButtonDisabled : {}),
              }}
              onMouseEnter={(e) => {
                if (selectedImages.length > 0) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(176, 97, 206, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(176, 97, 206, 0.4)';
              }}
            >
              Confirm Selection ({selectedImages.length})
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImageManagementModal;
