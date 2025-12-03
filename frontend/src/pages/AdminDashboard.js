// ============================================
// ADMIN DASHBOARD - Refactored Version (FIXED)
// With Send Notification Feature
// ============================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import moment from 'moment';
import { AdminHeader } from '../components/admin/AdminHeader';
import { CollapsibleSection } from '../components/common/cards/CollapsibleSection';
import { FilterBar } from '../components/common/filters/FilterBar';
import { DataTable } from '../components/common/tables/DataTable';
import { BarChartWrapper } from '../components/common/charts/BarChartWrapper';
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { useSchools } from '../hooks/useSchools';
import { SendNotificationModal } from '../components/admin/sendNotificationModal'; // ✅ NEW IMPORT
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

function AdminDashboard() {
  // State
  const [studentsPerSchool, setStudentsPerSchool] = useState([]);
  const [feePerMonth, setFeePerMonth] = useState([]);
  const [feeSummary, setFeeSummary] = useState([]);
  const [newRegistrations, setNewRegistrations] = useState([]);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [studentTopics, setStudentTopics] = useState([]);
  const [studentImages, setStudentImages] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableMonths, setAvailableMonths] = useState([]);
  
  // ✅ NEW: Notification Modal State
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  
  const [loading, setLoading] = useState({
    students: true,
    fee: true,
    registrations: true,
    feeSummary: false,
    studentData: false,
  });

  // Hooks
  const { schools } = useSchools();

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [studentsRes, feeRes, registrationsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/students-per-school/`, { headers: getAuthHeaders() }),
          axios.get(`${API_BASE_URL}/api/fee-per-month/`, { headers: getAuthHeaders() }),
          axios.get(`${API_BASE_URL}/api/new-registrations/`, { headers: getAuthHeaders() }),
        ]);

        console.log('📊 Fee per month raw data:', feeRes.data);

        // Students per school
        setStudentsPerSchool(studentsRes.data);

        // Fee per month - process for chart
        const processedFeeData = processFeeData(feeRes.data, schools);
        console.log('📊 Processed fee data:', processedFeeData);
        setFeePerMonth(processedFeeData);

        // Extract available months (in MMM-YYYY format)
        const uniqueMonths = Array.from(new Set(feeRes.data.map(entry => entry.month)))
          .filter(month => month && month !== "Unknown")
          .sort((a, b) => {
            const [monthA, yearA] = a.split('-');
            const [monthB, yearB] = b.split('-');
            if (yearA === yearB) {
              return new Date(`${monthA} 1, ${yearA}`) - new Date(`${monthB} 1, ${yearB}`);
            }
            return yearA - yearB;
          });
        
        console.log('📅 Available months:', uniqueMonths);
        setAvailableMonths(uniqueMonths);
        
        if (uniqueMonths.length > 0) {
          const recentMonth = uniqueMonths[uniqueMonths.length - 1];
          setSelectedMonth(recentMonth);
        }

        // New registrations
        setNewRegistrations(registrationsRes.data);

        setLoading({ students: false, fee: false, registrations: false });
      } catch (error) {
        console.error('❌ Error fetching initial data:', error);
        toast.error('Failed to fetch dashboard data');
        setLoading({ students: false, fee: false, registrations: false });
      }
    };

    fetchInitialData();
  }, [schools]);

  // Fetch fee summary when month changes
  useEffect(() => {
    const fetchFeeSummary = async () => {
      if (!selectedMonth) return;
      
      setLoading(prev => ({ ...prev, feeSummary: true }));
      try {
        console.log('📡 Fetching fee summary for month:', selectedMonth);
        const response = await axios.get(`${API_BASE_URL}/api/fee-summary/`, {
          params: { month: selectedMonth },
          headers: getAuthHeaders(),
        });
        console.log('✅ Fee summary response:', response.data);
        setFeeSummary(response.data);
      } catch (error) {
        console.error('❌ Error fetching fee summary:', error);
        toast.error('Failed to fetch fee summary');
      }
      setLoading(prev => ({ ...prev, feeSummary: false }));
    };

    fetchFeeSummary();
  }, [selectedMonth]);

  // ✅ FIX 1: Process fee data correctly for top 3 schools across 3 months
  const processFeeData = (data, schoolsList) => {
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
        const fee = Number(entry.total_fee) || 0;
        schoolTotals[schoolName] = (schoolTotals[schoolName] || 0) + fee;
      });
    });

    // Get top 3 schools by total fees
    const top3Schools = Object.entries(schoolTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([school]) => school);

    console.log('🏆 Top 3 schools:', top3Schools);

    // Build chart data with top 3 schools for each month
    const chartData = last3Months.map(month => {
      const monthData = data.filter(entry => entry.month === month);
      const row = { month };

      top3Schools.forEach(schoolName => {
        const schoolId = Object.keys(schoolMap).find(id => schoolMap[id] === schoolName);
        const schoolEntry = monthData.find(entry => entry.school === parseInt(schoolId));
        row[schoolName] = schoolEntry ? Number(schoolEntry.total_fee) || 0 : 0;
      });

      return row;
    });

    console.log('📊 Final chart data:', chartData);
    return chartData;
  };

  // Get all school names from chart data for legend
  const schoolNamesInChart = feePerMonth.length > 0 
    ? Object.keys(feePerMonth[0]).filter(key => key !== 'month') 
    : [];

  // ✅ FIX 2: Fetch student data with correct month format
  const fetchStudentData = async (filters) => {
    if (!filters.schoolId || !filters.className) {
      toast.error('Please select school and class');
      return;
    }

    setLoading(prev => ({ ...prev, studentData: true }));
    
   
      // ✅ Use selectedMonth directly (it's already in MMM-YYYY format)
      // ✅ NEW - Convert MMM-YYYY to YYYY-MM
    try {
      // Convert "Oct-2025" to "2025-10"
      const monthParam = moment(selectedMonth, 'MMM-YYYY').format('YYYY-MM');
      const params = `month=${monthParam}&school_id=${filters.schoolId}&student_class=${filters.className}`;

      console.log('📡 Fetching student data with params:', params);

      const [attendanceRes, topicsRes, imagesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/student-attendance-counts/?${params}`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/student-achieved-topics-count/?${params}`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/student-image-uploads-count/?${params}`, { headers: getAuthHeaders() }),
      ]);

      console.log('✅ Student data fetched successfully');
      setStudentAttendance(attendanceRes.data);
      setStudentTopics(topicsRes.data);
      setStudentImages(imagesRes.data);
    } catch (error) {
      console.error('❌ Error fetching student data:', error.response?.data || error);
      toast.error(`Failed to fetch student data: ${error.response?.data?.detail || error.message}`);
    }
    
    setLoading(prev => ({ ...prev, studentData: false }));
  };

  // Summarize registrations by school
  const registrationSummary = newRegistrations.reduce((acc, reg) => {
    const school = reg.school_name || 'Unknown';
    acc[school] = (acc[school] || 0) + 1;
    return acc;
  }, {});

  const registrationTableData = Object.entries(registrationSummary).map(([school, count]) => ({
    school,
    count,
  }));

  // Calculate totals for fee summary
  const feeTotals = feeSummary.reduce(
    (acc, entry) => ({
      total_fee: acc.total_fee + (Number(entry.total_fee) || 0),
      paid_amount: acc.paid_amount + (Number(entry.paid_amount) || 0),
      balance_due: acc.balance_due + (Number(entry.balance_due) || 0),
    }),
    { total_fee: 0, paid_amount: 0, balance_due: 0 }
  );

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', backgroundColor: '#F3F4F6', minHeight: '100vh' }}>
      {/* Header with Notification Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        padding: '1.5rem',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <div>
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '700', 
            color: '#1F2937',
            margin: 0,
          }}>
            📊 Admin Dashboard
          </h1>
          <p style={{ 
            fontSize: '0.875rem', 
            color: '#6B7280',
            margin: '0.25rem 0 0 0',
          }}>
            Welcome back! Here's what's happening today.
          </p>
        </div>

        {/* ✅ NEW: Send Notification Button */}
        <button
          onClick={() => setIsNotificationModalOpen(true)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#7C3AED',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.15s ease',
            boxShadow: '0 2px 4px rgba(124, 58, 237, 0.3)',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#6D28D9'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#7C3AED'}
        >
          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Send Notification
        </button>
      </div>

      {/* Students Per School Chart */}
      <CollapsibleSection title="Students Enrolled Per School">
        {loading.students ? (
          <LoadingSpinner size="medium" message="Loading students data..." />
        ) : (
          <>
            <BarChartWrapper
              data={studentsPerSchool}
              dataKey="total_students"
              xAxisKey="school"
              label="Students Distribution"
              height={350}
              showLegend={false}
              showGrid
              showLabels
              color="#3B82F6"
            />
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#EFF6FF', borderRadius: '8px' }}>
              <p style={{ margin: 0, color: '#1E40AF', fontWeight: '600' }}>
                Total Enrolled Students: {studentsPerSchool.reduce((sum, s) => sum + s.total_students, 0).toLocaleString()}
              </p>
            </div>
          </>
        )}
      </CollapsibleSection>

      {/* ✅ FIX 1: Fee Per Month Chart - Multi-Series for Top 3 Schools */}
      <CollapsibleSection title="Top 3 Schools - Fee Collection (Last 3 Months)">
        {loading.fee ? (
          <LoadingSpinner size="medium" message="Loading fee data..." />
        ) : feePerMonth.length > 0 && schoolNamesInChart.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={feePerMonth}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => `PKR ${value.toLocaleString()}`}
                />
                <Legend />
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

      {/* New Registrations */}
      <CollapsibleSection title="New Registrations by School">
        <DataTable
          data={registrationTableData}
          loading={loading.registrations}
          columns={[
            { key: 'school', label: 'School', sortable: true },
            { key: 'count', label: 'Number of Admissions', sortable: true, align: 'center' },
          ]}
          emptyMessage="No new registrations"
          striped
          hoverable
        />
      </CollapsibleSection>

      {/* Student Data Reports - With Month Selector */}
      <CollapsibleSection title="Student Data Reports">
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
          submitButtonText="Fetch Student Data"
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

      {/* ✅ NEW: Send Notification Modal */}
      <SendNotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
    </div>
  );
}

export default AdminDashboard;