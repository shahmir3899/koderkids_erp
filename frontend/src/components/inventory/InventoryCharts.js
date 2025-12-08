// ============================================
// INVENTORY CHARTS - Category & Status Charts
// ============================================
// Location: src/components/inventory/InventoryCharts.js
//
// Displays:
// - Pie chart for category distribution
// - Bar chart for status distribution

import React from 'react';
import { CollapsibleSection } from '../common/cards/CollapsibleSection';
import { PieChartWrapper } from '../common/charts/PieChartWrapper';
import { BarChartWrapper } from '../common/charts/BarChartWrapper';

// ============================================
// CHART COLORS
// ============================================
const PIE_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

const STATUS_COLORS = [
  '#10B981', // Available - Green
  '#3B82F6', // Assigned - Blue
  '#F59E0B', // Damaged - Yellow
  '#EF4444', // Lost - Red
  '#6B7280', // Disposed - Gray
];

// ============================================
// STYLES
// ============================================
const containerStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
  gap: '1.5rem',
};

const chartCardStyle = {
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '1.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  border: '1px solid #E5E7EB',
};

const chartTitleStyle = {
  fontSize: '1rem',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '1rem',
  textAlign: 'center',
};

// ============================================
// MAIN COMPONENT
// ============================================
export const InventoryCharts = ({
  categoryChartData = [],
  statusChartData = [],
  loading = false,
}) => {
  if (loading) {
    return (
      <CollapsibleSection title="📊 Analytics" defaultOpen={true}>
        <div style={containerStyle}>
          <div style={{ ...chartCardStyle, height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#9CA3AF' }}>Loading charts...</span>
          </div>
          <div style={{ ...chartCardStyle, height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#9CA3AF' }}>Loading charts...</span>
          </div>
        </div>
      </CollapsibleSection>
    );
  }

  const hasData = categoryChartData.length > 0 || statusChartData.length > 0;

  if (!hasData) {
    return (
      <CollapsibleSection title="📊 Analytics" defaultOpen={true}>
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#9CA3AF',
        }}>
          <p>📈 No data available for charts. Add some inventory items to see analytics.</p>
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection title="📊 Analytics" defaultOpen={true}>
      <div style={containerStyle}>
        {/* Category Distribution - Pie Chart */}
        <div style={chartCardStyle}>
          <h3 style={chartTitleStyle}>📁 Items by Category</h3>
          {categoryChartData.length > 0 ? (
            <PieChartWrapper
              data={categoryChartData}
              dataKey="value"
              nameKey="name"
              colors={PIE_COLORS}
              height={280}
              showLegend
              showLabels={false}
              innerRadius={50}
              outerRadius={90}
            />
          ) : (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
              No category data
            </div>
          )}
        </div>

        {/* Status Distribution - Bar Chart */}
        <div style={chartCardStyle}>
          <h3 style={chartTitleStyle}>📊 Items by Status</h3>
          {statusChartData.length > 0 ? (
            <BarChartWrapper
              data={statusChartData}
              dataKey="value"
              xAxisKey="name"
              colors={STATUS_COLORS}
              height={280}
              showLegend={false}
              showLabels
            />
          ) : (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
              No status data
            </div>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
};

export default InventoryCharts;