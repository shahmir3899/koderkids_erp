// ============================================
// UNIFIED AGENT SELECTOR COMPONENT
// Provides tabbed access to Fee, Inventory, and Task AI agents
// Location: frontend/src/components/admin/UnifiedAgentSelector.js
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
    COLORS,
    SPACING,
    BORDER_RADIUS,
    FONT_SIZES,
    FONT_WEIGHTS,
    TRANSITIONS,
    MIXINS,
} from '../../utils/designConstants';

// Agent Components
import FeeAgentChat from '../finance/FeeAgentChat';
import InventoryAgentChat from '../inventory/InventoryAgentChat';
import TaskAgentChat from '../tasks/TaskAgentChat';

// Hooks
import { useSchools } from '../../hooks/useSchools';

// Services
import { API_URL, getAuthHeaders } from '../../api';

// ============================================
// AGENT CONFIGURATION
// ============================================
const AGENTS = [
    {
        id: 'fee',
        name: 'Fee Agent',
        icon: '💰',
        description: 'Manage fees, payments & collections',
        color: '#10B981',
    },
    {
        id: 'inventory',
        name: 'Inventory Agent',
        icon: '📦',
        description: 'Track items, transfers & assignments',
        color: '#3B82F6',
    },
    {
        id: 'task',
        name: 'Task Agent',
        icon: '📋',
        description: 'Assign tasks to employees',
        color: '#8B5CF6',
    },
];

// ============================================
// MAIN COMPONENT
// ============================================
const UnifiedAgentSelector = ({ height = '450px' }) => {
    // ========== State ==========
    const [activeAgent, setActiveAgent] = useState('fee');
    const [employees, setEmployees] = useState([]);
    const [inventoryData, setInventoryData] = useState({
        categories: [],
        users: [],
    });
    const [loadingData, setLoadingData] = useState({
        employees: false,
        inventory: false,
    });

    // Schools from hook
    const { schools } = useSchools();

    // Get current user info from localStorage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = currentUser.role === 'Admin';

    // ========== Fetch Employees for Task Agent ==========
    const fetchEmployees = useCallback(async () => {
        if (employees.length > 0) return; // Already loaded

        setLoadingData(prev => ({ ...prev, employees: true }));
        try {
            const response = await fetch(`${API_URL}/employees/teachers/`, {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setEmployees(data);
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoadingData(prev => ({ ...prev, employees: false }));
        }
    }, [employees.length]);

    // ========== Fetch Inventory Data for Inventory Agent ==========
    const fetchInventoryData = useCallback(async () => {
        if (inventoryData.categories.length > 0) return; // Already loaded

        setLoadingData(prev => ({ ...prev, inventory: true }));
        try {
            // Fetch categories and users in parallel
            const [categoriesRes, usersRes] = await Promise.all([
                fetch(`${API_URL}/inventory/categories/`, { headers: getAuthHeaders() }),
                fetch(`${API_URL}/users/`, { headers: getAuthHeaders() }),
            ]);

            const categories = categoriesRes.ok ? await categoriesRes.json() : [];
            const users = usersRes.ok ? await usersRes.json() : [];

            setInventoryData({ categories, users });
        } catch (error) {
            console.error('Error fetching inventory data:', error);
        } finally {
            setLoadingData(prev => ({ ...prev, inventory: false }));
        }
    }, [inventoryData.categories.length]);

    // ========== Load Data on Agent Switch ==========
    useEffect(() => {
        if (activeAgent === 'task') {
            fetchEmployees();
        } else if (activeAgent === 'inventory') {
            fetchInventoryData();
        }
    }, [activeAgent, fetchEmployees, fetchInventoryData]);

    // ========== Render Active Agent ==========
    // Calculate agent height (for 100%, use 100% so it fills container)
    const agentHeight = height === '100%' ? '100%' : height;

    const renderAgent = () => {
        switch (activeAgent) {
            case 'fee':
                return (
                    <FeeAgentChat
                        schools={schools}
                        students={[]} // AI agent handles student queries internally
                        onRefresh={() => {}}
                        height={agentHeight}
                    />
                );
            case 'inventory':
                return (
                    <InventoryAgentChat
                        schools={schools}
                        categories={inventoryData.categories}
                        users={inventoryData.users}
                        currentUserId={currentUser.id}
                        isAdmin={isAdmin}
                        onRefresh={() => {}}
                        height={agentHeight}
                    />
                );
            case 'task':
                return (
                    <TaskAgentChat
                        employees={employees}
                        onTaskCreated={() => {}}
                        height={agentHeight}
                    />
                );
            default:
                return null;
        }
    };

    // ========== Styles ==========
    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.sm,
            height: height === '100%' ? '100%' : 'auto',
            overflow: 'hidden',
        },
        tabsContainer: {
            display: 'flex',
            gap: SPACING.xs,
            padding: SPACING.xs,
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: BORDER_RADIUS.md,
            flexShrink: 0,
        },
        tab: (isActive, color) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: `${SPACING.sm} ${SPACING.xs}`,
            backgroundColor: isActive ? `${color}15` : 'transparent',
            border: isActive ? `1px solid ${color}50` : '1px solid transparent',
            borderRadius: BORDER_RADIUS.sm,
            cursor: 'pointer',
            transition: `all ${TRANSITIONS.base}`,
            color: isActive ? color : COLORS.text.whiteMedium,
        }),
        tabIcon: {
            fontSize: '20px',
        },
        tabName: {
            fontSize: '11px',
            fontWeight: FONT_WEIGHTS.medium,
            whiteSpace: 'nowrap',
            textAlign: 'center',
        },
        agentContainer: {
            ...MIXINS.glassmorphicCard,
            borderRadius: BORDER_RADIUS.lg,
            overflow: 'hidden',
            flex: height === '100%' ? 1 : 'none',
        },
        loadingOverlay: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: height,
            color: COLORS.text.whiteMedium,
        },
    };

    // ========== Check if loading ==========
    const isLoading =
        (activeAgent === 'task' && loadingData.employees) ||
        (activeAgent === 'inventory' && loadingData.inventory);

    return (
        <div style={styles.container}>
            {/* Agent Tabs */}
            <div style={styles.tabsContainer}>
                {AGENTS.map(agent => (
                    <button
                        key={agent.id}
                        style={styles.tab(activeAgent === agent.id, agent.color)}
                        onClick={() => setActiveAgent(agent.id)}
                        onMouseEnter={(e) => {
                            if (activeAgent !== agent.id) {
                                e.currentTarget.style.backgroundColor = `${agent.color}10`;
                                e.currentTarget.style.borderColor = `${agent.color}50`;
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeAgent !== agent.id) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.borderColor = 'transparent';
                            }
                        }}
                        title={agent.description}
                    >
                        <span style={styles.tabIcon}>{agent.icon}</span>
                        <span style={styles.tabName}>{agent.name}</span>
                    </button>
                ))}
            </div>

            {/* Active Agent */}
            <div style={styles.agentContainer}>
                {isLoading ? (
                    <div style={styles.loadingOverlay}>
                        Loading {activeAgent} agent data...
                    </div>
                ) : (
                    renderAgent()
                )}
            </div>
        </div>
    );
};

export default UnifiedAgentSelector;
