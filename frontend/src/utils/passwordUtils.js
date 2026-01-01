// ============================================
// PASSWORD UTILITIES - Reusable Functions
// NEW FILE: frontend/src/utils/passwordUtils.js
// ============================================

/**
 * Calculate password strength score
 * @param {string} password - Password to evaluate
 * @returns {number} Score from 0-6
 */
export const calculatePasswordStrength = (password) => {
  if (!password) return 0;

  let score = 0;
  
  // Length scoring
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  
  // Character variety scoring
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  return score;
};

/**
 * Get password strength label and color
 * @param {number} score - Password strength score (0-6)
 * @returns {Object} { label, color }
 */
export const getPasswordStrength = (score) => {
  if (score <= 2) {
    return { label: 'Weak', color: '#DC2626' };
  } else if (score <= 4) {
    return { label: 'Medium', color: '#F59E0B' };
  } else {
    return { label: 'Strong', color: '#10B981' };
  }
};

/**
 * Validate password requirements
 * @param {string} password - Password to validate
 * @returns {Object} Requirements status
 */
export const validatePasswordRequirements = (password) => {
  return {
    minLength: password.length >= 8,
    hasLettersAndNumbers: /[a-zA-Z]/.test(password) && /[0-9]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
  };
};

/**
 * Check if password meets minimum requirements
 * @param {string} password - Password to check
 * @returns {boolean} True if valid
 */
export const isPasswordValid = (password) => {
  const requirements = validatePasswordRequirements(password);
  return requirements.minLength && requirements.hasLettersAndNumbers;
};

/**
 * Check if passwords match
 * @param {string} password1 - First password
 * @param {string} password2 - Second password
 * @returns {boolean} True if they match
 */
export const doPasswordsMatch = (password1, password2) => {
  return password1 === password2 && password1.length > 0;
};