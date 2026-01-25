// ============================================
// BOOK ADMIN SERVICE - API Calls for Book Management
// ============================================
// Location: src/services/bookAdminService.js

const API_URL = process.env.REACT_APP_API_URL;

/**
 * Get auth headers for API calls
 */
const getAuthHeaders = (isFormData = false) => {
  const token = localStorage.getItem('access');
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
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
// Book Management
// =============================================

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

/**
 * Get single book details with topic tree
 */
export const getAdminBook = async (bookId) => {
  const response = await fetch(
    `${API_URL}/api/books/admin/books/${bookId}/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Create a new book
 */
export const createBook = async (bookData) => {
  const isFormData = bookData instanceof FormData;
  const response = await fetch(
    `${API_URL}/api/books/admin/books/`,
    {
      method: 'POST',
      headers: getAuthHeaders(isFormData),
      body: isFormData ? bookData : JSON.stringify(bookData),
    }
  );
  return handleResponse(response);
};

/**
 * Update a book
 */
export const updateBook = async (bookId, bookData) => {
  const isFormData = bookData instanceof FormData;
  const response = await fetch(
    `${API_URL}/api/books/admin/books/${bookId}/`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(isFormData),
      body: isFormData ? bookData : JSON.stringify(bookData),
    }
  );
  return handleResponse(response);
};

/**
 * Delete a book
 */
export const deleteBook = async (bookId) => {
  const response = await fetch(
    `${API_URL}/api/books/admin/books/${bookId}/`,
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

/**
 * Toggle book publish status
 */
export const toggleBookPublish = async (bookId) => {
  const response = await fetch(
    `${API_URL}/api/books/admin/books/${bookId}/publish/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );
  return handleResponse(response);
};

// =============================================
// Topic Management
// =============================================

/**
 * Get topics for a book
 */
export const getBookTopics = async (bookId) => {
  const response = await fetch(
    `${API_URL}/api/books/admin/topics/?book=${bookId}`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Get single topic details
 */
export const getTopic = async (topicId) => {
  const response = await fetch(
    `${API_URL}/api/books/admin/topics/${topicId}/`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Create a new topic
 */
export const createTopic = async (topicData) => {
  const isFormData = topicData instanceof FormData;
  const response = await fetch(
    `${API_URL}/api/books/admin/topics/`,
    {
      method: 'POST',
      headers: getAuthHeaders(isFormData),
      body: isFormData ? topicData : JSON.stringify(topicData),
    }
  );
  return handleResponse(response);
};

/**
 * Update a topic
 */
export const updateTopic = async (topicId, topicData) => {
  const isFormData = topicData instanceof FormData;
  const response = await fetch(
    `${API_URL}/api/books/admin/topics/${topicId}/`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(isFormData),
      body: isFormData ? topicData : JSON.stringify(topicData),
    }
  );
  return handleResponse(response);
};

/**
 * Delete a topic
 */
export const deleteTopic = async (topicId) => {
  const response = await fetch(
    `${API_URL}/api/books/admin/topics/${topicId}/`,
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

/**
 * Move topic to new position
 */
export const moveTopic = async (topicId, parentId, position = 'last-child') => {
  const response = await fetch(
    `${API_URL}/api/books/admin/topics/${topicId}/move/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ parent: parentId, position }),
    }
  );
  return handleResponse(response);
};

/**
 * Duplicate a topic
 */
export const duplicateTopic = async (topicId) => {
  const response = await fetch(
    `${API_URL}/api/books/admin/topics/${topicId}/duplicate/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );
  return handleResponse(response);
};

// =============================================
// Image Upload
// =============================================

/**
 * Upload image for topic content to Supabase storage
 * @param {File} imageFile - Image file to upload
 * @param {string|number} topicId - Topic ID or 'new' for new topics
 * @param {string|number} bookId - Book ID for organization
 */
export const uploadTopicImage = async (imageFile, topicId = 'general', bookId = 'general') => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('topic_id', topicId);
  formData.append('book_id', bookId);

  const response = await fetch(
    `${API_URL}/api/books/admin/upload-image/`,
    {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: formData,
    }
  );
  return handleResponse(response);
};

const bookAdminService = {
  // Books
  getAdminBooks,
  getAdminBook,
  createBook,
  updateBook,
  deleteBook,
  toggleBookPublish,
  // Topics
  getBookTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic,
  moveTopic,
  duplicateTopic,
  // Images
  uploadTopicImage,
};

export default bookAdminService;
