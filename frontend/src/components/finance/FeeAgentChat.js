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
    undoAIAction,
    checkAIHealth,
    buildFeeContext,
    saveFeeLastContext
} from '../../services/aiService';
import {
    createMonthlyFees,
    createSingleFee,
    updateFees,
    fetchFees,
    formatMonthForAPI
} from '../../services/feeService';

// Shared Agent Chat Components
import { AgentChatInput, useSpeechSynthesis } from '../agentChat';

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
const FeeAgentChat = ({ schools = [], students = [], onRefresh, onExportPDF, height = '500px' }) => {
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
    const [expandedMessages, setExpandedMessages] = useState({});
    const [lastAction, setLastAction] = useState(null); // Track last action for follow-ups
    const [canUndo, setCanUndo] = useState(false); // Track if undo is available
    const [speechEnabled, setSpeechEnabled] = useState(
        () => localStorage.getItem('feeAgentSpeech') === 'true'
    );

    // Refs
    const chatContainerRef = useRef(null);
    const inputRef = useRef(null);

    // ========== Speech Synthesis (Auto-play bot responses) ==========
    const { speak, stop: stopSpeaking, isSupported: speechSupported } = useSpeechSynthesis();
    const lastBotMessageRef = useRef(null);

    // Persist speech preference
    useEffect(() => {
        localStorage.setItem('feeAgentSpeech', speechEnabled);
    }, [speechEnabled]);

    // Auto-speak bot messages (only when speech is enabled)
    useEffect(() => {
        if (!speechSupported || !speechEnabled || chatHistory.length === 0) return;

        const lastMessage = chatHistory[chatHistory.length - 1];
        // Only speak new bot messages (not user, error, or system)
        if (lastMessage.type === 'bot' && lastMessage.id !== lastBotMessageRef.current) {
            lastBotMessageRef.current = lastMessage.id;
            // Extract plain text from content (remove emojis for cleaner speech)
            const textToSpeak = lastMessage.content.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
            if (textToSpeak) {
                speak(textToSpeak);
            }
        }
    }, [chatHistory, speechSupported, speechEnabled, speak]);

    // Stop speaking when user starts typing or sends a message
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

    // ========== Keyboard Shortcuts for Confirmation Dialogs ==========
    useEffect(() => {
        if (!pendingConfirmation && !pendingOverwrite) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Enter' || e.key === 'y' || e.key === 'Y') {
                e.preventDefault();
                if (pendingConfirmation) handleConfirm(true);
                else if (pendingOverwrite) handleOverwrite(true);
            } else if (e.key === 'Escape' || e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                if (pendingConfirmation) handleConfirm(false);
                else if (pendingOverwrite) handleOverwrite(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pendingConfirmation, pendingOverwrite]);

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
            content: msg.content,
            // Include structured data for context (fee IDs, school IDs, etc.)
            data: msg.data || null
        }));
    };

    // ========== Handle Quick Action Button Click ==========
    const handleQuickAction = (actionText) => {
        if (isProcessing) return;
        setInputMessage(actionText);
        // Auto-send after a brief delay to show the user what's being sent
        setTimeout(() => {
            setInputMessage('');
            setShowTemplates(false);
            addMessage('user', actionText);
            setIsProcessing(true);

            const context = buildFeeContext(schools, students, []);
            const conversationHistory = buildConversationHistory();

            executeAICommand({
                message: actionText,
                agent: 'fee',
                context,
                conversationHistory
            }).then(result => {
                if (result.needs_confirmation) {
                    // Show confirmation box with Yes/No buttons
                    setPendingConfirmation({
                        token: result.confirmation_token,
                        action: result.action,
                        message: result.message,
                        data: result.data
                    });
                    // Don't add message - shown in confirmation box
                } else if (result.needs_overwrite_confirmation) {
                    setPendingOverwrite({
                        action: result.action,
                        params: result.params,
                        data: result.data,
                        message: result.message
                    });
                } else if (result.success) {
                    addMessage('bot', `✅ ${result.message}`, result.data);
                    setLastAction(result.action);
                    if (result.data?.can_undo) setCanUndo(true);
                    if (onRefresh) onRefresh();
                } else {
                    addMessage('error', result.message || 'Operation failed');
                }
            }).catch(error => {
                console.error('Quick action error:', error);
                addMessage('error', 'Failed to process action');
            }).finally(() => {
                setIsProcessing(false);
            });
        }, 100);
    };

    // ========== Toggle Expanded View for Results ==========
    const toggleExpanded = (messageId) => {
        setExpandedMessages(prev => ({
            ...prev,
            [messageId]: !prev[messageId]
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
                // Message will be shown in the confirmation box with Yes/No buttons
                setPendingConfirmation({
                    token: result.confirmation_token,
                    action: result.action,
                    message: result.message,
                    data: result.data
                });
                // Don't add message here - it's shown in confirmation box
            } else if (result.needs_overwrite_confirmation) {
                // Records already exist - ask user if they want to overwrite
                // Message will be shown in the overwrite confirmation box
                setPendingOverwrite({
                    action: result.action,
                    params: result.params,
                    data: result.data,
                    message: result.message
                });
                // Don't add message here - it's shown in confirmation box
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
            } else if (result.action === 'EXPORT_PDF') {
                // Trigger PDF export
                if (onExportPDF) {
                    onExportPDF();
                    addMessage('bot', '✅ PDF exported! Check your downloads.');
                } else {
                    addMessage('bot', 'Please use the Export PDF button in the fee table.');
                }
            } else if (result.success) {
                addMessage('bot', `✅ ${result.message}`, result.data);
                setLastAction(result.action);
                // Enable undo if the action supports it
                if (result.data?.can_undo) {
                    setCanUndo(true);
                }
                // Save last used context for smart defaults
                if (result.data?.school_id || result.data?.school_name || result.data?.month) {
                    saveFeeLastContext(
                        result.data.school_id,
                        result.data.school_name,
                        result.data.month
                    );
                }
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
                    if (result.data?.can_undo) setCanUndo(true);
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

    // ========== Handle Undo ==========
    const handleUndo = async () => {
        if (!canUndo || isProcessing) return;

        setIsProcessing(true);
        try {
            const result = await undoAIAction();
            if (result.success) {
                addMessage('bot', `↩️ ${result.message}`);
                setCanUndo(false);
                if (onRefresh) onRefresh();
            } else {
                addMessage('error', result.message || 'Undo failed');
            }
        } catch (error) {
            addMessage('error', 'Undo failed');
        } finally {
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

            // Handle 409 Conflict - fees already exist, offer overwrite
            if (error.response?.status === 409 && activeTemplate.id === 'create_monthly') {
                const { school_id, month } = formData;
                const schoolName = schools.find(s => s.id === parseInt(school_id))?.name || `School #${school_id}`;
                setPendingOverwrite({
                    action: 'CREATE_MONTHLY_FEES',
                    params: { school_id: parseInt(school_id), month },
                    data: { school_id: parseInt(school_id), school_name: schoolName, month },
                    message: `Fee records for ${schoolName} - ${month} already exist. Do you want to regenerate them?`
                });
            } else {
                const errorMsg = error.response?.data?.error || error.response?.data?.warning || error.message || 'Operation failed';
                addMessage('error', errorMsg);
            }
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

    // ========== Follow-up Action Suggestions ==========
    const FOLLOW_UP_ACTIONS = {
        'CREATE_MONTHLY_FEES': [
            { label: 'View Summary', action: 'show fee summary' },
            { label: 'Recovery Report', action: 'show recovery report' },
            { label: 'Create for Another', action: 'create fees' },
        ],
        'CREATE_FEES_ALL_SCHOOLS': [
            { label: 'View Summary', action: 'show fee summary' },
            { label: 'Recovery Report', action: 'show recovery report' },
        ],
        'CREATE_MISSING_FEES': [
            { label: 'View Summary', action: 'show fee summary' },
            { label: 'Recovery Report', action: 'show recovery report' },
        ],
        'UPDATE_FEE': [
            { label: 'View Fees', action: 'show fees' },
            { label: 'More Payments', action: 'record payment' },
            { label: 'Summary', action: 'show fee summary' },
        ],
        'BULK_UPDATE_FEES': [
            { label: 'View Summary', action: 'show fee summary' },
            { label: 'Recovery Report', action: 'show recovery report' },
        ],
        'GET_FEES': [
            { label: 'Mark All Paid', action: 'mark all as paid' },
            { label: 'Fee Summary', action: 'show fee summary' },
        ],
        'DELETE_FEES': [
            { label: 'View Remaining', action: 'show fees' },
        ],
        'GET_FEE_SUMMARY': [
            { label: 'Pending Fees', action: 'show pending fees' },
            { label: 'Recovery Report', action: 'show recovery report' },
        ],
        'GET_RECOVERY_REPORT': [
            { label: 'Pending Fees', action: 'show pending fees' },
            { label: 'Schools Without Fees', action: 'which schools dont have fees' },
        ],
        'GET_DEFAULTERS': [
            { label: 'Fee Summary', action: 'show fee summary' },
            { label: 'Recovery Report', action: 'show recovery report' },
        ],
        'COMPARE_MONTHS': [
            { label: 'Recovery Report', action: 'show recovery report' },
            { label: 'Defaulters', action: 'show defaulters' },
        ],
        'BATCH_UPDATE_FEES': [
            { label: 'View Summary', action: 'show fee summary' },
            { label: 'More Payments', action: 'record payment' },
        ],
    };

    // Add PDF export to follow-ups if callback available
    if (onExportPDF) {
        ['CREATE_MONTHLY_FEES', 'GET_FEES', 'BULK_UPDATE_FEES', 'GET_FEE_SUMMARY'].forEach(key => {
            if (FOLLOW_UP_ACTIONS[key]) {
                FOLLOW_UP_ACTIONS[key] = [...FOLLOW_UP_ACTIONS[key], { label: 'Export PDF', action: '__EXPORT_PDF__' }];
            }
        });
    }

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
        toolbar: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${SPACING.xs} ${SPACING.sm}`,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(255,255,255,0.03)'
        },
        toolbarButton: {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: FONT_SIZES.sm,
            padding: SPACING.xs,
            borderRadius: BORDER_RADIUS.sm,
            color: 'rgba(255,255,255,0.6)',
            transition: TRANSITIONS.fast,
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
        // Quick action buttons in chat
        quickActionRow: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: SPACING.xs,
            marginTop: SPACING.sm
        },
        quickActionButton: {
            padding: `${SPACING.xs} ${SPACING.sm}`,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            color: '#60A5FA',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: BORDER_RADIUS.full,
            fontSize: FONT_SIZES.xs,
            cursor: 'pointer',
            transition: TRANSITIONS.fast,
            whiteSpace: 'nowrap'
        },
        showMoreButton: {
            padding: `${SPACING.xs} ${SPACING.md}`,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: BORDER_RADIUS.md,
            fontSize: FONT_SIZES.xs,
            cursor: 'pointer',
            transition: TRANSITIONS.fast,
            marginTop: SPACING.sm,
            width: '100%'
        },
        yesButton: {
            flex: 1,
            padding: SPACING.sm,
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: BORDER_RADIUS.md,
            fontSize: FONT_SIZES.sm,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: SPACING.xs
        },
        noButton: {
            flex: 1,
            padding: SPACING.sm,
            backgroundColor: '#EF4444',
            color: 'white',
            border: 'none',
            borderRadius: BORDER_RADIUS.md,
            fontSize: FONT_SIZES.sm,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: SPACING.xs
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
        },
        followUpRow: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: SPACING.xs,
            marginBottom: SPACING.sm,
            paddingLeft: SPACING.xs,
        },
        followUpButton: {
            padding: `3px ${SPACING.sm}`,
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: '#60A5FA',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: BORDER_RADIUS.full,
            fontSize: '11px',
            cursor: 'pointer',
            transition: TRANSITIONS.fast,
            whiteSpace: 'nowrap',
        },
        keyboardHint: {
            fontSize: '10px',
            color: 'rgba(255,255,255,0.3)',
            marginTop: '4px',
            textAlign: 'center',
        },
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
    const renderDataDisplay = (data, messageId = null) => {
        if (!data) return null;

        const isExpanded = messageId ? expandedMessages[messageId] : false;

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
                    {data.results.slice(0, isExpanded ? 25 : 8).map((fee, idx) => (
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

                    {/* Show More / Show Less Button */}
                    {data.results.length > 8 && messageId && (
                        <button
                            style={styles.showMoreButton}
                            onClick={() => toggleExpanded(messageId)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                            }}
                        >
                            {isExpanded
                                ? `Show Less`
                                : `Show More (${Math.min(data.results.length, 25) - 8} more)`
                            }
                        </button>
                    )}

                    {data.truncated && (
                        <div style={{ marginTop: SPACING.xs, fontSize: '10px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                            (Showing {Math.min(data.results.length, isExpanded ? 25 : 8)} of {data.count} records)
                        </div>
                    )}

                    {/* Quick Action Buttons */}
                    {data.status === 'Pending' && data.count > 0 && (
                        <div style={styles.quickActionRow}>
                            <button
                                style={styles.quickActionButton}
                                onClick={() => handleQuickAction('Mark all as paid')}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                                }}
                                disabled={isProcessing}
                            >
                                Mark All Paid
                            </button>
                            <button
                                style={styles.quickActionButton}
                                onClick={() => handleQuickAction('Delete these fees')}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                                }}
                                disabled={isProcessing}
                            >
                                Delete All
                            </button>
                        </div>
                    )}
                </div>
            );
        }

        // Handle fee summary (has total_fee and total_records)
        if (data.total_fee !== undefined && data.total_records !== undefined) {
            return (
                <div>
                    {/* Month and School Header */}
                    {(data.month || data.school_name) && (
                        <div style={{
                            marginBottom: SPACING.sm,
                            padding: SPACING.xs,
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            textAlign: 'center',
                            fontSize: '0.9rem'
                        }}>
                            <strong>{data.month || ''}</strong>
                            {data.school_name && <span> • {data.school_name}</span>}
                            {!data.school_name && data.month && <span> • All Schools</span>}
                        </div>
                    )}
                    <div style={styles.summaryGrid}>
                        {/* Financial Summary - Main metrics */}
                        <div style={styles.summaryItem}>
                            <div style={{ ...styles.summaryValue, color: '#60A5FA' }}>
                                PKR {(data.total_fee || 0).toLocaleString()}
                            </div>
                            <div style={styles.summaryLabel}>Total Fee</div>
                        </div>
                        <div style={styles.summaryItem}>
                            <div style={{ ...styles.summaryValue, color: '#4ADE80' }}>
                                PKR {(data.total_received || 0).toLocaleString()}
                            </div>
                            <div style={styles.summaryLabel}>Received</div>
                        </div>
                        <div style={styles.summaryItem}>
                            <div style={{ ...styles.summaryValue, color: '#FCA5A5' }}>
                                PKR {(data.total_pending || 0).toLocaleString()}
                            </div>
                            <div style={styles.summaryLabel}>Pending</div>
                        </div>
                        {/* Record counts */}
                        <div style={styles.summaryItem}>
                            <div style={styles.summaryValue}>{data.total_records || 0}</div>
                            <div style={styles.summaryLabel}>Total Records</div>
                        </div>
                        <div style={styles.summaryItem}>
                            <div style={{ ...styles.summaryValue, color: '#4ADE80' }}>{data.paid_count || 0}</div>
                            <div style={styles.summaryLabel}>Paid</div>
                        </div>
                        <div style={styles.summaryItem}>
                            <div style={{ ...styles.summaryValue, color: '#FCA5A5' }}>{data.pending_count || 0}</div>
                            <div style={styles.summaryLabel}>Pending</div>
                        </div>
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
            {/* Compact Toolbar */}
            <div style={styles.toolbar}>
                <div style={styles.aiStatus}>
                    <div style={styles.statusDot} />
                    <span>{aiAvailable === null ? 'Checking...' : aiAvailable ? 'AI Ready' : 'Templates Only'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.xs }}>
                    {/* Undo Button */}
                    {canUndo && (
                        <button
                            onClick={handleUndo}
                            disabled={isProcessing}
                            style={{
                                ...styles.toolbarButton,
                                color: '#F59E0B',
                                opacity: isProcessing ? 0.5 : 1,
                            }}
                            title="Undo last action"
                        >
                            ↩️
                        </button>
                    )}
                    {/* Speech Toggle */}
                    {speechSupported && (
                        <button
                            onClick={() => {
                                if (speechEnabled) stopSpeaking();
                                setSpeechEnabled(prev => !prev);
                            }}
                            style={{
                                ...styles.toolbarButton,
                                color: speechEnabled ? '#4ADE80' : 'rgba(255,255,255,0.4)',
                            }}
                            title={speechEnabled ? 'Mute voice' : 'Enable voice'}
                        >
                            {speechEnabled ? '🔊' : '🔇'}
                        </button>
                    )}
                    {chatHistory.length > 0 && (
                        <button
                            onClick={() => {
                                setChatHistory([]);
                                setShowTemplates(true);
                                setPendingConfirmation(null);
                                setPendingOverwrite(null);
                                setLastAction(null);
                                setCanUndo(false);
                            }}
                            style={styles.toolbarButton}
                            title="Clear chat"
                        >
                            🗑️
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
                {chatHistory.map((msg, msgIdx) => (
                    <div key={msg.id}>
                        <div
                            style={{
                                ...styles.message,
                                ...(msg.type === 'user' ? styles.userMessage :
                                    msg.type === 'error' ? styles.errorMessage :
                                    msg.type === 'system' ? styles.systemMessage : styles.botMessage)
                            }}
                        >
                            {msg.content}
                            {msg.data && renderDataDisplay(msg.data, msg.id)}
                        </div>
                        {/* Follow-up suggestions after last bot message */}
                        {msg.type === 'bot' && msgIdx === chatHistory.length - 1 && lastAction && FOLLOW_UP_ACTIONS[lastAction] && !isProcessing && !pendingConfirmation && !pendingOverwrite && (
                            <div style={styles.followUpRow}>
                                {FOLLOW_UP_ACTIONS[lastAction].map((item, idx) => (
                                    <button
                                        key={idx}
                                        style={styles.followUpButton}
                                        onClick={() => {
                                            if (item.action === '__EXPORT_PDF__' && onExportPDF) {
                                                onExportPDF();
                                                addMessage('bot', '✅ PDF exported! Check your downloads.');
                                            } else {
                                                setLastAction(null);
                                                handleQuickAction(item.action);
                                            }
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.3)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'; }}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {/* Confirmation Buttons (Delete/Update) */}
                {pendingConfirmation && (
                    <div style={{ ...styles.botMessage, marginTop: SPACING.sm, padding: SPACING.md }}>
                        <div style={{ marginBottom: SPACING.sm, fontWeight: 500 }}>
                            {pendingConfirmation.action === 'DELETE_FEES' ? '🗑️' : '⚠️'} {pendingConfirmation.message}
                        </div>
                        <div style={styles.confirmationBox}>
                            <button
                                style={styles.noButton}
                                onClick={() => handleConfirm(false)}
                                disabled={isProcessing}
                            >
                                ✕ No
                            </button>
                            <button
                                style={styles.yesButton}
                                onClick={() => handleConfirm(true)}
                                disabled={isProcessing}
                            >
                                ✓ Yes
                            </button>
                        </div>
                        <div style={styles.keyboardHint}>Press Y to confirm, N to cancel</div>
                    </div>
                )}

                {/* Overwrite Confirmation Buttons */}
                {pendingOverwrite && (
                    <div style={{ ...styles.botMessage, marginTop: SPACING.sm, padding: SPACING.md }}>
                        <div style={{ marginBottom: SPACING.sm, fontWeight: 500 }}>
                            ⚠️ {pendingOverwrite.message || 'Records already exist for this month.'}
                        </div>
                        <div style={styles.confirmationBox}>
                            <button
                                style={styles.noButton}
                                onClick={() => handleOverwrite(false)}
                                disabled={isProcessing}
                            >
                                ✕ No, Keep Existing
                            </button>
                            <button
                                style={styles.yesButton}
                                onClick={() => handleOverwrite(true)}
                                disabled={isProcessing}
                            >
                                ✓ Yes, Overwrite
                            </button>
                        </div>
                        <div style={styles.keyboardHint}>Press Y to confirm, N to cancel</div>
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

            {/* Natural Language Input (AI Mode) with Voice Support */}
            {!activeTemplate && !pendingConfirmation && !pendingOverwrite && aiAvailable && (
                <AgentChatInput
                    value={inputMessage}
                    onChange={setInputMessage}
                    onSend={handleSendMessage}
                    isProcessing={isProcessing}
                    placeholder="Ask me to create fees, check recovery, find missing records..."
                    showMicButton={true}
                />
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
