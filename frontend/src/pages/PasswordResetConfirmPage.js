// ============================================
// PASSWORD RESET CONFIRM PAGE
// NEW FILE: frontend/src/pages/PasswordResetConfirmPage.js
// Matches your LoginPage design exactly
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { confirmPasswordReset } from '../services/authService';
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

function PasswordResetConfirmPage() {
  const navigate = useNavigate();
  const { uid, token } = useParams();
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: '',
    color: '',
  });

  // Detect mobile
  const isMobile = window.innerWidth <= 768;

  // Validate token parameters on mount
  useEffect(() => {
    if (!uid || !token) {
      setMessage('⚠️ Invalid password reset link');
      setTimeout(() => navigate('/login'), 3000);
    }
  }, [uid, token, navigate]);

  // Calculate password strength
  useEffect(() => {
    const password = formData.newPassword;
    
    if (!password) {
      setPasswordStrength({ score: 0, label: '', color: '' });
      return;
    }

    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    let label = '';
    let color = '';
    
    if (score <= 2) {
      label = 'Weak';
      color = '#DC2626';
    } else if (score <= 4) {
      label = 'Medium';
      color = '#F59E0B';
    } else {
      label = 'Strong';
      color = '#10B981';
    }

    setPasswordStrength({ score, label, color });
  }, [formData.newPassword]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword.length < 8) {
      setMessage('⚠️ Password must be at least 8 characters long');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage('⚠️ Passwords do not match');
      return;
    }

    if (passwordStrength.score < 3) {
      setMessage('⚠️ Please use a stronger password');
      return;
    }

    setMessage('');
    setIsLoading(true);

    try {
      const response = await confirmPasswordReset({
        uid,
        token,
        new_password: formData.newPassword,
        confirm_password: formData.confirmPassword,
      });

      console.log('✅ Password reset successful:', response);
      setMessage('✅ Password reset successful! Redirecting to login...');
      
      setTimeout(() => navigate('/login'), 2000);
      
    } catch (error) {
      console.error('❌ Error resetting password:', error);
      
      if (error.response?.data) {
        const errors = error.response.data;
        
        if (errors.token) {
          setMessage(`⚠️ ${errors.token[0] || 'Invalid or expired reset link'}`);
        } else if (errors.new_password) {
          setMessage(`⚠️ ${errors.new_password[0]}`);
        } else if (errors.confirm_password) {
          setMessage(`⚠️ ${errors.confirm_password[0]}`);
        } else {
          setMessage('⚠️ Failed to reset password. Please try again.');
        }
      } else {
        setMessage('⚠️ Failed to reset password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Styles matching LoginPage
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
    maxWidth: "500px",
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

  const passwordContainerStyles = {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: "16px 24px",
    gap: "10px",
    width: "100%",
    height: "54px",
    background: "#FFFFFF",
    border: "1px solid #BDBDBD",
    borderRadius: "16px",
    position: "relative",
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

  const strengthBarStyles = {
    height: "6px",
    backgroundColor: "#E5E7EB",
    borderRadius: "3px",
    overflow: "hidden",
    marginTop: "8px",
    width: "100%",
  };

  const requirementsStyles = {
    backgroundColor: "#F9FAFB",
    borderRadius: "8px",
    padding: "12px",
    marginTop: "8px",
    textAlign: "left",
  };

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
            Create New Password
          </h1>
          
          <p style={{ 
            fontSize: "16px", 
            color: "#757575", 
            marginBottom: "2rem" 
          }}>
            Enter a strong password for your account
          </p>

          <form onSubmit={handleSubmit}>
            {message && (
              <p style={{ 
                marginBottom: "1rem", 
                color: message.includes('✅') ? '#10B981' : '#DC2626',
                fontSize: "14px",
                fontWeight: 500
              }}>
                {message}
              </p>
            )}

            {/* New Password */}
            <div style={inputGroupStyles}>
              <label htmlFor="newPassword" style={labelStyles}>New Password</label>
              <div
                style={passwordContainerStyles}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.boxShadow = "0 0 10px rgba(110, 108, 223, 0.5)"; 
                  e.currentTarget.style.borderColor = "#6E6CDF"; 
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.boxShadow = "none"; 
                  e.currentTarget.style.borderColor = "#BDBDBD"; 
                }}
              >
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  required
                  disabled={isLoading}
                  style={inputStyles}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: "absolute", 
                    right: "24px", 
                    background: "none", 
                    border: "none", 
                    cursor: "pointer",
                    color: "#BDBDBD"
                  }}
                >
                  {showPassword ? <AiOutlineEyeInvisible style={{ fontSize: "20px" }} /> : <AiOutlineEye style={{ fontSize: "20px" }} />}
                </button>
              </div>

              {/* Password Strength */}
              {formData.newPassword && (
                <>
                  <div style={strengthBarStyles}>
                    <div style={{
                      width: `${(passwordStrength.score / 6) * 100}%`,
                      height: "100%",
                      backgroundColor: passwordStrength.color,
                      transition: "all 0.3s ease",
                    }} />
                  </div>
                  <span style={{ 
                    fontSize: "12px", 
                    fontWeight: 600,
                    color: passwordStrength.color
                  }}>
                    {passwordStrength.label}
                  </span>

                  {/* Requirements */}
                  <div style={requirementsStyles}>
                    <p style={{ 
                      fontSize: "12px", 
                      fontWeight: 600, 
                      color: "#424242",
                      margin: "0 0 8px 0"
                    }}>
                      Password must contain:
                    </p>
                    <ul style={{ 
                      margin: 0, 
                      paddingLeft: "20px", 
                      listStyle: "none",
                      fontSize: "12px"
                    }}>
                      <li style={{ 
                        color: formData.newPassword.length >= 8 ? '#10B981' : '#9CA3AF',
                        marginBottom: "4px"
                      }}>
                        {formData.newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
                      </li>
                      <li style={{ 
                        color: /[a-zA-Z]/.test(formData.newPassword) && /[0-9]/.test(formData.newPassword) ? '#10B981' : '#9CA3AF',
                        marginBottom: "4px"
                      }}>
                        {/[a-zA-Z]/.test(formData.newPassword) && /[0-9]/.test(formData.newPassword) ? '✓' : '○'} Letters and numbers
                      </li>
                      <li style={{ 
                        color: /[A-Z]/.test(formData.newPassword) ? '#10B981' : '#9CA3AF'
                      }}>
                        {/[A-Z]/.test(formData.newPassword) ? '✓' : '○'} Uppercase letter (recommended)
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            {/* Confirm Password */}
            <div style={inputGroupStyles}>
              <label htmlFor="confirmPassword" style={labelStyles}>Confirm Password</label>
              <div
                style={{
                  ...passwordContainerStyles,
                  borderColor: formData.confirmPassword && formData.newPassword !== formData.confirmPassword ? '#DC2626' : '#BDBDBD'
                }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.boxShadow = "0 0 10px rgba(110, 108, 223, 0.5)"; 
                  e.currentTarget.style.borderColor = "#6E6CDF"; 
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.boxShadow = "none"; 
                  e.currentTarget.style.borderColor = formData.confirmPassword && formData.newPassword !== formData.confirmPassword ? '#DC2626' : '#BDBDBD'; 
                }}
              >
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter new password"
                  required
                  disabled={isLoading}
                  style={inputStyles}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ 
                    position: "absolute", 
                    right: "24px", 
                    background: "none", 
                    border: "none", 
                    cursor: "pointer",
                    color: "#BDBDBD"
                  }}
                >
                  {showConfirmPassword ? <AiOutlineEyeInvisible style={{ fontSize: "20px" }} /> : <AiOutlineEye style={{ fontSize: "20px" }} />}
                </button>
              </div>

              {/* Password Match */}
              {formData.confirmPassword && (
                <p style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  margin: "4px 0 0 0",
                  color: formData.newPassword === formData.confirmPassword ? '#10B981' : '#DC2626'
                }}>
                  {formData.newPassword === formData.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
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
              {isLoading ? "Resetting Password..." : "🔐 Reset Password"}
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
                textDecoration: "none"
              }}
            >
              ← Back to Login
            </a>
          </form>
        </div>
      </div>
    </>
  );
}

export default PasswordResetConfirmPage;