import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getAuthHeaders, getSchools, getClasses } from "../api";
import { useAuth } from "../auth";
import LessonPlanModal from "../components/LessonPlanModal";
import { toast } from "react-toastify";
import html2canvas from "html2canvas";
import html2pdf from "html2pdf.js";
import debounce from "lodash.debounce";

function LessonsPage() {
    const { user } = useAuth();

    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedSchool, setSelectedSchool] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [schools, setSchools] = useState([]);
    const [classes, setClasses] = useState([]);
    const [editingLessonId, setEditingLessonId] = useState(null);
    const [editedTopic, setEditedTopic] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("");
    const [lastFetched, setLastFetched] = useState(null); // Cache for optimization

    const API_URL = process.env.REACT_APP_API_URL;

    // Helper function to format date
    const formatDateWithDay = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    // Fetch lessons with debouncing and caching
    const fetchLessonsForRange = async (startDate, endDate, schoolId, studentClass) => {
        try {
            const endpoint = `${API_URL}/api/lesson-plan-range/?start_date=${startDate}&end_date=${endDate}&school_id=${schoolId}&student_class=${studentClass}`;
            console.log(`🔍 Fetching lessons from: ${endpoint}`);
            const response = await axios.get(endpoint, { headers: getAuthHeaders() });
            return response.data;
        } catch (err) {
            console.error("❌ Error fetching lessons:", err);
            return [];
        }
    };

    const debouncedFetchLessons = useCallback(
        debounce(async (startDate, endDate, selectedSchool, selectedClass) => {
            if (!startDate || !endDate || !selectedSchool || !selectedClass) {
                console.log("⚠️ Please select all required fields.");
                return;
            }

            // Check if filters are unchanged (cache hit)
            const cacheKey = `${startDate}_${endDate}_${selectedSchool}_${selectedClass}`;
            if (lastFetched === cacheKey) {
                console.log("📦 Using cached lessons");
                return;
            }

            setLoading(true);
            setError(null);
            setLessons([]);

            const schoolName = schools.find((s) => s.id === selectedSchool)?.name || "Selected School";
            const startMonth = new Date(startDate).toLocaleString("en-US", { month: "long", year: "numeric" });
            setSelectedMonth(startMonth);

            toast.info(`Fetching lessons for ${schoolName} - ${selectedClass} from ${startDate} to ${endDate}...`, {
                autoClose: false,
                closeOnClick: false,
                toastId: "fetchLessonsLoading",
            });

            try {
                const lessonsData = await fetchLessonsForRange(startDate, endDate, selectedSchool, selectedClass);
                setLessons(lessonsData);
                setEditingLessonId(null);
                setLastFetched(cacheKey); // Update cache key
            } catch (err) {
                console.error("❌ Error fetching lessons:", err);
                setError("Failed to fetch lessons.");
                toast.error("Failed to fetch lessons. Please try again.");
            } finally {
                setLoading(false);
                toast.dismiss("fetchLessonsLoading");
            }
        }, 500),
        [schools]
    );

    const fetchLessons = () => {
        debouncedFetchLessons(startDate, endDate, selectedSchool, selectedClass);
    };

    // Delete lesson
    const handleDelete = async (lessonId) => {
        if (!window.confirm("Are you sure you want to delete this lesson?")) return;
        try {
            const endpoint = `${API_URL}/api/lesson-plans/${lessonId}/`;
            await axios.delete(endpoint, { headers: getAuthHeaders() });
            setLessons(lessons.filter((lesson) => lesson.id !== lessonId));
            toast.success("Lesson deleted successfully");
        } catch (err) {
            console.error("❌ Error deleting lesson:", err.response?.data || err.message);
            toast.error(`Failed to delete lesson: ${err.response?.data?.detail || err.message}`);
        }
    };

    // Edit lesson (inline)
    const handleEdit = (lessonId, currentTopic) => {
        setEditingLessonId(lessonId);
        setEditedTopic(currentTopic);
    };

    const handleSave = async (lessonId) => {
        try {
            const endpoint = `${API_URL}/api/lesson-plans/${lessonId}/update-planned-topic/`;
            await axios.put(endpoint, { planned_topic: editedTopic }, { headers: getAuthHeaders() });
            setLessons(
                lessons.map((lesson) =>
                    lesson.id === lessonId ? { ...lesson, planned_topic: editedTopic } : lesson
                )
            );
            setEditingLessonId(null);
            setEditedTopic("");
            toast.success("Lesson updated successfully");
        } catch (err) {
            console.error("❌ Error updating lesson:", err.response?.data || err.message);
            toast.error(`Failed to update lesson: ${err.response?.data?.detail || err.message}`);
        }
    };

    // Download image with dynamic header
    const handleDownloadImage = () => {
        setTimeout(() => {
            const lessonTable = document.getElementById("lessonTableExport");
            if (!lessonTable) {
                toast.error("Lesson table not found.");
                return;
            }

            toast.info("Generating image, please wait...");

            lessonTable.style.position = "relative";
            lessonTable.style.left = "0px";
            lessonTable.style.opacity = "1";
            lessonTable.style.visibility = "visible";

            html2canvas(lessonTable, {
                onclone: (clonedDoc) => {
                    const clonedTable = clonedDoc.getElementById("lessonTableExport");
                    clonedTable.style.display = "table";
                },
            })
                .then((canvas) => {
                    const link = document.createElement("a");
                    link.href = canvas.toDataURL("image/png");
                    link.download = `LessonPlan_${selectedSchool}_${selectedClass}_${selectedMonth}.png`;
                    link.click();
                    toast.success("Image downloaded!");

                    lessonTable.style.position = "absolute";
                    lessonTable.style.left = "-9999px";
                    lessonTable.style.opacity = "0";
                    lessonTable.style.visibility = "hidden";
                })
                .catch((error) => {
                    console.error("Error generating image:", error);
                    toast.error("Failed to generate image.");
                });
        }, 500);
    };

    // Download PDF with dynamic header
    const handleDownloadPdf = () => {
        setTimeout(() => {
            const lessonTable = document.getElementById("lessonTableExport");
            if (!lessonTable) {
                toast.error("Lesson table not found.");
                return;
            }

            toast.info("Generating PDF, please wait...");

            lessonTable.style.position = "relative";
            lessonTable.style.left = "0px";
            lessonTable.style.opacity = "1";
            lessonTable.style.visibility = "visible";

            const schoolName = schools.find((s) => s.id === selectedSchool)?.name || "Selected School";
            const options = {
                margin: [10, 10, 10, 10],
                filename: `LessonPlan_${schoolName}_${selectedClass}_${selectedMonth}.pdf`,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    onclone: (clonedDoc) => {
                        const clonedTable = clonedDoc.getElementById("lessonTableExport");
                        clonedTable.style.display = "table";
                    },
                },
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                pagebreak: { mode: "avoid-all" },
            };

            html2pdf()
                .set(options)
                .from(lessonTable)
                .save()
                .then(() => {
                    toast.success("PDF downloaded!");

                    lessonTable.style.position = "absolute";
                    lessonTable.style.left = "-9999px";
                    lessonTable.style.opacity = "0";
                    lessonTable.style.visibility = "hidden";
                })
                .catch((error) => {
                    console.error("Error generating PDF:", error);
                    toast.error("Failed to generate PDF.");
                });
        }, 500);
    };

    // Print with dynamic header
    const handlePrint = () => {
        setTimeout(() => {
            const lessonTable = document.getElementById("lessonTableExport")?.outerHTML;
            if (!lessonTable) {
                toast.error("Lesson table not found.");
                return;
            }

            const schoolName = schools.find((s) => s.id === selectedSchool)?.name || "Selected School";
            const printWindow = window.open("", "_blank");

            printWindow.document.write(`
                <html>
                    <head>
                        <title>Lesson Plan</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                margin: 20mm;
                                text-align: center;
                            }
                            .header {
                                margin-bottom: 20px;
                            }
                            .logo {
                                width: 120px;
                                margin-bottom: 10px;
                            }
                            .title {
                                font-size: 24px;
                                font-weight: bold;
                                color: #333;
                            }
                            .subtitle {
                                font-size: 16px;
                                color: #666;
                                margin-top: 5px;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 20px;
                            }
                            th, td {
                                border: 1px solid #ddd;
                                padding: 12px;
                                text-align: left;
                            }
                            th {
                                background-color: #f4f4f4;
                                font-weight: bold;
                            }
                            tr:nth-child(even) {
                                background-color: #f9f9f9;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <img class="logo" src="YOUR_LOGO_URL_HERE" alt="Logo">
                            <div class="title">Lesson Plan</div>
                            <div class="subtitle">${schoolName} - Class ${selectedClass} - ${selectedMonth}</div>
                        </div>
                        ${lessonTable}
                        <script>
                            window.onload = function() {
                                window.print();
                                window.close();
                            };
                        </script>
                    </body>
                </html>
            `);
        }, 500);
    };

    useEffect(() => {
        const fetchSchoolList = async () => {
            try {
                const schoolData = await getSchools();
                console.log("🏫 Fetched Schools:", schoolData);
                setSchools(schoolData);
            } catch (error) {
                console.error("❌ Error loading schools:", error);
            }
        };
        fetchSchoolList();
    }, []);

    useEffect(() => {
        const fetchClassList = async () => {
            if (selectedSchool) {
                try {
                    const classData = await getClasses(selectedSchool);
                    console.log("📚 Fetched Classes for School:", selectedSchool, classData);
                    setClasses(classData);
                } catch (error) {
                    console.error("❌ Error loading classes:", error);
                }
            } else {
                setClasses([]);
            }
        };
        fetchClassList();
    }, [selectedSchool]);

    if (!user) {
        return <h2 className="text-center text-xl mt-8">Loading user data...</h2>;
    }

    if (!["admin", "teacher"].includes(user.role)) {
        return <h2 className="text-center text-xl mt-8">Access Denied: Only Admins and Teachers can manage lessons.</h2>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="heading-primary">Lesson Management</h1>

            {/* Filters Section */}
            <div className="flex flex-wrap items-end gap-4 mb-8">
                <div className="flex flex-col flex-1 min-w-[200px]">
                    <label className="font-bold mb-2 text-gray-700">Start Date:</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                </div>
                <div className="flex flex-col flex-1 min-w-[200px]">
                    <label className="font-bold mb-2 text-gray-700">End Date:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                </div>
                <div className="flex flex-col flex-1 min-w-[200px]">
                    <label className="font-bold mb-2 text-gray-700">Select School:</label>
                    <select
                        value={selectedSchool}
                        onChange={(e) => setSelectedSchool(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    >
                        <option value="">-- Select School --</option>
                        {schools.map((school) => (
                            <option key={school.id} value={school.id}>
                                {school.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col flex-1 min-w-[200px]">
                    <label className="font-bold mb-2 text-gray-700">Select Class:</label>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        disabled={!selectedSchool}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors disabled:opacity-50"
                    >
                        <option value="">-- Select Class --</option>
                        {classes.map((className, index) => (
                            <option key={index} value={className}>
                                {className}
                            </option>
                        ))}
                    </select>
           
                </div>
                <div className="flex flex-col flex-1 min-w-[200px]">
                    <button
                        onClick={fetchLessons}
                        className="btn btn-primary flex items-center justify-center gap-2"
                    >
                        🔍 Fetch Lessons
                    </button>
                </div>
            </div>

            {/* Loading and Error States */}
            {loading && <p className="text-center text-gray-600">Loading...</p>}
            {error && <p className="text-center text-red-500 font-medium">{error}</p>}

            {/* Lessons Table & Export Buttons */}
            {!loading && !error && lessons.length > 0 ? (
                <>
                    <div className="text-center mb-4">
                        <h2 className="text-xl font-bold">
                            Lesson Plan for {selectedMonth || "Selected Month"} - Class{" "}
                            {selectedClass || "Selected Class"}
                        </h2>
                    </div>
                    <div className="overflow-x-auto shadow-lg rounded-lg">
                        <table id="lessonTable" className="w-full border-collapse">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">
                                        Date
                                    </th>
                                    <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">
                                        School
                                    </th>
                                    <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">
                                        Class
                                    </th>
                                    <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">
                                        Planned Topic
                                    </th>
                                    <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {lessons.map((lesson) => (
                                    <tr key={lesson.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-3 border border-gray-300 text-gray-600">
                                            {formatDateWithDay(lesson.session_date)}
                                        </td>
                                        <td className="p-3 border border-gray-300 text-gray-600">
                                            {lesson.school_name}
                                        </td>
                                        <td className="p-3 border border-gray-300 text-gray-600">
                                            {lesson.student_class}
                                        </td>
                                        <td className="p-3 border border-gray-300 text-gray-600">
                                            {editingLessonId === lesson.id ? (
                                                <input
                                                    type="text"
                                                    value={editedTopic}
                                                    onChange={(e) => setEditedTopic(e.target.value)}
                                                    className="p-2 border border-gray-300 rounded-lg w-fu
                                                    ll"
                                                />
                                            ) : (
                                                lesson.planned_topic
                                            )}
                                        </td>
                                        <td className="p-3 border border-gray-300 text-gray-600">
                                            {editingLessonId === lesson.id ? (
                                                <button
                                                    onClick={() => handleSave(lesson.id)}
                                                    className="btn btn-primary mr-2"
                                                >
                                                    Save
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleEdit(lesson.id, lesson.planned_topic)}
                                                    className="btn btn-primary mr-2"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(lesson.id)}
                                                className="btn btn-danger"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-center mt-4 gap-4">
                        <button onClick={handleDownloadImage} className="btn btn-primary">
                            📷 Download Image
                        </button>
                        <button onClick={handleDownloadPdf} className="btn btn-primary">
                            📄 Download PDF
                        </button>
                        <button onClick={handlePrint} className="btn btn-primary">
                            🖨 Print
                        </button>
                    </div>
                    <div className="absolute -left-[9999px] top-0">
                        <table id="lessonTableExport" className="w-full border-collapse">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th
                                        colSpan="2"
                                        className="p-5 text-center text-xl font-bold bg-gray-200 border border-gray-300"
                                    >
                                        Lesson Plan for{" "}
                                        {schools.find((s) => s.id === selectedSchool)?.name || "Selected School"}{" "}
                                        - Class {selectedClass || "Selected Class"} - {selectedMonth || "Selected Month"}
                                    </th>
                                </tr>
                                <tr>
                                    <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">
                                        Date
                                    </th>
                                    <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">
                                        Planned Topic
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {lessons.map((lesson) => (
                                    <tr key={lesson.id}>
                                        <td className="p-3 border border-gray-300 text-gray-600">
                                            {formatDateWithDay(lesson.session_date)}
                                        </td>
                                        <td className="p-3 border border-gray-300 text-gray-600">
                                            {lesson.planned_topic}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <p className="text-center text-gray-600">No lessons found.</p>
            )}

            <div className="flex justify-center mt-8">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    ➕ Add Lesson Plan
                </button>
            </div>

            {isModalOpen && (
                <LessonPlanModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
}

export default LessonsPage;