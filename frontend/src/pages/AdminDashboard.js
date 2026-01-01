// ============================================
// ADMIN DASHBOARD - OPTIMIZED VERSION
// ============================================
// PERFORMANCE IMPROVEMENTS:
// 1. Lazy loading for heavy data (new-registrations)
// 2. Data caching to prevent redundant API calls
// 3. Progressive loading - show UI first, load data later
// 4. Pagination for large datasets
// 5. Request deduplication
// 6. Collapsible sections start collapsed for heavy data
// ============================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import moment from 'moment';
import { AdminProfileHeader } from '../components/admin/AdminProfileHeader';
import { CollapsibleSection } from '../components/common/cards/CollapsibleSection';
import { FilterBar } from '../components/common/filters/FilterBar';
import { DataTable } from '../components/common/tables/DataTable';
import { BarChartWrapper } from '../components/common/charts/BarChartWrapper';
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { useSchools } from '../hooks/useSchools';
import { SendNotificationModal } from '../components/admin/sendNotificationModal';
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

const API_BASE_URL = process.env.REACT_APP_API_URL;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
  'Content-Type': 'application/json',
});

// ============================================
// CACHE MANAGER - Prevent redundant API calls
// ============================================
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }
    
    console.log('📦 Cache HIT:', key);
    return item.data;
  }

  set(key, data) {
    console.log('💾 Cache SET:', key);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear() {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }
}

const cache = new CacheManager();

