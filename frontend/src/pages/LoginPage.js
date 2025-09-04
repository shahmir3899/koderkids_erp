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
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#F9FAFC",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Rubik', sans-serif",
    }}
  >
    {/* Left: Smartphone mockup with circles, scaled for better fit */}
    <div
      style={{
        position: "relative",
        marginRight: "4rem",
        transform: "rotate(-15deg) scale(0.67)",
        transformOrigin: "top left",
        width: "800px",
        height: "800px",
      }}
    >
      {/* Group 510 - Circles behind phone, adjusted for center alignment */}
      <div
        style={{
          position: "absolute",
          width: "691px",
          height: "700px",
          left: "0px",
          top: "0px",
          opacity: 0.7,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "305.21px",
            height: "305.41px",
            left: "289.66px",
            top: "419.34px",
            border: "4px solid #6E6CDF",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "183.13px",
            height: "183.25px",
            left: "350.7px",
            top: "480.43px",
            border: "4px solid #6E6CDF",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "427.3px",
            height: "427.57px",
            left: "228.62px",
            top: "358.26px",
            border: "4px solid #6E6CDF",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "549.38px",
            height: "549.74px",
            left: "167.58px",
            top: "297.18px",
            border: "4px solid #6E6CDF",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "671.47px",
            height: "671.9px",
            left: "106.53px",
            top: "236.1px",
            border: "4px solid #6E6CDF",
            borderRadius: "50%",
          }}
        />
        {/* Location pins */}
        <div style={{ position: "absolute", width: "39.07px", height: "39.09px", left: "730.39px", top: "674.67px" }}>
          <div style={{ position: "absolute", left: "12.5%", right: "12.49%", top: "8.33%", bottom: "8.33%", background: "#6E6CDF", border: "2.44328px solid #FFFFFF", borderRadius: "50%" }} />
          <div style={{ boxSizing: "border-box", position: "absolute", left: "35.42%", right: "35.42%", top: "31.25%", bottom: "39.58%", background: "#6E6CDF", border: "3.0541px solid #FFFFFF", clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
        </div>
        <div style={{ position: "absolute", width: "39.07px", height: "39.09px", left: "359.25px", top: "473.1px" }}>
          <div style={{ position: "absolute", left: "12.5%", right: "12.49%", top: "8.33%", bottom: "8.33%", background: "#6E6CDF", border: "2.44328px solid #FFFFFF", borderRadius: "50%" }} />
          <div style={{ boxSizing: "border-box", position: "absolute", left: "35.42%", right: "35.42%", top: "31.25%", bottom: "39.58%", background: "#6E6CDF", border: "3.0541px solid #FFFFFF", clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
        </div>
        <div style={{ position: "absolute", width: "39.07px", height: "39.09px", left: "208.8px", top: "575.29px" }}>
          <div style={{ position: "absolute", left: "12.5%", right: "12.49%", top: "8.33%", bottom: "8.33%", background: "#6E6CDF", border: "2.44328px solid #FFFFFF", borderRadius: "50%" }} />
          <div style={{ boxSizing: "border-box", position: "absolute", left: "35.42%", right: "35.42%", top: "31.25%", bottom: "39.58%", background: "#6E6CDF", border: "3.0541px solid #FFFFFF", clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
        </div>
        <div style={{ position: "absolute", width: "39.07px", height: "39.09px", left: "699.31px", top: "554.71px" }}>
          <div style={{ position: "absolute", left: "12.5%", right: "12.49%", top: "8.33%", bottom: "8.33%", background: "#6E6CDF", border: "2.44328px solid #FFFFFF", borderRadius: "50%" }} />
          <div style={{ boxSizing: "border-box", position: "absolute", left: "35.42%", right: "35.42%", top: "31.25%", bottom: "39.58%", background: "#6E6CDF", border: "3.0541px solid #FFFFFF", clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
        </div>
        <div style={{ position: "absolute", width: "39.07px", height: "39.09px", left: "350.7px", top: "208px" }}>
          <div style={{ position: "absolute", left: "12.5%", right: "12.49%", top: "8.33%", bottom: "8.33%", background: "#6E6CDF", border: "2.44328px solid #FFFFFF", borderRadius: "50%" }} />
          <div style={{ boxSizing: "border-box", position: "absolute", left: "35.42%", right: "35.42%", top: "31.25%", bottom: "39.58%", background: "#6E6CDF", border: "3.0541px solid #FFFFFF", clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
        </div>
        <div style={{ position: "absolute", width: "39.07px", height: "39.09px", left: "87px", top: "473.1px" }}>
          <div style={{ position: "absolute", left: "12.5%", right: "12.49%", top: "8.33%", bottom: "8.33%", background: "#6E6CDF", border: "2.44328px solid #FFFFFF", borderRadius: "50%" }} />
          <div style={{ boxSizing: "border-box", position: "absolute", left: "35.42%", right: "35.42%", top: "31.25%", bottom: "39.58%", background: "#6E6CDF", border: "3.0541px solid #FFFFFF", clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
        </div>
        <div style={{ position: "absolute", width: "39.07px", height: "39.09px", left: "533.83px", top: "644.13px" }}>
          <div style={{ position: "absolute", left: "12.5%", right: "12.49%", top: "8.33%", bottom: "8.33%", background: "#6E6CDF", border: "2.44328px solid #FFFFFF", borderRadius: "50%" }} />
          <div style={{ boxSizing: "border-box", position: "absolute", left: "35.42%", right: "35.42%", top: "31.25%", bottom: "39.58%", background: "#6E6CDF", border: "3.0541px solid #FFFFFF", clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
        </div>
        <div style={{ position: "absolute", width: "39.07px", height: "39.09px", left: "358.03px", top: "866.46px" }}>
          <div style={{ position: "absolute", left: "12.5%", right: "12.49%", top: "8.33%", bottom: "8.33%", background: "#6E6CDF", border: "2.44328px solid #FFFFFF", borderRadius: "50%" }} />
          <div style={{ boxSizing: "border-box", position: "absolute", left: "35.42%", right: "35.42%", top: "31.25%", bottom: "39.58%", background: "#6E6CDF", border: "3.0541px solid #FFFFFF", clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
        </div>
        <div style={{ position: "absolute", width: "39.07px", height: "39.09px", left: "616.85px", top: "266.64px" }}>
          <div style={{ position: "absolute", left: "12.5%", right: "12.49%", top: "8.33%", bottom: "8.33%", background: "#6E6CDF", border: "2.44328px solid #FFFFFF", borderRadius: "50%" }} />
          <div style={{ boxSizing: "border-box", position: "absolute", left: "35.42%", right: "35.42%", top: "31.25%", bottom: "39.58%", background: "#6E6CDF", border: "3.0541px solid #FFFFFF", clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
        </div>
      </div>

      {/* Phone mockup, repositioned to center on circles */}
      <div
        style={{
          boxSizing: "border-box",
          position: "absolute",
          width: "275.15px",
          height: "568.75px",
          left: "calc(50% - 137.575px)",
          top: "calc(50% - 284.375px + 50px)",
          background: "#000000",
          boxShadow: "-48.473px 92.4219px 41.3636px rgba(0, 0, 0, 0.04), -27.1449px 51.7045px 34.9006px rgba(0, 0, 0, 0.13), -12.2798px 23.267px 25.8523px rgba(0, 0, 0, 0.22), -3.23153px 5.81676px 14.2188px rgba(0, 0, 0, 0.26)",
          borderRadius: "43.3026px",
          zIndex: 1,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "4.23%",
            right: "4.23%",
            top: "2.05%",
            bottom: "2.05%",
            background: "#FFFFFF",
            borderRadius: "31.669px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <h3 style={{ fontSize: "1.2rem", textAlign: "center", marginBottom: "1rem" }}>Hey, Welcome Back</h3>
          <p style={{ fontSize: "0.8rem", textAlign: "center", marginBottom: "1rem", color: "#666" }}>Please login your account</p>
          <input type="text" placeholder="admin@gmail.com" style={{ marginBottom: "0.5rem", padding: "0.5rem", borderRadius: "8px", border: "1px solid #CCC" }} />
          <input type="password" placeholder="enter your password" style={{ marginBottom: "0.5rem", padding: "0.5rem", borderRadius: "8px", border: "1px solid #CCC" }} />
          <a href="#" style={{ fontSize: "0.7rem", color: "#6E6CDF", textAlign: "right", marginBottom: "0.5rem" }}>Forgot Password</a>
          <button style={{ padding: "0.5rem", borderRadius: "8px", background: "#6E6CDF", color: "#FFF", border: "none" }}>Sign in</button>
          <div style={{ textAlign: "center", margin: "0.5rem 0", color: "#E0E0E0" }}>OR</div>
          <button style={{ padding: "0.5rem", borderRadius: "8px", background: "#FFF", border: "1px solid #E0E0E0", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ marginRight: "0.5rem", color: "#4285F4", fontWeight: "bold" }}>G</span> Continue with Google
          </button>
          <p style={{ fontSize: "0.7rem", textAlign: "center", marginTop: "0.5rem", color: "#9E9E9E" }}>Didn’t have an Account? <a href="#" style={{ color: "#6E6CDF" }}>Sign-up</a></p>
        </div>
        <div style={{ position: "absolute", width: "82.03px", height: "23.27px", left: "96.24px", top: "18.74px" }}>
          <div style={{ position: "absolute", left: "34.98%", right: "35.21%", top: "3.3%", bottom: "92.61%", background: "#000000", borderRadius: "645.661px" }} />
          <div style={{ position: "absolute", width: "11.63px", height: "11.63px", left: "158.24px", top: "25.21px" }}>
            <div style={{ position: "absolute", left: "57.51%", right: "38.26%", top: "4.43%", bottom: "93.52%", background: "#0A0A0A", borderRadius: "50%" }} />
          </div>
        </div>
        <div style={{ boxSizing: "border-box", position: "absolute", width: "275.33px", height: "566.81px", left: "0px", top: "1.29px", filter: "blur(0.646307px)", borderRadius: "43.3026px" }} />
        <div style={{ boxSizing: "border-box", position: "absolute", width: "275.33px", height: "567.46px", left: "0px", top: "0.65px", border: "0.646307px solid #FFFFFF", borderRadius: "43.3026px" }} />
        <div style={{ position: "absolute", left: "76.53%", right: "22.3%", top: "0%", bottom: "99.32%", background: "linear-gradient(180deg, rgba(249, 249, 249, 0.65) 0%, rgba(228, 228, 227, 0.351) 100%)" }} />
        {/* Additional top gradients and side rectangles omitted for brevity; add as needed from previous versions */}
        <div style={{ boxSizing: "border-box", position: "absolute", width: "1.94px", height: "20.68px", left: "-1.94px", top: "111.16px", background: "linear-gradient(90deg, #000000 -23.55%, rgba(0, 0, 0, 0) 25%), linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.68) 7.9%, rgba(0, 0, 0, 0.66) 14.53%, rgba(255, 255, 255, 0) 22.96%, rgba(255, 255, 255, 0) 80.18%, rgba(255, 255, 255, 0.48) 89.82%, rgba(0, 0, 0, 0.66) 92.85%, rgba(255, 255, 255, 0) 100%), #8F8F8A" }} />
        {/* Additional rectangles */}
      </div>
    </div>

    {/* Right: Desktop form */}
    <div
      style={{
        maxWidth: "450px",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "#333" }}>Welcome Back</h2>
      <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1.5rem" }}>Please login your account</p>
      {message && (
        <p
          style={{
            textAlign: "center",
            marginBottom: "1rem",
            fontSize: "0.875rem",
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "16px", width: "450px", height: "95px", marginBottom: "1rem" }}>
          <label style={{ width: "450px", height: "25px", fontWeight: 500, fontSize: "18px", lineHeight: "140%", letterSpacing: "0.2px", color: "#424242" }}>Email</label>
          <div style={{ boxSizing: "border-box", display: "flex", flexDirection: "row", alignItems: "center", padding: "16px 24px", gap: "10px", width: "450px", height: "54px", background: "#FFFFFF", border: "1px solid rgba(110, 108, 223, 0.8)", borderRadius: "16px" }}>
            <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="admin@gmail.com" required style={{ width: "100%", height: "22px", fontWeight: 400, fontSize: "16px", lineHeight: "140%", letterSpacing: "0.2px", color: "#757575", border: "none", background: "transparent" }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "16px", width: "450px", height: "95px", marginBottom: "1rem" }}>
          <label style={{ width: "450px", height: "25px", fontWeight: 500, fontSize: "18px", lineHeight: "140%", letterSpacing: "0.2px", color: "#424242" }}>Password</label>
          <div style={{ boxSizing: "border-box", display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", gap: "10px", width: "450px", height: "54px", background: "#FFFFFF", border: "1px solid #BDBDBD", borderRadius: "16px", position: "relative" }}>
            <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="enter your password" required style={{ width: "100%", height: "22px", fontWeight: 400, fontSize: "16px", lineHeight: "140%", letterSpacing: "0.2px", color: "#BDBDBD", border: "none", background: "transparent" }} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "24px", background: "none", border: "none", cursor: "pointer" }}>
              {showPassword ? <AiOutlineEyeInvisible style={{ color: "#BDBDBD", fontSize: "20px" }} /> : <AiOutlineEye style={{ color: "#BDBDBD", fontSize: "20px" }} />}
            </button>
          </div>
        </div>
        <a href="/forgot-password" style={{ display: "block", textAlign: "right", fontSize: "16px", color: "#6E6CDF", marginBottom: "1rem" }}>Forgot Password</a>
        <button type="submit" style={{ display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center", padding: "16px", gap: "10px", width: "450px", height: "57px", background: "#6E6CDF", borderRadius: "16px", border: "none", color: "#FFFFFF", fontWeight: 600, fontSize: "18px", lineHeight: "140%", letterSpacing: "0.2px", cursor: "pointer" }} disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "32px", width: "150px", height: "22px", margin: "1.5rem auto" }}>
          <div style={{ width: "32px", height: "0px", border: "1px solid #E0E0E0" }} />
          <span style={{ fontWeight: 400, fontSize: "16px", lineHeight: "140%", letterSpacing: "0.2px", color: "#E0E0E0" }}>OR</span>
          <div style={{ width: "32px", height: "0px", border: "1px solid #E0E0E0" }} />
        </div>
        <button type="button" style={{ boxSizing: "border-box", display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center", padding: "16px 25px", gap: "16px", width: "450px", height: "56px", background: "#FFFFFF", border: "0.8px solid #E0E0E0", borderRadius: "16px", cursor: "pointer" }}>
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
);
}

export default LoginPage;