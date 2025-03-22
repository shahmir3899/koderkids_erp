import React, { useState, useEffect } from "react";
import axios from "axios";
import { getAuthHeaders, getSchools, getClasses } from "../api";
import { useAuth } from "../auth";
import LessonPlanModal from "../components/LessonPlanModal";
import { toast } from "react-toastify";
import html2canvas from "html2canvas";
import html2pdf from "html2pdf.js"; // ✅ Use this instead of jsPDF

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


    const API_URL = process.env.REACT_APP_API_URL;

    // Helper function to format date
const formatDateWithDay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        weekday: "long",  // Monday, Tuesday, etc.
        day: "numeric",
        month: "short",   // Mar, Apr, etc.
        year: "numeric",
    });
};

    const handleDownloadImage = () => {
  setTimeout(() => {
    const lessonTable = document.getElementById("lessonTableExport");

    if (!lessonTable) {
      toast.error("Lesson table not found.");
      return;
    }

    toast.info("Generating image, please wait...");

    // Temporarily show the hidden table before capturing
    lessonTable.style.position = "relative";
    lessonTable.style.left = "0px";
    lessonTable.style.opacity = "1";
    lessonTable.style.visibility = "visible";

    html2canvas(lessonTable, {
      onclone: (clonedDoc) => {
        const clonedTable = clonedDoc.getElementById("lessonTableExport");
        clonedTable.style.display = "table"; // Ensure it's visible in the clone
      }
    }).then((canvas) => {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `LessonPlan_${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      toast.success("Image downloaded!");

      // Restore hidden state
      lessonTable.style.position = "absolute";
      lessonTable.style.left = "-9999px";
      lessonTable.style.opacity = "0";
      lessonTable.style.visibility = "hidden";
    }).catch((error) => {
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

      // Temporarily show table
      lessonTable.style.position = "relative";
      lessonTable.style.left = "0px";
      lessonTable.style.opacity = "1";
      lessonTable.style.visibility = "visible";

      const options = {
        margin: 10,
        filename: `LessonPlan_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          onclone: (clonedDoc) => {
            const clonedTable = clonedDoc.getElementById("lessonTableExport");
            clonedTable.style.display = "table";
          }
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

    html2pdf().set(options).from(lessonTable).save().then(() => {
      toast.success("PDF downloaded!");

      // Restore hidden state
      lessonTable.style.position = "absolute";
      lessonTable.style.left = "-9999px";
      lessonTable.style.opacity = "0";
      lessonTable.style.visibility = "hidden";
    }).catch((error) => {
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
                                font-family: Arial, sans-serif;
                                text-align: center;
                            }
                            .header {
                                text-align: center;
                                margin-bottom: 20px;
                            }
                            .logo {
                                width: 100px;
                                margin-bottom: 10px;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 20px;
                            }
                            th, td {
                                border: 1px solid black;
                                padding: 10px;
                                text-align: left;
                            }
                            th {
                                background-color: #f4f4f4;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <img class="logo" src="YOUR_LOGO_URL_HERE" alt="Logo">
                            <h2>Lesson Plan for ${selectedMonth} - Class ${selectedClass}</h2>
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

    const fetchLessons = async () => {
        if (!startDate || !endDate || !selectedSchool || !selectedClass) {
            console.log("⚠️ Please select all required fields.");
            return;
        }
    
        // Start loading state and reset previous data/error
        setLoading(true);
        setError(null);
        setLessons([]);
    
        // Determine selected school name for dynamic message
        const schoolName = schools.find(s => s.id === selectedSchool)?.name || "Selected School";
        const startMonth = new Date(startDate).toLocaleString("en-US", { month: "long", year: "numeric" });
        setSelectedMonth(startMonth); // Update state with the formatted month
        // Show a loading toast with dynamic details (non-blocking spinner)
        toast.info(`Fetching lessons for ${schoolName} - ${selectedClass} from ${startDate} to ${endDate}...`, {
            autoClose: false,    // keep toast open until manually dismissed
            closeOnClick: false, // prevent accidental dismissal
            toastId: "fetchLessonsLoading"  // ensure unique, single toast
        });
    
        try {
            console.log("🚀 Fetching lessons...");
            const lessonsData = await fetchLessonsForRange(startDate, endDate, selectedSchool, selectedClass);
            setLessons(lessonsData);
            setEditingLessonId(null);
        } catch (err) {
            console.error("❌ Error fetching lessons:", err);
            setError("Failed to fetch lessons.");
            toast.error("Failed to fetch lessons. Please try again.");
        } finally {
            // Stop loading state and remove the loading toast
            setLoading(false);
            toast.dismiss("fetchLessonsLoading");
        }
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
            if (!selectedSchool) {
                setClasses([]);
                return;
            }
            try {
                const classData = await getClasses(selectedSchool);
                console.log("📚 Fetched Classes for School:", selectedSchool, classData);
                setClasses(classData);
            } catch (error) {
                console.error("❌ Error loading classes:", error);
            }
        };
        fetchClassList();
    }, [selectedSchool]);

    const handleEdit = (lessonId, currentTopic) => {
        setEditingLessonId(lessonId);
        setEditedTopic(currentTopic);
    };

    const handleSave = async (lessonId) => {
        try {
            const endpoint = `${API_URL}/api/lesson-plans/${lessonId}/update-planned-topic/`;
            await axios.put(endpoint, { planned_topic: editedTopic }, { headers: getAuthHeaders() });
            setLessons(lessons.map((lesson) =>
                lesson.id === lessonId ? { ...lesson, planned_topic: editedTopic } : lesson
            ));
            setEditingLessonId(null);
            setEditedTopic("");
            toast.success("Lesson updated successfully");
        } catch (err) {
            console.error("❌ Error updating lesson:", err.response?.data || err.message);
            toast.error(`Failed to update lesson: ${err.response?.data?.detail || err.message}`);
        }
    };

    if (!user) {
        return <h2 className="text-center text-xl mt-8">Loading user data...</h2>;
    }

    if (!["admin", "teacher"].includes(user.role)) {
        return <h2 className="text-center text-xl mt-8">Access Denied: Only Admins and Teachers can manage lessons.</h2>;
    }

    return (
        <div className="container mx-auto p-4">
          <h1 className="heading-primary">
            Lesson Management
          </h1>
      
          {/* Filters Section */}
          <div className="flex flex-wrap items-end gap-4 mb-8">
            {/* Start Date */}
            <div className="flex flex-col flex-1 min-w-[200px]">
              <label className="font-bold mb-2 text-gray-700">Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              />
            </div>
      
            {/* End Date */}
            <div className="flex flex-col flex-1 min-w-[200px]">
              <label className="font-bold mb-2 text-gray-700">End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              />
            </div>
      
            {/* School Selection */}
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
      
            {/* Class Selection */}
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
      
            {/* Fetch Lessons Button */}
            <div className="flex flex-col flex-1 min-w-[200px]">
              <button
                onClick={fetchLessons}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                🔍 Fetch Lessons
              </button>
            </div>
          </div>
      
          {/* Loading and Error States */}
          {loading && (
            <p className="text-center text-gray-600">Loading...</p>
          )}
          {error && (
            <p className="text-center text-red-500 font-medium">{error}</p>
          )}
      
          {/* Lessons Table & Export Buttons */}
          {!loading && !error && lessons.length > 0 ? (
            <>
              {/* Lesson Plan Heading */}
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold">
                  Lesson Plan for {selectedMonth || "Selected Month"} - Class {selectedClass || "Selected Class"}
                </h2>
              </div>
      
              {/* ✅ Visible Table for UI Display */}
              <div className="overflow-x-auto shadow-lg rounded-lg">
                <table id="lessonTable" className="w-full border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">Date</th>
                      <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">School</th>
                      <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">Class</th>
                      <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">Planned Topic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessons.map((lesson) => (
                      <tr key={lesson.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 border border-gray-300 text-gray-600">{formatDateWithDay(lesson.session_date)}</td>
                        <td className="p-3 border border-gray-300 text-gray-600">{lesson.school_name}</td>
                        <td className="p-3 border border-gray-300 text-gray-600">{lesson.student_class}</td>
                        <td className="p-3 border border-gray-300 text-gray-600">{lesson.planned_topic}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
      
              {/* ✅ Export Buttons */}
              <div className="flex justify-center mt-4 gap-4">
                <button onClick={handleDownloadImage} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                  📷 Download Image
                </button>
                <button onClick={handleDownloadPdf} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
                  📄 Download PDF
                </button>
                <button onClick={handlePrint} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                  🖨 Print
                </button>
              </div>
      
              {/* ✅ Hidden Table for Export */}
<div className="absolute -left-[9999px] top-0">
  <table id="lessonTableExport" className="w-full border-collapse">
    <thead className="bg-gray-100">
      {/* ✅ Moved Heading Inside Table as a Full-Width Row */}
      <tr>
        <th colSpan="2" className="p-5 text-center text-xl font-bold bg-gray-200 border border-gray-300">
          Lesson Plan for {selectedMonth || "Selected Month"} - Class {selectedClass || "Selected Class"}
        </th>
      </tr>
      <tr>
        <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">Date</th>
        <th className="p-3 border border-gray-300 text-left text-gray-700 font-bold">Planned Topic</th>
      </tr>
    </thead>
    <tbody>
      {lessons.map((lesson) => (
        <tr key={lesson.id}>
          <td className="p-3 border border-gray-300 text-gray-600">{formatDateWithDay(lesson.session_date)}</td>
          <td className="p-3 border border-gray-300 text-gray-600">{lesson.planned_topic}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

            </>
          ) : (
            <p className="text-center text-gray-600">No lessons found.</p>
          )}
      
          {/* Add Lesson Plan Button & Modal */}
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
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