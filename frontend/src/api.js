// ============================================
// CENTRALIZED API CONFIGURATION & HELPERS
// MERGED VERSION: Combines existing functionality with standardized helpers
// Location: frontend/src/api.js
// ============================================

import axios from "axios";
import { taskAPI, taskHelpers } from "./api/tasks";

// ============================================
// BASE CONFIGURATION
// ============================================

export const API_URL = process.env.REACT_APP_API_URL;

// ============================================
// AUTHENTICATION HELPERS
// ============================================

/**
 * Get authentication headers with Bearer token
 * @returns {Object} Headers object with Authorization
 */
export const getAuthHeaders = () => {
    const token = localStorage.getItem("access");
    if (!token) {
        console.error("❌ No authentication token found!");
        return {};
    }
    return { Authorization: `Bearer ${token}` };
};

/**
 * Get headers for JSON requests (Auth + Content-Type)
 * @returns {Object} Headers with Authorization and Content-Type
 */
export const getJsonHeaders = () => {
    return {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
    };
};

/**
 * Get headers for multipart/form-data requests (file uploads)
 * Browser automatically sets Content-Type with boundary
 * @returns {Object} Headers with Authorization only
 */
export const getMultipartHeaders = () => {
    return {
        ...getAuthHeaders(),
    };
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if access token exists
 */
export const isAuthenticated = () => {
    return !!localStorage.getItem("access");
};

// ============================================
// AUTHENTICATION & SESSION MANAGEMENT
// ============================================

/**
 * Logout user and clear all stored data
 */
export const logout = () => {
    // Clear stored authentication data
    localStorage.clear();  
    sessionStorage.clear();  

    // Clear browser cache
    caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
    });

    // Redirect to login page
    window.location.href = "/login";
};

/**
 * Redirect user based on their role
 */
export const redirectUser = () => {
    const token = localStorage.getItem("access");
    const role = localStorage.getItem("role");

    if (!token) {
        window.location.href = "/login";
        return;
    }

    switch (role) {
        case "Admin":
            window.location.href = "/admindashboard";
            break;
        case "Teacher":
            window.location.href = "/teacherdashboard";
            break;
        case "Student":
            window.location.href = "/student-dashboard";
            break;
        case "BDM":
            window.location.href = "/crm/dashboard";
            break;
        default:
            window.location.href = "/login";
    }
};

/**
 * Get current user from localStorage (synchronous version)
 * @returns {Object|null} User data from localStorage
 */
export const getAuthUser = () => {
    try {
        const user = {
            fullName: localStorage.getItem("fullName"),
            role: localStorage.getItem("role"),
            email: localStorage.getItem("email"),
            userId: localStorage.getItem("userId")
        };
        return user;
    } catch (error) {
        console.error("❌ Error getting user data:", error);
        return null;
    }
};

/**
 * Fetch logged-in user data
 * @returns {Promise<Object|null>} User data or null on error
 */
export const getLoggedInUser = async () => {
    try {
        console.log("📡 Fetching logged-in user...");
        const response = await axios.get(`${API_URL}/api/auth/user/`, {
            headers: getAuthHeaders(),
        });

        console.log("✅ Logged-in User Data:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching user:", error.response?.data || error.message);
        return null;
    }
};

// ============================================
// STUDENT MANAGEMENT
// ============================================

/**
 * Fetch students with filters
 * @param {string} schoolName - School name to filter by
 * @param {string} studentClass - Class to filter by
 * @returns {Promise<Array>} Array of students
 */
export const getStudents = async (schoolName = "", studentClass = "") => {
    console.log("📡 Requesting students with filters:", { schoolName, studentClass });

    if (!schoolName) {
        console.error("❌ No school selected! Request cannot proceed.");
        return [];
    }

    const params = {
        school: schoolName,
        class: studentClass ? String(studentClass) : "",
        status: "Active",
    };

    try {
        const response = await axios.get(`${API_URL}/api/students/`, {
            headers: getAuthHeaders(),
            params: params
        });

        console.log("✅ Students API Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching students:", error.response?.data || error.message);
        return [];
    }
};

