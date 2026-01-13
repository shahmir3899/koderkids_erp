// ============================================
// ADMIN HEADER - Admin Dashboard Header
// ============================================

import React from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
} from '../../utils/designConstants';

export const AdminHeader = () => {
  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <img
          src="/whiteLogo.png"
          alt="Koder Kids Logo"
          style={styles.logo}
        />
        <h1 style={styles.title}>
          Koder Kids Admin Dashboard
        </h1>
      </div>
    </header>
  );
};

const styles = {
  header: {
    backgroundColor: COLORS.status.info,
    color: COLORS.text.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    boxShadow: SHADOWS.md,
    marginBottom: SPACING.xl,
  },
  container: {
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    height: SPACING.xl,
    width: 'auto',
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    margin: 0,
  },
};

export default AdminHeader;