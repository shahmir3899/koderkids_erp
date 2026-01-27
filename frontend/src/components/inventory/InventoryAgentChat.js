// ============================================
// INVENTORY AGENT CHAT COMPONENT
// AI-powered chat interface for inventory management operations
// Location: frontend/src/components/inventory/InventoryAgentChat.js
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
    buildInventoryContext
} from '../../services/aiService';

// Shared Agent Chat Components
import { AgentChatInput, useSpeechSynthesis } from '../agentChat';

// ============================================
// QUICK ACTION TEMPLATES (Fallback)
// ============================================
const INVENTORY_TEMPLATES = [
    {
        id: 'view_items',
        name: 'View Items',
        icon: '📦',
        description: 'List inventory items',
        fields: [
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: ['All', 'Available', 'Assigned', 'Damaged', 'Lost', 'Disposed'],
                optional: true
            },
            { key: 'school_id', label: 'School', type: 'school', optional: true }
        ]
    },
    {
        id: 'add_item',
        name: 'Add Item',
        icon: '➕',
        description: 'Create new inventory item',
        fields: [
            { key: 'name', label: 'Item Name', type: 'text' },
            { key: 'purchase_value', label: 'Value (PKR)', type: 'number' },
            { key: 'category_id', label: 'Category', type: 'category', optional: true },
            { key: 'school_id', label: 'School', type: 'school', optional: true }
        ]
    },
    {
        id: 'transfer_item',
        name: 'Transfer',
        icon: '🔄',
        description: 'Move item to another school',
        fields: [
            { key: 'item_id', label: 'Item ID', type: 'number' },
            { key: 'target_school_id', label: 'To School', type: 'school' }
        ]
    },
    {
        id: 'assign_item',
        name: 'Assign',
        icon: '👤',
        description: 'Assign item to user',
        fields: [
            { key: 'item_id', label: 'Item ID', type: 'number' },
            { key: 'user_id', label: 'Assign To', type: 'user', optional: true }
        ]
    },
    {
        id: 'update_status',
        name: 'Status',
        icon: '✏️',
        description: 'Change item status',
        fields: [
            { key: 'item_id', label: 'Item ID', type: 'number' },
            {
                key: 'status',
                label: 'New Status',
                type: 'select',
                options: ['Available', 'Assigned', 'Damaged', 'Lost', 'Disposed']
            }
        ]
    },
    {
        id: 'summary',
        name: 'Summary',
        icon: '📊',
        description: 'Inventory statistics',
        fields: [
            { key: 'school_id', label: 'School', type: 'school', optional: true }
        ]
    },
    {
        id: 'search',
        name: 'Search',
        icon: '🔍',
        description: 'Find items by keyword',
        fields: [
            { key: 'search', label: 'Search Text', type: 'text' }
        ]
    },
    {
        id: 'view_assigned',
        name: 'My Items',
        icon: '🙋',
        description: 'Items assigned to you',
        fields: []
    }
];

// Example prompts for users
const EXAMPLE_PROMPTS = [
    "Show available items",
    "Add laptop worth 85000 to Main School",
    "Transfer the projector at Main School to Soan Garden",
    "Assign the laptop to Ahmad",
    "Mark the printer at F-10 School as damaged",
    "Unassign Sara's laptop",
    "Show Electronics at Main School"
];

