// ============================================
// ACCOUNT BALANCE SELECTOR - FINAL FIX
// Uses account_name as identifier since accounts have no ID field
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL, getAuthHeaders } from '../../api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { ChartSkeleton, ChartEmptyState } from './ChartStates';
import { Button } from '../common/ui/Button';
import {
  SERIES_COLORS,
  AREA_GRADIENT_TOP_OPACITY,
  getAxisProps,
  getGridProps,
  getChartTheme,
  formatCompact,
  useChartHeight,
} from '../../utils/chartTheme';

// Mock data generator
const generateMockAccountHistory = (accountName, months = 6) => {
  const data = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  let balance = Math.floor(Math.random() * 200000) + 100000;
  
  for (let i = months - 1; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    const year = currentMonth - i < 0 ? currentYear - 1 : currentYear;
    balance += Math.floor(Math.random() * 100000) - 40000;
    
    data.push({
      date: `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`,
      label: `${monthNames[monthIndex]} ${year}`,
      balance: Math.max(balance, 0),
    });
  }
  
  return data;
};

export const AccountBalanceSelector = ({ accounts }) => {
  const chartHeight = useChartHeight();
  // Use account_name as identifier instead of ID
  const [selectedAccountName, setSelectedAccountName] = useState('');
  const [timeframe, setTimeframe] = useState('monthly');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);

  // Set first account as default
  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccountName) {
      const firstName = accounts[0].account_name;
      console.log('Setting default account by name:', firstName);
      setSelectedAccountName(firstName);
    }
  }, [accounts, selectedAccountName]);

  // Fetch/generate data when account or timeframe changes
  useEffect(() => {
    if (selectedAccountName) {
      console.log('Fetching data for account:', selectedAccountName);
      fetchData();
    }
  }, [selectedAccountName, timeframe]);

  const fetchData = async () => {
    if (!selectedAccountName) return;

    const account = accounts.find(acc => acc.account_name === selectedAccountName);
    if (!account) {
      console.error('Account not found:', selectedAccountName);
      return;
    }

    console.log('Found account:', account);
    setLoading(true);

    try {
      const fullUrl = `${API_URL}/api/dashboard/account-balance-history/`;
      console.log('Calling API:', fullUrl);
      console.log('Params:', { account_name: selectedAccountName, timeframe, months: 6 });
      
      const response = await axios.get(fullUrl, {
        headers: getAuthHeaders(),
        params: {
          account_name: selectedAccountName,
          timeframe: timeframe,
          months: 6,
        },
      });

      console.log('Backend response:', response.data);
      
      if (response.data.data && response.data.data.length > 0) {
        setData(response.data.data);
        setBackendAvailable(true);
        console.log('Using real backend data');
      } else {
        throw new Error('No data returned');
      }
    } catch (error) {
      console.error('API Error:', error.response?.status, error.response?.data || error.message);
      console.log('Using mock data for:', selectedAccountName);
      
      // Generate mock data
      const mockData = generateMockAccountHistory(selectedAccountName, 6);
      setData(mockData);
      setBackendAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  // Get selected account info by name
  const selectedAccountInfo = useMemo(() => {
    return accounts.find(acc => acc.account_name === selectedAccountName);
  }, [accounts, selectedAccountName]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (data.length < 2) return { change: 0, percentage: 0, data_points: data.length };
    
    const first = data[0].balance;
    const last = data[data.length - 1].balance;
    const change = last - first;
    const percentage = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
    
    return {
      change,
      percentage,
      data_points: data.length,
    };
  }, [data]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div
          style={{
            backgroundColor: 'white',
            padding: '1rem',
            border: '1px solid #D1D5DB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#374151' }}>
            {dataPoint.label}
          </p>
          <p style={{ margin: 0, color: '#059669', fontWeight: '600' }}>
            Balance: PKR {dataPoint.balance.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!accounts || accounts.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
        <p style={{ color: '#6B7280', margin: 0 }}>No accounts available</p>
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Account Selector */}
        <div style={{ flex: 1, minWidth: '250px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem',
            }}
          >
            Select Account
          </label>
          <select
            value={selectedAccountName}
            onChange={(e) => {
              console.log('Account changed to:', e.target.value);
              setSelectedAccountName(e.target.value);
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
          >
            {accounts.map((acc, index) => (
              <option key={index} value={acc.account_name}>
                {acc.account_name} (PKR {acc.current_balance.toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        {/* Timeframe Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            onClick={() => setTimeframe('monthly')}
            variant={timeframe === 'monthly' ? 'primary' : 'secondary'}
            size="small"
            disabled={loading}
          >
            Monthly
          </Button>
          <Button
            onClick={() => setTimeframe('weekly')}
            variant={timeframe === 'weekly' ? 'primary' : 'secondary'}
            size="small"
            disabled={loading}
          >
            Weekly
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {selectedAccountInfo && data.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Current Balance */}
          <div style={{ backgroundColor: '#EFF6FF', padding: '1rem', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
            <p style={{ fontSize: '0.75rem', color: '#1E40AF', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
              CURRENT BALANCE
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1E40AF', margin: 0 }}>
              PKR {selectedAccountInfo.current_balance.toLocaleString()}
            </p>
          </div>

          {/* Balance Change */}
          <div
            style={{
              backgroundColor: statistics.change >= 0 ? '#ECFDF5' : '#FEF2F2',
              padding: '1rem',
              borderRadius: '8px',
              border: `1px solid ${statistics.change >= 0 ? '#A7F3D0' : '#FECACA'}`,
            }}
          >
            <p style={{ fontSize: '0.75rem', color: statistics.change >= 0 ? '#059669' : '#DC2626', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
              CHANGE
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: statistics.change >= 0 ? '#059669' : '#DC2626', margin: 0 }}>
              {statistics.change >= 0 ? '+' : ''}PKR {Math.round(statistics.change).toLocaleString()}
            </p>
          </div>

          {/* Percentage Change */}
          <div
            style={{
              backgroundColor: statistics.percentage >= 0 ? '#ECFDF5' : '#FEF2F2',
              padding: '1rem',
              borderRadius: '8px',
              border: `1px solid ${statistics.percentage >= 0 ? '#A7F3D0' : '#FECACA'}`,
            }}
          >
            <p style={{ fontSize: '0.75rem', color: statistics.percentage >= 0 ? '#059669' : '#DC2626', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
              % CHANGE
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: statistics.percentage >= 0 ? '#059669' : '#DC2626', margin: 0 }}>
              {statistics.percentage >= 0 ? '+' : ''}
              {statistics.percentage.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <ChartSkeleton variant="light" />
      ) : data.length === 0 ? (
        <ChartEmptyState variant="light" title={`No history for ${selectedAccountInfo?.account_name || 'this account'}`} hint="Transactions will appear here once this account has activity." />
      ) : (
        <div style={{ height: `${chartHeight}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SERIES_COLORS.balance} stopOpacity={AREA_GRADIENT_TOP_OPACITY} />
                  <stop offset="95%" stopColor={SERIES_COLORS.balance} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid {...getGridProps('light')} />
              <XAxis dataKey="label" {...getAxisProps('light')} />
              <YAxis width={56} {...getAxisProps('light')} tickFormatter={formatCompact} />
              <ReferenceLine y={0} stroke={getChartTheme('light').zeroLine} strokeWidth={1.5} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '1rem' }} formatter={() => selectedAccountInfo?.account_name} />
              <Area
                type="monotone"
                dataKey="balance"
                stroke={SERIES_COLORS.balance}
                strokeWidth={3}
                fill="url(#colorBalance)"
                dot={{ r: 4, fill: SERIES_COLORS.balance, stroke: '#fff', strokeWidth: 1.5 }}
                activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }}
                name="Balance"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Info */}
      {data.length > 0 && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: backendAvailable ? '#EFF6FF' : '#FEF3C7',
            borderRadius: '8px',
            border: `1px solid ${backendAvailable ? '#BFDBFE' : '#FCD34D'}`,
          }}
        >
          <p style={{ fontSize: '0.875rem', color: backendAvailable ? '#1E40AF' : '#92400E', margin: 0 }}>
            {backendAvailable ? '📊' : '⚠️'} Showing {statistics.data_points} data points for{' '}
            <strong>{selectedAccountInfo?.account_name}</strong> ({timeframe === 'monthly' ? 'Monthly' : 'Weekly'} view)
            {!backendAvailable && ' - Using sample data'}
          </p>
        </div>
      )}
    </div>
  );
};