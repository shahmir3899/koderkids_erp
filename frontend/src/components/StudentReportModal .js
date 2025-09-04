import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import html2pdf from "html2pdf.js";
import PropTypes from "prop-types";

// Utility function to validate date string
const isValidDate = (dateStr) => {
  if (!dateStr) return false;
  const [year, month, day] = dateStr.split("-");
  const date = new Date(`${year}-${month}-${day}`);
  return date instanceof Date && !isNaN(date) && date.getFullYear() === parseInt(year);
};

// Utility function to extract date from filename
const extractDateFromFilename = (filename) => {
  const name = filename.split('/').pop().split('?')[0];
  const dateMatch = name.match(/(\d{4})(\d{2})(\d{2})|(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    if (dateMatch[1]) {
      const [_, year, month, day] = dateMatch;
      return `${year}-${month}-${day}`;
    } else {
      return dateMatch[4] + '-' + dateMatch[5] + '-' + dateMatch[6];
    }
  }
  return "Unknown Date";
};

// Utility function to get all months between two dates
const getMonthsBetweenDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = new Set();
  let current = new Date(start);
  
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    months.add(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
    current.setDate(1);
  }
  
  return Array.from(months);
};

// Utility function to split lessons into page-sized chunks
const splitLessonsIntoPages = (lessons) => {
  const maxRowsPerPage = 10; // Adjust based on row height (approx 10 rows fit in ~200mm)
  const chunks = [];
  for (let i = 0; i < lessons.length; i += maxRowsPerPage) {
    chunks.push(lessons.slice(i, i + maxRowsPerPage));
  }
  return chunks;
};

