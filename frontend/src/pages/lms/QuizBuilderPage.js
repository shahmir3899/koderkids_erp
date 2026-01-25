// ============================================
// QUIZ BUILDER PAGE - Create/Edit Quizzes
// ============================================
// Location: src/pages/lms/QuizBuilderPage.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faPlus,
  faSave,
  faTrash,
  faSpinner,
  faClipboardQuestion,
  faClock,
  faTrophy,
  faCheck,
  faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import QuestionEditor from '../../components/lms/quiz-builder/QuestionEditor';
import {
  getQuiz,
  createQuiz,
  updateQuiz,
  getAdminBooks,
  getTopicsForBook,
} from '../../services/quizService';
import { COLORS, MIXINS, BORDER_RADIUS, SHADOWS, FONT_SIZES } from '../../utils/designConstants';

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
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.white,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '0.9rem',
  },
  title: {
    color: COLORS.text.white,
    fontSize: '1.75rem',
    fontWeight: '700',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    gap: '0.75rem',
  },
  saveBtn: {
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
  deleteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    background: 'rgba(239, 68, 68, 0.2)',
    border: `1px solid rgba(239, 68, 68, 0.4)`,
    borderRadius: BORDER_RADIUS.md,
    color: '#EF4444',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '0.9rem',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '350px 1fr',
    gap: '1.5rem',
    alignItems: 'start',
  },
  sidebar: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: '1.5rem',
    position: 'sticky',
    top: '2rem',
  },
  sidebarSection: {
    marginBottom: '1.5rem',
  },
  sidebarTitle: {
    color: COLORS.text.white,
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  fieldGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    color: COLORS.text.whiteMedium,
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    background: 'rgba(255, 255, 255, 0.08)',
    color: COLORS.text.white,
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    background: 'rgba(255, 255, 255, 0.08)',
    color: COLORS.text.white,
    fontSize: '1rem',
    outline: 'none',
    resize: 'vertical',
    minHeight: '100px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    ...MIXINS.glassmorphicSelect,
    fontSize: '1rem',
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.sm,
    cursor: 'pointer',
    marginBottom: '0.5rem',
  },
  checkboxInput: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    color: COLORS.text.whiteMedium,
    fontSize: '0.9rem',
  },
  mainContent: {
    minHeight: '400px',
  },
  questionsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
  },
  questionsTitle: {
    color: COLORS.text.white,
    fontSize: '1.25rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  addQuestionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    background: 'rgba(139, 92, 246, 0.2)',
    border: `1px solid rgba(139, 92, 246, 0.4)`,
    borderRadius: BORDER_RADIUS.md,
    color: '#A78BFA',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontWeight: '600',
    fontSize: '0.95rem',
  },
  emptyState: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: '3rem',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '3rem',
    color: COLORS.text.whiteSubtle,
    marginBottom: '1rem',
  },
  emptyTitle: {
    color: COLORS.text.white,
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  emptyText: {
    color: COLORS.text.whiteSubtle,
    fontSize: '0.95rem',
    marginBottom: '1.5rem',
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
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  infoBox: {
    background: 'rgba(59, 130, 246, 0.1)',
    border: `1px solid rgba(59, 130, 246, 0.3)`,
    borderRadius: BORDER_RADIUS.md,
    padding: '1rem',
    marginBottom: '1rem',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
  },
  infoIcon: {
    color: '#60A5FA',
    fontSize: '1rem',
    marginTop: '0.125rem',
  },
  infoText: {
    color: COLORS.text.whiteMedium,
    fontSize: '0.875rem',
    lineHeight: '1.5',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.75rem',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: `1px solid ${COLORS.border.whiteSubtle}`,
  },
  statItem: {
    textAlign: 'center',
    padding: '0.5rem',
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
};

const QuizBuilderPage = () => {
  const { quizId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = !!quizId;

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic: searchParams.get('topic') || '',
    passing_score: 70,
    time_limit_minutes: null,
    max_attempts: 3,
    shuffle_questions: true,
    show_correct_answers: true,
    is_active: true,
    questions: [],
  });

  // Books and topics for selection
  const [books, setBooks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedBook, setSelectedBook] = useState('');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load books on mount
  useEffect(() => {
    loadBooks();
  }, []);

  // Load quiz if editing
  useEffect(() => {
    if (isEditing) {
      loadQuiz();
    } else {
      setLoading(false);
    }
  }, [quizId]);

  // Load topics when book changes
  useEffect(() => {
    if (selectedBook) {
      loadTopics(selectedBook);
    }
  }, [selectedBook]);

  const loadBooks = async () => {
    try {
      const data = await getAdminBooks();
      setBooks(data);
    } catch (error) {
      console.error('Error loading books:', error);
      toast.error('Failed to load books');
    }
  };

  const loadTopics = async (bookId) => {
    try {
      const data = await getTopicsForBook(bookId);
      // Flatten topic tree for select
      const flattenTopics = (topics, depth = 0) => {
        let flat = [];
        topics.forEach((topic) => {
          flat.push({
            id: topic.id,
            title: topic.display_title || topic.title,
            depth,
            type: topic.type,
          });
          if (topic.children && topic.children.length > 0) {
            flat = flat.concat(flattenTopics(topic.children, depth + 1));
          }
        });
        return flat;
      };
      setTopics(flattenTopics(data));
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  };

  const loadQuiz = async () => {
    try {
      const data = await getQuiz(quizId);
      setFormData({
        title: data.title || '',
        description: data.description || '',
        topic: data.topic || '',
        passing_score: data.passing_score || 70,
        time_limit_minutes: data.time_limit_minutes || null,
        max_attempts: data.max_attempts || 3,
        shuffle_questions: data.shuffle_questions ?? true,
        show_correct_answers: data.show_correct_answers ?? true,
        is_active: data.is_active ?? true,
        questions: data.questions || [],
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast.error('Failed to load quiz');
      navigate('/lms/quiz-manage');
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question_type: 'multiple_choice',
          question_text: '',
          question_media: {},
          explanation: '',
          points: 1,
          order: prev.questions.length,
          choices: [
            { choice_text: '', is_correct: true, order: 0 },
            { choice_text: '', is_correct: false, order: 1 },
          ],
        },
      ],
    }));
  };

  const updateQuestion = (index, updatedQuestion) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? updatedQuestion : q)),
    }));
  };

  const deleteQuestion = (index) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      setFormData((prev) => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index),
      }));
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a quiz title');
      return false;
    }
    if (!formData.topic) {
      toast.error('Please select a topic');
      return false;
    }
    if (formData.questions.length === 0) {
      toast.error('Please add at least one question');
      return false;
    }
    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.question_text.trim()) {
        toast.error(`Question ${i + 1} is missing question text`);
        return false;
      }
      if (!q.choices || q.choices.length < 2) {
        toast.error(`Question ${i + 1} needs at least 2 choices`);
        return false;
      }
      const hasCorrect = q.choices.some((c) => c.is_correct);
      if (!hasCorrect) {
        toast.error(`Question ${i + 1} needs at least one correct answer`);
        return false;
      }
      for (let j = 0; j < q.choices.length; j++) {
        if (!q.choices[j].choice_text.trim()) {
          toast.error(`Question ${i + 1}, Choice ${j + 1} is empty`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        ...formData,
        topic: parseInt(formData.topic),
        time_limit_minutes: formData.time_limit_minutes || null,
      };

      if (isEditing) {
        await updateQuiz(quizId, payload);
        toast.success('Quiz updated successfully');
      } else {
        await createQuiz(payload);
        toast.success('Quiz created successfully');
      }
      navigate('/lms/quiz-manage');
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast.error(error.message || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const getTotalPoints = () => {
    return formData.questions.reduce((sum, q) => sum + (q.points || 1), 0);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <FontAwesomeIcon icon={faSpinner} style={styles.spinner} />
          Loading quiz...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            style={styles.backBtn}
            onClick={() => navigate('/lms/quiz-manage')}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Back
          </button>
          <h1 style={styles.title}>
            {isEditing ? 'Edit Quiz' : 'Create New Quiz'}
          </h1>
        </div>
        <div style={styles.headerRight}>
          <button
            style={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            <FontAwesomeIcon icon={saving ? faSpinner : faSave} spin={saving} />
            {saving ? 'Saving...' : 'Save Quiz'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Sidebar - Quiz Settings */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarSection}>
            <h3 style={styles.sidebarTitle}>
              <FontAwesomeIcon icon={faClipboardQuestion} />
              Quiz Details
            </h3>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Quiz Title *</label>
              <input
                type="text"
                style={styles.input}
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="Enter quiz title..."
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                Description / Introduction Text
              </label>
              <textarea
                style={styles.textarea}
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Add custom introductory text, instructions, or topic context for students before they start the quiz..."
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Select Book</label>
              <select
                style={styles.select}
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
              >
                <option value="">-- Select Book --</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Assign to Topic *</label>
              <select
                style={styles.select}
                value={formData.topic}
                onChange={(e) => handleFieldChange('topic', e.target.value)}
                disabled={!selectedBook}
              >
                <option value="">-- Select Topic --</option>
                {topics
                  .filter((t) => t.type !== 'chapter')
                  .map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {'—'.repeat(topic.depth)} {topic.title}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div style={styles.sidebarSection}>
            <h3 style={styles.sidebarTitle}>
              <FontAwesomeIcon icon={faClock} />
              Quiz Settings
            </h3>

            <div style={styles.row}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Passing Score (%)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={formData.passing_score}
                  onChange={(e) => handleFieldChange('passing_score', parseInt(e.target.value) || 70)}
                  min="0"
                  max="100"
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Max Attempts</label>
                <input
                  type="number"
                  style={styles.input}
                  value={formData.max_attempts}
                  onChange={(e) => handleFieldChange('max_attempts', parseInt(e.target.value) || 3)}
                  min="1"
                  max="10"
                />
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Time Limit (minutes)</label>
              <input
                type="number"
                style={styles.input}
                value={formData.time_limit_minutes || ''}
                onChange={(e) => handleFieldChange('time_limit_minutes', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="No limit"
                min="1"
              />
            </div>

            <label style={styles.checkbox}>
              <input
                type="checkbox"
                style={styles.checkboxInput}
                checked={formData.shuffle_questions}
                onChange={(e) => handleFieldChange('shuffle_questions', e.target.checked)}
              />
              <span style={styles.checkboxLabel}>Shuffle questions</span>
            </label>

            <label style={styles.checkbox}>
              <input
                type="checkbox"
                style={styles.checkboxInput}
                checked={formData.show_correct_answers}
                onChange={(e) => handleFieldChange('show_correct_answers', e.target.checked)}
              />
              <span style={styles.checkboxLabel}>Show correct answers after</span>
            </label>

            <label style={styles.checkbox}>
              <input
                type="checkbox"
                style={styles.checkboxInput}
                checked={formData.is_active}
                onChange={(e) => handleFieldChange('is_active', e.target.checked)}
              />
              <span style={styles.checkboxLabel}>Quiz is active</span>
            </label>
          </div>

          {/* Quiz Stats */}
          {formData.questions.length > 0 && (
            <div style={styles.stats}>
              <div style={styles.statItem}>
                <div style={styles.statValue}>{formData.questions.length}</div>
                <div style={styles.statLabel}>Questions</div>
              </div>
              <div style={styles.statItem}>
                <div style={styles.statValue}>{getTotalPoints()}</div>
                <div style={styles.statLabel}>Total Points</div>
              </div>
              <div style={styles.statItem}>
                <div style={styles.statValue}>
                  {formData.time_limit_minutes || '∞'}
                </div>
                <div style={styles.statLabel}>Minutes</div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content - Questions */}
        <div style={styles.mainContent}>
          {/* Info Box for Description */}
          <div style={styles.infoBox}>
            <FontAwesomeIcon icon={faInfoCircle} style={styles.infoIcon} />
            <div style={styles.infoText}>
              <strong>Tip:</strong> Use the Description field on the left to add custom introductory text,
              learning objectives, or topic context. This will be shown to students before they start the quiz.
              Each question also has an Explanation field that shows after the student answers.
            </div>
          </div>

          <div style={styles.questionsHeader}>
            <div style={styles.questionsTitle}>
              <FontAwesomeIcon icon={faClipboardQuestion} />
              Questions ({formData.questions.length})
            </div>
            <button
              style={styles.addQuestionBtn}
              onClick={addQuestion}
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Question
            </button>
          </div>

          {formData.questions.length === 0 ? (
            <div style={styles.emptyState}>
              <FontAwesomeIcon icon={faClipboardQuestion} style={styles.emptyIcon} />
              <h3 style={styles.emptyTitle}>No Questions Yet</h3>
              <p style={styles.emptyText}>
                Start building your quiz by adding questions.
                You can add multiple choice, true/false, or multiple answer questions.
              </p>
              <button
                style={styles.addQuestionBtn}
                onClick={addQuestion}
              >
                <FontAwesomeIcon icon={faPlus} />
                Add Your First Question
              </button>
            </div>
          ) : (
            formData.questions.map((question, index) => (
              <QuestionEditor
                key={index}
                question={question}
                index={index}
                onChange={(updated) => updateQuestion(index, updated)}
                onDelete={() => deleteQuestion(index)}
              />
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default QuizBuilderPage;
