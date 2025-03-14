import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { useParams, useLocation } from "react-router-dom";
import html2pdf from "html2pdf.js";

const StudentReport = () => {
    const { studentId } = useParams();
    const [studentData, setStudentData] = useState(null);
    const [attendanceData, setAttendanceData] = useState(null);
    const location = useLocation();
    const autoGenerate = location.state?.autoGenerate || false;
    const [lessonsData, setLessonsData] = useState(null);
    const [progressImages, setProgressImages] = useState([]);
    const reportRef = useRef(null);
    const month = location.state?.month || "2025-02";
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    

    const getMonthDates = (month) => {
        const [year, monthNumber] = month.split("-");
        const firstDay = `${month}-01`;
        const lastDay = new Date(year, monthNumber, 0).toISOString().split("T")[0];
        return { firstDay, lastDay };
    };

    const { firstDay, lastDay } = getMonthDates(month);

    const fetchReportData = useCallback(async () => {
        try {
            const studentRes = await axios.get(`${process.env.REACT_APP_API_URL}/api/student-details/?student_id=${studentId}`);
            const attendanceRes = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/attendance-count/?student_id=${studentId}&start_date=${firstDay}&end_date=${lastDay}`
            );
            const lessonsRes = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/lessons-achieved/?student_id=${studentId}&start_date=${firstDay}&end_date=${lastDay}`
            );
            const imagesRes = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/student-images/?student_id=${studentId}&start_date=${firstDay}&end_date=${lastDay}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("access_token")}`
                    }
                }
            );

            setStudentData(studentRes.data);
            setAttendanceData(attendanceRes.data);
            setLessonsData(lessonsRes.data);
            setProgressImages(imagesRes.data.progress_images);
            setIsDataLoaded(true);
        } catch (error) {
            console.error("Error fetching report data:", error);
        }
    }, [studentId, month]);

    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);

    const generatePDF = (source) => {
        console.log(`📄 generatePDF() called from: ${source}`);
        if (!studentData || !attendanceData || !lessonsData) {
            console.error("⚠️ Missing data, PDF cannot be generated.");
            alert("Report data is still loading. Please wait.");
            return;
        }
    
        const element = document.getElementById("student-report");
        if (!element) {
            console.error("❌ Report container not found!");
            return;
        }
    
        const pdfOptions = {
            margin: [5, 5, 5, 5],
            filename: `Student_Report_${studentData.name.replace(/\s+/g, "_")}_${studentData.reg_num}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, allowTaint: true },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ['css', 'legacy'], avoid: ['table', 'div'], after: ['#student-report'], strict: true }, // Force single page
        };
    
        html2pdf()
            .from(element)
            .set(pdfOptions)
            .toPdf()
            .get("pdf")
            .then((pdf) => {
                console.log("✅ PDF generated successfully.");
                window.open(pdf.output("bloburl"), "_blank");
                pdf.save(pdfOptions.filename);
            });
    };

    const hasGeneratedPDF = useRef(false);
    useEffect(() => {
        if (autoGenerate && isDataLoaded && !hasGeneratedPDF.current) {
            console.log("✅ Data ready, generating PDF...");
            generatePDF("useEffect");
            hasGeneratedPDF.current = true;
        }
    }, [autoGenerate, isDataLoaded]);

    if (!studentData || !attendanceData || !lessonsData) return <p>Loading report...</p>;

    // Ensure 4 slots for images (2x2 grid)
    const imageSlots = Array(4).fill(null).map((_, index) => 
        progressImages[index] ? progressImages[index] : null
    );

    return (
        <div>
            <button
                onClick={() => generatePDF("manual")}
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
    
            <div
                ref={reportRef}
                id="student-report"
                style={{
                    width: "210mm",
                    height: "297mm",
                    padding: "10mm",
                    margin: "auto",
                    fontSize: "12px",
                    position: "relative",
                    background: "white",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    border: "1px solid #ddd",
                    fontFamily: "'Helvetica', 'Arial', sans-serif",
                }}
            >
                {/* Adjusted Watermark to prevent overflow */}
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%) rotate(-45deg)",
                        fontSize: "30px", // Reduced from 40px to fit within 210mm
                        color: "rgba(0, 0, 0, 0.05)", // Lighter to reduce visibility of overflow
                        pointerEvents: "none",
                        maxWidth: "150mm", // Constrain width to prevent overflow
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {studentData?.school}
                </div>
    
                {/* Content Wrapper with Flexbox for Footer Positioning */}
                <div
                    style={{
                        maxHeight: "260mm",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        height: "100%", // Ensure it takes full height of wrapper
                    }}
                >
                    {/* Main Content */}
                    <div>
                        {/* Header */}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                background: "#dfdfdf",
                                color: "white",
                                padding: "0mm",
                                borderRadius: "5px 5px 0 0",
                            }}
                        >
                            <h2 style={{ margin: 0, fontSize: "18px" }}>📊 Monthly Student Report</h2>
                            <img
                                src={process.env.PUBLIC_URL + "/logo.png"}
                                alt="School Logo"
                                style={{
                                    height: "50px",
                                    minWidth: "50px",
                                    borderRadius: "3px",
                                    objectFit: "contain",
                                }}
                            />
                        </div>
    
                        {/* Student Details */}
                        <div style={{ padding: "5mm", borderBottom: "1px solid #ccc" }}>
                            <p><strong>👤 Student Name:</strong> {studentData?.name || "Loading..."}</p>
                            <p><strong>📄 Registration Number:</strong> {studentData?.reg_num || "Loading..."}</p>
                            <p><strong>🏫 School:</strong> {studentData?.school || "Loading..."}</p>
                            <p><strong>📚 Class:</strong> {studentData?.class || "Loading..."}</p>
                            <p><strong>🗓️ Month:</strong> {month}</p>
                        </div>
    
                        {/* Attendance */}
                        <div style={{ padding: "5mm", borderBottom: "1px solid #ccc" }}>
                            <p><strong>✅ Attendance:</strong> {attendanceData?.present_days}/{attendanceData?.total_days} days</p>
                        </div>
    
                        {/* Lessons Table */}
                        <div
                            style={{
                                padding: "5mm",
                                borderBottom: "1px solid #ccc",
                                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                            }}
                        >
                            <h3 style={{ marginBottom: "8mm", fontSize: "16px" }}>📖 Lessons Overview</h3>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                <thead>
                                    <tr style={{ background: "#f2f2f2", borderBottom: "2px solid #ccc" }}>
                                        <th style={{ padding: "4px", border: "1px solid #ccc" }}>📅 Date</th>
                                        <th style={{ padding: "4px", border: "1px solid #ccc" }}>📖 Planned Topic</th>
                                        <th style={{ padding: "4px", border: "1px solid #ccc" }}>✅ Covered Topic</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lessonsData?.planned_lessons?.slice(0, 5).map((lesson, index) => (
                                        <tr key={index} style={{ borderBottom: "1px solid #ccc" }}>
                                            <td style={{ padding: "4px", border: "1px solid #ccc" }}>{lesson.date || "No Date"}</td>
                                            <td style={{ padding: "4px", border: "1px solid #ccc" }}>{lesson.planned_topic || "N/A"}</td>
                                            <td style={{ padding: "4px", border: "1px solid #ccc" }}>{lessonsData?.achieved_lessons?.[index] || "N/A"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
    
                        {/* Progress Images (2x2 Grid) */}
                        <div
                            style={{
                                padding: "5mm",
                                textAlign: "center",
                                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                            }}
                        >
                            <h3 style={{ marginBottom: "8mm", fontSize: "16px" }}>🖼️ Progress Images</h3>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(2, 1fr)",
                                    gridTemplateRows: "repeat(2, 80px)",
                                    gap: "5mm",
                                }}
                            >
                                {imageSlots.map((img, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            width: "100%",
                                            height: "80px",
                                            border: "1px solid #ccc",
                                            borderRadius: "3px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: "#f9f9f9",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {img ? (
                                            <img
                                                src={img}
                                                alt={`Progress ${index + 1}`}
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: "24px", color: "#999", fontStyle: "italic" }}>📷 No Image</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
    
                        {/* Teacher's Signature */}
                        <div
                            style={{
                                marginTop: "10mm",
                                textAlign: "center",
                                padding: "5mm",
                                borderTop: "2px solid black",
                            }}
                        >
                            <p style={{ fontSize: "16px", fontWeight: "bold", color: "#333" }}>📌 Teacher’s Signature</p>
                        </div>
                    </div>
    
                    {/* Footer - Pushed to bottom with Flexbox */}
                    <div
                        style={{
                            textAlign: "center",
                            padding: "0mm",
                            background: "#e9ecef",
                            borderRadius: "5px",
                            fontSize: "10px",
                            marginTop: "auto", // Pushes footer to bottom
                        }}
                    >
                        <p style={{ margin: "0", color: "#666" }}>Powered By: {studentData?.school}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentReport;