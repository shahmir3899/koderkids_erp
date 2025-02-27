import React, { useState, useEffect } from "react";
import axios from "axios";

function AddStudentPopup({ onClose }) {
    const [formData, setFormData] = useState({
        name: "",
        reg_num: "",
        school: "",
        student_class: "",
        monthly_fee: "",
        phone: "",
        date_of_registration: ""
    });

    const [schools, setSchools] = useState([]);

    useEffect(() => {
        async function fetchSchools() {
            try {
                console.log("🔄 Fetching schools...");

                const token = localStorage.getItem("access");

                if (!token) {
                    console.error("❌ No authentication token found in localStorage!");
                    return;
                }

                console.log("🔍 Retrieved Token:", token);

                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/schools/`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                console.log("✅ Fetched Schools:", response.data);

                if (Array.isArray(response.data.schools)) {
                    setSchools(response.data.schools);
                } else if (Array.isArray(response.data)) {
                    setSchools(response.data);
                } else {
                    console.error("❌ Unexpected API response:", response.data);
                }
            } catch (error) {
                console.error("❌ Error fetching schools:", error);
            }
        }
        fetchSchools();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async () => {
        try {
            console.log("🆕 Adding new student...");

            const token = localStorage.getItem("access");

            if (!token) {
                console.error("❌ No authentication token found! Please log in again.");
                alert("⚠️ Authentication error. Please log in again.");
                return;
            }

            console.log("🔍 Retrieved Token:", token);

            if (!formData.name || !formData.reg_num || !formData.school || !formData.student_class || !formData.monthly_fee || !formData.phone || !formData.date_of_registration) {
                alert("⚠️ Please fill all fields.");
                return;
            }

            const studentData = {
                ...formData,
                school: parseInt(formData.school),
            };

            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/students/`, studentData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            console.log("✅ Student added successfully:", response.data);
            alert("🎉 Student added successfully!");
            onClose();
        } catch (error) {
            console.error("❌ Error adding student:", error);
            alert("⚠️ Failed to add student! Check the console for details.");
        }
    };

    const renderInputField = (name, label, type = "text", placeholder) => (
        <div style={inputGroupStyle}>
            <label style={labelStyle}>{label}:</label>
            <input
                name={name}
                type={type}
                value={formData[name]}
                onChange={handleInputChange}
                placeholder={placeholder}
                style={inputStyle}
            />
        </div>
    );



    return (
        <div style={modalOverlayStyle}>
            <div style={modalStyle}>
                <h2 style={headerStyle}>➕ Add New Student</h2>
    
                {renderInputField("name", "Name", "text", "Enter student name")}
                {renderInputField("reg_num", "Registration Number", "text", "Enter registration number")}
    
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>School:</label>
                    <select
                        name="school"
                        value={formData.school}
                        onChange={handleInputChange}
                        style={inputStyle}
                    >
                        <option value="">Select School</option>
                        {schools.map((school) => (
                            <option key={school.id} value={school.id}>
                                {school.name}
                            </option>
                        ))}
                    </select>
                </div>
    
                {renderInputField("student_class", "Class", "text", "Enter class")}
                {renderInputField("monthly_fee", "Monthly Fee", "number", "Enter monthly fee")}
                {renderInputField("phone", "Phone", "text", "Enter phone number")}
    
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>Date of Registration:</label>
                    <input
                        type="date"
                        name="date_of_registration"
                        value={formData.date_of_registration}
                        onChange={handleInputChange}
                        style={inputStyle}
                    />
                </div>
    
                <div style={buttonGroupStyle}>
                    <button onClick={handleSubmit} style={submitButtonStyle}>
                        Submit
                    </button>
                    <button onClick={onClose} style={cancelButtonStyle}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

// Styles
const modalOverlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
};

const modalStyle = {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.2)",
    width: "90%", // Responsive width
    maxWidth: "450px", // Maximum width for larger screens
    maxHeight: "90vh", // Maximum height relative to the viewport height
    overflowY: "auto", // Enable vertical scrolling
    textAlign: "left",
    margin: "20px", // Add some margin for smaller screens
    '@media (max-width: 480px)': { // Adjust for mobile screens
        padding: "15px",
        width: "95%",
    },
};

const headerStyle = {
    marginBottom: "20px",
    fontSize: "24px",
    color: "#333",
    textAlign: "center",
};

const inputGroupStyle = {
    marginBottom: "15px",
};

const labelStyle = {
    display: "block",
    marginBottom: "5px",
    fontSize: "14px",
    color: "#555",
};

const inputStyle = {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px",
    boxSizing: "border-box",
};

const buttonGroupStyle = {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "20px",
    //position: "sticky", // Stick to the bottom
    bottom: "0", // Stick to the bottom
    backgroundColor: "#fff", // Match the modal background
    paddingTop: "10px", // Add some padding above the buttons
};

const submitButtonStyle = {
    padding: "10px 20px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    marginRight: "10px",
};

const cancelButtonStyle = {
    ...submitButtonStyle,
    backgroundColor: "#dc3545",
};

export default AddStudentPopup;