/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ============================================
        // KODER KIDS BRAND COLORS
        // Extracted directly from koder-kids-logo.svg
        // ============================================
        
        // Primary Brand Color (Purple/Magenta)
        // Base: #b166cc - Used in "KODER" text
        brand: {
          primary: {
            DEFAULT: '#b166cc',  // Main primary color
            variant1: '#b065ca',  // Purple variant 1
            variant2: '#b26cc8',  // Purple variant 2
            dark: '#9a4fb8',      // Darker shade
            light: '#c87fdd',     // Lighter shade
            lighter: '#e0b3ed',   // Very light shade
          },
          
          // Secondary Brand Color (Blue)
          // Base: #2362ab - Used in "KIDS" text
          secondary: {
            DEFAULT: '#2362ab',  // Main secondary color
            variant1: '#2c62a5',  // Blue variant 1
            variant2: '#2c60a8',  // Blue variant 2
            variant3: '#2862aa',  // Blue variant 3
            dark: '#1d4f8a',      // Darker shade
            light: '#4a8fd4',     // Lighter shade
            lighter: '#b3d4f0',   // Very light shade
          },
          
          // Neutral Colors
          neutral: {
            dark: '#343434',      // Dark neutral from logo
            base: '#4a4a4a',      // Base neutral
            medium: '#666666',    // Medium neutral
            light: '#9CA3AF',     // Light neutral
            lighter: '#D1D5DB',   // Very light neutral
          },
          
          // Background
          bg: {
            white: '#fefefe',      // Off-white from logo
            pure: '#FFFFFF',       // Pure white
            gray: '#F2F2F7',       // Light gray
            lightGray: '#F9FAFB',  // Very light gray
          },
        },
      },
    },
  },
  plugins: [],
};