/**
 * Update a student
 * @param {number} id - Student ID
 * @param {Object} studentData - Updated student data
 * @returns {Promise<Object>} Updated student data
 */
export const updateStudent = async (id, studentData) => {
    try {
        const response = await axios.put(`${API_URL}/api/students/${id}/`, studentData, {
            headers: getJsonHeaders()
        });
        return response.data;
    } catch (error) {
        console.error("❌ Error updating student:", error);
        throw error;
    }
};

/**
 * Add a new student
 * @param {Object} studentData - New student data
 * @returns {Promise<Object>} Created student data
 */
export const addStudent = async (studentData) => {
    try {
        console.log("📡 Sending Student Data:", studentData);

        const response = await axios.post(`${API_URL}/api/students/add/`, studentData, {
            headers: getJsonHeaders()
        });

        console.log("✅ API Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error adding student:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Delete a student
 * @param {number} studentId - Student ID
 * @returns {Promise<Object>} Success response
 */
export const deleteStudent = async (studentId) => {
    try {
        console.log("📡 Deleting student with ID:", studentId);
        const response = await axios.delete(`${API_URL}/api/students/${studentId}/`, {
            headers: getAuthHeaders(),
        });
        console.log("✅ Student deleted successfully");
        return response.data;
    } catch (error) {
        console.error("❌ Error deleting student:", error.response?.data || error.message);
        throw error;
    }
};

// ============================================
// SCHOOL MANAGEMENT
// ============================================

/**
 * Fetch all schools
 * @returns {Promise<Array>} Array of schools
 */
export const getSchools = async () => {
    try {
        console.log("📡 Fetching list of schools...");
        
        const response = await axios.get(`${API_URL}/api/schools/`, {
            headers: getJsonHeaders()
        });

        console.log("✅ Schools API Response:", response.data);
        return response.data;
        
    } catch (error) {
        console.error("❌ Error fetching schools:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Fetch school details by ID or name
 * @param {number|null} schoolId - School ID
 * @param {string|null} schoolName - School name
 * @returns {Promise<Object|null>} School details or null
 */
export const getSchoolDetails = async (schoolId = null, schoolName = null) => {
    try {
        const params = schoolId ? { school_id: schoolId } : { school_name: schoolName };
        console.log("📡 Fetching school details with params:", params);

        const response = await axios.get(`${API_URL}/api/school-details/`, {
            headers: getAuthHeaders(),
            params: params
        });

        console.log("✅ School Details Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching school details:", error.response?.data || error.message);
        return null;
    }
};

/**
 * Fetch schools with their classes
 * @returns {Promise<Array>} Array of schools with classes
 */
export const getSchoolsWithClasses = async () => {
    try {
        console.log("📡 Fetching schools with classes...");

        const response = await axios.get(`${API_URL}/api/schools-with-classes/`, {
            headers: getJsonHeaders()
        });

        console.log("✅ Schools with Classes API Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching schools with classes:", error.response?.data || error.message);
        throw error;
    }
};

// ============================================
// CLASS MANAGEMENT
// ============================================

/**
 * Fetch classes for a specific school
 * @param {number} schoolId - School ID
 * @returns {Promise<Array>} Sorted array of unique classes
 */
export const getClasses = async (schoolId) => {
    try {
        if (!schoolId) {
            console.error("❌ No school ID provided for class fetch!");
            return [];
        }

        console.log(`📡 Fetching classes for school ID: ${schoolId}...`);
        
        const response = await axios.get(`${API_URL}/api/classes/`, {
            headers: getJsonHeaders(),
            params: { school: schoolId }
        });

        console.log("✅ Classes API Response:", response.data);

        // Remove duplicates & sort classes in ascending order
        const uniqueSortedClasses = [...new Set(response.data)].sort((a, b) => a.localeCompare(b));

        return uniqueSortedClasses;

    } catch (error) {
        console.error("❌ Error fetching classes:", error.response?.data || error.message);
        return [];
    }
};

/**
 * Get class image count for a school
 * @param {number} schoolId - School ID
 * @returns {Promise<Object|null>} Image count data or null
 */
export const getClassImageCount = async (schoolId) => {
    try {
        const response = await axios.get(`${API_URL}/api/class-image-count/`, {
            headers: getAuthHeaders(),
            params: { school_id: schoolId }
        });
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching weekly image counts:", error.response?.data || error.message);
        return null;
    }
};

// ============================================
// LESSON MANAGEMENT
// ============================================

/**
 * Fetch lessons for a specific date, school, and class
 * @param {string} sessionDate - Session date (YYYY-MM-DD)
 * @param {number} schoolId - School ID
 * @param {string} studentClass - Student class
 * @returns {Promise<Object>} Lesson data
 */
export const getLessons = async (sessionDate, schoolId, studentClass) => {
    if (!sessionDate || !schoolId || !studentClass) {
        console.error("❌ Missing sessionDate, schoolId, or studentClass in API call");
        throw new Error("sessionDate, schoolId, and studentClass are required to fetch lessons.");
    }

    try {
        const apiUrl = `${API_URL}/api/lesson-plan/${sessionDate}/${schoolId}/${studentClass}/`;
        console.log("📡 API Request:", apiUrl);
        
        const response = await axios.get(apiUrl, { headers: getAuthHeaders() });
        
        console.log("✅ Lessons API Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching lessons:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Add a new lesson
 * @param {Object} lessonData - Lesson data
 * @returns {Promise<Object>} Created lesson
 */
export const addLesson = async (lessonData) => {
    try {
        console.log("📡 Adding lesson:", lessonData);
        const response = await axios.post(`${API_URL}/api/lessons/create/`, lessonData, {
            headers: getJsonHeaders(),
        });
        console.log("✅ Lesson added successfully:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error adding lesson:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Update an existing lesson
 * @param {number} lessonId - Lesson ID
 * @param {Object} updatedData - Updated lesson data
 * @returns {Promise<Object>} Updated lesson
 */
export const updateLesson = async (lessonId, updatedData) => {
    try {
        console.log(`📡 Updating lesson ID: ${lessonId}...`);
        const response = await axios.put(`${API_URL}/api/lessons/${lessonId}/`, updatedData, {
            headers: getJsonHeaders(),
        });
        console.log("✅ Lesson updated:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error updating lesson:", error.response?.data || error.message);
        throw error;
    }
};

// ============================================
// FINANCIAL MANAGEMENT
// ============================================

/**
 * Fetch all transactions
 * @returns {Promise<Array>} Array of transactions
 */
export const getTransactions = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/transactions/`, {
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching transactions:", error.response?.data || error.message);
        return [];
    }
};

// ============================================
// ROBOT CHAT
// ============================================

/**
 * Send message to robot chat
 * @param {string} message - Message to send
 * @returns {Promise<string>} Robot reply
 */
export const sendMessageToRobot = async (message) => {
    try {
        const response = await axios.post(`${API_URL}/api/robot-reply/`, {
            message: message,
        });
        return response.data.reply;
    } catch (error) {
        console.error("❌ Error sending message:", error);
        return "Sorry, something went wrong.";
    }
};

// ============================================
// NAMED EXPORT OBJECT (for convenience)
// ============================================

export const apiExports = {
    // Configuration
    API_URL,
    
    // Auth Helpers
    getAuthHeaders,
    getJsonHeaders,
    getMultipartHeaders,
    isAuthenticated,
    
    // Authentication
    logout,
    redirectUser,
    getLoggedInUser,
    getAuthUser,
    
    // Students
    getStudents,
    updateStudent,
    addStudent,
    deleteStudent,
    
    // Schools
    getSchools,
    getSchoolDetails,
    getSchoolsWithClasses,
    
    // Classes
    getClasses,
    getClassImageCount,
    
    // Lessons
    getLessons,
    addLesson,
    updateLesson,
    
    // Tasks
    taskAPI,
    taskHelpers,
    
    // Finance
    getTransactions,
    
    // Robot Chat
    sendMessageToRobot,
};