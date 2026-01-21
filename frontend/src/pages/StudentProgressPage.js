// StudentProgressPage.js
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import { useAuth } from "../auth";
import Compressor from "compressorjs";
import { getAuthHeaders } from "../api";
import { EmailPromptModal } from "../components/common/modals/EmailPromptModal";

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  MIXINS,
  TRANSITIONS,
} from '../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../hooks/useResponsive';

// Date formatting utilities
const formatDatePretty = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) {
    return 'Today';
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  // Format: "Mon, Jan 21"
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

const getMonthName = (dateStr) => {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  const date = new Date(year, parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const API_URL = process.env.REACT_APP_API_URL;

// Reusable HoverButton component
const HoverButton = ({ children, onClick, disabled, variant = 'primary', type = 'button', isMobile = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  const variants = {
    primary: {
      base: COLORS.accent.blue,
      hover: '#3B82F6',
      text: '#FFFFFF',
    },
    success: {
      base: COLORS.status.success,
      hover: '#059669',
      text: '#FFFFFF',
    },
    danger: {
      base: COLORS.status.error,
      hover: '#DC2626',
      text: '#FFFFFF',
    },
    disabled: {
      base: 'rgba(255, 255, 255, 0.2)',
      hover: 'rgba(255, 255, 255, 0.2)',
      text: 'rgba(255, 255, 255, 0.5)',
    },
  };

  const currentVariant = disabled ? variants.disabled : variants[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: isMobile ? `${SPACING.md} ${SPACING.lg}` : `${SPACING.sm} ${SPACING.xl}`,
        backgroundColor: isHovered && !disabled ? currentVariant.hover : currentVariant.base,
        color: currentVariant.text,
        border: 'none',
        borderRadius: BORDER_RADIUS.lg,
        fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.base,
        fontWeight: FONT_WEIGHTS.medium,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: `all ${TRANSITIONS.normal}`,
        transform: isHovered && !disabled ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: isHovered && !disabled ? '0 8px 20px rgba(0, 0, 0, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
        minHeight: '44px', // Touch-friendly
        minWidth: isMobile ? '100px' : 'auto',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </button>
  );
};

// Styled label button for file input
const FileLabelButton = ({ htmlFor, children, isMobile = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <label
      htmlFor={htmlFor}
      style={{
        padding: isMobile ? `${SPACING.md} ${SPACING.lg}` : `${SPACING.sm} ${SPACING.xl}`,
        backgroundColor: isHovered ? '#3B82F6' : COLORS.accent.blue,
        color: '#FFFFFF',
        border: 'none',
        borderRadius: BORDER_RADIUS.lg,
        fontSize: FONT_SIZES.base,
        fontWeight: FONT_WEIGHTS.medium,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal}`,
        transform: isHovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: isHovered ? '0 8px 20px rgba(0, 0, 0, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '44px', // Touch-friendly
        minWidth: isMobile ? '100px' : 'auto',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </label>
  );
};

// Custom Confirmation Modal
const ConfirmDeleteModal = ({ isOpen, onConfirm, onCancel, dateLabel, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3000,
        padding: SPACING.lg,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          ...MIXINS.glassmorphicCard,
          borderRadius: BORDER_RADIUS.xl,
          padding: SPACING.xl,
          maxWidth: '320px',
          width: '100%',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          marginBottom: SPACING.lg,
        }}>
          <span style={{ fontSize: '28px' }}>🗑️</span>
        </div>

        <h3 style={{
          color: COLORS.text.white,
          fontSize: FONT_SIZES.lg,
          fontWeight: FONT_WEIGHTS.semibold,
          marginBottom: SPACING.sm,
        }}>
          Delete Image?
        </h3>

        <p style={{
          color: COLORS.text.whiteMedium,
          fontSize: FONT_SIZES.sm,
          marginBottom: SPACING.xl,
          lineHeight: 1.5,
        }}>
          Are you sure you want to delete the progress image from <strong style={{ color: COLORS.accent.purple }}>{dateLabel}</strong>? This action cannot be undone.
        </p>

        <div style={{
          display: 'flex',
          gap: SPACING.md,
          justifyContent: 'center',
        }}>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            style={{
              padding: `${SPACING.sm} ${SPACING.xl}`,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: `1px solid ${COLORS.border.whiteTransparent}`,
              borderRadius: BORDER_RADIUS.lg,
              color: COLORS.text.white,
              fontSize: FONT_SIZES.sm,
              fontWeight: FONT_WEIGHTS.medium,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              transition: `all ${TRANSITIONS.fast}`,
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              padding: `${SPACING.sm} ${SPACING.xl}`,
              backgroundColor: isDeleting ? 'rgba(239, 68, 68, 0.5)' : COLORS.status.error,
              border: 'none',
              borderRadius: BORDER_RADIUS.lg,
              color: COLORS.text.white,
              fontSize: FONT_SIZES.sm,
              fontWeight: FONT_WEIGHTS.medium,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              transition: `all ${TRANSITIONS.fast}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SPACING.sm,
              minWidth: '100px',
            }}
          >
            {isDeleting ? (
              <>
                <ClipLoader size={14} color={COLORS.text.white} />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Image Grid Item with hover effects and delete button
const ImageGridItem = ({ img, index, onPreview, onDelete, isDeleting, onShowDeleteConfirm }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onShowDeleteConfirm(img);
  };

  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '1',
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal}`,
        border: `2px solid ${isHovered ? COLORS.accent.purple : COLORS.border.whiteTransparent}`,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        transform: isHovered ? 'scale(1.03)' : 'scale(1)',
        boxShadow: isHovered ? '0 12px 40px rgba(176, 97, 206, 0.3)' : 'none',
      }}
      onClick={() => onPreview(img)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onPreview(img)}
    >
      <img
        src={img.url}
        alt={`Progress from ${img.date}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transition: `transform ${TRANSITIONS.normal}`,
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          filter: isDeleting ? 'grayscale(50%) opacity(0.5)' : 'none',
        }}
        loading="lazy"
      />

      {/* Date badge */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))',
        padding: `${SPACING.lg} ${SPACING.sm} ${SPACING.sm}`,
        display: 'flex',
        justifyContent: 'center',
        transition: `opacity ${TRANSITIONS.fast}`,
      }}>
        <span style={{
          backgroundColor: 'rgba(176, 97, 206, 0.9)',
          color: COLORS.text.white,
          padding: `${SPACING.xs} ${SPACING.sm}`,
          borderRadius: BORDER_RADIUS.md,
          fontSize: FONT_SIZES.xs,
          fontWeight: FONT_WEIGHTS.medium,
          backdropFilter: 'blur(4px)',
        }}>
          {formatDatePretty(img.date)}
        </span>
      </div>

      {/* Delete button - visible on hover */}
      <button
        onClick={handleDeleteClick}
        disabled={isDeleting}
        style={{
          position: 'absolute',
          top: SPACING.xs,
          right: SPACING.xs,
          width: 32,
          height: 32,
          backgroundColor: isHovered ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.5)',
          border: 'none',
          borderRadius: '50%',
          color: COLORS.text.white,
          fontSize: '18px',
          cursor: isDeleting ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: `all ${TRANSITIONS.fast}`,
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'scale(1)' : 'scale(0.8)',
          pointerEvents: isHovered ? 'auto' : 'none',
        }}
        aria-label={`Delete image from ${img.date}`}
      >
        {isDeleting ? '...' : '×'}
      </button>

      {/* Deleting overlay */}
      {isDeleting && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ClipLoader size={24} color={COLORS.text.white} />
        </div>
      )}
    </div>
  );
};

