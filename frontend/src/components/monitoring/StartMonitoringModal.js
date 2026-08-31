// ============================================================
// START MONITORING MODAL
// ============================================================
// Single-step: pick a school, then start recording immediately
// as yourself — no calendar, no advance planning, no assigning.

import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSearch, faMapMarkerAlt, faPlay } from "@fortawesome/free-solid-svg-icons";
import "react-toastify/dist/ReactToastify.css";

import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
  Z_INDEX,
} from "../../utils/designConstants";

import { useResponsive } from "../../hooks/useResponsive";
import { startMonitoringVisit } from "../../services/monitoringService";
import { API_URL } from "../../utils/constants";
import { getAuthHeaders } from "../../utils/authHelpers";

const StartMonitoringModal = ({ isOpen, onClose, onStarted }) => {
  const { isMobile } = useResponsive();

  const [schoolData, setSchoolData] = useState([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchSchools = useCallback(async () => {
    setLoadingSchools(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/schools-with-classes/`, {
        headers: getAuthHeaders(),
      });
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      const activeSchools = data.filter((s) => s.is_active === undefined || s.is_active === true);
      setSchoolData(activeSchools);
    } catch (err) {
      console.error("Error fetching schools:", err);
      setError("Failed to load schools. Please try again.");
      setSchoolData([]);
    } finally {
      setLoadingSchools(false);
    }
  }, []);

  const resetModal = () => {
    setSchoolSearch("");
    setSelectedSchool(null);
    setPurpose("");
    setNotes("");
    setError(null);
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchSchools();
    } else {
      resetModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const filteredSchools = schoolData.filter((school) => {
    const term = schoolSearch.toLowerCase();
    const name = (school.name || "").toLowerCase();
    const location = (school.location || school.address || "").toLowerCase();
    return name.includes(term) || location.includes(term);
  });

  const handleStart = async () => {
    setError(null);

    if (!selectedSchool) {
      const message = "Please select a school to start monitoring.";
      setError(message);
      toast.error(message);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        school: selectedSchool.id,
        purpose: purpose || undefined,
        notes: notes || undefined,
      };

      const visit = await startMonitoringVisit(payload);
      onStarted(visit);
      onClose();
    } catch (err) {
      console.error("Error starting monitoring visit:", err.response?.data || err.message);
      const data = err.response?.data;
      let apiError;
      if (!data) {
        apiError = err.message || "Failed to start monitoring. Please try again.";
      } else if (typeof data === "string") {
        apiError = data;
      } else if (data.detail) {
        apiError = data.detail;
      } else if (data.error) {
        apiError = data.error;
      } else if (data.non_field_errors) {
        apiError = data.non_field_errors.join(", ");
      } else if (typeof data === "object") {
        apiError = Object.entries(data)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
          .join("; ");
      } else {
        apiError = "Failed to start monitoring. Please try again.";
      }
      setError(apiError);
      toast.error(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={{ ...styles.modal, ...(isMobile ? styles.modalMobile : {}) }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <h2 style={styles.title}>Start Monitoring</h2>
          <button onClick={onClose} style={styles.closeButton} aria-label="Close">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div style={styles.content}>
          {error && <div style={styles.errorBanner}>{error}</div>}

          <div style={styles.formGroup}>
            <div style={styles.searchInputWrapper}>
              <FontAwesomeIcon icon={faSearch} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search schools by name or location..."
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>

          <div style={styles.schoolsList}>
            {loadingSchools ? (
              <div style={styles.centeredMessage}>
                <ClipLoader size={30} color="#3b82f6" />
              </div>
            ) : filteredSchools.length === 0 ? (
              <div style={styles.centeredMessage}>
                <span style={{ color: COLORS.text.whiteSubtle }}>
                  {schoolSearch ? "No schools match your search." : "No active schools found."}
                </span>
              </div>
            ) : (
              filteredSchools.map((school) => {
                const isSelected = selectedSchool?.id === school.id;
                return (
                  <div
                    key={school.id}
                    style={{ ...styles.schoolCard, ...(isSelected ? styles.schoolCardSelected : {}) }}
                    onClick={() => setSelectedSchool(school)}
                  >
                    <div style={styles.schoolCardContent}>
                      <div style={styles.schoolName}>{school.name}</div>
                      {(school.location || school.address) && (
                        <div style={styles.schoolLocation}>
                          <FontAwesomeIcon icon={faMapMarkerAlt} style={{ marginRight: SPACING.xs, fontSize: "11px" }} />
                          {school.location || school.address}
                        </div>
                      )}
                    </div>
                    {isSelected && <div style={styles.selectedBadge}>Selected</div>}
                  </div>
                );
              })
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Purpose (optional)</label>
            <input
              type="text"
              placeholder="e.g. Monthly monitoring, Follow-up visit..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Notes (optional)</label>
            <textarea
              placeholder="Additional notes for this visit..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={styles.textarea}
              rows={3}
            />
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.buttonSecondary} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            onClick={handleStart}
            style={styles.buttonPrimary}
            disabled={isSubmitting || !selectedSchool}
          >
            <FontAwesomeIcon icon={faPlay} style={{ marginRight: SPACING.sm }} />
            {isSubmitting ? "Starting..." : "Start Monitoring"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================================
// STYLES
// ============================================================

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: Z_INDEX.modal,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: COLORS.background.gradient,
    borderRadius: BORDER_RADIUS.xl,
    width: "90%",
    maxWidth: "560px",
    maxHeight: "90vh",
    overflow: "hidden",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
    display: "flex",
    flexDirection: "column",
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    ...MIXINS.glassmorphicCard,
  },
  modalMobile: {
    width: "100%",
    maxWidth: "100%",
    height: "100vh",
    maxHeight: "100vh",
    borderRadius: 0,
  },
  header: {
    padding: SPACING.xl,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(255, 255, 255, 0.05)",
  },
  title: {
    margin: 0,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },
  closeButton: {
    background: "rgba(255, 255, 255, 0.1)",
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.white,
    cursor: "pointer",
    padding: SPACING.sm,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BORDER_RADIUS.md,
    transition: `all ${TRANSITIONS.normal}`,
    width: "40px",
    height: "40px",
  },
  content: {
    flex: 1,
    overflow: "auto",
    padding: SPACING.xl,
  },
  errorBanner: {
    marginBottom: SPACING.lg,
    fontSize: FONT_SIZES.sm,
    color: "#FCA5A5",
    padding: `${SPACING.md} ${SPACING.lg}`,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: BORDER_RADIUS.md,
    border: "1px solid rgba(239, 68, 68, 0.3)",
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    display: "block",
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    marginBottom: SPACING.sm,
  },
  input: {
    width: "100%",
    padding: `${SPACING.md} ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: COLORS.text.white,
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: `${SPACING.md} ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: COLORS.text.white,
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box",
    minHeight: "70px",
  },
  searchInputWrapper: {
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: SPACING.md,
    top: "50%",
    transform: "translateY(-50%)",
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: "14px",
  },
  searchInput: {
    width: "100%",
    padding: `${SPACING.md} ${SPACING.lg} ${SPACING.md} 2.5rem`,
    fontSize: FONT_SIZES.sm,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: COLORS.text.white,
    outline: "none",
    boxSizing: "border-box",
  },
  schoolsList: {
    display: "flex",
    flexDirection: "column",
    gap: SPACING.sm,
    maxHeight: "260px",
    overflowY: "auto",
    marginBottom: SPACING.lg,
  },
  centeredMessage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  schoolCard: {
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: BORDER_RADIUS.lg,
    border: "1px solid rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    cursor: "pointer",
    transition: `all ${TRANSITIONS.normal}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  schoolCardSelected: {
    border: "2px solid rgba(59, 130, 246, 0.6)",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  schoolCardContent: {
    flex: 1,
    minWidth: 0,
  },
  schoolName: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  schoolLocation: {
    fontSize: FONT_SIZES.xs,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: "2px",
  },
  selectedBadge: {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: "rgba(59, 130, 246, 0.3)",
    color: "#93C5FD",
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    whiteSpace: "nowrap",
  },
  footer: {
    padding: `${SPACING.lg} ${SPACING.xl}`,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    display: "flex",
    gap: SPACING.md,
    justifyContent: "flex-end",
    background: "rgba(255, 255, 255, 0.05)",
  },
  buttonSecondary: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    cursor: "pointer",
  },
  buttonPrimary: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    backgroundColor: COLORS.status.success,
    border: "none",
    borderRadius: BORDER_RADIUS.md,
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
  },
};

export default StartMonitoringModal;
