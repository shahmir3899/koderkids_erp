// frontend/src/components/admin/OnlineStudentCourseAssignmentModal.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import CourseCard from '../lms/course/CourseCard';
import * as onlineStudentAdminService from '../../services/onlineStudentAdminService';
import {
  COLORS as RAW_COLORS,
  SPACING as RAW_SPACING,
  FONT_SIZES as RAW_FONT_SIZES,
  FONT_WEIGHTS as RAW_FONT_WEIGHTS,
  BORDER_RADIUS as RAW_BORDER_RADIUS,
  Z_INDEX as RAW_Z_INDEX,
  TRANSITIONS as RAW_TRANSITIONS,
} from '../../utils/designConstants';

const COLORS = {
  ...RAW_COLORS,
  PRIMARY: RAW_COLORS.PRIMARY ?? RAW_COLORS.primary,
  WHITE: RAW_COLORS.WHITE ?? RAW_COLORS.background?.white,
  GRAY: RAW_COLORS.GRAY ?? RAW_COLORS.text?.secondary,
  LIGHT_GRAY: RAW_COLORS.LIGHT_GRAY ?? RAW_COLORS.background?.gray,
  BORDER: RAW_COLORS.BORDER ?? RAW_COLORS.border?.default,
  TEXT: RAW_COLORS.TEXT ?? RAW_COLORS.text?.primary,
  LIGHT_BLUE: RAW_COLORS.LIGHT_BLUE ?? RAW_COLORS.status?.infoLight,
};

const SPACING = {
  ...RAW_SPACING,
  XS: RAW_SPACING.XS ?? RAW_SPACING.xs,
  SM: RAW_SPACING.SM ?? RAW_SPACING.sm,
  MD: RAW_SPACING.MD ?? RAW_SPACING.md,
  LG: RAW_SPACING.LG ?? RAW_SPACING.lg,
  XL: RAW_SPACING.XL ?? RAW_SPACING.xl,
};

const FONT_SIZES = {
  ...RAW_FONT_SIZES,
  XS: RAW_FONT_SIZES.XS ?? RAW_FONT_SIZES.xs,
  SM: RAW_FONT_SIZES.SM ?? RAW_FONT_SIZES.sm,
  LG: RAW_FONT_SIZES.LG ?? RAW_FONT_SIZES.lg,
};

const FONT_WEIGHTS = {
  ...RAW_FONT_WEIGHTS,
  MEDIUM: RAW_FONT_WEIGHTS.MEDIUM ?? RAW_FONT_WEIGHTS.medium,
  SEMIBOLD: RAW_FONT_WEIGHTS.SEMIBOLD ?? RAW_FONT_WEIGHTS.semibold,
  BOLD: RAW_FONT_WEIGHTS.BOLD ?? RAW_FONT_WEIGHTS.bold,
};

const BORDER_RADIUS = {
  ...RAW_BORDER_RADIUS,
  MD: RAW_BORDER_RADIUS.MD ?? RAW_BORDER_RADIUS.md,
  LG: RAW_BORDER_RADIUS.LG ?? RAW_BORDER_RADIUS.lg,
  FULL: RAW_BORDER_RADIUS.FULL ?? RAW_BORDER_RADIUS.full,
};

const Z_INDEX = {
  ...RAW_Z_INDEX,
  MODAL: RAW_Z_INDEX.MODAL ?? RAW_Z_INDEX.modal,
};

const TRANSITIONS = {
  ...RAW_TRANSITIONS,
  FAST: RAW_TRANSITIONS.FAST ?? RAW_TRANSITIONS.fast,
};

