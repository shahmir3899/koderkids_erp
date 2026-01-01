import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { redirectUser, getLoggedInUser } from "../api";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { FcGoogle } from "react-icons/fc"; // Added import for Google icon

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
      const response = await fetch(`${API_URL}/api/auth/token/`, {
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
    justifyContent: "flex-start",
    alignItems: "center",
    minHeight: "100vh",
    backgroundImage: "url('/background.jpg')", // Assuming background.jpg is in public folder
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundColor: "#F9FAFC", // Fallback color
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Rubik', 'Poppins', sans-serif", // Added Poppins for branded typography
    flexDirection: isMobile ? "column" : "row", // Stack on mobile
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "center" : "center",   // Center form vertically on mobile
    justifyContent: isMobile ? "center" : "flex-start",
    padding: isMobile ? "2rem" : "0",             // Add padding on mobile if needed
  };

    const mockupStyles = {
    position: "relative",
    flexShrink: 0,                    // Prevent it from shrinking
    width: isMobile ? "0" : "auto",   // On mobile: zero width → takes no space
    minWidth: isMobile ? "0" : "500px", // Adjust 500px to your design needs
    height: isMobile ? "0" : "100vh",   // On mobile: zero height
    marginRight: isMobile ? "0" : "2rem",
    marginBottom: isMobile ? "0" : "0",
    transform: isMobile ? "none" : "rotate(-15deg) scale(0.8)",
    transformOrigin: "top left",
    backgroundImage: "url('/thematic-illustration.svg')",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    pointerEvents: "none",            // Optional: ignore mouse events
    opacity: isMobile ? 0 : 1,        // Extra safety
    overflow: "hidden",
  };

  const formContainerStyles = {
    maxWidth: "450px",
    width: isMobile ? "100%" : "90%",
    padding: "2rem",
    textAlign: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)", // Semi-transparent for better readability over background
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)", // Added subtle shadow for depth
    animation: "fadeIn 1s ease-in", // Micro-animation for form load
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
    fontWeight: 400,
    fontSize: "16px",
    fontFamily: "'Montserrat', sans-serif",  // Example: Change to a different font (ensure imported)
    lineHeight: "140%",
    letterSpacing: "0.2px",
    color: "#424242",
    backgroundColor: "rgba(110, 108, 223, 0.1)", // Added light background color for distinction
    padding: "4px 8px", // Added padding for better visual separation
    borderRadius: "4px", // Slight rounding for aesthetics
    textAlign: "left", // Ensure left alignment
    transition: "transform 0.3s ease", // For float-up effect
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
    transition: "box-shadow 0.3s ease, border-color 0.3s ease", // For hover and focus effects
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
    transition: "color 0.3s ease",
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
    boxShadow: "0 2px 10px rgba(110, 108, 223, 0.3)", // Added shadow
    transition: "transform 0.3s ease, box-shadow 0.3s ease", // Hover effects
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
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)", // Added shadow
    transition: "transform 0.3s ease, box-shadow 0.3s ease", // Hover effects
  };

  // Inline keyframes for animations
  const globalStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
  `;

  return (
    <>
      <style>{globalStyles}</style>
      <div style={rootStyles}>
        <div style={mockupStyles} />
        <div style={formContainerStyles}>
          <h1 style={{ fontWeight: 600, fontSize: "32px", lineHeight: "130%", letterSpacing: "0.2px", color: "#424242", marginBottom: "2rem", animation: "bounce 1s ease-in-out" }}>Welcome to KoderKids</h1>
          <form onSubmit={handleSubmit}>
            {message && <p style={{ marginBottom: "1rem", color: "#FF0000" }}>{message}</p>}
            <div style={inputGroupStyles}>
              <label htmlFor="username" style={labelStyles}>Username</label>
              <div
                style={inputContainerStyles}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 10px rgba(110, 108, 223, 0.5)"; e.currentTarget.style.borderColor = "#6E6CDF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(110, 108, 223, 0.8)"; }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 5px rgba(110, 108, 223, 0.5)"; }}
              >
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your Username"
                  required
                  style={inputStyles}
                />
              </div>
            </div>
            <div style={inputGroupStyles}>
              <label htmlFor="password" style={labelStyles}>Password</label>
              <div
                style={passwordContainerStyles}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 10px rgba(110, 108, 223, 0.5)"; e.currentTarget.style.borderColor = "#6E6CDF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#BDBDBD"; }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 5px rgba(110, 108, 223, 0.5)"; }}
              >
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  style={{ ...inputStyles, color: "#BDBDBD" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "24px", background: "none", border: "none", cursor: "pointer", transition: "color 0.3s ease" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#6E6CDF"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#BDBDBD"; }}
                >
                  {showPassword ? <AiOutlineEyeInvisible style={{ color: "inherit", fontSize: "20px" }} /> : <AiOutlineEye style={{ color: "inherit", fontSize: "20px" }} />}
                </button>
              </div>
            </div>
            <a href="/forgot-password" style={{ display: "block", textAlign: "right", fontSize: "16px", color: "#6E6CDF", marginBottom: "1rem" }}>Forgot Password</a>
            <button
              type="submit"
              style={buttonStyles}
              disabled={isLoading}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 4px 15px rgba(110, 108, 223, 0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(110, 108, 223, 0.3)"; }}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
       {/* REMOVED: Google Login - Coming Soon
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "32px", width: "150px", height: "22px", margin: "1.5rem auto" }}>
              <div style={{ width: "32px", height: "0px", border: "1px solid #E0E0E0" }} />
              <span style={{ fontWeight: 400, fontSize: "16px", lineHeight: "140%", letterSpacing: "0.2px", color: "#E0E0E0" }}>OR</span>
              <div style={{ width: "32px", height: "0px", border: "1px solid #E0E0E0" }} />
            </div>
            <button
              type="button"
              style={googleButtonStyles}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)"; }}
            >
              <FcGoogle style={{ fontSize: "24px", opacity: 0.9 }} />
              <span style={{ width: "170px", height: "22px", fontWeight: 500, fontSize: "16px", lineHeight: "140%", letterSpacing: "0.2px", color: "#424242" }}>Continue with Google</span>
            </button>
            */}
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