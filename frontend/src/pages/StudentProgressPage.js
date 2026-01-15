// StudentProgressPage.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import { useAuth } from "../auth";
import Compressor from "compressorjs";
import { getAuthHeaders } from "../api";

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

const StudentProgressPage = () => {
  // Responsive hook
  const { isMobile, isTablet } = useResponsive();

  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [sessionDate] = useState(new Date().toISOString().split("T")[0]);

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

      // 2. Get image using correct endpoint
      const imgRes = await axios.get(`${API_URL}/api/student-images/`, {
        headers: getAuthHeaders(),
        params: {
          school: student.school,
          class: student.class,
          session_date: sessionDate,
          student_id: student.id,
        },
      });

      const images = imgRes.data?.images || [];
      if (images.length > 0) {
        setCurrentImage(images[0]);
      }
    } catch (err) {
      console.error("Fetch failed:", err.response || err);
      toast.error("Failed to load profile or image");
    } finally {
      setLoading(false);
    }
  };

  init();
}, [authLoading, sessionDate]);

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

    // Backend returns: image_url
    setCurrentImage(res.data.image_url);
    setSelectedFile(null);
    toast.success("Uploaded successfully!");
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
    toast.success("Image deleted!");
  } catch (err) {
    console.error("Delete failed:", err.response || err);
    toast.error(err.response?.data?.error || "Failed to delete image");
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

        <div style={responsiveStyles.uploadSection}>
          <h3 style={responsiveStyles.sectionTitle}>Upload Today's Progress</h3>

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
            <p style={styles.noImageText}>No image uploaded.</p>
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
    </div>
  );
};

// Responsive Styles Generator
const getResponsiveStyles = (isMobile, isTablet) => ({
  pageContainer: {
    padding: isMobile ? SPACING.md : isTablet ? SPACING.lg : SPACING.xl,
    maxWidth: '640px',
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
    width: isMobile ? 'min(200px, 80vw)' : '256px',
    height: isMobile ? 'min(200px, 80vw)' : '256px',
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
  },
};

export default StudentProgressPage;