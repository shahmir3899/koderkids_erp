// ============================================
// TOPIC EDITOR - Rich editor for topic content
// ============================================
// Location: src/components/admin/TopicEditor.js

import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faTimes,
  faPlus,
  faTrash,
  faGripVertical,
  faImage,
  faVideo,
  faChevronDown,
  faChevronUp,
  faCopy,
} from '@fortawesome/free-solid-svg-icons';
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-toastify';
import Compressor from 'compressorjs';

// Services
import { uploadTopicImage } from '../../services/bookAdminService';

// Design System
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';

// Image compression options
const COMPRESSION_OPTIONS = {
  quality: 0.7,
  maxWidth: 1200,
  maxHeight: 1200,
};

// Compress image before upload
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: COMPRESSION_OPTIONS.quality,
      maxWidth: COMPRESSION_OPTIONS.maxWidth,
      maxHeight: COMPRESSION_OPTIONS.maxHeight,
      mimeType: file.type,
      success(result) {
        const compressedFile = new File([result], file.name, { type: file.type });
        console.log(`📷 Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
        resolve(compressedFile);
      },
      error(err) {
        console.error('Compression error:', err);
        reject(err);
      },
    });
  });
};

// Resolve image URL for preview (handles both old relative paths and new Supabase URLs)
const API_URL = process.env.REACT_APP_API_URL || '';
const resolveImageUrl = (url) => {
  if (!url) return '';
  // If already absolute URL (Supabase or other), return as-is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // Prepend API URL to old relative paths
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const ACTIVITY_TYPES = [
  { value: 'class_activity', label: 'Class Activity', color: '#3B82F6' },
  { value: 'home_activity', label: 'Home Activity', color: '#10B981' },
  { value: 'challenge', label: 'Challenge', color: '#F59E0B' },
  { value: 'note', label: 'Note/Tip', color: '#8B5CF6' },
];

const TopicEditor = ({ topic, bookId, onSave, onCancel, saving }) => {
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    type: 'lesson',
    content: '',
    video_url: '',
    video_duration_seconds: '',
    estimated_time_minutes: 10,
    is_required: true,
    activity_blocks: [],
  });

  const [expandedBlocks, setExpandedBlocks] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [currentImageTarget, setCurrentImageTarget] = useState(null);

  // Helper to ensure activity_blocks is always an array
  const parseActivityBlocks = (blocks) => {
    if (!blocks) return [];
    if (Array.isArray(blocks)) return blocks;
    // If it's a string (JSON), try to parse it
    if (typeof blocks === 'string') {
      try {
        const parsed = JSON.parse(blocks);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    // If it's an object but not array, wrap it
    if (typeof blocks === 'object') {
      return [blocks];
    }
    return [];
  };

  // Initialize form data when topic changes
  useEffect(() => {
    if (topic) {
      // Only load activity_blocks for activity-type topics
      const topicType = topic.type || 'lesson';
      const activityBlocks = topicType === 'activity'
        ? parseActivityBlocks(topic.activity_blocks)
        : [];

      setFormData({
        code: topic.code || '',
        title: topic.title || '',
        type: topicType,
        content: topic.content || '',
        video_url: topic.video_url || '',
        video_duration_seconds: topic.video_duration_seconds || '',
        estimated_time_minutes: topic.estimated_time_minutes || 10,
        is_required: topic.is_required !== false,
        activity_blocks: activityBlocks,
      });
      // Expand all blocks by default
      const expanded = {};
      activityBlocks.forEach((_, idx) => {
        expanded[idx] = true;
      });
      setExpandedBlocks(expanded);
    }
  }, [topic]);

  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Activity block handlers
  const addActivityBlock = () => {
    const newBlock = {
      type: 'class_activity',
      title: `Activity ${formData.activity_blocks.length + 1}`,
      introduction: '',
      content: '',
      steps: [],
      challenge: '',
      order: formData.activity_blocks.length,
    };
    setFormData(prev => ({
      ...prev,
      activity_blocks: [...prev.activity_blocks, newBlock],
    }));
    setExpandedBlocks(prev => ({
      ...prev,
      [formData.activity_blocks.length]: true,
    }));
  };

  const updateActivityBlock = (index, field, value) => {
    setFormData(prev => {
      const blocks = [...prev.activity_blocks];
      blocks[index] = { ...blocks[index], [field]: value };
      return { ...prev, activity_blocks: blocks };
    });
  };

  const removeActivityBlock = (index) => {
    setFormData(prev => ({
      ...prev,
      activity_blocks: prev.activity_blocks.filter((_, i) => i !== index),
    }));
  };

  const duplicateActivityBlock = (index) => {
    const block = { ...formData.activity_blocks[index] };
    block.title = `${block.title} (Copy)`;
    block.order = formData.activity_blocks.length;
    setFormData(prev => ({
      ...prev,
      activity_blocks: [...prev.activity_blocks, block],
    }));
  };

  const moveActivityBlock = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.activity_blocks.length) return;

    setFormData(prev => {
      const blocks = [...prev.activity_blocks];
      [blocks[index], blocks[newIndex]] = [blocks[newIndex], blocks[index]];
      return { ...prev, activity_blocks: blocks };
    });
  };

  // Step handlers
  const addStep = (blockIndex) => {
    const block = formData.activity_blocks[blockIndex];
    const steps = block.steps || [];
    const newStep = {
      number: steps.length + 1,
      title: 'Step',
      content: '',
      image: '',
    };
    updateActivityBlock(blockIndex, 'steps', [...steps, newStep]);
  };

  const updateStep = (blockIndex, stepIndex, field, value) => {
    const block = formData.activity_blocks[blockIndex];
    const steps = [...(block.steps || [])];
    steps[stepIndex] = { ...steps[stepIndex], [field]: value };
    updateActivityBlock(blockIndex, 'steps', steps);
  };

  const removeStep = (blockIndex, stepIndex) => {
    const block = formData.activity_blocks[blockIndex];
    const steps = (block.steps || []).filter((_, i) => i !== stepIndex);
    // Renumber steps
    steps.forEach((step, i) => {
      step.number = i + 1;
    });
    updateActivityBlock(blockIndex, 'steps', steps);
  };

  // Image upload with compression
  const handleImageUpload = async (file, target) => {
    if (!file) return;

    try {
      setUploadingImage(true);

      // Compress image before upload
      const compressedFile = await compressImage(file);

      // Upload to Supabase
      const result = await uploadTopicImage(compressedFile, topic?.id || 'new', bookId || 'general');

      // Insert image URL based on target
      if (target.type === 'content') {
        const imgTag = `<img src="${result.url}" alt="Image" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" />`;
        handleChange('content', formData.content + '\n' + imgTag);
      } else if (target.type === 'step') {
        updateStep(target.blockIndex, target.stepIndex, 'image', result.url);
      } else if (target.type === 'block_content') {
        const imgTag = `<img src="${result.url}" alt="Image" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" />`;
        const block = formData.activity_blocks[target.blockIndex];
        updateActivityBlock(target.blockIndex, 'content', (block.content || '') + '\n' + imgTag);
      }

      toast.success('Image uploaded to Supabase');
    } catch (error) {
      toast.error('Failed to upload image: ' + error.message);
    } finally {
      setUploadingImage(false);
      setCurrentImageTarget(null);
    }
  };

  const triggerImageUpload = (target) => {
    setCurrentImageTarget(target);
    fileInputRef.current?.click();
  };

  // Form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    const dataToSave = {
      ...formData,
      book: bookId,
      parent: topic.parent,
      video_duration_seconds: formData.video_duration_seconds
        ? parseInt(formData.video_duration_seconds)
        : null,
      estimated_time_minutes: parseInt(formData.estimated_time_minutes) || 10,
      // Only include activity_blocks for activity-type topics
      activity_blocks: formData.type === 'activity' ? formData.activity_blocks : [],
    };

    if (topic.id) {
      dataToSave.id = topic.id;
    }

    onSave(dataToSave);
  };

  const toggleBlockExpand = (index) => {
    setExpandedBlocks(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form} className="topic-editor-form">
      {/* Hidden file input for image uploads */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={(e) => {
          if (e.target.files[0] && currentImageTarget) {
            handleImageUpload(e.target.files[0], currentImageTarget);
          }
          e.target.value = '';
        }}
      />

      {/* Basic Info Section */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Basic Information</h4>

        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Code</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              style={styles.input}
              placeholder="e.g., 1.1"
            />
          </div>

          <div style={{ ...styles.formGroup, flex: 2 }}>
            <label style={styles.label}>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              style={styles.input}
              placeholder="Enter topic title"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Type</label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              style={styles.input}
            >
              <option value="chapter">Chapter</option>
              <option value="lesson">Lesson</option>
              <option value="activity">Activity</option>
            </select>
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Estimated Time (minutes)</label>
            <input
              type="number"
              value={formData.estimated_time_minutes}
              onChange={(e) => handleChange('estimated_time_minutes', e.target.value)}
              style={styles.input}
              min="1"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={formData.is_required}
                onChange={(e) => handleChange('is_required', e.target.checked)}
              />
              Required for completion
            </label>
          </div>
        </div>
      </div>

      {/* Video Section - Only show for lessons/activities, not chapters */}
      {formData.type !== 'chapter' && (
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>
          <FontAwesomeIcon icon={faVideo} style={{ marginRight: '8px' }} />
          Video Content
        </h4>

        <div style={styles.row}>
          <div style={{ ...styles.formGroup, flex: 2 }}>
            <label style={styles.label}>Video URL (YouTube/Vimeo)</label>
            <input
              type="url"
              value={formData.video_url}
              onChange={(e) => handleChange('video_url', e.target.value)}
              style={styles.input}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Duration (seconds)</label>
            <input
              type="number"
              value={formData.video_duration_seconds}
              onChange={(e) => handleChange('video_duration_seconds', e.target.value)}
              style={styles.input}
              placeholder="e.g., 300"
            />
          </div>
        </div>
      </div>
      )}

      {/* Main Content Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Main Content (HTML)</h4>
          <button
            type="button"
            style={styles.iconTextButton}
            onClick={() => triggerImageUpload({ type: 'content' })}
            disabled={uploadingImage}
          >
            <FontAwesomeIcon icon={faImage} style={{ marginRight: '6px' }} />
            Add Image
          </button>
        </div>

        <textarea
          value={formData.content}
          onChange={(e) => handleChange('content', e.target.value)}
          style={{ ...styles.textarea, minHeight: '150px' }}
          placeholder="<h2>Welcome to Pixel Art Magic!</h2>
<p>Get ready to create awesome digital art!</p>

<h3>What is Pixel Art?</h3>
<p>It's a special kind of digital drawing where you use tiny squares of color.</p>"
        />
        <p style={styles.hint}>
          Supports HTML. Use &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;img&gt;, etc.
        </p>
      </div>

      {/* Activity Blocks Section - Only show for activity type (not chapters or lessons) */}
      {formData.type === 'activity' && (
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Activity Blocks</h4>
          <button
            type="button"
            style={styles.addButton}
            onClick={addActivityBlock}
          >
            <FontAwesomeIcon icon={faPlus} style={{ marginRight: '6px' }} />
            Add Activity
          </button>
        </div>

        {formData.activity_blocks.map((block, blockIndex) => {
          const activityType = ACTIVITY_TYPES.find(t => t.value === block.type) || ACTIVITY_TYPES[0];
          const isExpanded = expandedBlocks[blockIndex];

          return (
            <div
              key={blockIndex}
              style={{
                ...styles.activityBlock,
                borderLeftColor: activityType.color,
              }}
            >
              {/* Block Header */}
              <div
                style={styles.blockHeader}
                onClick={() => toggleBlockExpand(blockIndex)}
              >
                <div style={styles.blockHeaderLeft}>
                  <FontAwesomeIcon
                    icon={isExpanded ? faChevronDown : faChevronUp}
                    style={{ marginRight: '8px', fontSize: '12px' }}
                  />
                  <span style={{ ...styles.blockType, backgroundColor: activityType.color }}>
                    {activityType.label}
                  </span>
                  <span style={styles.blockTitle}>{block.title}</span>
                </div>
                <div style={styles.blockActions}>
                  <button
                    type="button"
                    style={styles.blockIconButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveActivityBlock(blockIndex, 'up');
                    }}
                    disabled={blockIndex === 0}
                    title="Move up"
                  >
                    <FontAwesomeIcon icon={faChevronUp} />
                  </button>
                  <button
                    type="button"
                    style={styles.blockIconButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveActivityBlock(blockIndex, 'down');
                    }}
                    disabled={blockIndex === formData.activity_blocks.length - 1}
                    title="Move down"
                  >
                    <FontAwesomeIcon icon={faChevronDown} />
                  </button>
                  <button
                    type="button"
                    style={styles.blockIconButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateActivityBlock(blockIndex);
                    }}
                    title="Duplicate"
                  >
                    <FontAwesomeIcon icon={faCopy} />
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.blockIconButton, color: COLORS.status.error }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeActivityBlock(blockIndex);
                    }}
                    title="Delete"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>

              {/* Block Content */}
              {isExpanded && (
                <div style={styles.blockContent}>
                  <div style={styles.row}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Type</label>
                      <select
                        value={block.type}
                        onChange={(e) => updateActivityBlock(blockIndex, 'type', e.target.value)}
                        style={styles.input}
                      >
                        {ACTIVITY_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ ...styles.formGroup, flex: 2 }}>
                      <label style={styles.label}>Title</label>
                      <input
                        type="text"
                        value={block.title}
                        onChange={(e) => updateActivityBlock(blockIndex, 'title', e.target.value)}
                        style={styles.input}
                        placeholder="e.g., Class Activity 1: Draw a Pixel Festival Icon"
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Introduction</label>
                    <textarea
                      value={block.introduction || ''}
                      onChange={(e) => updateActivityBlock(blockIndex, 'introduction', e.target.value)}
                      style={styles.textarea}
                      placeholder="Let's make a tiny pixel drawing for a Pakistan Festival! You'll choose a small drawing area and use colors to create a simple pixel icon."
                    />
                  </div>

                  {/* Steps */}
                  <div style={styles.stepsSection}>
                    <div style={styles.stepsSectionHeader}>
                      <label style={styles.label}>Steps</label>
                      <button
                        type="button"
                        style={styles.smallButton}
                        onClick={() => addStep(blockIndex)}
                      >
                        <FontAwesomeIcon icon={faPlus} style={{ marginRight: '4px' }} />
                        Add Step
                      </button>
                    </div>

                    {(block.steps || []).map((step, stepIndex) => (
                      <div key={stepIndex} style={styles.stepItem}>
                        <div style={styles.stepNumber}>{step.number}</div>
                        <div style={styles.stepContent}>
                          <input
                            type="text"
                            value={step.title}
                            onChange={(e) => updateStep(blockIndex, stepIndex, 'title', e.target.value)}
                            style={{ ...styles.input, marginBottom: '8px' }}
                            placeholder="Step title (e.g., Step)"
                          />
                          <textarea
                            value={step.content}
                            onChange={(e) => updateStep(blockIndex, stepIndex, 'content', e.target.value)}
                            style={{ ...styles.textarea, minHeight: '60px' }}
                            placeholder="Step instructions..."
                          />
                          <div style={styles.stepImageRow}>
                            {step.image && (
                              <img src={resolveImageUrl(step.image)} alt="Step" style={styles.stepImagePreview} />
                            )}
                            <button
                              type="button"
                              style={styles.smallButton}
                              onClick={() => triggerImageUpload({
                                type: 'step',
                                blockIndex,
                                stepIndex,
                              })}
                              disabled={uploadingImage}
                            >
                              <FontAwesomeIcon icon={faImage} style={{ marginRight: '4px' }} />
                              {step.image ? 'Change Image' : 'Add Image'}
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          style={{ ...styles.blockIconButton, color: COLORS.status.error }}
                          onClick={() => removeStep(blockIndex, stepIndex)}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Challenge/Additional Content */}
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Challenge/Note (optional)</label>
                    <textarea
                      value={block.challenge || ''}
                      onChange={(e) => updateActivityBlock(blockIndex, 'challenge', e.target.value)}
                      style={styles.textarea}
                      placeholder="Make your kite animation loop smoothly by making the last frame almost match the first frame."
                    />
                  </div>

                  {/* Additional HTML Content */}
                  <div style={styles.formGroup}>
                    <div style={styles.sectionHeader}>
                      <label style={styles.label}>Additional Content (HTML)</label>
                      <button
                        type="button"
                        style={styles.smallButton}
                        onClick={() => triggerImageUpload({
                          type: 'block_content',
                          blockIndex,
                        })}
                        disabled={uploadingImage}
                      >
                        <FontAwesomeIcon icon={faImage} style={{ marginRight: '4px' }} />
                        Add Image
                      </button>
                    </div>
                    <textarea
                      value={block.content || ''}
                      onChange={(e) => updateActivityBlock(blockIndex, 'content', e.target.value)}
                      style={styles.textarea}
                      placeholder="Any additional HTML content for this activity..."
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {formData.activity_blocks.length === 0 && (
          <div style={styles.emptyBlocks}>
            <p>No activity blocks yet. Click "Add Activity" to create one.</p>
          </div>
        )}
      </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <button
          type="button"
          style={styles.cancelButton}
          onClick={onCancel}
          disabled={saving}
        >
          <FontAwesomeIcon icon={faTimes} style={{ marginRight: '8px' }} />
          Cancel
        </button>
        <button
          type="submit"
          style={styles.saveButton}
          disabled={saving || !formData.title.trim()}
        >
          {saving ? (
            <ClipLoader size={16} color="#fff" />
          ) : (
            <>
              <FontAwesomeIcon icon={faSave} style={{ marginRight: '8px' }} />
              Save Topic
            </>
          )}
        </button>
      </div>

      {/* Upload indicator */}
      {uploadingImage && (
        <div style={styles.uploadingOverlay}>
          <ClipLoader size={30} color={COLORS.status.info} />
          <p>Uploading image...</p>
        </div>
      )}
    </form>
  );
};

const styles = {
  form: {
    padding: SPACING.lg,
    overflowY: 'auto',
    flex: 1,
    position: 'relative',
  },

  section: {
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  sectionTitle: {
    margin: `0 0 ${SPACING.md}`,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },

  row: {
    display: 'flex',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
  },

  formGroup: {
    flex: 1,
    minWidth: '150px',
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

  textarea: {
    width: '100%',
    padding: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px',
    fontFamily: 'monospace',
  },

  hint: {
    margin: `${SPACING.xs} 0 0`,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },

  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    cursor: 'pointer',
    marginTop: SPACING.lg,
  },

  addButton: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: COLORS.status.success,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },

  smallButton: {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.xs,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },

  iconTextButton: {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'transparent',
    color: COLORS.status.info,
    border: `1px solid ${COLORS.status.info}`,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.xs,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },

  activityBlock: {
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.md,
    borderLeft: `4px solid ${COLORS.status.info}`,
    overflow: 'hidden',
  },

  blockHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    cursor: 'pointer',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },

  blockHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  blockType: {
    padding: `2px ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
  },

  blockTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
  },

  blockActions: {
    display: 'flex',
    gap: SPACING.xs,
  },

  blockIconButton: {
    padding: SPACING.xs,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    color: COLORS.text.whiteSubtle,
    cursor: 'pointer',
    fontSize: FONT_SIZES.sm,
  },

  blockContent: {
    padding: SPACING.md,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
  },

  stepsSection: {
    marginBottom: SPACING.md,
  },

  stepsSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },

  stepItem: {
    display: 'flex',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },

  stepNumber: {
    width: '30px',
    height: '30px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.status.info,
    color: COLORS.text.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.sm,
    flexShrink: 0,
  },

  stepContent: {
    flex: 1,
  },

  stepImageRow: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },

  stepImagePreview: {
    width: '80px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: BORDER_RADIUS.sm,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },

  emptyBlocks: {
    textAlign: 'center',
    padding: SPACING.xl,
    color: COLORS.text.whiteSubtle,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BORDER_RADIUS.md,
    border: `1px dashed ${COLORS.border.whiteTransparent}`,
  },

  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    paddingTop: SPACING.lg,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
  },

  cancelButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: 'transparent',
    color: COLORS.text.white,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },

  saveButton: {
    padding: `${SPACING.sm} ${SPACING.xl}`,
    backgroundColor: COLORS.status.info,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },

  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    color: COLORS.text.white,
    zIndex: 10,
  },
};

export default TopicEditor;
