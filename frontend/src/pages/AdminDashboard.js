// ============================================
// ADMIN DASHBOARD - OPTIMIZED VERSION WITH REACT QUERY
// ============================================
// PERFORMANCE IMPROVEMENTS:
// 1. React Query for caching and deduplication
// 2. Lazy loading for heavy data (new-registrations)
// 3. Progressive loading - show UI first, load data later
// 4. Automatic cache invalidation and background refetching
// 5. Collapsible sections start collapsed for heavy data
// ============================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import { UnifiedProfileHeader } from '../components/common/UnifiedProfileHeader';
import { getAdminProfile } from '../services/adminService';
import { CollapsibleSection } from '../components/common/cards/CollapsibleSection';
import { FilterBar } from '../components/common/filters/FilterBar';
import { DataTable } from '../components/common/tables/DataTable';

import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { useSchools } from '../hooks/useSchools';
import { SendNotificationModal } from '../components/admin/SendNotificationModal';
import { FinancialSummaryCard } from '../components/finance/FinancialSummaryCard';

// React Query Hooks
import {
  useStudentsPerSchool,
  useFeePerMonth,
  useFeeSummary,
  useNewRegistrations,
  useStudentData,
} from '../hooks/queries';

// Dashboard Components
import LoginActivityWidget from '../components/dashboard/LoginActivityWidget';
import AdminTeacherAttendanceWidget from '../components/dashboard/AdminTeacherAttendanceWidget';

