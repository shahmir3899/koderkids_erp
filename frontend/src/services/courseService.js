// ============================================
// COURSE SERVICE - LMS API Calls
// ============================================
// Location: src/services/courseService.js

const API_URL = process.env.REACT_APP_API_URL;

/**
 * Get auth headers for API calls
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('access');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

/**
 * Handle API response
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }
  return response.json();
};

// =============================================
// Course Browsing
// =============================================

/**
 * Get all available courses
 * @param {string} search - Optional search query
 */
export const getCourses = async (search = '') => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);

  const response = await fetch(
    `${API_URL}/api/courses/?${params.toString()}`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Get course details with topic tree and progress
 * @param {number} courseId - Course ID
 */
export const getCourseDetail = async (courseId) => {
  const response = await fetch(
    `${API_URL}/api/courses/${courseId}/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Preview course without enrollment
 * @param {number} courseId - Course ID
 */
export const getCoursePreview = async (courseId) => {
  const response = await fetch(
    `${API_URL}/api/courses/${courseId}/preview/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

// =============================================
// Enrollment
// =============================================

/**
 * Enroll in a course
 * @param {number} courseId - Course ID
 */
export const enrollInCourse = async (courseId) => {
  const response = await fetch(
    `${API_URL}/api/courses/${courseId}/enroll/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );
  return handleResponse(response);
};

/**
 * Unenroll from a course
 * @param {number} courseId - Course ID
 */
export const unenrollFromCourse = async (courseId) => {
  const response = await fetch(
    `${API_URL}/api/courses/${courseId}/unenroll/`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );
  return handleResponse(response);
};

/**
 * Get student's enrolled courses
 */
export const getMyCourses = async () => {
  const response = await fetch(
    `${API_URL}/api/courses/my-courses/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Auto-enroll in all available courses (for students)
 */
export const autoEnrollAll = async () => {
  const response = await fetch(
    `${API_URL}/api/courses/auto-enroll-all/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );
  return handleResponse(response);
};

/**
 * Get continue learning data (last accessed course/topic)
 */
export const getContinueLearning = async () => {
  const response = await fetch(
    `${API_URL}/api/courses/continue/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

// =============================================
// Progress Tracking
// =============================================

/**
 * Get course progress summary
 * @param {number} courseId - Course ID
 */
export const getCourseProgress = async (courseId) => {
  const response = await fetch(
    `${API_URL}/api/courses/${courseId}/progress/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Mark topic as started
 * @param {number} topicId - Topic ID
 */
export const startTopic = async (topicId) => {
  const response = await fetch(
    `${API_URL}/api/courses/progress/topic/${topicId}/start/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );
  return handleResponse(response);
};

/**
 * Mark topic as completed
 * @param {number} topicId - Topic ID
 */
export const completeTopic = async (topicId) => {
  const response = await fetch(
    `${API_URL}/api/courses/progress/topic/${topicId}/complete/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );
  return handleResponse(response);
};

/**
 * Send heartbeat to track time spent
 * @param {number} topicId - Topic ID
 * @param {number} seconds - Seconds to add
 * @param {object} position - Optional position data (video timestamp, scroll)
 */
export const sendHeartbeat = async (topicId, seconds = 30, position = null) => {
  const response = await fetch(
    `${API_URL}/api/courses/progress/topic/${topicId}/heartbeat/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ seconds, position }),
    }
  );
  return handleResponse(response);
};

/**
 * Get progress dashboard data
 */
export const getProgressDashboard = async () => {
  const response = await fetch(
    `${API_URL}/api/courses/progress/dashboard/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

// =============================================
// Topic Content
// =============================================

/**
 * Get full topic content
 * @param {number} topicId - Topic ID
 */
export const getTopicContent = async (topicId) => {
  const response = await fetch(
    `${API_URL}/api/courses/topics/${topicId}/content/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Get previous and next topics for navigation
 * @param {number} topicId - Topic ID
 */
export const getTopicSiblings = async (topicId) => {
  const response = await fetch(
    `${API_URL}/api/courses/topics/${topicId}/siblings/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

// =============================================
// Quiz
// =============================================

/**
 * Get quizzes for a topic
 * @param {number} topicId - Topic ID
 */
export const getTopicQuizzes = async (topicId) => {
  const response = await fetch(
    `${API_URL}/api/courses/topics/${topicId}/quizzes/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Get quiz details for taking
 * @param {number} quizId - Quiz ID
 */
export const getQuiz = async (quizId) => {
  const response = await fetch(
    `${API_URL}/api/courses/quizzes/${quizId}/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Start a quiz attempt
 * @param {number} quizId - Quiz ID
 */
export const startQuiz = async (quizId) => {
  const response = await fetch(
    `${API_URL}/api/courses/quizzes/${quizId}/start/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );
  return handleResponse(response);
};

/**
 * Submit quiz answers
 * @param {number} quizId - Quiz ID
 * @param {number} attemptId - Attempt ID
 * @param {array} answers - Array of {question_id, selected_choices}
 */
export const submitQuiz = async (quizId, attemptId, answers) => {
  const response = await fetch(
    `${API_URL}/api/courses/quizzes/${quizId}/submit/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ attempt_id: attemptId, answers }),
    }
  );
  return handleResponse(response);
};

/**
 * Get quiz attempt results
 * @param {number} attemptId - Attempt ID
 */
export const getQuizAttempt = async (attemptId) => {
  const response = await fetch(
    `${API_URL}/api/courses/quizzes/attempts/${attemptId}/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

// =============================================
// Activity Proof (Homework Upload)
// =============================================

/**
 * Upload activity proof (screenshot) for a topic
 * @param {number} topicId - Topic ID
 * @param {string} screenshotUrl - Supabase URL of uploaded screenshot
 * @param {string} softwareUsed - Software used (scratch, python, canva, ai_tool, other)
 * @param {string} studentNotes - Optional notes from student
 */
export const uploadActivityProof = async (topicId, screenshotUrl, softwareUsed, studentNotes = '') => {
  const response = await fetch(
    `${API_URL}/api/courses/activity-proof/upload/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        topic: topicId,
        screenshot_url: screenshotUrl,
        software_used: softwareUsed,
        student_notes: studentNotes,
      }),
    }
  );
  return handleResponse(response);
};

/**
 * Get all proofs for the current student
 * @param {number} courseId - Optional course ID filter
 * @param {string} status - Optional status filter (pending, approved, rejected)
 */
export const getMyProofs = async (courseId = null, status = null) => {
  const params = new URLSearchParams();
  if (courseId) params.append('course_id', courseId);
  if (status) params.append('status', status);

  const response = await fetch(
    `${API_URL}/api/courses/activity-proof/my-proofs/?${params.toString()}`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

// =============================================
// Validation & Unlock
// =============================================

/**
 * Get 5-step validation status for a topic
 * @param {number} topicId - Topic ID
 */
export const getValidationSteps = async (topicId) => {
  const response = await fetch(
    `${API_URL}/api/courses/topics/${topicId}/validation-steps/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Get unlock status for a topic
 * @param {number} topicId - Topic ID
 */
export const getUnlockStatus = async (topicId) => {
  const response = await fetch(
    `${API_URL}/api/courses/topics/${topicId}/unlock-status/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Check if it's guardian review time (outside school hours)
 */
export const checkGuardianTime = async () => {
  const response = await fetch(
    `${API_URL}/api/courses/guardian/check-time/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Get pending guardian reviews for student
 */
export const getPendingGuardianReviews = async () => {
  const response = await fetch(
    `${API_URL}/api/courses/guardian/pending-reviews/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Submit guardian review for a proof
 * @param {number} proofId - ActivityProof ID
 * @param {boolean} isApproved - Whether guardian approves
 * @param {string} notes - Optional review notes
 */
export const submitGuardianReview = async (proofId, isApproved = true, notes = '') => {
  const response = await fetch(
    `${API_URL}/api/courses/guardian/review/${proofId}/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        is_approved: isApproved,
        review_notes: notes,
      }),
    }
  );
  return handleResponse(response);
};

export default {
  // Browsing
  getCourses,
  getCourseDetail,
  getCoursePreview,
  // Enrollment
  enrollInCourse,
  unenrollFromCourse,
  getMyCourses,
  autoEnrollAll,
  getContinueLearning,
  // Progress
  getCourseProgress,
  startTopic,
  completeTopic,
  sendHeartbeat,
  getProgressDashboard,
  // Content
  getTopicContent,
  getTopicSiblings,
  // Quiz
  getTopicQuizzes,
  getQuiz,
  startQuiz,
  submitQuiz,
  getQuizAttempt,
  // Activity Proof
  uploadActivityProof,
  getMyProofs,
  // Validation & Unlock
  getValidationSteps,
  getUnlockStatus,
  checkGuardianTime,
  getPendingGuardianReviews,
  submitGuardianReview,
};
