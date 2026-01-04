// ============================================
// PROFILE HEADER CONFIGURATION - FIXED VERSION
// Better field mapping and fallbacks
// ============================================
// Location: frontend/src/components/common/profileHeaderConfig.js

/**
 * Role-based configuration for UnifiedProfileHeader
 * FIXED: Better field mapping, multiple fallback options
 */

export const PROFILE_HEADER_CONFIG = {
  // ============================================
  // TEACHER CONFIGURATION
  // ============================================
  Teacher: {
    // Identity
    idField: 'employee_id',
    idPrefix: 'Emp #',
    idFallback: 'Not Assigned',
    
    // Display - FIXED: Check multiple fields
    nameFields: ['name', 'full_name', 'first_name' ],  // Try in order
    roleName: 'Teacher',
    
    // Details Row Configuration
    details: [
      {
        key: 'gender',
        label: 'Gender',
        fields: ['gender'],  // Array for fallback
        fallback: 'Not Set',
        format: (value) => value || 'Not Set',
      },
      {
        key: 'joining_date',
        label: 'Joining Date',
        fields: ['date_of_joining', 'joining_date'],  // Multiple options
        fallback: 'Not Set',
        format: (value) => {
          if (!value) return 'Not Set';
          try {
            const date = new Date(value);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
          } catch (e) {
            return 'Not Set';
          }
        },
      },
      {
        key: 'blood_group',
        label: 'Blood Group',
        fields: ['blood_group', 'bloodGroup'],
        fallback: 'Not Set',
        format: (value) => value || 'Not Set',
      },
      {
        key: 'schools',
        label: 'In-charge of School',
        fields: ['school_names', 'schools', 'assigned_schools'],
        fallback: 'No Schools Assigned',
        format: (value) => {
          if (!value) return 'No Schools Assigned';
          if (Array.isArray(value)) {
            return value.length > 0 ? value.join(', ') : 'No Schools Assigned';
          }
          return value || 'No Schools Assigned';
        },
        noBorder: true,
      },
    ],
    
    // Features
    features: {
      showNotifications: true,
      showMessages: true,
      showSettings: true,
      showLogout: true,
      showSmallAvatar: true,
    },
    
    // Theme
    colors: {
      accent: '#B061CE',
      avatarBg: '#B061CE',
      iconHover: '#F3F4F6',
    },
    
    // Avatar
    avatarSize: 101,
    avatarFallback: '/images/teacher-avatar.jpg',
    
    // Modal
    settingsModal: 'TeacherSettingsModal',
  },

  // ============================================
  // ADMIN CONFIGURATION
  // ============================================
  Admin: {
    // Identity
    idField: 'employee_id',
    idPrefix: 'Emp #',
    idFallback: 'Not Assigned',
    
    // Display - FIXED: Check multiple fields
    nameFields: ['full_name', 'first_name', 'username'],
    roleName: 'Administrator',
    
    // Details Row Configuration
    details: [
      {
        key: 'gender',
        label: 'Gender',
        fields: ['gender'],
        fallback: 'Not Set',
        format: (value) => value || 'Not Set',
      },
      {
        key: 'joining_date',
        label: 'Joining Date',
        fields: ['date_of_joining', 'joining_date'],
        fallback: 'Not Set',
        format: (value) => {
          if (!value) return 'Not Set';
          try {
            const date = new Date(value);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
          } catch (e) {
            return 'Not Set';
          }
        },
      },
      {
        key: 'blood_group',
        label: 'Blood Group',
        fields: ['blood_group', 'bloodGroup'],
        fallback: 'Not Set',
        format: (value) => value || 'Not Set',
      },
      {
        key: 'title',
        label: 'Title',
        fields: ['title', 'job_title', 'position'],
        fallback: 'Administrator',
        format: (value) => value || 'Administrator',
        noBorder: true,
      },
    ],
    
    // Features
    features: {
      showNotifications: false,
      showMessages: false,
      showSettings: true,
      showLogout: true,
      showSmallAvatar: true,
    },
    
    // Theme
    colors: {
      accent: '#3B82F6',
      avatarBg: '#3B82F6',
      iconHover: '#F3F4F6',
    },
    
    // Avatar
    avatarSize: 101,
    avatarFallback: '/images/admin-avatar.jpg',
    
    // Modal
    settingsModal: 'AdminSettingsModal',
  },

  // ============================================
  // STUDENT CONFIGURATION
  // ============================================
  Student: {
    // Identity
    idField: 'reg_num',
    idPrefix: 'Reg #',
    idFallback: 'Not Assigned',
    
    // Display - FIXED: Check multiple fields
    nameFields: ['name', 'full_name', 'first_name', 'username'],
    roleName: 'Student',
    
    // Details Row Configuration
    details: [
      {
        key: 'school',
        label: 'School',
        fields: ['school', 'school_name'],
        fallback: 'Not Assigned',
        format: (value) => value || 'Not Assigned',
      },
      {
        key: 'class',
        label: 'Class',
        fields: ['class', 'student_class', 'grade'],
        fallback: 'Not Assigned',
        format: (value) => value || 'Not Assigned',
      },
      {
        key: 'phone',
        label: 'Phone',
        fields: ['phone', 'phone_number', 'contact'],
        fallback: 'Not Set',
        format: (value) => value || 'Not Set',
      },
      {
        key: 'address',
        label: 'Address',
        fields: ['address', 'street_address'],
        fallback: 'Not Set',
        format: (value) => {
          if (!value) return 'Not Set';
          return value.length > 30 ? value.substring(0, 30) + '...' : value;
        },
        noBorder: true,
      },
    ],
    
    // Features
    features: {
      showNotifications: false,
      showMessages: false,
      showSettings: true,
      showLogout: true,
      showSmallAvatar: true,
    },
    
    // Theme
    colors: {
      accent: '#10B981',
      avatarBg: '#10B981',
      iconHover: '#F3F4F6',
    },
    
    // Avatar
    avatarSize: 101,
    avatarFallback: '/images/student-avatar.jpg',
    
    // Modal
    settingsModal: 'StudentSettingsModal',
  },

  // ============================================
  // BDM CONFIGURATION
  // ============================================
  BDM: {
    // Identity
    idField: 'employee_id',
    idPrefix: 'Emp #',
    idFallback: 'Not Assigned',

    // Display - Check multiple fields
    nameFields: ['full_name', 'first_name', 'username'],
    roleName: 'Business Development Manager',

    // Details Row Configuration
    details: [
      {
        key: 'gender',
        label: 'Gender',
        fields: ['gender'],
        fallback: 'Not Set',
        format: (value) => value || 'Not Set',
      },
      {
        key: 'joining_date',
        label: 'Joining Date',
        fields: ['date_of_joining', 'joining_date'],
        fallback: 'Not Set',
        format: (value) => {
          if (!value) return 'Not Set';
          try {
            const date = new Date(value);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
          } catch (e) {
            return 'Not Set';
          }
        },
      },
      {
        key: 'phone',
        label: 'Phone',
        fields: ['phone', 'phone_number', 'contact'],
        fallback: 'Not Set',
        format: (value) => value || 'Not Set',
      },
      {
        key: 'email',
        label: 'Email',
        fields: ['email', 'email_address'],
        fallback: 'Not Set',
        format: (value) => value || 'Not Set',
        noBorder: true,
      },
    ],

    // Features
    features: {
      showNotifications: false,
      showMessages: false,
      showSettings: true,
      showLogout: true,
      showSmallAvatar: true,
    },

    // Theme
    colors: {
      accent: '#F59E0B',
      avatarBg: '#F59E0B',
      iconHover: '#F3F4F6',
    },

    // Avatar
    avatarSize: 101,
    avatarFallback: '/images/bdm-avatar.jpg',

    // Modal
    settingsModal: 'BDMSettingsModal',
  },
};

