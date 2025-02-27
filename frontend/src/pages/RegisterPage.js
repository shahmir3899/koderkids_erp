import React, { useState } from "react";

function RegisterPage() {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        role: "Student",
    });

    const [message, setMessage] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(""); // Clear any previous messages

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/register/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage("✅ Registration successful! Please log in.");
            } else {
                setMessage(`⚠️ Error: ${data.error || "Registration failed"}`);
            }
        } catch (error) {
            setMessage("⚠️ Network error. Try again.");
        }
    };

    // Styles
    const styles = {
        container: {
            maxWidth: "400px",
            margin: "50px auto",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
            backgroundColor: "#f9f9f9",
        },
        heading: {
            textAlign: "center",
            marginBottom: "20px",
            color: "#333",
            fontSize: "24px",
            fontWeight: "bold",
        },
        formGroup: {
            marginBottom: "20px",
        },
        label: {
            display: "block",
            marginBottom: "8px",
            color: "#555",
            fontSize: "14px",
            fontWeight: "500",
        },
        input: {
            width: "100%",
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "14px",
            boxSizing: "border-box",
        },
        select: {
            width: "100%",
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "14px",
            backgroundColor: "#fff",
        },
        button: {
            width: "100%",
            padding: "12px",
            borderRadius: "5px",
            border: "none",
            backgroundColor: "#007bff",
            color: "#fff",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
        },
        buttonHover: {
            backgroundColor: "#0056b3",
        },
        message: {
            textAlign: "center",
            marginBottom: "20px",
            fontSize: "14px",
        },
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>User Registration</h2>
            {message && (
                <p style={{ ...styles.message, color: message.includes("✅") ? "green" : "red" }}>
                    {message}
                </p>
            )}

            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Username:</label>
                    <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        style={styles.input}
                    />
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Email:</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        style={styles.input}
                    />
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Password:</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        style={styles.input}
                    />
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Role:</label>
                    <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        style={styles.select}
                    >
                        <option value="Admin">Admin</option>
                        <option value="Teacher">Teacher</option>
                        <option value="Student">Student</option>
                    </select>
                </div>

                <button type="submit" style={styles.button}>
                    Register
                </button>
            </form>
        </div>
    );
}

export default RegisterPage;