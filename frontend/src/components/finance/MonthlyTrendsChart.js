// ============================================
// MONTHLY TRENDS CHART COMPONENT
// ============================================
// Location: src/components/finance/MonthlyTrendsChart.js

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { financeDashboardService } from '../../services/financeDashboardService';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { Button } from '../common/ui/Button';

export const MonthlyTrendsChart = ({ schools }) => {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('6months');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [customDates, setCustomDates] = useState({
    start: '',
    end: '',
  });
  const [showCustomModal, setShowCustomModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [period, selectedSchool]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let startDate = null;
      let endDate = null;

      if (period === 'custom') {
        if (!customDates.start || !customDates.end) {
          toast.error('Please select both start and end dates');
          setLoading(false);
          return;
        }
        startDate = customDates.start;
        endDate = customDates.end;
      }

      const response = await financeDashboardService.getMonthlyTrends(
        period,
        startDate,
        endDate,
        selectedSchool || null
      );

      setData(response.data.data);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching monthly trends:', error);
      toast.error('Failed to load monthly trends');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodClick = (newPeriod) => {
    if (newPeriod === 'custom') {
      setShowCustomModal(true);
    } else {
      setPeriod(newPeriod);
    }
  };

  const handleCustomDateApply = () => {
    setPeriod('custom');
    setShowCustomModal(false);
    fetchData();
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
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
            {payload[0].payload.month_label}
          </p>
          <p style={{ margin: '0 0 0.25rem 0', color: '#10B981', fontWeight: '500' }}>
            Income: PKR {payload[0].value.toLocaleString()}
          </p>
          <p style={{ margin: '0 0 0.25rem 0', color: '#EF4444', fontWeight: '500' }}>
            Expenses: PKR {payload[1].value.toLocaleString()}
          </p>
          <p style={{ margin: 0, color: '#3B82F6', fontWeight: '600' }}>
            Net: PKR {payload[2].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

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
        {/* Period Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button
            onClick={() => handlePeriodClick('3months')}
            variant={period === '3months' ? 'primary' : 'secondary'}
            size="small"
          >
            3 Months
          </Button>
          <Button
            onClick={() => handlePeriodClick('6months')}
            variant={period === '6months' ? 'primary' : 'secondary'}
            size="small"
          >
            6 Months
          </Button>
          <Button
            onClick={() => handlePeriodClick('custom')}
            variant={period === 'custom' ? 'primary' : 'secondary'}
            size="small"
          >
            Custom Range
          </Button>
        </div>

        {/* School Filter */}
        {schools && schools.length > 0 && (
          <div style={{ minWidth: '200px' }}>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}
            >
              <option value="">All Schools</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ECFDF5',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #A7F3D0',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#059669', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
              AVG MONTHLY INCOME
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669', margin: 0 }}>
              PKR {summary.avg_monthly_income.toLocaleString()}
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#FEF2F2',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #FECACA',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#DC2626', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
              AVG MONTHLY EXPENSE
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#DC2626', margin: 0 }}>
              PKR {summary.avg_monthly_expense.toLocaleString()}
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#EFF6FF',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #BFDBFE',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#1E40AF', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
              TOTAL NET
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1E40AF', margin: 0 }}>
              PKR {summary.total_net.toLocaleString()}
            </p>
          </div>

          {summary.best_month && (
            <div
              style={{
                backgroundColor: '#F0FDF4',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #BBF7D0',
              }}
            >
              <p style={{ fontSize: '0.75rem', color: '#15803D', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
                BEST MONTH
              </p>
              <p style={{ fontSize: '1rem', fontWeight: 'bold', color: '#15803D', margin: 0 }}>
                {summary.best_month.label}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#15803D', margin: 0 }}>
                PKR {summary.best_month.net.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <LoadingSpinner message="Loading trends..." />
        </div>
      ) : data.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            backgroundColor: '#F9FAFB',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
          }}
        >
          <p style={{ color: '#6B7280', margin: 0, fontSize: '1rem' }}>No data available for selected period</p>
        </div>
      ) : (
        <div style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month_label" stroke="#6B7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '1rem' }} />
              <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Income" />
              <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Expenses" />
              <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={3} name="Net" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Custom Date Modal */}
      {showCustomModal && (
        <div
          onClick={() => setShowCustomModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '400px',
              width: '90%',
            }}
          >
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>
              Select Custom Date Range
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem',
                }}
              >
                Start Date
              </label>
              <input
                type="date"
                value={customDates.start}
                onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem',
                }}
              >
                End Date
              </label>
              <input
                type="date"
                value={customDates.end}
                onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowCustomModal(false)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleCustomDateApply} variant="primary">
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};