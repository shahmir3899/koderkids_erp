// ============================================
// QUESTION EDITOR - Quiz Question Management
// ============================================
// Location: src/components/lms/quiz-builder/QuestionEditor.js

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faTrash,
  faCheckCircle,
  faCircle,
  faGripVertical,
  faImage,
  faVideo,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { COLORS, MIXINS, BORDER_RADIUS, SHADOWS } from '../../../utils/designConstants';

const styles = {
  container: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: '1.5rem',
    marginBottom: '1rem',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  questionNumber: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: COLORS.text.whiteTransparent,
    fontWeight: '600',
    fontSize: '0.875rem',
  },
  dragHandle: {
    cursor: 'grab',
    color: COLORS.text.whiteSubtle,
  },
  deleteBtn: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    padding: '0.5rem',
    cursor: 'pointer',
    color: '#EF4444',
    transition: 'all 0.2s ease',
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
    minHeight: '80px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    background: 'rgba(88, 60, 140, 0.95)',
    color: COLORS.text.white,
    fontSize: '1rem',
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  row3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '1rem',
  },
  choicesSection: {
    marginTop: '1.5rem',
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.border.whiteSubtle}`,
  },
  choicesHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  choicesTitle: {
    color: COLORS.text.whiteTransparent,
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  addChoiceBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'rgba(59, 130, 246, 0.2)',
    border: `1px solid rgba(59, 130, 246, 0.4)`,
    borderRadius: BORDER_RADIUS.sm,
    color: '#60A5FA',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  choiceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem',
    padding: '0.75rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.sm,
    border: `1px solid ${COLORS.border.whiteSubtle}`,
  },
  choiceCorrectBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceInput: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    borderRadius: BORDER_RADIUS.sm,
    border: `1px solid ${COLORS.border.whiteSubtle}`,
    background: 'rgba(255, 255, 255, 0.08)',
    color: COLORS.text.white,
    fontSize: '0.9rem',
    outline: 'none',
  },
  deleteChoiceBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: COLORS.text.whiteSubtle,
    padding: '0.25rem',
    transition: 'color 0.2s ease',
  },
  mediaSection: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  mediaBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    background: 'rgba(255, 255, 255, 0.08)',
    border: `1px solid ${COLORS.border.whiteSubtle}`,
    borderRadius: BORDER_RADIUS.sm,
    color: COLORS.text.whiteSubtle,
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  mediaBtnActive: {
    background: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    color: '#A78BFA',
  },
  mediaUrlInput: {
    marginTop: '0.5rem',
    padding: '0.5rem 0.75rem',
    borderRadius: BORDER_RADIUS.sm,
    border: `1px solid ${COLORS.border.whiteSubtle}`,
    background: 'rgba(255, 255, 255, 0.08)',
    color: COLORS.text.white,
    fontSize: '0.85rem',
    width: '100%',
    outline: 'none',
  },
  explanationSection: {
    marginTop: '1rem',
    padding: '1rem',
    background: 'rgba(16, 185, 129, 0.1)',
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid rgba(16, 185, 129, 0.2)`,
  },
};

