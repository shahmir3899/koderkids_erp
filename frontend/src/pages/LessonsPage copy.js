import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getAuthHeaders, getSchools, getClasses } from "../api";
import { useAuth } from "../auth";
import LessonPlanModal from "../components/LessonPlanModal";
import { toast } from "react-toastify";
import html2canvas from "html2canvas";
import html2pdf from "html2pdf.js";
import debounce from "lodash.debounce";
import { ClipLoader } from "react-spinners";

function LessonsPage() {
    const { user } = useAuth();

    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedSchool, setSelectedSchool] = useState("");
    const [selectedSchoolName, setSelectedSchoolName] = useState("");
    const [schoolsLoading, setSchoolsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [schools, setSchools] = useState([]);
    const [classes, setClasses] = useState([]);
    const [editingLessonId, setEditingLessonId] = useState(null);
    const [editedTopic, setEditedTopic] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("");
    const [lastFetched, setLastFetched] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(null);
    const [saveLoading, setSaveLoading] = useState(null);

    const API_URL = process.env.REACT_APP_API_URL;

    const formatDateWithDay = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const formatDateRange = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return `${startDate.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
        })} - ${endDate.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
        })}`;
    };

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

            const cacheKey = `${startDate}_${endDate}_${selectedSchool}_${selectedClass}`;
            if (lastFetched === cacheKey) {
                console.log("📦 Using cached lessons");
                return;
            }

            setLoading(true);
            setError(null);
            setLessons([]);

            const schoolId = parseInt(selectedSchool);
            const schoolName = schools.find((s) => s.id === schoolId)?.name || "Unknown School";
            setSelectedSchoolName(schoolName);
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
                setLastFetched(cacheKey);

                if (schoolName === "Unknown School" && lessonsData.length > 0) {
                    const lessonSchoolName = lessonsData[0]?.school_name || "Unknown School";
                    setSelectedSchoolName(lessonSchoolName);
                    console.log("🔍 Fallback: Set school name from lesson data:", lessonSchoolName);
                }
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

    const handleDelete = async (lessonId) => {
        if (!window.confirm("Are you sure you want to delete this lesson?")) return;
        setDeleteLoading(lessonId);
        try {
            const endpoint = `${API_URL}/api/lesson-plans/${lessonId}/`;
            await axios.delete(endpoint, { headers: getAuthHeaders() });
            setLessons(lessons.filter((lesson) => lesson.id !== lessonId));
            toast.success("Lesson deleted successfully");
        } catch (err) {
            console.error("❌ Error deleting lesson:", err.response?.data || err.message);
            toast.error(`Failed to delete lesson: ${err.response?.data?.detail || err.message}`);
        } finally {
            setDeleteLoading(null);
        }
    };

    const handleEdit = (lessonId, currentTopic) => {
    console.log("Editing lesson:", lessonId, "Current topic:", currentTopic);
    setEditingLessonId(lessonId);
    setEditedTopic(currentTopic || "");
};

    const handleSave = async (lessonId) => {
        setSaveLoading(lessonId);
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
        } finally {
            setSaveLoading(null);
        }
    };

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
                scale: 2,
                onclone: (clonedDoc) => {
                    const clonedTable = clonedDoc.getElementById("lessonTableExport");
                    clonedTable.style.display = "block";
                },
            })
                .then((canvas) => {
                    const link = document.createElement("a");
                    link.href = canvas.toDataURL("image/png");
                    link.download = `LessonPlan_${selectedSchool}_${selectedClass}_${selectedMonth}.png`;
                    link.click();
                    toast.success("Image downloaded successfully!");

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

            const options = {
                margin: [15, 10, 15, 10],
                filename: `LessonPlan_${selectedSchoolName}_${selectedClass}_${selectedMonth}.pdf`,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    onclone: (clonedDoc) => {
                        const clonedTable = clonedDoc.getElementById("lessonTableExport");
                        clonedTable.style.display = "block";
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
                    toast.success("PDF downloaded successfully!");

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

    const handlePrint = () => {
        setTimeout(() => {
            const lessonTable = document.getElementById("lessonTableExport")?.outerHTML;
            if (!lessonTable) {
                toast.error("Lesson table not found.");
                return;
            }

            const printWindow = window.open("", "_blank");

            printWindow.document.write(`
                <html>
                    <head>
                        <title>Lesson Plan</title>
                        <style>
                            body {
                                font-family: 'Arial', sans-serif;
                                margin: 20mm;
                                text-align: center;
                            }
                            .export-container {
                                width: 100%;
                                max-width: 800px;
                                margin: 0 auto;
                            }
                            .header {
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                margin-bottom: 20px;
                            }
                            .logo {
                                width: 120px;
                                margin-right: 20px;
                            }
                            .header-text {
                                text-align: left;
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
                                font-size: 14px;
                            }
                            th, td {
                                border: 1px solid #ddd;
                                padding: 12px;
                                text-align: left;
                            }
                            th {
                                background-color: #f4f4f4;
                                font-weight: bold;
                                color: #333;
                            }
                            tr:nth-child(even) {
                                background-color: #f9f9f9;
                            }
                            tr:hover {
                                background-color: #f1f1f1;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="export-container">
                            <div class="header">
                                <img class="logo" src="/logo.png" alt="School Logo">
                                <div class="header-text">
                                    <div class="title">Lesson Plan</div>
                                    <div class="subtitle">${selectedSchoolName} - Class ${selectedClass || "Selected Class"}</div>
                                    <div class="subtitle">${formatDateRange(startDate, endDate)}</div>
                                </div>
                            </div>
                            ${lessonTable}
                        </div>
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
            setSchoolsLoading(true);
            try {
                const schoolData = await getSchools();
                console.log("🏫 Fetched Schools:", schoolData);
                setSchools(schoolData);
                if (selectedSchool && schoolData.length > 0) {
                    const schoolId = parseInt(selectedSchool);
                    const schoolName = schoolData.find((s) => s.id === schoolId)?.name || "Unknown School";
                    setSelectedSchoolName(schoolName);
                    console.log("🔍 Updated selectedSchoolName after schools fetch:", schoolName);
                }
            } catch (error) {
                console.error("❌ Error loading schools:", error);
                setError("Failed to load schools.");
            } finally {
                setSchoolsLoading(false);
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

    useEffect(() => {
        console.log("🔍 Schools state:", schools);
        console.log("🔍 Selected School ID:", selectedSchool, typeof selectedSchool);
        console.log("🔍 Selected School Name:", selectedSchoolName);
    }, [schools, selectedSchool, selectedSchoolName]);

    if (!user) {
        return (
            <div className="flex justify-center items-center h-screen">
                <ClipLoader color="#000000" size={50} />
            </div>
        );
    }

    if (!["admin", "teacher"].includes(user.role)) {
        return <h2 className="text-center text-xl mt-8">Access Denied: Only Admins and Teachers can manage lessons.</h2>;
    }

    if (schoolsLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <ClipLoader color="#000000" size={50} />
                <span className="ml-4 text-gray-600">Loading schools...</span>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="heading-primary">Lesson Management</h1>

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
                        onChange={(e) => {
                            const schoolId = e.target.value;
                            setSelectedSchool(schoolId);
                            const schoolIdInt = parseInt(schoolId);
                            const schoolName = schools.find((s) => s.id === schoolIdInt)?.name || "Unknown School";
                            setSelectedSchoolName(schoolName);
                            console.log("🔍 School selected:", { schoolId, schoolIdInt, schoolName });
                        }}
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
                        disabled={loading}
                    >
                        {loading ? (
                            <ClipLoader color="#ffffff" size={20} />
                        ) : (
                            "🔍 Fetch Lessons"
                        )}
                    </button>
                </div>
            </div>

            {error && <p className="text-center text-red-500 font-medium">{error}</p>}

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
                    <textarea
                        value={editedTopic}
                        onChange={(e) => setEditedTopic(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg w-full min-h-[100px] text-black resize-vertical"
                        placeholder="Edit planned topic..."
                        autoFocus
                    />
                ) : (
                    <div className="whitespace-pre-line">
                        {lesson.planned_topic || "(No topic planned)"}
                    </div>
                )}
            </td>
            <td className="p-3 border border-gray-300 text-gray-600">
                {editingLessonId === lesson.id ? (
                    <>
                        <button
                            onClick={() => handleSave(lesson.id)}
                            className="btn btn-primary mr-2"
                            disabled={saveLoading === lesson.id}
                        >
                            {saveLoading === lesson.id ? (
                                <ClipLoader color="#ffffff" size={20} />
                            ) : (
                                "Save"
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setEditingLessonId(null);
                                setEditedTopic("");
                            }}
                            className="btn btn-secondary mr-2"
                        >
                            Cancel
                        </button>
                    </>
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
                    disabled={deleteLoading === lesson.id}
                >
                    {deleteLoading === lesson.id ? (
                        <ClipLoader color="#ffffff" size={20} />
                    ) : (
                        "Delete"
                    )}
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
                        <div id="lessonTableExport" style={{ width: '800px', fontFamily: 'Arial, sans-serif' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                                <img
                                    src="/logo.png"
                                    alt="School Logo"
                                    style={{ width: '120px', marginRight: '20px' }}
                                />
                                <div style={{ textAlign: 'left' }}>
                                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', margin: 0 }}>
                                        Lesson Plan
                                    </h1>
                                    <p style={{ fontSize: '16px', color: '#666', marginTop: '5px' }}>
                                        {selectedSchoolName} - Class {selectedClass || "Selected Class"}
                                    </p>
                                    <p style={{ fontSize: '16px', color: '#666', marginTop: '5px' }}>
                                        {formatDateRange(startDate, endDate)}
                                    </p>
                                </div>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f4f4f4', fontWeight: 'bold', color: '#333' }}>
                                            Date
                                        </th>
                                        <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f4f4f4', fontWeight: 'bold', color: '#333' }}>
                                            Planned Topic
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lessons.map((lesson) => (
                                        <tr key={lesson.id}>
                                            <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', color: '#666' }}>
                                                {formatDateWithDay(lesson.session_date)}
                                            </td>
                                            <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', color: '#666' }}>
                                                {lesson.planned_topic}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                loading ? (
                    <div className="flex justify-center items-center h-64">
                        <ClipLoader color="#000000" size={50} />
                    </div>
                ) : (
                    <p className="text-center text-gray-600">No lessons found.</p>
                )
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