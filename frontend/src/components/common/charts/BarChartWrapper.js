// ============================================
// BAR CHART WRAPPER - Recharts Bar Chart
// ============================================

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { CHART_COLORS } from '../../../utils/constants';

/**
 * BarChartWrapper Component
 * @param {Object} props
 * @param {Array} props.data - Chart data array
 * @param {string} props.dataKey - Key for bar values
 * @param {string} props.xAxisKey - Key for X-axis (default: 'name')
 * @param {string} props.color - Bar color (default: primary blue)
 * @param {Array} props.colors - Array of colors for multiple bars (optional)
 * @param {number} props.height - Chart height (default: 300)
 * @param {string} props.label - Chart label (optional)
 * @param {boolean} props.showLegend - Show legend (default: true)
 * @param {boolean} props.showGrid - Show grid (default: true)
 * @param {boolean} props.showLabels - Show value labels on bars (default: false)
 * @param {boolean} props.horizontal - Horizontal layout (default: false)
 * @param {Function} props.customTooltip - Custom tooltip component (optional)
 * @param {string} props.className - Additional CSS classes
 */
export const BarChartWrapper = ({
  data = [],
  dataKey,
  xAxisKey = 'name',
  color = CHART_COLORS.PRIMARY,
  colors = [],
  height = 300,
  label = '',
  showLegend = true,
  showGrid = true,
  showLabels = false,
  horizontal = false,
  customTooltip = null,
  className = '',
}) => {
  // Default tooltip
  const DefaultTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '0.75rem 1rem',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}>
          <p style={{ margin: 0, fontWeight: '600', color: '#374151' }}>
            {payload[0].payload[xAxisKey]}
          </p>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6B7280' }}>
            {label || dataKey}: <strong>{payload[0].value.toLocaleString()}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div style={{ 
        height: height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#9CA3AF'
      }}>
        No chart data available
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <h3 style={{ 
          marginBottom: '1rem', 
          fontSize: '1.125rem', 
          fontWeight: '600',
          color: '#374151'
        }}>
          {label}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart 
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
          
          {horizontal ? (
            <>
              <XAxis type="number" stroke="#6B7280" />
              <YAxis type="category" dataKey={xAxisKey} stroke="#6B7280" />
            </>
          ) : (
            <>
              <XAxis dataKey={xAxisKey} stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
            </>
          )}
          
          <Tooltip content={customTooltip || <DefaultTooltip />} />
          {showLegend && <Legend />}
          
          <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]}>
            {colors.length > 0 && data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
            {showLabels && <LabelList dataKey={dataKey} position="top" fill="#374151" />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChartWrapper;