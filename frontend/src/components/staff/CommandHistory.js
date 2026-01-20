// ============================================
// COMMAND HISTORY COMPONENT
// Displays past command executions with status and results
// Location: frontend/src/components/staff/CommandHistory.js
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
    COLORS,
    SPACING,
    BORDER_RADIUS,
    SHADOWS,
    FONT_SIZES,
    TRANSITIONS
} from '../../utils/designConstants';
import commandService, { getAgentInfo, getStatusInfo } from '../../services/commandService';

const CommandHistory = ({
    limit = 10,
    showFilters = true,
    compact = false,
    onCommandSelect,
    style = {}
}) => {
    // ========== State ==========
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAgent, setSelectedAgent] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [expandedCommand, setExpandedCommand] = useState(null);

    // ========== Fetch History ==========
    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const options = { limit };
            if (selectedAgent !== 'all') options.agent = selectedAgent;
            if (selectedStatus !== 'all') options.status = selectedStatus;

            const data = await commandService.getCommandHistory(options, true);
            setHistory(data);
        } catch (err) {
            console.error('Failed to fetch command history:', err);
            setError('Failed to load command history');
        } finally {
            setIsLoading(false);
        }
    }, [limit, selectedAgent, selectedStatus]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // ========== Helpers ==========
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const truncateText = (text, maxLength = 50) => {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    // ========== Styles ==========
    const styles = {
        container: {
            backgroundColor: COLORS.background.white,
            borderRadius: BORDER_RADIUS.lg,
            boxShadow: SHADOWS.sm,
            border: `1px solid ${COLORS.border.light}`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            ...style
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: compact ? SPACING.sm : SPACING.md,
            borderBottom: `1px solid ${COLORS.border.light}`,
            backgroundColor: COLORS.background.gray,
        },
        title: {
            fontSize: compact ? FONT_SIZES.sm : FONT_SIZES.md,
            fontWeight: 600,
            color: COLORS.text.primary,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.xs,
        },
        filters: {
            display: 'flex',
            gap: SPACING.sm,
        },
        filterSelect: {
            padding: `${SPACING.xs} ${SPACING.sm}`,
            fontSize: FONT_SIZES.xs,
            border: `1px solid ${COLORS.border.light}`,
            borderRadius: BORDER_RADIUS.sm,
            backgroundColor: COLORS.background.white,
            cursor: 'pointer',
            outline: 'none',
        },
        list: {
            flex: 1,
            overflowY: 'auto',
        },
        emptyState: {
            padding: SPACING.xl,
            textAlign: 'center',
            color: COLORS.text.secondary,
            fontSize: FONT_SIZES.sm,
        },
        loadingState: {
            padding: SPACING.xl,
            textAlign: 'center',
            color: COLORS.text.secondary,
        },
        errorState: {
            padding: SPACING.md,
            textAlign: 'center',
            color: COLORS.status.error,
            fontSize: FONT_SIZES.sm,
        },
        historyItem: {
            padding: compact ? SPACING.sm : SPACING.md,
            borderBottom: `1px solid ${COLORS.border.light}`,
            cursor: 'pointer',
            transition: TRANSITIONS.fast,
        },
        historyItemHover: {
            backgroundColor: COLORS.background.gray,
        },
        itemHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: SPACING.xs,
        },
        commandText: {
            fontSize: compact ? FONT_SIZES.xs : FONT_SIZES.sm,
            fontWeight: 500,
            color: COLORS.text.primary,
            flex: 1,
            marginRight: SPACING.sm,
        },
        timestamp: {
            fontSize: FONT_SIZES.xs,
            color: COLORS.text.muted,
            whiteSpace: 'nowrap',
        },
        itemMeta: {
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm,
            flexWrap: 'wrap',
        },
        badge: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: `2px ${SPACING.xs}`,
            borderRadius: BORDER_RADIUS.sm,
            fontSize: FONT_SIZES.xs,
            fontWeight: 500,
        },
        expandedContent: {
            marginTop: SPACING.sm,
            padding: SPACING.sm,
            backgroundColor: COLORS.background.gray,
            borderRadius: BORDER_RADIUS.sm,
            fontSize: FONT_SIZES.xs,
        },
        resultMessage: {
            color: COLORS.text.secondary,
            marginBottom: SPACING.xs,
        },
        resultData: {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: COLORS.text.muted,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxHeight: '100px',
            overflow: 'auto',
        },
        refreshButton: {
            padding: `${SPACING.xs} ${SPACING.sm}`,
            fontSize: FONT_SIZES.xs,
            backgroundColor: 'transparent',
            border: `1px solid ${COLORS.border.light}`,
            borderRadius: BORDER_RADIUS.sm,
            cursor: 'pointer',
            color: COLORS.text.secondary,
            transition: TRANSITIONS.fast,
        },
    };

    // ========== Agent Filter Options ==========
    const agentOptions = [
        { value: 'all', label: 'All Agents' },
        { value: 'inventory', label: '📦 Inventory' },
        { value: 'hr', label: '👥 HR' },
        { value: 'finance', label: '💰 Finance' },
        { value: 'broadcast', label: '📢 Broadcast' },
    ];

    const statusOptions = [
        { value: 'all', label: 'All Status' },
        { value: 'success', label: '✅ Success' },
        { value: 'failed', label: '❌ Failed' },
        { value: 'pending', label: '⏳ Pending' },
    ];

    // ========== Render ==========
    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h3 style={styles.title}>
                    <span>📜</span>
                    Command History
                </h3>
                <div style={styles.filters}>
                    {showFilters && (
                        <>
                            <select
                                value={selectedAgent}
                                onChange={(e) => setSelectedAgent(e.target.value)}
                                style={styles.filterSelect}
                            >
                                {agentOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                style={styles.filterSelect}
                            >
                                {statusOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </>
                    )}
                    <button
                        onClick={fetchHistory}
                        style={styles.refreshButton}
                        title="Refresh"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Content */}
            <div style={styles.list}>
                {isLoading ? (
                    <div style={styles.loadingState}>
                        <span>Loading history...</span>
                    </div>
                ) : error ? (
                    <div style={styles.errorState}>
                        <span>{error}</span>
                        <button
                            onClick={fetchHistory}
                            style={{ ...styles.refreshButton, marginTop: SPACING.sm }}
                        >
                            Retry
                        </button>
                    </div>
                ) : history.length === 0 ? (
                    <div style={styles.emptyState}>
                        <span>No commands found</span>
                        <p style={{ margin: `${SPACING.xs} 0 0`, fontSize: FONT_SIZES.xs }}>
                            Commands you execute will appear here
                        </p>
                    </div>
                ) : (
                    history.map((item) => {
                        const agentInfo = getAgentInfo(item.agent);
                        const statusInfo = getStatusInfo(item.status);
                        const isExpanded = expandedCommand === item.id;

                        return (
                            <div
                                key={item.id}
                                style={styles.historyItem}
                                onClick={() => {
                                    setExpandedCommand(isExpanded ? null : item.id);
                                    if (onCommandSelect) onCommandSelect(item);
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = COLORS.background.gray;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                {/* Item Header */}
                                <div style={styles.itemHeader}>
                                    <span style={styles.commandText}>
                                        {truncateText(item.original_text || item.command, compact ? 40 : 60)}
                                    </span>
                                    <span style={styles.timestamp}>
                                        {formatTimestamp(item.created_at)}
                                    </span>
                                </div>

                                {/* Item Meta */}
                                <div style={styles.itemMeta}>
                                    <span
                                        style={{
                                            ...styles.badge,
                                            backgroundColor: `${agentInfo.color}15`,
                                            color: agentInfo.color,
                                        }}
                                    >
                                        {agentInfo.icon} {agentInfo.label}
                                    </span>
                                    <span
                                        style={{
                                            ...styles.badge,
                                            backgroundColor: `${statusInfo.color}15`,
                                            color: statusInfo.color,
                                        }}
                                    >
                                        {statusInfo.icon} {statusInfo.label}
                                    </span>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && item.result && (
                                    <div style={styles.expandedContent}>
                                        {item.result.message && (
                                            <div style={styles.resultMessage}>
                                                <strong>Result:</strong> {item.result.message}
                                            </div>
                                        )}
                                        {item.result.data && (
                                            <div style={styles.resultData}>
                                                {JSON.stringify(item.result.data, null, 2)}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default CommandHistory;
