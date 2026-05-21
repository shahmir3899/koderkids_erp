import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faClipboardCheck,
  faRoute,
  faUnlock,
  faCheckCircle,
  faGraduationCap,
} from '@fortawesome/free-solid-svg-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
  LAYOUT,
} from '../../utils/designConstants';

const EXPECTATIONS = [
  {
    icon: faRoute,
    title: 'Start From Real Learning Content',
    description:
      'When you open a book, you are taken to the first unlocked lesson or activity. Chapter headers are for structure.',
  },
  {
    icon: faUnlock,
    title: 'Smooth Next Lesson Unlock',
    description:
      'After completing a lesson, the next valid lesson unlocks immediately. You should not need to refresh the page.',
  },
  {
    icon: faCheckCircle,
    title: 'Automatic Chapter Completion',
    description:
      'A chapter is marked complete automatically when all required lessons inside that chapter are completed.',
  },
  {
    icon: faGraduationCap,
    title: 'Accurate Course Progress',
    description:
      'Progress and completion are calculated from required learning topics (lessons and activities), not chapter containers.',
  },
];

const LMSGuidelinesPage = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <button style={styles.backButton} onClick={() => navigate('/lms/my-courses')}>
          <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 8 }} />
          Back to My Lessons
        </button>
      </div>

      <section style={styles.heroCard}>
        <h1 style={styles.title}>
          <FontAwesomeIcon icon={faClipboardCheck} style={styles.titleIcon} />
          LMS Learning Guidelines
        </h1>
        <p style={styles.subtitle}>
          This page explains how learning progression works so students know exactly what to expect while studying.
        </p>
      </section>

      <section style={styles.grid}>
        {EXPECTATIONS.map((item) => (
          <article key={item.title} style={styles.card}>
            <div style={styles.iconWrap}>
              <FontAwesomeIcon icon={item.icon} />
            </div>
            <h3 style={styles.cardTitle}>{item.title}</h3>
            <p style={styles.cardDescription}>{item.description}</p>
          </article>
        ))}
      </section>

      <section style={styles.notesCard}>
        <h2 style={styles.notesTitle}>Quick Notes For Students</h2>
        <ul style={styles.notesList}>
          <li>Use Next and Previous to move through lessons in order.</li>
          <li>Chapter pages guide learning, but chapter completion is automatic.</li>
          <li>If something looks out of date, reopen the course once to refresh state.</li>
          <li>Optional topics can be explored but may not be required for final completion.</li>
        </ul>
      </section>
    </div>
  );
};

const styles = {
  container: {
    padding: SPACING.xl,
    maxWidth: LAYOUT.maxWidth.md,
    margin: '0 auto',
  },
  headerRow: {
    marginBottom: SPACING.lg,
  },
  backButton: {
    border: 'none',
    cursor: 'pointer',
    color: COLORS.text.white,
    background: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.md,
    padding: `${SPACING.sm} ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    transition: `all ${TRANSITIONS.fast}`,
  },
  heroCard: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  title: {
    margin: 0,
    color: COLORS.text.white,
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  titleIcon: {
    color: COLORS.status.info,
  },
  subtitle: {
    margin: `${SPACING.md} 0 0`,
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
    lineHeight: 1.6,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  card: {
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(59, 130, 246, 0.2)',
    color: COLORS.status.info,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    margin: 0,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  cardDescription: {
    margin: `${SPACING.sm} 0 0`,
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
    lineHeight: 1.6,
  },
  notesCard: {
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    borderLeft: `4px solid ${COLORS.status.success}`,
  },
  notesTitle: {
    margin: 0,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  notesList: {
    margin: `${SPACING.md} 0 0`,
    paddingLeft: SPACING.lg,
    color: COLORS.text.whiteSubtle,
    lineHeight: 1.8,
    fontSize: FONT_SIZES.sm,
  },
};

export default LMSGuidelinesPage;
