// ============================================
// PIE CHART WRAPPER - Recharts Pie Chart
// ============================================

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS } from '../../../utils/constants';

/**
 * PieChartWrapper Component
 * @param {Object} props
 * @param {Array} props.data - Chart data array [{name: '', value: 0}]
 * @param {string} props.dataKey - Key for pie values (default: 'value')
 * @param {string} props.nameKey - Key for pie labels (default: 'name')
 * @param {Array} props.colors - Array of colors (optional, uses defaults if not provided)
 * @param {number} props.height - Chart height (default: 300)
 * @param {string} props.label - Chart label (optional)
 * @param {boolean} props.showLegend - Show legend (default: true)
 * @param {boolean} props.showLabels - Show value labels on pie (default: true)
 * @param {number} props.innerRadius - Inner radius for donut chart (default: 0)
 * @param {number} props.outerRadius - Outer radius (default: 80)
 * @param {Function} props.customTooltip - Custom tooltip component (optional)
 * @param {string} props.className - Additional CSS classes
 */
export const PieChartWrapper = ({
  data = [],
  dataKey = 'value',
  nameKey = 'name',
  colors = [
    CHART_COLORS.PRIMARY,
    CHART_COLORS.SUCCESS,
    CHART_COLORS.WARNING,
    CHART_COLORS.DANGER,
    CHART_COLORS.PURPLE,
    CHART_COLORS.PINK,
  ],
  height = 300,
  label = '',
  showLegend = true,
  showLabels = true,
  innerRadius = 0,
  outerRadius = 80,
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
            {payload[0].name}
          </p>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6B7280' }}>
            Value: <strong>{payload[0].value.toLocaleString()}</strong>
          </p>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '0.875rem' }}>
            {payload[0].percent ? `(${(payload[0].percent * 100).toFixed(1)}%)` : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label rendering
  const renderCustomLabel = (entry) => {
    if (!showLabels) return null;
    return `${entry[nameKey]}: ${entry[dataKey]}`;
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
          color: '#374151',
          textAlign: 'center'
        }}>
          {label}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            label={showLabels ? renderCustomLabel : false}
            labelLine={showLabels}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={customTooltip || <DefaultTooltip />} />
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChartWrapper;