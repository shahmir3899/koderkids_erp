import React from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../../utils/designConstants';

/**
 * FeesStatusCard - Displays fee payment status and next due date
 */
const FeesStatusCard = ({ fees = [], isMobile }) => {
  // Get the most recent fee
  const latestFee = fees[0] || null;
  const isPaid = latestFee?.status === 'Paid';

  // Get next unpaid fee for due date
  const nextUnpaid = fees.find(f => f.status !== 'Paid');

  return (
    <div style={getStyles(isMobile).card}>
      <div style={getStyles(isMobile).content}>
        {/* Coin icon */}
        <span style={getStyles(isMobile).coinIcon}>&#128176;</span>

        <span style={getStyles(isMobile).label}>Fees Status</span>

        <span style={getStyles(isMobile).status(isPaid)}>
          {isPaid ? 'Paid' : 'Pending'}
        </span>

        {nextUnpaid && (
          <>
            <span style={getStyles(isMobile).separator}>-</span>
            <span style={getStyles(isMobile).dueText}>
              Next Due: <span style={getStyles(isMobile).dueDate}>{nextUnpaid.month}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};

const getStyles = (isMobile) => ({
  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: isMobile ? SPACING.md : SPACING.lg,
    flex: 1,
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  coinIcon: {
    fontSize: '20px',
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.whiteSubtle,
  },
  status: (isPaid) => ({
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: isPaid ? COLORS.status.success : COLORS.status.warning,
  }),
  separator: {
    color: COLORS.text.whiteSubtle,
  },
  dueText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },
  dueDate: {
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
});

export default FeesStatusCard;
