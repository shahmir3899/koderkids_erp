import axios from "axios";


export const API_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";


// Helper function to get auth headers
export const getAuthHeaders = () => {
    const token = localStorage.getItem("access");
    if (!token) {
        console.error("❌ No authentication token found!");
        return {};
    }
    return { Authorization: `Bearer ${token}` };
};



export const getStudents = async (schoolName = "", studentClass = "") => {
    console.log("🔍 Requesting students with filters:", { schoolName, studentClass });

    if (!schoolName) {
        console.error("❌ No school selected! Request cannot proceed.");
        return [];
    }

    const params = {
        school: schoolName, // ✅ Use school name, not ID
        class: studentClass ? String(studentClass) : "", // ✅ Ensure class is sent as a string
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




// Fetch schools (now protected)
export const getSchools = async () => {
    try {
        console.log("🔄 Fetching list of schools...");
        
        const response = await axios.get(`${API_URL}/api/schools/`, {
            headers: {
                ...getAuthHeaders(),
                "Content-Type": "application/json"
            }
        });

        console.log("✅ Schools API Response:", response.data);
        return response.data;
        
    } catch (error) {
        console.error("❌ Error fetching schools:", error.response?.data || error.message);
        throw error;
    }
};

//Used in  LessonPage.js
export const getClasses = async (schoolId) => {
    try {
        if (!schoolId) {
            console.error("❌ No school ID provided for class fetch!");
            return [];
        }

        console.log(`🔄 Fetching classes for school ID: ${schoolId}...`);
        
        const response = await axios.get(`${API_URL}/api/classes/`, {
            headers: {
                ...getAuthHeaders(),
                "Content-Type": "application/json"
            },
            params: { school: schoolId } // Pass schoolId as a query parameter
        });

        console.log("✅ Classes API Response:", response.data);

        // ✅ Remove duplicates & sort classes in ascending order
        const uniqueSortedClasses = [...new Set(response.data)].sort((a, b) => a.localeCompare(b));

        return uniqueSortedClasses;  // ✅ Return cleaned list

    } catch (error) {
        console.error("❌ Error fetching classes:", error.response?.data || error.message);
        return [];
    }
};



// Update a student (now protected)
export const updateStudent = async (id, studentData) => {
    try {
        const response = await axios.put(`${API_URL}/api/students/${id}/`, studentData, {
            headers: {
                ...getAuthHeaders(),
                "Content-Type": "application/json"
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error updating student:", error);
        throw error;
    }
};

// Add a new student (now protected)
export const addStudent = async (studentData) => {
    try {
        console.log("🚀 Sending Student Data:", studentData);

        const response = await axios.post(`${API_URL}/api/students/add/`, studentData, {
            headers: {
                ...getAuthHeaders(),
                "Content-Type": "application/json"
            }
        });

        console.log("✅ API Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error adding student:", error.response?.data || error.message);
        throw error;
    }
};

// Delete a student (now protected)
export const deleteStudent = async (studentId) => {
    try {
        console.log("🗑️ Deleting student with ID:", studentId);
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

// ✅ Lesson Management API Functions
export const getLessons = async (sessionDate, schoolId, studentClass) => {
    if (!sessionDate || !schoolId || !studentClass) {
        console.error("❌ Missing sessionDate, schoolId, or studentClass in API call");
        throw new Error("sessionDate, schoolId, and studentClass are required to fetch lessons.");
    }

    try {
        const apiUrl = `${API_URL}/api/lesson-plan/${sessionDate}/${schoolId}/${studentClass}/`;
        console.log("📡 API Request:", apiUrl);  // ✅ Debug request URL
        
        const response = await axios.get(apiUrl, { headers: getAuthHeaders() });
        
        console.log("✅ Lessons API Response:", response.data);  // ✅ Debug API response
        console.log("🔗 API_URL (inside getLessons):", API_URL);
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching lessons:", error.response?.data || error.message);
        throw error;
    }
};



export const addLesson = async (lessonData) => {
    try {
        console.log("🚀 Adding lesson:", lessonData);
        const response = await axios.post(`${API_URL}/api/lesson-plan/`, lessonData, {
            headers: {
                ...getAuthHeaders(),
                "Content-Type": "application/json",
            },
        });
        console.log("✅ Lesson added successfully:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error adding lesson:", error.response?.data || error.message);
        throw error;
    }
};

export const updateLesson = async (lessonId, updatedData) => {
    try {
        console.log(`✏️ Updating lesson ID: ${lessonId}...`);
        const response = await axios.put(`${API_URL}/api/lessons/${lessonId}/`, updatedData, {
            headers: {
                ...getAuthHeaders(),
                "Content-Type": "application/json",
            },
        });
        console.log("✅ Lesson updated:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error updating lesson:", error.response?.data || error.message);
        throw error;
    }
};

// ✅ Fetch Logged-in User (Teacher)
export const getLoggedInUser = async () => {
    try {
        console.log("🔄 Fetching logged-in user...");
        const response = await axios.get(`${API_URL}/api/user/`, {
            headers: getAuthHeaders(),
        });

        console.log("✅ Logged-in User Data:", response.data);
        return response.data; // Response should contain the teacher ID
    } catch (error) {
        console.error("❌ Error fetching user:", error.response?.data || error.message);
        return null; // Handle errors gracefully
    }
};
