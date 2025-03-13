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

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setSelectedFile(file);
    };

    const handleFileUpload = async (studentId) => {
        if (!selectedFile) {
            toast.error("Please select a file first.");
            return;
        }

        setIsUploading(prev => ({ ...prev, [studentId]: true }));
        const formData = new FormData();
        formData.append("image", selectedFile);
        formData.append("student_id", studentId);
        formData.append("session_date", sessionDate);

        try {
            const response = await axios.post(`${API_URL}/api/upload-student-image/`, formData, {
                headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders() },
            });
            console.log("Uploaded image URL:", response.data.image_url);
            setUploadedImages(prev => ({
                ...prev,
                [studentId]: response.data.image_url
            }));

            toast.success("Image uploaded successfully!");
        } catch (error) {
            console.error("❌ Error uploading image:", error.response?.data || error.message);
            toast.error("Failed to upload image.");
        } finally {
            setIsUploading(prev => ({ ...prev, [studentId]: false }));
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
        try {
            // Fetch lesson plan
            const teacherId = user.id;
            const schoolId = selectedSchool;
            const requestUrl = `${API_URL}/api/lesson-plan-range/?start_date=${sessionDate}&end_date=${sessionDate}&school_id=${schoolId}&student_class=${studentClass}&teacher_id=${teacherId}`;
            const lessonResponse = await axios.get(requestUrl, {
                headers: getAuthHeaders(),
            });
    
            if (lessonResponse.data.length === 0) {
                setLessonPlanData(null);
                setPlannedTopic("No lesson planned.");
            } else {
                const data = lessonResponse.data[0];
                setLessonPlanData(data);
                setPlannedTopic(data.planned_topic);
            }
    
            // Fetch students with attendance data
            const response = await axios.get(`${API_URL}/api/students-prog/`, {
                params: {
                    school_id: selectedSchool,
                    class_id: studentClass,
                    session_date: sessionDate
                },
                headers: getAuthHeaders(),
            });
    
            const fetchedStudents = response.data.students || [];
            setStudents(fetchedStudents);
            setLessonPlan(response.data.lesson_plan || null);
    
            // Initialize attendanceData and achievedLessons with fetched data
            const newAttendanceData = {};
            const newAchievedLessons = {};
            fetchedStudents.forEach(student => {
                if (student.attendance_status) {
                    newAttendanceData[student.id] = { status: student.attendance_status };
                }
                if (student.achieved_topic) {
                    newAchievedLessons[student.id] = student.achieved_topic;
                }
            });
            setAttendanceData(newAttendanceData);
            setAchievedLessons(newAchievedLessons);
    
            if (fetchedStudents.length > 0) {
                setShowTable(true);
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
            <h2 className="title text-3xl font-bold text-gray-800 mb-8">Session Progress</h2>

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
                    className="button bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors self-end"
                    disabled={isUserLoading || isSearching}
                >
                    {isSearching ? "Searching..." : "Search"}
                </button>
            </div>

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
                        {students.map(student => (
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
                                                    onChange={(event) => handleFileSelect(event)}
                                                />
                                                <button
                                                    className="button action-button browse"
                                                    onClick={() => openFileDialog(student.id)}
                                                >
                                                    Browse
                                                </button>
                                                <button
                                                    className="button action-button upload"
                                                    onClick={() => handleFileUpload(student.id)}
                                                    disabled={isUploading[student.id] || !selectedFile}
                                                >
                                                    {isUploading[student.id] ? "Uploading..." : "Upload"}
                                                </button>
                                                {uploadedImages[student.id] && (
                                                    <>
                                                        <img src={uploadedImages[student.id]} alt="Uploaded" className="w-20 h-20 rounded-lg" />
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
                        ))}
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