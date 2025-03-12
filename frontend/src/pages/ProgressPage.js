import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import { getSchools, getClasses } from "../api";
import { getAuthHeaders } from "../api";
import { ClipLoader } from "react-spinners"; // Import ClipLoader
import { toast } from "react-toastify"; // Import toast for notifications

const API_URL = process.env.REACT_APP_API_URL;
console.log("API URL:", process.env.REACT_APP_API_URL);

// Styled Components for better UI
const Container = styled.div`
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
    font-family: Arial, sans-serif;
`;

const Title = styled.h2`
    text-align: center;
    color: #333;
    margin-bottom: 20px;
`;

const FormGroup = styled.div`
    margin-bottom: 15px;
    label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
        color: #555;
    }
    input,
    select,
    textarea {
        width: 100%;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
    }
    textarea {
        resize: vertical;
        height: 80px;
    }
`;

const Accordion = styled.div`
    width: 100%;
    margin-top: 20px;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
`;

const AccordionItem = styled.div`
    border-bottom: 1px solid #ddd;
    &:last-child {
        border-bottom: none;
    }
`;

const AccordionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background-color: #f4f4f4;
    cursor: pointer;
    &:hover {
        background-color: #e9ecef;
    }
`;

const AccordionContent = styled.div`
    padding: 12px;
    background-color: #fff;
    display: ${props => (props.isOpen ? "block" : "none")};
`;

const AccordionToggle = styled.span`
    font-size: 16px;
    color: #555;
`;

const Button = styled.button`
    padding: 10px;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    margin: 0 5px;
    &:hover {
        opacity: 0.9;
    }
    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

const AttendanceButton = styled(Button)`
    background-color: ${props =>
        props.status === "Present"
            ? "#28a745"
            : props.status === "Absent"
            ? "#dc3545"
            : "#6c757d"};
    &:hover {
        background-color: ${props =>
            props.status === "Present"
                ? "#218838"
                : props.status === "Absent"
                ? "#c82333"
                : "#5a6268"};
    }
`;

const ActionButton = styled(Button)`
    background-color: ${props =>
        props.type === "browse"
            ? "#007bff"
            : props.type === "upload"
            ? "#28a745"
            : props.type === "delete"
            ? "#dc3545"
            : "#6c757d"};
    &:hover {
        background-color: ${props =>
            props.type === "browse"
                ? "#0056b3"
                : props.type === "upload"
                ? "#218838"
                : props.type === "delete"
                ? "#c82333"
                : "#5a6268"};
    }
`;

