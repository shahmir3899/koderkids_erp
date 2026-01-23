// ============================================
// INVENTORY AI CHAT - INTEGRATION EXAMPLE
// ============================================
// This is a complete working example showing how to integrate the
// InventoryAgentChat component into a page.
//
// Usage:
// 1. Import this component in your routing
// 2. Add to your routes: <Route path="/inventory-ai" element={<InventoryAIExample />} />
// 3. Navigate to /inventory-ai to see the AI chat in action
// ============================================

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import InventoryAgentChat from '../components/inventory/InventoryAgentChat';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('access');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const InventoryAIExample = () => {
    // ========== State ==========
    const [schools, setSchools] = useState([]);
    const [categories, setCategories] = useState([]);
    const [users, setUsers] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [loading, setLoading] = useState(true);

    // ========== Fetch Data on Mount ==========
    useEffect(() => {
        fetchSchools();
        fetchCategories();
        fetchUsers();
        fetchCurrentUser();
    }, []);

    const fetchSchools = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/schools/`, {
                headers: getAuthHeaders()
            });

            // Format schools for AI context
            const formattedSchools = response.data.map(school => ({
                id: school.id,
                name: school.name
            }));

            setSchools(formattedSchools);
        } catch (error) {
            console.error('Error fetching schools:', error);
            toast.error('Failed to load schools');
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/inventory/categories/`, {
                headers: getAuthHeaders()
            });

            // Format categories for AI context
            const formattedCategories = response.data.map(category => ({
                id: category.id,
                name: category.name
            }));

            setCategories(formattedCategories);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error('Failed to load categories');
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/inventory/assigned-users/`, {
                headers: getAuthHeaders()
            });

            // Format users for AI context
            const formattedUsers = response.data.map(user => ({
                id: user.id,
                name: user.name || user.username
            }));

            setUsers(formattedUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
            // Not critical - continue without users list
        }
    };

    const fetchCurrentUser = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/auth/user/`, {
                headers: getAuthHeaders()
            });

            setCurrentUserId(response.data.id);
        } catch (error) {
            console.error('Error fetching current user:', error);
            // Not critical - continue without current user ID
        }
    };

    // ========== Handle Refresh ==========
    // This is called after successful AI actions to refresh any displayed data
    const handleRefresh = () => {
        console.log('Inventory updated - refresh your data here');
        toast.success('Inventory updated successfully');

        // Example: If you have an inventory table, refresh it here
        // fetchInventoryItems();
    };

    // ========== Render ==========
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: '18px',
                color: '#666'
            }}>
                Loading...
            </div>
        );
    }

    return (
        <div style={{
            padding: '20px',
            maxWidth: '1400px',
            margin: '0 auto',
            minHeight: '100vh',
            backgroundColor: '#f5f5f5'
        }}>
            {/* Page Header */}
            <header style={{
                marginBottom: '30px',
                textAlign: 'center'
            }}>
                <h1 style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#333',
                    marginBottom: '10px'
                }}>
                    🤖 Inventory AI Assistant
                </h1>
                <p style={{
                    fontSize: '16px',
                    color: '#666',
                    maxWidth: '600px',
                    margin: '0 auto'
                }}>
                    Manage your school inventory using natural language commands.
                    Try: "show available items", "mark item 123 as damaged", "inventory summary"
                </p>
            </header>

            {/* Info Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>🏫</div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Schools</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
                        {schools.length}
                    </div>
                </div>

                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>📁</div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Categories</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
                        {categories.length}
                    </div>
                </div>

                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>🤖</div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>AI Status</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4CAF50' }}>
                        Ready
                    </div>
                </div>
            </div>

            {/* Main Chat Component */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                overflow: 'hidden'
            }}>
                <InventoryAgentChat
                    schools={schools}
                    categories={categories}
                    users={users}
                    currentUserId={currentUserId}
                    onRefresh={handleRefresh}
                    height="calc(100vh - 400px)"
                />
            </div>

            {/* Footer Help */}
            <div style={{
                marginTop: '30px',
                padding: '20px',
                backgroundColor: '#fff3cd',
                borderRadius: '12px',
                border: '1px solid #ffc107'
            }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: '#856404' }}>
                    💡 Tips
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#856404', fontSize: '14px' }}>
                    <li>Use natural language: "show available items" instead of complex queries</li>
                    <li>Context is preserved: after viewing items, you can say "mark all as damaged"</li>
                    <li>Confirmations required: destructive actions (delete) will ask for confirmation</li>
                    <li>Offline mode: If AI is unavailable, use the quick action templates</li>
                </ul>
            </div>
        </div>
    );
};

export default InventoryAIExample;