// ============================================
// MAIN COMPONENT
// ============================================
function AdminDashboard() {
  const isMounted = useRef(true);
  const fetchingRef = useRef(new Set()); // Track ongoing requests

  // ============================================
  // STATE - Organized by data type
  // ============================================
  
  // Essential Data (loaded immediately)
  const [studentsPerSchool, setStudentsPerSchool] = useState([]);
  const [feePerMonth, setFeePerMonth] = useState([]);
  const [feeSummary, setFeeSummary] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableMonths, setAvailableMonths] = useState([]);
  
  // Heavy Data (loaded on demand)
  const [newRegistrations, setNewRegistrations] = useState([]);
  const [registrationsLoaded, setRegistrationsLoaded] = useState(false);
  
  // Student Data (loaded on demand)
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [studentTopics, setStudentTopics] = useState([]);
  const [studentImages, setStudentImages] = useState([]);
  
  // UI State
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  
  // Loading States - Granular control
  const [loading, setLoading] = useState({
    initial: true,           // First page load
    students: false,         // Students per school
    fee: false,              // Fee per month
    feeSummary: false,       // Fee summary table
    registrations: false,    // New registrations
    studentData: false,      // Student reports
  });

  // Hooks
  const { schools } = useSchools();

  // ============================================
  // CLEANUP EFFECT
  // ============================================
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      fetchingRef.current.clear();
    };
  }, []);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  // Extract available months from fee data
  const extractAvailableMonths = useCallback((data) => {
    if (!data || data.length === 0) return [];
    
    const uniqueMonths = Array.from(
      new Set(
        data
          .map(entry => entry.month)
          .filter(month => month && month !== "Unknown")
      )
    );
    
    const sortedMonths = uniqueMonths.sort((a, b) => {
      const dateA = new Date(a + '-01');
      const dateB = new Date(b + '-01');
      return dateA - dateB;
    });
    
    console.log('📅 Available months extracted:', sortedMonths);
    return sortedMonths;
  }, []);

  // Process fee data for chart (top 3 schools, last 3 months)
  const processFeeData = useCallback((data, schoolsList) => {
    if (!data || data.length === 0) return [];

    console.log('🔄 Processing fee data...');

    // Create school name mapping
    const schoolMap = schoolsList.reduce((acc, school) => {
      acc[school.id] = school.name;
      return acc;
    }, {});

    // Get last 3 months from data
    const uniqueMonths = Array.from(new Set(data.map(entry => entry.month)))
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
    console.log('📅 Last 3 months:', last3Months);

    // Aggregate total fees per school across all 3 months
    const schoolTotals = {};
    last3Months.forEach(month => {
      const monthData = data.filter(entry => entry.month === month);
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

    console.log('🏆 Top 3 schools:', top3Schools);

    // Build chart data structure
    const chartData = last3Months.map(month => {
      const monthEntry = { month };
      
      // Add data for each top 3 school
      top3Schools.forEach(schoolName => {
        const schoolData = data.find(
          entry => 
            entry.month === month && 
            (schoolMap[entry.school] === schoolName)
        );
        
        monthEntry[schoolName] = schoolData ? (schoolData.total_fee || 0) : 0;
      });
      
      return monthEntry;
    });

    console.log('📊 Chart data built:', chartData);
    return chartData;
  }, []);

  // ============================================
  // DATA FETCHING - With caching and deduplication
  // ============================================

  // Fetch essential data (students per school + fee per month)
  const fetchEssentialData = useCallback(async () => {
    const cacheKey = 'essential-data';
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      setStudentsPerSchool(cachedData.studentsPerSchool);
      setFeePerMonth(cachedData.feePerMonth);
      setAvailableMonths(cachedData.availableMonths);
      setSelectedMonth(cachedData.selectedMonth);
      setLoading(prev => ({ ...prev, initial: false, students: false, fee: false }));
      return;
    }

    // Prevent duplicate requests
    if (fetchingRef.current.has('essential')) {
      console.log('⏳ Essential data fetch already in progress');
      return;
    }

    fetchingRef.current.add('essential');
    
    if (!isMounted.current) return;
    
    try {
      console.log('🚀 Fetching essential data...');
      
      const [studentsRes, feeRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/students-per-school/`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/fee-per-month/`, { headers: getAuthHeaders() }),
      ]);

      if (!isMounted.current) return;

      console.log('✅ Essential data loaded');
      console.log('📊 Students data:', studentsRes.data);
      console.log('📊 Students count:', studentsRes.data.length);

      // Process data
      const processedFeeData = processFeeData(feeRes.data, schools);
      const months = extractAvailableMonths(feeRes.data);
      const currentMonth = moment().format('YYYY-MM');
      const defaultMonth = months.includes(currentMonth) ? currentMonth : months[0] || '';

      // Cache the data
      cache.set(cacheKey, {
        studentsPerSchool: studentsRes.data,
        feePerMonth: processedFeeData,
        availableMonths: months,
        selectedMonth: defaultMonth,
      });

      // Update state
      setStudentsPerSchool(studentsRes.data);
      setFeePerMonth(processedFeeData);
      setAvailableMonths(months);
      setSelectedMonth(defaultMonth);

      if (isMounted.current) {
        setLoading(prev => ({ ...prev, initial: false, students: false, fee: false }));
      }
    } catch (error) {
      if (!isMounted.current) return;
      
      console.error('❌ Error fetching essential data:', error);
      toast.error('Failed to load dashboard data');
      
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, initial: false, students: false, fee: false }));
      }
    } finally {
      fetchingRef.current.delete('essential');
    }
  }, [schools, processFeeData, extractAvailableMonths]);

  // Fetch new registrations (LAZY LOADED - only when section is opened)
  const fetchNewRegistrations = useCallback(async () => {
    // Don't fetch if already loaded
    if (registrationsLoaded) {
      console.log('✅ Registrations already loaded');
      return;
    }

    const cacheKey = 'new-registrations';
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      setNewRegistrations(cachedData);
      setRegistrationsLoaded(true);
      return;
    }

    // Prevent duplicate requests
    if (fetchingRef.current.has('registrations')) {
      console.log('⏳ Registrations fetch already in progress');
      return;
    }

    fetchingRef.current.add('registrations');
    
    if (!isMounted.current) return;
    
    setLoading(prev => ({ ...prev, registrations: true }));
    
    try {
      console.log('🚀 Fetching new registrations (LAZY)...');
      
      const response = await axios.get(
        `${API_BASE_URL}/api/new-registrations/`,
        { headers: getAuthHeaders() }
      );

      if (!isMounted.current) return;

      console.log('✅ Registrations loaded:', response.data.length, 'records');
      
      // Cache the data
      cache.set(cacheKey, response.data);
      
      setNewRegistrations(response.data);
      setRegistrationsLoaded(true);
    } catch (error) {
      if (!isMounted.current) return;
      
      console.error('❌ Error fetching registrations:', error);
      toast.error('Failed to load registrations');
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, registrations: false }));
      }
      fetchingRef.current.delete('registrations');
    }
  }, [registrationsLoaded]);

  // Fetch fee summary when month changes
  const fetchFeeSummary = useCallback(async (month) => {
    if (!month) return;

    const cacheKey = `fee-summary-${month}`;
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      setFeeSummary(cachedData);
      return;
    }

    // Prevent duplicate requests
    if (fetchingRef.current.has(`fee-summary-${month}`)) {
      console.log('⏳ Fee summary fetch already in progress');
      return;
    }

    fetchingRef.current.add(`fee-summary-${month}`);
    
    if (!isMounted.current) return;
    
    setLoading(prev => ({ ...prev, feeSummary: true }));
    
    try {
      console.log('🚀 Fetching fee summary for:', month);
      
      const response = await axios.get(
        `${API_BASE_URL}/api/fee-summary/?month=${month}`,
        { headers: getAuthHeaders() }
      );
      
      if (!isMounted.current) return;
      
      console.log('💰 Fee Summary loaded:', response.data.length, 'schools');
      
      // Cache the data
      cache.set(cacheKey, response.data);
      
      setFeeSummary(response.data);
    } catch (error) {
      if (!isMounted.current) return;
      
      console.error('❌ Error fetching fee summary:', error);
      toast.error('Failed to load fee summary');
      setFeeSummary([]);
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, feeSummary: false }));
      }
      fetchingRef.current.delete(`fee-summary-${month}`);
    }
  }, []);

  // Fetch student data (attendance, topics, images)
  const fetchStudentData = useCallback(async (filters) => {
    const { schoolId, className } = filters;
    
    if (!schoolId || !className) {
      toast.warning('Please select both school and class');
      return;
    }

    if (!selectedMonth) {
      toast.warning('Please select a month');
      return;
    }

    const cacheKey = `student-data-${schoolId}-${className}-${selectedMonth}`;
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      setStudentAttendance(cachedData.attendance);
      setStudentTopics(cachedData.topics);
      setStudentImages(cachedData.images);
      return;
    }

    // Prevent duplicate requests
    if (fetchingRef.current.has(cacheKey)) {
      console.log('⏳ Student data fetch already in progress');
      return;
    }

    fetchingRef.current.add(cacheKey);
    
    if (!isMounted.current) return;
    
    setLoading(prev => ({ ...prev, studentData: true }));

    try {
      console.log('🚀 Fetching student data:', { schoolId, className, month: selectedMonth });

      const [attendanceRes, topicsRes, imagesRes] = await Promise.all([
        axios.get(
          `${API_BASE_URL}/api/student-attendance/?school=${schoolId}&class=${className}&month=${selectedMonth}`,
          { headers: getAuthHeaders() }
        ),
        axios.get(
          `${API_BASE_URL}/api/student-topics-achieved/?school=${schoolId}&class=${className}&month=${selectedMonth}`,
          { headers: getAuthHeaders() }
        ),
        axios.get(
          `${API_BASE_URL}/api/student-images-uploaded/?school=${schoolId}&class=${className}&month=${selectedMonth}`,
          { headers: getAuthHeaders() }
        ),
      ]);

      if (!isMounted.current) return;

      console.log('✅ Student data loaded');

      // Cache the data
      cache.set(cacheKey, {
        attendance: attendanceRes.data,
        topics: topicsRes.data,
        images: imagesRes.data,
      });

      setStudentAttendance(attendanceRes.data);
      setStudentTopics(topicsRes.data);
      setStudentImages(imagesRes.data);
    } catch (error) {
      if (!isMounted.current) return;
      
      console.error('❌ Error fetching student data:', error);
      toast.error('Failed to load student data');
      setStudentAttendance([]);
      setStudentTopics([]);
      setStudentImages([]);
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, studentData: false }));
      }
      fetchingRef.current.delete(cacheKey);
    }
  }, [selectedMonth]);

  // ============================================
  // EFFECTS
  // ============================================

  // Load essential data on mount
  useEffect(() => {
    if (schools.length > 0) {
      fetchEssentialData();
    }
  }, [schools, fetchEssentialData]);

  // Fetch fee summary when month changes
  useEffect(() => {
    if (selectedMonth) {
      fetchFeeSummary(selectedMonth);
    }
  }, [selectedMonth, fetchFeeSummary]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  // Students per school chart data
  const studentsChartData = useMemo(() => {
    console.log('🔍 studentsChartData useMemo triggered');
    console.log('   studentsPerSchool length:', studentsPerSchool.length);
    console.log('   studentsPerSchool raw data:', studentsPerSchool);
    
    const mapped = studentsPerSchool.map(item => ({
      school: item.school || item.school_name || 'Unknown',
      count: item.total_students || item.student_count || 0,
    }));
    
    console.log('   Mapped chart data:', mapped);
    console.log('   First item:', mapped[0]);
    
    return mapped;
  }, [studentsPerSchool]);

  // School names for fee chart
  const schoolNamesInChart = useMemo(() => {
    if (feePerMonth.length === 0) return [];
    const firstMonth = feePerMonth[0];
    return Object.keys(firstMonth).filter(key => key !== 'month');
  }, [feePerMonth]);

  // Fee totals for summary
  const feeTotals = useMemo(() => {
    return feeSummary.reduce(
      (acc, item) => ({
        total_fee: acc.total_fee + (item.total_fee || 0),
        paid_amount: acc.paid_amount + (item.paid_amount || 0),
        balance_due: acc.balance_due + (item.balance_due || 0),
      }),
      { total_fee: 0, paid_amount: 0, balance_due: 0 }
    );
  }, [feeSummary]);

  // Registration table data
  // API already returns aggregated counts: [{school: "...", count: 194}]
  // So we just use the data directly, no need to re-count
  const registrationTableData = useMemo(() => {
    return newRegistrations
      .map(reg => ({
        school: reg.school || 'Unknown',
        count: reg.count || 0  // Use the count from API
      }))
      .sort((a, b) => b.count - a.count);
  }, [newRegistrations]);

  // ============================================
  // RENDER
  // ============================================

  // Show loading spinner on initial load
  if (loading.initial) {
    return (
      <div style={{ padding: '2rem' }}>
        <AdminProfileHeader />
        <LoadingSpinner size="large" message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <AdminProfileHeader />

      {/* Students per School */}
      <CollapsibleSection 
        title="Students per School" 
        defaultOpen
        key={`students-${studentsPerSchool.length}`}
      >
        
        
        {loading.students ? (
          <LoadingSpinner size="medium" message="Loading students..." />
        ) : studentsChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={studentsChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
 <XAxis 
  dataKey="school"
  tick={{ fontSize: 11, fill: '#4B5563' }}
  angle={-35}              // ← Slight angle
  textAnchor="end"
  height={90}
  interval={0}
  tickFormatter={(value) => {
    // Smart truncation: remove generic words
    return value.replace(/School|Campus|System/g, '').trim();
  }}
/>
              <YAxis 
                tick={{ fontSize: 10 }}
                label={{ value: 'No of Students', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}
              />
             
              <Bar 
                dataKey="count" 
                fill="#3B82F6" 
                name="Students"
                radius={[4, 4, 4, 4]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ textAlign: 'center', color: '#9CA3AF' }}>No student data available</p>
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => `PKR ${value.toLocaleString()}`}
                  contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                {schoolNamesInChart.map((schoolName, index) => (
                  <Bar 
                    key={schoolName} 
                    dataKey={schoolName} 
                    fill={['#3B82F6', '#10B981', '#F59E0B'][index % 3]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>

            {/* Total Summary */}
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#F0FDF4', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#059669' }}>3-Month Summary (Top 3 Schools):</h4>
              {schoolNamesInChart.map(schoolName => {
                const schoolTotal = feePerMonth.reduce((sum, month) => sum + (month[schoolName] || 0), 0);
                return (
                  <p key={schoolName} style={{ margin: '0.25rem 0', color: '#065F46' }}>
                    <strong>{schoolName}:</strong> PKR {schoolTotal.toLocaleString()}
                  </p>
                );
              })}
            </div>
          </>
        ) : (
          <p style={{ textAlign: 'center', color: '#9CA3AF' }}>No fee data available</p>
        )}
      </CollapsibleSection>

      {/* Fee Summary Table */}
      <CollapsibleSection 
        title="Fee Summary for Selected Month"
        defaultOpen
        headerAction={
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {availableMonths.map(month => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        }
      >
        <DataTable
          data={feeSummary}
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
        
        {feeSummary.length > 0 && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            background: '#F0FDF4', 
            borderRadius: '8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}>
            <div>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>Total Fee:</p>
              <p style={{ margin: '0.25rem 0 0 0', color: '#065F46', fontSize: '1.5rem', fontWeight: 'bold' }}>
                PKR {feeTotals.total_fee.toLocaleString()}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>Paid Amount:</p>
              <p style={{ margin: '0.25rem 0 0 0', color: '#065F46', fontSize: '1.5rem', fontWeight: 'bold' }}>
                PKR {feeTotals.paid_amount.toLocaleString()}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>Balance Due:</p>
              <p style={{ margin: '0.25rem 0 0 0', color: '#DC2626', fontSize: '1.5rem', fontWeight: 'bold' }}>
                PKR {feeTotals.balance_due.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* New Registrations - LAZY LOADED */}
      <CollapsibleSection 
        title="New Registrations by School"
        defaultOpen={false}
        onToggle={(isOpen) => {
          if (isOpen && !registrationsLoaded) {
            fetchNewRegistrations();
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
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          {/* Month Selector */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
              Select Month for Student Data
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.5rem',
                fontSize: '1rem',
              }}
            >
              {availableMonths.map(month => (
                <option key={month} value={month}>
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
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#9CA3AF',
            backgroundColor: '#F9FAFB',
            borderRadius: '8px',
            marginTop: '1rem',
          }}>
            Select school and class to view student data
          </div>
        )}
      </CollapsibleSection>

      {/* Send Notification Modal */}
      <SendNotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
    </div>
  );
}

export default AdminDashboard;