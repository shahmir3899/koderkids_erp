// ============================================
// FEE AGENT CHAT COMPONENT
// AI-powered chat interface for fee management operations
// Location: frontend/src/components/finance/FeeAgentChat.js
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
    executeOverwrite,
    checkAIHealth,
    buildFeeContext
} from '../../services/aiService';
import {
    createMonthlyFees,
    createSingleFee,
    updateFees,
    fetchFees,
    formatMonthForAPI
} from '../../services/feeService';

// ============================================
// QUICK ACTION TEMPLATES (Fallback)
// ============================================
const FEE_TEMPLATES = [
    {
        id: 'create_monthly',
        name: 'Create Monthly Fees',
        icon: '📅',
        description: 'Generate fee records for all students',
        fields: [
            { key: 'school_id', label: 'School', type: 'school' },
            { key: 'month', label: 'Month', type: 'month' }
        ]
    },
    {
        id: 'create_single',
        name: 'Create Single Fee',
        icon: '👤',
        description: 'Create fee for one student',
        fields: [
            { key: 'student_id', label: 'Student', type: 'student' },
            { key: 'month', label: 'Month', type: 'month' },
            { key: 'paid_amount', label: 'Paid Amount', type: 'number', optional: true }
        ]
    },
    {
        id: 'update_fee',
        name: 'Update Payment',
        icon: '✏️',
        description: 'Record a fee payment',
        fields: [
            { key: 'fee_id', label: 'Fee ID', type: 'number' },
            { key: 'paid_amount', label: 'Amount', type: 'number' }
        ]
    },
    {
        id: 'view_pending',
        name: 'Pending Fees',
        icon: '📋',
        description: 'Show pending fees',
        fields: [
            { key: 'school_id', label: 'School', type: 'school', optional: true }
        ]
    },
    {
        id: 'fee_summary',
        name: 'Summary',
        icon: '📊',
        description: 'Fee collection summary',
        fields: [
            { key: 'school_id', label: 'School', type: 'school', optional: true }
        ]
    }
];

// Example prompts for users
const EXAMPLE_PROMPTS = [
    "Record payment of 5000 for Ali Khan",
    "Show pending fees for class 10A",
    "Mark all fees for class 10A as paid",
    "Create fee for Sara Ahmed Jan-2026"
];