const QuestionEditor = ({
  question,
  index,
  onChange,
  onDelete,
  questionType = 'multiple_choice',
}) => {
  const [mediaType, setMediaType] = useState(question.question_media?.type || null);

  const handleFieldChange = (field, value) => {
    onChange({
      ...question,
      [field]: value,
    });
  };

  const handleChoiceChange = (choiceIndex, field, value) => {
    const newChoices = [...(question.choices || [])];
    newChoices[choiceIndex] = {
      ...newChoices[choiceIndex],
      [field]: value,
    };
    handleFieldChange('choices', newChoices);
  };

  const handleToggleCorrect = (choiceIndex) => {
    const newChoices = [...(question.choices || [])];

    if (question.question_type === 'multiple_answer') {
      // Multiple correct answers allowed
      newChoices[choiceIndex] = {
        ...newChoices[choiceIndex],
        is_correct: !newChoices[choiceIndex].is_correct,
      };
    } else {
      // Single correct answer - radio behavior
      newChoices.forEach((choice, idx) => {
        newChoices[idx] = {
          ...choice,
          is_correct: idx === choiceIndex,
        };
      });
    }

    handleFieldChange('choices', newChoices);
  };

  const addChoice = () => {
    const newChoices = [...(question.choices || [])];
    newChoices.push({
      choice_text: '',
      is_correct: false,
      order: newChoices.length,
    });
    handleFieldChange('choices', newChoices);
  };

  const deleteChoice = (choiceIndex) => {
    const newChoices = (question.choices || []).filter((_, idx) => idx !== choiceIndex);
    handleFieldChange('choices', newChoices);
  };

  const handleMediaTypeChange = (type) => {
    if (mediaType === type) {
      setMediaType(null);
      handleFieldChange('question_media', {});
    } else {
      setMediaType(type);
      handleFieldChange('question_media', { type, url: question.question_media?.url || '' });
    }
  };

  const handleMediaUrlChange = (url) => {
    handleFieldChange('question_media', { type: mediaType, url });
  };

  // For True/False, ensure we have exactly 2 choices
  React.useEffect(() => {
    if (question.question_type === 'true_false') {
      if (!question.choices || question.choices.length !== 2) {
        handleFieldChange('choices', [
          { choice_text: 'True', is_correct: true, order: 0 },
          { choice_text: 'False', is_correct: false, order: 1 },
        ]);
      }
    }
  }, [question.question_type]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.questionNumber}>
          <FontAwesomeIcon icon={faGripVertical} style={styles.dragHandle} />
          <span>Question {index + 1}</span>
        </div>
        <button
          style={styles.deleteBtn}
          onClick={onDelete}
          title="Delete question"
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </div>

      {/* Question Type & Points */}
      <div style={styles.row3}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Question Type</label>
          <select
            style={styles.select}
            value={question.question_type || 'multiple_choice'}
            onChange={(e) => handleFieldChange('question_type', e.target.value)}
          >
            <option value="multiple_choice">Multiple Choice</option>
            <option value="true_false">True/False</option>
            <option value="multiple_answer">Multiple Answer</option>
          </select>
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Points</label>
          <input
            type="number"
            style={styles.input}
            value={question.points || 1}
            onChange={(e) => handleFieldChange('points', parseInt(e.target.value) || 1)}
            min="1"
            max="100"
          />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Order</label>
          <input
            type="number"
            style={styles.input}
            value={question.order || 0}
            onChange={(e) => handleFieldChange('order', parseInt(e.target.value) || 0)}
            min="0"
          />
        </div>
      </div>

      {/* Question Text */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Question Text *</label>
        <textarea
          style={styles.textarea}
          value={question.question_text || ''}
          onChange={(e) => handleFieldChange('question_text', e.target.value)}
          placeholder="Enter the question text here..."
        />

        {/* Media Buttons */}
        <div style={styles.mediaSection}>
          <button
            style={{
              ...styles.mediaBtn,
              ...(mediaType === 'image' ? styles.mediaBtnActive : {}),
            }}
            onClick={() => handleMediaTypeChange('image')}
            type="button"
          >
            <FontAwesomeIcon icon={faImage} />
            Add Image
          </button>
          <button
            style={{
              ...styles.mediaBtn,
              ...(mediaType === 'video' ? styles.mediaBtnActive : {}),
            }}
            onClick={() => handleMediaTypeChange('video')}
            type="button"
          >
            <FontAwesomeIcon icon={faVideo} />
            Add Video
          </button>
        </div>

        {/* Media URL Input */}
        {mediaType && (
          <input
            type="url"
            style={styles.mediaUrlInput}
            value={question.question_media?.url || ''}
            onChange={(e) => handleMediaUrlChange(e.target.value)}
            placeholder={mediaType === 'image' ? 'Enter image URL...' : 'Enter video URL (YouTube/Vimeo)...'}
          />
        )}
      </div>

      {/* Answer Choices */}
      <div style={styles.choicesSection}>
        <div style={styles.choicesHeader}>
          <span style={styles.choicesTitle}>
            {question.question_type === 'true_false' ? 'Options' : 'Answer Choices'}
          </span>
          {question.question_type !== 'true_false' && (
            <button
              style={styles.addChoiceBtn}
              onClick={addChoice}
              type="button"
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Choice
            </button>
          )}
        </div>

        {(question.choices || []).map((choice, choiceIndex) => (
          <div key={choiceIndex} style={styles.choiceItem}>
            <button
              style={styles.choiceCorrectBtn}
              onClick={() => handleToggleCorrect(choiceIndex)}
              type="button"
              title={choice.is_correct ? 'Mark as incorrect' : 'Mark as correct'}
            >
              <FontAwesomeIcon
                icon={choice.is_correct ? faCheckCircle : faCircle}
                style={{
                  fontSize: '1.25rem',
                  color: choice.is_correct ? '#10B981' : COLORS.text.whiteSubtle,
                }}
              />
            </button>
            <input
              style={styles.choiceInput}
              value={choice.choice_text || ''}
              onChange={(e) => handleChoiceChange(choiceIndex, 'choice_text', e.target.value)}
              placeholder={`Choice ${choiceIndex + 1}...`}
              disabled={question.question_type === 'true_false'}
            />
            {question.question_type !== 'true_false' && (
              <button
                style={styles.deleteChoiceBtn}
                onClick={() => deleteChoice(choiceIndex)}
                type="button"
                title="Delete choice"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>
        ))}

        {(!question.choices || question.choices.length === 0) && question.question_type !== 'true_false' && (
          <p style={{ color: COLORS.text.whiteSubtle, fontSize: '0.875rem', margin: 0, textAlign: 'center' }}>
            Click "Add Choice" to add answer options
          </p>
        )}
      </div>

      {/* Explanation (shown after answering) */}
      <div style={styles.explanationSection}>
        <label style={{ ...styles.label, color: '#10B981' }}>
          Explanation (shown after student answers)
        </label>
        <textarea
          style={{
            ...styles.textarea,
            minHeight: '60px',
            background: 'rgba(255, 255, 255, 0.1)',
          }}
          value={question.explanation || ''}
          onChange={(e) => handleFieldChange('explanation', e.target.value)}
          placeholder="Enter explanation or additional information to show after the student answers..."
        />
      </div>
    </div>
  );
};

export default QuestionEditor;
