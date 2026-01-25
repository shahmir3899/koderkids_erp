// ============================================
// QUIZ SERVICE - API Calls for Quiz Builder
// ============================================
// Location: src/services/quizService.js

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
// Quiz CRUD Operations
// =============================================

/**
 * Get all quizzes (admin/teacher)
 */
export const getQuizzes = async (topicId = null) => {
  const params = topicId ? `?topic_id=${topicId}` : '';
  const response = await fetch(
    `${API_URL}/api/courses/quiz-builder/${params}`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Get single quiz with questions
 */
export const getQuiz = async (quizId) => {
  const response = await fetch(
    `${API_URL}/api/courses/quiz-builder/${quizId}/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Get quizzes by topic
 */
export const getQuizzesByTopic = async (topicId) => {
  const response = await fetch(
    `${API_URL}/api/courses/quiz-builder/by-topic/${topicId}/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Create a new quiz
 */
export const createQuiz = async (quizData) => {
  const response = await fetch(
    `${API_URL}/api/courses/quiz-builder/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(quizData),
    }
  );
  return handleResponse(response);
};

/**
 * Update a quiz
 */
export const updateQuiz = async (quizId, quizData) => {
  const response = await fetch(
    `${API_URL}/api/courses/quiz-builder/${quizId}/`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(quizData),
    }
  );
  return handleResponse(response);
};

/**
 * Delete a quiz
 */
export const deleteQuiz = async (quizId) => {
  const response = await fetch(
    `${API_URL}/api/courses/quiz-builder/${quizId}/`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }
  return true;
};

// =============================================
// Question Operations
// =============================================

/**
 * Add a question to quiz
 */
export const addQuestion = async (quizId, questionData) => {
  const response = await fetch(
    `${API_URL}/api/courses/quiz-builder/${quizId}/add_question/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(questionData),
    }
  );
  return handleResponse(response);
};

/**
 * Update a question
 */
export const updateQuestion = async (quizId, questionId, questionData) => {
  const response = await fetch(
    `${API_URL}/api/courses/quiz-builder/${quizId}/questions/${questionId}/`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(questionData),
    }
  );
  return handleResponse(response);
};

/**
 * Delete a question
 */
export const deleteQuestion = async (quizId, questionId) => {
  const response = await fetch(
    `${API_URL}/api/courses/quiz-builder/${quizId}/questions/${questionId}/`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }
  return true;
};

// =============================================
// Topic List for Quiz Assignment
// =============================================

/**
 * Get topics for a book (for assigning quiz to topic)
 */
export const getTopicsForBook = async (bookId) => {
  const response = await fetch(
    `${API_URL}/api/books/admin/topics/?book=${bookId}`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Get all books for admin
 */
export const getAdminBooks = async () => {
  const response = await fetch(
    `${API_URL}/api/books/admin/books/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

export default {
  getQuizzes,
  getQuiz,
  getQuizzesByTopic,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getTopicsForBook,
  getAdminBooks,
};