const ProgressPage = () => {
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
    const [showTable, setShowTable] = useState(false);
    const [uploadedImages, setUploadedImages] = useState({});
    const [expandedStudent, setExpandedStudent] = useState(null);
    const fileInputRefs = useRef({});
    const [loading, setLoading] = useState(true); // Global loading state
    const [isSearching, setIsSearching] = useState(false); // Search loading state
    const [isSubmitting, setIsSubmitting] = useState(false); // Submit loading state
    const [isUploading, setIsUploading] = useState({}); // Upload loading state per student
    const [error, setError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false); // Retry loading state

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
            const response = await axios.get(`${API_URL}/api/students-prog/`, {
                params: {
                    school_id: selectedSchool,
                    class_id: studentClass,
                    session_date: sessionDate
                },
                headers: getAuthHeaders(),
            });

            setStudents(response.data.students || []);
            setLessonPlan(response.data.lesson_plan || null);

            if (response.data.students.length > 0) {
                setShowTable(true);
            } else {
                setShowTable(false);
                toast.info("No students found for the selected criteria.");
            }
        } catch (error) {
            console.error("❌ Error fetching students:", error.response?.data || error.message);
            setError("Failed to fetch students.");
            toast.error("Failed to fetch students. Please try again.");
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
                const status = attendanceData[student.id] || "N/A";
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

            if (newAttendanceRecords.length > 0) {
                const createResponse = await axios.post(`${API_URL}/api/attendance/`, {
                    session_date: sessionDate,
                    attendance: newAttendanceRecords
                }, {
                    headers: getAuthHeaders(),
                });
                console.log("✅ Attendance records created:", createResponse.data);
            }

            for (const update of attendanceUpdates) {
                if (!update.attendance_id) continue;

                await axios.put(`${API_URL}/api/attendance/update/${update.attendance_id}/`, update, {
                    headers: getAuthHeaders(),
                });
            }

            toast.success("Attendance and achieved topics updated successfully!");
        } catch (error) {
            console.error("❌ Error updating attendance:", error.response?.data || error.message);
            toast.error("Failed to update attendance.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDateChange = async (e) => {
        const newDate = e.target.value;
        setSessionDate(newDate);

        if (!studentClass || !selectedSchool) {
            toast.warn("School and class must be selected before fetching lesson plan.");
            return;
        }

        const schoolId = selectedSchool;

        try {
            const requestUrl = `${API_URL}/api/lesson-plan-range/?start_date=${newDate}&end_date=${newDate}&school_id=${schoolId}&student_class=${studentClass}`;
            const lessonResponse = await axios.get(requestUrl, {
                headers: getAuthHeaders(),
            });

            if (lessonResponse.data.length === 0) {
                setPlannedTopic("No lesson planned.");
                return;
            }

            setPlannedTopic(lessonResponse.data[0].planned_topic);
        } catch (error) {
            console.error("❌ Error fetching lesson plan:", error.response?.data || error.message);
            setPlannedTopic("Error fetching lesson.");
            toast.error("Failed to fetch lesson plan.");
        }
    };

    const toggleAccordion = (studentId) => {
        setExpandedStudent(expandedStudent === studentId ? null : studentId);
    };

    const handleRetry = async () => {
        setIsRetrying(true);
        setError(null);
        setLoading(true); // Trigger re-fetch of initial data
        setIsRetrying(false);
    };

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
        <Container className="p-6 bg-gray-50 min-h-screen">
            {/* Title */}
            <Title className="text-3xl font-bold text-gray-800 mb-8">Session Progress</Title>

            {/* Filters Row with Proper Alignment */}
            <div className="flex items-center gap-4 mb-8">
                {/* Session Date */}
                <FormGroup className="flex flex-col flex-1 min-w-[200px]">
                    <label className="font-bold mb-2 text-gray-700">Session Date:</label>
                    <input
                        type="date"
                        value={sessionDate}
                        onChange={handleDateChange}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                </FormGroup>

                {/* School Selector */}
                <FormGroup className="flex flex-col flex-1 min-w-[200px]">
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
                </FormGroup>

                {/* Class Selector */}
                <FormGroup className="flex flex-col flex-1 min-w-[200px]">
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
                </FormGroup>

                {/* Search Button */}
                <Button
                    onClick={handleSearch}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors self-end"
                    disabled={isSearching}
                >
                    {isSearching ? "Searching..." : "Search"}
                </Button>
            </div>

            {showTable && (
                <>
                    {/* Planned Lesson */}
                    <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                        <strong className="text-gray-700">Planned Lesson:</strong> {plannedTopic}
                    </div>

                    {/* Accordion for Students */}
                    <Accordion>
                        {students.map(student => (
                            <AccordionItem key={student.id}>
                                <AccordionHeader onClick={() => toggleAccordion(student.id)}>
                                    <div className="flex items-center justify-between w-full">
                                        {/* Fixed-width Name with Truncation */}
                                        <div className="w-[300px] truncate text-gray-600 font-medium" title={student.name}>
                                            {student.name}
                                        </div>
                                        {/* Attendance Button and Toggle */}
                                        <div className="flex items-center gap-4">
                                            <AttendanceButton
                                                status={attendanceData[student.id]?.status || "Set Attendance"}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAttendanceChange(student.id,
                                                        attendanceData[student.id]?.status === "Present" ? "Absent" : "Present"
                                                    );
                                                }}
                                            >
                                                {attendanceData[student.id]?.status || "Set Attendance"}
                                            </AttendanceButton>
                                            <AccordionToggle>
                                                {expandedStudent === student.id ? "▼" : "▶"}
                                            </AccordionToggle>
                                        </div>
                                    </div>
                                </AccordionHeader>

                                <AccordionContent isOpen={expandedStudent === student.id}>
                                    <div className="flex flex-col gap-4 max-w-md">
                                        {/* Achieved Lesson */}
                                        <div>
                                            <label className="block font-bold mb-2 text-gray-700">Achieved Lesson:</label>
                                            <textarea
                                                value={achievedLessons[student.id] || ""}
                                                onChange={e => handleAchievedChange(student.id, e.target.value)}
                                                rows="3"
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-vertical"
                                            />
                                        </div>

                                        {/* Upload Image Section */}
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
                                                <ActionButton
                                                    type="browse"
                                                    onClick={() => openFileDialog(student.id)}
                                                >
                                                    Browse
                                                </ActionButton>
                                                <ActionButton
                                                    type="upload"
                                                    onClick={() => handleFileUpload(student.id)}
                                                    disabled={isUploading[student.id] || !selectedFile}
                                                >
                                                    {isUploading[student.id] ? "Uploading..." : "Upload"}
                                                </ActionButton>
                                                {uploadedImages[student.id] && (
                                                    <>
                                                        <img src={uploadedImages[student.id]} alt="Uploaded" className="w-20 h-20 rounded-lg" />
                                                        <ActionButton
                                                            type="delete"
                                                            onClick={() => handleFileDelete(student.id)}
                                                        >
                                                            Delete
                                                        </ActionButton>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>

                    {/* Submit Button */}
                    <div className="mt-6 text-right">
                        <Button
                            onClick={handleSubmit}
                            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Submitting..." : "Submit"}
                        </Button>
                    </div>
                </>
            )}
        </Container>
    );
};

export default ProgressPage;