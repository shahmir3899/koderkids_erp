// ============================================
// STAFF COMMAND INPUT COMPONENT
// Chat-style command input with persistent message history
// Location: frontend/src/components/staff/StaffCommandInput.js
// ============================================

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { toast } from 'react-toastify';
import {
    COLORS,
    SPACING,
    BORDER_RADIUS,
    SHADOWS,
    FONT_SIZES,
    TRANSITIONS
} from '../../utils/designConstants';
import commandService from '../../services/commandService';
import QuickActionsPanel from './QuickActionsPanel';
import ClarificationModal from './ClarificationModal';

const StaffCommandInput = forwardRef(({
    onCommandSuccess,
    showQuickActions = false, // Quick actions moved outside
    placeholder = "Type a command... (e.g., 'Show inventory summary')",
    autoFocus = false,
    compact = false,
    height = '400px' // Configurable height
}, ref) => {
    // ========== State ==========
    const [command, setCommand] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [chatHistory, setChatHistory] = useState([]); // Chat-style history

    // Clarification state
    const [clarificationData, setClarificationData] = useState(null);
    const [pendingCommandId, setPendingCommandId] = useState(null);

    // Refs
    const inputRef = useRef(null);
    const chatContainerRef = useRef(null);

    // Expose executeCommand to parent via ref
    useImperativeHandle(ref, () => ({
        executeCommand: (text) => executeCommand(text),
        setCommand: (text) => {
            setCommand(text);
            inputRef.current?.focus();
        }
    }));

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    // ========== Add Message to Chat ==========
    const addMessage = (type, content, data = null) => {
        const message = {
            id: Date.now(),
            type, // 'user', 'bot', 'error'
            content,
            data,
            timestamp: new Date()
        };
        setChatHistory(prev => [...prev, message]);
    };

    // ========== Command Execution ==========
    const executeCommand = async (commandText = command) => {
        if (!commandText.trim()) {
            toast.warning('Please enter a command');
            return;
        }

        // Add user message to chat
        addMessage('user', commandText);
        setCommand('');
        setIsExecuting(true);

        try {
            const result = await commandService.executeCommand(commandText);

            // Handle clarification needed
            if (result.needs_clarification) {
                setClarificationData(result.clarification);
                setPendingCommandId(result.command_id);
                addMessage('bot', result.clarification.message, { type: 'clarification' });
                return;
            }

            // Handle success/failure
            handleCommandResult(result, commandText);

        } catch (error) {
            console.error('Command error:', error);
            const errorData = error.response?.data;
            const errorMessage = errorData?.message || errorData?.error || errorData?.detail || 'Command execution failed';
            addMessage('error', errorMessage);

            // Show suggestions if available
            if (errorData?.suggestions && errorData.suggestions.length > 0) {
                const suggestionsText = errorData.suggestions.map(s => `• ${s.text}`).join('\n');
                addMessage('bot', `Try one of these:\n${suggestionsText}`);
            }
        } finally {
            setIsExecuting(false);
        }
    };

    const handleCommandResult = (result, commandText) => {
        // Add bot response to chat
        addMessage(
            result.success ? 'bot' : 'error',
            result.message || (result.success ? 'Command executed successfully' : 'Command failed'),
            result.data
        );

        // Clear cache to refresh data
        if (result.success) {
            commandService.clearCache();
        }

        // Callback
        if (onCommandSuccess && result.success) {
            onCommandSuccess(result);
        }
    };

    // ========== Clarification Handling ==========
    const handleClarificationSelect = async (selection) => {
        setClarificationData(null);
        setIsExecuting(true);

        // Show what user selected
        addMessage('user', `Selected: ${selection.label || selection.name || selection.id}`);

        try {
            const result = await commandService.continueCommand(pendingCommandId, selection);

            // Check for nested clarification
            if (result.needs_clarification) {
                setClarificationData(result.clarification);
                setPendingCommandId(result.command_id);
                addMessage('bot', result.clarification.message, { type: 'clarification' });
            } else {
                handleCommandResult(result);
                setPendingCommandId(null); // Only clear after final result
            }
        } catch (error) {
            console.error('Clarification error:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to process selection';
            addMessage('error', errorMsg);
            setPendingCommandId(null); // Clear on error
        } finally {
            setIsExecuting(false);
        }
    };

    const handleClarificationCancel = () => {
        setClarificationData(null);
        setPendingCommandId(null);
        addMessage('bot', 'Command cancelled');
    };

    // ========== Quick Action Handling ==========
    const handleQuickAction = (action) => {
        // If action has required params, show them as placeholders
        if (action.required_params && action.required_params.length > 0) {
            const template = action.command_template;
            setCommand(template);
            inputRef.current?.focus();
            // Select the first placeholder
            setTimeout(() => {
                const input = inputRef.current;
                if (input) {
                    const match = template.match(/\{(\w+)\}/);
                    if (match) {
                        const start = match.index;
                        const end = start + match[0].length;
                        input.setSelectionRange(start, end);
                    }
                }
            }, 100);
        } else {
            // Execute directly if no params needed
            executeCommand(action.command_template);
        }
    };

    // ========== Keyboard Handler ==========
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            executeCommand();
        }
    };

    // ========== Clear Chat ==========
    const clearChat = () => {
        setChatHistory([]);
    };

    // ========== Format Data for Display ==========
    const formatDataDisplay = (data) => {
        if (!data) return null;

        // Handle results array
        if (data.results && Array.isArray(data.results)) {
            return (
                <div style={styles.dataTable}>
                    <div style={styles.dataHeader}>
                        Found {data.count || data.results.length} item(s)
                    </div>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                {Object.keys(data.results[0] || {})
                                    .filter(k => typeof data.results[0][k] !== 'object')
                                    .slice(0, 4)
                                    .map(key => (
                                        <th key={key} style={styles.th}>
                                            {key.replace(/_/g, ' ')}
                                        </th>
                                    ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.results.slice(0, 5).map((item, idx) => (
                                <tr key={idx}>
                                    {Object.entries(item)
                                        .filter(([k, v]) => typeof v !== 'object')
                                        .slice(0, 4)
                                        .map(([key, value]) => (
                                            <td key={key} style={styles.td}>
                                                {value ?? '-'}
                                            </td>
                                        ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data.results.length > 5 && (
                        <div style={styles.moreItems}>
                            +{data.results.length - 5} more items
                        </div>
                    )}
                </div>
            );
        }

        // Handle summary data
        if (data.by_status || data.by_category || data.total_value !== undefined) {
            return (
                <div style={styles.summaryGrid}>
                    {data.total_items !== undefined && (
                        <div style={styles.summaryItem}>
                            <div style={styles.summaryValue}>{data.total_items}</div>
                            <div style={styles.summaryLabel}>Total Items</div>
                        </div>
                    )}
                    {data.total_value !== undefined && (
                        <div style={styles.summaryItem}>
                            <div style={styles.summaryValue}>PKR {Number(data.total_value).toLocaleString()}</div>
                            <div style={styles.summaryLabel}>Total Value</div>
                        </div>
                    )}
                    {data.by_status && data.by_status.map((item, idx) => (
                        <div key={idx} style={styles.summaryItem}>
                            <div style={styles.summaryValue}>{item.count}</div>
                            <div style={styles.summaryLabel}>{item.status}</div>
                        </div>
                    ))}
                </div>
            );
        }

        // Handle fee summary data
        if (data.total_fee !== undefined || data.paid_amount !== undefined) {
            return (
                <div style={styles.summaryGrid}>
                    {data.total_fee !== undefined && (
                        <div style={styles.summaryItem}>
                            <div style={styles.summaryValue}>PKR {Number(data.total_fee).toLocaleString()}</div>
                            <div style={styles.summaryLabel}>Total Fee</div>
                        </div>
                    )}
                    {data.paid_amount !== undefined && (
                        <div style={styles.summaryItem}>
                            <div style={{...styles.summaryValue, color: COLORS.status.success}}>
                                PKR {Number(data.paid_amount).toLocaleString()}
                            </div>
                            <div style={styles.summaryLabel}>Paid</div>
                        </div>
                    )}
                    {data.balance_due !== undefined && (
                        <div style={styles.summaryItem}>
                            <div style={{...styles.summaryValue, color: COLORS.status.error}}>
                                PKR {Number(data.balance_due).toLocaleString()}
                            </div>
                            <div style={styles.summaryLabel}>Due</div>
                        </div>
                    )}
                </div>
            );
        }

        // Generic object display
        if (typeof data === 'object' && Object.keys(data).length > 0) {
            return (
                <div style={styles.genericData}>
                    {Object.entries(data).slice(0, 6).map(([key, value]) => (
                        <div key={key} style={styles.dataRow}>
                            <span style={styles.dataKey}>{key.replace(/_/g, ' ')}:</span>
                            <span style={styles.dataValue}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }

        return null;
    };

    // ========== Styles ==========
    const styles = {
        container: {
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            height: height,
            backgroundColor: COLORS.background.white,
            borderRadius: BORDER_RADIUS.lg,
            boxShadow: SHADOWS.md,
            overflow: 'hidden',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: `${SPACING.sm} ${SPACING.md}`,
            borderBottom: `1px solid ${COLORS.border.light}`,
            backgroundColor: COLORS.background.gray,
        },
        headerTitle: {
            fontSize: FONT_SIZES.sm,
            fontWeight: 600,
            color: COLORS.text.primary,
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.xs,
        },
        clearButton: {
            padding: `${SPACING.xs} ${SPACING.sm}`,
            fontSize: FONT_SIZES.xs,
            backgroundColor: 'transparent',
            border: 'none',
            color: COLORS.text.secondary,
            cursor: 'pointer',
            borderRadius: BORDER_RADIUS.sm,
        },
        chatContainer: {
            flex: 1,
            overflowY: 'auto',
            padding: SPACING.md,
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.md,
        },
        emptyState: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: COLORS.text.muted,
            fontSize: FONT_SIZES.sm,
            textAlign: 'center',
            padding: SPACING.lg,
        },
        message: {
            maxWidth: '85%',
            padding: SPACING.sm,
            borderRadius: BORDER_RADIUS.lg,
            fontSize: FONT_SIZES.sm,
            lineHeight: 1.5,
        },
        userMessage: {
            alignSelf: 'flex-end',
            backgroundColor: COLORS.primary,
            color: COLORS.text.white,
            borderBottomRightRadius: BORDER_RADIUS.xs,
        },
        botMessage: {
            alignSelf: 'flex-start',
            backgroundColor: COLORS.background.gray,
            color: COLORS.text.primary,
            borderBottomLeftRadius: BORDER_RADIUS.xs,
        },
        errorMessage: {
            alignSelf: 'flex-start',
            backgroundColor: `${COLORS.status.error}15`,
            color: COLORS.status.error,
            borderBottomLeftRadius: BORDER_RADIUS.xs,
            border: `1px solid ${COLORS.status.error}30`,
        },
        messageTime: {
            fontSize: '10px',
            color: COLORS.text.muted,
            marginTop: '4px',
            textAlign: 'right',
        },
        inputContainer: {
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm,
            padding: SPACING.md,
            borderTop: `1px solid ${COLORS.border.light}`,
            backgroundColor: COLORS.background.white,
        },
        input: {
            flex: 1,
            padding: `${SPACING.sm} ${SPACING.md}`,
            border: `1px solid ${COLORS.border.light}`,
            borderRadius: BORDER_RADIUS.full,
            fontSize: FONT_SIZES.sm,
            outline: 'none',
            transition: TRANSITIONS.fast,
        },
        sendButton: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            backgroundColor: COLORS.primary,
            color: COLORS.text.white,
            border: 'none',
            borderRadius: BORDER_RADIUS.full,
            cursor: 'pointer',
            transition: TRANSITIONS.fast,
            fontSize: FONT_SIZES.md,
        },
        sendButtonDisabled: {
            backgroundColor: COLORS.text.disabled,
            cursor: 'not-allowed',
        },
        typing: {
            alignSelf: 'flex-start',
            padding: SPACING.sm,
            color: COLORS.text.muted,
            fontSize: FONT_SIZES.sm,
            fontStyle: 'italic',
        },
        // Data display styles
        dataTable: {
            marginTop: SPACING.sm,
            backgroundColor: COLORS.background.white,
            borderRadius: BORDER_RADIUS.md,
            overflow: 'hidden',
        },
        dataHeader: {
            padding: SPACING.xs,
            fontSize: FONT_SIZES.xs,
            color: COLORS.text.secondary,
            borderBottom: `1px solid ${COLORS.border.light}`,
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: FONT_SIZES.xs,
        },
        th: {
            padding: SPACING.xs,
            textAlign: 'left',
            fontWeight: 600,
            color: COLORS.text.secondary,
            borderBottom: `1px solid ${COLORS.border.light}`,
            textTransform: 'capitalize',
        },
        td: {
            padding: SPACING.xs,
            borderBottom: `1px solid ${COLORS.border.light}`,
            color: COLORS.text.primary,
        },
        moreItems: {
            padding: SPACING.xs,
            fontSize: FONT_SIZES.xs,
            color: COLORS.text.muted,
            textAlign: 'center',
        },
        summaryGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
            gap: SPACING.sm,
            marginTop: SPACING.sm,
        },
        summaryItem: {
            backgroundColor: COLORS.background.white,
            padding: SPACING.sm,
            borderRadius: BORDER_RADIUS.md,
            textAlign: 'center',
        },
        summaryValue: {
            fontSize: FONT_SIZES.md,
            fontWeight: 700,
            color: COLORS.primary,
        },
        summaryLabel: {
            fontSize: FONT_SIZES.xs,
            color: COLORS.text.secondary,
            textTransform: 'capitalize',
        },
        genericData: {
            marginTop: SPACING.sm,
            fontSize: FONT_SIZES.xs,
        },
        dataRow: {
            display: 'flex',
            gap: SPACING.xs,
            marginBottom: '4px',
        },
        dataKey: {
            color: COLORS.text.secondary,
            textTransform: 'capitalize',
        },
        dataValue: {
            color: COLORS.text.primary,
            fontWeight: 500,
        },
    };

    // ========== Render ==========
    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <span style={styles.headerTitle}>
                    <span>🤖</span> Command Assistant
                </span>
                {chatHistory.length > 0 && (
                    <button onClick={clearChat} style={styles.clearButton}>
                        Clear
                    </button>
                )}
            </div>

            {/* Chat Messages */}
            <div ref={chatContainerRef} style={styles.chatContainer}>
                {chatHistory.length === 0 ? (
                    <div style={styles.emptyState}>
                        <span style={{ fontSize: '32px', marginBottom: SPACING.sm }}>💬</span>
                        <p>Type a command or use quick actions below</p>
                        <p style={{ fontSize: FONT_SIZES.xs, marginTop: SPACING.xs }}>
                            Try: "Show inventory summary" or "Show fee summary"
                        </p>
                    </div>
                ) : (
                    chatHistory.map((msg) => (
                        <div
                            key={msg.id}
                            style={{
                                ...styles.message,
                                ...(msg.type === 'user' ? styles.userMessage :
                                    msg.type === 'error' ? styles.errorMessage : styles.botMessage)
                            }}
                        >
                            <div>{msg.content}</div>
                            {msg.data && msg.data.type !== 'clarification' && formatDataDisplay(msg.data)}
                            <div style={{
                                ...styles.messageTime,
                                color: msg.type === 'user' ? 'rgba(255,255,255,0.7)' : COLORS.text.muted
                            }}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))
                )}
                {isExecuting && (
                    <div style={styles.typing}>
                        Thinking...
                    </div>
                )}
            </div>

            {/* Quick Actions (Collapsible) */}
            {showQuickActions && !compact && (
                <QuickActionsPanel
                    onActionSelect={handleQuickAction}
                    compact={true}
                />
            )}

            {/* Input */}
            <div style={styles.inputContainer}>
                <input
                    ref={inputRef}
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={isExecuting}
                    autoFocus={autoFocus}
                    style={styles.input}
                    onFocus={(e) => {
                        e.target.style.borderColor = COLORS.primary;
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = COLORS.border.light;
                    }}
                />
                <button
                    onClick={() => executeCommand()}
                    disabled={isExecuting || !command.trim()}
                    style={{
                        ...styles.sendButton,
                        ...(isExecuting || !command.trim() ? styles.sendButtonDisabled : {})
                    }}
                >
                    {isExecuting ? '⏳' : '➤'}
                </button>
            </div>

            {/* Clarification Modal */}
            <ClarificationModal
                isOpen={!!clarificationData}
                clarification={clarificationData}
                onSelect={handleClarificationSelect}
                onCancel={handleClarificationCancel}
                isLoading={isExecuting}
            />
        </div>
    );
});

// Display name for debugging
StaffCommandInput.displayName = 'StaffCommandInput';

export default StaffCommandInput;
