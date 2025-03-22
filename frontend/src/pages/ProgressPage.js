import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { getSchools, getClasses } from "../api";
import { getAuthHeaders } from "../api";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import { useAuth } from "../auth";



const API_URL = process.env.REACT_APP_API_URL;
console.log("API URL:", process.env.REACT_APP_API_URL);



const ProgressPage = () => {
    const { user } = useAuth();
    console.log("User object:", user);
    const [schools, setSchools] = useState([]);
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [attendanceData, setAttendanceData] = useState({});
    const [achievedLessons, setAchievedLessons] = useState({});
    const [sessionDate, setSessionDate] = useState("");
    const [selectedSchool, setSelectedSchool] = useState("");
    const [studentClass, setStudentClass] = useState("");
    const [plannedTopic, setPlannedTopic] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [lessonPlan, setLessonPlan] = useState(null);
    const [lessonPlanData, setLessonPlanData] = useState(null);
    const [showTable, setShowTable] = useState(false);
    const [uploadedImages, setUploadedImages] = useState({});
    const [expandedStudent, setExpandedStudent] = useState(null);
    const fileInputRefs = useRef({});
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState({});
    const [error, setError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [isUserLoading, setIsUserLoading] = useState(true); // Add this state
    const [loadingStudent, setLoadingStudent] = useState(""); 
    const [selectedFiles, setSelectedFiles] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const studentsPerPage = 5; // Number of students per page
    const indexOfLastStudent = currentPage * studentsPerPage;
    const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
    const currentStudents = students.slice(indexOfFirstStudent, indexOfLastStudent);
    


    // Fetch assigned schools for the logged-in teacher
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getSchools();
                if (!Array.isArray(data)) {
                    throw new Error("Invalid schools data format.");
                }
                setSchools(data);
            } catch (err) {
                const errorMessage = err.message || "Failed to load schools.";
                setError(errorMessage);
                toast.error(errorMessage);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        const checkUser = async () => {
            if (!user) {
                setIsUserLoading(true);
                // Optional: Retry fetching user data if needed
                try {
                    // Simulate a delay or retry logic if useAuth doesn't handle it
                    setTimeout(() => {
                        setIsUserLoading(false);
                    }, 1000); // Adjust delay as needed
                } catch (error) {
                    console.error("Error checking user:", error);
                    setIsUserLoading(false);
                }
            } else {
                setIsUserLoading(false);
            }
        };
        checkUser();
    }, [user]);

    useEffect(() => {
        async function fetchClassesBySchool() {
            if (!selectedSchool) return;

            try {
                const response = await getClasses(selectedSchool);
                if (Array.isArray(response)) {
                    const uniqueClasses = [...new Set(response)].sort((a, b) => a - b);
                    const formattedClasses = uniqueClasses.map(cls => ({
                        id: cls,
                        name: `Class ${cls}`
                    }));
                    setClasses([{ id: "", name: "Select Class" }, ...formattedClasses]);
                } else {
                    throw new Error("Invalid classes data format.");
                }
            } catch (err) {
                console.error("❌ Error fetching classes:", err);
                toast.error("Failed to fetch classes.");
            }
        }
        fetchClassesBySchool();
    }, [selectedSchool]);

    const openFileDialog = (studentId) => {
        if (fileInputRefs.current[studentId]) {
            fileInputRefs.current[studentId].click();
        }
    };

    const handleFileSelect = (event, studentId) => {
        if (!event.target.files.length) return;  // Ensure a file is selected
    
        const file = event.target.files[0];
    
        setSelectedFiles(prev => ({
            ...prev,
            [studentId]: file
        }));
    
        console.log(`✅ File selected for student ${studentId}:`, file.name);
    };
    
    

    const handleFileUpload = async (studentId) => {
        if (!selectedFiles[studentId]) {
            toast.error("Please select a file first.");
            return;
        }
    
        setIsUploading(prev => ({ ...prev, [studentId]: true }));  // Set Uploading state
        const formData = new FormData();
        formData.append("image", selectedFiles[studentId]);
        formData.append("student_id", studentId);
        formData.append("session_date", sessionDate);
    
        try {
            const response = await axios.post(`${API_URL}/api/upload-student-image/`, formData, {
                headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders() },
            });
    
            setUploadedImages(prev => ({
                ...prev,
                [studentId]: response.data.image_url
            }));
    
            toast.success("Image uploaded successfully!");
        } catch (error) {
            console.error("❌ Error uploading image:", error.response?.data || error.message);
            toast.error("Failed to upload image.");
        } finally {
            setIsUploading(prev => ({ ...prev, [studentId]: false }));  // Reset Uploading state
        }
    };
    
    

    const handleFileDelete = (studentId) => {
        setUploadedImages(prev => {
            const updated = { ...prev };
            delete updated[studentId];
            return updated;
        });
        setSelectedFile(null);
        if (fileInputRefs.current[studentId]) {
            fileInputRefs.current[studentId].value = null;
        }
    };

    const handleSearch = async () => {
        if (!sessionDate || !selectedSchool || !studentClass) {
            toast.error("Please select a date, school, and class before searching.");
            return;
        }
    
        setIsSearching(true);
        toast.info("Fetching student and lesson data...");
    
        try {
            // Clear previous state
            setAttendanceData({});
            setAchievedLessons({});
            setStudents([]);
            setLessonPlan(null);
            setShowTable(false);
            setUploadedImages({});
            setPlannedTopic(""); // Reset previous topic
            setLoadingStudent(""); // Reset student name display
    
            console.log("Raw sessionDate (YYYY-MM-DD):", sessionDate);
    
            // Format date for API (MM/DD/YYYY format)
            const [year, month, day] = sessionDate.split("-");
            if (!year || !month || !day) {
                throw new Error("Invalid date format in sessionDate. Expected YYYY-MM-DD.");
            }
            const formattedDate = `${month}/${day}/${year}`;
            console.log("Formatted sessionDate (MM/DD/YYYY):", formattedDate);
    
            // 🔹 Fetch Student Data
            const response = await axios.get(`${API_URL}/api/students-prog/`, {
                params: {
                    school_id: selectedSchool,
                    class_id: studentClass,
                    session_date: formattedDate
                },
                headers: getAuthHeaders(),
            });
    
            console.log("API Response (students):", response.data);
    
            const fetchedStudents = response.data.students || [];
            setStudents(fetchedStudents);
            setLessonPlan(response.data.lesson_plan || null);
    
            // Process attendance and achieved lessons
            const newAttendanceData = {};
            const newAchievedLessons = {};
            fetchedStudents.forEach((student, index) => {
                setTimeout(() => {
                    setLoadingStudent(student.name); // Update UI with current student name
            
                    toast.info(`Loading data for ${student.name}...`, {
                        autoClose: 1000, // Message disappears after 1s
                        toastId: `student-${student.id}`, // Prevent duplicate toasts
                    });
            
                    // Process attendance & achieved lessons
                    if (student.status && student.status !== "N/A") {
                        newAttendanceData[student.id] = { status: student.status };
                    }
                    if (student.achieved_topic) {
                        newAchievedLessons[student.id] = student.achieved_topic;
                    }
            
                    // If last student, clear loading message
                    if (index === fetchedStudents.length - 1) {
                        setTimeout(() => setLoadingStudent(""), 1000);
                    }
                }, index * 500); // Stagger messages so they appear one by one
            });
            
    
            setAttendanceData(newAttendanceData);
            setAchievedLessons(newAchievedLessons);
    
            // 🔹 Fetch the Planned Topic from the Lesson Table
            try {
                const lessonResponse = await axios.get(`${API_URL}/api/lesson-plan/${sessionDate}/${selectedSchool}/${studentClass}/`, {
                    headers: getAuthHeaders(),
                });
                
    
                console.log("Lesson Plan API Response:", lessonResponse.data);
    
                if (lessonResponse.data.lessons.length > 0) {
                    setPlannedTopic(lessonResponse.data.lessons[0].planned_topic);
                    console.log("✅ Planned Topic Set:", lessonResponse.data.lessons[0].planned_topic);
                } else {
                    setPlannedTopic("No topic planned for this date.");
                    console.log("❌ No Lesson Plan Found, setting default message.");
                }
                
            } catch (error) {
                console.error("❌ Error fetching planned topic:", error.response?.data || error.message);
                setPlannedTopic("Failed to fetch planned topic.");
            }
    
            // 🔹 Fetch Student Images
            const newUploadedImages = {};
            for (const student of fetchedStudents) {
                try {
                    const imageResponse = await axios.get(`${API_URL}/api/student-images/`, {
                        params: {
                            student_id: student.id,
                            session_date: sessionDate // Use raw YYYY-MM-DD format
                        },
                        headers: getAuthHeaders(),
                    });
    
                    if (imageResponse.data.images && imageResponse.data.images.length > 0) {
                        newUploadedImages[student.id] = imageResponse.data.images[0];
                    }
                } catch (error) {
                    console.error(`❌ Error fetching images for student ${student.id}:`, error.response?.data || error.message);
                }
            }
    
            setUploadedImages(newUploadedImages);
    
            // 🔹 Show the Table if Data Exists
            if (fetchedStudents.length > 0) {
                setShowTable(true);
                toast.success("Data loaded successfully.");
            } else {
                setShowTable(false);
                toast.info("No students found for the selected criteria.");
            }
        } catch (error) {
            console.error("❌ Error fetching data:", error.response?.data || error.message);
            setError("Failed to fetch data.");
            toast.error("Failed to fetch data. Please try again.");
        } finally {
            setIsSearching(false);
        }
    };
    

    const handleAttendanceChange = (studentId, status) => {
        setAttendanceData({
            ...attendanceData,
            [studentId]: { ...attendanceData[studentId], status }
        });
    };

    const handleAchievedChange = (studentId, topic) => {
        setAchievedLessons({
            ...achievedLessons,
            [studentId]: topic
        });
    };

    const handleSubmit = async () => {
        if (!sessionDate || !selectedSchool || !studentClass) {
            toast.error("Please select a date, school, and class before submitting.");
            return;
        }

        setIsSubmitting(true);
        try {
            let newAttendanceRecords = [];

            const attendanceUpdates = students.map(student => {
                const attendanceId = student.attendance_id || null;
                const status = attendanceData[student.id]?.status || "N/A";
                const achievedTopic = achievedLessons[student.id] || "";
                const lessonPlanId = student.lesson_plan_id || null;

                if (!attendanceId) {
                    newAttendanceRecords.push({
                        student_id: student.id,
                        session_date: sessionDate,
                        status: status,
                        achieved_topic: achievedTopic,
                        lesson_plan_id: lessonPlanId
                    });
                }

                return { attendance_id: attendanceId, status, achieved_topic: achievedTopic, lesson_plan_id: lessonPlanId };
            });

            console.log("Submitting attendance payload:", {
                session_date: sessionDate,
                attendance: newAttendanceRecords
            });

            if (newAttendanceRecords.length > 0) {
                const createResponse = await axios.post(`${API_URL}/api/attendance/`, {
                    session_date: sessionDate,
                    attendance: newAttendanceRecords
                }, {
                    headers: getAuthHeaders(),
                });
                console.log("✅ Attendance response:", createResponse.data);
            }

            for (const update of attendanceUpdates) {
                if (!update.attendance_id) continue;

                await axios.put(`${API_URL}/api/attendance/update/${update.attendance_id}/`, update, {
                    headers: getAuthHeaders(),
                });
            }

            toast.success("Attendance and achieved topics updated successfully!");
        } catch (error) {
            const errorDetails = error.response?.data || error.response || error.message || "Unknown error";
            console.error("❌ Error updating attendance:", errorDetails);
            toast.error(`Failed to update attendance: ${JSON.stringify(errorDetails)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setSessionDate(newDate);
    };

    const toggleAccordion = (studentId) => {
        setExpandedStudent(expandedStudent === studentId ? null : studentId);
    };

    const handleRetry = async () => {
        setIsRetrying(true);
        setError(null);
        setLoading(true);
        setIsRetrying(false);
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center p-6 min-h-screen bg-gray-50">
                <ClipLoader color="#000000" size={50} />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-6 min-h-screen bg-gray-50">
                <ClipLoader color="#000000" size={50} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-red-500 flex flex-col items-center">
                <p>{error}</p>
                <button
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    onClick={handleRetry}
                    disabled={isRetrying}
                    aria-label="Retry fetching data"
                >
                    {isRetrying ? "Retrying..." : "Retry"}
                </button>
            </div>
        );
    }

    return (
        <div className="container p-6 bg-gray-50 min-h-screen">
            <h1 class="heading-primary">SESSION PROGRESS</h1>

            <div className="flex items-center gap-4 mb-8">
                <div className="form-group flex flex-col flex-1 min-w-[200px]">
                    <label className="font-bold mb-2 text-gray-700">Session Date:</label>
                    <input
                        type="date"
                        value={sessionDate}
                        onChange={handleDateChange}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                </div>

                <div className="form-group flex flex-col flex-1 min-w-[200px]">
                    <label className="font-bold mb-2 text-gray-700">School:</label>
                    <select
                        value={selectedSchool}
                        onChange={e => setSelectedSchool(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    >
                        <option value="">Select School</option>
                        {schools.map(school => (
                            <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group flex flex-col flex-1 min-w-[200px]">
                    <label className="font-bold mb-2 text-gray-700">Class:</label>
                    <select
                        value={studentClass}
                        onChange={e => setStudentClass(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    >
                        {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                    </select>
                </div>

                <button
    onClick={handleSearch}
    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
    disabled={isSearching}
>
    {isSearching ? "🔍 Searching..." : "🔍 Fetch Students"}
</button>
            </div>
            {loadingStudent && (
                <div className="text-center text-blue-500 font-semibold my-2">
                    🔄 Loading data for <span className="font-bold">{loadingStudent}</span>...
                </div>
            )}

            {showTable && (
                <>
                    <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                        <strong className="text-gray-700">Planned Lesson:</strong> {plannedTopic}
                        {lessonPlanData && (
                            <>
                                {/* <p><strong>Teacher:</strong> {lessonPlanData.teacher_name}</p>
                                <p><strong>School:</strong> {lessonPlanData.school_name}</p> */}
                            </>
                        )}
                    </div>

                    <div className="accordion">
                        {/* {students.map(student => (
                            <div className="accordion-item" key={student.id}>
                                <div className="accordion-header" onClick={() => toggleAccordion(student.id)}>
                                    <div className="flex items-center justify-between w-full">
                                        <div className="w-[300px] truncate text-gray-600 font-medium" title={student.name}>
                                            {student.name}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button
                                                className={`button attendance-button ${attendanceData[student.id]?.status === "Present" ? "present" : attendanceData[student.id]?.status === "Absent" ? "absent" : ""}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAttendanceChange(student.id,
                                                        attendanceData[student.id]?.status === "Present" ? "Absent" : "Present"
                                                    );
                                                }}
                                            >
                                                {attendanceData[student.id]?.status || "Set Attendance"}
                                            </button>
                                            <span className="accordion-toggle">
                                                {expandedStudent === student.id ? "▼" : "▶"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="accordion-content" style={{ display: expandedStudent === student.id ? "block" : "none" }}>
                                    <div className="flex flex-col gap-4 max-w-md">
                                        <div>
                                            <label className="block font-bold mb-2 text-gray-700">Achieved Lesson:</label>
                                            <textarea
                                                value={achievedLessons[student.id] || ""}
                                                onChange={e => handleAchievedChange(student.id, e.target.value)}
                                                rows="3"
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-vertical"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-bold mb-2 text-gray-700">Upload Image:</label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    ref={(el) => (fileInputRefs.current[student.id] = el)}
                                                    className="hidden"
                                                    onChange={(event) => handleFileSelect(event, student.id)}
                                                />
                                                <button
                                                    className="button action-button browse"
                                                    onClick={() => openFileDialog(student.id)}
                                                >
                                                    Browse
                                                </button>
                                                <button
                                                    className={`button action-button upload ${selectedFiles[student.id] ? 'enabled' : 'disabled'}`}
                                                    onClick={() => handleFileUpload(student.id)}
                                                    disabled={!selectedFiles[student.id] || isUploading[student.id]}
                                                >
                                                    {isUploading[student.id] ? "Uploading..." : "Upload"}
                                                </button>
                                                {uploadedImages[student.id] && (
                                                    <>
                                                        <img 
                                                            src={typeof uploadedImages[student.id] === "object" ? uploadedImages[student.id].signedURL : uploadedImages[student.id]} 
                                                            alt="Uploaded" 
                                                            className="w-20 h-20 rounded-lg border border-gray-300 object-cover"
                                                            onError={(e) => e.target.style.display = "none"} // Hide if image fails to load
                                                        />
                                                        <button
                                                            className="button action-button delete"
                                                            onClick={() => handleFileDelete(student.id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </>
                                                )}

                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))} */}
                        {currentStudents.map(student => (
    <div className="accordion-item" key={student.id}>
        <div className="accordion-header" onClick={() => toggleAccordion(student.id)}>
            <div className="flex items-center justify-between w-full">
                <div className="w-[300px] truncate text-gray-600 font-medium" title={student.name}>
                    {student.name}
                </div>
                <div className="flex items-center gap-4">
                    <button
                        className={`button attendance-button ${
                            attendanceData[student.id]?.status === "Present" ? "present" : "absent"
                        }`}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAttendanceChange(student.id, attendanceData[student.id]?.status === "Present" ? "Absent" : "Present");
                        }}
                    >
                        {attendanceData[student.id]?.status || "Set Attendance"}
                    </button>
                    <span className="accordion-toggle">
                        {expandedStudent === student.id ? "▼" : "▶"}
                    </span>
                </div>
            </div>
        </div>

        {expandedStudent === student.id && (
            <div className="accordion-content">
                <div className="flex flex-col gap-4 max-w-md">
                    <div>
                        <label className="block font-bold mb-2 text-gray-700">Achieved Lesson:</label>
                        <textarea
                            value={achievedLessons[student.id] || ""}
                            onChange={(e) => handleAchievedChange(student.id, e.target.value)}
                            rows="3"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-vertical"
                        />
                    </div>

                    <div>
                        <label className="block font-bold mb-2 text-gray-700">Upload Image:</label>
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="file"
                                accept="image/*"
                                ref={(el) => (fileInputRefs.current[student.id] = el)}
                                className="hidden"
                                onChange={(event) => handleFileSelect(event, student.id)}
                            />
                            <button className="button action-button browse" onClick={() => openFileDialog(student.id)}>
                                Browse
                            </button>
                            <button
                                className={`button action-button upload ${selectedFiles[student.id] ? "enabled" : "disabled"}`}
                                onClick={() => handleFileUpload(student.id)}
                                disabled={!selectedFiles[student.id] || isUploading[student.id]}
                            >
                                {isUploading[student.id] ? "Uploading..." : "Upload"}
                            </button>

                            {uploadedImages[student.id] && (
                                <>
                                    <img
                                        src={typeof uploadedImages[student.id] === "object" ? uploadedImages[student.id].signedURL : uploadedImages[student.id]}
                                        alt="Uploaded"
                                        className="w-20 h-20 rounded-lg border border-gray-300 object-cover"
                                        onError={(e) => (e.target.style.display = "none")}
                                    />
                                    <button className="button action-button delete" onClick={() => handleFileDelete(student.id)}>
                                        Delete
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
))}
<div className="flex justify-center gap-4 mt-4">
    <button 
        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg"
    >
        Previous
    </button>
    <span>Page {currentPage} of {Math.ceil(students.length / studentsPerPage)}</span>
    <button 
        onClick={() => setCurrentPage(prev => (prev < Math.ceil(students.length / studentsPerPage) ? prev + 1 : prev))}
        disabled={currentPage === Math.ceil(students.length / studentsPerPage)}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg"
    >
        Next
    </button>
</div>
    
                    </div>

                    <div className="mt-6 text-right">
                        <button
                            onClick={handleSubmit}
                            className="button bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Submitting..." : "Submit"}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ProgressPage;