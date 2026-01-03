// ============================================
// STUDENT DASHBOARD - FIXED VERSION
// Separate loading states for dashboard data and profile
// ============================================

import React, { useEffect, useState } from "react";
import axios from "axios";
import { UnifiedProfileHeader } from '../components/common/UnifiedProfileHeader';
import { getCompleteStudentProfile } from '../services/studentService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
  'Content-Type': 'application/json',
});

const StudentDashboard = () => {
  // Dashboard data states
  const [data, setData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true); // ← RENAMED
  const [error, setError] = useState(null);
  
  // Profile states (separate!)
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true); // ← SEPARATE

  // Fetch dashboard data (fees, attendance, etc.)
  useEffect(() => {
    console.log('📊 Fetching dashboard data...');
    setDashboardLoading(true);
    
    axios.get(`${API_URL}/api/students/my-data/`, { headers: getAuthHeaders() })
      .then((res) => {
        console.log('✅ Dashboard data loaded:', res.data);
        setData(res.data);
        setDashboardLoading(false);
      })
      .catch((err) => {
        console.error('❌ Dashboard data error:', err);
        setError("Failed to load data");
        setDashboardLoading(false);
      });
  }, []); // ← Empty array: fetch once

  // Fetch profile data (for header)
  useEffect(() => {
    const fetchProfile = async () => {
      console.log('👤 Fetching profile...');
      setProfileLoading(true);
      try {
        const data = await getCompleteStudentProfile();
        console.log('✅ Profile loaded:', data);
        setProfile(data);
      } catch (error) {
        console.error('❌ Profile error:', error);
      } finally {
        setProfileLoading(false);
      }
    };
    
    fetchProfile();
  }, []); // ← Empty array: fetch once

  // Handle profile updates (from settings modal)
  const handleProfileUpdate = (updatedProfile) => {
    console.log('📝 Updating profile:', updatedProfile);
    // ✅ CORRECT: Just merge, don't re-fetch
    setProfile(prev => ({ ...prev, ...updatedProfile }));
  };

  // Show loading if either is still loading
  const isLoading = dashboardLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <UnifiedProfileHeader
          role="Student"
          profile={profile}
          loading={profileLoading} // ← Use profile loading only
          onProfileUpdate={handleProfileUpdate}
        />
        <div className="text-center py-8">Loading dashboard...</div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="p-6">
        <UnifiedProfileHeader
          role="Student"
          profile={profile}
          loading={profileLoading}
          onProfileUpdate={handleProfileUpdate}
        />
        <div className="text-red-500 text-center py-8">{error || "No data"}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Profile Header */}
      <UnifiedProfileHeader
        role="Student"
        profile={profile}
        loading={profileLoading} // ← Use profile loading only
        onProfileUpdate={handleProfileUpdate}
      />

      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-blue-50 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">School</h2>
          <p className="text-2xl">{data.school}</p>
        </div>
        <div className="p-6 bg-green-50 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Class</h2>
          <p className="text-2xl">{data.class}</p>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="space-y-6">
        {/* Recent Fees Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Recent Fees (Last 10)</h2>
          <div className="overflow-x-auto">
            <table className="w-full bg-white border rounded shadow">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 text-left">Month</th>
                  <th className="p-3 text-left">Balance Due</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.fees && data.fees.length > 0 ? (
                  data.fees.map((fee, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3">{fee.month}</td>
                      <td className="p-3 font-bold">PKR {fee.balance_due}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-sm ${
                          fee.status === 'Paid' ? 'bg-green-200' : 'bg-red-200'
                        }`}>
                          {fee.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="p-6 text-center text-gray-500">
                      No fee records available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Attendance Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Recent Attendance (Last 30)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.attendance && data.attendance.length > 0 ? (
              data.attendance.map((att, i) => (
                <div key={i} className={`p-4 rounded shadow text-center ${
                  att.status === 'Present' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <p className="font-bold">{att.session_date}</p>
                  <p>{att.status}</p>
                </div>
              ))
            ) : (
              <div className="col-span-full p-6 text-center text-gray-500 bg-gray-50 rounded">
                No attendance records available
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default StudentDashboard;