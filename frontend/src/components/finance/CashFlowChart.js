// ============================================
// CASH FLOW CHART COMPONENT
// ============================================
// Location: src/components/finance/CashFlowChart.js

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { financeDashboardService } from '../../services/financeDashboardService';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';

export const CashFlowChart = ({ schools }) => {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [months, setMonths] = useState(6);
  const [selectedSchool, setSelectedSchool] = useState('');

  useEffect(() => {
    fetchData();
  }, [months, selectedSchool]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await financeDashboardService.getCashFlow(
        months,
        selectedSchool || null
      );

      setData(response.data.data);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching cash flow:', error);
      toast.error('Failed to load cash flow data');
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
            {data.month_label}
          </p>
          <p style={{ margin: '0 0 0.25rem 0', color: '#6B7280', fontSize: '0.875rem' }}>
            Opening: PKR {data.opening_balance.toLocaleString()}
          </p>
          <p style={{ margin: '0 0 0.25rem 0', color: '#10B981', fontSize: '0.875rem' }}>
            Inflow: +PKR {data.inflow.toLocaleString()}
          </p>
          <p style={{ margin: '0 0 0.25rem 0', color: '#EF4444', fontSize: '0.875rem' }}>
            Outflow: -PKR {data.outflow.toLocaleString()}
          </p>
          <p style={{ margin: '0 0 0.25rem 0', color: '#3B82F6', fontWeight: '600' }}>
            Net Flow: PKR {data.net_flow.toLocaleString()}
          </p>
          <p style={{ margin: 0, color: '#1F2937', fontWeight: '600', paddingTop: '0.25rem', borderTop: '1px solid #E5E7EB' }}>
            Closing: PKR {data.closing_balance.toLocaleString()}
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
        {/* Months Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>
            Months:
          </label>
          <select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value))}
            style={{
              padding: '0.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
            }}
          >
            <option value={3}>3 Months</option>
            <option value={6}>6 Months</option>
            <option value={12}>12 Months</option>
          </select>
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
              TOTAL INFLOW
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#059669', margin: 0 }}>
              PKR {summary.total_inflow.toLocaleString()}
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
              TOTAL OUTFLOW
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#DC2626', margin: 0 }}>
              PKR {summary.total_outflow.toLocaleString()}
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
              NET CASH FLOW
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1E40AF', margin: 0 }}>
              PKR {summary.net_cash_flow.toLocaleString()}
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#F5F3FF',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #DDD6FE',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#7C3AED', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
              BURN RATE
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#7C3AED', margin: 0 }}>
              PKR {summary.burn_rate.toLocaleString()}/mo
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#FEF3C7',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #FCD34D',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#92400E', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
              CASH POSITION
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#92400E', margin: 0 }}>
              PKR {summary.current_cash_position.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <LoadingSpinner message="Loading cash flow..." />
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
          <p style={{ color: '#6B7280', margin: 0, fontSize: '1rem' }}>No cash flow data available</p>
        </div>
      ) : (
        <div style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorClosing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month_label" stroke="#6B7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '1rem' }} />
              <Area
                type="monotone"
                dataKey="closing_balance"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#colorClosing)"
                name="Closing Balance"
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
            backgroundColor: '#EFF6FF',
            borderRadius: '8px',
            border: '1px solid #BFDBFE',
          }}
        >
          <p style={{ fontSize: '0.875rem', color: '#1E40AF', margin: 0 }}>
            💡 <strong>Cash Position:</strong> Shows cumulative balance over time. Closing balance each month becomes opening balance for next month.
          </p>
        </div>
      )}
    </div>
  );
};