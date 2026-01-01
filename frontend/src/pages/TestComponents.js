// ============================================
// TEST COMPONENTS - Phase 3 Testing Only
// ============================================

import React, { useState, useEffect } from 'react';

import { useUsers } from '../hooks/useUsers';


function TestComponents() {
  // State
const { users, loading, fetchUsers } = useUsers();

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading.users) return <div>Loading...</div>;

  return (
    <div>
      <h1>Users: {users.length}</h1>
      {users.map(user => (
        <div key={user.id}>{user.username} - {user.role}</div>
      ))}
    </div>
  );
}



export default TestComponents;