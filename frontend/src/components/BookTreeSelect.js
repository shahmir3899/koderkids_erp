// src/components/BookTreeSelect.js
import React, { useState, useEffect, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faLaptop, faPaintBrush, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import './BookTreeSelect.css';

const getIcon = (type) => {
  switch (type) {
    case 'lesson': return faLaptop;
    case 'activity': return faPaintBrush;
    default: return faBookOpen;
  }
};

const BookTreeSelect = ({ books, selectedIds = [], onSelect }) => {
  const [checked, setChecked] = useState(selectedIds);
  const [expanded, setExpanded] = useState({}); // { topicId: true/false for expansion }

  useEffect(() => setChecked(selectedIds), [selectedIds]);

  const toggleSelection = useCallback((nodeId, nodeChildren, isChecked) => {
    const idsToToggle = [nodeId];
    const collect = (children) => {
      children.forEach(c => {
        idsToToggle.push(c.id);
        if (c.children?.length) collect(c.children);
      });
    };
    if (nodeChildren?.length) collect(nodeChildren);

    setChecked(prev => {
      const next = isChecked
        ? [...prev, ...idsToToggle.filter(id => !prev.includes(id))]
        : prev.filter(id => !idsToToggle.includes(id));
      onSelect?.(next);
      return next;
    });
  }, [onSelect]);

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const TreeNode = memo(({ node, depth = 0 }) => {
    const hasChildren = node.children?.length > 0;
    const isChecked = checked.includes(node.id);
    const isExpanded = expanded[node.id];

    return (
      <div>
        <div
          className={`tree-node ${depth === 0 ? 'chapter-root' : ''} ${isChecked ? 'selected' : ''}`}
          onClick={() => hasChildren && toggleExpand(node.id)} // Click expands/collapses only (no selection toggle)
          style={{ cursor: hasChildren ? 'pointer' : 'default' }}
        >
          {/* Large clickable checkbox box */}
          <label className="selection-box" onClick={(e) => { e.stopPropagation(); toggleSelection(node.id, node.children, !isChecked); }}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => {}} // Handled by label click for larger area
              aria-label={`Select ${node.display_title}`}
            />
          </label>
          <FontAwesomeIcon icon={getIcon(node.type)} className={depth === 0 ? 'chapter-icon' : ''} />
          <span className={`node-type node-type-${node.type}`}>
            {node.display_title}
          </span>
          {node.code && <span className="node-code">[{node.code}]</span>}
          {hasChildren && (
            <FontAwesomeIcon
              icon={faChevronRight}
              className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} // Isolated click for expand icon
            />
          )}
        </div>
        {isExpanded && hasChildren && (
          <div className="tree-children">
            {node.children.map(child => (
              <TreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  });

  if (!books?.length) return <p className="center">No topics available.</p>;
  const rootTopics = books[0].topics || [];

  return (
    <div className="book-tree-select" role="tree" aria-label="Book topics tree">
      {rootTopics.length === 0 ? (
        <p className="center">This book has no topics.</p>
      ) : (
        rootTopics.map((topic) => <TreeNode key={topic.id} node={topic} depth={0} />)
      )}
    </div>
  );
};

BookTreeSelect.propTypes = {
  books: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      title: PropTypes.string.isRequired,
      topics: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.number.isRequired,
          code: PropTypes.string,
          display_title: PropTypes.string.isRequired,
          type: PropTypes.string.isRequired,
          children: PropTypes.array,
        })
      ).isRequired,
    })
  ).isRequired,
  selectedIds: PropTypes.arrayOf(PropTypes.number),
  onSelect: PropTypes.func.isRequired,
};

export default BookTreeSelect;