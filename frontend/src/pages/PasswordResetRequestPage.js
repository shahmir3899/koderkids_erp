// ============================================
// PASSWORD RESET REQUEST PAGE
// NEW FILE: frontend/src/pages/PasswordResetRequestPage.js
// Matches your LoginPage design exactly
// ============================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../services/authService';

function PasswordResetRequestPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  // Detect mobile for responsive adjustments
  const isMobile = window.innerWidth <= 768;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setMessage('⚠️ Please enter your email address.');
      return;
    }

    setMessage('');
    setIsLoading(true);

    try {
      const response = await requestPasswordReset(email);
      console.log('✅ Password reset email sent:', response);
      
      setEmailSent(true);
      setMessage('✅ Password reset email sent! Check your inbox.');
      
    } catch (error) {
      console.error('❌ Error requesting password reset:', error);
      
      // For security, show generic success message
      setEmailSent(true);
      setMessage('✅ If this email exists, you will receive a reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  // Styles matching your LoginPage
  const rootStyles = {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    minHeight: "100vh",
    backgroundImage: "url('/background.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundColor: "#F9FAFC",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Rubik', 'Poppins', sans-serif",
    flexDirection: isMobile ? "column" : "row",
    justifyContent: isMobile ? "center" : "flex-start",
    padding: isMobile ? "2rem" : "0",
  };

  const mockupStyles = {
    position: "relative",
    flexShrink: 0,
    width: isMobile ? "0" : "auto",
    minWidth: isMobile ? "0" : "500px",
    height: isMobile ? "0" : "100vh",
    marginRight: isMobile ? "0" : "2rem",
    transform: isMobile ? "none" : "rotate(-15deg) scale(0.8)",
    transformOrigin: "top left",
    backgroundImage: "url('/thematic-illustration.svg')",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    pointerEvents: "none",
    opacity: isMobile ? 0 : 1,
    overflow: "hidden",
  };

  const formContainerStyles = {
    maxWidth: "450px",
    width: isMobile ? "100%" : "90%",
    padding: "2rem",
    textAlign: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    animation: "fadeIn 1s ease-in",
  };

  const inputGroupStyles = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "16px",
    width: "100%",
    maxWidth: "450px",
    marginBottom: "1rem",
  };

  const labelStyles = {
    width: "100%",
    height: "25px",
    fontWeight: 400,
    fontSize: "16px",
    fontFamily: "'Montserrat', sans-serif",
    lineHeight: "140%",
    letterSpacing: "0.2px",
    color: "#424242",
    backgroundColor: "rgba(110, 108, 223, 0.1)",
    padding: "4px 8px",
    borderRadius: "4px",
    textAlign: "left",
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
    transition: "box-shadow 0.3s ease, border-color 0.3s ease",
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
    boxShadow: "0 2px 10px rgba(110, 108, 223, 0.3)",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    border: "none",
  };

  const successBoxStyles = {
    backgroundColor: "#D1FAE5",
    border: "1px solid #10B981",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "1.5rem",
  };

  const instructionsStyles = {
    backgroundColor: "#F3F4F6",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "1.5rem",
    textAlign: "left",
  };

  // Inline keyframes
  const globalStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  return (
    <>
      <style>{globalStyles}</style>
      <div style={rootStyles}>
        <div style={mockupStyles} />
        <div style={formContainerStyles}>
          <h1 style={{ 
            fontWeight: 600, 
            fontSize: "32px", 
            lineHeight: "130%", 
            letterSpacing: "0.2px", 
            color: "#424242", 
            marginBottom: "1rem" 
          }}>
            Reset Password
          </h1>
          
          <p style={{ 
            fontSize: "16px", 
            color: "#757575", 
            marginBottom: "2rem" 
          }}>
            {emailSent 
              ? 'Check your email for reset instructions'
              : 'Enter your email to receive a password reset link'
            }
          </p>

          {!emailSent ? (
            <form onSubmit={handleSubmit}>
              {message && (
                <p style={{ 
                  marginBottom: "1rem", 
                  color: message.includes('⚠️') ? '#DC2626' : '#10B981',
                  fontSize: "14px"
                }}>
                  {message}
                </p>
              )}
              
              <div style={inputGroupStyles}>
                <label htmlFor="email" style={labelStyles}>Email Address</label>
                <div
                  style={inputContainerStyles}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.boxShadow = "0 0 10px rgba(110, 108, 223, 0.5)"; 
                    e.currentTarget.style.borderColor = "#6E6CDF"; 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.boxShadow = "none"; 
                    e.currentTarget.style.borderColor = "rgba(110, 108, 223, 0.8)"; 
                  }}
                >
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    required
                    disabled={isLoading}
                    style={inputStyles}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={buttonStyles}
                disabled={isLoading}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.transform = "scale(1.05)"; 
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(110, 108, 223, 0.5)"; 
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.transform = "scale(1)"; 
                  e.currentTarget.style.boxShadow = "0 2px 10px rgba(110, 108, 223, 0.3)"; 
                }}
              >
                {isLoading ? "Sending..." : "📧 Send Reset Link"}
              </button>

              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "16px", 
                margin: "1.5rem auto",
                width: "150px"
              }}>
                <div style={{ flex: 1, height: "1px", background: "#E0E0E0" }} />
                <span style={{ color: "#E0E0E0", fontSize: "16px" }}>OR</span>
                <div style={{ flex: 1, height: "1px", background: "#E0E0E0" }} />
              </div>

              <a 
                href="/login" 
                style={{ 
                  display: "block", 
                  color: "#6E6CDF", 
                  fontSize: "16px", 
                  fontWeight: 600,
                  textDecoration: "none",
                  marginTop: "1rem"
                }}
              >
                ← Back to Login
              </a>
            </form>
          ) : (
            <div>
              <div style={successBoxStyles}>
                <p style={{ 
                  margin: 0, 
                  color: "#065F46", 
                  fontSize: "16px",
                  fontWeight: 500
                }}>
                  ✅ Email Sent Successfully
                </p>
              </div>

              <p style={{ fontSize: "14px", color: "#424242", marginBottom: "1rem" }}>
                We've sent a password reset link to:
              </p>
              <p style={{ 
                fontSize: "16px", 
                fontWeight: 600, 
                color: "#6E6CDF", 
                marginBottom: "1.5rem",
                wordBreak: "break-all"
              }}>
                {email}
              </p>

              <div style={instructionsStyles}>
                <p style={{ 
                  fontSize: "14px", 
                  fontWeight: 600, 
                  color: "#424242",
                  marginBottom: "8px"
                }}>
                  📋 Next Steps:
                </p>
                <ol style={{ 
                  margin: 0, 
                  paddingLeft: "20px", 
                  color: "#757575", 
                  fontSize: "14px",
                  lineHeight: "1.8"
                }}>
                  <li>Check your email inbox (and spam folder)</li>
                  <li>Click the reset link in the email</li>
                  <li>Create your new password</li>
                  <li>Log in with your new credentials</li>
                </ol>
              </div>

              <p style={{ 
                fontSize: "13px", 
                color: "#F59E0B", 
                backgroundColor: "#FEF3C7",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "1.5rem"
              }}>
                ⏰ The reset link will expire in 1 hour for security.
              </p>

              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                  setMessage('');
                }}
                style={{
                  ...buttonStyles,
                  background: "#F3F4F6",
                  color: "#424242",
                  marginBottom: "0.75rem"
                }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.transform = "scale(1.05)"; 
                  e.currentTarget.style.background = "#E5E7EB"; 
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.transform = "scale(1)"; 
                  e.currentTarget.style.background = "#F3F4F6"; 
                }}
              >
                📧 Send Another Email
              </button>

              <a 
                href="/login" 
                style={{ 
                  display: "block", 
                  color: "#6E6CDF", 
                  fontSize: "16px", 
                  fontWeight: 600,
                  textDecoration: "none"
                }}
              >
                Back to Login
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default PasswordResetRequestPage;