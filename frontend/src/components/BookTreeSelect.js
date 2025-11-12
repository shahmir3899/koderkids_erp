// src/components/BookTreeSelect.js
import React, { useState, useMemo, useCallback } from 'react';
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
  books = [] 
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(new Set());
  const [checked, setChecked] = useState(new Set(selectedIds));

  // SEARCH
  const setDeb = useMemo(() => debounce(setSearch, 250), []);
  const onSearch = e => setDeb(e.target.value);
  const clearSearch = () => { setSearch(''); setDeb.cancel(); };

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

  // FILTER TREE
  const tree = useMemo(() => {
    const q = search.toLowerCase();
    const filter = n => {
      const hit = n.display_title.toLowerCase().includes(q) ||
                  (n.code && n.code.toLowerCase().includes(q));
      if (!hit && !n.children?.length) return null;
      const ch = n.children?.map(filter).filter(Boolean) ?? [];
      return { ...n, children: ch.length ? ch : undefined };
    };

    return books.map(b => ({
      ...b,
      topics: (b.topics || [])
        .filter(t => t.code && !t.code.includes('.'))
        .map(filter)
        .filter(Boolean)
    }));
  }, [books, search]);

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

      <div className="tree-root">
        {tree.map(b => (
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
  books: PropTypes.array,
};