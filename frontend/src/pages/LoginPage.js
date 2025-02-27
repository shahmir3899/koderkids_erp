import React, { useState } from "react";

function LoginPage() {
    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    const [message, setMessage] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(""); // Clear previous messages

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/token/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("access", data.access);
                localStorage.setItem("refresh", data.refresh);
                localStorage.setItem("role", data.role); // ✅ Store role in localStorage
                localStorage.setItem("username", data.username); // ✅ Store username in localStorage

                setMessage("✅ Login successful! Redirecting...");
                setTimeout(() => {
                    window.location.href = "/"; // Redirect to homepage
                }, 1000);
            } else {
                setMessage(`⚠️ Error: ${data.detail || "Login failed"}`);
            }
        } catch (error) {
            setMessage("⚠️ Network error. Try again.");
        }
    };

    // 🔹 Maintain your existing UI styles
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
        message: {
            textAlign: "center",
            marginBottom: "20px",
            fontSize: "14px",
        },
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>User Login</h2>
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

                <button type="submit" style={styles.button}>
                    Login
                </button>
            </form>
        </div>
    );
}

export default LoginPage;
