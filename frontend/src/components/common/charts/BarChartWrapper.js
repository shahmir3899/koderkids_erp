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
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  MIXINS,
  SHADOWS,
} from '../../../utils/designConstants';

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
          ...MIXINS.glassmorphicWhite,
          padding: `0.75rem ${SPACING.sm}`,
          border: `1px solid ${COLORS.border.whiteMedium}`,
          borderRadius: BORDER_RADIUS.sm,
          boxShadow: SHADOWS.md,
        }}>
          <p style={{ margin: 0, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text.primary }}>
            {payload[0].payload[xAxisKey]}
          </p>
          <p style={{ margin: '0.25rem 0 0 0', color: COLORS.text.secondary }}>
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
        color: COLORS.text.whiteSubtle
      }}>
        No chart data available
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <h3 style={{
          marginBottom: SPACING.sm,
          fontSize: FONT_SIZES.xl,
          fontWeight: FONT_WEIGHTS.semibold,
          color: COLORS.text.white
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
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border.whiteSubtle} />}

          {horizontal ? (
            <>
              <XAxis type="number" stroke={COLORS.text.whiteSubtle} />
              <YAxis type="category" dataKey={xAxisKey} stroke={COLORS.text.whiteSubtle} />
            </>
          ) : (
            <>
              <XAxis dataKey={xAxisKey} stroke={COLORS.text.whiteSubtle} />
              <YAxis stroke={COLORS.text.whiteSubtle} />
            </>
          )}

          <Tooltip content={customTooltip || <DefaultTooltip />} />
          {showLegend && <Legend />}

          <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]}>
            {colors.length > 0 && data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
            {showLabels && <LabelList dataKey={dataKey} position="top" fill={COLORS.text.white} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChartWrapper;