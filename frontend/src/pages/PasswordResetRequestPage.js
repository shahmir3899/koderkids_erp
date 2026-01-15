// ============================================
// PASSWORD RESET REQUEST PAGE
// ============================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../services/authService';

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

function PasswordResetRequestPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  // Use responsive hook for proper breakpoint detection
  const { isMobile } = useResponsive();

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
    maxWidth: isMobile ? "100%" : "450px",
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
    maxWidth: "450px",
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

  const inputContainerStyles = {
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

  const successBoxStyles = {
    ...MIXINS.glassmorphicSubtle,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    border: `1px solid ${COLORS.status.success}`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  };

  const instructionsStyles = {
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
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
            color: COLORS.text.primary,
            marginBottom: SPACING.md
          }}>
            Reset Password
          </h1>

          <p style={{
            fontSize: FONT_SIZES.md,
            color: COLORS.text.secondary,
            marginBottom: SPACING.xl
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
                  marginBottom: SPACING.md,
                  color: message.includes('⚠️') ? COLORS.status.danger : COLORS.status.success,
                  fontSize: FONT_SIZES.sm
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
                gap: SPACING.md,
                margin: `${SPACING.lg} auto`,
                width: "150px"
              }}>
                <div style={{ flex: 1, height: "1px", background: COLORS.border.default }} />
                <span style={{ color: COLORS.border.default, fontSize: FONT_SIZES.md }}>OR</span>
                <div style={{ flex: 1, height: "1px", background: COLORS.border.default }} />
              </div>

              <a
                href="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6E6CDF",
                  fontSize: FONT_SIZES.md,
                  fontWeight: FONT_WEIGHTS.semibold,
                  textDecoration: "none",
                  marginTop: SPACING.md,
                  minHeight: TOUCH_TARGETS.minimum,
                  padding: `${SPACING.sm} ${SPACING.md}`,
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
                  fontSize: FONT_SIZES.md,
                  fontWeight: FONT_WEIGHTS.medium
                }}>
                  ✅ Email Sent Successfully
                </p>
              </div>

              <p style={{ fontSize: FONT_SIZES.sm, color: COLORS.text.primary, marginBottom: SPACING.md }}>
                We've sent a password reset link to:
              </p>
              <p style={{
                fontSize: FONT_SIZES.md,
                fontWeight: FONT_WEIGHTS.semibold,
                color: "#6E6CDF",
                marginBottom: SPACING.lg,
                wordBreak: "break-all"
              }}>
                {email}
              </p>

              <div style={instructionsStyles}>
                <p style={{
                  fontSize: FONT_SIZES.sm,
                  fontWeight: FONT_WEIGHTS.semibold,
                  color: COLORS.text.primary,
                  marginBottom: SPACING.sm
                }}>
                  📋 Next Steps:
                </p>
                <ol style={{
                  margin: 0,
                  paddingLeft: "20px",
                  color: COLORS.text.secondary,
                  fontSize: FONT_SIZES.sm,
                  lineHeight: "1.8"
                }}>
                  <li>Check your email inbox (and spam folder)</li>
                  <li>Click the reset link in the email</li>
                  <li>Create your new password</li>
                  <li>Log in with your new credentials</li>
                </ol>
              </div>

              <p style={{
                fontSize: FONT_SIZES.xs,
                color: COLORS.status.warning,
                backgroundColor: "#FEF3C7",
                padding: SPACING.md,
                borderRadius: BORDER_RADIUS.md,
                marginBottom: SPACING.lg
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
                  background: COLORS.background.light,
                  color: COLORS.text.primary,
                  marginBottom: SPACING.sm
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.background = COLORS.border.default;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.background = COLORS.background.light;
                }}
              >
                📧 Send Another Email
              </button>

              <a
                href="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6E6CDF",
                  fontSize: FONT_SIZES.md,
                  fontWeight: FONT_WEIGHTS.semibold,
                  textDecoration: "none",
                  minHeight: TOUCH_TARGETS.minimum,
                  padding: `${SPACING.sm} ${SPACING.md}`,
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