const OnlineStudentCourseAssignmentModal = ({
  open,
  onClose,
  student,
  onAssignmentComplete,
}) => {
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [enrollmentFilter, setEnrollmentFilter] = useState('all');
  const [assignmentResult, setAssignmentResult] = useState(null);

  useEffect(() => {
    if (open && student) {
      setAssignmentResult(null);
      setSearchTerm('');
      setSelectedCourseIds([]);
      setEnrollmentFilter('all');
      loadAvailableCourses();
    }
  }, [open, student]);

  const loadAvailableCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await onlineStudentAdminService.getAvailableCourses();
      setAvailableCourses(data.courses || []);
    } catch (err) {
      setError(`Failed to load courses: ${err.message}`);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const enrolledCourseIds = new Set(
    student?.enrollments?.map((e) => e.course_id) || []
  );

  const filteredCourses = availableCourses.filter((course) =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectableFilteredCourseIds = filteredCourses
    .filter((course) => !enrolledCourseIds.has(course.id))
    .map((course) => course.id);

  const allFilteredSelectableSelected =
    selectableFilteredCourseIds.length > 0 &&
    selectableFilteredCourseIds.every((id) => selectedCourseIds.includes(id));

  const filteredEnrollments = (student?.enrollments || []).filter((enrollment) => {
    if (enrollmentFilter === 'all') {
      return true;
    }
    return (enrollment.status || '').toLowerCase() === enrollmentFilter;
  });

  const handleCourseToggle = (courseId) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectableFilteredCourseIds.length === 0) {
      return;
    }

    setSelectedCourseIds((prev) => {
      if (allFilteredSelectableSelected) {
        return prev.filter((id) => !selectableFilteredCourseIds.includes(id));
      }

      const next = new Set(prev);
      selectableFilteredCourseIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const handleAssignCourses = async () => {
    if (selectedCourseIds.length === 0) {
      toast.error('Please select at least one course');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const result = await onlineStudentAdminService.assignCoursesToStudent(
        student.id,
        selectedCourseIds,
        true
      );

      const assignedCount = result?.summary?.assigned_count ?? result?.assigned?.length ?? 0;
      const skippedCount = result?.summary?.skipped_count ?? result?.skipped?.length ?? 0;
      const failedCount = result?.summary?.failed_count ?? result?.failed?.length ?? 0;

      setAssignmentResult({
        assignedCount,
        skippedCount,
        failedCount,
        assigned: result?.assigned || [],
        skipped: result?.skipped || [],
        failed: result?.failed || [],
      });

      toast.success(
        `Assigned: ${assignedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`
      );
      setSelectedCourseIds([]);

      if (onAssignmentComplete) {
        onAssignmentComplete();
      }
    } catch (err) {
      setError(err.message || 'Failed to assign courses');
      toast.error('Failed to assign courses');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveEnrollment = async (enrollmentId) => {
    if (!window.confirm('Remove this course from the student?')) {
      return;
    }

    try {
      setSubmitting(true);
      setAssignmentResult(null);
      await onlineStudentAdminService.removeCourseFromStudent(student.id, enrollmentId);
      toast.success('Course removed successfully');

      if (onAssignmentComplete) {
        onAssignmentComplete();
      }

    } catch (err) {
      setError(err.message || 'Failed to remove course');
      toast.error('Failed to remove course');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !student) return null;

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: Z_INDEX.MODAL,
  };

  const dialogStyle = {
    background: 'linear-gradient(135deg, rgba(22, 14, 56, 0.97) 0%, rgba(40, 18, 68, 0.97) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.LG,
    boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
    maxWidth: '880px',
    width: '95%',
    maxHeight: '90vh',
    overflowY: 'auto',
    color: 'rgba(255,255,255,0.9)',
  };

  const sectionTitleStyle = {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    marginBottom: SPACING.SM,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const buttonBase = {
    padding: `${SPACING.SM} ${SPACING.LG}`,
    borderRadius: BORDER_RADIUS.MD,
    border: 'none',
    cursor: 'pointer',
    fontWeight: FONT_WEIGHTS.MEDIUM,
    fontSize: FONT_SIZES.SM,
    transition: TRANSITIONS.FAST,
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: SPACING.LG, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ margin: 0, fontSize: FONT_SIZES.LG, fontWeight: FONT_WEIGHTS.SEMIBOLD, color: 'rgba(255,255,255,0.95)' }}>
            📚 Manage Books/Courses for {student.name}
          </h2>
        </div>

        <div style={{ padding: SPACING.LG }}>
          {error && (
            <div style={{
              padding: SPACING.MD,
              backgroundColor: 'rgba(239,68,68,0.15)',
              color: '#FCA5A5',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: BORDER_RADIUS.MD,
              marginBottom: SPACING.MD,
              fontSize: FONT_SIZES.SM,
            }}>
              {error}
            </div>
          )}

          {assignmentResult && (
            <div style={{
              padding: SPACING.MD,
              backgroundColor: 'rgba(16,185,129,0.15)',
              color: '#6EE7B7',
              border: '1px solid rgba(16,185,129,0.4)',
              borderRadius: BORDER_RADIUS.MD,
              marginBottom: SPACING.MD,
              fontSize: FONT_SIZES.SM,
            }}>
              <strong>Result:</strong> Assigned {assignmentResult.assignedCount}, Skipped {assignmentResult.skippedCount}, Failed {assignmentResult.failedCount}
            </div>
          )}

          <div style={{ marginBottom: SPACING.LG }}>
            <div style={sectionTitleStyle}>
              Currently Assigned ({student.enrollments?.length || 0})
            </div>
            <div style={{ marginBottom: SPACING.SM }}>
              <select
                value={enrollmentFilter}
                onChange={(e) => setEnrollmentFilter(e.target.value)}
                disabled={submitting}
                style={{
                  padding: `${SPACING.XS} ${SPACING.SM}`,
                  borderRadius: BORDER_RADIUS.MD,
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontSize: FONT_SIZES.XS,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>
            {student.enrollments && student.enrollments.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.SM }}>
                {filteredEnrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: SPACING.XS,
                      backgroundColor: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.5)',
                      color: 'rgba(196, 181, 253, 1)',
                      padding: `${SPACING.XS} ${SPACING.SM}`,
                      borderRadius: BORDER_RADIUS.FULL,
                      fontSize: FONT_SIZES.XS,
                    }}
                  >
                    📚 {enrollment.course_title}
                    <button
                      onClick={() => handleRemoveEnrollment(enrollment.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'rgba(196, 181, 253, 0.7)',
                        fontSize: '14px',
                        padding: '0 2px',
                        lineHeight: 1,
                      }}
                      title="Remove course"
                      disabled={submitting}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: FONT_SIZES.SM }}>
                No books/courses found for selected status
              </p>
            )}
          </div>

          <div style={{ marginBottom: SPACING.LG }}>
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading || submitting}
              style={{
                width: '100%',
                padding: SPACING.MD,
                borderRadius: BORDER_RADIUS.MD,
                border: '1px solid rgba(255,255,255,0.2)',
                fontSize: FONT_SIZES.SM,
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.9)',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ marginTop: SPACING.SM, display: 'flex', gap: SPACING.SM }}>
              <button
                onClick={handleSelectAllFiltered}
                disabled={loading || submitting || selectableFilteredCourseIds.length === 0}
                style={{
                  ...buttonBase,
                  padding: `${SPACING.XS} ${SPACING.SM}`,
                  backgroundColor: 'rgba(139,92,246,0.2)',
                  color: 'rgba(196,181,253,1)',
                  border: '1px solid rgba(139,92,246,0.5)',
                  opacity: loading || submitting || selectableFilteredCourseIds.length === 0 ? 0.5 : 1,
                }}
              >
                {allFilteredSelectableSelected ? 'Unselect Filtered' : 'Select Filtered'}
              </button>

              <button
                onClick={() => setSelectedCourseIds([])}
                disabled={loading || submitting || selectedCourseIds.length === 0}
                style={{
                  ...buttonBase,
                  padding: `${SPACING.XS} ${SPACING.SM}`,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  opacity: loading || submitting || selectedCourseIds.length === 0 ? 0.5 : 1,
                }}
              >
                Clear Selection
              </button>
            </div>
          </div>

          <div>
            <div style={sectionTitleStyle}>Available Books/Courses</div>
            {loading ? (
              <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: SPACING.LG }}>Loading courses...</p>
            ) : (
              <>
                {filteredCourses.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: SPACING.MD,
                      maxHeight: '420px',
                      overflowY: 'auto',
                      paddingRight: '4px',
                    }}
                  >
                    {filteredCourses.map((course) => {
                      const isSelected = selectedCourseIds.includes(course.id);
                      const isAlreadyEnrolled = enrolledCourseIds.has(course.id);
                      const courseShape = {
                        title: course.title,
                        cover: course.cover_image || null,
                        total_topics: course.topic_count || 0,
                        total_duration_minutes: null,
                        enrollment_count: 0,
                      };
                      return (
                        <div
                          key={course.id}
                          style={{
                            position: 'relative',
                            borderRadius: BORDER_RADIUS.LG,
                            outline: isSelected
                              ? '2px solid rgba(139, 92, 246, 0.9)'
                              : '2px solid transparent',
                            outlineOffset: '2px',
                            opacity: isAlreadyEnrolled ? 0.55 : 1,
                            cursor: isAlreadyEnrolled || submitting ? 'not-allowed' : 'pointer',
                            transition: `outline ${TRANSITIONS.FAST}`,
                          }}
                          onClick={() => {
                            if (!isAlreadyEnrolled && !submitting) {
                              handleCourseToggle(course.id);
                            }
                          }}
                        >
                          <CourseCard
                            course={courseShape}
                            enrollment={null}
                            showEnrollButton={false}
                            onView={() => {}}
                          />
                          {/* Selection checkmark badge */}
                          {isSelected && (
                            <div style={{
                              position: 'absolute',
                              top: '10px',
                              right: '10px',
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(139, 92, 246, 1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '14px',
                              fontWeight: 'bold',
                              zIndex: 10,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                              pointerEvents: 'none',
                            }}>
                              ✓
                            </div>
                          )}
                          {/* Already assigned badge */}
                          {isAlreadyEnrolled && (
                            <div style={{
                              position: 'absolute',
                              top: '10px',
                              right: '10px',
                              padding: '2px 10px',
                              borderRadius: BORDER_RADIUS.FULL,
                              backgroundColor: 'rgba(16, 185, 129, 0.9)',
                              color: 'white',
                              fontSize: FONT_SIZES.XS,
                              fontWeight: FONT_WEIGHTS.SEMIBOLD,
                              zIndex: 10,
                              pointerEvents: 'none',
                            }}>
                              ✓ Assigned
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: FONT_SIZES.SM }}>No courses found</p>
                )}
              </>
            )}

            {selectedCourseIds.length > 0 && (
              <p
                style={{
                  fontSize: FONT_SIZES.XS,
                  color: 'rgba(196,181,253,1)',
                  marginTop: SPACING.SM,
                }}
              >
                {selectedCourseIds.length} book/course item(s) selected
              </p>
            )}
          </div>
        </div>

        <div
          style={{
            padding: SPACING.LG,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: SPACING.MD,
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              ...buttonBase,
              backgroundColor: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(255,255,255,0.2)',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAssignCourses}
            disabled={submitting || selectedCourseIds.length === 0}
            style={{
              ...buttonBase,
              backgroundColor: COLORS.PRIMARY,
              color: COLORS.WHITE,
              opacity: submitting || selectedCourseIds.length === 0 ? 0.6 : 1,
            }}
          >
            {submitting ? 'Assigning...' : 'Assign Books/Courses'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnlineStudentCourseAssignmentModal;
