import React from 'react';
import moment from 'moment';
import { CollapsibleSection } from '../common/cards/CollapsibleSection';
import { DataTable } from '../common/tables/DataTable';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  MIXINS,
} from '../../utils/designConstants';

const ReportAnalyticsSection = ({ isMobile, selectedMonth, analytics, pageStyles }) => {
  return (
    <CollapsibleSection
      title="Report Analytics"
      defaultOpen={true}
      headerAction={
        <span style={{ color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs }}>
          Month: {selectedMonth || 'N/A'}
        </span>
      }
    >
      {analytics.loading ? (
        <LoadingSpinner size="small" message="Loading report analytics..." />
      ) : analytics.monthBreakdown ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: SPACING.md,
              marginBottom: SPACING.lg,
            }}
          >
            <KpiCard
              label="Student Reports Generated"
              value={analytics.monthBreakdown.total || 0}
              accent="#60A5FA"
            />
            <KpiCard
              label="Active Report Users"
              value={analytics.monthBreakdown.by_user?.length || 0}
              accent="#34D399"
            />
            <KpiCard
              label="Classes Tracked"
              value={
                analytics.monthBreakdown.by_school?.reduce(
                  (acc, school) => acc + (school.classes?.length || 0),
                  0
                ) || 0
              }
              accent="#FBBF24"
            />
          </div>

          <h4 style={pageStyles.subSectionTitle}>Users</h4>
          {analytics.monthBreakdown.by_user?.length ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: SPACING.md,
                marginBottom: SPACING.xl,
              }}
            >
              {analytics.monthBreakdown.by_user.map((user) => (
                <div
                  key={`user-${user.user_id || user.username}`}
                  style={{
                    ...MIXINS.glassmorphicSubtle,
                    borderRadius: BORDER_RADIUS.md,
                    border: '1px solid rgba(255,255,255,0.18)',
                    padding: SPACING.md,
                  }}
                >
                  <div style={{ color: COLORS.text.white, fontWeight: FONT_WEIGHTS.semibold }}>
                    {user.full_name || user.username || 'Unknown User'}
                  </div>
                  <div style={{ color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs }}>
                    @{user.username || '-'}
                  </div>
                  <div
                    style={{
                      marginTop: SPACING.sm,
                      color: '#34D399',
                      fontWeight: FONT_WEIGHTS.bold,
                      fontSize: FONT_SIZES.lg,
                    }}
                  >
                    {user.generated_count || 0} reports
                  </div>
                  <div style={{ marginTop: SPACING.xs, color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs }}>
                    Last: {user.last_generated_at ? moment(user.last_generated_at).format('YYYY-MM-DD HH:mm') : '-'}
                  </div>
                  <div style={{ marginTop: SPACING.sm, color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs }}>
                    Assigned Schools:
                  </div>
                  <div style={{ marginTop: SPACING.xs, display: 'flex', flexWrap: 'wrap', gap: SPACING.xs }}>
                    {(user.assigned_schools || []).length ? (
                      user.assigned_schools.map((school) => (
                        <span
                          key={`user-school-${user.user_id}-${school.id}`}
                          style={{
                            padding: `2px ${SPACING.sm}`,
                            borderRadius: BORDER_RADIUS.full,
                            background: 'rgba(96,165,250,0.2)',
                            border: '1px solid rgba(96,165,250,0.35)',
                            color: '#93C5FD',
                            fontSize: FONT_SIZES.xs,
                          }}
                        >
                          {school.name}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs }}>No schools</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={pageStyles.noDataContainer}>No report user activity for selected month.</div>
          )}

          <h4 style={{ ...pageStyles.subSectionTitle, marginTop: SPACING.xl }}>Schools & Classes</h4>
          {analytics.monthBreakdown.by_school?.length ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: SPACING.md,
              }}
            >
              {analytics.monthBreakdown.by_school.map((school) => (
                <div
                  key={`school-${school.school_id}`}
                  style={{
                    ...MIXINS.glassmorphicSubtle,
                    borderRadius: BORDER_RADIUS.md,
                    border: '1px solid rgba(255,255,255,0.18)',
                    padding: SPACING.md,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: SPACING.sm,
                    }}
                  >
                    <div style={{ color: COLORS.text.white, fontWeight: FONT_WEIGHTS.semibold }}>
                      {school.school_name}
                    </div>
                    <div style={{ color: '#60A5FA', fontWeight: FONT_WEIGHTS.bold }}>
                      {school.total_generated || 0}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: SPACING.xs }}>
                    {(school.classes || []).length ? (
                      school.classes.map((cls) => (
                        <div
                          key={`school-class-${school.school_id}-${cls.class_name}`}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            color: COLORS.text.whiteSubtle,
                            fontSize: FONT_SIZES.sm,
                            padding: `${SPACING.xs} 0`,
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <span>{cls.class_name}</span>
                          <span style={{ color: COLORS.text.white }}>{cls.generated_count || 0}</span>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs }}>
                        No classes found for this school.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={pageStyles.noDataContainer}>
              No school/class report activity available for selected month.
            </div>
          )}

          {analytics.adminMonitoring?.totals && (
            <>
              <h4 style={{ ...pageStyles.subSectionTitle, marginTop: SPACING.xl }}>
                Self-Service Monitoring
              </h4>
              <div
                style={{
                  ...MIXINS.glassmorphicSubtle,
                  borderRadius: BORDER_RADIUS.md,
                  padding: SPACING.md,
                  color: COLORS.text.white,
                }}
              >
                Requests: {analytics.adminMonitoring.totals.requests_total || 0} | Pending:{' '}
                {analytics.adminMonitoring.totals.pending || 0} | Approved:{' '}
                {analytics.adminMonitoring.totals.approved || 0} | Rejected:{' '}
                {analytics.adminMonitoring.totals.rejected || 0} | Generated:{' '}
                {analytics.adminMonitoring.totals.generated || 0} | Downloads:{' '}
                {analytics.adminMonitoring.totals.downloads_total || 0}
              </div>
            </>
          )}
        </>
      ) : (
        <div style={pageStyles.noDataContainer}>Report analytics not available right now.</div>
      )}
    </CollapsibleSection>
  );
};

const KpiCard = ({ label, value, accent }) => (
  <div
    style={{
      ...MIXINS.glassmorphicSubtle,
      borderRadius: BORDER_RADIUS.md,
      border: `1px solid ${accent}55`,
      padding: SPACING.md,
      minHeight: '92px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: SPACING.xs,
    }}
  >
    <div
      style={{
        fontSize: FONT_SIZES.xs,
        color: COLORS.text.whiteSubtle,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: FONT_SIZES['2xl'],
        fontWeight: FONT_WEIGHTS.bold,
        color: accent,
        lineHeight: 1.1,
      }}
    >
      {Number(value || 0).toLocaleString()}
    </div>
  </div>
);

export default ReportAnalyticsSection;
