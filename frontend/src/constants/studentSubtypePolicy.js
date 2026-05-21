export const STUDENT_SUBTYPE_POLICY = {
  ONSITE: {
    lmsEnabled: true,
    progressEnabled: true,
    aiGalaEnabled: true,
    onlineClassesEnabled: false,
  },
  ONLINE: {
    lmsEnabled: true,
    progressEnabled: false,
    aiGalaEnabled: false,
    onlineClassesEnabled: true,
  },
  HYBRID: {
    lmsEnabled: true,
    progressEnabled: true,
    aiGalaEnabled: true,
    onlineClassesEnabled: true,
  },
};

export const LMS_ENABLED_STUDENT_SUBTYPES = Object.keys(STUDENT_SUBTYPE_POLICY).filter(
  (subtype) => STUDENT_SUBTYPE_POLICY[subtype].lmsEnabled
);

export const PROGRESS_ENABLED_STUDENT_SUBTYPES = Object.keys(STUDENT_SUBTYPE_POLICY).filter(
  (subtype) => STUDENT_SUBTYPE_POLICY[subtype].progressEnabled
);

export const AI_GALA_ENABLED_STUDENT_SUBTYPES = Object.keys(STUDENT_SUBTYPE_POLICY).filter(
  (subtype) => STUDENT_SUBTYPE_POLICY[subtype].aiGalaEnabled
);

export const ONLINE_CLASSES_ENABLED_STUDENT_SUBTYPES = Object.keys(STUDENT_SUBTYPE_POLICY).filter(
  (subtype) => STUDENT_SUBTYPE_POLICY[subtype].onlineClassesEnabled
);

export const isLmsEnabledStudentSubtype = (subtype) =>
  Boolean(STUDENT_SUBTYPE_POLICY[subtype]?.lmsEnabled);

export const isStudentFeatureEnabled = (subtype, featureKey) =>
  Boolean(STUDENT_SUBTYPE_POLICY[subtype]?.[featureKey]);

// Dashboard routing: ONLINE students get a dedicated dashboard
export const ONLINE_DASHBOARD_STUDENT_SUBTYPES = ['ONLINE'];
export const STANDARD_DASHBOARD_STUDENT_SUBTYPES = ['ONSITE', 'HYBRID'];

export const getDefaultDashboardPath = (role, subtype) => {
  if (role === 'Student' && subtype === 'ONLINE') return '/online-student-dashboard';
  if (role === 'Student') return '/student-dashboard';
  if (role === 'Admin') return '/admindashboard';
  if (role === 'Teacher') return '/teacherdashboard';
  if (role === 'BDM') return '/crm/dashboard';
  return '/login';
};
