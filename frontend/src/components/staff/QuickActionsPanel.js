// ============================================
// QUICK ACTIONS PANEL COMPONENT
// Displays clickable quick action buttons grouped by agent
// Location: frontend/src/components/staff/QuickActionsPanel.js
// ============================================

import React, { useState, useEffect } from 'react';
import {
    COLORS,
    SPACING,
    BORDER_RADIUS,
    SHADOWS,
    FONT_SIZES,
    TRANSITIONS
} from '../../utils/designConstants';
import commandService, { getAgentInfo } from '../../services/commandService';

const QuickActionsPanel = ({ onActionSelect, style = {} }) => {
    // ========== State ==========
    const [quickActions, setQuickActions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeAgent, setActiveAgent] = useState('all');
    const [error, setError] = useState(null);

    // ========== Fetch Quick Actions ==========
    useEffect(() => {
        fetchQuickActions();
    }, []);

    const fetchQuickActions = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const actions = await commandService.getQuickActions();
            setQuickActions(actions);
        } catch (err) {
            setError('Failed to load quick actions');
            console.error('Quick actions fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // ========== Filter Actions ==========
    const filteredActions = activeAgent === 'all'
        ? quickActions
        : quickActions.filter(action => action.agent === activeAgent);

    // Get unique agents for tabs
    const agents = ['all', ...new Set(quickActions.map(a => a.agent).filter(Boolean))];

    // ========== Icon Mapping ==========
    const getIconEmoji = (iconName) => {
        const iconMap = {
            'package': '📦',
            'monitor': '🖥️',
            'check-circle': '✅',
            'alert-triangle': '⚠️',
            'user-x': '🚫',
            'users': '👥',
            'user-plus': '👤',
            'dollar-sign': '💰',
            'pie-chart': '📊',
            'bell': '🔔',
            'message-circle': '💬',
            'shopping-cart': '🛒',
        };
        return iconMap[iconName] || '⚡';
    };

    // ========== Styles ==========
    const styles = {
        container: {
            backgroundColor: COLORS.background.white,
            borderRadius: BORDER_RADIUS.lg,
            padding: SPACING.md,
            boxShadow: SHADOWS.sm,
            ...style
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: SPACING.md,
        },
        title: {
            fontSize: FONT_SIZES.sm,
            fontWeight: 600,
            color: COLORS.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.xs,
        },
        tabs: {
            display: 'flex',
            gap: SPACING.xs,
            flexWrap: 'wrap',
        },
        tab: {
            padding: `${SPACING.xs} ${SPACING.sm}`,
            borderRadius: BORDER_RADIUS.full,
            border: 'none',
            fontSize: FONT_SIZES.xs,
            fontWeight: 500,
            cursor: 'pointer',
            transition: TRANSITIONS.fast,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
        },
        tabActive: {
            backgroundColor: COLORS.primary,
            color: COLORS.text.white,
        },
        tabInactive: {
            backgroundColor: COLORS.background.gray,
            color: COLORS.text.secondary,
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: SPACING.sm,
        },
        actionButton: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: SPACING.xs,
            padding: SPACING.sm,
            borderRadius: BORDER_RADIUS.md,
            border: `1px solid ${COLORS.border.light}`,
            backgroundColor: COLORS.background.white,
            cursor: 'pointer',
            transition: TRANSITIONS.normal,
            textAlign: 'center',
        },
        actionIcon: {
            fontSize: FONT_SIZES.xl,
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: BORDER_RADIUS.md,
        },
        actionName: {
            fontSize: FONT_SIZES.xs,
            fontWeight: 600,
            color: COLORS.text.primary,
            lineHeight: 1.2,
        },
        actionDescription: {
            fontSize: '10px',
            color: COLORS.text.secondary,
            lineHeight: 1.2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
        },
        loading: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACING.lg,
            color: COLORS.text.secondary,
            fontSize: FONT_SIZES.sm,
        },
        error: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACING.lg,
            color: COLORS.status.error,
            fontSize: FONT_SIZES.sm,
        },
        emptyState: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACING.lg,
            color: COLORS.text.secondary,
            fontSize: FONT_SIZES.sm,
            textAlign: 'center',
        },
    };

    // ========== Render ==========
    if (isLoading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>
                    <span>Loading quick actions...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.error}>
                    <span>{error}</span>
                    <button
                        onClick={fetchQuickActions}
                        style={{
                            marginLeft: SPACING.sm,
                            padding: `${SPACING.xs} ${SPACING.sm}`,
                            borderRadius: BORDER_RADIUS.sm,
                            border: 'none',
                            backgroundColor: COLORS.primary,
                            color: COLORS.text.white,
                            cursor: 'pointer',
                            fontSize: FONT_SIZES.xs,
                        }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (quickActions.length === 0) {
        return (
            <div style={styles.container}>
                <div style={styles.emptyState}>
                    <span style={{ fontSize: '32px', marginBottom: SPACING.sm }}>🤖</span>
                    <span>No quick actions available</span>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header with Agent Tabs */}
            <div style={styles.header}>
                <div style={styles.title}>
                    <span>⚡</span>
                    <span>Quick Actions</span>
                </div>
                <div style={styles.tabs}>
                    {agents.map(agent => {
                        const agentInfo = agent === 'all'
                            ? { icon: '🎯', label: 'All' }
                            : getAgentInfo(agent);
                        return (
                            <button
                                key={agent}
                                onClick={() => setActiveAgent(agent)}
                                style={{
                                    ...styles.tab,
                                    ...(activeAgent === agent ? styles.tabActive : styles.tabInactive)
                                }}
                            >
                                <span>{agentInfo.icon}</span>
                                <span>{agentInfo.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Actions Grid */}
            <div style={styles.grid}>
                {filteredActions.map(action => {
                    const agentInfo = getAgentInfo(action.agent);
                    return (
                        <button
                            key={action.id}
                            onClick={() => onActionSelect(action)}
                            style={styles.actionButton}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = agentInfo.color;
                                e.currentTarget.style.backgroundColor = `${agentInfo.color}10`;
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = SHADOWS.md;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = COLORS.border.light;
                                e.currentTarget.style.backgroundColor = COLORS.background.white;
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div
                                style={{
                                    ...styles.actionIcon,
                                    backgroundColor: `${agentInfo.color}15`,
                                    color: agentInfo.color,
                                }}
                            >
                                {getIconEmoji(action.icon)}
                            </div>
                            <div style={styles.actionName}>{action.name}</div>
                            {action.description && (
                                <div style={styles.actionDescription}>
                                    {action.description}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default QuickActionsPanel;