// Today's Lesson Card Component
const TodayLessonCard = ({ todayLesson, loading }) => {
  if (loading) {
    return (
      <div style={cardStyles.container}>
        <h3 style={cardStyles.title}>
          <span style={cardStyles.icon}>📖</span>
          Today's Lesson
        </h3>
        <div style={cardStyles.loadingContainer}>
          <ClipLoader size={24} color={COLORS.accent.cyan} />
        </div>
      </div>
    );
  }

  if (!todayLesson) {
    return (
      <div style={cardStyles.container}>
        <h3 style={cardStyles.title}>
          <span style={cardStyles.icon}>📖</span>
          Today's Lesson
        </h3>
        <p style={cardStyles.emptyText}>No lesson planned for today</p>
      </div>
    );
  }

  return (
    <div style={cardStyles.container}>
      <h3 style={cardStyles.title}>
        <span style={cardStyles.icon}>📖</span>
        Today's Lesson
      </h3>

      <div style={cardStyles.content}>
        <div style={cardStyles.field}>
          <span style={cardStyles.label}>Planned Topic</span>
          <p style={cardStyles.value}>
            {todayLesson.planned_topic || 'Not specified'}
          </p>
        </div>

        {todayLesson.achieved_topic && (
          <div style={cardStyles.field}>
            <span style={cardStyles.label}>Achieved Topic</span>
            <p style={{...cardStyles.value, color: COLORS.status.success}}>
              {todayLesson.achieved_topic}
            </p>
          </div>
        )}

        {todayLesson.teacher_name && (
          <div style={cardStyles.teacherBadge}>
            <span style={{color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs}}>Teacher:</span>
            <span style={{color: COLORS.accent.cyan, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium}}>
              {todayLesson.teacher_name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Recent Progress Table Component
const RecentProgressTable = ({ recentProgress, loading, onImageClick }) => {
  if (loading) {
    return (
      <div style={cardStyles.container}>
        <h3 style={cardStyles.title}>
          <span style={cardStyles.icon}>📅</span>
          Recent Progress
        </h3>
        <div style={cardStyles.loadingContainer}>
          <ClipLoader size={24} color={COLORS.accent.cyan} />
        </div>
      </div>
    );
  }

  if (!recentProgress || recentProgress.length === 0) {
    return (
      <div style={cardStyles.container}>
        <h3 style={cardStyles.title}>
          <span style={cardStyles.icon}>📅</span>
          Recent Progress
        </h3>
        <p style={cardStyles.emptyText}>No progress data available</p>
      </div>
    );
  }

  return (
    <div style={{...cardStyles.container, padding: 0, overflow: 'hidden'}}>
      <h3 style={{...cardStyles.title, padding: SPACING.md, marginBottom: 0, borderBottom: `1px solid ${COLORS.border.whiteTransparent}`}}>
        <span style={cardStyles.icon}>📅</span>
        Recent Lessons
      </h3>

      <div style={{overflowX: 'auto'}}>
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={tableStyles.th}>Date</th>
              <th style={tableStyles.th}>Attendance</th>
              <th style={tableStyles.th}>Topic</th>
              <th style={tableStyles.th}>Image</th>
            </tr>
          </thead>
          <tbody>
            {recentProgress.map((item, index) => (
              <tr key={item.date} style={{
                backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
              }}>
                <td style={tableStyles.td}>
                  <span style={{fontWeight: FONT_WEIGHTS.medium, color: COLORS.text.white}}>
                    {formatDatePretty(item.date)}
                  </span>
                </td>
                <td style={tableStyles.td}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: `2px 8px`,
                    borderRadius: BORDER_RADIUS.md,
                    fontSize: FONT_SIZES.xs,
                    fontWeight: FONT_WEIGHTS.medium,
                    backgroundColor: item.attendance_status === 'Present'
                      ? 'rgba(16, 185, 129, 0.2)'
                      : item.attendance_status === 'Absent'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(255, 255, 255, 0.1)',
                    color: item.attendance_status === 'Present'
                      ? COLORS.status.success
                      : item.attendance_status === 'Absent'
                        ? COLORS.status.error
                        : COLORS.text.whiteSubtle,
                  }}>
                    {item.attendance_status === 'Present' ? '✓' : item.attendance_status === 'Absent' ? '✗' : '−'}
                    {item.attendance_status}
                  </span>
                </td>
                <td style={{...tableStyles.td, maxWidth: '200px'}}>
                  <span style={{
                    color: item.achieved_topic ? COLORS.text.whiteMedium : COLORS.text.whiteSubtle,
                    fontSize: FONT_SIZES.sm,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {item.achieved_topic || item.planned_topic || '—'}
                  </span>
                </td>
                <td style={tableStyles.td}>
                  {item.has_image ? (
                    <button
                      onClick={() => onImageClick({url: item.image_url, date: item.date})}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'rgba(176, 97, 206, 0.2)',
                        border: `1px solid ${COLORS.accent.purple}`,
                        borderRadius: BORDER_RADIUS.md,
                        color: COLORS.accent.purple,
                        fontSize: FONT_SIZES.xs,
                        cursor: 'pointer',
                        transition: `all ${TRANSITIONS.fast}`,
                      }}
                    >
                      📷 View
                    </button>
                  ) : (
                    <span style={{color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs}}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Card Styles
const cardStyles = {
  container: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    height: '100%',
  },
  title: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    marginBottom: SPACING.md,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  icon: {
    fontSize: '18px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  value: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
    lineHeight: 1.5,
    margin: 0,
    whiteSpace: 'pre-line',
  },
  teacherBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '80px',
  },
  emptyText: {
    color: COLORS.text.whiteSubtle,
    fontStyle: 'italic',
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    padding: SPACING.lg,
  },
};

// Table Styles
const tableStyles = {
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: FONT_SIZES.sm,
  },
  th: {
    textAlign: 'left',
    padding: `${SPACING.sm} ${SPACING.md}`,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: FONT_WEIGHTS.medium,
  },
  td: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    borderBottom: `1px solid rgba(255,255,255,0.05)`,
    verticalAlign: 'middle',
  },
};

const StudentProgressPage = () => {
  // Responsive hook
  const { isMobile, isTablet } = useResponsive();

  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [monthlyImages, setMonthlyImages] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [sessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [currentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState(null);
  const [deletingImageId, setDeletingImageId] = useState(null);
  const [imageToDelete, setImageToDelete] = useState(null); // For confirmation modal

  // New state for progress data
  const [todayLesson, setTodayLesson] = useState(null);
  const [recentProgress, setRecentProgress] = useState([]);

  // Get current month name for display
  const monthDisplayName = useMemo(() => getMonthName(currentMonth), [currentMonth]);

useEffect(() => {
  if (authLoading) return;

  const init = async () => {
    try {
      // 1. Get profile
      const profileRes = await axios.get(`${API_URL}/api/students/my-data/`, {
        headers: getAuthHeaders(),
      });
      const data = profileRes.data;

      const student = {
        id: data.id,
        name: data.name,
        school: data.school,
        class: data.class,
      };
      setStudentData(student);

      // 2. Get all images for current month
      const imgRes = await axios.get(`${API_URL}/api/student-images/`, {
        headers: getAuthHeaders(),
        params: {
          student_id: student.id,
          month: currentMonth,
        },
      });

      // Use new monthly_images format with date metadata
      const monthlyImgs = imgRes.data?.monthly_images || [];
      setMonthlyImages(monthlyImgs);

      // Find today's image if it exists
      const todayImg = monthlyImgs.find(img => img.date === sessionDate);
      if (todayImg) {
        setCurrentImage(todayImg.url);
      }

      setLoading(false);

      // 3. Fetch progress data (lesson plans, recent progress)
      try {
        const progressRes = await axios.get(`${API_URL}/api/students/my-progress/`, {
          headers: getAuthHeaders(),
          params: { days: 7 },
        });

        setTodayLesson(progressRes.data.today_lesson);
        setRecentProgress(progressRes.data.recent_progress || []);
      } catch (progressErr) {
        console.warn("Could not fetch progress data:", progressErr);
        // Don't fail the whole page if progress fetch fails
      } finally {
        setProgressLoading(false);
      }

    } catch (err) {
      console.error("Fetch failed:", err.response || err);
      toast.error("Failed to load profile or images");
      setLoading(false);
      setProgressLoading(false);
    }
  };

  init();
}, [authLoading, sessionDate, currentMonth]);

  // -----------------------------------------------------------------
  // RENDER: Loading
  // -----------------------------------------------------------------
  if (authLoading || loading) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.loadingContainer}>
          <ClipLoader size={50} color={COLORS.accent.cyan} />
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // RENDER: Error
  // -----------------------------------------------------------------
  if (fetchError) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>{fetchError}</p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // RENDER: CRITICAL — Wait for studentData before accessing .name
  // -----------------------------------------------------------------
  if (!studentData) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.loadingContainer}>
          <p style={styles.loadingText}>Loading student profile...</p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // SAFE: studentData exists → render UI
  // -----------------------------------------------------------------
  const handleFileSelect = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const processingToast = toast.info("Processing image...", { autoClose: false });

  new Compressor(file, {
    quality: 0.7,
    maxWidth: 800,
    maxHeight: 800,
    success: (compressed) => {
      // FORCE .jpg
      const baseName = file.name.split('.').slice(0, -1).join('.') || 'image';
      const jpgFile = new File([compressed], `${baseName}.jpg`, {
        type: 'image/jpeg',
      });

      setSelectedFile(jpgFile);
      toast.dismiss(processingToast);
      toast.success("Image ready!");
    },
    error: () => {
      toast.dismiss(processingToast);
      toast.error("Failed to process image");
    },
  });
};

  const handleUpload = async () => {
  if (!selectedFile || !studentData?.id) {
    toast.error("Please select an image");
    return;
  }

  setIsUploading(true);
  const formData = new FormData();

  formData.append("student_id", studentData.id);
  formData.append("image", selectedFile);        // ← MUST BE "image"
  formData.append("session_date", sessionDate);  // ← MUST BE "session_date"

  try {
    console.log("Uploading with payload:", {
      student_id: studentData.id,
      session_date: sessionDate,
      file: selectedFile.name
    });

    const res = await axios.post(
      `${API_URL}/api/upload-student-image/`,
      formData,
      { headers: getAuthHeaders() }
    );

    console.log("Upload success:", res.data);

    // Backend returns: image_url, email_sent, has_email
    const newImageUrl = res.data.image_url;
    setCurrentImage(newImageUrl);
    setSelectedFile(null);

    // Add new image to monthly images list at the beginning
    const newImage = {
      url: newImageUrl,
      date: sessionDate,
      filename: `${sessionDate}_new.jpg`
    };
    setMonthlyImages(prev => {
      // Remove any existing image for today, then add new one at start
      const filtered = prev.filter(img => img.date !== sessionDate);
      return [newImage, ...filtered];
    });

    // Handle email notification based on response
    if (res.data.email_sent) {
      toast.success("Uploaded! Progress email sent to your inbox.");
    } else if (res.data.has_email === false) {
      // No email configured - show prompt modal
      toast.success("Uploaded successfully!");
      setShowEmailPrompt(true);
    } else {
      toast.success("Uploaded successfully!");
    }
  } catch (err) {
    console.error("Upload error:", err.response?.data || err);
    toast.error(err.response?.data?.error || "Upload failed");
  } finally {
    setIsUploading(false);
  }
};

 const handleDelete = async () => {
  if (!currentImage || !studentData?.id) {
    toast.error("No image to delete.");
    return;
  }

  let filename = null;

  try {
    // Parse URL safely
    const url = new URL(currentImage);
    const pathParts = url.pathname.split("/");
    filename = pathParts[pathParts.length - 1]; // Safely get last part

    // Remove query parameters (e.g., ?token=abc)
    const queryIndex = filename.indexOf("?");
    if (queryIndex !== -1) {
      filename = filename.substring(0, queryIndex);
    }

    // If still empty or invalid, fallback
    if (!filename || filename.trim() === "") {
      throw new Error("Invalid filename from URL");
    }
  } catch (err) {
    // Fallback: assume currentImage is already a filename (e.g., from upload response)
    filename = typeof currentImage === "string" ? currentImage : null;
    if (!filename) {
      toast.error("Invalid image URL or filename.");
      return;
    }

    // Clean query params just in case
    const queryIndex = filename.indexOf("?");
    if (queryIndex !== -1) {
      filename = filename.substring(0, queryIndex);
    }
  }

  // --- Now safely force .jpg ---
  if (typeof filename !== "string") {
    toast.error("Invalid filename format.");
    return;
  }

  const lowerFilename = filename.toLowerCase();
  if (!lowerFilename.endsWith('.jpg')) {
    // Strip extension and force .jpg
    const dotIndex = filename.lastIndexOf('.');
    filename = (dotIndex !== -1 ? filename.substring(0, dotIndex) : filename) + '.jpg';
  }

  // --- Final validation ---
  if (!/^\d{4}-\d{2}-\d{2}_[a-zA-Z0-9]+\.jpg$/.test(filename)) {
    toast.error("Filename format not supported for deletion.");
    return;
  }

  try {
    const deleteUrl = `${API_URL}/api/student-progress-images/${studentData.id}/${filename}/`;
    console.log("Deleting:", deleteUrl);

    await axios.delete(deleteUrl, { headers: getAuthHeaders() });

    setCurrentImage(null);
    // Also remove from monthly images
    setMonthlyImages(prev => prev.filter(img => img.date !== sessionDate));
    toast.success("Image deleted!");
  } catch (err) {
    console.error("Delete failed:", err.response || err);
    toast.error(err.response?.data?.error || "Failed to delete image");
  }
};

  // Show delete confirmation modal
  const showDeleteConfirm = (img) => {
    setImageToDelete(img);
  };

  // Cancel delete confirmation
  const cancelDelete = () => {
    setImageToDelete(null);
  };

  // Handle deleting any image from the gallery (called after confirmation)
  const handleGalleryDelete = async (img) => {
    if (!studentData?.id || !img?.filename) {
      toast.error("Cannot delete this image.");
      setImageToDelete(null);
      return;
    }

    setDeletingImageId(img.filename);

    try {
      // Extract filename from the img object
      let filename = img.filename;

      // Clean query params if present
      const queryIndex = filename.indexOf("?");
      if (queryIndex !== -1) {
        filename = filename.substring(0, queryIndex);
      }

      // Ensure .jpg extension
      const lowerFilename = filename.toLowerCase();
      if (!lowerFilename.endsWith('.jpg')) {
        const dotIndex = filename.lastIndexOf('.');
        filename = (dotIndex !== -1 ? filename.substring(0, dotIndex) : filename) + '.jpg';
      }

      const deleteUrl = `${API_URL}/api/student-progress-images/${studentData.id}/${filename}/`;
      console.log("Deleting gallery image:", deleteUrl);

      await axios.delete(deleteUrl, { headers: getAuthHeaders() });

      // Remove from monthly images
      setMonthlyImages(prev => prev.filter(i => i.filename !== img.filename));

      // If this was today's image, also clear currentImage
      if (img.date === sessionDate) {
        setCurrentImage(null);
      }

      toast.success("Image deleted!");
      setImageToDelete(null);
    } catch (err) {
      console.error("Delete failed:", err.response || err);
      toast.error(err.response?.data?.error || "Failed to delete image");
    } finally {
      setDeletingImageId(null);
    }
  };

  // Get responsive styles
  const responsiveStyles = getResponsiveStyles(isMobile, isTablet);

  return (
    <div style={responsiveStyles.pageContainer}>
      <div style={responsiveStyles.mainCard}>
        <h1 style={responsiveStyles.pageTitle}>My Daily Progress</h1>

        <div style={responsiveStyles.studentInfo}>
          <p style={responsiveStyles.studentName}>{studentData.name}</p>
          <p style={responsiveStyles.studentDetails}>{studentData.school} • Class {studentData.class}</p>
          <p style={styles.dateText}>Date: {sessionDate}</p>
        </div>

        {/* Side-by-side layout: Today's Upload + Today's Lesson */}
        <div style={responsiveStyles.sideBySideRow}>
          {/* Left: Today's Image Upload */}
          <div style={responsiveStyles.leftColumn}>
            <div style={cardStyles.container}>
              <h3 style={cardStyles.title}>
                <span style={cardStyles.icon}>📸</span>
                Upload Today's Progress
              </h3>

              {currentImage ? (
                <div style={responsiveStyles.imageContainer}>
                  <img
                    src={currentImage}
                    alt="Progress"
                    style={responsiveStyles.progressImage}
                  />
                  <HoverButton
                    onClick={handleDelete}
                    variant="danger"
                    isMobile={isMobile}
                  >
                    Delete Image
                  </HoverButton>
                </div>
              ) : (
                <p style={styles.noImageText}>No image uploaded for today.</p>
              )}

              <div style={responsiveStyles.buttonContainer}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="upload-input"
                />
                <FileLabelButton htmlFor="upload-input" isMobile={isMobile}>
                  Choose Image
                </FileLabelButton>

                <HoverButton
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  variant="success"
                  isMobile={isMobile}
                >
                  {isUploading ? "Uploading..." : "Upload"}
                </HoverButton>
              </div>
            </div>
          </div>

          {/* Right: Monthly Images Gallery */}
          <div style={responsiveStyles.rightColumn}>
            <div style={{...cardStyles.container, padding: 0, overflow: 'hidden'}}>
              <h3 style={{...cardStyles.title, padding: SPACING.md, marginBottom: 0, borderBottom: `1px solid ${COLORS.border.whiteTransparent}`}}>
                <span style={cardStyles.icon}>🖼️</span>
                {monthDisplayName} Gallery
                <span style={styles.imageCount}>
                  {monthlyImages.length} {monthlyImages.length === 1 ? 'image' : 'images'}
                </span>
              </h3>

              <div style={{padding: SPACING.md}}>
                {monthlyImages.length > 0 ? (
                  <div style={responsiveStyles.imageGrid}>
                    {monthlyImages.map((img, index) => (
                      <ImageGridItem
                        key={img.filename || index}
                        img={img}
                        index={index}
                        onPreview={setSelectedPreviewImage}
                        onDelete={handleGalleryDelete}
                        isDeleting={deletingImageId === img.filename}
                        onShowDeleteConfirm={showDeleteConfirm}
                      />
                    ))}
                  </div>
                ) : (
                  <p style={styles.noImagesText}>
                    No progress images uploaded this month yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Side-by-side layout: Today's Lesson + Recent Progress */}
        <div style={responsiveStyles.sideBySideRow}>
          {/* Left: Today's Lesson */}
          <div style={responsiveStyles.leftColumn}>
            <TodayLessonCard todayLesson={todayLesson} loading={progressLoading} />
          </div>

          {/* Right: Recent Progress Table */}
          <div style={responsiveStyles.rightColumn}>
            <RecentProgressTable
              recentProgress={recentProgress}
              loading={progressLoading}
              onImageClick={setSelectedPreviewImage}
            />
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {selectedPreviewImage && (
        <div
          style={styles.previewOverlay}
          onClick={() => setSelectedPreviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div style={styles.previewContent} onClick={(e) => e.stopPropagation()}>
            <button
              style={styles.closeButton}
              onClick={() => setSelectedPreviewImage(null)}
              aria-label="Close preview"
            >
              ×
            </button>
            <img
              src={selectedPreviewImage.url}
              alt={`Progress from ${selectedPreviewImage.date}`}
              style={styles.previewImage}
            />
            <p style={styles.previewDate}>
              {formatDatePretty(selectedPreviewImage.date)}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!imageToDelete}
        onConfirm={() => handleGalleryDelete(imageToDelete)}
        onCancel={cancelDelete}
        dateLabel={imageToDelete ? formatDatePretty(imageToDelete.date) : ''}
        isDeleting={!!deletingImageId}
      />

      {/* Email Prompt Modal - shown when student has no email configured */}
      <EmailPromptModal
        isOpen={showEmailPrompt}
        onClose={() => setShowEmailPrompt(false)}
        settingsPath="/student/settings"
      />
    </div>
  );
};

// Responsive Styles Generator
const getResponsiveStyles = (isMobile, isTablet) => ({
  pageContainer: {
    padding: isMobile ? SPACING.md : isTablet ? SPACING.lg : SPACING.xl,
    maxWidth: '1200px',
    margin: '0 auto',
    minHeight: '100vh',
    width: '100%',
    boxSizing: 'border-box',
  },
  mainCard: {
    ...MIXINS.glassmorphicCard,
    borderRadius: isMobile ? BORDER_RADIUS.lg : BORDER_RADIUS.xl,
    padding: isMobile ? SPACING.md : SPACING.xl,
  },
  pageTitle: {
    fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
    textAlign: 'center',
    color: COLORS.text.white,
  },
  studentInfo: {
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
    textAlign: 'center',
  },
  studentName: {
    fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    marginBottom: SPACING.xs,
  },
  studentDetails: {
    color: COLORS.text.whiteMedium,
    marginBottom: SPACING.sm,
    fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,
  },
  sideBySideRow: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: isMobile ? SPACING.lg : SPACING.xl,
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
  },
  leftColumn: {
    minWidth: 0, // Prevent overflow
  },
  rightColumn: {
    minWidth: 0, // Prevent overflow
  },
  uploadSection: {
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    paddingTop: isMobile ? SPACING.lg : SPACING.xl,
  },
  sectionTitle: {
    fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: isMobile ? SPACING.md : SPACING.lg,
    textAlign: 'center',
    color: COLORS.text.white,
  },
  imageContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: isMobile ? SPACING.md : SPACING.lg,
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
  },
  progressImage: {
    width: isMobile ? 'min(180px, 70vw)' : '200px',
    height: isMobile ? 'min(180px, 70vw)' : '200px',
    objectFit: 'cover',
    borderRadius: BORDER_RADIUS.lg,
    border: `2px solid ${COLORS.border.whiteTransparent}`,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: isMobile ? SPACING.md : SPACING.lg,
    width: '100%',
    marginTop: SPACING.md,
  },
  gallerySection: {
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    marginTop: isMobile ? SPACING.xl : SPACING['2xl'],
    paddingTop: isMobile ? SPACING.lg : SPACING.xl,
  },
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
    gap: isMobile ? SPACING.sm : SPACING.md,
  },
});

// Static styles that don't need responsiveness
const styles = {
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '256px',
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
  },
  errorContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '256px',
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
  },
  errorText: {
    color: COLORS.status.error,
    textAlign: 'center',
  },
  loadingText: {
    color: COLORS.text.whiteSubtle,
    textAlign: 'center',
  },
  dateText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    marginTop: SPACING.sm,
  },
  noImageText: {
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
    fontStyle: 'italic',
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
  },
  noImagesText: {
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
    fontStyle: 'italic',
    padding: SPACING.xl,
  },
  imageCount: {
    marginLeft: 'auto',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.text.whiteSubtle,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: `2px 8px`,
    borderRadius: BORDER_RADIUS.md,
  },
  previewOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    padding: SPACING.lg,
  },
  previewContent: {
    position: 'relative',
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: 'calc(90vh - 60px)',
    objectFit: 'contain',
    borderRadius: BORDER_RADIUS.lg,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  },
  previewDate: {
    marginTop: SPACING.md,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.medium,
  },
  closeButton: {
    position: 'absolute',
    top: -40,
    right: 0,
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '50%',
    color: COLORS.text.white,
    fontSize: '24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `all ${TRANSITIONS.fast}`,
  },
};

export default StudentProgressPage;
