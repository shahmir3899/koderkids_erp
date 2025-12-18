// ============================================
// IMAGE MANAGEMENT MODAL - Optimized Version
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

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL, getAuthHeaders } from '../api';
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';

// ============================================
// CONSTANTS
// ============================================

const MAX_SELECTIONS = 4;

// ============================================
// STYLES
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
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'linear-gradient(135deg, #FFFFFF 0%, #F3F4F6 100%)',
    padding: '1.5rem',
    borderRadius: '1rem',
    maxWidth: '900px',
    width: '95%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #E5E7EB',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1F2937',
    margin: 0,
  },
  selectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#EFF6FF',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#1D4ED8',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '1rem',
    borderTop: '1px solid #E5E7EB',
  },
  footerHint: {
    fontSize: '0.875rem',
    color: '#6B7280',
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.75rem',
  },
  confirmButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s ease',
  },
  confirmButtonDisabled: {
    background: '#9CA3AF',
    cursor: 'not-allowed',
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    border: '1px solid #D1D5DB',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  errorMessage: {
    padding: '0.75rem 1rem',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  emptyState: {
    padding: '3rem',
    textAlign: 'center',
    color: '#6B7280',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
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
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const cardStyle = {
    position: 'relative',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    boxShadow: isSelected 
      ? '0 0 0 3px #3B82F6, 0 4px 12px rgba(59, 130, 246, 0.3)' 
      : '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
    cursor: disabled && !isSelected ? 'not-allowed' : 'pointer',
    opacity: disabled && !isSelected ? 0.5 : 1,
    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
  };

  const imageContainerStyle = {
    position: 'relative',
    width: '100%',
    height: '120px',
    backgroundColor: '#F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const imageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: imageLoaded ? 1 : 0,
    transition: 'opacity 0.3s ease',
  };

  const selectionBadgeStyle = {
    position: 'absolute',
    top: '8px',
    left: '8px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: isSelected ? '#3B82F6' : 'rgba(255, 255, 255, 0.9)',
    border: isSelected ? 'none' : '2px solid #D1D5DB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    color: isSelected ? '#FFFFFF' : '#9CA3AF',
    zIndex: 10,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
  };

  const deleteButtonStyle = {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    cursor: 'pointer',
    zIndex: 10,
    opacity: 0.9,
    transition: 'all 0.2s ease',
  };

  const dateStyle = {
    padding: '0.5rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    backgroundColor: isSelected ? '#EFF6FF' : '#F9FAFB',
    borderTop: '1px solid #E5E7EB',
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
          onDelete(image.name);
        }}
        style={deleteButtonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#DC2626';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#EF4444';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        aria-label={`Delete image from ${extractDate(image.name)}`}
      >
        ✕
      </button>

      {/* Image Container */}
      <div style={imageContainerStyle}>
        {!imageLoaded && !imageError && (
          <div style={{ position: 'absolute' }}>
            <LoadingSpinner size="small" />
          </div>
        )}
        
        {imageError ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>🖼️</div>
            <div style={{ fontSize: '0.625rem' }}>Image unavailable</div>
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

        // IMPORTANT: Sync initial selections with fresh URLs
        // The initialSelectedImages may have old signed URLs, so we match by filename
        if (initialSelectedImages.length > 0 && validImages.length > 0) {
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
  }, [studentId, selectedMonth, startDate, endDate, mode, initialSelectedImages]);

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
        `${API_URL}/api/reports/student-progress-images/${studentId}/${filename}/`,
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

  return (
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
            📸 Select Images
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
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <LoadingSpinner size="large" message="Loading images..." />
          </div>
        ) : images.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📷</div>
            <p style={{ margin: 0, fontWeight: '500' }}>No images available</p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
              There are no progress images for this student in the selected period.
            </p>
          </div>
        ) : (
          <>
            {/* Selection hint when max reached */}
            {isMaxReached && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
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
                💡 Click images to select (max {MAX_SELECTIONS}). 
                Selected images will appear in the report.
              </>
            )}
          </div>
          
          <div style={styles.buttonGroup}>
            <button
              onClick={handleCancel}
              style={styles.cancelButton}
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
              onClick={handleConfirm}
              disabled={selectedImages.length === 0}
              style={{
                ...styles.confirmButton,
                ...(selectedImages.length === 0 ? styles.confirmButtonDisabled : {}),
              }}
              onMouseEnter={(e) => {
                if (selectedImages.length > 0) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              ✓ Confirm Selection ({selectedImages.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageManagementModal;