import React, { useEffect, useState } from "react";
import axios from "axios";
import { getAuthHeaders, getSchools, getClasses, API_URL } from "../api";
import StudentReportModal from "../components/StudentReportModal";

const getMonthDates = (month) => {
  const [year, monthNumber] = month.split("-");
  const firstDay = `${month}-01`;
  const lastDay = new Date(year, monthNumber, 0).toISOString().split("T")[0];
  return { firstDay, lastDay };
};

const ReportsPage = () => {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchSchoolList = async () => {
      try {
        const schoolData = await getSchools();
        setSchools(schoolData);
      } catch (error) {
        console.error("Error loading schools:", error);
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
        setClasses(classData);
      } catch (error) {
        console.error("Error loading classes:", error);
      }
    };
    fetchClassList();
  }, [selectedSchool]);

  const fetchStudents = async () => {
    if (!selectedMonth || !selectedSchool || !selectedClass) {
      alert("Please select a month, school, and class before searching.");
      return;
    }

    try {
      const { firstDay } = getMonthDates(selectedMonth);
      const [year, month, day] = firstDay.split("-");
      const formattedDate = `${month}/${day}/${year}`;

      const response = await axios.get(`${API_URL}/api/students-prog/`, {
        headers: getAuthHeaders(),
        params: {
          school_id: selectedSchool,
          class_id: selectedClass,
          session_date: formattedDate,
        },
      });

      const studentList = response.data?.students || response.data || [];
      if (studentList.length === 0) {
        alert("No students found for the selected criteria.");
      }
      setStudents(studentList);
    } catch (error) {
      console.error("Error fetching students:", error.response?.data || error.message);
      alert("Failed to fetch students. Please try again.");
      setStudents([]);
    }
  };

  const handleGenerateReport = (studentId) => {
    setSelectedStudentId(studentId);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">📊 Monthly Reports</h2>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="font-bold mb-2 text-gray-700">Select Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
          />
        </div>

        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="font-bold mb-2 text-gray-700">School:</label>
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
          <label className="font-bold mb-2 text-gray-700">Class:</label>
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
            onClick={fetchStudents}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            🔍 Search
          </button>
        </div>
      </div>

      {Array.isArray(students) && students.length > 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">📋 Student List</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left text-gray-700 font-semibold">Student Name</th>
                  <th className="p-3 text-left text-gray-700 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 border-t border-gray-200 text-gray-600">{student.name}</td>
                    <td className="p-3 border-t border-gray-200">
                      <button
                        onClick={() => handleGenerateReport(student.id)}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                      >
                        📄 Generate Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500">No students found. Adjust filters and try again.</p>
      )}

      {isModalOpen && (
        <StudentReportModal
          studentId={selectedStudentId}
          month={selectedMonth}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ReportsPage;