// ============================================
// INVENTORY CHARTS - Glassmorphism Design System
// Category & Status Charts with glass effect
// ============================================

import React, { useState } from 'react';
import { CollapsibleSection } from '../common/cards/CollapsibleSection';
import { PieChartWrapper } from '../common/charts/PieChartWrapper';
import { BarChartWrapper } from '../common/charts/BarChartWrapper';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';

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
// CHART CARD COMPONENT
// ============================================
const ChartCard = ({ title, icon, children, id, hoveredCard, setHoveredCard }) => {
  const isHovered = hoveredCard === id;

  const cardStyle = {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    transition: `all ${TRANSITIONS.normal}`,
    border: '1px solid rgba(255, 255, 255, 0.18)',
    transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
    boxShadow: isHovered
      ? '0 12px 40px rgba(0, 0, 0, 0.25)'
      : '0 4px 24px rgba(0, 0, 0, 0.12)',
    background: isHovered
      ? 'rgba(255, 255, 255, 0.16)'
      : 'rgba(255, 255, 255, 0.1)',
    borderColor: isHovered
      ? 'rgba(255, 255, 255, 0.3)'
      : 'rgba(255, 255, 255, 0.18)',
  };

  const titleStyle = {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHoveredCard(id)}
      onMouseLeave={() => setHoveredCard(null)}
    >
      <h3 style={titleStyle}>
        <span>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const InventoryCharts = ({
  categoryChartData = [],
  statusChartData = [],
  loading = false,
}) => {
  const [hoveredCard, setHoveredCard] = useState(null);

  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: SPACING.xl,
  };

  const emptyStateStyle = {
    height: 280,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  };

  if (loading) {
    return (
      <CollapsibleSection title="📊 Analytics" defaultOpen={true}>
        <div style={containerStyle}>
          <ChartCard
            title="Items by Category"
            icon="📁"
            id="category"
            hoveredCard={hoveredCard}
            setHoveredCard={setHoveredCard}
          >
            <div style={emptyStateStyle}>Loading charts...</div>
          </ChartCard>
          <ChartCard
            title="Items by Status"
            icon="📊"
            id="status"
            hoveredCard={hoveredCard}
            setHoveredCard={setHoveredCard}
          >
            <div style={emptyStateStyle}>Loading charts...</div>
          </ChartCard>
        </div>
      </CollapsibleSection>
    );
  }

  const hasData = categoryChartData.length > 0 || statusChartData.length > 0;

  if (!hasData) {
    return (
      <CollapsibleSection title="📊 Analytics" defaultOpen={true}>
        <div style={{
          padding: SPACING['2xl'],
          textAlign: 'center',
          color: COLORS.text.whiteSubtle,
        }}>
          <p style={{ fontSize: FONT_SIZES.lg, marginBottom: SPACING.sm }}>📈 No data available for charts</p>
          <p style={{ fontSize: FONT_SIZES.sm, opacity: 0.8 }}>Add some inventory items to see analytics.</p>
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection title="📊 Analytics" defaultOpen={true}>
      <div style={containerStyle}>
        {/* Category Distribution - Pie Chart */}
        <ChartCard
          title="Items by Category"
          icon="📁"
          id="category"
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
        >
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
            <div style={emptyStateStyle}>No category data</div>
          )}
        </ChartCard>

        {/* Status Distribution - Bar Chart */}
        <ChartCard
          title="Items by Status"
          icon="📊"
          id="status"
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
        >
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
            <div style={emptyStateStyle}>No status data</div>
          )}
        </ChartCard>
      </div>
    </CollapsibleSection>
  );
};

export default InventoryCharts;
