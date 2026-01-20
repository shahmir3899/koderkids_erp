// ============================================
// COMMAND RESULT DISPLAY COMPONENT
// Displays the result of a command execution
// Location: frontend/src/components/staff/CommandResultDisplay.js
// ============================================

import React from 'react';
import {
    COLORS,
    SPACING,
    BORDER_RADIUS,
    FONT_SIZES,
    TRANSITIONS
} from '../../utils/designConstants';

const CommandResultDisplay = ({ result, onClose, style = {} }) => {
    if (!result) return null;

    const isSuccess = result.success;
    const hasData = result.data && (
        (Array.isArray(result.data.results) && result.data.results.length > 0) ||
        (result.data.count && result.data.count > 0) ||
        Object.keys(result.data).length > 0
    );

    // ========== Styles ==========
    const styles = {
        container: {
            backgroundColor: isSuccess ? `${COLORS.status.success}10` : `${COLORS.status.error}10`,
            border: `1px solid ${isSuccess ? COLORS.status.success : COLORS.status.error}30`,
            borderRadius: BORDER_RADIUS.lg,
            padding: SPACING.md,
            ...style
        },
        header: {
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: hasData ? SPACING.md : 0,
        },
        iconMessage: {
            display: 'flex',
            alignItems: 'flex-start',
            gap: SPACING.sm,
        },
        icon: {
            fontSize: FONT_SIZES.lg,
            marginTop: '2px',
        },
        messageContainer: {
            flex: 1,
        },
        message: {
            fontSize: FONT_SIZES.sm,
            fontWeight: 500,
            color: isSuccess ? COLORS.status.success : COLORS.status.error,
            marginBottom: hasData ? SPACING.xs : 0,
        },
        subMessage: {
            fontSize: FONT_SIZES.xs,
            color: COLORS.text.secondary,
        },
        closeButton: {
            padding: SPACING.xs,
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontSize: FONT_SIZES.sm,
            color: COLORS.text.secondary,
            borderRadius: BORDER_RADIUS.sm,
            transition: TRANSITIONS.fast,
        },
        dataSection: {
            backgroundColor: COLORS.background.white,
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.sm,
            maxHeight: '200px',
            overflowY: 'auto',
        },
        dataTable: {
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: FONT_SIZES.xs,
        },
        tableHeader: {
            textAlign: 'left',
            padding: `${SPACING.xs} ${SPACING.sm}`,
            borderBottom: `1px solid ${COLORS.border.light}`,
            fontWeight: 600,
            color: COLORS.text.secondary,
            textTransform: 'uppercase',
        },
        tableCell: {
            padding: `${SPACING.xs} ${SPACING.sm}`,
            borderBottom: `1px solid ${COLORS.border.light}`,
            color: COLORS.text.primary,
        },
        summaryGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: SPACING.sm,
        },
        summaryItem: {
            backgroundColor: COLORS.background.white,
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.sm,
            textAlign: 'center',
        },
        summaryValue: {
            fontSize: FONT_SIZES.lg,
            fontWeight: 700,
            color: COLORS.primary,
        },
        summaryLabel: {
            fontSize: FONT_SIZES.xs,
            color: COLORS.text.secondary,
            marginTop: '2px',
        },
    };

    // ========== Render Data Table ==========
    const renderDataTable = (items) => {
        if (!items || items.length === 0) return null;

        // Get keys from first item (excluding complex objects)
        const keys = Object.keys(items[0]).filter(key => {
            const val = items[0][key];
            return typeof val !== 'object' || val === null;
        }).slice(0, 4); // Max 4 columns

        return (
            <table style={styles.dataTable}>
                <thead>
                    <tr>
                        {keys.map(key => (
                            <th key={key} style={styles.tableHeader}>
                                {key.replace(/_/g, ' ')}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {items.slice(0, 5).map((item, idx) => (
                        <tr key={idx}>
                            {keys.map(key => (
                                <td key={key} style={styles.tableCell}>
                                    {item[key] ?? '-'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    // ========== Render Summary Stats ==========
    const renderSummary = (data) => {
        if (!data) return null;

        // Extract numeric values for summary
        const summaryItems = [];

        if (data.count !== undefined) {
            summaryItems.push({ label: 'Total Items', value: data.count });
        }
        if (data.total !== undefined) {
            summaryItems.push({
                label: 'Total Amount',
                value: typeof data.total === 'number'
                    ? `₹${data.total.toLocaleString()}`
                    : data.total
            });
        }
        if (data.total_value !== undefined) {
            summaryItems.push({
                label: 'Total Value',
                value: `₹${Number(data.total_value).toLocaleString()}`
            });
        }

        // Handle inventory summary specific fields
        if (data.by_status && Array.isArray(data.by_status)) {
            data.by_status.forEach(item => {
                summaryItems.push({
                    label: item.status,
                    value: item.count
                });
            });
        }

        if (summaryItems.length === 0) return null;

        return (
            <div style={styles.summaryGrid}>
                {summaryItems.map((item, idx) => (
                    <div key={idx} style={styles.summaryItem}>
                        <div style={styles.summaryValue}>{item.value}</div>
                        <div style={styles.summaryLabel}>{item.label}</div>
                    </div>
                ))}
            </div>
        );
    };

    // ========== Render ==========
    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.iconMessage}>
                    <span style={styles.icon}>
                        {isSuccess ? '✅' : '❌'}
                    </span>
                    <div style={styles.messageContainer}>
                        <div style={styles.message}>
                            {result.message}
                        </div>
                        {result.data?.count !== undefined && (
                            <div style={styles.subMessage}>
                                {result.data.count} item(s) found
                            </div>
                        )}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={styles.closeButton}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.background.gray;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    ✕
                </button>
            </div>

            {/* Data Display */}
            {hasData && (
                <div style={styles.dataSection}>
                    {/* Summary Stats */}
                    {renderSummary(result.data)}

                    {/* Data Table */}
                    {result.data?.results && result.data.results.length > 0 && (
                        <div style={{ marginTop: SPACING.sm }}>
                            {renderDataTable(result.data.results)}
                            {result.data.results.length > 5 && (
                                <div style={{
                                    textAlign: 'center',
                                    paddingTop: SPACING.sm,
                                    fontSize: FONT_SIZES.xs,
                                    color: COLORS.text.secondary
                                }}>
                                    Showing 5 of {result.data.count || result.data.results.length} items
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CommandResultDisplay;
