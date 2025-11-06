// src/components/BookTreeSelect.js
import React, { useState, useEffect } from 'react';
import { getAuthHeaders } from '../api';

const API_URL = 'http://127.0.0.1:8000/api/books/books/';

export default function BookTreeSelect({ onSelectTopic = () => {} }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const headers = getAuthHeaders();

        if (!headers.Authorization) {
          setError('Login required – no token found.');
          setLoading(false);
          return;
        }

        const response = await fetch(API_URL, { headers });

        if (!response.ok) {
          if (response.status === 401) throw new Error('Unauthorized – please log in again.');
          if (response.status === 404) throw new Error('API endpoint not found.');
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log('[BookTreeSelect] Books loaded:', data);
        setBooks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('[BookTreeSelect] Fetch failed:', err);
        setError(err.message || 'Failed to load books.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  // --- Render a node (topic) ---
  const renderNode = (node, level = 0) => (
    <div
      key={node.id}
      style={{
        marginLeft: level * 28,
        marginBottom: 6,
      }}
    >
      <div
        onClick={() => onSelectTopic(node)}
        style={{
          cursor: 'pointer',
          padding: '8px 12px',
          backgroundColor: '#eef7ff',
          borderRadius: 8,
          display: 'inline-block',
          fontSize: '14.5px',
          fontWeight: 500,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d0ebff')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#eef7ff')}
      >
        <strong style={{ color: '#1a73e8' }}>{node.code}</strong>{' '}
        <span style={{ color: '#333' }}>{node.title}</span>
      </div>
      {node.children?.map((child) => renderNode(child, level + 1))}
    </div>
  );

  // --- Render states ---
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#666' }}>
        <p>Loading books from server...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '1.5rem',
          background: '#ffebee',
          border: '1px solid #ffcdd2',
          borderRadius: 8,
          color: '#c62828',
          margin: '1rem 0',
        }}
      >
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!books.length) {
    return (
      <div style={{ padding: '1.5rem', color: '#999', fontStyle: 'italic' }}>
        No books available. Please import a CSV first.
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem 0' }}>
      <h3 style={{ margin: '0 0 1.5rem', color: '#1a73e8', fontSize: '1.4rem' }}>
        Select Topic for Lesson
      </h3>
      {books.map((book) => (
        <div key={book.id} style={{ marginBottom: '2rem' }}>
          <h4
            style={{
              margin: '0.5rem 0 1rem',
              color: '#333',
              fontSize: '1.1rem',
              fontWeight: 600,
              paddingLeft: 4,
            }}
          >
            {book.title}
          </h4>
          {book.topics?.length ? (
            book.topics.map((topic) => renderNode(topic))
          ) : (
            <p style={{ marginLeft: 28, color: '#999', fontStyle: 'italic' }}>
              No topics in this book.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}