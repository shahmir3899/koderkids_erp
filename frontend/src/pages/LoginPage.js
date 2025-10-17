import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { redirectUser, getLoggedInUser } from "../api";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

function LoginPage() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Detect mobile for responsive adjustments
  const isMobile = window.innerWidth <= 768;

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

        // Fetch full name using the updated API
        const userDetails = await getLoggedInUser();
        const fullName = userDetails.fullName || "Unknown";
        localStorage.setItem("fullName", fullName);

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

  // Extracted style objects for better maintainability
  const rootStyles = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#F9FAFC",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Rubik', sans-serif",
    flexDirection: isMobile ? "column" : "row", // Stack on mobile
  };

  const mockupStyles = {
    position: "relative",
    marginRight: isMobile ? "0" : "4rem",
    marginBottom: isMobile ? "2rem" : "0",
    transform: isMobile ? "none" : "rotate(-15deg) scale(0.67)",
    transformOrigin: "top left",
    width: isMobile ? "100%" : "800px",
    height: isMobile ? "auto" : "800px",
    maxWidth: "100%",
    display: isMobile ? "none" : "block", // Hide mockup on mobile for simplicity
  };

  const formContainerStyles = {
    maxWidth: "450px",
    width: isMobile ? "100%" : "90%",
    padding: "2rem",
    textAlign: "center",
  };

  const inputGroupStyles = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "16px",
    width: "100%",
    maxWidth: "450px",
    height: "95px",
    marginBottom: "1rem",
  };

  const labelStyles = {
    width: "100%",
    height: "25px",
    fontWeight: 500,
    fontSize: "18px",
    lineHeight: "140%",
    letterSpacing: "0.2px",
    color: "#424242",
  };

  const inputContainerStyles = {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: "16px 24px",
    gap: "10px",
    width: "100%",
    height: "54px",
    background: "#FFFFFF",
    border: "1px solid rgba(110, 108, 223, 0.8)",
    borderRadius: "16px",
  };

  const inputStyles = {
    width: "100%",
    height: "22px",
    fontWeight: 400,
    fontSize: "16px",
    lineHeight: "140%",
    letterSpacing: "0.2px",
    color: "#757575",
    border: "none",
    background: "transparent",
  };

  const passwordContainerStyles = {
    ...inputContainerStyles,
    border: "1px solid #BDBDBD",
    position: "relative",
  };

  const buttonStyles = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: "16px",
    gap: "10px",
    width: "100%",
    height: "54px",
    background: "linear-gradient(90deg, #6E6CDF 0%, #6E6CDF 100%)",
    borderRadius: "16px",
    fontWeight: 500,
    fontSize: "16px",
    lineHeight: "140%",
    letterSpacing: "0.2px",
    color: "#FFFFFF",
    cursor: "pointer",
  };

  const googleButtonStyles = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: "16px",
    gap: "10px",
    width: "100%",
    height: "54px",
    background: "#FFFFFF",
    border: "1px solid #E0E0E0",
    borderRadius: "16px",
  };

  return (
    <>
      <div style={rootStyles}>
        <div style={mockupStyles}>
          {/* Mockup content - Kept as is */}
          <div style={{ position: "absolute", width: "800px", height: "800px", left: "0px", top: "0px", background: "#6E6CDF", opacity: 0.1, borderRadius: "50px" }} />
          <div style={{ position: "absolute", width: "800px", height: "800px", left: "0px", top: "0px", background: "#6E6CDF", opacity: 0.1, borderRadius: "50px" }} />
          <div style={{ position: "absolute", width: "800px", height: "800px", left: "0px", top: "0px", background: "#6E6CDF", opacity: 0.1, borderRadius: "50px" }} />
          {/* Add other mockup elements as in original if needed */}
        </div>
        <div style={formContainerStyles}>
          <h1 style={{ fontWeight: 600, fontSize: "32px", lineHeight: "130%", letterSpacing: "0.2px", color: "#424242", marginBottom: "2rem" }}>Welcome to KoderKids</h1>
          <form onSubmit={handleSubmit}>
            {message && <p style={{ marginBottom: "1rem", color: "#FF0000" }}>{message}</p>}
            <div style={inputGroupStyles}>
              <label htmlFor="username" style={labelStyles}>Username</label> {/* Added htmlFor */}
              <div style={inputContainerStyles}>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="admin@gmail.com"
                  required
                  style={inputStyles}
                />
              </div>
            </div>
            <div style={inputGroupStyles}>
              <label htmlFor="password" style={labelStyles}>Password</label> {/* Added htmlFor */}
              <div style={passwordContainerStyles}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="enter your password"
                  required
                  style={{ ...inputStyles, color: "#BDBDBD" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "24px", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showPassword ? <AiOutlineEyeInvisible style={{ color: "#BDBDBD", fontSize: "20px" }} /> : <AiOutlineEye style={{ color: "#BDBDBD", fontSize: "20px" }} />}
                </button>
              </div>
            </div>
            <a href="/forgot-password" style={{ display: "block", textAlign: "right", fontSize: "16px", color: "#6E6CDF", marginBottom: "1rem" }}>Forgot Password</a>
            <button type="submit" style={buttonStyles} disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "32px", width: "150px", height: "22px", margin: "1.5rem auto" }}>
              <div style={{ width: "32px", height: "0px", border: "1px solid #E0E0E0" }} />
              <span style={{ fontWeight: 400, fontSize: "16px", lineHeight: "140%", letterSpacing: "0.2px", color: "#E0E0E0" }}>OR</span>
              <div style={{ width: "32px", height: "0px", border: "1px solid #E0E0E0" }} />
            </div>
            <button type="button" style={googleButtonStyles}>
              {/* Google logo - Kept as is */}
              <div style={{ width: "24px", height: "24px", opacity: 0.9, position: "relative" }}>
                <div style={{ position: "absolute", width: "23.52px", height: "24px", left: "calc(50% - 23.52px/2 - 0.24px)", top: "calc(50% - 24px/2)" }} />
                <div style={{ position: "absolute", left: "50%", right: "2%", top: "40.91%", bottom: "12.09%", background: "#007BFF" }} />
                <div style={{ position: "absolute", left: "5.36%", right: "16.91%", top: "59.52%", bottom: "0%", background: "#34A853" }} />
                <div style={{ position: "absolute", left: "0%", right: "78%", top: "27.59%", bottom: "27.59%", background: "#FBBC05" }} />
                <div style={{ position: "absolute", left: "5.36%", right: "16.55%", top: "0%", bottom: "59.5%", background: "#EA4335" }} />
              </div>
              <span style={{ width: "170px", height: "22px", fontWeight: 500, fontSize: "16px", lineHeight: "140%", letterSpacing: "0.2px", color: "#424242" }}>Continue with Google</span>
            </button>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: "8px", width: "262px", height: "22px", margin: "1.5rem auto 0" }}>
              <span style={{ width: "190px", height: "22px", fontWeight: 400, fontSize: "16px", lineHeight: "140%", letterSpacing: "0.2px", color: "#9E9E9E" }}>Didn’t have an Account!?</span>
              <a href="/register" style={{ width: "64px", height: "22px", fontWeight: 600, fontSize: "16px", lineHeight: "140%", letterSpacing: "0.2px", color: "#6E6CDF", textDecoration: "none" }}>Sign-up</a>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default LoginPage;