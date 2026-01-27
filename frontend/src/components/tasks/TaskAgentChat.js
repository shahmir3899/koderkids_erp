// ============================================
// TASK AGENT CHAT COMPONENT
// AI-powered chat interface for task assignment
// Location: frontend/src/components/tasks/TaskAgentChat.js
// ============================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
    COLORS,
    SPACING,
    BORDER_RADIUS,
    FONT_SIZES,
    TRANSITIONS
} from '../../utils/designConstants';
import {
    executeAICommand,
    confirmAIAction,
    checkAIHealth,
    buildTaskContext
} from '../../services/aiService';

// Shared Agent Chat Components
import { AgentChatInput, useSpeechSynthesis } from '../agentChat';

// Example prompts for users
const EXAMPLE_PROMPTS = [
    "Tell Ahmed to submit reports by Friday",
    "Ask Sara to prepare exam papers for Monday",
    "Assign inventory check task to Ali urgently",
    "Remind Hassan to complete attendance by tomorrow"
];

// ============================================
// MAIN COMPONENT
// ============================================
const TaskAgentChat = ({ employees = [], onTaskCreated, height = '450px' }) => {
    // ========== State ==========
    const [chatHistory, setChatHistory] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiAvailable, setAiAvailable] = useState(null);
    const [pendingConfirmation, setPendingConfirmation] = useState(null);

    // Editable task fields for confirmation modal (single task)
    const [editableTask, setEditableTask] = useState({
        description: '',
        due_date: '',
        priority: 'medium'
    });

    // Bulk task slideshow state
    const [bulkSlideIndex, setBulkSlideIndex] = useState(0);
    const [bulkTaskEdits, setBulkTaskEdits] = useState([]); // Array of edits for each employee

    // Refs
    const chatContainerRef = useRef(null);
    const inputRef = useRef(null);

    // ========== Speech Synthesis (Auto-play bot responses) ==========
    const { speak, stop: stopSpeaking, isSupported: speechSupported } = useSpeechSynthesis();
    const lastBotMessageRef = useRef(null);

    // Auto-speak bot messages
    useEffect(() => {
        if (!speechSupported || chatHistory.length === 0) return;

        const lastMessage = chatHistory[chatHistory.length - 1];
        if (lastMessage.type === 'bot' && lastMessage.id !== lastBotMessageRef.current) {
            lastBotMessageRef.current = lastMessage.id;
            const textToSpeak = lastMessage.content.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
            if (textToSpeak) {
                speak(textToSpeak);
            }
        }
    }, [chatHistory, speechSupported, speak]);

    // Stop speaking when user starts typing
    useEffect(() => {
        if (inputMessage.length > 0) {
            stopSpeaking();
        }
    }, [inputMessage, stopSpeaking]);

    // ========== Check AI Health on Mount ==========
    useEffect(() => {
        const checkHealth = async () => {
            const health = await checkAIHealth();
            setAiAvailable(health.ai_available);
            if (!health.ai_available) {
                addMessage('system', 'AI service is currently unavailable. Please try again later.');
            }
        };
        checkHealth();
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    // ========== Add Message ==========
    const addMessage = useCallback((type, content, data = null) => {
        setChatHistory(prev => [...prev, {
            id: Date.now(),
            type,
            content,
            data,
            timestamp: new Date()
        }]);
    }, []);

    // ========== Build Conversation History for AI ==========
    const buildConversationHistory = () => {
        return chatHistory.slice(-6).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content,
            data: msg.data || null
        }));
    };

    // ========== Handle Example Click ==========
    const handleExampleClick = (example) => {
        setInputMessage(example);
        inputRef.current?.focus();
    };

    // ========== Handle Natural Language Input ==========
    const handleSendMessage = async () => {
        const message = inputMessage.trim();
        if (!message || isProcessing) return;

        setInputMessage('');
        addMessage('user', message);
        setIsProcessing(true);

        try {
            const context = buildTaskContext(employees);
            const conversationHistory = buildConversationHistory();

            const result = await executeAICommand({
                message,
                agent: 'task',
                context,
                conversationHistory
            });

            console.log('Task AI Result:', result);

            // Handle different response types
            if (result.needs_confirmation) {
                // Extract task data for editable fields
                const taskData = result.data?.details?.[0] || result.data?.items?.[0] || {};

                // Check if this is a bulk task
                if (taskData.is_bulk && taskData.employees) {
                    // Initialize edits for each employee with the same base values
                    const baseDescription = taskData.full_description || taskData.description || '';
                    const baseDueDate = taskData.due_date || '';
                    const basePriority = taskData.priority || 'medium';

                    const initialEdits = taskData.employees.map(emp => ({
                        employee_id: emp.id,
                        employee_name: emp.name,
                        employee_role: emp.role,
                        description: baseDescription,
                        due_date: baseDueDate,
                        priority: basePriority,
                        included: true  // Can be toggled to exclude
                    }));

                    setBulkTaskEdits(initialEdits);
                    setBulkSlideIndex(0);
                } else {
                    // Single task - use existing editableTask state
                    setEditableTask({
                        description: taskData.full_description || taskData.description || '',
                        due_date: taskData.due_date || '',
                        priority: taskData.priority || 'medium'
                    });
                }

                // Show task preview for confirmation
                setPendingConfirmation({
                    token: result.confirmation_token,
                    action: result.action,
                    message: result.message,
                    data: result.data
                });
            } else if (result.action === 'CLARIFY') {
                addMessage('bot', `${result.message}`);
            } else if (result.action === 'CHAT') {
                addMessage('bot', `${result.message}`);
            } else if (result.fallback_to_templates) {
                addMessage('bot', `${result.message}\n\nPlease try again with a clearer request.`);
            } else if (result.success) {
                addMessage('bot', `${result.message}`, result.data);
                if (onTaskCreated) onTaskCreated();
            } else {
                addMessage('error', result.message || 'Operation failed');
            }

        } catch (error) {
            console.error('Task AI command error:', error);
            addMessage('error', 'Failed to process command. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    // ========== Handle Confirmation ==========
    const handleConfirm = async (confirmed) => {
        if (!pendingConfirmation) return;

        const taskData = pendingConfirmation.data?.details?.[0] || pendingConfirmation.data?.items?.[0] || {};
        const isBulk = taskData.is_bulk;

        setIsProcessing(true);
        try {
            let editedParams = null;

            if (confirmed) {
                if (isBulk) {
                    // For bulk tasks, pass the array of task edits (only included ones)
                    const includedTasks = bulkTaskEdits.filter(t => t.included);
                    editedParams = {
                        bulk_edits: includedTasks.map(t => ({
                            employee_id: t.employee_id,
                            description: t.description,
                            due_date: t.due_date,
                            priority: t.priority
                        }))
                    };
                } else {
                    // Single task - use existing editableTask
                    editedParams = {
                        description: editableTask.description,
                        due_date: editableTask.due_date,
                        priority: editableTask.priority
                    };
                }
            }

            const result = await confirmAIAction(pendingConfirmation.token, confirmed, editedParams);

            if (confirmed) {
                if (result.success) {
                    addMessage('bot', `${result.message}`, result.data);
                    if (onTaskCreated) onTaskCreated();
                } else {
                    addMessage('error', result.message || 'Failed to create task');
                }
            } else {
                addMessage('bot', 'Task creation cancelled');
            }
        } catch (error) {
            addMessage('error', 'Confirmation failed');
        } finally {
            setPendingConfirmation(null);
            setBulkSlideIndex(0);
            setBulkTaskEdits([]);
            setIsProcessing(false);
        }
    };

    // ========== Handle Key Press ==========
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // ========== Update bulk task edit ==========
    const updateBulkTaskEdit = (index, field, value) => {
        setBulkTaskEdits(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    // ========== Render Confirmation Modal ==========
    const renderConfirmation = () => {
        if (!pendingConfirmation) return null;

        const taskData = pendingConfirmation.data?.details?.[0] || pendingConfirmation.data?.items?.[0] || {};
        const isBulk = taskData.is_bulk && bulkTaskEdits.length > 0;

        // For bulk tasks, render slideshow
        if (isBulk) {
            const currentTask = bulkTaskEdits[bulkSlideIndex];
            const includedCount = bulkTaskEdits.filter(t => t.included).length;
            const totalCount = bulkTaskEdits.length;

            return (
                <div style={styles.confirmationOverlay}>
                    <div style={{ ...styles.confirmationBox, maxWidth: '550px' }}>
                        {/* Header with slide indicator */}
                        <div style={styles.confirmationHeader}>
                            <span style={{ fontSize: '1.5rem' }}>📋</span>
                            <span style={{ fontWeight: 600 }}>Task {bulkSlideIndex + 1} of {totalCount}</span>
                            <span style={{ fontSize: FONT_SIZES.xs, color: COLORS.text.whiteSubtle, marginLeft: 'auto' }}>
                                {includedCount} tasks selected
                            </span>
                        </div>

                        {/* Progress dots */}
                        <div style={styles.slideProgress}>
                            {bulkTaskEdits.map((task, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setBulkSlideIndex(idx)}
                                    style={{
                                        ...styles.progressDot,
                                        backgroundColor: idx === bulkSlideIndex
                                            ? COLORS.primary
                                            : task.included
                                                ? 'rgba(34, 197, 94, 0.6)'
                                                : 'rgba(255,255,255,0.2)',
                                        cursor: 'pointer',
                                        transform: idx === bulkSlideIndex ? 'scale(1.3)' : 'scale(1)'
                                    }}
                                    title={`${task.employee_name} ${task.included ? '✓' : '(excluded)'}`}
                                />
                            ))}
                        </div>

                        <div style={styles.confirmationBody}>
                            {/* Include/Exclude toggle */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: SPACING.sm,
                                marginBottom: SPACING.md,
                                padding: SPACING.sm,
                                backgroundColor: currentTask.included ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                borderRadius: BORDER_RADIUS.md,
                                border: `1px solid ${currentTask.included ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                            }}>
                                <input
                                    type="checkbox"
                                    checked={currentTask.included}
                                    onChange={(e) => updateBulkTaskEdit(bulkSlideIndex, 'included', e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <span style={{ color: COLORS.text.white, fontSize: FONT_SIZES.sm }}>
                                    {currentTask.included ? 'Include this task' : 'Task excluded'}
                                </span>
                            </div>

                            <div style={{ ...styles.taskPreview, opacity: currentTask.included ? 1 : 0.5 }}>
                                {/* Employee Name & Role */}
                                <div style={styles.previewRow}>
                                    <span style={styles.previewLabel}>Assign To:</span>
                                    <span style={styles.previewValue}>
                                        {currentTask.employee_name}
                                        <span style={styles.roleBadge}>{currentTask.employee_role}</span>
                                    </span>
                                </div>

                                {/* Due Date */}
                                <div style={styles.previewRow}>
                                    <span style={styles.previewLabel}>Due Date:</span>
                                    <input
                                        type="date"
                                        value={currentTask.due_date}
                                        onChange={(e) => updateBulkTaskEdit(bulkSlideIndex, 'due_date', e.target.value)}
                                        style={styles.editableInput}
                                        disabled={!currentTask.included}
                                    />
                                </div>

                                {/* Priority */}
                                <div style={styles.previewRow}>
                                    <span style={styles.previewLabel}>Priority:</span>
                                    <select
                                        value={currentTask.priority}
                                        onChange={(e) => updateBulkTaskEdit(bulkSlideIndex, 'priority', e.target.value)}
                                        disabled={!currentTask.included}
                                        style={{
                                            ...styles.editableInput,
                                            backgroundColor: getPriorityColor(currentTask.priority),
                                            color: '#fff',
                                            fontWeight: 600,
                                            cursor: currentTask.included ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>

                                {/* Description */}
                                <div style={{ ...styles.previewRow, flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.xs }}>
                                    <span style={styles.previewLabel}>Task Description:</span>
                                    <textarea
                                        value={currentTask.description}
                                        onChange={(e) => updateBulkTaskEdit(bulkSlideIndex, 'description', e.target.value)}
                                        style={styles.editableTextarea}
                                        rows={4}
                                        disabled={!currentTask.included}
                                        placeholder="Enter task description..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Navigation and Actions */}
                        <div style={styles.slideNavigation}>
                            <button
                                style={{
                                    ...styles.navButton,
                                    opacity: bulkSlideIndex > 0 ? 1 : 0.3
                                }}
                                onClick={() => setBulkSlideIndex(prev => Math.max(0, prev - 1))}
                                disabled={bulkSlideIndex === 0}
                            >
                                ← Previous
                            </button>

                            <div style={{ display: 'flex', gap: SPACING.sm }}>
                                <button
                                    style={styles.cancelButton}
                                    onClick={() => handleConfirm(false)}
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </button>
                                <button
                                    style={{
                                        ...styles.confirmButton,
                                        opacity: includedCount === 0 ? 0.5 : 1
                                    }}
                                    onClick={() => handleConfirm(true)}
                                    disabled={isProcessing || includedCount === 0}
                                >
                                    {isProcessing ? 'Creating...' : `Create ${includedCount} Task${includedCount !== 1 ? 's' : ''}`}
                                </button>
                            </div>

                            <button
                                style={{
                                    ...styles.navButton,
                                    opacity: bulkSlideIndex < totalCount - 1 ? 1 : 0.3
                                }}
                                onClick={() => setBulkSlideIndex(prev => Math.min(totalCount - 1, prev + 1))}
                                disabled={bulkSlideIndex === totalCount - 1}
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // Single task confirmation (original behavior)
        return (
            <div style={styles.confirmationOverlay}>
                <div style={styles.confirmationBox}>
                    <div style={styles.confirmationHeader}>
                        <span style={{ fontSize: '1.5rem' }}>📋</span>
                        <span style={{ fontWeight: 600 }}>Task Preview</span>
                        <span style={{ fontSize: FONT_SIZES.xs, color: COLORS.text.whiteSubtle, marginLeft: 'auto' }}>
                            Edit before creating
                        </span>
                    </div>

                    <div style={styles.confirmationBody}>
                        <div style={styles.taskPreview}>
                            {/* Assign To */}
                            <div style={styles.previewRow}>
                                <span style={styles.previewLabel}>Assign To:</span>
                                <span style={styles.previewValue}>
                                    {taskData.employee_name || 'Employee'}
                                    {taskData.employee_role && (
                                        <span style={styles.roleBadge}>
                                            {taskData.employee_role}
                                        </span>
                                    )}
                                </span>
                            </div>

                            {/* Due Date */}
                            <div style={styles.previewRow}>
                                <span style={styles.previewLabel}>Due Date:</span>
                                <input
                                    type="date"
                                    value={editableTask.due_date}
                                    onChange={(e) => setEditableTask(prev => ({ ...prev, due_date: e.target.value }))}
                                    style={styles.editableInput}
                                />
                            </div>

                            {/* Priority */}
                            <div style={styles.previewRow}>
                                <span style={styles.previewLabel}>Priority:</span>
                                <select
                                    value={editableTask.priority}
                                    onChange={(e) => setEditableTask(prev => ({ ...prev, priority: e.target.value }))}
                                    style={{
                                        ...styles.editableInput,
                                        backgroundColor: getPriorityColor(editableTask.priority),
                                        color: '#fff',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>

                            {/* Description */}
                            <div style={{ ...styles.previewRow, flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.xs }}>
                                <span style={styles.previewLabel}>Task Description:</span>
                                <textarea
                                    value={editableTask.description}
                                    onChange={(e) => setEditableTask(prev => ({ ...prev, description: e.target.value }))}
                                    style={styles.editableTextarea}
                                    rows={5}
                                    placeholder="Enter task description..."
                                />
                            </div>
                        </div>

                        <div style={styles.confirmQuestion}>
                            Review and edit if needed, then create the task
                        </div>
                    </div>

                    <div style={styles.confirmationActions}>
                        <button
                            style={styles.cancelButton}
                            onClick={() => handleConfirm(false)}
                            disabled={isProcessing}
                        >
                            Cancel
                        </button>
                        <button
                            style={styles.confirmButton}
                            onClick={() => handleConfirm(true)}
                            disabled={isProcessing || !editableTask.description.trim()}
                        >
                            {isProcessing ? 'Creating...' : 'Create Task'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ========== Get Priority Color ==========
    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'urgent': return '#EF4444';
            case 'high': return '#F97316';
            case 'medium': return '#EAB308';
            case 'low': return '#22C55E';
            default: return '#6B7280';
        }
    };

    // ========== Render Message ==========
    const renderMessage = (msg) => {
        const isUser = msg.type === 'user';
        const isError = msg.type === 'error';
        const isSystem = msg.type === 'system';
        const isBot = msg.type === 'bot';

        // Get the appropriate style based on message type
        const getMessageStyle = () => {
            if (isUser) return { ...styles.message, ...styles.userMessage };
            if (isError) return { ...styles.message, ...styles.errorMessage };
            if (isSystem) return { ...styles.message, ...styles.systemMessage };
            return { ...styles.message, ...styles.botMessage };
        };

        return (
            <div key={msg.id} style={getMessageStyle()}>
                <div>
                    {msg.content}
                    {msg.data && msg.data.task_id && (
                        <div style={styles.taskCreatedBadge}>
                            Task #{msg.data.task_id} created
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ========== Styles ==========
    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            height,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: BORDER_RADIUS.lg,
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden'
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: SPACING.md,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(255,255,255,0.03)'
        },
        headerTitle: {
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm,
            fontSize: FONT_SIZES.md,
            fontWeight: 600,
            color: COLORS.text.white
        },
        aiStatus: {
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.xs,
            fontSize: FONT_SIZES.xs,
            color: aiAvailable ? '#4ADE80' : '#F87171'
        },
        statusDot: {
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: aiAvailable ? '#4ADE80' : '#F87171'
        },
        chatArea: {
            flex: 1,
            overflowY: 'auto',
            padding: SPACING.md,
            display: 'flex',
            flexDirection: 'column'
        },
        welcomeSection: {
            textAlign: 'center',
            padding: SPACING.lg,
            color: COLORS.text.whiteSubtle
        },
        welcomeTitle: {
            fontSize: FONT_SIZES.lg,
            fontWeight: 600,
            color: COLORS.text.white,
            marginBottom: SPACING.sm
        },
        welcomeText: {
            fontSize: FONT_SIZES.sm,
            marginBottom: SPACING.lg
        },
        examplesGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: SPACING.sm
        },
        exampleButton: {
            padding: SPACING.sm,
            fontSize: FONT_SIZES.xs,
            color: COLORS.text.white,
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: BORDER_RADIUS.md,
            cursor: 'pointer',
            textAlign: 'left',
            transition: `all ${TRANSITIONS.fast}`,
            ':hover': {
                backgroundColor: 'rgba(255,255,255,0.15)'
            }
        },
        // Message styles matching FeeAgentChat bubble pattern
        message: {
            maxWidth: '85%',
            padding: SPACING.sm,
            borderRadius: BORDER_RADIUS.lg,
            fontSize: FONT_SIZES.sm,
            lineHeight: 1.5,
            marginBottom: SPACING.sm,
            whiteSpace: 'pre-line'
        },
        userMessage: {
            alignSelf: 'flex-end',
            marginLeft: 'auto',
            backgroundColor: COLORS.primary,
            color: COLORS.text.white,
            borderBottomRightRadius: BORDER_RADIUS.xs
        },
        botMessage: {
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: COLORS.text.white,
            borderBottomLeftRadius: BORDER_RADIUS.xs
        },
        errorMessage: {
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            color: '#FCA5A5',
            borderBottomLeftRadius: BORDER_RADIUS.xs
        },
        systemMessage: {
            alignSelf: 'center',
            backgroundColor: 'rgba(251, 191, 36, 0.2)',
            color: '#FCD34D',
            borderRadius: BORDER_RADIUS.md,
            fontSize: FONT_SIZES.xs,
            textAlign: 'center'
        },
        taskCreatedBadge: {
            display: 'inline-block',
            marginTop: SPACING.sm,
            padding: `${SPACING.xs} ${SPACING.sm}`,
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid rgba(34, 197, 94, 0.5)',
            borderRadius: BORDER_RADIUS.sm,
            fontSize: FONT_SIZES.xs,
            color: '#22C55E'
        },
        inputArea: {
            display: 'flex',
            gap: SPACING.sm,
            padding: SPACING.md,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(255,255,255,0.03)'
        },
        input: {
            flex: 1,
            padding: SPACING.md,
            fontSize: FONT_SIZES.sm,
            color: COLORS.text.white,
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: BORDER_RADIUS.md,
            outline: 'none',
            transition: `all ${TRANSITIONS.fast}`
        },
        sendButton: {
            padding: `${SPACING.sm} ${SPACING.lg}`,
            fontSize: FONT_SIZES.sm,
            fontWeight: 600,
            color: COLORS.text.white,
            backgroundColor: COLORS.status.success,
            border: 'none',
            borderRadius: BORDER_RADIUS.md,
            cursor: 'pointer',
            transition: `all ${TRANSITIONS.fast}`,
            opacity: isProcessing ? 0.6 : 1
        },
        // Confirmation modal styles
        confirmationOverlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: SPACING.lg
        },
        confirmationBox: {
            backgroundColor: 'rgba(30, 41, 59, 0.98)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: BORDER_RADIUS.xl,
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        },
        confirmationHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm,
            padding: SPACING.lg,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            color: COLORS.text.white,
            fontSize: FONT_SIZES.lg
        },
        confirmationBody: {
            padding: SPACING.lg
        },
        taskPreview: {
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.md
        },
        previewRow: {
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.md
        },
        previewLabel: {
            color: COLORS.text.whiteSubtle,
            fontSize: FONT_SIZES.sm,
            minWidth: '80px'
        },
        previewValue: {
            color: COLORS.text.white,
            fontSize: FONT_SIZES.sm,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm
        },
        roleBadge: {
            padding: `2px ${SPACING.sm}`,
            backgroundColor: 'rgba(99, 102, 241, 0.3)',
            border: '1px solid rgba(99, 102, 241, 0.5)',
            borderRadius: BORDER_RADIUS.full,
            fontSize: FONT_SIZES.xs,
            color: '#A5B4FC',
            fontWeight: 500
        },
        employeeList: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: SPACING.xs,
            maxHeight: '120px',
            overflowY: 'auto',
            width: '100%',
            padding: SPACING.sm,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: BORDER_RADIUS.md,
            border: '1px solid rgba(255,255,255,0.1)'
        },
        employeeChip: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: `${SPACING.xs} ${SPACING.sm}`,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: BORDER_RADIUS.full,
            fontSize: FONT_SIZES.xs,
            color: COLORS.text.white
        },
        roleChipSmall: {
            padding: '1px 4px',
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: BORDER_RADIUS.sm,
            fontSize: '10px',
            color: COLORS.text.whiteSubtle
        },
        moreChip: {
            display: 'inline-flex',
            alignItems: 'center',
            padding: `${SPACING.xs} ${SPACING.sm}`,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: BORDER_RADIUS.full,
            fontSize: FONT_SIZES.xs,
            color: COLORS.text.whiteSubtle,
            fontStyle: 'italic'
        },
        priorityBadge: {
            padding: `${SPACING.xs} ${SPACING.sm}`,
            borderRadius: BORDER_RADIUS.full,
            fontSize: FONT_SIZES.xs,
            fontWeight: 600,
            color: '#fff'
        },
        descriptionBox: {
            width: '100%',
            padding: SPACING.md,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: BORDER_RADIUS.md,
            color: COLORS.text.white,
            fontSize: FONT_SIZES.sm,
            lineHeight: 1.5,
            border: '1px solid rgba(255,255,255,0.1)'
        },
        editableInput: {
            flex: 1,
            padding: SPACING.sm,
            fontSize: FONT_SIZES.sm,
            color: COLORS.text.white,
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: BORDER_RADIUS.md,
            outline: 'none',
            transition: `all ${TRANSITIONS.fast}`
        },
        editableTextarea: {
            width: '100%',
            padding: SPACING.md,
            fontSize: FONT_SIZES.sm,
            color: COLORS.text.white,
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: BORDER_RADIUS.md,
            outline: 'none',
            resize: 'vertical',
            minHeight: '100px',
            lineHeight: 1.5,
            fontFamily: 'inherit',
            transition: `all ${TRANSITIONS.fast}`
        },
        confirmQuestion: {
            marginTop: SPACING.lg,
            padding: SPACING.md,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderRadius: BORDER_RADIUS.md,
            color: COLORS.text.white,
            fontSize: FONT_SIZES.sm,
            textAlign: 'center'
        },
        confirmationActions: {
            display: 'flex',
            gap: SPACING.md,
            padding: SPACING.lg,
            borderTop: '1px solid rgba(255,255,255,0.1)'
        },
        // Slideshow styles for bulk tasks
        slideProgress: {
            display: 'flex',
            justifyContent: 'center',
            gap: '6px',
            padding: `${SPACING.sm} ${SPACING.lg}`,
            backgroundColor: 'rgba(0,0,0,0.2)',
            flexWrap: 'wrap'
        },
        progressDot: {
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            transition: `all ${TRANSITIONS.fast}`
        },
        slideNavigation: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: SPACING.md,
            padding: SPACING.lg,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            flexWrap: 'wrap'
        },
        navButton: {
            padding: `${SPACING.sm} ${SPACING.md}`,
            fontSize: FONT_SIZES.sm,
            fontWeight: 500,
            color: COLORS.text.white,
            backgroundColor: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: BORDER_RADIUS.md,
            cursor: 'pointer',
            transition: `all ${TRANSITIONS.fast}`,
            minWidth: '90px'
        },
        cancelButton: {
            flex: 1,
            padding: SPACING.md,
            fontSize: FONT_SIZES.sm,
            fontWeight: 600,
            color: COLORS.text.white,
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: BORDER_RADIUS.md,
            cursor: 'pointer'
        },
        confirmButton: {
            flex: 1,
            padding: SPACING.md,
            fontSize: FONT_SIZES.sm,
            fontWeight: 600,
            color: '#fff',
            backgroundColor: COLORS.status.success,
            border: 'none',
            borderRadius: BORDER_RADIUS.md,
            cursor: 'pointer'
        }
    };

    return (
        <div style={{ ...styles.container, position: 'relative' }}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerTitle}>
                    <span>🤖</span>
                    <span>Task Agent</span>
                </div>
                <div style={styles.aiStatus}>
                    <div style={styles.statusDot}></div>
                    <span>{aiAvailable ? 'AI Ready' : 'AI Unavailable'}</span>
                </div>
            </div>

            {/* Chat Area */}
            <div ref={chatContainerRef} style={styles.chatArea}>
                {chatHistory.length === 0 ? (
                    <div style={styles.welcomeSection}>
                        <div style={styles.welcomeTitle}>Task Assignment Agent</div>
                        <div style={styles.welcomeText}>
                            Tell me who you want to assign a task to and what they should do.
                            I'll create a formal task for you.
                        </div>
                        <div style={styles.examplesGrid}>
                            {EXAMPLE_PROMPTS.map((example, i) => (
                                <button
                                    key={i}
                                    style={styles.exampleButton}
                                    onClick={() => handleExampleClick(example)}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = 'rgba(255,255,255,0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                                    }}
                                >
                                    "{example}"
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    chatHistory.map(msg => renderMessage(msg))
                )}

                {isProcessing && !pendingConfirmation && (
                    <div style={styles.message}>
                        <span style={styles.messageIcon}>🤖</span>
                        <div style={styles.messageContent}>
                            <span style={{ opacity: 0.7 }}>Processing...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            {/* Input Section with Voice Support */}
            {aiAvailable && (
                <AgentChatInput
                    value={inputMessage}
                    onChange={setInputMessage}
                    onSend={handleSendMessage}
                    isProcessing={isProcessing}
                    disabled={!aiAvailable}
                    placeholder="e.g., Tell Ahmed to submit the report by Friday..."
                    showMicButton={true}
                />
            )}

            {/* Confirmation Modal */}
            {renderConfirmation()}
        </div>
    );
};

export default TaskAgentChat;