// Staff Command Components
import { StaffCommandInput, CommandHistory, QuickActionsPanel } from '../components/staff';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  TRANSITIONS,
  MIXINS,
} from '../utils/designConstants';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ============================================
// MAIN COMPONENT
// ============================================
function AdminDashboard() {
  // ============================================
  // REACT QUERY HOOKS - Automatic caching and deduplication
  // ============================================

  // Schools data
  const { schools } = useSchools();

  // Students per school data
  const {
    data: studentsPerSchoolData = [],
    isLoading: isLoadingStudents,
  } = useStudentsPerSchool();

  // Fee per month data
  const {
    data: feePerMonthData = [],
    isLoading: isLoadingFee,
  } = useFeePerMonth();

  // Selected month state for fee summary
  const [selectedMonth, setSelectedMonth] = useState('');

  // Fee summary for selected month
  const {
    data: feeSummaryData = [],
    isLoading: isLoadingFeeSummary,
  } = useFeeSummary(selectedMonth);

  // New registrations - lazy loaded when section opens
  const [shouldFetchRegistrations, setShouldFetchRegistrations] = useState(false);
  const {
    data: newRegistrationsData = [],
    isLoading: isLoadingRegistrations,
  } = useNewRegistrations({ enabled: shouldFetchRegistrations });

  // Student data filters
  const [studentDataFilters, setStudentDataFilters] = useState({
    schoolId: null,
    className: null,
  });

  // Student data - loaded when filters are set
  const {
    data: studentDataResult,
    isLoading: isLoadingStudentData,
  } = useStudentData(
    studentDataFilters.schoolId,
    studentDataFilters.className,
    selectedMonth,
    { enabled: !!studentDataFilters.schoolId && !!studentDataFilters.className && !!selectedMonth }
  );

  // Extract student data
  const studentAttendance = studentDataResult?.attendance || [];
  const studentTopics = studentDataResult?.topics || [];
  const studentImages = studentDataResult?.images || [];

  // UI State
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Profile state (still using local state since it's user-specific)
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Ref for command input
  const commandInputRef = useRef(null);

  // Derived loading states
  const loading = {
    profile: isLoadingProfile,
    students: isLoadingStudents,
    fee: isLoadingFee,
    feeSummary: isLoadingFeeSummary,
    registrations: isLoadingRegistrations,
    studentData: isLoadingStudentData,
  };
  // ============================================
  // PROFILE FETCH EFFECT
  // ============================================
  useEffect(() => {
    const fetchProfile = async () => {
      console.log('👤 Fetching admin profile...');
      setIsLoadingProfile(true);
      try {
        const data = await getAdminProfile();
        console.log('✅ Admin profile loaded:', data);
        setProfile(data);
      } catch (error) {
        console.error('❌ Error loading admin profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, []);

  // Add update handler
  const handleProfileUpdate = (updatedProfile) => {
    setProfile(updatedProfile);
  };

  // ============================================
  // COMPUTED VALUES - Derived from React Query data
  // ============================================

  // Extract available months from fee data
  const availableMonths = useMemo(() => {
    if (!feePerMonthData || feePerMonthData.length === 0) return [];

    const uniqueMonths = Array.from(
      new Set(
        feePerMonthData
          .map(entry => entry.month)
          .filter(month => month && month !== "Unknown")
      )
    );

    return uniqueMonths.sort((a, b) => {
      const dateA = new Date(a + '-01');
      const dateB = new Date(b + '-01');
      return dateA - dateB;
    });
  }, [feePerMonthData]);

  // Set default month when months become available
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      const currentMonth = moment().format('YYYY-MM');
      const defaultMonth = availableMonths.includes(currentMonth)
        ? currentMonth
        : availableMonths[availableMonths.length - 1];
      setSelectedMonth(defaultMonth);
    }
  }, [availableMonths, selectedMonth]);

  // Process fee data for chart (top 3 schools, last 3 months)
  const feePerMonth = useMemo(() => {
    if (!feePerMonthData || feePerMonthData.length === 0 || schools.length === 0) return [];

    // Create school name mapping
    const schoolMap = schools.reduce((acc, school) => {
      acc[school.id] = school.name;
      return acc;
    }, {});

    // Get last 3 months from data
    const uniqueMonths = Array.from(new Set(feePerMonthData.map(entry => entry.month)))
      .filter(month => month && month !== "Unknown")
      .sort((a, b) => {
        const [monthA, yearA] = a.split('-');
        const [monthB, yearB] = b.split('-');
        if (yearA === yearB) {
          return new Date(`${monthA} 1, ${yearA}`) - new Date(`${monthB} 1, ${yearB}`);
        }
        return yearA - yearB;
      });

    const last3Months = uniqueMonths.slice(-3);

    // Aggregate total fees per school across all 3 months
    const schoolTotals = {};
    last3Months.forEach(month => {
      const monthData = feePerMonthData.filter(entry => entry.month === month);
      monthData.forEach(entry => {
        const schoolId = entry.school;
        const schoolName = schoolMap[schoolId] || `School ${schoolId}`;

        if (!schoolTotals[schoolName]) {
          schoolTotals[schoolName] = 0;
        }
        schoolTotals[schoolName] += entry.total_fee || 0;
      });
    });

    // Get top 3 schools by total fees
    const top3Schools = Object.entries(schoolTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name]) => name);

    // Build chart data structure
    return last3Months.map(month => {
      const monthEntry = { month };

      // Add data for each top 3 school
      top3Schools.forEach(schoolName => {
        const schoolData = feePerMonthData.find(
          entry =>
            entry.month === month &&
            (schoolMap[entry.school] === schoolName)
        );

        monthEntry[schoolName] = schoolData ? (schoolData.total_fee || 0) : 0;
      });

      return monthEntry;
    });
  }, [feePerMonthData, schools]);

  // ============================================
  // HANDLERS - Simple wrappers for React Query
  // ============================================

  // Handler for fetching student data when filter is applied
  const fetchStudentData = useCallback((filters) => {
    const { schoolId, className } = filters;

    if (!schoolId || !className) {
      toast.warning('Please select both school and class');
      return;
    }

    if (!selectedMonth) {
      toast.warning('Please select a month');
      return;
    }

    // Update filters to trigger React Query refetch
    setStudentDataFilters({ schoolId, className });
  }, [selectedMonth]);

  // ============================================
  // COMPUTED VALUES - Derived from React Query data
  // ============================================

  // Students per school chart data
  const studentsChartData = useMemo(() => {
    return studentsPerSchoolData.map(item => ({
      school: item.school || item.school_name || 'Unknown',
      count: item.total_students || item.student_count || 0,
    }));
  }, [studentsPerSchoolData]);

  // School names for fee chart
  const schoolNamesInChart = useMemo(() => {
    if (feePerMonth.length === 0) return [];
    const firstMonth = feePerMonth[0];
    return Object.keys(firstMonth).filter(key => key !== 'month');
  }, [feePerMonth]);

  // Fee totals for summary (use feeSummaryData from React Query)
  const feeTotals = useMemo(() => {
    return feeSummaryData.reduce(
      (acc, item) => ({
        total_fee: acc.total_fee + (item.total_fee || 0),
        paid_amount: acc.paid_amount + (item.paid_amount || 0),
        balance_due: acc.balance_due + (item.balance_due || 0),
      }),
      { total_fee: 0, paid_amount: 0, balance_due: 0 }
    );
  }, [feeSummaryData]);

  // Registration table data (use newRegistrationsData from React Query)
  const registrationTableData = useMemo(() => {
    return newRegistrationsData
      .map(reg => ({
        school: reg.school || 'Unknown',
        count: reg.count || 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [newRegistrationsData]);

  // ============================================
  // RENDER
  // ============================================

  // Page styles with glassmorphism
  const pageStyles = {
    pageContainer: {
      minHeight: '100vh',
      background: COLORS.background.gradient,
      padding: SPACING.xl,
    },
    chartContainer: {
      ...MIXINS.glassmorphicCard,
      padding: SPACING.lg,
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: SPACING.lg,
    },
    summaryBox: {
      ...MIXINS.glassmorphicSubtle,
      padding: SPACING.lg,
      borderRadius: BORDER_RADIUS.md,
      marginTop: SPACING.lg,
    },
    summaryTitle: {
      margin: '0 0 0.5rem 0',
      color: COLORS.accent.cyan,
      fontWeight: FONT_WEIGHTS.semibold,
    },
    summaryText: {
      margin: '0.25rem 0',
      color: COLORS.text.whiteMedium,
    },
    emptyState: {
      textAlign: 'center',
      color: COLORS.text.whiteSubtle,
      padding: SPACING.xl,
    },
    selectDropdown: {
      padding: SPACING.sm,
      ...MIXINS.glassmorphicSubtle,
      borderRadius: BORDER_RADIUS.sm,
      fontSize: FONT_SIZES.sm,
      fontFamily: 'Inter, sans-serif',
      color: COLORS.text.white,
      cursor: 'pointer',
    },
    optionStyle: {
      backgroundColor: '#1e1e2e',
      color: '#ffffff',
      padding: SPACING.sm,
    },
    monthSelectContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: SPACING.lg,
      marginBottom: SPACING.lg,
    },
    monthSelectLabel: {
      display: 'block',
      marginBottom: SPACING.sm,
      fontWeight: FONT_WEIGHTS.medium,
      color: COLORS.text.white,
    },
    monthSelectInput: {
      width: '100%',
      padding: SPACING.md,
      ...MIXINS.glassmorphicSubtle,
      borderRadius: BORDER_RADIUS.md,
      fontSize: FONT_SIZES.base,
      fontFamily: 'Inter, sans-serif',
      color: COLORS.text.white,
      cursor: 'pointer',
    },
    noDataContainer: {
      padding: SPACING['2xl'],
      textAlign: 'center',
      color: COLORS.text.whiteSubtle,
      ...MIXINS.glassmorphicSubtle,
      borderRadius: BORDER_RADIUS.md,
      marginTop: SPACING.lg,
      fontFamily: 'Inter, sans-serif',
    },
  };

  return (
    <div style={pageStyles.pageContainer}>
      <UnifiedProfileHeader
        role="Admin"
        profile={profile}
        loading={loading.profile}
        onProfileUpdate={handleProfileUpdate}
      />
      <div>

      {/* Login Activity Widget - Shows login counts per school */}
      <LoginActivityWidget />

      {/* Teacher Attendance Overview - Shows attendance rates for all teachers */}
      <CollapsibleSection
        title="Teacher Attendance"
        defaultOpen={false}
        icon="👨‍🏫"
      >
        <AdminTeacherAttendanceWidget />
      </CollapsibleSection>

      {/* Staff Command Center */}
      <CollapsibleSection
        title="Command Center"
        defaultOpen={true}
        icon="🤖"
      >
        {/* Chat + History Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.lg, marginBottom: SPACING.lg }}>
          <StaffCommandInput
            ref={commandInputRef}
            placeholder="Type a command... (e.g., 'Show inventory summary')"
            showQuickActions={false}
            height="350px"
            onCommandSuccess={() => {
              // Optionally refresh data after command execution
            }}
          />
          <CommandHistory
            limit={8}
            showFilters={true}
            compact={false}
            style={{ height: '350px' }}
          />
        </div>
        {/* Quick Actions Row */}
        <QuickActionsPanel
          onActionSelect={(action) => {
            if (commandInputRef.current) {
              if (action.required_params && action.required_params.length > 0) {
                // Set command template for user to fill in
                commandInputRef.current.setCommand(action.command_template);
              } else {
                // Execute directly
                commandInputRef.current.executeCommand(action.command_template);
              }
            }
          }}
        />
      </CollapsibleSection>

      {/* Students per School */}
      <CollapsibleSection
        title="Students per School"
        defaultOpen
        key={`students-${studentsPerSchoolData.length}`}
      >
        
        
        {loading.students ? (
          <LoadingSpinner size="medium" message="Loading students..." />
        ) : studentsChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={studentsChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
              <XAxis
                dataKey="school"
                tick={{ fontSize: 11, fill: '#FFFFFF' }}
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.3)' }}
                tickLine={{ stroke: 'rgba(255, 255, 255, 0.3)' }}
                angle={-35}
                textAnchor="end"
                height={90}
                interval={0}
                tickFormatter={(value) => {
                  return value.replace(/School|Campus|System/g, '').trim();
                }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#FFFFFF' }}
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.3)' }}
                tickLine={{ stroke: 'rgba(255, 255, 255, 0.3)' }}
                label={{ value: 'No of Students', angle: -90, position: 'insideLeft', fill: '#FFFFFF', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(30, 30, 46, 0.95)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: '#FFFFFF' }}
                labelStyle={{ color: '#FBBF24' }}
                itemStyle={{ color: '#FFFFFF' }}
              />

              <Bar
                dataKey="count"
                fill="#60A5FA"
                name="Students"
                radius={[4, 4, 4, 4]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={pageStyles.emptyState}>No student data available</p>
        )}
      </CollapsibleSection>

      {/* Fee Collection - Top 3 Schools (Last 3 Months) */}
      <CollapsibleSection title="Fee Collection - Top 3 Schools (Last 3 Months)" defaultOpen>
        {loading.fee ? (
          <LoadingSpinner size="medium" message="Loading fee data..." />
        ) : feePerMonth.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={feePerMonth} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#FFFFFF' }}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.3)' }}
                  tickLine={{ stroke: 'rgba(255, 255, 255, 0.3)' }}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#FFFFFF' }}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.3)' }}
                  tickLine={{ stroke: 'rgba(255, 255, 255, 0.3)' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => `PKR ${value.toLocaleString()}`}
                  contentStyle={{ backgroundColor: 'rgba(30, 30, 46, 0.95)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: '#FFFFFF' }}
                  labelStyle={{ color: '#FBBF24' }}
                  itemStyle={{ color: '#FFFFFF' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', color: '#FFFFFF' }} formatter={(value) => <span style={{ color: '#FFFFFF' }}>{value}</span>} />
                {schoolNamesInChart.map((schoolName, index) => (
                  <Bar
                    key={schoolName}
                    dataKey={schoolName}
                    fill={['#60A5FA', '#34D399', '#FBBF24'][index % 3]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>

            {/* Total Summary */}
            <div style={pageStyles.summaryBox}>
              <h4 style={pageStyles.summaryTitle}>3-Month Summary (Top 3 Schools):</h4>
              {schoolNamesInChart.map(schoolName => {
                const schoolTotal = feePerMonth.reduce((sum, month) => sum + (month[schoolName] || 0), 0);
                return (
                  <p key={schoolName} style={pageStyles.summaryText}>
                    <strong>{schoolName}:</strong> PKR {schoolTotal.toLocaleString()}
                  </p>
                );
              })}
            </div>
          </>
        ) : (
          <p style={pageStyles.emptyState}>No fee data available</p>
        )}
      </CollapsibleSection>

      {/* Fee Summary Table */}
      <CollapsibleSection
        title="Fee Summary for Selected Month"
        defaultOpen
        headerAction={
          <div onClick={(e) => e.stopPropagation()}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={pageStyles.selectDropdown}
            >
              {availableMonths.map(month => (
                <option key={month} value={month} style={pageStyles.optionStyle}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <DataTable
          data={feeSummaryData}
          loading={loading.feeSummary}
          columns={[
            { key: 'school_name', label: 'School', sortable: true },
            {
              key: 'total_fee',
              label: 'Total Fee',
              sortable: true,
              align: 'right',
              render: (value) => `PKR ${value.toLocaleString()}`
            },
            {
              key: 'paid_amount',
              label: 'Paid Amount',
              sortable: true,
              align: 'right',
              render: (value) => `PKR ${value.toLocaleString()}`
            },
            {
              key: 'balance_due',
              label: 'Balance Due',
              sortable: true,
              align: 'right',
              render: (value) => (
                <span style={{ color: value > 0 ? '#DC2626' : '#059669', fontWeight: '600' }}>
                  PKR {value.toLocaleString()}
                </span>
              )
            },
          ]}
          emptyMessage={`No fee data for ${selectedMonth}`}
          striped
          hoverable
        />

        {feeSummaryData.length > 0 && (
          <FinancialSummaryCard
            totalFee={feeTotals.total_fee}
            paidAmount={feeTotals.paid_amount}
            balanceDue={feeTotals.balance_due}
            loading={false}
            compact={true}
          />
        )}
      </CollapsibleSection>

      {/* New Registrations - LAZY LOADED */}
      <CollapsibleSection
        title="New Registrations by School"
        defaultOpen={false}
        onToggle={(isOpen) => {
          if (isOpen && !shouldFetchRegistrations) {
            setShouldFetchRegistrations(true);
          }
        }}
      >
        <DataTable
          data={registrationTableData}
          loading={loading.registrations}
          columns={[
            { key: 'school', label: 'School', sortable: true },
            { key: 'count', label: 'Number of Admissions', sortable: true, align: 'center' },
          ]}
          emptyMessage={loading.registrations ? "Loading..." : "No new registrations"}
          striped
          hoverable
        />
      </CollapsibleSection>

      {/* Student Data Reports */}
      <CollapsibleSection title="Student Data Reports" defaultOpen={false}>
        <div style={pageStyles.monthSelectContainer}>
          {/* Month Selector */}
          <div>
            <label style={pageStyles.monthSelectLabel}>
              Select Month for Student Data
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={pageStyles.monthSelectInput}
            >
              {availableMonths.map(month => (
                <option key={month} value={month} style={pageStyles.optionStyle}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>

        <FilterBar
          onFilter={fetchStudentData}
          showSchool
          showClass
          showMonth={false}
          submitButtonText="📊 Fetch Student Data"
        />

        {loading.studentData ? (
          <LoadingSpinner size="medium" message="Loading student data..." />
        ) : studentAttendance.length > 0 ? (
          <DataTable
            data={studentAttendance.map(attendance => {
              const topic = studentTopics.find(t => t.student_id === attendance.student_id) || { topics_achieved: 0 };
              const image = studentImages.find(i => i.student_id === attendance.student_id) || { images_uploaded: 0 };
              
              return {
                ...attendance,
                topics_achieved: topic.topics_achieved,
                images_uploaded: image.images_uploaded,
              };
            })}
            columns={[
              { key: 'student_id', label: 'ID', sortable: true, width: '80px' },
              { key: 'name', label: 'Name', sortable: true },
              { key: 'present', label: 'Present', sortable: true, align: 'center' },
              { key: 'absent', label: 'Absent', sortable: true, align: 'center' },
              { key: 'not_marked', label: 'Not Marked', sortable: true, align: 'center' },
              { key: 'topics_achieved', label: 'Topics', sortable: true, align: 'center' },
              { key: 'images_uploaded', label: 'Images', sortable: true, align: 'center' },
            ]}
            striped
            hoverable
            maxHeight="400px"
          />
        ) : (
          <div style={pageStyles.noDataContainer}>
            Select school and class to view student data
          </div>
        )}
      </CollapsibleSection>

      {/* Floating Action Button - Send Notification */}
      <FloatingNotificationButton 
        onClick={() => setIsNotificationModalOpen(true)}
      />

      {/* Send Notification Modal */}
      <SendNotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
    </div>
  </div>
  );
}

// ============================================
// FLOATING NOTIFICATION BUTTON - Mobile Responsive
// ============================================
const FloatingNotificationButton = ({ onClick }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      <button
        onClick={onClick}
        style={{
          ...fabStyles.container,
          ...(isMobile ? fabStyles.containerMobile : {}),
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = isMobile ? 'scale(1.1)' : 'scale(1.1) rotate(5deg)';
          e.currentTarget.style.boxShadow = '0 12px 28px rgba(124, 58, 237, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(124, 58, 237, 0.3)';
        }}
        title="Send Notification to Teachers"
        aria-label="Send Notification"
      >
        <div style={fabStyles.iconWrapper}>
          <svg style={fabStyles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2.5} 
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
            />
          </svg>
          <span style={fabStyles.pulse}></span>
        </div>
        {!isMobile && <span style={fabStyles.label}>Send Notification</span>}
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

// Styles for FAB
const fabStyles = {
  container: {
    position: 'fixed',
    bottom: SPACING['2xl'],
    right: SPACING['2xl'],
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    padding: `${SPACING.lg} ${SPACING.xl}`,
    backgroundColor: COLORS.primary,
    color: COLORS.background.white,
    border: 'none',
    borderRadius: '50px',
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: 'pointer',
    boxShadow: SHADOWS.xl,
    zIndex: 999,
    transition: `all ${TRANSITIONS.base} cubic-bezier(0.4, 0, 0.2, 1)`,
    animation: 'slideIn 0.5s ease-out',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  containerMobile: {
    width: '56px',
    height: '56px',
    padding: '0',
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    bottom: SPACING.xl,
    right: SPACING.xl,
  },
  iconWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: SPACING.xl,
    height: SPACING.xl,
    strokeWidth: 2.5,
  },
  pulse: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '8px',
    height: '8px',
    backgroundColor: COLORS.status.success,
    borderRadius: BORDER_RADIUS.full,
    border: `2px solid ${COLORS.background.white}`,
    animation: 'pulse 2s ease-in-out infinite',
  },
  label: {
    fontWeight: FONT_WEIGHTS.semibold,
    letterSpacing: '0.01em',
  },
};

export default AdminDashboard;