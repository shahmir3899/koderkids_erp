import React from 'react';
import {
  SPACING,
  BORDER_RADIUS,
  COLORS,
  FONT_SIZES,
} from '../../utils/designConstants';

const ReportCompletionLine = ({ isSelfServiceMode, reportCompletion }) => {
  if (isSelfServiceMode) return null;

  return (
    <div
      style={{
        marginBottom: SPACING.md,
        padding: `${SPACING.sm} ${SPACING.md}`,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: 'rgba(59, 130, 246, 0.18)',
        border: '1px solid rgba(59, 130, 246, 0.35)',
        color: COLORS.text.white,
        fontSize: FONT_SIZES.sm,
      }}
    >
      {reportCompletion.loading ? (
        <>Reports completion: calculating for {reportCompletion.month || 'selected month'}...</>
      ) : reportCompletion.percentage !== null ? (
        <>
          Reports completion share ({reportCompletion.month}):{' '}
          <strong>{reportCompletion.percentage}%</strong> ({reportCompletion.userGenerated} of{' '}
          {reportCompletion.totalGenerated} generated reports)
        </>
      ) : (
        <>Reports completion share: unavailable (select employee and month with report activity).</>
      )}
    </div>
  );
};

export default ReportCompletionLine;
