// src/components/BookTreeSelect.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAuthHeaders } from '../api';
import './BookTreeSelect.css'; // Optional – create this file or remove line

const API_URL = `${process.env.REACT_APP_API_URL}/api/books/books`;

export default function BookTreeSelect({ onSelectTopic = () => {} }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  /* ---------- FETCH BOOKS ---------- */
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
          throw new Error('Login required – no token found.');
        }

        const res = await fetch(API_URL, { headers });
        if (!res.ok) {
          if (res.status === 401) throw new Error('Unauthorized – please log in again.');
          throw new Error(`Server error: ${res.status}`);
        }

        const data = await res.json();
        setBooks(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Failed to load books.');
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  /* ---------- SEARCH FILTER ---------- */
  const filteredBooks = useMemo(() => {
    if (!search.trim()) return books;

    const lower = search.toLowerCase();
    const filterTopic = (t) => {
      const matches =
        t.display_title.toLowerCase().includes(lower) ||
        (t.code && t.code.toLowerCase().includes(lower));

      if (!matches && !t.children?.length) return null;

      const filteredChildren = t.children
        ?.map(filterTopic)
        .filter(Boolean);

      return {
        ...t,
        children: filteredChildren.length ? filteredChildren : undefined,
      };
    };

    return books.map((b) => ({
      ...b,
      topics: b.topics?.map(filterTopic).filter(Boolean),
    }));
  }, [books, search]);

  /* ---------- EXPAND / COLLAPSE ---------- */
  const toggle = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  /* ---------- RENDER ONE NODE ---------- */
  const renderNode = (node, level = 0) => {
    const isChapter = node.type === 'chapter';
    const isLesson = node.type === 'lesson';
    const isActivity = node.type === 'activity';
    const hasChildren = !!node.children?.length;
    const isOpen = expanded.has(node.id);

    return (
      <div
        key={node.id}
        style={{ marginLeft: level * 24 }}
        role="treeitem"
        aria-expanded={hasChildren ? isOpen : undefined}
      >
        <div
          className={`node ${isChapter ? 'chapter' : isLesson ? 'lesson' : 'activity'}`}
          onClick={() => {
            if (hasChildren) toggle(node.id);
            onSelectTopic(node);
          }}
          title={node.display_title}
        >
          {hasChildren && (
            <span className="toggle">
              {isOpen ? '▼' : '▶'}
            </span>
          )}

          {node.code && !isChapter && (
            <strong className="code">{node.code}</strong>
          )}

          <span className="title">{node.display_title}</span>
        </div>

        {hasChildren && isOpen && (
          <div role="group">
            {node.children.map((c) => renderNode(c, level + 1))}
          </div>
        )}
      </div>
    );
  };

  /* ---------- UI STATES ---------- */
  if (loading) {
    return <div className="msg info">Loading books…</div>;
  }
  if (error) {
    return <div className="msg error">Error: {error}</div>;
  }
  if (!books.length) {
    return <div className="msg">No books available. Import a CSV first.</div>;
  }

  return (
    <div className="book-tree-select">
      <h3 className="header">Select Topic for Lesson</h3>

      <input
        type="text"
        placeholder="Search topics…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search"
      />

      {filteredBooks.map((book) => (
        <div key={book.id} className="book">
          <h4 className="book-title">{book.title}</h4>

          {book.topics?.length ? (
            <div role="tree">{book.topics.map((t) => renderNode(t, 0))}</div>
          ) : (
            <p className="empty">No topics in this book.</p>
          )}
        </div>
      ))}
    </div>
  );
}