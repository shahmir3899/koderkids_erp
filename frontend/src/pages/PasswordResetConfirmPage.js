// ============================================
// PASSWORD RESET CONFIRM PAGE
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { confirmPasswordReset } from '../services/authService';
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

// Design Constants
import {
    COLORS,
    SPACING,
    FONT_SIZES,
    FONT_WEIGHTS,
    BORDER_RADIUS,
    TRANSITIONS,
    MIXINS,
    TOUCH_TARGETS,
} from '../utils/designConstants';
import { useResponsive } from '../hooks/useResponsive';

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

  // Use responsive hook for proper breakpoint detection
  const { isMobile } = useResponsive();

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

  // Inline keyframes
  const globalStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  // Styles using design constants with glassmorphism
  const rootStyles = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: COLORS.background.gradient,
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Rubik', 'Poppins', sans-serif",
    flexDirection: isMobile ? "column" : "row",
    padding: isMobile ? SPACING.lg : SPACING.xl,
  };

  const mockupStyles = {
    position: "relative",
    flexShrink: 0,
    width: isMobile ? "0" : "auto",
    minWidth: isMobile ? "0" : "400px",
    height: isMobile ? "0" : "100vh",
    marginRight: isMobile ? "0" : SPACING.xl,
    transform: isMobile ? "none" : "rotate(-15deg) scale(0.8)",
    transformOrigin: "top left",
    backgroundImage: "url('/thematic-illustration.svg')",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    pointerEvents: "none",
    opacity: isMobile ? 0 : 1,
    overflow: "hidden",
    display: isMobile ? "none" : "block",
  };

  const formContainerStyles = {
    maxWidth: isMobile ? "100%" : "500px",
    width: "100%",
    padding: isMobile ? SPACING.lg : SPACING.xl,
    textAlign: "center",
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    animation: "fadeIn 1s ease-in",
  };

  const inputGroupStyles = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: SPACING.md,
    width: "100%",
    marginBottom: SPACING.md,
  };

  const labelStyles = {
    width: "100%",
    height: "25px",
    fontWeight: FONT_WEIGHTS.normal,
    fontSize: FONT_SIZES.md,
    fontFamily: "'Montserrat', sans-serif",
    lineHeight: "140%",
    letterSpacing: "0.2px",
    color: COLORS.text.white,
    backgroundColor: COLORS.background.whiteSubtle,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.sm,
    textAlign: "left",
  };

  const passwordContainerStyles = {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: `${SPACING.md} ${SPACING.lg}`,
    gap: SPACING.sm,
    width: "100%",
    minHeight: TOUCH_TARGETS.large,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.xl,
    position: "relative",
    transition: TRANSITIONS.normal,
  };

  const inputStyles = {
    width: "100%",
    height: "auto",
    fontWeight: FONT_WEIGHTS.normal,
    fontSize: '16px', // Prevents iOS zoom
    lineHeight: "140%",
    letterSpacing: "0.2px",
    color: COLORS.text.white,
    border: "none",
    background: "transparent",
  };

  const buttonStyles = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.md,
    gap: SPACING.sm,
    width: "100%",
    minHeight: TOUCH_TARGETS.large,
    background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
    borderRadius: BORDER_RADIUS.xl,
    fontWeight: FONT_WEIGHTS.medium,
    fontSize: isMobile ? '0.9375rem' : FONT_SIZES.md,
    lineHeight: "140%",
    letterSpacing: "0.2px",
    color: COLORS.text.white,
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(176, 97, 206, 0.4)",
    transition: TRANSITIONS.normal,
    border: "none",
  };

  const strengthBarStyles = {
    height: "6px",
    backgroundColor: COLORS.border.whiteTransparent,
    borderRadius: BORDER_RADIUS.sm,
    overflow: "hidden",
    marginTop: SPACING.sm,
    width: "100%",
  };

  const requirementsStyles = {
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    textAlign: "left",
  };

  return (
    <>
      <style>{globalStyles}</style>
      <div style={rootStyles}>
        <div style={mockupStyles} />
        <div style={formContainerStyles}>
          <h1 style={{
            fontWeight: FONT_WEIGHTS.semibold,
            fontSize: FONT_SIZES['2xl'],
            lineHeight: "130%",
            letterSpacing: "0.2px",
            color: COLORS.text.white,
            marginBottom: SPACING.md
          }}>
            Create New Password
          </h1>

          <p style={{
            fontSize: FONT_SIZES.md,
            color: COLORS.text.whiteMedium,
            marginBottom: SPACING.xl
          }}>
            Enter a strong password for your account
          </p>

          <form onSubmit={handleSubmit}>
            {message && (
              <p style={{
                marginBottom: SPACING.md,
                color: message.includes('✅') ? COLORS.status.success : COLORS.status.error,
                fontSize: FONT_SIZES.sm,
                fontWeight: FONT_WEIGHTS.medium
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
                  e.currentTarget.style.boxShadow = "0 0 10px rgba(176, 97, 206, 0.5)";
                  e.currentTarget.style.borderColor = COLORS.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = COLORS.border.whiteTransparent;
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
                    right: SPACING.sm,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: COLORS.text.whiteSubtle,
                    minWidth: TOUCH_TARGETS.minimum,
                    minHeight: TOUCH_TARGETS.minimum,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: SPACING.sm,
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
                      transition: TRANSITIONS.default,
                    }} />
                  </div>
                  <span style={{
                    fontSize: FONT_SIZES.xs,
                    fontWeight: FONT_WEIGHTS.semibold,
                    color: passwordStrength.color
                  }}>
                    {passwordStrength.label}
                  </span>

                  {/* Requirements */}
                  <div style={requirementsStyles}>
                    <p style={{
                      fontSize: FONT_SIZES.xs,
                      fontWeight: FONT_WEIGHTS.semibold,
                      color: COLORS.text.white,
                      margin: `0 0 ${SPACING.sm} 0`
                    }}>
                      Password must contain:
                    </p>
                    <ul style={{
                      margin: 0,
                      paddingLeft: "20px",
                      listStyle: "none",
                      fontSize: FONT_SIZES.xs
                    }}>
                      <li style={{
                        color: formData.newPassword.length >= 8 ? COLORS.status.success : COLORS.text.whiteSubtle,
                        marginBottom: SPACING.xs
                      }}>
                        {formData.newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
                      </li>
                      <li style={{
                        color: /[a-zA-Z]/.test(formData.newPassword) && /[0-9]/.test(formData.newPassword) ? COLORS.status.success : COLORS.text.whiteSubtle,
                        marginBottom: SPACING.xs
                      }}>
                        {/[a-zA-Z]/.test(formData.newPassword) && /[0-9]/.test(formData.newPassword) ? '✓' : '○'} Letters and numbers
                      </li>
                      <li style={{
                        color: /[A-Z]/.test(formData.newPassword) ? COLORS.status.success : COLORS.text.whiteSubtle
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
                  borderColor: formData.confirmPassword && formData.newPassword !== formData.confirmPassword ? COLORS.status.error : COLORS.border.whiteTransparent
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 10px rgba(176, 97, 206, 0.5)";
                  e.currentTarget.style.borderColor = COLORS.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = formData.confirmPassword && formData.newPassword !== formData.confirmPassword ? COLORS.status.error : COLORS.border.whiteTransparent;
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
                    right: SPACING.sm,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: COLORS.text.whiteSubtle,
                    minWidth: TOUCH_TARGETS.minimum,
                    minHeight: TOUCH_TARGETS.minimum,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: SPACING.sm,
                  }}
                >
                  {showConfirmPassword ? <AiOutlineEyeInvisible style={{ fontSize: "20px" }} /> : <AiOutlineEye style={{ fontSize: "20px" }} />}
                </button>
              </div>

              {/* Password Match */}
              {formData.confirmPassword && (
                <p style={{
                  fontSize: FONT_SIZES.xs,
                  fontWeight: FONT_WEIGHTS.medium,
                  margin: `${SPACING.xs} 0 0 0`,
                  color: formData.newPassword === formData.confirmPassword ? COLORS.status.success : COLORS.status.error
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
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(176, 97, 206, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(176, 97, 206, 0.4)";
              }}
            >
              {isLoading ? "Resetting Password..." : "🔐 Reset Password"}
            </button>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: SPACING.md,
              margin: `${SPACING.lg} auto`,
              width: "150px"
            }}>
              <div style={{ flex: 1, height: "1px", background: COLORS.border.whiteTransparent }} />
              <span style={{ color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.md }}>OR</span>
              <div style={{ flex: 1, height: "1px", background: COLORS.border.whiteTransparent }} />
            </div>

            <a
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: COLORS.text.white,
                fontSize: FONT_SIZES.md,
                fontWeight: FONT_WEIGHTS.semibold,
                textDecoration: "none",
                minHeight: TOUCH_TARGETS.minimum,
                padding: `${SPACING.sm} ${SPACING.md}`,
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