// ============================================
// MAIN COMPONENT
// ============================================
const InventoryAgentChat = ({ schools = [], categories = [], users = [], currentUserId = null, isAdmin = false, onRefresh, height = '500px' }) => {
    // Debug: Log user context on render
    console.log('🤖 InventoryAgent - currentUserId:', currentUserId, 'isAdmin:', isAdmin);

    // ========== State ==========
    const [chatHistory, setChatHistory] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiAvailable, setAiAvailable] = useState(null);
    const [activeTemplate, setActiveTemplate] = useState(null);
    const [formData, setFormData] = useState({});
    const [showTemplates, setShowTemplates] = useState(true);
    const [pendingConfirmation, setPendingConfirmation] = useState(null);

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

    // ========== Build Conversation History ==========
    const buildConversationHistory = useCallback(() => {
        return chatHistory.slice(-6).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content,
            data: msg.data || null
        }));
    }, [chatHistory]);

    // ========== Handle Send Message ==========
    const handleSendMessage = async () => {
        const message = inputMessage.trim();
        if (!message || isProcessing) return;

        setInputMessage('');
        setShowTemplates(false);
        addMessage('user', message);
        setIsProcessing(true);

        try {
            // Build context
            const context = buildInventoryContext(schools, categories, users, currentUserId, isAdmin);
            const conversationHistory = buildConversationHistory();

            // Execute AI command
            const result = await executeAICommand({
                message,
                agent: 'inventory',
                context,
                conversationHistory
            });

            console.log('AI Result:', result);

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
            } else if (result.action === 'CLARIFY') {
                addMessage('bot', `❓ ${result.message}`);
            } else if (result.action === 'CHAT') {
                addMessage('bot', `💬 ${result.message}`);
            } else if (result.fallback_to_templates) {
                addMessage('bot', `${result.message}\n\nPlease use the quick actions below.`);
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

    // ========== Handle Template Selection ==========
    const handleTemplateSelect = (template) => {
        setActiveTemplate(template);
        setFormData({});
        setShowTemplates(false);
        addMessage('bot', `Selected: ${template.name}\n\nPlease fill in the required fields:`);
    };

    // ========== Handle Field Change ==========
    const handleFieldChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    // ========== Execute Template Command ==========
    const executeTemplateCommand = async () => {
        if (!activeTemplate) return;

        const missingFields = activeTemplate.fields
            .filter(f => !f.optional && !formData[f.key])
            .map(f => f.label);

        if (missingFields.length > 0) {
            toast.warning(`Please fill: ${missingFields.join(', ')}`);
            return;
        }

        // Build natural language prompt from template
        let prompt = '';
        if (activeTemplate.id === 'view_items') {
            const status = formData.status && formData.status !== 'All' ? formData.status : null;
            const schoolId = formData.school_id;

            if (status && schoolId) {
                const school = schools.find(s => s.id === parseInt(schoolId));
                prompt = `show ${status.toLowerCase()} items for ${school?.name || 'school'}`;
            } else if (status) {
                prompt = `show ${status.toLowerCase()} items`;
            } else if (schoolId) {
                const school = schools.find(s => s.id === parseInt(schoolId));
                prompt = `show items for ${school?.name || 'school'}`;
            } else {
                prompt = 'show all items';
            }
        } else if (activeTemplate.id === 'add_item') {
            // Build add item prompt
            const parts = [`add item ${formData.name} worth ${formData.purchase_value}`];
            if (formData.category_id) {
                const category = categories.find(c => c.id === parseInt(formData.category_id));
                if (category) parts.push(`category ${category.name}`);
            }
            if (formData.school_id) {
                const school = schools.find(s => s.id === parseInt(formData.school_id));
                if (school) parts.push(`to ${school.name}`);
            }
            prompt = parts.join(' ');
        } else if (activeTemplate.id === 'transfer_item') {
            const school = schools.find(s => s.id === parseInt(formData.target_school_id));
            prompt = `transfer item ${formData.item_id} to ${school?.name || 'school'}`;
        } else if (activeTemplate.id === 'assign_item') {
            if (formData.user_id) {
                const user = users.find(u => u.id === parseInt(formData.user_id));
                prompt = `assign item ${formData.item_id} to ${user?.name || 'user'}`;
            } else {
                prompt = `unassign item ${formData.item_id}`;
            }
        } else if (activeTemplate.id === 'update_status') {
            prompt = `mark item ${formData.item_id} as ${formData.status}`;
        } else if (activeTemplate.id === 'summary') {
            const schoolId = formData.school_id;
            if (schoolId) {
                const school = schools.find(s => s.id === parseInt(schoolId));
                prompt = `inventory summary for ${school?.name || 'school'}`;
            } else {
                prompt = 'inventory summary';
            }
        } else if (activeTemplate.id === 'search') {
            prompt = `search for ${formData.search}`;
        } else if (activeTemplate.id === 'view_assigned') {
            prompt = 'show my assigned items';
        }

        // Set the prompt and send
        setInputMessage(prompt);
        resetForm();

        // Auto-send after state update
        setTimeout(() => {
            setInputMessage('');
            addMessage('user', prompt);
            setIsProcessing(true);

            // Execute command
            const context = buildInventoryContext(schools, categories, users, currentUserId, isAdmin);
            executeAICommand({
                message: prompt,
                agent: 'inventory',
                context,
                conversationHistory: buildConversationHistory()
            }).then(result => {
                if (result.success) {
                    addMessage('bot', `✅ ${result.message}`, result.data);
                    if (onRefresh) onRefresh();
                } else {
                    addMessage('error', result.message || 'Operation failed');
                }
            }).catch(error => {
                addMessage('error', 'Failed to process command');
            }).finally(() => {
                setIsProcessing(false);
            });
        }, 100);
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

    // ========== Styles (Matching FeeAgentChat) ==========
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
            transition: TRANSITIONS.fast
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

            case 'category':
                return (
                    <select
                        style={styles.formSelect}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    >
                        <option value="">Select Category...</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                );

            case 'user':
                return (
                    <select
                        style={styles.formSelect}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    >
                        <option value="">Select User...</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.name}
                            </option>
                        ))}
                    </select>
                );

            case 'select':
                return (
                    <select
                        style={styles.formSelect}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    >
                        <option value="">Select {field.label}...</option>
                        {field.options.map(opt => (
                            <option key={opt} value={opt}>
                                {opt}
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
                        placeholder={field.optional ? 'Optional' : 'Required'}
                    />
                );
        }
    };

    // ========== Render Data Display ==========
    const renderDataDisplay = (data) => {
        if (!data) return null;

        // Handle inventory items list
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            const statusColors = {
                'Available': '#4ADE80',
                'Assigned': '#60A5FA',
                'Damaged': '#F87171',
                'Lost': '#FBBF24',
                'Disposed': '#9CA3AF'
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
                            <div style={{ fontSize: FONT_SIZES.sm, fontWeight: 600, color: COLORS.text.white }}>
                                {data.count || data.results.length}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Items</div>
                        </div>
                        {data.status && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: FONT_SIZES.sm, fontWeight: 600, color: statusColors[data.status] || COLORS.text.white }}>
                                    {data.status}
                                </div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Status</div>
                            </div>
                        )}
                        {data.school_id && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: FONT_SIZES.sm, fontWeight: 600, color: COLORS.text.white }}>
                                    Filtered
                                </div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>By School</div>
                            </div>
                        )}
                    </div>

                    {/* Items list */}
                    {data.results.slice(0, 8).map((item, idx) => (
                        <div key={idx} style={{
                            padding: '6px 0',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontWeight: 500 }}>{item.name}</div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                                    {item.category} • {item.school || 'Unassigned'}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{
                                    fontSize: FONT_SIZES.xs,
                                    fontWeight: 600,
                                    color: statusColors[item.status] || '#FBBF24'
                                }}>
                                    {item.status}
                                </div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                                    #{item.id}
                                </div>
                            </div>
                        </div>
                    ))}
                    {data.count > 8 && (
                        <div style={{ marginTop: SPACING.xs, fontStyle: 'italic', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                            ...and {data.count - 8} more items
                        </div>
                    )}
                </div>
            );
        }

        // Handle inventory summary
        if (data.total_items !== undefined || data.by_status) {
            return (
                <div style={styles.summaryGrid}>
                    <div style={styles.summaryItem}>
                        <div style={{ ...styles.summaryValue, color: '#60A5FA' }}>
                            {data.total_items || 0}
                        </div>
                        <div style={styles.summaryLabel}>Total Items</div>
                    </div>
                    {data.by_status && Object.entries(data.by_status).map(([status, count]) => (
                        <div key={status} style={styles.summaryItem}>
                            <div style={{
                                ...styles.summaryValue,
                                color: status === 'Available' ? '#4ADE80' :
                                    status === 'Assigned' ? '#60A5FA' :
                                    status === 'Damaged' ? '#F87171' :
                                    status === 'Lost' ? '#FBBF24' : '#9CA3AF'
                            }}>
                                {count}
                            </div>
                            <div style={styles.summaryLabel}>{status}</div>
                        </div>
                    ))}
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
                    <span>📦</span>
                    <span>Inventory Agent</span>
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
                        <div style={styles.welcomeTitle}>Inventory Management Assistant</div>
                        <div style={styles.welcomeText}>
                            {aiAvailable
                                ? "View items, update status, delete records, get statistics"
                                : "Use the quick actions below to manage inventory"}
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

                {/* Confirmation Buttons */}
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

                {/* Processing Indicator with Spinner */}
                {isProcessing && (
                    <div style={{ ...styles.message, ...styles.botMessage, display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                        <div style={styles.spinner} />
                        <span>Processing...</span>
                    </div>
                )}
            </div>

            {/* Form Section (Template Mode) */}
            {activeTemplate && !pendingConfirmation && (
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
            {!activeTemplate && !pendingConfirmation && aiAvailable && (
                <AgentChatInput
                    value={inputMessage}
                    onChange={setInputMessage}
                    onSend={handleSendMessage}
                    isProcessing={isProcessing}
                    placeholder="Ask me to view items, update status, search inventory..."
                    showMicButton={true}
                />
            )}

            {/* Quick Actions Footer - Always visible at bottom when no template active */}
            {!activeTemplate && !pendingConfirmation && (
                <div style={styles.quickActionsFooter}>
                    <div style={{ fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.5)', marginBottom: SPACING.xs }}>
                        Quick Actions:
                    </div>
                    <div style={styles.quickActionsRow}>
                        {INVENTORY_TEMPLATES.map(template => (
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

export default InventoryAgentChat;
