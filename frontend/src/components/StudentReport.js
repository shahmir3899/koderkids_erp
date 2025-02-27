import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { useParams, useLocation } from "react-router-dom";


//import { API_URL } from "../env"; // Adjust API URL based on your setup
import html2pdf from "html2pdf.js";
//const API_URL = process.env.REACT_APP_NGROK_URL;
const StudentReport = () => {
    const { studentId } = useParams(); // Get student ID from URL params
    const [studentData, setStudentData] = useState(null);
    const [attendanceData, setAttendanceData] = useState(null);
    const location = useLocation(); // Removed duplicate declaration
    const autoGenerate = location.state?.autoGenerate || false; // ✅ Check if autoGenerate is passed
    const [lessonsData, setLessonsData] = useState(null);
    const [progressImages, setProgressImages] = useState([]);
    //const reportRef = useRef();

    //const month = "2025-02"; // Set the desired report month
    const reportRef = useRef(null); // ✅ Reference to report container
    const imageRefs = useRef([]); // Store references to image elements
    //const location = useLocation();
    const month = location.state?.month || "2025-02"; // Default fallback
    const getMonthDates = (month) => {
        const [year, monthNumber] = month.split("-"); // Extract year and month
        const firstDay = `${month}-01`;
        const lastDay = new Date(year, monthNumber, 0).toISOString().split("T")[0]; // Get last day
    
        return { firstDay, lastDay };
    };
    
    const { firstDay, lastDay } = getMonthDates(month);
    


    

    const fetchReportData = useCallback(async () => {
        try {
            const studentRes = await axios.get(`${process.env.REACT_APP_API_URL}/api/student-details/?student_id=${studentId}`);
            //const attendanceRes = await axios.get(`${process.env.REACT_APP_API_URL}/api/attendance-count/?student_id=${studentId}&start_date=${month}-01&end_date=${month}-28`);
            //const lessonsRes = await axios.get(`${process.env.REACT_APP_API_URL}/api/lessons-achieved/?student_id=${studentId}&start_date=${month}-01&end_date=${month}-28`);
            const attendanceRes = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/attendance-count/?student_id=${studentId}&start_date=${firstDay}&end_date=${lastDay}`
            );
            const lessonsRes = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/lessons-achieved/?student_id=${studentId}&start_date=${firstDay}&end_date=${lastDay}`
            );
            const imagesRes = await axios.get(`${process.env.REACT_APP_API_URL}/api/student-progress-images/?student_id=${studentId}&month=${month}`);
    
            setStudentData(studentRes.data);
            setAttendanceData(attendanceRes.data);
            setLessonsData(lessonsRes.data);
            setProgressImages(imagesRes.data.progress_images);
            setIsDataLoaded(true); // ✅ Mark data as fully loaded
        } catch (error) {
            console.error("Error fetching report data:", error);
        }
    }, [studentId, month]);  // ✅ Dependencies to avoid infinite re-renders
    
    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);


    const [isDataLoaded, setIsDataLoaded] = useState(false); // ✅ Track data loading


    // const generatePDF = () => {
    //     if (!studentData || !attendanceData || !lessonsData) {
    //         console.error("⚠️ Missing data, PDF cannot be generated.");
    //         alert("Report data is still loading. Please wait.");
    //         return;
    //     }
    
    //     setTimeout(() => {
    //         const element = document.getElementById("student-report");
    
    //         if (!element) {
    //             console.error("❌ Report container STILL not found! Skipping PDF.");
    //             return;
    //         }
    
    //         console.log("📄 Report container found! Checking images...");
    
    //         // ✅ Filter out null values before checking if images are loaded
    //         const validImages = imageRefs.current.filter((img) => img !== null);
    //         const allImagesLoaded = validImages.every((img) => img.complete && img.naturalHeight !== 0);
    
    //         if (!allImagesLoaded) {
    //             console.error("🚫 Some images failed to load. Retrying PDF generation...");
    //             return;
    //         }
    
    //         // ✅ Updated PDF Options
    //         const pdfOptions = {
    //             margin: [5, 5, 5, 5], // Smaller margins
    //             filename: `Student_Report_${studentData.name.replace(/\s+/g, "_")}_${studentData.reg_num}.pdf`,
    //             image: { type: "jpeg", quality: 0.98 },
    //             html2canvas: { scale: 1.5, useCORS: true, allowTaint: true }, // Reduced scale
    //             jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    //         };
    
    //         html2pdf().from(element).set(pdfOptions).toPdf().get("pdf").then((pdf) => {
    //             console.log("✅ PDF generated successfully.");
    //             window.open(pdf.output("bloburl"), "_blank");
    //         });
    
    //     }, 1000);
    // };
    const generatePDF = (source) => {
        console.log(`📄 generatePDF() function called from: ${source}`); // ✅ Debugging log
    
        if (!studentData || !attendanceData || !lessonsData) {
            console.error("⚠️ Missing data, PDF cannot be generated.");
            alert("Report data is still loading. Please wait.");
            return;
        }
    
        setTimeout(() => {
            const element = document.getElementById("student-report");
            if (!element) {
                console.error("❌ Report container STILL not found! Skipping PDF.");
                return;
            }
    
            console.log("📄 Generating PDF...");
    
            const pdfOptions = {
                margin: [5, 5, 5, 5],
                filename: `Student_Report_${studentData.name.replace(/\s+/g, "_")}_${studentData.reg_num}.pdf`,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, allowTaint: true },
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            };
    
            html2pdf().from(element).set(pdfOptions).toPdf().get("pdf").then((pdf) => {
                console.log("✅ PDF generated successfully.");
                window.open(pdf.output("bloburl"), "_blank");
            });
    
        }, 1000);
    };
    
    
    
    const hasGeneratedPDF = useRef(false); // ✅ Prevents duplicate execution
    useEffect(() => {
        if (autoGenerate && isDataLoaded && !hasGeneratedPDF.current) {
            console.log("✅ Data ready, generating PDF...");
            generatePDF("useEffect");
            hasGeneratedPDF.current = true; // ✅ Ensures it runs only once
        }
    }, [autoGenerate, isDataLoaded]);
    
 
    
    

    if (!studentData || !attendanceData || !lessonsData) return <p>Loading report...</p>;

    
    return (
        <div>
            {/* ✅ Generate PDF Button */}
            <button
                onClick={generatePDF}
                style={{
                    marginBottom: "10px",
                    padding: "10px",
                    background: "blue",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: "5px",
                    transition: "background 0.3s ease",
                }}
                onMouseOver={(e) => (e.target.style.background = "#0056b3")}
                onMouseOut={(e) => (e.target.style.background = "blue")}
            >
                📄 Generate PDF
            </button>
    
            {/* ✅ Report Container */}
            <div
                ref={reportRef}
                id="student-report"
                style={{
                    width: "210mm", // A4 width
                    padding: "10px",
                    margin: "auto",
                    fontSize: "12px",
                    position: "relative",
                    background: "white",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                }}
            >
                {/* ✅ Header with School Logo */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "#fa2ae9",
                        color: "white",
                        padding: "5px",
                        borderRadius: "5px 5px 0 0",
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: "18px" }}>📊 Monthly Student Report</h2>
                    <img
                        src={process.env.PUBLIC_URL + "/logo.png"}
                        alt="School Logo"
                        style={{ height: "50px", borderRadius: "3px" }}
                    />
                </div>
    
                {/* ✅ Student Details */}
                <div style={{ padding: "5px", borderBottom: "1px solid #ccc" }}>
                    <p><strong>👤 Student Name:</strong> {studentData?.name || "Loading..."}</p>
                    <p><strong>📄 Registration Number:</strong> {studentData?.reg_num || "Loading..."}</p>
                    <p><strong>🏫 School:</strong> {studentData?.school || "Loading..."}</p>
                    <p><strong>📚 Class:</strong> {studentData?.class || "Loading..."}</p>
                    <p><strong>🗓️ Month:</strong> {month}</p>
                </div>
    
                {/* ✅ Attendance */}
                <div style={{ padding: "5px", borderBottom: "1px solid #ccc" }}>
                    <p><strong>✅ Attendance:</strong> {attendanceData?.present_days}/{attendanceData?.total_days} days</p>
                </div>
    
                {/* ✅ Lessons Table */}
                <div style={{ padding: "5px", borderBottom: "1px solid #ccc" }}>
                    <h3 style={{ marginBottom: "10px", fontSize: "18px" }}>📖 Lessons Overview</h3>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                            <tr style={{ background: "#f2f2f2", borderBottom: "2px solid #ccc" }}>
                                <th style={{ padding: "8px", border: "1px solid #ccc" }}>📅 Date</th>
                                <th style={{ padding: "8px", border: "1px solid #ccc" }}>📖 Planned Topic</th>
                                <th style={{ padding: "8px", border: "1px solid #ccc" }}>✅ Covered Topic</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lessonsData?.planned_lessons?.map((lesson, index) => (
                                <tr key={index} style={{ borderBottom: "1px solid #ccc" }}>
                                    <td style={{ padding: "8px", border: "1px solid #ccc" }}>{lesson.date || "No Date"}</td>
                                    <td style={{ padding: "8px", border: "1px solid #ccc" }}>{lesson.planned_topic || "N/A"}</td>
                                    <td style={{ padding: "8px", border: "1px solid #ccc" }}>{lessonsData?.achieved_lessons?.[index] || "N/A"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
    
                {/* ✅ Progress Images */}
                <div style={{ padding: "5px", textAlign: "center" }}>
                    <h3 style={{ marginBottom: "5px", fontSize: "14px" }}>🖼️ Progress Images</h3>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: "5px",
                        }}
                    >
                        {progressImages.length > 0 ? (
                            progressImages.map((img, index) => (
                                <img
                                    key={index}
                                    src={img}
                                    alt="Progress"
                                    style={{
                                        width: "100%",
                                        height: "100px", // Reduced height
                                        objectFit: "cover",
                                        borderRadius: "3px",
                                        border: "1px solid #ccc",
                                    }}
                                />
                            ))
                        ) : (
                            <p>No progress images available.</p>
                        )}
                    </div>
                </div>
    
                {/* ✅ Teacher's Signature */}
                <div
                    style={{
                        marginTop: "10px",
                        textAlign: "center",
                        padding: "10px",
                        borderTop: "2px solid black",
                    }}
                >
                    <p style={{ fontSize: "14px", fontWeight: "bold" }}>📌 Teacher’s Signature</p>
                </div>
    
                {/* ✅ Footer - Sticks to the bottom */}
<div
    style={{
        position: "absolute",  // ✅ Fixes footer at the bottom
        bottom: "0",
        left: "0",
        width: "100%",
        textAlign: "center",
        padding: "5px",
        background: "#f2f2f2",
        borderRadius: "0 0 5px 5px",
        fontSize: "10px",
    }}
>
    <p style={{ margin: 0, color: "#666" }}>Powered By: {studentData?.school}</p>
</div>
            </div>
        </div>
    );

}    

export default StudentReport;
