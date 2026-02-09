// ============================================
// TRANSACTION AGENT CHAT COMPONENT
// AI-powered chat interface for transaction reconciliation
// Location: frontend/src/components/transactions/TransactionAgentChat.js
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
    buildTransactionContext,
    uploadStatementFile
} from '../../services/aiService';

// Shared Agent Chat Components
import { AgentChatInput, useSpeechSynthesis } from '../agentChat';

// ============================================
// QUICK ACTION TEMPLATES (Fallback)
// ============================================
const TRANSACTION_TEMPLATES = [
    {
        id: 'upload_statement',
        name: 'Upload Statement',
        icon: '📄',
        description: 'Parse bank statement file',
        fields: [
            {
                key: 'file',
                label: 'Statement File',
                type: 'file',
                accept: '.pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg'
            },
            { key: 'account_id', label: 'Account', type: 'account', optional: true }
        ]
    },
    {
        id: 'compare_balance',
        name: 'Compare Balance',
        icon: '⚖️',
        description: 'Check balance against statement',
        fields: [
            { key: 'account_id', label: 'Account', type: 'account' },
            { key: 'statement_balance', label: 'Statement Balance (PKR)', type: 'number' }
        ]
    },
    {
        id: 'find_missing',
        name: 'Find Missing',
        icon: '🔍',
        description: 'Find missing transactions',
        fields: [
            { key: 'account_id', label: 'Account', type: 'account' },
            { key: 'date_from', label: 'From Date', type: 'date', optional: true },
            { key: 'date_to', label: 'To Date', type: 'date', optional: true }
        ]
    },
    {
        id: 'view_transactions',
        name: 'Transactions',
        icon: '📋',
        description: 'View account transactions',
        fields: [
            { key: 'account_id', label: 'Account', type: 'account' },
            { key: 'limit', label: 'Show Last', type: 'number', optional: true }
        ]
    },
    {
        id: 'update_balance',
        name: 'Update Balance',
        icon: '✏️',
        description: 'Set account balance',
        fields: [
            { key: 'account_id', label: 'Account', type: 'account' },
            { key: 'new_balance', label: 'New Balance (PKR)', type: 'number' }
        ]
    },
    {
        id: 'list_accounts',
        name: 'Accounts',
        icon: '🏦',
        description: 'List all accounts',
        fields: []
    }
];

// Example prompts for users
const EXAMPLE_PROMPTS = [
    "Upload my Bank Islami statement",
    "Compare Bank Islami balance with 165,290",
    "Find missing entries for Shah Mir account",
    "Show last 20 transactions for Bank Islami",
    "List all accounts",
    "Update Bank Islami balance to 165,290"
];

