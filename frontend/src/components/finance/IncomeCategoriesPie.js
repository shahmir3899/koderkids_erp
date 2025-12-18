// ============================================
// INCOME CATEGORIES PIE CHART COMPONENT
// ============================================
// Location: src/components/finance/IncomeCategoriesPie.js

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { financeDashboardService } from '../../services/financeDashboardService';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { Button } from '../common/ui/Button';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

export const IncomeCategoriesPie = ({ schools }) => {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('6months');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [customDates, setCustomDates] = useState({
    start: '',
    end: '',
  });
  const [showCustomModal, setShowCustomModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [period, selectedCategory, selectedSchool]);

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

      // Note: Update service to call the new income endpoint
      const response = await financeDashboardService.getIncomeCategories(
        period,
        selectedCategory,
        startDate,
        endDate,
        selectedSchool || null
      );

      setData(response.data.data);
      setSummary(response.data.summary);
      setAvailableCategories(response.data.available_categories);
    } catch (error) {
      console.error('Error fetching income categories:', error);
      toast.error('Failed to load income categories');
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
            {data.category}
          </p>
          <p style={{ margin: '0 0 0.25rem 0', color: '#059669', fontSize: '0.875rem' }}>
            Amount: PKR {data.total.toLocaleString()}
          </p>
          <p style={{ margin: '0 0 0.25rem 0', color: '#6B7280', fontSize: '0.875rem' }}>
            Transactions: {data.count}
          </p>
          <p style={{ margin: 0, color: '#3B82F6', fontWeight: '600', fontSize: '0.875rem' }}>
            {data.percentage.toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* Controls Row 1: Period Buttons */}
      <div style={{ marginBottom: '1rem' }}>
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
      </div>

      {/* Controls Row 2: Category Buttons */}
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
          Filter by Category:
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button
            onClick={() => setSelectedCategory('all')}
            variant={selectedCategory === 'all' ? 'primary' : 'secondary'}
            size="small"
          >
            All Categories
          </Button>
          {availableCategories.map((cat) => (
            <Button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              variant={selectedCategory === cat ? 'primary' : 'secondary'}
              size="small"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Controls Row 3: School Filter */}
      {schools && schools.length > 0 && (
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
            Filter by School:
          </label>
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
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
            <option value="">All Schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: '#EFF6FF',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#1D4ED8',
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
              }}
            >
              Total Income
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1D4ED8', margin: 0 }}>
              PKR {summary.total_income.toLocaleString()}
            </p>
          </div>
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: '#EFF6FF',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#1D4ED8',
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
              }}
            >
              Categories
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1D4ED8', margin: 0 }}>
              {summary.category_count}
            </p>
          </div>
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: '#EFF6FF',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#1D4ED8',
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
              }}
            >
              Avg Per Category
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1D4ED8', margin: 0 }}>
              PKR {summary.avg_per_category.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Chart and Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <LoadingSpinner message="Loading categories..." />
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Pie Chart */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#1F2937' }}>Distribution</h4>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="total"
                    nameKey="category"  // Ensures legend uses 'category'
                    label={({ percentage }) => `${percentage.toFixed(0)}%`}  // Uses backend-rounded percentage
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: '0.875rem', color: '#6B7280' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#1F2937' }}>
              Category Breakdown
            </h4>
            <div
              style={{
                overflowX: 'auto',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                backgroundColor: 'white',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB' }}>
                    <th
                      style={{
                        padding: '0.75rem',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Category
                    </th>
                    <th
                      style={{
                        padding: '0.75rem',
                        textAlign: 'right',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Amount
                    </th>
                    <th
                      style={{
                        padding: '0.75rem',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr
                      key={item.category}
                      style={{
                        borderBottom: '1px solid #E5E7EB',
                        backgroundColor: index % 2 === 0 ? 'white' : '#F9FAFB',
                      }}
                    >
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <span style={{ fontWeight: '500', color: '#1F2937' }}>{item.category}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#1F2937' }}>
                        PKR {item.total.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#3B82F6' }}>
                        {item.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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