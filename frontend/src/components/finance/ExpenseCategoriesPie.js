// ============================================
// EXPENSE CATEGORIES PIE CHART COMPONENT
// ============================================
// Location: src/components/finance/ExpenseCategoriesPie.js

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

export const ExpenseCategoriesPie = ({ schools }) => {
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

      const response = await financeDashboardService.getExpenseCategories(
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
      console.error('Error fetching expense categories:', error);
      toast.error('Failed to load expense categories');
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
          {availableCategories.map((category) => (
            <Button
              key={category}
              onClick={() => setSelectedCategory(category)}
              variant={selectedCategory === category ? 'primary' : 'secondary'}
              size="small"
            >
              {category}
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
              padding: '0.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              minWidth: '200px',
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
              backgroundColor: '#FEF2F2',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #FECACA',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#DC2626', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
              TOTAL EXPENSES
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#DC2626', margin: 0 }}>
              PKR {summary.total_expenses.toLocaleString()}
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
              CATEGORIES
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1E40AF', margin: 0 }}>
              {summary.category_count}
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
              AVG PER CATEGORY
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7C3AED', margin: 0 }}>
              PKR {summary.avg_per_category.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      )}

      {/* Chart and Table Side by Side */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <LoadingSpinner message="Loading expense categories..." />
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
          <p style={{ color: '#6B7280', margin: 0, fontSize: '1rem' }}>No expense data available for selected filters</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
          }}
        >
          {/* Pie Chart */}
          <div>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>
              Distribution
            </h4>
            <div style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ percentage }) => `${percentage.toFixed(0)}%`}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Table */}
          <div>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>
              Category Breakdown
            </h4>
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
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