// ============================================
// MAIN COMPONENT
// ============================================
const TransactionAgentChat = ({ accounts = [], onRefresh, height = '400px' }) => {
    // ========== State ==========
    const [chatHistory, setChatHistory] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiAvailable, setAiAvailable] = useState(null);
    const [activeTemplate, setActiveTemplate] = useState(null);
    const [formData, setFormData] = useState({});
    const [showTemplates, setShowTemplates] = useState(true);
    const [pendingConfirmation, setPendingConfirmation] = useState(null);
    const [uploadedStatement, setUploadedStatement] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // Missing entries review wizard state
    const [missingEntriesReview, setMissingEntriesReview] = useState(null);
    // { accountId, accountName, entries: [{id, date, amount, type, description, confirmed, editing}] }

    // Refs
    const chatContainerRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);

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
            timestamp: new Date().toLocaleTimeString()
        }]);
    }, []);

    // ========== Build Conversation History for Context ==========
    const buildConversationHistory = useCallback(() => {
        return chatHistory.slice(-10).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));
    }, [chatHistory]);

    // ========== File Upload Handler ==========
    const handleFileUpload = async (file, accountId = null) => {
        if (!file) return;

        setIsProcessing(true);
        addMessage('user', `Uploading: ${file.name}`);

        try {
            const result = await uploadStatementFile(file, accountId);

            if (result.success) {
                setUploadedStatement(result.data);

                const data = result.data;
                let message = `**Statement Parsed Successfully**\n\n`;
                message += `**Account:** ${data.account_name || 'Unknown'}\n`;

                if (data.closing_balance) {
                    message += `**Closing Balance:** PKR ${data.closing_balance.toLocaleString()}\n`;
                }

                message += `**Transactions Found:** ${data.summary?.transaction_count || 0}\n\n`;
                message += `What would you like to do?\n`;
                message += `- "Compare balance" - Check against database\n`;
                message += `- "Find missing entries" - Identify gaps`;

                addMessage('bot', message, data);
            } else {
                addMessage('error', `Upload failed: ${result.error}`);
            }
        } catch (error) {
            addMessage('error', `Upload error: ${error.message}`);
        }

        setIsProcessing(false);
    };

    // ========== Drag and Drop Handlers ==========
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    // ========== Send Message ==========
    const handleSendMessage = async (message = inputMessage) => {
        if (!message.trim() || isProcessing) return;

        const userMessage = message.trim();
        addMessage('user', userMessage);
        setInputMessage('');
        setIsProcessing(true);
        setShowTemplates(false);

        try {
            const context = buildTransactionContext(accounts);

            // Add uploaded statement data to context if available
            if (uploadedStatement) {
                context.uploaded_statement = uploadedStatement;
            }

            const result = await executeAICommand({
                message: userMessage,
                agent: 'transaction',
                context,
                conversationHistory: buildConversationHistory()
            });

            if (result.needs_confirmation) {
                setPendingConfirmation({
                    token: result.confirmation_token,
                    action: result.action,
                    message: result.message,
                    data: result.data
                });
                addMessage('confirmation', result.message, result.data);
            } else if (result.success) {
                addMessage('bot', result.message, result.data);

                // Check if this is a FIND_MISSING_ENTRIES response with entries
                if (result.action === 'FIND_MISSING_ENTRIES' &&
                    result.data?.missing_entries &&
                    result.data.missing_entries.length > 0) {
                    // Enter review wizard mode
                    const entries = result.data.missing_entries.map((entry, index) => ({
                        id: index + 1,
                        date: entry.date || '',
                        amount: entry.amount || 0,
                        type: entry.type || 'deposit',
                        description: entry.description || '',
                        confirmed: true, // Default to confirmed
                        editing: false
                    }));

                    setMissingEntriesReview({
                        accountId: result.data.account_id,
                        accountName: result.data.account_name,
                        entries
                    });

                    addMessage('system', `Found ${entries.length} missing entries. Please review each entry below and confirm or skip.`);
                }

                // Refresh data if action was executed
                if (result.action && !['CHAT', 'CLARIFY', 'GET_ACCOUNTS', 'GET_ACCOUNT_TRANSACTIONS', 'GET_ACCOUNT_DETAILS', 'FIND_MISSING_ENTRIES'].includes(result.action)) {
                    onRefresh?.();
                }
            } else {
                addMessage('error', result.message || 'Action failed');
            }
        } catch (error) {
            addMessage('error', `Error: ${error.message}`);
        }

        setIsProcessing(false);
    };

    // ========== Handle Confirmation ==========
    const handleConfirm = async (confirmed) => {
        if (!pendingConfirmation) return;

        setIsProcessing(true);

        try {
            // If we have reviewed transactions to add, pass them as edited params
            const editedParams = pendingConfirmation.transactionsToAdd
                ? { transactions_to_add: pendingConfirmation.transactionsToAdd }
                : null;

            const result = await confirmAIAction(pendingConfirmation.token, confirmed, editedParams);

            if (confirmed) {
                if (result.success) {
                    addMessage('bot', result.message, result.data);
                    onRefresh?.();
                } else {
                    addMessage('error', result.message || 'Action failed');
                }
            } else {
                addMessage('system', 'Action cancelled.');
            }
        } catch (error) {
            addMessage('error', `Error: ${error.message}`);
        }

        setPendingConfirmation(null);
        setIsProcessing(false);
    };

    // ========== Missing Entries Review Handlers ==========
    const handleToggleEntryConfirm = (entryId) => {
        setMissingEntriesReview(prev => ({
            ...prev,
            entries: prev.entries.map(entry =>
                entry.id === entryId
                    ? { ...entry, confirmed: !entry.confirmed }
                    : entry
            )
        }));
    };

    const handleEditEntry = (entryId, field, value) => {
        setMissingEntriesReview(prev => ({
            ...prev,
            entries: prev.entries.map(entry =>
                entry.id === entryId
                    ? { ...entry, [field]: value }
                    : entry
            )
        }));
    };

    const handleToggleEditMode = (entryId) => {
        setMissingEntriesReview(prev => ({
            ...prev,
            entries: prev.entries.map(entry =>
                entry.id === entryId
                    ? { ...entry, editing: !entry.editing }
                    : entry
            )
        }));
    };

    const handleSelectAllEntries = (selectAll) => {
        setMissingEntriesReview(prev => ({
            ...prev,
            entries: prev.entries.map(entry => ({ ...entry, confirmed: selectAll }))
        }));
    };

    const handleCancelReview = () => {
        setMissingEntriesReview(null);
        addMessage('system', 'Missing entries review cancelled.');
    };

    const handleSubmitConfirmedEntries = async () => {
        if (!missingEntriesReview) return;

        const confirmedEntries = missingEntriesReview.entries.filter(e => e.confirmed);

        if (confirmedEntries.length === 0) {
            toast.warning('No entries selected. Please confirm at least one entry.');
            return;
        }

        setIsProcessing(true);

        // Format entries for the backend
        const transactionsToAdd = confirmedEntries.map(entry => ({
            date: entry.date,
            description: entry.description,
            deposit: entry.type === 'deposit' ? entry.amount : 0,
            withdrawal: entry.type === 'withdrawal' ? entry.amount : 0
        }));

        try {
            const context = buildTransactionContext(accounts);

            // Build summary message
            const depositEntries = confirmedEntries.filter(e => e.type === 'deposit');
            const withdrawalEntries = confirmedEntries.filter(e => e.type === 'withdrawal');
            const totalDeposits = depositEntries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
            const totalWithdrawals = withdrawalEntries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

            const message = `Add ${confirmedEntries.length} reviewed entries to ${missingEntriesReview.accountName}: ` +
                `${depositEntries.length} deposits (PKR ${totalDeposits.toLocaleString()}), ` +
                `${withdrawalEntries.length} withdrawals (PKR ${totalWithdrawals.toLocaleString()})`;

            addMessage('user', message);

            // Send a simple reconcile request - the LLM will call EXECUTE_RECONCILIATION
            // We include the transactions in context so they're available
            context.reviewed_transactions = transactionsToAdd;
            context.reviewed_account_id = missingEntriesReview.accountId;

            const result = await executeAICommand({
                message: `Reconcile ${missingEntriesReview.accountName} with the ${confirmedEntries.length} reviewed transactions I just confirmed`,
                agent: 'transaction',
                context,
                conversationHistory: buildConversationHistory()
            });

            if (result.needs_confirmation) {
                // Store the transactions in pending confirmation for final confirm
                setPendingConfirmation({
                    token: result.confirmation_token,
                    action: result.action,
                    message: `**Confirm adding ${confirmedEntries.length} entries to ${missingEntriesReview.accountName}:**\n\n` +
                        confirmedEntries.slice(0, 5).map(e =>
                            `• ${e.date}: PKR ${parseFloat(e.amount).toLocaleString()} (${e.type})`
                        ).join('\n') +
                        (confirmedEntries.length > 5 ? `\n... and ${confirmedEntries.length - 5} more` : ''),
                    data: { ...result.data, transactions_to_add: transactionsToAdd },
                    transactionsToAdd // Store for passing to confirmAIAction
                });
                addMessage('confirmation', `Ready to add ${confirmedEntries.length} entries. Please confirm.`);
                setMissingEntriesReview(null);
            } else if (result.success) {
                addMessage('bot', result.message, result.data);
                setMissingEntriesReview(null);
                onRefresh?.();
            } else {
                addMessage('error', result.message || 'Failed to add entries');
            }
        } catch (error) {
            addMessage('error', `Error: ${error.message}`);
        }

        setIsProcessing(false);
    };

    // ========== Template Execution ==========
    const handleTemplateSubmit = async () => {
        if (!activeTemplate) return;

        // Handle file upload template
        if (activeTemplate.id === 'upload_statement') {
            const file = formData.file;
            if (file) {
                await handleFileUpload(file, formData.account_id);
            } else {
                toast.error('Please select a file');
            }
            setActiveTemplate(null);
            setFormData({});
            return;
        }

        // Build message from template
        let message = '';
        switch (activeTemplate.id) {
            case 'compare_balance':
                const account = accounts.find(a => a.id === parseInt(formData.account_id));
                message = `Compare ${account?.account_name || 'account'} balance with ${formData.statement_balance}`;
                break;
            case 'find_missing':
                const acc2 = accounts.find(a => a.id === parseInt(formData.account_id));
                message = `Find missing entries for ${acc2?.account_name || 'account'}`;
                if (formData.date_from) message += ` from ${formData.date_from}`;
                if (formData.date_to) message += ` to ${formData.date_to}`;
                break;
            case 'view_transactions':
                const acc3 = accounts.find(a => a.id === parseInt(formData.account_id));
                message = `Show ${formData.limit || 20} transactions for ${acc3?.account_name || 'account'}`;
                break;
            case 'update_balance':
                const acc4 = accounts.find(a => a.id === parseInt(formData.account_id));
                message = `Update ${acc4?.account_name || 'account'} balance to ${formData.new_balance}`;
                break;
            case 'list_accounts':
                message = 'List all accounts';
                break;
            default:
                message = Object.entries(formData).map(([k, v]) => `${k}: ${v}`).join(', ');
        }

        setActiveTemplate(null);
        setFormData({});
        await handleSendMessage(message);
    };

    // ========== Render Field ==========
    const renderFormField = (field) => {
        if (field.type === 'account') {
            return (
                <select
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    style={styles.formInput}
                >
                    <option value="">Select Account</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                            {acc.account_name} (PKR {parseFloat(acc.current_balance || 0).toLocaleString()})
                        </option>
                    ))}
                </select>
            );
        }

        if (field.type === 'file') {
            return (
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={field.accept}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.files[0] })}
                        style={{ display: 'none' }}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={styles.fileButton}
                    >
                        {formData[field.key]?.name || 'Choose File'}
                    </button>
                </div>
            );
        }

        if (field.type === 'date') {
            return (
                <input
                    type="date"
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    style={styles.formInput}
                />
            );
        }

        return (
            <input
                type={field.type === 'number' ? 'number' : 'text'}
                value={formData[field.key] || ''}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                placeholder={field.label}
                style={styles.formInput}
            />
        );
    };

    // ========== Render Message ==========
    const renderMessage = (msg) => {
        const baseStyle = {
            ...styles.message,
            ...(msg.type === 'user' ? styles.userMessage : {}),
            ...(msg.type === 'bot' ? styles.botMessage : {}),
            ...(msg.type === 'error' ? styles.errorMessage : {}),
            ...(msg.type === 'system' ? styles.systemMessage : {}),
            ...(msg.type === 'confirmation' ? styles.confirmationMessage : {})
        };

        return (
            <div key={msg.id} style={baseStyle}>
                <div style={styles.messageContent}>
                    {msg.content.split('\n').map((line, i) => (
                        <p key={i} style={{ margin: '2px 0' }}>
                            {line.startsWith('**') && line.endsWith('**')
                                ? <strong>{line.slice(2, -2)}</strong>
                                : line.replace(/\*\*(.*?)\*\*/g, '$1')}
                        </p>
                    ))}
                </div>
                {msg.type === 'confirmation' && pendingConfirmation && (
                    <div style={styles.confirmationButtons}>
                        <button
                            onClick={() => handleConfirm(true)}
                            style={styles.confirmButton}
                            disabled={isProcessing}
                        >
                            Confirm
                        </button>
                        <button
                            onClick={() => handleConfirm(false)}
                            style={styles.cancelButton}
                            disabled={isProcessing}
                        >
                            Cancel
                        </button>
                    </div>
                )}
                <span style={styles.timestamp}>{msg.timestamp}</span>
            </div>
        );
    };

    // ========== Render ==========
    return (
        <div
            style={{ ...styles.container, height }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Header */}
            <div style={styles.header}>
                <span style={styles.headerTitle}>Transaction Reconciliation Agent</span>
                <span style={{
                    ...styles.statusBadge,
                    backgroundColor: aiAvailable ? COLORS.success : COLORS.error
                }}>
                    {aiAvailable ? 'AI Ready' : 'Templates Only'}
                </span>
            </div>

            {/* Drag Drop Overlay */}
            {isDragging && (
                <div style={styles.dropOverlay}>
                    <span style={styles.dropText}>Drop file to upload</span>
                </div>
            )}

            {/* Chat Area */}
            <div ref={chatContainerRef} style={styles.chatArea}>
                {chatHistory.length === 0 && (
                    <div style={styles.welcomeMessage}>
                        <h4>Welcome to Transaction Reconciliation</h4>
                        <p>I can help you:</p>
                        <ul>
                            <li>Upload and parse bank statements (PDF, Excel, Images)</li>
                            <li>Compare balances with database records</li>
                            <li>Find missing transactions</li>
                            <li>Reconcile accounts</li>
                        </ul>
                        <p style={{ marginTop: SPACING.sm }}>
                            <strong>Try:</strong> Drag & drop a statement file or type a command
                        </p>
                    </div>
                )}
                {chatHistory.map(renderMessage)}
                {isProcessing && (
                    <div style={styles.processingIndicator}>
                        <span>Processing...</span>
                    </div>
                )}
            </div>

            {/* Templates */}
            {showTemplates && !activeTemplate && (
                <div style={styles.templatesContainer}>
                    <div style={styles.templateGrid}>
                        {TRANSACTION_TEMPLATES.map(template => (
                            <button
                                key={template.id}
                                onClick={() => {
                                    if (template.fields.length === 0) {
                                        handleSendMessage(template.description);
                                    } else {
                                        setActiveTemplate(template);
                                    }
                                }}
                                style={styles.templateButton}
                            >
                                <span style={styles.templateIcon}>{template.icon}</span>
                                <span style={styles.templateName}>{template.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Template Form */}
            {activeTemplate && (
                <div style={styles.templateForm}>
                    <div style={styles.templateFormHeader}>
                        <span>{activeTemplate.icon} {activeTemplate.name}</span>
                        <button onClick={() => { setActiveTemplate(null); setFormData({}); }} style={styles.closeButton}>×</button>
                    </div>
                    <div style={styles.formFields}>
                        {activeTemplate.fields.map(field => (
                            <div key={field.key} style={styles.formField}>
                                <label style={styles.formLabel}>
                                    {field.label} {field.optional && <span style={{ opacity: 0.6 }}>(optional)</span>}
                                </label>
                                {renderFormField(field)}
                            </div>
                        ))}
                    </div>
                    <button onClick={handleTemplateSubmit} style={styles.submitButton} disabled={isProcessing}>
                        {isProcessing ? 'Processing...' : 'Execute'}
                    </button>
                </div>
            )}

            {/* Missing Entries Review Wizard */}
            {missingEntriesReview && (
                <div style={styles.reviewWizard}>
                    <div style={styles.reviewHeader}>
                        <span style={styles.reviewTitle}>
                            Review Missing Entries - {missingEntriesReview.accountName}
                        </span>
                        <div style={styles.reviewActions}>
                            <button
                                onClick={() => handleSelectAllEntries(true)}
                                style={styles.selectAllButton}
                            >
                                Select All
                            </button>
                            <button
                                onClick={() => handleSelectAllEntries(false)}
                                style={styles.deselectAllButton}
                            >
                                Deselect All
                            </button>
                        </div>
                    </div>

                    <div style={styles.entriesList}>
                        {missingEntriesReview.entries.map((entry, index) => (
                            <div
                                key={entry.id}
                                style={{
                                    ...styles.entryCard,
                                    opacity: entry.confirmed ? 1 : 0.5,
                                    borderColor: entry.confirmed ? COLORS.success : COLORS.border
                                }}
                            >
                                <div style={styles.entryHeader}>
                                    <label style={styles.entryCheckbox}>
                                        <input
                                            type="checkbox"
                                            checked={entry.confirmed}
                                            onChange={() => handleToggleEntryConfirm(entry.id)}
                                            style={{ marginRight: SPACING.xs }}
                                        />
                                        <span style={styles.entryNumber}>#{index + 1}</span>
                                    </label>
                                    <span style={{
                                        ...styles.entryType,
                                        backgroundColor: entry.type === 'deposit' ? '#dcfce7' : '#fee2e2',
                                        color: entry.type === 'deposit' ? '#166534' : '#991b1b'
                                    }}>
                                        {entry.type === 'deposit' ? '📥 Deposit' : '📤 Withdrawal'}
                                    </span>
                                    <button
                                        onClick={() => handleToggleEditMode(entry.id)}
                                        style={styles.editButton}
                                    >
                                        {entry.editing ? '✓ Done' : '✏️ Edit'}
                                    </button>
                                </div>

                                {entry.editing ? (
                                    <div style={styles.entryEditForm}>
                                        <div style={styles.entryEditRow}>
                                            <label style={styles.entryEditLabel}>Date:</label>
                                            <input
                                                type="date"
                                                value={entry.date}
                                                onChange={(e) => handleEditEntry(entry.id, 'date', e.target.value)}
                                                style={styles.entryEditInput}
                                            />
                                        </div>
                                        <div style={styles.entryEditRow}>
                                            <label style={styles.entryEditLabel}>Amount:</label>
                                            <input
                                                type="number"
                                                value={entry.amount}
                                                onChange={(e) => handleEditEntry(entry.id, 'amount', parseFloat(e.target.value) || 0)}
                                                style={styles.entryEditInput}
                                            />
                                        </div>
                                        <div style={styles.entryEditRow}>
                                            <label style={styles.entryEditLabel}>Type:</label>
                                            <select
                                                value={entry.type}
                                                onChange={(e) => handleEditEntry(entry.id, 'type', e.target.value)}
                                                style={styles.entryEditInput}
                                            >
                                                <option value="deposit">Deposit</option>
                                                <option value="withdrawal">Withdrawal</option>
                                            </select>
                                        </div>
                                        <div style={styles.entryEditRow}>
                                            <label style={styles.entryEditLabel}>Description:</label>
                                            <input
                                                type="text"
                                                value={entry.description}
                                                onChange={(e) => handleEditEntry(entry.id, 'description', e.target.value)}
                                                style={styles.entryEditInput}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={styles.entryDetails}>
                                        <div style={styles.entryRow}>
                                            <span style={styles.entryLabel}>Date:</span>
                                            <span style={styles.entryValue}>{entry.date || 'N/A'}</span>
                                        </div>
                                        <div style={styles.entryRow}>
                                            <span style={styles.entryLabel}>Amount:</span>
                                            <span style={styles.entryAmount}>
                                                PKR {parseFloat(entry.amount).toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={styles.entryRow}>
                                            <span style={styles.entryLabel}>Description:</span>
                                            <span style={styles.entryDesc}>{entry.description || 'N/A'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div style={styles.reviewFooter}>
                        <div style={styles.reviewSummary}>
                            <span>
                                Selected: {missingEntriesReview.entries.filter(e => e.confirmed).length} / {missingEntriesReview.entries.length} entries
                            </span>
                            <span style={styles.reviewTotal}>
                                Total: PKR {missingEntriesReview.entries
                                    .filter(e => e.confirmed)
                                    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
                                    .toLocaleString()}
                            </span>
                        </div>
                        <div style={styles.reviewButtons}>
                            <button
                                onClick={handleCancelReview}
                                style={styles.reviewCancelButton}
                                disabled={isProcessing}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitConfirmedEntries}
                                style={styles.reviewConfirmButton}
                                disabled={isProcessing || missingEntriesReview.entries.filter(e => e.confirmed).length === 0}
                            >
                                {isProcessing ? 'Processing...' : `Add ${missingEntriesReview.entries.filter(e => e.confirmed).length} Entries`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div style={styles.inputArea}>
                <AgentChatInput
                    value={inputMessage}
                    onChange={setInputMessage}
                    onSend={() => handleSendMessage()}
                    disabled={isProcessing || !!pendingConfirmation || !!missingEntriesReview}
                    isProcessing={isProcessing}
                    placeholder={missingEntriesReview ? "Review entries above first..." : "Type a command or drop a file..."}
                />
            </div>
        </div>
    );
};

// ============================================
// STYLES
// ============================================
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: COLORS.background,
        borderRadius: BORDER_RADIUS.lg,
        border: `1px solid ${COLORS.border}`,
        overflow: 'hidden',
        position: 'relative'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottom: `1px solid ${COLORS.border}`
    },
    headerTitle: {
        fontWeight: 600,
        fontSize: FONT_SIZES.sm
    },
    statusBadge: {
        padding: `${SPACING.xs} ${SPACING.sm}`,
        borderRadius: BORDER_RADIUS.full,
        fontSize: FONT_SIZES.xs,
        color: COLORS.white
    },
    chatArea: {
        flex: 1,
        overflowY: 'auto',
        padding: SPACING.md,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.sm
    },
    welcomeMessage: {
        backgroundColor: COLORS.surface,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.sm,
        '& h4': { marginBottom: SPACING.sm },
        '& ul': { marginLeft: SPACING.lg, marginTop: SPACING.xs }
    },
    message: {
        maxWidth: '85%',
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.sm,
        position: 'relative'
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: COLORS.primary,
        color: COLORS.white
    },
    botMessage: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.border}`
    },
    errorMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#fee2e2',
        border: `1px solid ${COLORS.error}`,
        color: COLORS.error
    },
    systemMessage: {
        alignSelf: 'center',
        backgroundColor: COLORS.surface,
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.xs
    },
    confirmationMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#fef3c7',
        border: `1px solid ${COLORS.warning}`
    },
    messageContent: {
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
    },
    timestamp: {
        display: 'block',
        fontSize: FONT_SIZES.xs,
        opacity: 0.6,
        marginTop: SPACING.xs,
        textAlign: 'right'
    },
    confirmationButtons: {
        display: 'flex',
        gap: SPACING.sm,
        marginTop: SPACING.sm
    },
    confirmButton: {
        padding: `${SPACING.xs} ${SPACING.md}`,
        backgroundColor: COLORS.success,
        color: COLORS.white,
        border: 'none',
        borderRadius: BORDER_RADIUS.sm,
        cursor: 'pointer',
        fontSize: FONT_SIZES.sm
    },
    cancelButton: {
        padding: `${SPACING.xs} ${SPACING.md}`,
        backgroundColor: COLORS.error,
        color: COLORS.white,
        border: 'none',
        borderRadius: BORDER_RADIUS.sm,
        cursor: 'pointer',
        fontSize: FONT_SIZES.sm
    },
    templatesContainer: {
        padding: SPACING.sm,
        borderTop: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.surface
    },
    templateGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
        gap: SPACING.xs
    },
    templateButton: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: SPACING.sm,
        backgroundColor: COLORS.background,
        border: `1px solid ${COLORS.border}`,
        borderRadius: BORDER_RADIUS.md,
        cursor: 'pointer',
        transition: TRANSITIONS.default,
        '&:hover': {
            backgroundColor: COLORS.primary,
            color: COLORS.white
        }
    },
    templateIcon: {
        fontSize: FONT_SIZES.xl,
        marginBottom: SPACING.xs
    },
    templateName: {
        fontSize: FONT_SIZES.xs,
        textAlign: 'center'
    },
    templateForm: {
        padding: SPACING.md,
        borderTop: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.surface
    },
    templateFormHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        fontWeight: 600
    },
    closeButton: {
        background: 'none',
        border: 'none',
        fontSize: FONT_SIZES.xl,
        cursor: 'pointer',
        opacity: 0.6
    },
    formFields: {
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.sm
    },
    formField: {
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.xs
    },
    formLabel: {
        fontSize: FONT_SIZES.xs,
        fontWeight: 500
    },
    formInput: {
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        border: `1px solid ${COLORS.border}`,
        fontSize: FONT_SIZES.sm
    },
    fileButton: {
        padding: SPACING.sm,
        backgroundColor: COLORS.background,
        border: `1px dashed ${COLORS.border}`,
        borderRadius: BORDER_RADIUS.sm,
        cursor: 'pointer',
        width: '100%',
        textAlign: 'center'
    },
    submitButton: {
        marginTop: SPACING.sm,
        padding: SPACING.sm,
        backgroundColor: COLORS.primary,
        color: COLORS.white,
        border: 'none',
        borderRadius: BORDER_RADIUS.sm,
        cursor: 'pointer',
        width: '100%',
        fontWeight: 600
    },
    inputArea: {
        padding: SPACING.sm,
        borderTop: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.surface
    },
    processingIndicator: {
        alignSelf: 'center',
        padding: SPACING.sm,
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm
    },
    dropOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        border: `3px dashed ${COLORS.primary}`,
        borderRadius: BORDER_RADIUS.lg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10
    },
    dropText: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 600,
        color: COLORS.primary
    },

    // ========== Review Wizard Styles ==========
    reviewWizard: {
        borderTop: `2px solid ${COLORS.primary}`,
        backgroundColor: COLORS.surface,
        maxHeight: '400px',
        display: 'flex',
        flexDirection: 'column'
    },
    reviewHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.sm,
        backgroundColor: COLORS.primary,
        color: COLORS.white
    },
    reviewTitle: {
        fontWeight: 600,
        fontSize: FONT_SIZES.sm
    },
    reviewActions: {
        display: 'flex',
        gap: SPACING.xs
    },
    selectAllButton: {
        padding: `${SPACING.xs} ${SPACING.sm}`,
        backgroundColor: 'rgba(255,255,255,0.2)',
        color: COLORS.white,
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: BORDER_RADIUS.sm,
        cursor: 'pointer',
        fontSize: FONT_SIZES.xs
    },
    deselectAllButton: {
        padding: `${SPACING.xs} ${SPACING.sm}`,
        backgroundColor: 'rgba(255,255,255,0.1)',
        color: COLORS.white,
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: BORDER_RADIUS.sm,
        cursor: 'pointer',
        fontSize: FONT_SIZES.xs
    },
    entriesList: {
        flex: 1,
        overflowY: 'auto',
        padding: SPACING.sm,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.xs
    },
    entryCard: {
        backgroundColor: COLORS.background,
        border: `2px solid ${COLORS.border}`,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.sm,
        transition: TRANSITIONS.default
    },
    entryHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.xs,
        paddingBottom: SPACING.xs,
        borderBottom: `1px solid ${COLORS.border}`
    },
    entryCheckbox: {
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        fontWeight: 600
    },
    entryNumber: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary
    },
    entryType: {
        padding: `2px ${SPACING.xs}`,
        borderRadius: BORDER_RADIUS.sm,
        fontSize: FONT_SIZES.xs,
        fontWeight: 600
    },
    editButton: {
        marginLeft: 'auto',
        padding: `2px ${SPACING.xs}`,
        backgroundColor: 'transparent',
        border: `1px solid ${COLORS.border}`,
        borderRadius: BORDER_RADIUS.sm,
        cursor: 'pointer',
        fontSize: FONT_SIZES.xs
    },
    entryDetails: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
    },
    entryRow: {
        display: 'flex',
        gap: SPACING.sm,
        fontSize: FONT_SIZES.sm
    },
    entryLabel: {
        color: COLORS.textSecondary,
        minWidth: '80px'
    },
    entryValue: {
        color: COLORS.text
    },
    entryAmount: {
        fontWeight: 600,
        color: COLORS.primary
    },
    entryDesc: {
        color: COLORS.text,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '250px'
    },
    entryEditForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.xs
    },
    entryEditRow: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm
    },
    entryEditLabel: {
        minWidth: '80px',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary
    },
    entryEditInput: {
        flex: 1,
        padding: SPACING.xs,
        border: `1px solid ${COLORS.border}`,
        borderRadius: BORDER_RADIUS.sm,
        fontSize: FONT_SIZES.sm
    },
    reviewFooter: {
        padding: SPACING.sm,
        borderTop: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.background
    },
    reviewSummary: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary
    },
    reviewTotal: {
        fontWeight: 600,
        color: COLORS.primary
    },
    reviewButtons: {
        display: 'flex',
        gap: SPACING.sm
    },
    reviewCancelButton: {
        flex: 1,
        padding: SPACING.sm,
        backgroundColor: COLORS.background,
        color: COLORS.text,
        border: `1px solid ${COLORS.border}`,
        borderRadius: BORDER_RADIUS.sm,
        cursor: 'pointer',
        fontWeight: 600
    },
    reviewConfirmButton: {
        flex: 2,
        padding: SPACING.sm,
        backgroundColor: COLORS.success,
        color: COLORS.white,
        border: 'none',
        borderRadius: BORDER_RADIUS.sm,
        cursor: 'pointer',
        fontWeight: 600
    }
};

export default TransactionAgentChat;
