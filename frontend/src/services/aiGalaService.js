/**
 * AI Gala Service
 * Handles all API calls for AI Gala feature including galleries, projects, voting, and comments.
 */
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Auth header helpers
const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('access')}`,
});

const getJsonHeaders = () => ({
    ...getAuthHeaders(),
    'Content-Type': 'application/json',
});

const getMultipartHeaders = () => ({
    ...getAuthHeaders(),
    // Browser sets Content-Type with boundary for multipart
});

/**
 * AI Gala Service object
 */
export const aiGalaService = {
    // ==================== GALLERIES ====================

    /**
     * Get all galleries
     * @param {object} options - Optional filters
     * @param {string} options.status - Filter by status: 'active', 'voting', 'closed'
     * @param {boolean} options.includeDrafts - Include draft galleries (admin only)
     */
    getGalleries: async (options = {}) => {
        try {
            const params = {};
            if (options.status) params.status = options.status;
            if (options.includeDrafts) params.include_drafts = 'true';

            const response = await axios.get(`${API_URL}/api/aigala/galleries/`, {
                headers: getAuthHeaders(),
                params,
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching galleries:', error);
            throw error;
        }
    },

    /**
     * Get currently active or voting gallery
     */
    getActiveGallery: async () => {
        try {
            const response = await axios.get(`${API_URL}/api/aigala/active/`, {
                headers: getAuthHeaders(),
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching active gallery:', error);
            throw error;
        }
    },

    /**
     * Get gallery detail with all projects
     * @param {number} galleryId
     */
    getGalleryDetail: async (galleryId) => {
        try {
            const response = await axios.get(`${API_URL}/api/aigala/galleries/${galleryId}/`, {
                headers: getAuthHeaders(),
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching gallery detail:', error);
            throw error;
        }
    },

    // ==================== PROJECTS ====================

    /**
     * Get project detail
     * @param {number} projectId
     */
    getProjectDetail: async (projectId) => {
        try {
            const response = await axios.get(`${API_URL}/api/aigala/projects/${projectId}/`, {
                headers: getAuthHeaders(),
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching project detail:', error);
            throw error;
        }
    },

    /**
     * Upload a new project to a gallery
     * @param {number} galleryId
     * @param {FormData} formData - Contains: image, title, description, metadata
     */
    uploadProject: async (galleryId, formData) => {
        try {
            const response = await axios.post(
                `${API_URL}/api/aigala/galleries/${galleryId}/upload/`,
                formData,
                { headers: getMultipartHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error uploading project:', error);
            throw error;
        }
    },

    /**
     * Update own project
     * @param {number} projectId
     * @param {object} data - { title, description, metadata }
     */
    updateProject: async (projectId, data) => {
        try {
            const response = await axios.patch(
                `${API_URL}/api/aigala/projects/${projectId}/update/`,
                data,
                { headers: getJsonHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error updating project:', error);
            throw error;
        }
    },

    /**
     * Delete own project
     * @param {number} projectId
     */
    deleteProject: async (projectId) => {
        try {
            const response = await axios.delete(
                `${API_URL}/api/aigala/projects/${projectId}/delete/`,
                { headers: getAuthHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    },

    // ==================== VOTING ====================

    /**
     * Cast a vote for a project
     * @param {number} projectId
     */
    voteForProject: async (projectId) => {
        try {
            const response = await axios.post(
                `${API_URL}/api/aigala/projects/${projectId}/vote/`,
                {},
                { headers: getJsonHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error voting for project:', error);
            throw error;
        }
    },

    /**
     * Remove a vote from a project
     * @param {number} projectId
     */
    removeVote: async (projectId) => {
        try {
            const response = await axios.delete(
                `${API_URL}/api/aigala/projects/${projectId}/unvote/`,
                { headers: getAuthHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error removing vote:', error);
            throw error;
        }
    },

    // ==================== COMMENTS ====================

    /**
     * Get comments for a project
     * @param {number} projectId
     */
    getComments: async (projectId) => {
        try {
            const response = await axios.get(
                `${API_URL}/api/aigala/projects/${projectId}/comments/`,
                { headers: getAuthHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching comments:', error);
            throw error;
        }
    },

    /**
     * Add a comment to a project
     * @param {number} projectId
     * @param {string} content
     */
    addComment: async (projectId, content) => {
        try {
            const response = await axios.post(
                `${API_URL}/api/aigala/projects/${projectId}/comments/add/`,
                { content },
                { headers: getJsonHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    },

    /**
     * Delete a comment
     * @param {number} commentId
     */
    deleteComment: async (commentId) => {
        try {
            const response = await axios.delete(
                `${API_URL}/api/aigala/comments/${commentId}/delete/`,
                { headers: getAuthHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }
    },

    // ==================== DASHBOARD DATA ====================

    /**
     * Get my AI Gala summary for dashboard
     */
    getMyGalaData: async () => {
        try {
            const response = await axios.get(`${API_URL}/api/aigala/my-data/`, {
                headers: getAuthHeaders(),
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching my gala data:', error);
            throw error;
        }
    },

    // ==================== TEACHER/ADMIN ENDPOINTS ====================

    /**
     * Teacher: Upload project for a student in their assigned schools
     * @param {number} galleryId
     * @param {FormData} formData - Contains: student_id, image, title, description
     */
    teacherUploadProject: async (galleryId, formData) => {
        try {
            const response = await axios.post(
                `${API_URL}/api/aigala/teacher/galleries/${galleryId}/upload/`,
                formData,
                { headers: getMultipartHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error teacher uploading project:', error);
            throw error;
        }
    },

    // ==================== ADMIN ENDPOINTS ====================

    /**
     * Admin: Upload project for a student
     * @param {number} galleryId
     * @param {FormData} formData - Contains: student_id, image, title, description
     */
    adminUploadProject: async (galleryId, formData) => {
        try {
            const response = await axios.post(
                `${API_URL}/api/aigala/admin/galleries/${galleryId}/upload/`,
                formData,
                { headers: getMultipartHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error admin uploading project:', error);
            throw error;
        }
    },

    /**
     * Admin: Calculate winners for a gallery
     * @param {number} galleryId
     */
    adminCalculateWinners: async (galleryId) => {
        try {
            const response = await axios.post(
                `${API_URL}/api/aigala/admin/galleries/${galleryId}/calculate-winners/`,
                {},
                { headers: getJsonHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error calculating winners:', error);
            throw error;
        }
    },

    /**
     * Admin: Get gallery statistics
     * @param {number} galleryId
     */
    adminGetGalleryStats: async (galleryId) => {
        try {
            const response = await axios.get(
                `${API_URL}/api/aigala/admin/galleries/${galleryId}/stats/`,
                { headers: getAuthHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching gallery stats:', error);
            throw error;
        }
    },

    /**
     * Admin: Create a new gallery
     * @param {FormData} formData
     */
    adminCreateGallery: async (formData) => {
        try {
            const response = await axios.post(
                `${API_URL}/api/aigala/galleries/create/`,
                formData,
                { headers: getMultipartHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error creating gallery:', error);
            throw error;
        }
    },

    /**
     * Admin: Update gallery status
     * @param {number} galleryId
     * @param {string} status - 'draft', 'active', 'voting', 'closed'
     */
    adminUpdateGalleryStatus: async (galleryId, status) => {
        try {
            const response = await axios.post(
                `${API_URL}/api/aigala/galleries/${galleryId}/status/`,
                { status },
                { headers: getJsonHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error updating gallery status:', error);
            throw error;
        }
    },

    // ==================== PDF DOWNLOADS ====================

    /**
     * Admin: Download participation report PDF
     * @param {number} galleryId
     */
    downloadParticipationReport: async (galleryId) => {
        try {
            const response = await axios.get(
                `${API_URL}/api/aigala/admin/galleries/${galleryId}/participation-report/`,
                {
                    headers: getAuthHeaders(),
                    responseType: 'blob',
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error downloading participation report:', error);
            throw error;
        }
    },

    /**
     * Download certificate for a project
     * @param {number} projectId
     */
    downloadCertificate: async (projectId) => {
        try {
            const response = await axios.get(
                `${API_URL}/api/aigala/projects/${projectId}/certificate/`,
                {
                    headers: getAuthHeaders(),
                    responseType: 'blob',
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error downloading certificate:', error);
            throw error;
        }
    },

    /**
     * Admin: Download all certificates as ZIP
     * @param {number} galleryId
     */
    downloadAllCertificates: async (galleryId) => {
        try {
            const response = await axios.get(
                `${API_URL}/api/aigala/admin/galleries/${galleryId}/certificates/`,
                {
                    headers: getAuthHeaders(),
                    responseType: 'blob',
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error downloading all certificates:', error);
            throw error;
        }
    },
};

export default aiGalaService;
