// ============================================
// BOOK MANAGEMENT PAGE - Admin Book/Topic Editor
// ============================================
// Location: src/pages/BookManagementPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook,
  faPlus,
  faEdit,
  faTrash,
  faEye,
  faEyeSlash,
  faChevronRight,
  faChevronDown,
  faFolder,
  faFileAlt,
  faVideo,
  faCheck,
  faTimes,
  faSearch,
  faSave,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons';
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-toastify';

// Services
import {
  getAdminBooks,
  getAdminBook,
  createBook,
  updateBook,
  deleteBook,
  toggleBookPublish,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic,
} from '../services/bookAdminService';

// Cache utilities
import { getCachedData, setCachedData, clearCache } from '../utils/cacheUtils';

// Components
import TopicEditor from '../components/admin/TopicEditor';
import ConfirmationModal from '../components/common/modals/ConfirmationModal';

// Design System
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../utils/designConstants';
import { useResponsive } from '../hooks/useResponsive';

// Cache configuration
const ADMIN_BOOKS_CACHE_KEY = 'admin_books_list';
const ADMIN_BOOK_DETAIL_PREFIX = 'admin_book_';
const ADMIN_TOPIC_PREFIX = 'admin_topic_';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

const BookManagementPage = () => {
  const { isMobile } = useResponsive();

  // State
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showBookModal, setShowBookModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Book form
  const [bookForm, setBookForm] = useState({
    title: '',
    isbn: '',
    description: '',
    difficulty_level: 'beginner',
    school: null,
  });
  const [bookCover, setBookCover] = useState(null);
  const [editingBookId, setEditingBookId] = useState(null);

  // Fetch books on mount
  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async (bypassCache = false) => {
    try {
      setLoading(true);

      // Try cache first (unless bypassing)
      if (!bypassCache) {
        const cachedBooks = getCachedData(ADMIN_BOOKS_CACHE_KEY, CACHE_DURATION);
        if (cachedBooks !== null) {
          console.log('⚡ Using cached admin books list');
          setBooks(cachedBooks);
          setLoading(false);
          return cachedBooks;
        }
      }

      console.log('🌐 Fetching admin books from API...');
      const data = await getAdminBooks();
      setBooks(data);

      // Cache the result
      setCachedData(ADMIN_BOOKS_CACHE_KEY, data);
      console.log('✅ Admin books loaded:', data.length);

      return data;
    } catch (error) {
      toast.error('Failed to load books: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookDetails = async (bookId, bypassCache = false) => {
    try {
      const cacheKey = `${ADMIN_BOOK_DETAIL_PREFIX}${bookId}`;

      // Try cache first (unless bypassing)
      if (!bypassCache) {
        const cachedBook = getCachedData(cacheKey, CACHE_DURATION);
        if (cachedBook !== null) {
          console.log(`⚡ Using cached book details for ${bookId}`);
          setSelectedBook(cachedBook);
          // Auto-expand first level
          const expanded = {};
          cachedBook.topic_tree?.forEach(topic => {
            expanded[topic.id] = true;
          });
          setExpandedNodes(expanded);
          return cachedBook;
        }
      }

      console.log(`🌐 Fetching book details for ${bookId}...`);
      const data = await getAdminBook(bookId);
      setSelectedBook(data);

      // Cache the result
      setCachedData(cacheKey, data);
      console.log(`✅ Book ${bookId} details loaded`);

      // Auto-expand first level
      const expanded = {};
      data.topic_tree?.forEach(topic => {
        expanded[topic.id] = true;
      });
      setExpandedNodes(expanded);

      return data;
    } catch (error) {
      toast.error('Failed to load book details: ' + error.message);
    }
  };

  const fetchTopicDetails = async (topicId, bypassCache = false) => {
    try {
      const cacheKey = `${ADMIN_TOPIC_PREFIX}${topicId}`;

      // Try cache first (unless bypassing)
      if (!bypassCache) {
        const cachedTopic = getCachedData(cacheKey, CACHE_DURATION);
        if (cachedTopic !== null) {
          console.log(`⚡ Using cached topic details for ${topicId}`);
          setSelectedTopic(cachedTopic);
          return cachedTopic;
        }
      }

      console.log(`🌐 Fetching topic details for ${topicId}...`);
      const data = await getTopic(topicId);
      setSelectedTopic(data);

      // Cache the result
      setCachedData(cacheKey, data);
      console.log(`✅ Topic ${topicId} details loaded`);

      return data;
    } catch (error) {
      toast.error('Failed to load topic: ' + error.message);
    }
  };

  // Book handlers
  const handleBookSelect = (book) => {
    setSelectedTopic(null);
    fetchBookDetails(book.id);
  };

  const handleBookCreate = () => {
    setBookForm({
      title: '',
      isbn: '',
      description: '',
      difficulty_level: 'beginner',
      school: null,
    });
    setBookCover(null);
    setEditingBookId(null);
    setShowBookModal(true);
  };

  const handleBookEdit = (book) => {
    setBookForm({
      title: book.title,
      isbn: book.isbn || '',
      description: book.description || '',
      difficulty_level: book.difficulty_level || 'beginner',
      school: book.school,
    });
    setBookCover(null);
    setEditingBookId(book.id);
    setShowBookModal(true);
  };

  const handleBookSave = async () => {
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('title', bookForm.title);
      if (bookForm.isbn) formData.append('isbn', bookForm.isbn);
      formData.append('description', bookForm.description);
      formData.append('difficulty_level', bookForm.difficulty_level);
      if (bookForm.school) formData.append('school', bookForm.school);
      if (bookCover) formData.append('cover', bookCover);

      if (editingBookId) {
        await updateBook(editingBookId, formData);
        toast.success('Book updated successfully');
        // Clear book detail cache
        clearCache(`${ADMIN_BOOK_DETAIL_PREFIX}${editingBookId}`);
      } else {
        await createBook(formData);
        toast.success('Book created successfully');
      }

      // Clear books list cache
      clearCache(ADMIN_BOOKS_CACHE_KEY);

      setShowBookModal(false);
      fetchBooks(true); // Bypass cache
      if (selectedBook?.id === editingBookId) {
        fetchBookDetails(editingBookId, true); // Bypass cache
      }
    } catch (error) {
      toast.error('Failed to save book: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBookDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBook(deleteTarget.id);
      toast.success('Book deleted successfully');

      // Clear caches
      clearCache(ADMIN_BOOKS_CACHE_KEY);
      clearCache(`${ADMIN_BOOK_DETAIL_PREFIX}${deleteTarget.id}`);

      setShowDeleteModal(false);
      setDeleteTarget(null);
      if (selectedBook?.id === deleteTarget.id) {
        setSelectedBook(null);
        setSelectedTopic(null);
      }
      fetchBooks(true); // Bypass cache
    } catch (error) {
      toast.error('Failed to delete book: ' + error.message);
    }
  };

  const handleTogglePublish = async (book) => {
    try {
      await toggleBookPublish(book.id);
      toast.success(book.is_published ? 'Book unpublished' : 'Book published');

      // Clear caches
      clearCache(ADMIN_BOOKS_CACHE_KEY);
      clearCache(`${ADMIN_BOOK_DETAIL_PREFIX}${book.id}`);

      fetchBooks(true); // Bypass cache
      if (selectedBook?.id === book.id) {
        fetchBookDetails(book.id, true); // Bypass cache
      }
    } catch (error) {
      toast.error('Failed to toggle publish: ' + error.message);
    }
  };

  // Topic handlers
  const handleTopicSelect = (topic) => {
    fetchTopicDetails(topic.id);
  };

  const handleTopicCreate = (parentId = null) => {
    setSelectedTopic({
      id: null,
      book: selectedBook.id,
      parent: parentId,
      code: '',
      title: '',
      type: parentId ? 'lesson' : 'chapter',
      content: '',
      activity_blocks: [],
      video_url: '',
      video_duration_seconds: null,
      estimated_time_minutes: 10,
      is_required: true,
    });
  };

  const handleTopicSave = async (topicData) => {
    try {
      setSaving(true);
      if (topicData.id) {
        await updateTopic(topicData.id, topicData);
        toast.success('Topic updated successfully');
        // Clear topic cache
        clearCache(`${ADMIN_TOPIC_PREFIX}${topicData.id}`);
      } else {
        await createTopic(topicData);
        toast.success('Topic created successfully');
      }

      // Clear book detail cache (topic tree changed)
      clearCache(`${ADMIN_BOOK_DETAIL_PREFIX}${selectedBook.id}`);
      // Also clear books list cache (topic count may have changed)
      clearCache(ADMIN_BOOKS_CACHE_KEY);

      fetchBookDetails(selectedBook.id, true); // Bypass cache
      setSelectedTopic(null);
    } catch (error) {
      toast.error('Failed to save topic: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTopicDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTopic(deleteTarget.id);
      toast.success('Topic deleted successfully');

      // Clear caches
      clearCache(`${ADMIN_TOPIC_PREFIX}${deleteTarget.id}`);
      clearCache(`${ADMIN_BOOK_DETAIL_PREFIX}${selectedBook.id}`);
      clearCache(ADMIN_BOOKS_CACHE_KEY);

      setShowDeleteModal(false);
      setDeleteTarget(null);
      if (selectedTopic?.id === deleteTarget.id) {
        setSelectedTopic(null);
      }
      fetchBookDetails(selectedBook.id, true); // Bypass cache
    } catch (error) {
      toast.error('Failed to delete topic: ' + error.message);
    }
  };

  const toggleExpand = (topicId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [topicId]: !prev[topicId],
    }));
  };

  // Filter books
  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render topic tree recursively
  const renderTopicTree = (topics, level = 0) => {
    return topics.map(topic => {
      const isExpanded = expandedNodes[topic.id];
      const hasChildren = topic.children && topic.children.length > 0;
      const isSelected = selectedTopic?.id === topic.id;

      return (
        <div key={topic.id}>
          <div
            style={{
              ...styles.topicItem,
              paddingLeft: `${SPACING.md + level * 20}px`,
              backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              borderLeft: isSelected ? `3px solid ${COLORS.status.info}` : '3px solid transparent',
            }}
          >
            {/* Expand/Collapse button */}
            {hasChildren ? (
              <button
                style={styles.expandButton}
                onClick={() => toggleExpand(topic.id)}
              >
                <FontAwesomeIcon
                  icon={isExpanded ? faChevronDown : faChevronRight}
                  style={{ fontSize: '10px' }}
                />
              </button>
            ) : (
              <span style={{ width: '20px' }} />
            )}

            {/* Icon */}
            <FontAwesomeIcon
              icon={topic.type === 'chapter' ? faFolder : faFileAlt}
              style={{
                color: topic.type === 'chapter' ? COLORS.status.warning : COLORS.status.info,
                marginRight: SPACING.sm,
              }}
            />

            {/* Title */}
            <span
              style={{
                ...styles.topicTitle,
                cursor: 'pointer',
                flex: 1,
              }}
              onClick={() => handleTopicSelect(topic)}
            >
              {/* Show code only for non-chapters (lessons, activities) */}
              {topic.code && topic.type !== 'chapter' && (
                <span style={styles.topicCode}>{topic.code}</span>
              )}
              {topic.title}
            </span>

            {/* Status icons */}
            {topic.has_video && (
              <FontAwesomeIcon
                icon={faVideo}
                style={{ color: COLORS.status.success, marginRight: SPACING.xs, fontSize: '12px' }}
                title="Has video"
              />
            )}
            {topic.has_content && (
              <FontAwesomeIcon
                icon={faCheck}
                style={{ color: COLORS.status.success, marginRight: SPACING.xs, fontSize: '12px' }}
                title="Has content"
              />
            )}

            {/* Add child button */}
            <button
              style={styles.iconButton}
              onClick={(e) => {
                e.stopPropagation();
                handleTopicCreate(topic.id);
              }}
              title="Add child topic"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>

            {/* Delete button */}
            <button
              style={{ ...styles.iconButton, color: COLORS.status.error }}
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget({ type: 'topic', ...topic });
                setShowDeleteModal(true);
              }}
              title="Delete topic"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>

          {/* Children */}
          {hasChildren && isExpanded && (
            <div>
              {renderTopicTree(topic.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <ClipLoader size={40} color={COLORS.status.info} />
        <p style={styles.loadingText}>Loading books...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>
          <FontAwesomeIcon icon={faBook} style={styles.titleIcon} />
          Book Management
        </h1>
        <button style={styles.primaryButton} onClick={handleBookCreate}>
          <FontAwesomeIcon icon={faPlus} style={{ marginRight: '8px' }} />
          New Book
        </button>
      </div>

      <div style={{
        ...styles.mainContent,
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        {/* Left Panel - Book List */}
        <div style={{
          ...styles.panel,
          width: isMobile ? '100%' : '300px',
          minWidth: isMobile ? 'auto' : '300px',
        }}>
          <div style={styles.panelHeader}>
            <h3 style={styles.panelTitle}>Books</h3>
          </div>

          {/* Search */}
          <div style={styles.searchContainer}>
            <FontAwesomeIcon icon={faSearch} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search books..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Book List */}
          <div style={styles.bookList}>
            {filteredBooks.map(book => (
              <div
                key={book.id}
                style={{
                  ...styles.bookItem,
                  backgroundColor: selectedBook?.id === book.id
                    ? 'rgba(59, 130, 246, 0.2)'
                    : 'transparent',
                }}
                onClick={() => handleBookSelect(book)}
              >
                <div style={styles.bookInfo}>
                  <span style={styles.bookTitle}>{book.title}</span>
                  <span style={styles.bookMeta}>
                    {book.chapters_count} chapters · {book.topics_count} lessons
                  </span>
                </div>
                <div style={styles.bookActions}>
                  <button
                    style={{
                      ...styles.iconButton,
                      color: book.is_published ? COLORS.status.success : COLORS.text.whiteSubtle,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePublish(book);
                    }}
                    title={book.is_published ? 'Unpublish' : 'Publish'}
                  >
                    <FontAwesomeIcon icon={book.is_published ? faEye : faEyeSlash} />
                  </button>
                  <button
                    style={styles.iconButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookEdit(book);
                    }}
                    title="Edit book"
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button
                    style={{ ...styles.iconButton, color: COLORS.status.error }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ type: 'book', ...book });
                      setShowDeleteModal(true);
                    }}
                    title="Delete book"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Panel - Topic Tree */}
        {selectedBook && !selectedTopic && (
          <div style={{
            ...styles.panel,
            flex: 1,
          }}>
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>{selectedBook.title}</h3>
              <button
                style={styles.secondaryButton}
                onClick={() => handleTopicCreate(null)}
              >
                <FontAwesomeIcon icon={faPlus} style={{ marginRight: '8px' }} />
                Add Chapter
              </button>
            </div>

            {/* Book Info */}
            <div style={styles.bookDetails}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Status:</span>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: selectedBook.is_published
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(239, 68, 68, 0.2)',
                  color: selectedBook.is_published
                    ? COLORS.status.success
                    : COLORS.status.error,
                }}>
                  {selectedBook.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Difficulty:</span>
                <span style={styles.detailValue}>{selectedBook.difficulty_level}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Total Duration:</span>
                <span style={styles.detailValue}>{selectedBook.total_duration_minutes} min</span>
              </div>
            </div>

            {/* Topic Tree */}
            <div style={styles.topicTree}>
              {selectedBook.topic_tree?.length > 0 ? (
                renderTopicTree(selectedBook.topic_tree)
              ) : (
                <div style={styles.emptyState}>
                  <p>No chapters yet. Click "Add Chapter" to create one.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Panel - Topic Editor */}
        {selectedTopic && (
          <div style={{
            ...styles.panel,
            flex: 2,
          }}>
            <div style={styles.panelHeader}>
              <button
                style={styles.backButton}
                onClick={() => setSelectedTopic(null)}
              >
                <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: '8px' }} />
                Back
              </button>
              <h3 style={styles.panelTitle}>
                {selectedTopic.id ? 'Edit Topic' : 'New Topic'}
              </h3>
            </div>

            <TopicEditor
              topic={selectedTopic}
              bookId={selectedBook.id}
              onSave={handleTopicSave}
              onCancel={() => setSelectedTopic(null)}
              saving={saving}
            />
          </div>
        )}

        {/* Empty state when no book selected */}
        {!selectedBook && (
          <div style={{
            ...styles.panel,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={styles.emptyState}>
              <FontAwesomeIcon icon={faBook} style={styles.emptyIcon} />
              <p>Select a book to view and edit its contents</p>
            </div>
          </div>
        )}
      </div>

      {/* Book Modal */}
      {showBookModal && (
        <div style={styles.modalOverlay} onClick={() => setShowBookModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {editingBookId ? 'Edit Book' : 'Create Book'}
            </h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>Title *</label>
              <input
                type="text"
                value={bookForm.title}
                onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                style={styles.input}
                placeholder="Enter book title"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>ISBN</label>
              <input
                type="text"
                value={bookForm.isbn}
                onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                style={styles.input}
                placeholder="Enter ISBN (optional)"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                value={bookForm.description}
                onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                style={{ ...styles.input, minHeight: '100px', resize: 'vertical' }}
                placeholder="Enter course description"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Difficulty Level</label>
              <select
                value={bookForm.difficulty_level}
                onChange={(e) => setBookForm({ ...bookForm, difficulty_level: e.target.value })}
                style={styles.input}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Cover Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBookCover(e.target.files[0])}
                style={styles.fileInput}
              />
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.secondaryButton}
                onClick={() => setShowBookModal(false)}
              >
                Cancel
              </button>
              <button
                style={styles.primaryButton}
                onClick={handleBookSave}
                disabled={saving || !bookForm.title}
              >
                {saving ? (
                  <ClipLoader size={16} color="#fff" />
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} style={{ marginRight: '8px' }} />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={deleteTarget?.type === 'book' ? handleBookDelete : handleTopicDelete}
        title={`Delete ${deleteTarget?.type === 'book' ? 'Book' : 'Topic'}`}
        message={`Are you sure you want to delete "${deleteTarget?.title}"? ${
          deleteTarget?.type === 'book'
            ? 'This will delete all chapters and topics within.'
            : deleteTarget?.children?.length > 0
              ? 'This will also delete all child topics.'
              : ''
        }`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
};

const styles = {
  container: {
    padding: SPACING.xl,
    minHeight: '100vh',
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING['3xl'],
    gap: SPACING.md,
  },

  loadingText: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    flexWrap: 'wrap',
    gap: SPACING.md,
  },

  pageTitle: {
    margin: 0,
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
  },

  titleIcon: {
    color: COLORS.status.info,
  },

  mainContent: {
    display: 'flex',
    gap: SPACING.lg,
    height: 'calc(100vh - 160px)',
  },

  panel: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  panelHeader: {
    padding: SPACING.md,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },

  panelTitle: {
    margin: 0,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },

  searchContainer: {
    position: 'relative',
    padding: SPACING.md,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
  },

  searchIcon: {
    position: 'absolute',
    left: '24px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },

  searchInput: {
    width: '100%',
    padding: `${SPACING.sm} ${SPACING.md} ${SPACING.sm} ${SPACING.xl}`,
    paddingLeft: '36px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    outline: 'none',
  },

  bookList: {
    flex: 1,
    overflowY: 'auto',
  },

  bookItem: {
    padding: SPACING.md,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: `background-color ${TRANSITIONS.fast}`,
  },

  bookInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: 0,
  },

  bookTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  bookMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },

  bookActions: {
    display: 'flex',
    gap: SPACING.xs,
  },

  iconButton: {
    padding: SPACING.xs,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    color: COLORS.text.whiteSubtle,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
    fontSize: FONT_SIZES.sm,
  },

  bookDetails: {
    padding: SPACING.md,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    display: 'flex',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },

  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
  },

  detailLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },

  detailValue: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.white,
    textTransform: 'capitalize',
  },

  statusBadge: {
    padding: `2px ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },

  topicTree: {
    flex: 1,
    overflowY: 'auto',
    padding: SPACING.sm,
  },

  topicItem: {
    display: 'flex',
    alignItems: 'center',
    padding: `${SPACING.sm} ${SPACING.md}`,
    borderRadius: BORDER_RADIUS.sm,
    transition: `background-color ${TRANSITIONS.fast}`,
    gap: SPACING.xs,
  },

  expandButton: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    color: COLORS.text.whiteSubtle,
    cursor: 'pointer',
  },

  topicCode: {
    color: COLORS.text.whiteSubtle,
    marginRight: SPACING.xs,
    fontSize: FONT_SIZES.xs,
  },

  topicTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
  },

  emptyState: {
    textAlign: 'center',
    padding: SPACING['2xl'],
    color: COLORS.text.whiteSubtle,
  },

  emptyIcon: {
    fontSize: '3rem',
    marginBottom: SPACING.md,
    opacity: 0.5,
  },

  backButton: {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'transparent',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.sm,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },

  primaryButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: COLORS.status.info,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: `all ${TRANSITIONS.fast}`,
  },

  secondaryButton: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: `all ${TRANSITIONS.fast}`,
  },

  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: SPACING.md,
  },

  modal: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },

  modalTitle: {
    margin: `0 0 ${SPACING.lg}`,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },

  formGroup: {
    marginBottom: SPACING.md,
  },

  label: {
    display: 'block',
    marginBottom: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
  },

  input: {
    width: '100%',
    padding: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    outline: 'none',
  },

  fileInput: {
    width: '100%',
    padding: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
  },

  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
};

export default BookManagementPage;
