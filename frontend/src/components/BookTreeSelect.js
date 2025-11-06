// src/components/BookTreeSelect.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api/books/books/';

export default function BookTreeSelect({ onSelectTopic = () => {} }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    console.log('[BookTreeSelect] Token:', token ? 'Found' : 'Missing');

    if (!token) {
      setError('Login required – token missing.');
      setLoading(false);
      return;
    }

    axios
      .get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      .then((res) => {
        console.log('[BookTreeSelect] API Success:', res.data);
        setBooks(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch((err) => {
        const status = err.response?.status;
        const message = err.response?.data?.detail || err.message;
        console.error('[BookTreeSelect] API Failed:', { status, message, err });

        if (status === 401) setError('Unauthorized – invalid or expired token.');
        else if (status === 404) setError('API endpoint not found. Check URL.');
        else if (status >= 500) setError('Server error. Try again later.');
        else setError(`Load failed: ${message}`);

        setLoading(false);
      });
  }, []);

  // === RENDER HELPERS ===
  const renderNode = (node, level = 0) => (
    <div
      key={node.id}
      style={{
        marginLeft: level * 24,
        marginBottom: 4,
      }}
    >
      <div
        onClick={() => onSelectTopic(node)}
        style={{
          cursor: 'pointer',
          padding: '6px 10px',
          backgroundColor: '#f0f8ff',
          borderRadius: 6,
          display: 'inline-block',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        <strong>{node.code}</strong> {node.title}
      </div>
      {node.children?.map((child) => renderNode(child, level + 1))}
    </div>
  );

  // === MAIN RENDER ===
  if (loading) {
    return <p style={{ color: '#666' }}>Loading books…</p>;
  }

  if (error) {
    return (
      <div style={{ color: 'red', padding: '1rem', background: '#fff5f5', borderRadius: 6 }}>
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!books.length) {
    return <p style={{ color: '#999' }}>No books found. Import a CSV first.</p>;
  }

  return (
    <div>
      <h3 style={{ marginBottom: '1rem', color: '#333' }}>Select Topic for Lesson</h3>
      {books.map((book) => (
        <div key={book.id} style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0.5rem 0', color: '#1a73e8' }}>{book.title}</h4>
          {book.topics?.length ? (
            book.topics.map((topic) => renderNode(topic))
          ) : (
            <p style={{ marginLeft: 24, color: '#999', fontStyle: 'italic' }}>No topics</p>
          )}
        </div>
      ))}
    </div>
  );
}