// ============================================
// MAIN COMPONENT
// ============================================
const FeeAgentChat = ({ schools = [], students = [], onRefresh, height = '500px' }) => {
    // ========== State ==========
    const [chatHistory, setChatHistory] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiAvailable, setAiAvailable] = useState(null);
    const [activeTemplate, setActiveTemplate] = useState(null);
    const [formData, setFormData] = useState({});
    const [showTemplates, setShowTemplates] = useState(true);
    const [pendingConfirmation, setPendingConfirmation] = useState(null);
    const [pendingOverwrite, setPendingOverwrite] = useState(null);

    // Refs
    const chatContainerRef = useRef(null);
    const inputRef = useRef(null);

    // ========== Check AI Health on Mount ==========
    useEffect(() => {
        const checkHealth = async () => {
            const health = await checkAIHealth();
            setAiAvailable(health.ai_available);
            if (!health.ai_available) {
                addMessage('system', 'AI service is currently unavailable. Using quick actions only.');
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

    // ========== Generate Month Options ==========
    const getMonthOptions = () => {
        const options = [];
        const now = new Date();
        for (let i = -2; i <= 3; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const value = formatMonthForAPI(date);
            options.push({ value, label: value });
        }
        return options;
    };

    // ========== Build Conversation History for AI ==========
    const buildConversationHistory = () => {
        // Get last 6 messages for context (3 exchanges)
        return chatHistory.slice(-6).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));
    };

    // ========== Handle Natural Language Input ==========
    const handleSendMessage = async () => {
        const message = inputMessage.trim();
        if (!message || isProcessing) return;

        setInputMessage('');
        setShowTemplates(false);
        addMessage('user', message);
        setIsProcessing(true);

        try {
            // Build context for AI
            const context = buildFeeContext(schools, students, []);

            // Build conversation history for multi-turn conversations
            const conversationHistory = buildConversationHistory();

            // Call AI endpoint with conversation history
            const result = await executeAICommand({
                message,
                agent: 'fee',
                context,
                conversationHistory
            });

            // Debug logging
            console.log('AI Result:', result);
            if (result.debug_error) {
                console.error('AI Debug Error:', result.debug_error);
            }

            // Handle different response types
            if (result.needs_confirmation) {
                // Show confirmation dialog for destructive actions
                setPendingConfirmation({
                    token: result.confirmation_token,
                    action: result.action,
                    message: result.message,
                    data: result.data
                });
                addMessage('bot', `⚠️ ${result.message}\n\nPlease confirm or cancel this action.`);
            } else if (result.needs_overwrite_confirmation) {
                // Records already exist - ask user if they want to overwrite
                setPendingOverwrite({
                    action: result.action,
                    params: result.params,
                    data: result.data
                });
                addMessage('bot', `⚠️ ${result.message}`);
            } else if (result.action === 'CLARIFY') {
                addMessage('bot', `❓ ${result.message}`);
            } else if (result.action === 'CHAT') {
                // Conversational response (greetings, help, etc.)
                addMessage('bot', `💬 ${result.message}`);
            } else if (result.fallback_to_templates) {
                // Show more details about the error
                const errorDetails = result.debug_error ? `\n\n(Error: ${result.debug_error})` : '';
                addMessage('bot', `${result.message}${errorDetails}\n\nPlease use the quick actions below.`);
                setShowTemplates(true);
            } else if (result.success) {
                addMessage('bot', `✅ ${result.message}`, result.data);
                if (onRefresh) onRefresh();
            } else {
                addMessage('error', result.message || 'Operation failed');
            }

        } catch (error) {
            console.error('AI command error:', error);
            addMessage('error', 'Failed to process command. Please try again or use quick actions.');
            setShowTemplates(true);
        } finally {
            setIsProcessing(false);
        }
    };

    // ========== Handle Confirmation ==========
    const handleConfirm = async (confirmed) => {
        if (!pendingConfirmation) return;

        setIsProcessing(true);
        try {
            const result = await confirmAIAction(pendingConfirmation.token, confirmed);

            if (confirmed) {
                if (result.success) {
                    addMessage('bot', `✅ ${result.message}`, result.data);
                    if (onRefresh) onRefresh();
                } else {
                    addMessage('error', result.message || 'Action failed');
                }
            } else {
                addMessage('bot', '❌ Action cancelled');
            }
        } catch (error) {
            addMessage('error', 'Confirmation failed');
        } finally {
            setPendingConfirmation(null);
            setIsProcessing(false);
        }
    };

    // ========== Handle Overwrite Confirmation ==========
    const handleOverwrite = async (confirmed) => {
        if (!pendingOverwrite) return;

        setIsProcessing(true);
        try {
            if (confirmed) {
                // User confirmed - execute with force_overwrite
                const result = await executeOverwrite({
                    action: pendingOverwrite.action,
                    params: pendingOverwrite.params
                });

                if (result.success) {
                    addMessage('bot', `✅ ${result.message}`, result.data);
                    if (onRefresh) onRefresh();
                } else {
                    addMessage('error', result.message || 'Overwrite failed');
                }
            } else {
                addMessage('bot', '❌ Cancelled. Existing records were not modified.');
            }
        } catch (error) {
            addMessage('error', 'Overwrite failed');
        } finally {
            setPendingOverwrite(null);
            setIsProcessing(false);
        }
    };

    // ========== Handle Template Selection ==========
    const handleTemplateSelect = (template) => {
        setActiveTemplate(template);
        setFormData({});
        setShowTemplates(false);
        addMessage('bot', `Selected: ${template.name}\n\nPlease fill in the required fields:`);
    };

    // ========== Handle Form Field Change ==========
    const handleFieldChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    // ========== Execute Template Command (Fallback) ==========
    const executeTemplateCommand = async () => {
        if (!activeTemplate) return;

        const missingFields = activeTemplate.fields
            .filter(f => !f.optional && !formData[f.key])
            .map(f => f.label);

        if (missingFields.length > 0) {
            toast.warning(`Please fill: ${missingFields.join(', ')}`);
            return;
        }

        setIsProcessing(true);
        addMessage('user', formatUserMessage());

        try {
            let result;

            switch (activeTemplate.id) {
                case 'create_monthly':
                    result = await handleCreateMonthly();
                    break;
                case 'create_single':
                    result = await handleCreateSingle();
                    break;
                case 'update_fee':
                    result = await handleUpdateFee();
                    break;
                case 'view_pending':
                    result = await handleViewPending();
                    break;
                case 'fee_summary':
                    result = await handleFeeSummary();
                    break;
                default:
                    result = { success: false, message: 'Unknown command' };
            }

            addMessage(result.success ? 'bot' : 'error', result.message, result.data);

            if (result.success && onRefresh) {
                onRefresh();
            }

        } catch (error) {
            console.error('Fee command error:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Operation failed';
            addMessage('error', errorMsg);
        } finally {
            setIsProcessing(false);
            resetForm();
        }
    };

    // ========== Format User Message ==========
    const formatUserMessage = () => {
        const parts = [`${activeTemplate.name}:`];
        activeTemplate.fields.forEach(field => {
            if (formData[field.key]) {
                let displayValue = formData[field.key];
                if (field.type === 'school') {
                    const school = schools.find(s => s.id === parseInt(displayValue));
                    displayValue = school?.name || displayValue;
                }
                if (field.type === 'student') {
                    const student = students.find(s => s.id === parseInt(displayValue));
                    displayValue = student?.name || displayValue;
                }
                parts.push(`${field.label}: ${displayValue}`);
            }
        });
        return parts.join('\n');
    };

    // ========== Template Command Handlers ==========
    const handleCreateMonthly = async () => {
        const { school_id, month } = formData;
        const response = await createMonthlyFees({
            schoolId: parseInt(school_id),
            month
        });

        return {
            success: true,
            message: `✅ ${response.message || 'Monthly fees created successfully!'}`,
            data: {
                records_created: response.records_created,
                school: schools.find(s => s.id === parseInt(school_id))?.name,
                month
            }
        };
    };

    const handleCreateSingle = async () => {
        const { student_id, month, paid_amount } = formData;
        const response = await createSingleFee({
            studentId: parseInt(student_id),
            month,
            paidAmount: paid_amount ? parseFloat(paid_amount) : 0
        });

        return {
            success: true,
            message: `✅ ${response.message || 'Fee record created!'}`,
            data: response.fee
        };
    };

    const handleUpdateFee = async () => {
        const { fee_id, paid_amount } = formData;
        const response = await updateFees([{
            id: parseInt(fee_id),
            paid_amount: parseFloat(paid_amount)
        }]);

        return {
            success: true,
            message: `✅ ${response.message || 'Fee updated successfully!'}`,
            data: response.fees?.[0]
        };
    };

    const handleViewPending = async () => {
        const { school_id } = formData;
        const fees = await fetchFees({
            schoolId: school_id ? parseInt(school_id) : undefined
        });

        const pendingFees = fees.filter(f => f.status === 'Pending' || f.balance_due > 0);

        return {
            success: true,
            message: `Found ${pendingFees.length} pending fee records`,
            data: {
                count: pendingFees.length,
                total_pending: pendingFees.reduce((sum, f) => sum + parseFloat(f.balance_due || 0), 0),
                results: pendingFees.slice(0, 10)
            }
        };
    };

    const handleFeeSummary = async () => {
        const { school_id } = formData;
        const fees = await fetchFees({
            schoolId: school_id ? parseInt(school_id) : undefined
        });

        const summary = {
            total_records: fees.length,
            total_fee: fees.reduce((sum, f) => sum + parseFloat(f.total_fee || 0), 0),
            total_received: fees.reduce((sum, f) => sum + parseFloat(f.paid_amount || 0), 0),
            total_pending: fees.reduce((sum, f) => sum + parseFloat(f.balance_due || 0), 0),
            paid_count: fees.filter(f => f.status === 'Paid').length,
            pending_count: fees.filter(f => f.status === 'Pending').length
        };

        return {
            success: true,
            message: `Fee Summary:\n• Total: PKR ${summary.total_fee.toLocaleString()}\n• Received: PKR ${summary.total_received.toLocaleString()}\n• Pending: PKR ${summary.total_pending.toLocaleString()}`,
            data: summary
        };
    };

    // ========== Reset Form ==========
    const resetForm = () => {
        setActiveTemplate(null);
        setFormData({});
        setShowTemplates(true);
    };

    // ========== Handle Key Press ==========
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
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
            padding: SPACING.md
        },
        welcomeSection: {
            textAlign: 'center',
            padding: SPACING.lg,
            color: 'rgba(255,255,255,0.7)'
        },
        welcomeTitle: {
            fontSize: FONT_SIZES.lg,
            fontWeight: 600,
            color: COLORS.text.white,
            marginBottom: SPACING.sm
        },
        welcomeText: {
            fontSize: FONT_SIZES.sm,
            marginBottom: SPACING.md
        },
        examplePrompts: {
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.xs,
            marginTop: SPACING.md,
            textAlign: 'left'
        },
        examplePrompt: {
            padding: SPACING.sm,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: BORDER_RADIUS.md,
            fontSize: FONT_SIZES.xs,
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            transition: TRANSITIONS.fast,
            border: '1px solid transparent'
        },
        templatesGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: SPACING.sm,
            marginTop: SPACING.md
        },
        templateCard: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: SPACING.xs,
            padding: SPACING.md,
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: BORDER_RADIUS.md,
            cursor: 'pointer',
            transition: TRANSITIONS.fast,
            textAlign: 'center'
        },
        templateIcon: {
            fontSize: '24px'
        },
        templateName: {
            fontSize: FONT_SIZES.xs,
            fontWeight: 600,
            color: COLORS.text.white
        },
        templateDesc: {
            fontSize: '10px',
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.2
        },
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
        inputSection: {
            padding: SPACING.md,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(255,255,255,0.03)'
        },
        inputRow: {
            display: 'flex',
            gap: SPACING.sm
        },
        textInput: {
            flex: 1,
            padding: SPACING.sm,
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: BORDER_RADIUS.md,
            color: COLORS.text.white,
            fontSize: FONT_SIZES.sm,
            outline: 'none',
            transition: TRANSITIONS.fast,
            resize: 'none'
        },
        sendButton: {
            padding: `${SPACING.sm} ${SPACING.md}`,
            backgroundColor: COLORS.primary,
            color: COLORS.text.white,
            border: 'none',
            borderRadius: BORDER_RADIUS.md,
            fontSize: FONT_SIZES.sm,
            fontWeight: 600,
            cursor: 'pointer',
            transition: TRANSITIONS.fast,
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.xs
        },
        confirmationBox: {
            display: 'flex',
            gap: SPACING.sm,
            marginTop: SPACING.sm
        },
        confirmButton: {
            flex: 1,
            padding: SPACING.sm,
            backgroundColor: '#EF4444',
            color: 'white',
            border: 'none',
            borderRadius: BORDER_RADIUS.md,
            fontSize: FONT_SIZES.sm,
            fontWeight: 600,
            cursor: 'pointer'
        },
        cancelButton: {
            flex: 1,
            padding: SPACING.sm,
            backgroundColor: 'transparent',
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: BORDER_RADIUS.md,
            fontSize: FONT_SIZES.sm,
            cursor: 'pointer'
        },
        overwriteButton: {
            flex: 1,
            padding: SPACING.sm,
            backgroundColor: '#F59E0B',
            color: 'white',
            border: 'none',
            borderRadius: BORDER_RADIUS.md,
            fontSize: FONT_SIZES.sm,
            fontWeight: 600,
            cursor: 'pointer'
        },
        formSection: {
            padding: SPACING.md,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(255,255,255,0.03)'
        },
        formField: {
            marginBottom: SPACING.md
        },
        formLabel: {
            display: 'block',
            fontSize: FONT_SIZES.xs,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.7)',
            marginBottom: SPACING.xs
        },
        formInput: {
            width: '100%',
            padding: SPACING.sm,
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: BORDER_RADIUS.md,
            color: COLORS.text.white,
            fontSize: FONT_SIZES.sm,
            outline: 'none'
        },
        formSelect: {
            width: '100%',
            padding: SPACING.sm,
            backgroundColor: 'rgba(30,30,40,0.9)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: BORDER_RADIUS.md,
            color: COLORS.text.white,
            fontSize: FONT_SIZES.sm,
            outline: 'none',
            cursor: 'pointer'
        },
        buttonRow: {
            display: 'flex',
            gap: SPACING.sm,
            marginTop: SPACING.md
        },
        executeButton: {
            flex: 1,
            padding: SPACING.sm,
            backgroundColor: COLORS.primary,
            color: COLORS.text.white,
            border: 'none',
            borderRadius: BORDER_RADIUS.md,
            fontSize: FONT_SIZES.sm,
            fontWeight: 600,
            cursor: 'pointer'
        },
        dataDisplay: {
            marginTop: SPACING.sm,
            padding: SPACING.sm,
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: BORDER_RADIUS.sm,
            fontSize: FONT_SIZES.xs,
            color: 'rgba(255,255,255,0.8)'
        },
        summaryGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: SPACING.xs,
            marginTop: SPACING.sm
        },
        summaryItem: {
            padding: SPACING.sm,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: BORDER_RADIUS.sm,
            textAlign: 'center'
        },
        summaryValue: {
            fontSize: FONT_SIZES.md,
            fontWeight: 700,
            color: COLORS.text.white
        },
        summaryLabel: {
            fontSize: FONT_SIZES.xs,
            color: 'rgba(255,255,255,0.6)'
        },
        spinner: {
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255,255,255,0.2)',
            borderTopColor: COLORS.primary,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
        },
        quickActionsFooter: {
            padding: SPACING.md,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(255,255,255,0.03)'
        },
        quickActionsRow: {
            display: 'flex',
            gap: SPACING.sm,
            flexWrap: 'wrap'
        },
        quickActionButton: {
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.xs,
            padding: `${SPACING.xs} ${SPACING.sm}`,
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: BORDER_RADIUS.md,
            color: COLORS.text.white,
            fontSize: FONT_SIZES.xs,
            cursor: 'pointer',
            transition: TRANSITIONS.fast
        }
    };

    // ========== Render Field Input ==========
    const renderFieldInput = (field) => {
        switch (field.type) {
            case 'school':
                return (
                    <select
                        style={styles.formSelect}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    >
                        <option value="">Select School...</option>
                        {schools.map(school => (
                            <option key={school.id} value={school.id}>
                                {school.name}
                            </option>
                        ))}
                    </select>
                );

            case 'student':
                return (
                    <select
                        style={styles.formSelect}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    >
                        <option value="">Select Student...</option>
                        {students.map(student => (
                            <option key={student.id} value={student.id}>
                                {student.name} - {student.student_class}
                            </option>
                        ))}
                    </select>
                );

            case 'month':
                return (
                    <select
                        style={styles.formSelect}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    >
                        <option value="">Select Month...</option>
                        {getMonthOptions().map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );

            case 'number':
                return (
                    <input
                        type="number"
                        style={styles.formInput}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.optional ? 'Optional' : 'Required'}
                    />
                );

            default:
                return (
                    <input
                        type="text"
                        style={styles.formInput}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    />
                );
        }
    };

    // ========== Render Data Display ==========
    const renderDataDisplay = (data) => {
        if (!data) return null;

        // Skip rendering stats for "schools without fees" response - message is enough
        if (data.schools_without_fees !== undefined || data.count_without !== undefined) {
            return null;
        }

        // Skip rendering for recovery report - message contains all info
        if (data.schools !== undefined && data.summary !== undefined) {
            return null;
        }

        // Handle CREATE_MISSING_FEES and CREATE_FEES_MULTIPLE_SCHOOLS results
        // (has total_records_created and results with school info)
        if (data.total_records_created !== undefined && data.results && Array.isArray(data.results)) {
            return (
                <div style={styles.dataDisplay}>
                    <div style={{ marginBottom: SPACING.sm, fontWeight: 600 }}>
                        Schools Processed:
                    </div>
                    {data.results.map((school, idx) => (
                        <div key={idx} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            {school.school_name}: {school.records_created} records created
                        </div>
                    ))}
                    {data.unmatched_schools && data.unmatched_schools.length > 0 && (
                        <div style={{ marginTop: SPACING.sm, color: '#FBBF24' }}>
                            <strong>Could not match:</strong> {data.unmatched_schools.join(', ')}
                        </div>
                    )}
                    {data.errors && data.errors.length > 0 && (
                        <div style={{ marginTop: SPACING.sm, color: '#FCA5A5' }}>
                            <strong>Errors:</strong>
                            {data.errors.map((err, idx) => (
                                <div key={idx}>{err.school_name}: {err.error}</div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        // Handle fee list results (has results with student_name, balance_due, etc.)
        if (data.results && Array.isArray(data.results) && data.results[0]?.student_name) {
            const statusColors = {
                'Paid': '#4ADE80',
                'Pending': '#FBBF24',
                'Partial': '#FB923C'
            };
            return (
                <div style={styles.dataDisplay}>
                    {/* Summary stats */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: SPACING.xs,
                        marginBottom: SPACING.sm,
                        padding: SPACING.xs,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderRadius: BORDER_RADIUS.sm
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: FONT_SIZES.sm, fontWeight: 600, color: '#4ADE80' }}>
                                PKR {(data.total_paid || 0).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Paid</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: FONT_SIZES.sm, fontWeight: 600, color: '#FBBF24' }}>
                                PKR {(data.total_pending || 0).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Pending</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: FONT_SIZES.sm, fontWeight: 600, color: COLORS.text.white }}>
                                {data.count || 0}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Records</div>
                        </div>
                    </div>
                    {/* Fee list */}
                    {data.results.slice(0, 8).map((fee, idx) => (
                        <div key={idx} style={{
                            padding: '6px 0',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontWeight: 500 }}>{fee.student_name}</div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                                    {fee.student_class} • {fee.school_name} • {fee.month}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{
                                    fontSize: FONT_SIZES.xs,
                                    fontWeight: 600,
                                    color: statusColors[fee.status] || '#FBBF24'
                                }}>
                                    {fee.status === 'Paid' ? '✓ Paid' : `PKR ${parseFloat(fee.balance_due || 0).toLocaleString()}`}
                                </div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                                    #{fee.id}
                                </div>
                            </div>
                        </div>
                    ))}
                    {data.count > 8 && (
                        <div style={{ marginTop: SPACING.xs, fontStyle: 'italic', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                            ...and {data.count - 8} more records
                        </div>
                    )}
                    {data.truncated && (
                        <div style={{ marginTop: SPACING.xs, fontSize: '10px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                            (Showing first 50 of {data.count} records)
                        </div>
                    )}
                </div>
            );
        }

        // Handle fee summary (has total_fee and total_records)
        if (data.total_fee !== undefined && data.total_records !== undefined) {
            return (
                <div style={styles.summaryGrid}>
                    <div style={styles.summaryItem}>
                        <div style={styles.summaryValue}>{data.total_records || 0}</div>
                        <div style={styles.summaryLabel}>Records</div>
                    </div>
                    <div style={styles.summaryItem}>
                        <div style={styles.summaryValue}>{data.paid_count || 0}</div>
                        <div style={styles.summaryLabel}>Paid</div>
                    </div>
                    <div style={styles.summaryItem}>
                        <div style={styles.summaryValue}>{data.pending_count || 0}</div>
                        <div style={styles.summaryLabel}>Pending</div>
                    </div>
                    <div style={{ ...styles.summaryItem, gridColumn: 'span 2' }}>
                        <div style={{ ...styles.summaryValue, color: '#FCA5A5' }}>
                            PKR {(data.total_pending || 0).toLocaleString()}
                        </div>
                        <div style={styles.summaryLabel}>Total Pending</div>
                    </div>
                </div>
            );
        }

        // Handle single school fee creation (has records_created and school name)
        if (data.records_created !== undefined) {
            return (
                <div style={styles.dataDisplay}>
                    <div><strong>Records Created:</strong> {data.records_created}</div>
                    {data.school && <div><strong>School:</strong> {data.school}</div>}
                    {data.month && <div><strong>Month:</strong> {data.month}</div>}
                </div>
            );
        }

        return null;
    };

    // ========== Render ==========
    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerTitle}>
                    <span>🤖</span>
                    <span>Fee Agent</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
                    <div style={styles.aiStatus}>
                        <div style={styles.statusDot} />
                        <span>{aiAvailable === null ? 'Checking...' : aiAvailable ? 'AI Ready' : 'Templates Only'}</span>
                    </div>
                    {chatHistory.length > 0 && (
                        <button
                            onClick={() => {
                                setChatHistory([]);
                                setShowTemplates(true);
                                setPendingConfirmation(null);
                                setPendingOverwrite(null);
                            }}
                            style={{
                                ...styles.cancelButton,
                                padding: `${SPACING.xs} ${SPACING.sm}`,
                                fontSize: FONT_SIZES.xs
                            }}
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div style={styles.chatArea} ref={chatContainerRef}>
                {/* Welcome Section */}
                {chatHistory.length === 0 && showTemplates && (
                    <div style={styles.welcomeSection}>
                        <div style={styles.welcomeTitle}>Fee Management Assistant</div>
                        <div style={styles.welcomeText}>
                            {aiAvailable
                                ? "Create fees, record payments, delete records, bulk updates, view reports"
                                : "Use the quick actions below to manage fees"}
                        </div>

                        {/* Example Prompts (only if AI is available) */}
                        {aiAvailable && (
                            <div style={styles.examplePrompts}>
                                <div style={{ fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.5)', marginBottom: SPACING.xs }}>
                                    Try saying:
                                </div>
                                {EXAMPLE_PROMPTS.map((prompt, idx) => (
                                    <div
                                        key={idx}
                                        style={styles.examplePrompt}
                                        onClick={() => setInputMessage(prompt)}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                                            e.currentTarget.style.borderColor = 'transparent';
                                        }}
                                    >
                                        "{prompt}"
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Chat Messages */}
                {chatHistory.map(msg => (
                    <div
                        key={msg.id}
                        style={{
                            ...styles.message,
                            ...(msg.type === 'user' ? styles.userMessage :
                                msg.type === 'error' ? styles.errorMessage :
                                msg.type === 'system' ? styles.systemMessage : styles.botMessage)
                        }}
                    >
                        {msg.content}
                        {msg.data && renderDataDisplay(msg.data)}
                    </div>
                ))}

                {/* Confirmation Buttons (Delete) */}
                {pendingConfirmation && (
                    <div style={styles.confirmationBox}>
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
                            disabled={isProcessing}
                        >
                            Confirm Delete
                        </button>
                    </div>
                )}

                {/* Overwrite Confirmation Buttons */}
                {pendingOverwrite && (
                    <div style={styles.confirmationBox}>
                        <button
                            style={styles.cancelButton}
                            onClick={() => handleOverwrite(false)}
                            disabled={isProcessing}
                        >
                            Keep Existing
                        </button>
                        <button
                            style={styles.overwriteButton}
                            onClick={() => handleOverwrite(true)}
                            disabled={isProcessing}
                        >
                            Overwrite Records
                        </button>
                    </div>
                )}

                {/* Processing Indicator with Spinner */}
                {isProcessing && (
                    <div style={{ ...styles.message, ...styles.botMessage, display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                        <div style={styles.spinner} />
                        <span>Processing...</span>
                    </div>
                )}
            </div>

            {/* Form Section (Template Mode) */}
            {activeTemplate && !pendingConfirmation && !pendingOverwrite && (
                <div style={styles.formSection}>
                    <div style={{ fontSize: FONT_SIZES.sm, fontWeight: 600, color: COLORS.text.white, marginBottom: SPACING.md }}>
                        {activeTemplate.icon} {activeTemplate.name}
                    </div>

                    {activeTemplate.fields.map(field => (
                        <div key={field.key} style={styles.formField}>
                            <label style={styles.formLabel}>
                                {field.label} {field.optional && '(optional)'}
                            </label>
                            {renderFieldInput(field)}
                        </div>
                    ))}

                    <div style={styles.buttonRow}>
                        <button onClick={resetForm} style={styles.cancelButton}>
                            Cancel
                        </button>
                        <button
                            onClick={executeTemplateCommand}
                            disabled={isProcessing}
                            style={{
                                ...styles.executeButton,
                                opacity: isProcessing ? 0.6 : 1
                            }}
                        >
                            {isProcessing ? 'Processing...' : 'Execute'}
                        </button>
                    </div>
                </div>
            )}

            {/* Natural Language Input (AI Mode) */}
            {!activeTemplate && !pendingConfirmation && !pendingOverwrite && aiAvailable && (
                <div style={styles.inputSection}>
                    <div style={styles.inputRow}>
                        <input
                            ref={inputRef}
                            type="text"
                            style={styles.textInput}
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask me to create fees, check recovery, find missing records..."
                            disabled={isProcessing}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isProcessing || !inputMessage.trim()}
                            style={{
                                ...styles.sendButton,
                                opacity: isProcessing || !inputMessage.trim() ? 0.6 : 1
                            }}
                        >
                            <span>Send</span>
                            <span>→</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Actions Footer - Always visible at bottom when no template active */}
            {!activeTemplate && !pendingConfirmation && !pendingOverwrite && (
                <div style={styles.quickActionsFooter}>
                    <div style={{ fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.5)', marginBottom: SPACING.xs }}>
                        Quick Actions:
                    </div>
                    <div style={styles.quickActionsRow}>
                        {FEE_TEMPLATES.map(template => (
                            <button
                                key={template.id}
                                onClick={() => handleTemplateSelect(template)}
                                style={styles.quickActionButton}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                                    e.currentTarget.style.borderColor = COLORS.primary;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                }}
                            >
                                <span>{template.icon}</span>
                                <span>{template.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Spinner animation */}
            <style>
                {`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}
            </style>
        </div>
    );
};

export default FeeAgentChat;