/**
 * Get configuration for a specific role
 */
export const getRoleConfig = (role) => {
  const config = PROFILE_HEADER_CONFIG[role];
  if (!config) {
    console.warn(`⚠️ No configuration found for role: ${role}. Using Teacher config as fallback.`);
    return PROFILE_HEADER_CONFIG.Teacher;
  }
  return config;
};

/**
 * FIXED: Get name from profile using multiple fallback fields
 */
export const getProfileName = (profile, config) => {
  if (!profile) return 'User';
  
  // Try each field in order
  for (const field of config.nameFields) {
    const value = profile[field];
    if (value && value.trim()) {
      console.log(`✅ Found name in field '${field}':`, value);
      return value.trim();
    }
  }
  
  // Fallback: Try constructing from first_name + last_name
  if (profile.first_name || profile.last_name) {
    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    if (name) {
      console.log('✅ Constructed name from first_name + last_name:', name);
      return name;
    }
  }
  
  console.warn('⚠️ No name found in profile, using fallback');
  return 'User';
};

/**
 * FIXED: Get detail value with multiple field fallbacks
 */
export const getDetailValue = (profile, detailConfig) => {
  if (!profile) return detailConfig.fallback;
  
  // Try each field in order
  for (const field of detailConfig.fields) {
    const value = profile[field];
    if (value !== undefined && value !== null && value !== '') {
      return detailConfig.format(value);
    }
  }
  
  return detailConfig.fallback;
};

export default PROFILE_HEADER_CONFIG;