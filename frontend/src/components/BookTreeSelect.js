// src/components/BookTreeSelect.js
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import debounce from 'lodash/debounce';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronRight,
  faChevronDown,
  faBook,
  faFolder,
  faFileAlt,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';
import './BookTreeSelect.css';

export default function BookTreeSelect({ 
  onSelect = () => {}, 
  selectedIds = [], 
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(new Set());
  const [checked, setChecked] = useState(new Set(selectedIds));
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);

  // SEARCH
  const setDeb = useMemo(() => debounce(setSearch, 250), []);
  const onSearch = e => setDeb(e.target.value);
  const clearSearch = () => { setSearch(''); setDeb.cancel(); };

  // FETCH BOOKS WITH SEARCH
  const fetchBooks = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/books/?q=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },  // Assume auth token
      });
      if (!response.ok) throw new Error('Fetch failed');
      const data = await response.json();
      setBooks(data);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks(search);
  }, [search, fetchBooks]);

  // TOGGLE NODE
  const toggle = useCallback(id => setOpen(s => {
    const ns = new Set(s);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    return ns;
  }), []);

  // TOGGLE CHECKBOX
  const toggleCheck = useCallback((id, children = []) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        children.forEach(child => next.delete(child.id));
      } else {
        next.add(id);
        children.forEach(child => next.add(child.id));
      }
      return next;
    });
  }, []);

  // SEND SELECTED
  const handleDone = () => {
    const selected = Array.from(checked);
    onSelect(selected);
  };

  // RENDER NODE
  const Node = (n, lvl = 0) => {
    const hasChildren = !!n.children?.length;
    const isOpen = open.has(n.id);
    const isChecked = checked.has(n.id);
    const childIds = n.children?.map(c => c.id) || [];

    const getIcon = () => {
      switch (n.type) {
        case 'chapter': return faBook;
        case 'lesson':  return faFolder;
        case 'activity': return faFileAlt;
        default: return faFileAlt;
      }
    };

    return (
      <div
        key={n.id}
        className="tree-node"
        style={{ marginLeft: lvl * 24 }}
        role="treeitem"
        aria-expanded={hasChildren ? isOpen : undefined}
        aria-level={lvl + 1}
      >
        <div className={`node-header ${n.type} ${isChecked ? 'checked' : ''}`}>
          {hasChildren && (
            <FontAwesomeIcon
              icon={isOpen ? faChevronDown : faChevronRight}
              className="toggle-icon"
              onClick={() => toggle(n.id)}
            />
          )}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => toggleCheck(n.id, n.children || [])}
            />
            <FontAwesomeIcon icon={getIcon()} className="type-icon" />
            <span className="node-title">{n.display_title}</span>
          </label>
        </div>

        {hasChildren && isOpen && (
          <div className="node-children" role="group">
            {n.children.map(c => Node(c, lvl + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="book-tree-select">
      <h3 className="select-header">Select Topics (Multi)</h3>
      
      <div className="search-wrapper">
        <FontAwesomeIcon icon={faSearch} className="search-icon" />
        <input
          placeholder="Search topics…"
          onChange={onSearch}
          className="search-input"
        />
        {search && <button onClick={clearSearch} className="clear-btn">×</button>}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="tree-root">
          {books.map(b => (
            <div key={b.id} className="book-section">
              <h4 className="book-title">{b.title}</h4>
              {b.topics.length ? (
                <div role="tree">
                  {b.topics.map(t => Node(t))}
                </div>
              ) : (
                <p className="empty-message">No matching topics.</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="modal-actions">
        <button onClick={handleDone} className="btn btn-success">
          Done ({checked.size} selected)
        </button>
        <button onClick={() => setChecked(new Set())} className="btn btn-outline">
          Clear All
        </button>
      </div>
    </div>
  );
}

BookTreeSelect.propTypes = {
  onSelect: PropTypes.func,
  selectedIds: PropTypes.array,
};