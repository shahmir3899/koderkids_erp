import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { getSchools, getClasses } from "../api"; // ✅ Import API function
import { getAuthHeaders } from "../api";  // Import auth headers function
//import { API_URL } from "../.env";  // Import API URL (if stored in config)
const API_URL = process.env.REACT_APP_API_URL ;
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
    input, select, textarea {
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

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    th, td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
    }
    th {
        background-color: #f4f4f4;
        font-weight: bold;
        color: #333;
    }
    tr:hover {
        background-color: #f9f9f9;
    }
    select, input {
        width: 100%;
        padding: 6px;
        border: 1px solid #ccc;
        border-radius: 4px;
    }
`;

const Button = styled.button`
    padding: 10px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
    margin-top: 20px;
    &:hover {
        background-color: #218838;
    }
`;

const ProgressPage = () => {
    const [schools, setSchools] = useState([]);
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [attendanceData, setAttendanceData] = useState({});
    const [achievedLessons, setAchievedLessons] = useState({});
    const [sessionDate, setSessionDate] = useState('');
    const [selectedSchool, setSelectedSchool] = useState('');
    const [studentClass, setStudentClass] = useState('');
    const [plannedTopic, setPlannedTopic] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [lessonPlan, setLessonPlan] = useState(null);  // ✅ Add this line

   
    const [showTable, setShowTable] = useState(false);
    const fileInputRefs = useRef({}); // ✅ Store a reference for each student
    const [uploadedImages, setUploadedImages] = useState({}); // ❌ This line was missing

    

    // Fetch assigned schools for the logged-in teacher
    useEffect(() => {
        getSchools()
            .then(data => {
                //console.log("✅ Schools Loaded:", data); // Debugging
                setSchools(data);
            })
            .catch(error => console.error("❌ Error fetching schools:", error));
    }, []);



    useEffect(() => {
        async function fetchClassesBySchool() {
            if (!selectedSchool) return; // Ensure a school is selected
    
            try {
                //console.log(`🔄 Fetching classes for school: ${selectedSchool}...`);
                const response = await getClasses(selectedSchool); // Pass school ID
                
                //console.log("✅ Classes received:", response);
                
                if (Array.isArray(response)) {
                    // Convert class IDs to a Set to remove duplicates & sort them
                    const uniqueClasses = [...new Set(response)].sort((a, b) => a - b);
                    
                    // Format the classes correctly
                    const formattedClasses = uniqueClasses.map(cls => ({
                        id: cls, 
                        name: `Class ${cls}` // Modify this based on your backend data format
                    }));
    
                    setClasses([{ id: "", name: "Select Class" }, ...formattedClasses]);
                } else {
                    console.error("❌ Expected an array but received:", response);
                }
            } catch (error) {
                console.error("❌ Error fetching classes:", error);
            }
        }
    
        fetchClassesBySchool();
       // console.log("Selected School:", selectedSchool);
    }, [selectedSchool]); // Runs when `selectedSchool` changes
    
    const openFileDialog = (studentId) => {
        if (fileInputRefs.current[studentId]) {
            fileInputRefs.current[studentId].click(); // ✅ Trigger the correct file input
        }
    };
    
    const handleSearch = async () => {
        if (!sessionDate || !selectedSchool || !studentClass) {
            console.error("❌ Please select a date, school, and class before searching.");
            return;
        }
    
        try {
            console.log("📡 Fetching students and lesson plan...");
    
            const response = await axios.get(`${API_URL}/api/students-prog/`, {
                params: {
                    school_id: selectedSchool,
                    class_id: studentClass,
                    session_date: sessionDate
                },
                headers: getAuthHeaders(),
            });
    
            console.log("✅ API Response:", response.data);
    
            setStudents(response.data.students || []);
            setLessonPlan(response.data.lesson_plan || null);
    
            if (response.data.students.length > 0) {
                setShowTable(true); // ✅ Ensure the table appears when students are available
            } else {
                setShowTable(false); // Hide table if no students are found
            }
    
        } catch (error) {
            console.error("❌ Error fetching students:", error.response?.data || error.message);
            alert("❌ Failed to fetch students. Please try again.");
        }
    };
    
    
    
    
    
    
    
    
    
    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;
    
        console.log("📂 Selected File:", file);
        setSelectedFile(file);
    };
    const handleFileUpload = async (studentId) => {
        if (!selectedFile) {
            alert("Please select a file first.");
            return;
        }
    
        const formData = new FormData();
        formData.append("image", selectedFile);
        formData.append("student_id", studentId);
        formData.append("session_date", sessionDate);
    
        try {
            console.log("📡 Uploading image for Student ID:", studentId);
            const response = await axios.post(`${API_URL}/api/upload-student-image/`, formData, {
                headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders() },
            });
    
            console.log("✅ Image Upload Response:", response.data);
    
            // ✅ Store image preview per student
            setUploadedImages(prev => ({
                ...prev,
                [studentId]: response.data.image_url
            }));
    
            alert("Image uploaded successfully!");
        } catch (error) {
            console.error("❌ Error uploading image:", error.response?.data || error.message);
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
            console.error("❌ Please select a date, school, and class before submitting.");
            return;
        }
    
        try {
            console.log("📡 Submitting attendance and achieved topics...");
    
            let newAttendanceRecords = [];
    
            const attendanceUpdates = students.map(student => {
                const attendanceId = student.attendance_id || null;
                const status = attendanceData[student.id] || "N/A";
                const achievedTopic = achievedLessons[student.id] || "";
                const lessonPlanId = student.lesson_plan_id || null;  // ✅ Use lesson_plan_id from API


    
                if (!attendanceId) {
                    console.log(`🟡 Creating attendance for student ${student.id}`);
                    newAttendanceRecords.push({
                        student_id: student.id,
                        session_date: sessionDate,
                        status: status,
                        achieved_topic: achievedTopic,
                        lesson_plan_id: lessonPlanId  // ✅ Send lesson_plan_id
                    });
                }
    
                return { attendance_id: attendanceId, status, achieved_topic: achievedTopic, lesson_plan_id: lessonPlanId };
            });
    
            // ✅ Step 1: Create attendance records for missing students
            if (newAttendanceRecords.length > 0) {
                console.log("📡 Sending new attendance records:", newAttendanceRecords);
    
                const createResponse = await axios.post(`${API_URL}/api/attendance/`, {
                    session_date: sessionDate,
                    attendance: newAttendanceRecords
                }, {
                    headers: getAuthHeaders(),
                });
    
                console.log("✅ Attendance records created:", createResponse.data);
            }
    
            // ✅ Step 2: Update existing attendance records
            for (const update of attendanceUpdates) {
                if (!update.attendance_id) continue; // Skip records that were just created
    
                console.log(`✅ Updating attendance for student ID ${update.attendance_id}`);
    
                await axios.put(`${API_URL}/api/attendance/update/${update.attendance_id}/`, update, {
                    headers: getAuthHeaders(),
                });
            }
    
            alert("✅ Attendance and achieved topics updated successfully!");
        } catch (error) {
            console.error("❌ Error updating attendance:", error.response?.data || error.message);
            alert("❌ Failed to update attendance. Please try again.");
        }
    };
    
    
    
    
    
    
    


    
    const handleDateChange = async (e) => {
        const newDate = e.target.value;
        setSessionDate(newDate);
    
        if (!studentClass || !selectedSchool) {
            console.warn("⚠️ School and class must be selected before fetching lesson plan.");
            return;
        }
    
        // ✅ Since `selectedSchool` is already an ID, use it directly
        const schoolId = selectedSchool;
    
        try {
            //console.log(`🔍 Fetching lesson plan for Date: ${newDate}, Class: ${studentClass}, School ID: ${schoolId}`);
    
            // ✅ Correct API call format
            const requestUrl = `${API_URL}/api/lesson-plan-range/?start_date=${newDate}&end_date=${newDate}&school_id=${schoolId}&student_class=${studentClass}`;
           // console.log("📡 API Request:", requestUrl);
    
            const lessonResponse = await axios.get(requestUrl, {
                headers: getAuthHeaders(),
            });
    
           // console.log("✅ Lesson Plan Received:", lessonResponse.data);
    
            if (lessonResponse.data.length === 0) {
                console.warn("⚠️ No planned lesson found for this date & class.");
                setPlannedTopic("No lesson planned.");
                return;
            }
    
            setPlannedTopic(lessonResponse.data[0].planned_topic); // ✅ Store first lesson's topic
    
        } catch (error) {
            console.error("❌ Error fetching lesson plan:", error.response?.data || error.message);
            setPlannedTopic("Error fetching lesson.");
        }
    };
    
    
    
    





    return (
        <Container className="p-6 bg-gray-50 min-h-screen">
            {/* Title */}
            <Title className="text-3xl font-bold text-gray-800 mb-8">Session Progress</Title>
    
            {/* Filters Row */}
            <div className="flex flex-wrap items-end gap-4 mb-8">
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
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                    Search
                </Button>
            </div>
    
            {showTable && (
                <>
                    {/* Table */}
                    <div className="overflow-x-auto shadow-lg rounded-lg">
                        <Table className="w-full border-collapse">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 text-left text-gray-700 font-semibold">Student Name</th>
                                    <th className="p-3 text-left text-gray-700 font-semibold">Attendance</th>
                                    <th className="p-3 text-left text-gray-700 font-semibold">Planned Lesson</th>
                                    <th className="p-3 text-left text-gray-700 font-semibold">Achieved Lesson</th>
                                    <th className="p-3 text-left text-gray-700 font-semibold">Upload Image</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-3 border-t border-gray-200 text-gray-600">{student.name}</td>
                                        <td className="p-3 border-t border-gray-200">
                                            {/* Attendance Toggle Button */}
                                            <Button
                                                onClick={() => handleAttendanceChange(student.id, 
                                                    attendanceData[student.id]?.status === "Present" ? "Absent" : "Present"
                                                )}
                                                className={`px-4 py-2 rounded-lg text-white ${
                                                    attendanceData[student.id]?.status === "Present" ? "bg-green-500 hover:bg-green-600" 
                                                    : attendanceData[student.id]?.status === "Absent" ? "bg-red-500 hover:bg-red-600" 
                                                    : "bg-gray-500 hover:bg-gray-600"
                                                } transition-colors`}
                                            >
                                                {attendanceData[student.id]?.status || "Set Attendance"}
                                            </Button>
                                        </td>
                                        <td className="p-3 border-t border-gray-200 text-gray-600">{plannedTopic}</td>
                                        <td className="p-3 border-t border-gray-200">
                                            {/* Achieved Lesson Textarea */}
                                            <textarea
                                                value={achievedLessons[student.id] || ""}
                                                onChange={e => handleAchievedChange(student.id, e.target.value)}
                                                rows="3"
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-vertical"
                                            />
                                        </td>
                                        <td className="p-3 border-t border-gray-200">
                                            {/* File Upload Section */}
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    ref={(el) => (fileInputRefs.current[student.id] = el)}
                                                    className="hidden"
                                                    onChange={(event) => handleFileSelect(event, student.id)}
                                                />
                                                <Button
                                                    type="button"
                                                    onClick={() => openFileDialog(student.id)}
                                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                                                >
                                                    Browse
                                                </Button>
                                                <Button
                                                    onClick={() => handleFileUpload(student.id)}
                                                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                                                >
                                                    Upload
                                                </Button>
                                                {uploadedImages[student.id] && (
                                                    <img src={uploadedImages[student.id]} alt="Uploaded" className="w-20 h-20 rounded-lg" />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
    
                    {/* Submit Button */}
                    <div className="mt-6 text-right">
                        <Button
                            onClick={handleSubmit}
                            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                        >
                            Submit
                        </Button>
                    </div>
                </>
            )}
        </Container>
    );
    
    
};

export default ProgressPage;