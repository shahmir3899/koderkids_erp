import React, { useState, useEffect, useMemo } from "react";
import AddStudentPopup from "./AddStudentPopup";  // ✅ Ensure it's imported
import { updateStudent, deleteStudent, getStudents  } from "../api";
import "../App.css";
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
        <div className="App">
            <header className="App-header">
                <h1>Student Management</h1>

                <input
                    type="text"
                    placeholder="Search by Name or Reg Num"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc", marginRight: "10px" }}
                />

                <select
                    value={schoolFilter}
                    onChange={handleSchoolFilterChange}
                    style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc", marginRight: "10px" }}
                >
                    <option value="All Schools">All Schools</option>
                    {schools.map((school, index) => (
                        <option key={school.id} value={school.name}>{school.name}</option>
                    ))}
                </select>

                <select value={classFilter} onChange={handleClassFilterChange}>
    {classes.length > 1 ? (
        classes.map((cls, index) => (
            <option key={index} value={cls}>{cls}</option>
        ))
    ) : (
        <option disabled>Loading classes...</option> // ✅ Better UX
    )}
</select>



                <button
                    onClick={handleSearchClick}
                    style={{ padding: "10px", backgroundColor: "#007BFF", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
                >
                    🔍 Search
                </button>

                <button
                    onClick={handleAddNewStudent}
                    style={{ padding: "10px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", marginLeft: "10px" }}
                    //{isAdding && <AddStudentPopup />}  // ✅ Show the new form
                >
                    ➕ Add New Student
                </button>
            </header>

            {loading && <p>Loading...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            {showResults && !loading && !error && (
                <table className="student-table">
                    <thead>
                        <tr>
                            <th>Reg Num</th>
                            <th>Name</th>
                            <th>School</th>
                            <th>Class</th>
                            <th>Monthly Fee</th>
                            <th>Phone</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map((student) => (
                            <tr key={student.id} style={{ cursor: "pointer" }}>
                                <td>{student.reg_num}</td>
                                <td>{student.name}</td>
                                <td>{student.school}</td>
                                <td>{student.student_class}</td>
                                <td>{student.monthly_fee}</td>
                                <td>{student.phone}</td>
                                <td>
                                    <button
                                        onClick={() => handleViewDetails(student)}
                                        style={{
                                            padding: "5px 8px",
                                            fontSize: "12px",
                                            backgroundColor: "#007BFF",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "3px",
                                            cursor: "pointer",
                                            marginRight: "5px",
                                            whiteSpace: "nowrap"
                                        }}
                                    >
                                        👁️
                                    </button>

                                    <button
                                        onClick={() => handleDeleteStudent(student.id)}
                                        style={{
                                            padding: "5px 8px",
                                            fontSize: "12px",
                                            backgroundColor: "#dc3545",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "3px",
                                            cursor: "pointer",
                                            whiteSpace: "nowrap"
                                        }}
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {selectedStudent && (
                <div className="modal" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)", zIndex: 1000 }}>
                    <h2 style={{ color: "#007BFF" }}>Student Profile</h2>
                    {isEditing ? (
                        <>
                            <label>Name:</label>
                            <input
                                type="text"
                                name="name"
                                value={selectedStudent.name}
                                onChange={handleInputChange}
                                style={{ marginBottom: "10px", padding: "5px", width: "100%" }}
                            />
                            <label>Reg Num:</label>
                            <input
                                type="text"
                                name="reg_num"
                                value={selectedStudent.reg_num}
                                onChange={handleInputChange}
                                style={{ marginBottom: "10px", padding: "5px", width: "100%" }}
                            />
                            <label>School:</label>
                            <input
                                type="text"
                                name="school"
                                value={selectedStudent.school}
                                onChange={handleInputChange}
                                style={{ marginBottom: "10px", padding: "5px", width: "100%" }}
                            />
                            <label>Class:</label>
                            <input
                                type="text"
                                name="student_class"
                                value={selectedStudent.student_class}
                                onChange={handleInputChange}
                                style={{ marginBottom: "10px", padding: "5px", width: "100%" }}
                            />
                            <label>Monthly Fee:</label>
                            <input
                                type="number"
                                name="monthly_fee"
                                value={selectedStudent.monthly_fee}
                                onChange={handleInputChange}
                                style={{ marginBottom: "10px", padding: "5px", width: "100%" }}
                            />
                            <label>Phone:</label>
                            <input
                                type="text"
                                name="phone"
                                value={selectedStudent.phone}
                                onChange={handleInputChange}
                                style={{ marginBottom: "10px", padding: "5px", width: "100%" }}
                            />
                            <button
                                onClick={handleSaveChanges}
                                style={{ padding: "10px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", marginRight: "10px" }}
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                style={{ padding: "10px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <p><strong>Reg Num:</strong> {selectedStudent.reg_num}</p>
                            <p><strong>Name:</strong> {selectedStudent.name}</p>
                            <p><strong>School:</strong> {selectedStudent.school}</p>
                            <p><strong>Class:</strong> {selectedStudent.student_class}</p>
                            <p><strong>Monthly Fee:</strong> {selectedStudent.monthly_fee}</p>
                            <p><strong>Phone:</strong> {selectedStudent.phone}</p>
                            <button
                                onClick={handleEdit}
                                style={{ padding: "8px", backgroundColor: "#007BFF", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", marginRight: "10px" }}
                            >
                                Edit
                            </button>
                            <button
                                onClick={handleCloseDetails}
                                style={{ padding: "8px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
                            >
                                Close
                            </button>
                        </>
                    )}
                </div>
            )}

            {isAdding && (
                  <AddStudentPopup onClose={() => setIsAdding(false)} />
            )}
        </div>
    );
}

export default StudentsPage;