const StudentReportModal = ({ onClose, studentId, mode, selectedMonth, startDate, endDate }) => {
  const [studentData, setStudentData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [lessonsData, setLessonsData] = useState(null);
  const [progressImages, setProgressImages] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [showImageSelection, setShowImageSelection] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Loading student details...");
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef(null);

  const getDateList = () => {
    const dates = [];
    if (mode === "month" && selectedMonth && isValidDate(`${selectedMonth}-01`)) {
      const [year, month] = selectedMonth.split("-").map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        dates.push(new Date(year, month - 1, day));
      }
    } else if (mode === "range" && startDate && endDate && isValidDate(startDate) && isValidDate(endDate)) {
      let current = new Date(startDate);
      const end = new Date(endDate);
      if (end < current) {
        setErrorMessage("End date must be after start date.");
        return [];
      }
      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    }
    return dates;
  };

  const dateList = getDateList();

  const fetchReportData = useCallback(async () => {
    setErrorMessage("");
    setIsDataLoaded(false);
    try {
      let fromDate = "";
      let toDate = "";
      let reportMonth = "";

      if (mode === "month" && selectedMonth && isValidDate(`${selectedMonth}-01`)) {
        const [year, monthNum] = selectedMonth.split("-").map(Number);
        const lastDate = new Date(year, monthNum, 0).getDate();
        fromDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
        toDate = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDate).padStart(2, "0")}`;
        reportMonth = selectedMonth;
      } else if (mode === "range" && startDate && endDate && isValidDate(startDate) && isValidDate(endDate)) {
        fromDate = startDate;
        toDate = endDate;
      } else {
        setErrorMessage("Invalid date selection. Please use YYYY-MM-DD format.");
        setIsDataLoaded(true);
        return;
      }

      const headers = {
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      };

      const axiosInstance = axios.create();

      setLoadingMessage("Loading student details...");
      const studentRes = await axiosInstance.get(
        `${process.env.REACT_APP_API_URL}/api/student-details/?student_id=${studentId}`,
        { headers }
      );
      if (studentRes.data) {
        setStudentData(studentRes.data);
      } else {
        setErrorMessage((prev) => prev + " Failed to fetch student details. ");
      }

      setLoadingMessage("Fetching attendance data...");
      const attendanceRes = await axiosInstance.get(
        `${process.env.REACT_APP_API_URL}/api/attendance-count/?student_id=${studentId}&start_date=${fromDate}&end_date=${toDate}`,
        { headers }
      );
      if (attendanceRes.data) {
        setAttendanceData(attendanceRes.data);
      } else {
        setErrorMessage((prev) => prev + " Failed to fetch attendance data. ");
      }

      setLoadingMessage("Fetching lessons data...");
      const lessonsRes = await axiosInstance.get(
        `${process.env.REACT_APP_API_URL}/api/lessons-achieved/?student_id=${studentId}&start_date=${fromDate}&end_date=${toDate}`,
        { headers }
      );
      if (lessonsRes.data) {
        setLessonsData(lessonsRes.data);
      } else {
        setErrorMessage((prev) => prev + " Failed to fetch lessons data. ");
      }

      setLoadingMessage("Fetching progress images...");
      let allProgressImages = [];
      
      if (mode === "month") {
        const imagesRes = await axiosInstance.get(
          `${process.env.REACT_APP_API_URL}/api/student-progress-images/?student_id=${studentId}&month=${reportMonth}`,
          { headers }
        );
        if (imagesRes.data) {
          const images = (imagesRes.data.progress_images || [])
            .map((img) => (typeof img === "string" ? img : img?.signedURL || null))
            .filter(Boolean);
          allProgressImages = images;
        } else {
          setErrorMessage((prev) => prev + " Failed to fetch progress images for month. ");
        }
      } else if (mode === "range") {
        const months = getMonthsBetweenDates(startDate, endDate);
        for (const month of months) {
          const imagesRes = await axiosInstance.get(
            `${process.env.REACT_APP_API_URL}/api/student-progress-images/?student_id=${studentId}&month=${month}`,
            { headers }
          );
          if (imagesRes.data) {
            const images = (imagesRes.data.progress_images || [])
              .map((img) => (typeof img === "string" ? img : img?.signedURL || null))
              .filter(Boolean);
            allProgressImages = [...allProgressImages, ...images];
          } else {
            setErrorMessage((prev) => prev + ` Failed to fetch progress images for ${month}. `);
          }
        }
        allProgressImages = Array.from(new Set(allProgressImages));
      }

      const preloadPromises = allProgressImages.map((url) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = url;
          img.onload = resolve;
          img.onerror = () => {
            console.error(`Failed to preload image: ${url}`);
            resolve();
          };
        });
      });
      await Promise.all(preloadPromises);

      setProgressImages(allProgressImages);
      if (allProgressImages.length > 4) {
        setShowImageSelection(true);
      } else if (allProgressImages.length > 0) {
        setSelectedImages(allProgressImages);
      }

      setIsDataLoaded(true);
    } catch (error) {
      console.error("Error in fetchReportData:", error.message);
      setErrorMessage("Failed to fetch report data: " + error.message);
      setIsDataLoaded(true);
    }
  }, [studentId, mode, selectedMonth, startDate, endDate]);

  useEffect(() => {
    if (studentId) {
      fetchReportData();
    }
  }, [studentId, mode, selectedMonth, startDate, endDate, fetchReportData]);

  const toggleImageSelection = useCallback(
    (img) => {
      setErrorMessage("");
      if (selectedImages.includes(img)) {
        setSelectedImages(selectedImages.filter((i) => i !== img));
      } else if (selectedImages.length < 4) {
        setSelectedImages([...selectedImages, img]);
      } else {
        setErrorMessage("You can only select up to 4 images.");
      }
    },
    [selectedImages]
  );

  const formattedMonth = mode === "month" && selectedMonth
    ? new Date(`${selectedMonth}-01`).toLocaleString("en-US", { month: "short", year: "numeric" })
    : mode === "range" && startDate && endDate
    ? `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
    : "";

  const handleImageError = (e, img) => {
    console.error(`Failed to load image: ${img}, Error: ${e.target.error || "Unknown error"}`);
    e.target.src = "/placeholder.png";
    e.target.alt = "Image failed to load";
  };

  const handleConfirmSelection = () => {
    if (selectedImages.length > 0) {
      setShowImageSelection(false);
    }
  };

  const generateHDImage = () => {
    if (!studentData || !attendanceData || !lessonsData) {
      alert("Report data is still loading or incomplete. Please wait or fix errors.");
      return;
    }

    if (progressImages.length > 4 && showImageSelection) {
      alert("Please confirm your image selection before generating the image.");
      return;
    }

    const element = reportRef.current;
    if (!element) {
      console.error("Report container not found!");
      return;
    }

    setGenerating(true);

    const hiddenContainer = document.createElement("div");
    hiddenContainer.style.position = "absolute";
    hiddenContainer.style.left = "-9999px";
    hiddenContainer.style.width = "210mm";
    hiddenContainer.style.height = "auto";
    const clonedElement = element.cloneNode(true);
    hiddenContainer.appendChild(clonedElement);
    document.body.appendChild(hiddenContainer);

    const images = clonedElement.querySelectorAll("img");
    const loadPromises = Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = () => {
          console.error(`Failed to load image: ${img.src}`);
          resolve();
        };
      });
    });

    Promise.all(loadPromises).then(() => {
      html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: true,
        width: clonedElement.scrollWidth,
        height: clonedElement.scrollHeight,
        windowWidth: clonedElement.scrollWidth,
        windowHeight: clonedElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        onclone: (doc, cloned) => {
          console.log("Cloned element dimensions:", {
            width: cloned.scrollWidth,
            height: cloned.scrollHeight,
          });
        },
      })
        .then((canvas) => {
          console.log("Canvas dimensions:", {
            width: canvas.width,
            height: canvas.height,
          });
          const link = document.createElement("a");
          link.download = `Student_Report_${studentData.name.replace(/\s+/g, "_")}_${studentData.reg_num}.png`;
          link.href = canvas.toDataURL("image/png", 1.0);
          link.click();
          window.open(canvas.toDataURL("image/png", 1.0), "_blank");
        })
        .catch((error) => console.error("Error generating HD image:", error))
        .finally(() => {
          document.body.removeChild(hiddenContainer);
          setGenerating(false);
        });
    });
  };

  const generatePDF = () => {
    if (!studentData || !attendanceData || !lessonsData) {
      alert("Report data is still loading or incomplete. Please wait or fix errors.");
      return;
    }

    if (progressImages.length > 4 && showImageSelection) {
      alert("Please confirm your image selection before generating the PDF.");
      return;
    }

    const element = reportRef.current;
    if (!element) {
      console.error("Report container not found!");
      return;
    }

    setGenerating(true);

    const hiddenContainer = document.createElement("div");
    hiddenContainer.style.position = "absolute";
    hiddenContainer.style.left = "-9999px";
    hiddenContainer.style.width = "210mm";
    hiddenContainer.style.height = "auto";
    const clonedElement = element.cloneNode(true);
    hiddenContainer.appendChild(clonedElement);
    document.body.appendChild(hiddenContainer);

    const images = clonedElement.querySelectorAll("img");
    const loadPromises = Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = () => {
          console.error(`Failed to load image: ${img.src}`);
          resolve();
        };
      });
    });

    Promise.all(loadPromises).then(() => {
      const pdfOptions = {
        margin: [5, 5, 5, 5],
        filename: `Student_Report_${studentData.name.replace(/\s+/g, "_")}_${studentData.reg_num}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          width: clonedElement.scrollWidth,
          height: clonedElement.scrollHeight,
          windowWidth: clonedElement.scrollWidth,
          windowHeight: clonedElement.scrollHeight,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [".image-slot", "tr"], // Prevent breaking images and table rows
          before: [".section-break-before"],
          after: [".section-break-after"],
        },
      };

      html2pdf()
        .from(clonedElement)
        .set(pdfOptions)
        .toPdf()
        .get("pdf")
        .then((pdf) => {
          console.log("PDF page count:", pdf.internal.getNumberOfPages());
          window.open(pdf.output("bloburl"), "_blank");
          pdf.save(pdfOptions.filename);
        })
        .catch((error) => console.error("Error generating PDF:", error))
        .finally(() => {
          document.body.removeChild(hiddenContainer);
          setGenerating(false);
        });
    });
  };

  if (!isDataLoaded) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "8px",
            maxWidth: "600px",
            width: "100%",
          }}
        >
          <p>{loadingMessage}</p>
        </div>
      </div>
    );
  }

  const imageSlots = [...selectedImages, ...Array(4 - selectedImages.length).fill(null)];
  const attendancePercentage = attendanceData?.total_days > 0
    ? (attendanceData.present_days / attendanceData.total_days) * 100
    : 0;
  const attendanceStatusColor = attendancePercentage > 80 ? "green" : attendancePercentage < 60 ? "red" : "orange";

  // Split lessons into page-sized chunks
  const lessonChunks = lessonsData?.lessons?.length > 0 ? splitLessonsIntoPages(lessonsData.lessons) : [];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "20px",
        zIndex: 1000,
      }}
      role="dialog"
      aria-labelledby="modal-title"
    >
      <div
        style={{
          background: "white",
          padding: "20px",
          borderRadius: "8px",
          maxWidth: "800px",
          width: "100%",
          height: "auto",
          overflowY: "visible",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title" style={{ marginBottom: "10px" }}>
          Student Report Preview
        </h2>
        {errorMessage && (
          <p style={{ color: "red", marginBottom: "10px" }} role="alert">
            {errorMessage}
          </p>
        )}
        {generating && (
          <p style={{ color: "blue", marginBottom: "10px" }}>
            Generating file, please wait...
          </p>
        )}

        {showImageSelection && (
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ marginBottom: "10px" }}>Select Progress Images (up to 4)</h3>
            {progressImages.length === 0 ? (
              <p style={{ color: "red" }}>No images available for selection.</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                  gap: "10px",
                  marginBottom: "10px",
                }}
              >
                {progressImages.map((img, index) => (
                  <div
                    key={img + index}
                    onClick={() => toggleImageSelection(img)}
                    onKeyDown={(e) => e.key === "Enter" && toggleImageSelection(img)}
                    style={{
                      width: "100px",
                      height: "130px",
                      position: "relative",
                      cursor: "pointer",
                      border: selectedImages.includes(img)
                        ? "2px solid blue"
                        : "2px solid transparent",
                    }}
                    tabIndex={0}
                    role="checkbox"
                    aria-checked={selectedImages.includes(img)}
                    aria-label={`Select image ${index + 1}`}
                  >
                    <img
                      src={img}
                      alt={`Progress ${index + 1}`}
                      onError={(e) => handleImageError(e, img)}
                      loading="lazy"
                      style={{ width: "100%", height: "100px", objectFit: "cover" }}
                    />
                    <p style={{ fontSize: "10px", color: "#666", margin: "3px 0", textAlign: "center" }}>
                      {extractDateFromFilename(img)}
                    </p>
                    {selectedImages.includes(img) && (
                      <span
                        style={{
                          position: "absolute",
                          top: "5px",
                          right: "5px",
                          background: "green",
                          color: "white",
                          borderRadius: "50%",
                          padding: "2px 6px",
                        }}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p style={{ marginBottom: "10px" }}>
              {selectedImages.length} / 4 selected
            </p>
            <button
              onClick={handleConfirmSelection}
              disabled={selectedImages.length === 0}
              style={{
                padding: "10px 20px",
                background: selectedImages.length > 0 ? "blue" : "gray",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: selectedImages.length > 0 ? "pointer" : "not-allowed",
                marginRight: "10px",
              }}
            >
              Confirm Selection
            </button>
          </div>
        )}

        <div
          ref={reportRef}
          id="student-report"
          style={{
            width: "210mm",
            height: "auto",
            padding: "10mm",
            backgroundColor: "#f9f9f9",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            fontFamily: "'Roboto', sans-serif",
            color: "#333",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-45deg)",
              fontSize: "30px",
              color: "rgba(0, 0, 0, 0.05)",
              pointerEvents: "none",
              maxWidth: "150mm",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {studentData?.school}
          </div>

          <div
            style={{
              background: "linear-gradient(90deg, #4A90E2, #ffffff)",
              padding: "10mm",
              borderRadius: "5px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10mm",
            }}
          >
            <h2
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: "24px",
                fontWeight: "bold",
                color: "#333",
                margin: 0,
              }}
            >
              Monthly Student Report
            </h2>
            <img
              src={process.env.PUBLIC_URL + "/logo.png"}
              alt="School Logo"
              style={{ height: "40px", borderRadius: "5px", objectFit: "contain" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10mm" }}>
            {/* Student Details Section */}
            <div
              className="section-break-after"
              style={{
                padding: "5mm",
                borderBottom: "2px solid #4A90E2",
                lineHeight: "1.6",
                pageBreakAfter: "always", // Force page break after this section
              }}
            >
              <h3
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#4A90E2",
                  marginBottom: "5px",
                }}
              >
                <span style={{ fontSize: "20px", marginRight: "5px" }}>📚</span> Student Details
              </h3>
              <p style={{ margin: "3px 0", fontSize: "14px" }}>
                <strong>Student Name:</strong> {studentData?.name || "Loading..."}
              </p>
              <p style={{ margin: "3px 0", fontSize: "14px" }}>
                <strong>Registration Number:</strong> {studentData?.reg_num || "Loading..."}
              </p>
              <p style={{ margin: "3px 0", fontSize: "14px" }}>
                <strong>School:</strong> {studentData?.school || "Loading..."}
              </p>
              <p style={{ margin: "3px 0", fontSize: "14px" }}>
                <strong>Class:</strong> {studentData?.class || "Loading..."}
              </p>
              <p style={{ margin: "3px 0", fontSize: "14px" }}>
                <strong>Month:</strong> {formattedMonth}
              </p>
            </div>

            {/* Attendance Section */}
            <div
              style={{
                padding: "5mm",
                backgroundColor: "rgba(46, 204, 113, 0.1)",
                borderRadius: "5px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                pageBreakInside: "avoid", // Prevent breaking this section
              }}
            >
              <span style={{ fontSize: "20px", color: "#2ECC71" }}>✅</span>
              <div>
                <h3
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: "#4A90E2",
                    marginBottom: "3px",
                  }}
                >
                  Attendance
                </h3>
                <p style={{ margin: 0, fontSize: "14px" }}>
                  {attendanceData?.total_days === 0 || !attendanceData
                    ? "No school days recorded"
                    : `${attendanceData?.present_days || 0}/${attendanceData?.total_days || 0} days (${attendancePercentage.toFixed(2)}%)`}
                  <span
                    style={{
                      display: "inline-block",
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: attendanceStatusColor,
                      marginLeft: "5px",
                    }}
                  />
                </p>
              </div>
            </div>

            {/* Lessons Overview Section */}
            <div className="section-break-before" style={{ pageBreakBefore: "always" }}>
              <h3
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#4A90E2",
                  marginBottom: "5px",
                }}
              >
                <span style={{ fontSize: "20px", marginRight: "5px" }}>📖</span> Lessons Overview
              </h3>
              {lessonChunks.length === 0 || !lessonsData ? (
                <p style={{ color: "#666", fontStyle: "italic", fontSize: "14px", textAlign: "center" }}>
                  No lessons found for the selected date range.
                </p>
              ) : (
                lessonChunks.map((chunk, chunkIndex) => (
                  <div
                    key={chunkIndex}
                    className={chunkIndex > 0 ? "section-break-before" : ""}
                    style={{
                      pageBreakBefore: chunkIndex > 0 ? "always" : "auto",
                      marginBottom: "5mm",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                        borderRadius: "5px",
                        overflow: "visible",
                      }}
                      aria-label={`Lessons achieved for the month - Part ${chunkIndex + 1}`}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#4A90E2", color: "white" }}>
                          <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold" }}>📅 Date</th>
                          <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold" }}>Planned Topic</th>
                          <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold" }}>Achieved Topic</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chunk.map((lesson, index) => (
                          <tr
                            key={index}
                            style={{
                              backgroundColor: (chunkIndex * 10 + index) % 2 === 0 ? "#f5f5f5" : "white",
                              pageBreakInside: "avoid", // Prevent row from breaking
                            }}
                          >
                            <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                              {new Date(lesson.date).toLocaleDateString("en-US", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }) || "N/A"}
                            </td>
                            <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                              {lesson.planned_topic || "N/A"}
                            </td>
                            <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                              {lesson.achieved_topic || "N/A"}
                              {lesson.planned_topic === lesson.achieved_topic && lesson.achieved_topic && (
                                <span style={{ color: "green", marginLeft: "5px" }}>✓</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>

            {/* Progress Images Section */}
            <div className="section-break-before" style={{ pageBreakBefore: "always" }}>
              <h3
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#4A90E2",
                  marginBottom: "5px",
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: "20px", marginRight: "5px" }}>🖼️</span> Progress Images
              </h3>
              {progressImages.length === 0 && (
                <p style={{ color: "red", marginBottom: "10px", textAlign: "center" }}>
                  No progress images available for this student.
                </p>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gridTemplateRows: "repeat(2, 50mm)", // Reduced height to fit on one page
                  gap: "8mm",
                  padding: "5mm",
                  backgroundColor: "white",
                  borderRadius: "5px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                  pageBreakInside: "avoid", // Prevent the entire grid from breaking
                }}
              >
                {imageSlots.map((img, index) => (
                  <div
                    key={index}
                    className="image-slot"
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "1px solid #ddd",
                      borderRadius: "5px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#f5f5f5",
                      overflow: "hidden",
                      pageBreakInside: "avoid", // Prevent individual image slots from breaking
                    }}
                  >
                    {img ? (
                      <div style={{ textAlign: "center", width: "100%" }}>
                        <img
                          src={img}
                          alt={`Progress ${index + 1}`}
                          onError={(e) => handleImageError(e, img)}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                            borderRadius: "5px",
                          }}
                        />
                        <p style={{ fontSize: "10px", color: "#666", margin: "3px 0" }}>
                          Image {index + 1}
                        </p>
                      </div>
                    ) : (
                      <span style={{ fontSize: "28px", color: "#999", fontStyle: "italic" }}>
                        📷 No Image
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid #ddd",
              paddingTop: "5mm",
              fontSize: "10px",
              color: "#666",
              marginTop: "10mm",
              flexShrink: 0,
              pageBreakInside: "avoid",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: "0 0 5px 0" }}>
                  Teacher’s Signature: <span style={{ borderBottom: "1px dotted #666", display: "inline-block", width: "100px" }}></span>
                </p>
                <p style={{ margin: 0 }}>Generated on: May 16, 2025</p>
              </div>
              <div
                style={{
                  backgroundColor: "#e5e5e5",
                  padding: "3px 10px",
                  borderRadius: "3px",
                }}
              >
                Powered by {studentData?.school || "School Name"}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between" }}>
          <div>
            <button
              onClick={generateHDImage}
              disabled={generating}
              style={{
                padding: "10px 20px",
                background: generating ? "gray" : "blue",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: generating ? "not-allowed" : "pointer",
                marginRight: "10px",
              }}
            >
              📸 Generate HD Image
            </button>
            <button
              onClick={generatePDF}
              disabled={generating}
              style={{
                padding: "10px 20px",
                background: generating ? "gray" : "green",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: generating ? "not-allowed" : "pointer",
              }}
            >
              📄 Generate PDF
            </button>
          </div>
          <button
            onClick={onClose}
            disabled={generating}
            style={{
              padding: "10px 20px",
              background: "red",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: generating ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

StudentReportModal.propTypes = {
  studentId: PropTypes.string.isRequired,
  mode: PropTypes.string.isRequired,
  selectedMonth: PropTypes.string,
  startDate: PropTypes.string,
  endDate: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default StudentReportModal;