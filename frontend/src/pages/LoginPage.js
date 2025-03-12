import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { redirectUser } from "../api";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

function LoginPage() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      setMessage("⚠️ Please fill in all fields.");
      return;
    }
    setMessage("");
    setIsLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("access", data.access);
        localStorage.setItem("refresh", data.refresh);
        localStorage.setItem("role", data.role);
        localStorage.setItem("username", data.username);
        setMessage("✅ Login successful!");
        redirectUser(); // Or navigate("/dashboard");
      } else {
        setMessage(`⚠️ Error: ${data.detail || "Invalid credentials"}`);
      }
    } catch (error) {
      setMessage("⚠️ Network error. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const styles = {
    container: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#6B7280", // Gray background as in the image
      backgroundImage: "url('/background.jpg')", // Placeholder for background image
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    },
    formContainer: {
      maxWidth: "400px",
      width: "90%",
      padding: "2rem",
      backgroundColor: "#FFFFFF", // White background for the form
      borderRadius: "10px",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
      textAlign: "center",
    },
    heading: {
      marginBottom: "1.5rem",
      color: "#333",
      fontSize: "1.5rem",
      fontWeight: "bold",
    },
    formGroup: {
      marginBottom: "1.5rem",
      textAlign: "left",
    },
    label: {
      display: "block",
      marginBottom: "0.5rem",
      color: "#555",
      fontSize: "0.875rem",
      fontWeight: "500",
    },
    inputContainer: {
      position: "relative",
      width: "100%",
    },
    input: {
      width: "100%",
      padding: "0.625rem",
      borderRadius: "5px",
      border: "1px solid #ccc",
      fontSize: "0.875rem",
      boxSizing: "border-box",
      backgroundColor: "#F0F4F8", // Light blue background for inputs as in the image
    },
    showHide: {
      position: "absolute",
      right: "0.75rem",
      top: "50%",
      transform: "translateY(-50%)",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: "1.2rem",
      color: "#555",
      width: "2rem",
      height: "2rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    rememberMeContainer: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "1rem",
    },
    rememberMe: {
      display: "flex",
      alignItems: "center",
    },
    checkbox: {
      marginRight: "0.5rem",
    },
    forgotPassword: {
      fontSize: "0.875rem",
      color: "#007bff",
      textDecoration: "none",
    },
    button: {
      width: "100%",
      padding: "0.75rem",
      borderRadius: "5px",
      border: "none",
      backgroundColor: "#007bff",
      color: "#fff",
      fontSize: "1rem",
      fontWeight: "bold",
      cursor: "pointer",
      transition: "background-color 0.3s",
    },
    registerLink: {
      display: "block",
      marginTop: "1rem",
      fontSize: "0.875rem",
      color: "#007bff",
      textDecoration: "none",
    },
    message: {
      textAlign: "center",
      marginBottom: "1rem",
      fontSize: "0.875rem",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <h2 style={styles.heading}>Login</h2>
        {message && (
          <p
            style={{
              ...styles.message,
              color: message.includes("✅") ? "green" : "red",
              backgroundColor: message.includes("✅") ? "#e6ffe6" : "#ffe6e6",
              padding: "0.625rem",
              borderRadius: "5px",
            }}
          >
            {message}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Username:</label>
            <div style={styles.inputContainer}>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                style={styles.input}
                aria-label="Username"
              />
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Password:</label>
            <div style={styles.inputContainer}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                style={styles.input}
                aria-label="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.showHide}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </button>
            </div>
          </div>
          <div style={styles.rememberMeContainer}>
            <div style={styles.rememberMe}>
              <input
                type="checkbox"
                id="rememberMe"
                style={styles.checkbox}
                aria-label="Remember me"
              />
              <label htmlFor="rememberMe" style={{ color: "#555", fontSize: "0.875rem" }}>
                Remember me
              </label>
            </div>
            <a href="/forgot-password" style={styles.forgotPassword}>
              Forgot Password?
            </a>
          </div>
          <button type="submit" style={styles.button} disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </button>
          <a href="/register" style={styles.registerLink}>
            Don't have an account? Register
          </a>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;