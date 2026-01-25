// ============================================
// QUIZ MANAGEMENT PAGE - List and Manage Quizzes
// ============================================
// Location: src/pages/lms/QuizManagementPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faEdit,
  faTrash,
  faSearch,
  faFilter,
  faSpinner,
  faClipboardQuestion,
  faCheckCircle,
  faTimesCircle,
  faClock,
  faListOl,
  faEye,
  faBook,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { getQuizzes, deleteQuiz, getAdminBooks } from '../../services/quizService';
import { COLORS, MIXINS, BORDER_RADIUS, SHADOWS } from '../../utils/designConstants';

const styles = {
  container: {
    padding: '2rem',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: {
    color: COLORS.text.white,
    fontSize: '1.75rem',
    fontWeight: '700',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  createBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    background: COLORS.status.success,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.white,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontWeight: '600',
    fontSize: '0.95rem',
  },
  filters: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: '1rem 1.5rem',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flex: '1',
    minWidth: '200px',
    maxWidth: '400px',
    padding: '0.75rem 1rem',
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    background: 'rgba(255, 255, 255, 0.08)',
  },
  searchIcon: {
    color: COLORS.text.whiteSubtle,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    outline: 'none',
    color: COLORS.text.white,
    fontSize: '0.95rem',
  },
  filterSelect: {
    padding: '0.75rem 1rem',
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    ...MIXINS.glassmorphicSelect,
    fontSize: '0.95rem',
    cursor: 'pointer',
    minWidth: '150px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  cardHeader: {
    padding: '1.25rem 1.5rem',
    borderBottom: `1px solid ${COLORS.border.whiteSubtle}`,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  cardTitle: {
    color: COLORS.text.white,
    fontSize: '1.125rem',
    fontWeight: '600',
    margin: 0,
  },
  cardTopic: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: COLORS.text.whiteSubtle,
    fontSize: '0.85rem',
    marginTop: '0.375rem',
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: BORDER_RADIUS.full,
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  statusActive: {
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#10B981',
  },
  statusInactive: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#EF4444',
  },
  cardBody: {
    padding: '1.25rem 1.5rem',
  },
  description: {
    color: COLORS.text.whiteMedium,
    fontSize: '0.9rem',
    lineHeight: '1.5',
    marginBottom: '1rem',
    minHeight: '2.75em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  statItem: {
    textAlign: 'center',
    padding: '0.75rem 0.5rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.sm,
  },
  statValue: {
    color: COLORS.text.white,
    fontSize: '1.25rem',
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.text.whiteSubtle,
    fontSize: '0.75rem',
  },
  cardFooter: {
    padding: '1rem 1.5rem',
    borderTop: `1px solid ${COLORS.border.whiteSubtle}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
  },
  actionBtn: {
    padding: '0.5rem 1rem',
    borderRadius: BORDER_RADIUS.sm,
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    transition: 'all 0.2s ease',
  },
  editBtn: {
    background: 'rgba(59, 130, 246, 0.2)',
    color: '#60A5FA',
    border: `1px solid rgba(59, 130, 246, 0.4)`,
  },
  deleteBtn: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#EF4444',
    border: `1px solid rgba(239, 68, 68, 0.4)`,
  },
  viewBtn: {
    background: 'rgba(139, 92, 246, 0.2)',
    color: '#A78BFA',
    border: `1px solid rgba(139, 92, 246, 0.4)`,
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    color: COLORS.text.white,
    fontSize: '1.25rem',
    gap: '0.75rem',
  },
  emptyState: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: '4rem 2rem',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '4rem',
    color: COLORS.text.whiteSubtle,
    marginBottom: '1.5rem',
  },
  emptyTitle: {
    color: COLORS.text.white,
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '0.75rem',
  },
  emptyText: {
    color: COLORS.text.whiteSubtle,
    fontSize: '1rem',
    marginBottom: '2rem',
  },
};

const QuizManagementPage = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBook, setFilterBook] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [quizzesData, booksData] = await Promise.all([
        getQuizzes(),
        getAdminBooks(),
      ]);
      setQuizzes(quizzesData);
      setBooks(booksData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (quizId, quizTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${quizTitle}"?`)) {
      return;
    }

    try {
      await deleteQuiz(quizId);
      setQuizzes(quizzes.filter((q) => q.id !== quizId));
      toast.success('Quiz deleted successfully');
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Failed to delete quiz');
    }
  };

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch =
      quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quiz.description && quiz.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      !filterStatus ||
      (filterStatus === 'active' && quiz.is_active) ||
      (filterStatus === 'inactive' && !quiz.is_active);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <FontAwesomeIcon icon={faSpinner} spin />
          Loading quizzes...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <FontAwesomeIcon icon={faClipboardQuestion} />
          Quiz Management
        </h1>
        <button
          style={styles.createBtn}
          onClick={() => navigate('/lms/quiz-builder')}
        >
          <FontAwesomeIcon icon={faPlus} />
          Create New Quiz
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.searchBox}>
          <FontAwesomeIcon icon={faSearch} style={styles.searchIcon} />
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Search quizzes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          style={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Quiz Grid */}
      {filteredQuizzes.length === 0 ? (
        <div style={styles.emptyState}>
          <FontAwesomeIcon icon={faClipboardQuestion} style={styles.emptyIcon} />
          <h2 style={styles.emptyTitle}>
            {searchTerm || filterBook || filterStatus ? 'No Matching Quizzes' : 'No Quizzes Yet'}
          </h2>
          <p style={styles.emptyText}>
            {searchTerm || filterBook || filterStatus
              ? 'Try adjusting your search or filters.'
              : 'Create your first quiz to start assessing student knowledge.'}
          </p>
          {!searchTerm && !filterBook && !filterStatus && (
            <button
              style={styles.createBtn}
              onClick={() => navigate('/lms/quiz-builder')}
            >
              <FontAwesomeIcon icon={faPlus} />
              Create Your First Quiz
            </button>
          )}
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredQuizzes.map((quiz) => (
            <div key={quiz.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>{quiz.title}</h3>
                  <div style={styles.cardTopic}>
                    <FontAwesomeIcon icon={faBook} />
                    {quiz.topic_title || `Topic ID: ${quiz.topic}`}
                  </div>
                </div>
                <span
                  style={{
                    ...styles.statusBadge,
                    ...(quiz.is_active ? styles.statusActive : styles.statusInactive),
                  }}
                >
                  {quiz.is_active ? (
                    <>
                      <FontAwesomeIcon icon={faCheckCircle} /> Active
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faTimesCircle} /> Inactive
                    </>
                  )}
                </span>
              </div>
              <div style={styles.cardBody}>
                <p style={styles.description}>
                  {quiz.description || 'No description provided.'}
                </p>
                <div style={styles.stats}>
                  <div style={styles.statItem}>
                    <div style={styles.statValue}>
                      {quiz.questions?.length || 0}
                    </div>
                    <div style={styles.statLabel}>Questions</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statValue}>{quiz.passing_score}%</div>
                    <div style={styles.statLabel}>Pass Score</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statValue}>
                      {quiz.time_limit_minutes || '∞'}
                    </div>
                    <div style={styles.statLabel}>Minutes</div>
                  </div>
                </div>
              </div>
              <div style={styles.cardFooter}>
                <button
                  style={{ ...styles.actionBtn, ...styles.editBtn }}
                  onClick={() => navigate(`/lms/quiz-builder/${quiz.id}`)}
                >
                  <FontAwesomeIcon icon={faEdit} />
                  Edit
                </button>
                <button
                  style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                  onClick={() => handleDelete(quiz.id, quiz.title)}
                >
                  <FontAwesomeIcon icon={faTrash} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizManagementPage;
