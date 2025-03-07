import React, { useState, useEffect, useMemo } from "react";
import AddStudentPopup from "./AddStudentPopup";  // ✅ Ensure it's imported
import { updateStudent, deleteStudent, getStudents  } from "../api";

import { useCallback } from "react";
import axios from "axios";  // ✅ Fix axios not defined error



function StudentsPage() {
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [schoolFilter, setSchoolFilter] = useState("All Schools");
    const [classFilter, setClassFilter] = useState("All Classes");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [schools, setSchools] = useState([]);
    const [classes, setClasses] = useState([]);
    const [showResults, setShowResults] = useState(false);


    const availableClasses = useMemo(() => {
        if (students.length === 0) return ["All Classes"];
    
        const uniqueClasses = Array.from(new Set(students.map(student => student.student_class)))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    
        console.log("📚 Updated Class Filter Options:", uniqueClasses);
        return ["All Classes", ...uniqueClasses];
    
    }, [students]);  // ✅ This ensures availableClasses updates when students change
    

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError(null);
    
        try {
            const filteredSchool = schoolFilter !== "All Schools" ? schoolFilter : null;
            const filteredClass = classFilter !== "All Classes" ? classFilter : null;
            
    
            console.log(`🔍 Fetching students for School: ${filteredSchool}, Class: ${filteredClass}`);
            
            const response = await getStudents(filteredSchool, filteredClass);
            
            if (!Array.isArray(response)) {
                console.error("❌ Error: Expected an array but received:", response);
                return;
            }
    
            setStudents(response);
            setShowResults(true); // ✅ Ensure table is displayed
        } catch (error) {
            console.error("Error fetching students:", error);
            setError("Failed to fetch students.");
        } finally {
            setLoading(false);
        }
    }, [schoolFilter, classFilter]);
    
    async function fetchAllClasses(schoolId) {
        try {
            console.log("🔄 Fetching students and extracting classes...");
    
            const token = localStorage.getItem("access");
            if (!token) {
                console.error("❌ No authentication token found!");
                return;
            }
    
            // ✅ If schoolId is still missing, log error
            if (!schoolId) {
                console.error("❌ No school selected! Cannot fetch classes.");
                return;
            }
    
            console.log("📌 Fetching classes for school:", schoolId);
    
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/students/?school=${schoolId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
    
            console.log("✅ Fetched Student Data:", response.data);
    
            if (Array.isArray(response.data)) {
                const extractedClasses = [...new Set(response.data.map(student => student.student_class))];
                setClasses(["All Classes", ...extractedClasses]);
                console.log("📚 Extracted Classes:", extractedClasses);
            } else {
                console.error("❌ Unexpected API response:", response.data);
            }
        } catch (error) {
            console.error("❌ Error fetching students:", error);
        }
    }
    
    
    
    
    
    
    
    
    useEffect(() => {
        if (students.length > 0) {
            const uniqueClassesFromStudents = Array.from(new Set(students.map(student => student.student_class))).sort();
            console.log("✅ Extracted Classes from Students:", uniqueClassesFromStudents);
    
            setClasses([...["All Classes", ...uniqueClassesFromStudents]]); // ✅ Force state update
        }
    }, [students]);
    
    
    useEffect(() => {
        console.log("📚 Classes state updated:", classes);
    }, [classes]);
    
    // useEffect(() => {
    //     fetchStudents();  // ✅ Now fetchStudents is stable
    // }, [fetchStudents]);
    

    
    useEffect(() => {
        console.log("🔄 Students data after refresh:", students);
        if (students.length > 0) {
            const uniqueClasses = Array.from(new Set(students.map(student => student.student_class)))
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    
            console.log("✅ Extracted Classes from Students:", uniqueClasses);
            setClasses(["All Classes", ...uniqueClasses]); 
        }
    }, [students]);
    
    
    
    
    useEffect(() => {
        async function fetchSchools() {
            try {
                console.log("🔄 Fetching list of schools...");
    
                const token = localStorage.getItem("access");
                if (!token) {
                    console.error("❌ No authentication token found!");
                    return;
                }
    
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/schools/`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
    
                console.log("✅ Raw Schools API Response:", response.data);
    
                if (Array.isArray(response.data) && response.data.length > 0) {
                    setSchools(response.data);
    
                    // ✅ Store the first school ID if it's missing
                    if (!localStorage.getItem("selected_school")) {
                        const firstSchoolId = response.data[0].id;
                        localStorage.setItem("selected_school", firstSchoolId);
                        console.log("🏫 Stored School ID:", firstSchoolId);
    
                        // ✅ Fetch classes immediately after storing school ID
                        fetchAllClasses(firstSchoolId);
                    }
                } else {
                    console.error("❌ No schools found.");
                }
            } catch (error) {
                console.error("❌ Error fetching schools:", error);
            }
        }
    
        fetchSchools();
    }, []);
    
    
    
    
    


    const filteredStudents = useMemo(() => {
        return students.filter((student) =>
            (searchTerm === "" ||
                (student.name && student.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (student.reg_num && student.reg_num.toLowerCase().includes(searchTerm.toLowerCase()))) &&
            (schoolFilter === "" || schoolFilter === "All Schools" || student.school === schoolFilter) &&
            (classFilter === "" || classFilter === "All Classes" || student.student_class === classFilter)
        );
    }, [students, searchTerm, schoolFilter, classFilter]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleSearchClick = () => {
        console.log("🔍 Search button clicked. Fetching students...");
        fetchStudents(); // ✅ Ensure it fetches filtered students
    };
    

    const handleSchoolFilterChange = (e) => {
        const newValue = e.target.value;
        setSchoolFilter(newValue);
        console.log("📌 School filter updated to:", newValue);
    };

    const handleClassFilterChange = (e) => {
        const selectedClass = e.target.value;
        
        // ✅ Ensure selected class exists in availableClasses
        if (availableClasses.includes(selectedClass)) {
            setClassFilter(selectedClass);
            console.log("📌 Class filter updated to:", selectedClass);
        } else {
            setClassFilter("All Classes"); // ✅ Reset if invalid
        }
    };

    const handleViewDetails = (student) => {
        setSelectedStudent(student);
        setIsEditing(false);
    };

    const handleCloseDetails = () => {
        setSelectedStudent(null);
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSaveChanges = async () => {
        try {
            const updatedStudent = await updateStudent(selectedStudent.id, selectedStudent);
            setStudents(students.map(student =>
                student.id === updatedStudent.id ? updatedStudent : student
            ));
            setIsEditing(false);
            alert("✅ Student updated successfully!");
        } catch (error) {
            console.error("Error updating student:", error);
            alert("⚠️ Failed to update student.");
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setSelectedStudent(prev => ({ ...prev, [name]: value }));
    };
    
    const handleAddNewStudent = () => {
        console.log("🆕 Opening Add Student Popup...");
        setIsAdding(true);
    };

 

    const handleDeleteStudent = async (studentId) => {
        if (!window.confirm("Are you sure you want to delete this student?")) return;

        try {
            await deleteStudent(studentId);
            setStudents(students.filter(student => student.id !== studentId));
            alert("✅ Student deleted successfully!");
        } catch (error) {
            console.error("❌ Error deleting student:", error);
            alert("⚠️ Failed to delete student.");
        }
    };

    
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header Section */}
            <header className="bg-white shadow-md p-6 rounded-lg mb-6">
                <h1 className="text-3xl font-bold text-gray-800 text-center mb-6">Student Management</h1>
    
                {/* Search and Filters Section */}
                <div className="flex flex-wrap gap-4 mb-6">
                    {/* Search Input */}
                    <input
                        type="text"
                        placeholder="Search by Name or Reg Num"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors flex-1 min-w-[200px]"
                    />
    
                    {/* School Filter */}
                    <select
                        value={schoolFilter}
                        onChange={handleSchoolFilterChange}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors flex-1 min-w-[200px]"
                    >
                        <option value="All Schools">All Schools</option>
                        {schools.map((school) => (
                            <option key={school.id} value={school.name}>{school.name}</option>
                        ))}
                    </select>
    
                    {/* Class Filter */}
                    <select
                        value={classFilter}
                        onChange={handleClassFilterChange}
                        className="p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors flex-1 min-w-[200px]"
                    >
                        {classes.length > 1 ? (
                            classes.map((cls, index) => (
                                <option key={index} value={cls}>{cls}</option>
                            ))
                        ) : (
                            <option disabled>Loading classes...</option>
                        )}
                    </select>
    
                    {/* Search Button */}
                    <button
                        onClick={handleSearchClick}
                        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                    >
                        🔍 Search
                    </button>
    
                    {/* Add New Student Button */}
                    <button
                        onClick={handleAddNewStudent}
                        className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                    >
                        ➕ Add New Student
                    </button>
                </div>
            </header>
    
            {/* Loading and Error Messages */}
            {loading && <p className="text-center text-gray-600">Loading...</p>}
            {error && <p className="text-center text-red-500">{error}</p>}
    
            {/* Results Table */}
            {showResults && !loading && !error && (
                <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 text-left text-gray-700 font-semibold">Reg Num</th>
                                <th className="p-3 text-left text-gray-700 font-semibold">Name</th>
                                <th className="p-3 text-left text-gray-700 font-semibold">School</th>
                                <th className="p-3 text-left text-gray-700 font-semibold">Class</th>
                                <th className="p-3 text-left text-gray-700 font-semibold">Monthly Fee</th>
                                <th className="p-3 text-left text-gray-700 font-semibold">Phone</th>
                                <th className="p-3 text-left text-gray-700 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-3 border-t border-gray-200 text-gray-600">{student.reg_num}</td>
                                    <td className="p-3 border-t border-gray-200 text-gray-600">{student.name}</td>
                                    <td className="p-3 border-t border-gray-200 text-gray-600">{student.school}</td>
                                    <td className="p-3 border-t border-gray-200 text-gray-600">{student.student_class}</td>
                                    <td className="p-3 border-t border-gray-200 text-gray-600">{student.monthly_fee}</td>
                                    <td className="p-3 border-t border-gray-200 text-gray-600">{student.phone}</td>
                                    <td className="p-3 border-t border-gray-200">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleViewDetails(student)}
                                                className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
                                            >
                                                👁️ View
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStudent(student.id)}
                                                className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
    
            {/* Student Profile Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h2 className="text-2xl font-bold text-blue-600 mb-4">Student Profile</h2>
                        {isEditing ? (
                            <>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-gray-700">Name:</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={selectedStudent.name}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700">Reg Num:</label>
                                        <input
                                            type="text"
                                            name="reg_num"
                                            value={selectedStudent.reg_num}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700">School:</label>
                                        <input
                                            type="text"
                                            name="school"
                                            value={selectedStudent.school}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700">Class:</label>
                                        <input
                                            type="text"
                                            name="student_class"
                                            value={selectedStudent.student_class}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700">Monthly Fee:</label>
                                        <input
                                            type="number"
                                            name="monthly_fee"
                                            value={selectedStudent.monthly_fee}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700">Phone:</label>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={selectedStudent.phone}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <button
                                        onClick={handleSaveChanges}
                                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                                    >
                                        Save Changes
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <p><strong>Reg Num:</strong> {selectedStudent.reg_num}</p>
                                    <p><strong>Name:</strong> {selectedStudent.name}</p>
                                    <p><strong>School:</strong> {selectedStudent.school}</p>
                                    <p><strong>Class:</strong> {selectedStudent.student_class}</p>
                                    <p><strong>Monthly Fee:</strong> {selectedStudent.monthly_fee}</p>
                                    <p><strong>Phone:</strong> {selectedStudent.phone}</p>
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <button
                                        onClick={handleEdit}
                                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={handleCloseDetails}
                                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
    
            {/* Add Student Popup */}
            {isAdding && <AddStudentPopup onClose={() => setIsAdding(false)} />}
        </div>
    );
}

export default StudentsPage;