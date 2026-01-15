import React, { useState } from "react";
import { redirectUser, getLoggedInUser } from "../api";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { MdLock, MdPerson } from "react-icons/md";
import { useLoading } from "../contexts/LoadingContext";
import { useResponsive } from "../hooks/useResponsive";

function LoginPage() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setLoading } = useLoading();
  const { isMobile } = useResponsive();

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
    setLoading(true, "SIGNING IN");

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
        setLoading(true, "LOADING PROFILE");
        const userDetails = await getLoggedInUser();
        const fullName = userDetails.fullName || "Unknown";
        localStorage.setItem("fullName", fullName);

        setMessage("✅ Login successful!");
        setLoading(false);
        redirectUser(); // Or navigate("/dashboard");
      } else {
        setMessage(`⚠️ Error: ${data.detail || "Invalid credentials"}`);
        setLoading(false);
      }
    } catch (error) {
      setMessage("⚠️ Network error. Try again.");
      setLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex overflow-hidden relative"
      style={{
        background: 'linear-gradient(135deg, #1a1f3a 0%, #2d1b4e 50%, #1a1f3a 100%)'
      }}
    >
      {/* Futuristic Background Elements - Hidden on mobile for performance */}
      {!isMobile && (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top-Left Geometric Network - White/Light Blue */}
        <svg className="absolute top-0 left-0 w-1/2 h-1/2" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Network lines */}
          <line x1="50" y1="100" x2="150" y2="80" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
          <line x1="150" y1="80" x2="250" y2="120" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
          <line x1="250" y1="120" x2="200" y2="200" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
          <line x1="200" y1="200" x2="100" y2="180" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
          <line x1="100" y1="180" x2="50" y2="100" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
          <line x1="150" y1="80" x2="180" y2="150" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
          <line x1="180" y1="150" x2="250" y2="120" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
          <line x1="180" y1="150" x2="200" y2="200" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
          <line x1="50" y1="100" x2="80" y2="140" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
          <line x1="80" y1="140" x2="100" y2="180" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
          
          {/* Glowing nodes */}
          <circle cx="50" cy="100" r="4" fill="#ffffff" opacity="0.9" filter="url(#glow)" />
          <circle cx="150" cy="80" r="5" fill="#60a5fa" opacity="0.9" filter="url(#glow)" />
          <circle cx="250" cy="120" r="4" fill="#ffffff" opacity="0.9" filter="url(#glow)" />
          <circle cx="200" cy="200" r="5" fill="#60a5fa" opacity="0.9" filter="url(#glow)" />
          <circle cx="100" cy="180" r="4" fill="#ffffff" opacity="0.9" filter="url(#glow)" />
          <circle cx="180" cy="150" r="4" fill="#60a5fa" opacity="0.9" filter="url(#glow)" />
          <circle cx="80" cy="140" r="3" fill="#ffffff" opacity="0.8" filter="url(#glow)" />
          
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
        </svg>

        {/* Bottom-Right Geometric Network - Pink/Magenta */}
        <svg className="absolute bottom-0 right-0 w-1/2 h-1/2" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Network lines */}
          <line x1="750" y1="500" x2="650" y2="480" stroke="#ec4899" strokeWidth="1.5" opacity="0.7" />
          <line x1="650" y1="480" x2="550" y2="520" stroke="#ec4899" strokeWidth="1.5" opacity="0.7" />
          <line x1="550" y1="520" x2="600" y2="400" stroke="#ec4899" strokeWidth="1.5" opacity="0.7" />
          <line x1="600" y1="400" x2="700" y2="420" stroke="#ec4899" strokeWidth="1.5" opacity="0.7" />
          <line x1="700" y1="420" x2="750" y2="500" stroke="#ec4899" strokeWidth="1.5" opacity="0.7" />
          <line x1="650" y1="480" x2="620" y2="450" stroke="#ec4899" strokeWidth="1.5" opacity="0.7" />
          <line x1="620" y1="450" x2="550" y2="520" stroke="#ec4899" strokeWidth="1.5" opacity="0.7" />
          <line x1="620" y1="450" x2="600" y2="400" stroke="#ec4899" strokeWidth="1.5" opacity="0.7" />
          
          {/* Central bright pink glow */}
          <circle cx="620" cy="450" r="8" fill="#ec4899" opacity="0.9" filter="url(#glowPink)" />
          
          {/* Glowing nodes */}
          <circle cx="750" cy="500" r="4" fill="#f472b6" opacity="0.9" filter="url(#glowPink)" />
          <circle cx="650" cy="480" r="5" fill="#ec4899" opacity="0.9" filter="url(#glowPink)" />
          <circle cx="550" cy="520" r="4" fill="#f472b6" opacity="0.9" filter="url(#glowPink)" />
          <circle cx="600" cy="400" r="5" fill="#ec4899" opacity="0.9" filter="url(#glowPink)" />
          <circle cx="700" cy="420" r="4" fill="#f472b6" opacity="0.9" filter="url(#glowPink)" />
          
          <defs>
            <filter id="glowPink">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
        </svg>

        {/* Floating dots/particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${2 + Math.random() * 3}px`,
                height: `${2 + Math.random() * 3}px`,
                backgroundColor: Math.random() > 0.5 ? '#60a5fa' : '#ec4899',
                opacity: 0.4 + Math.random() * 0.4,
                animation: `float ${5 + Math.random() * 5}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Abstract Linear Patterns - Top Right */}
        <svg className="absolute top-0 right-0 w-64 h-32" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="20" y1="30" x2="80" y2="30" stroke="#7c3aed" strokeWidth="1.5" opacity="0.5" />
          <line x1="20" y1="35" x2="80" y2="35" stroke="#7c3aed" strokeWidth="1.5" opacity="0.5" />
          <line x1="20" y1="50" x2="100" y2="50" stroke="#7c3aed" strokeWidth="1.5" opacity="0.5" />
          <line x1="20" y1="55" x2="100" y2="55" stroke="#7c3aed" strokeWidth="1.5" opacity="0.5" />
          <line x1="20" y1="60" x2="100" y2="60" stroke="#7c3aed" strokeWidth="1.5" opacity="0.5" />
          <line x1="120" y1="40" x2="140" y2="40" stroke="#7c3aed" strokeWidth="1" opacity="0.4" strokeDasharray="4 4" />
        </svg>

        {/* Abstract Linear Patterns - Bottom Left */}
        <svg className="absolute bottom-0 left-0 w-64 h-32" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="20" y1="70" x2="80" y2="70" stroke="#7c3aed" strokeWidth="1.5" opacity="0.5" />
          <line x1="20" y1="75" x2="80" y2="75" stroke="#7c3aed" strokeWidth="1.5" opacity="0.5" />
          <line x1="20" y1="50" x2="100" y2="50" stroke="#7c3aed" strokeWidth="1.5" opacity="0.5" />
          <line x1="20" y1="45" x2="100" y2="45" stroke="#7c3aed" strokeWidth="1.5" opacity="0.5" />
          <line x1="20" y1="40" x2="100" y2="40" stroke="#7c3aed" strokeWidth="1.5" opacity="0.5" />
          <line x1="120" y1="60" x2="140" y2="60" stroke="#7c3aed" strokeWidth="1" opacity="0.4" strokeDasharray="4 4" />
        </svg>
      </div>
      )}

      {/* Left Panel - Promotional Section */}
      <div 
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative p-12 z-10"
        style={{ backgroundColor: 'rgba(35, 98, 171, 0.3)' }}
      >

        {/* Content */}
        <div className="relative z-10 text-center text-white">
          {/* White Logo from Sidebar */}
          <div className="mb-8 flex justify-center">
            <img 
              src="/whiteLogo.png" 
              alt="KoderKids Logo" 
              className="h-20 sm:h-24 w-auto"
              style={{ backgroundColor: 'transparent' }}
            />
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-6">
            KoderKids
          </h1>
          <p className="text-lg sm:text-xl font-normal mb-8 max-w-md">
            Empowering the next generation of coders through innovative learning experiences
          </p>
          <a
            href="https://koderkids.pk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: '#1d4f8a' }}
          >
            Read More
          </a>
        </div>
      </div>

      {/* Right Panel - Login Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 bg-white/95 backdrop-blur-sm z-10 min-h-screen lg:min-h-0">
        <div className="w-full max-w-md px-2 sm:px-0">
          {/* Mobile Logo - Only visible on mobile */}
          {isMobile && (
            <div className="mb-6 flex justify-center">
              <img
                src="/whiteLogo.png"
                alt="KoderKids Logo"
                className="h-16 w-auto"
                style={{
                  filter: 'brightness(0) saturate(100%) invert(29%) sepia(92%) saturate(1053%) hue-rotate(213deg) brightness(91%) contrast(87%)'
                }}
              />
            </div>
          )}

          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
              Hello Again!
            </h1>
            <p className="text-base sm:text-lg text-gray-600 font-normal">
              Welcome Back
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Modern Success/Error Message */}
            {message && (
              <div
                className={`relative overflow-hidden rounded-xl p-4 text-sm font-medium transition-all duration-300 ease-out animate-slide-in ${
                  message.includes("✅")
                    ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-2 border-green-300 shadow-lg shadow-green-200/50"
                    : "bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border-2 border-red-300 shadow-lg shadow-red-200/50"
                }`}
              >
                {/* Animated Background Shimmer */}
                <div
                  className={`absolute inset-0 opacity-20 ${
                    message.includes("✅")
                      ? "bg-gradient-to-r from-transparent via-green-200 to-transparent"
                      : "bg-gradient-to-r from-transparent via-red-200 to-transparent"
                  }`}
                  style={{
                    animation: 'shimmer 2s infinite',
                    transform: 'translateX(-100%)'
                  }}
                />
                
                {/* Content */}
                <div className="relative z-10 flex items-center gap-3">
                  {/* Icon */}
                  {message.includes("✅") ? (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center animate-checkmark">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center animate-shake">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                  
                  {/* Message Text */}
                  <div className="flex-1">
                    <p className="font-semibold">
                      {message.includes("✅") ? "Success!" : "Error"}
                    </p>
                    <p className="text-xs mt-0.5 opacity-90">
                      {message.replace(/[✅⚠️]/g, "").trim()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Username Field */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <MdPerson className="w-5 h-5" />
              </div>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                placeholder="Username"
                  required
                className="w-full pl-12 pr-4 py-3 sm:py-3.5 text-base text-gray-900 bg-white border border-gray-200 rounded-xl
                         transition-all duration-200 ease-in-out
                         placeholder:text-gray-400 placeholder:font-normal
                         focus:outline-none focus:border-gray-300
                         hover:border-gray-300
                         disabled:bg-gray-50 disabled:cursor-not-allowed"
                style={{ fontSize: '16px', minHeight: '48px' }}
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <MdLock className="w-5 h-5" />
              </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                placeholder="Password"
                  required
                className="w-full pl-12 pr-12 py-3 sm:py-3.5 text-base text-gray-900 bg-white border border-gray-200 rounded-xl
                         transition-all duration-200 ease-in-out
                         placeholder:text-gray-400 placeholder:font-normal
                         focus:outline-none focus:border-gray-300
                         hover:border-gray-300
                         disabled:bg-gray-50 disabled:cursor-not-allowed"
                style={{ fontSize: '16px', minHeight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2
                         text-gray-400 hover:text-gray-600
                         transition-colors duration-200 ease-in-out
                         focus:outline-none rounded-lg
                         p-2"
                style={{ minWidth: '44px', minHeight: '44px' }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <AiOutlineEyeInvisible className="w-5 h-5" />
                ) : (
                  <AiOutlineEye className="w-5 h-5" />
                )}
                </button>
            </div>

            {/* Login Button - Modern Design with Hover Effects */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 sm:py-4 px-6 text-white text-base font-semibold rounded-xl
                       relative overflow-hidden
                       transition-all duration-300 ease-in-out
                       hover:scale-[1.02] hover:shadow-2xl
                       focus:outline-none focus:ring-2 focus:ring-[#b166cc] focus:ring-offset-2
                       active:scale-[0.98]
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none
                       flex items-center justify-center gap-2
                       group"
              style={{
                background: 'linear-gradient(135deg, #b166cc 0%, #9a4fb8 100%)',
                width: '100%',
                boxSizing: 'border-box',
                boxShadow: '0 4px 15px rgba(177, 102, 204, 0.3)',
                minHeight: '48px'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #9a4fb8 0%, #8a3fa8 100%)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(177, 102, 204, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #b166cc 0%, #9a4fb8 100%)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(177, 102, 204, 0.3)';
                }
              }}
            >
              {/* Shine effect on hover */}
              <span 
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)'
                }}
              />
              <span className="relative z-10">
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white inline-block mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  "Login"
                )}
              </span>
            </button>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <a
                href="/forgot-password"
                className="text-sm sm:text-base text-gray-600 hover:text-gray-900
                         transition-colors duration-200 ease-in-out
                         focus:outline-none rounded font-medium
                         py-2 px-1"
                style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
              >
                Forgot Password?
              </a>
            </div>
          </form>
        </div>
      </div>

      {/* Floating Animation */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}

export default LoginPage;