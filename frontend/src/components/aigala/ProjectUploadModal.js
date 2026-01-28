/**
 * ProjectUploadModal Component
 * Modal for uploading a new AI Gala project with image, title, and description.
 * Follows existing ImageUploadModal patterns.
 */
import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faCloudUploadAlt,
    faImage,
    faSpinner,
    faCheck,
    faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import Compressor from 'compressorjs';
import {
    COLORS,
    BORDER_RADIUS,
    SHADOWS,
    SPACING,
    FONT_SIZES,
    FONT_WEIGHTS,
    TRANSITIONS,
    Z_INDEX,
} from '../../utils/designConstants';
import { aiGalaService } from '../../services/aiGalaService';

const ProjectUploadModal = ({
    isOpen,
    onClose,
    gallery,
    onUploadSuccess,
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [powers, setPowers] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        // Cleanup preview URL on unmount
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    useEffect(() => {
        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape' && !isUploading) onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, isUploading, onClose]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setPowers('');
        setSelectedFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    const handleClose = () => {
        if (!isUploading) {
            resetForm();
            onClose();
        }
    };

    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            new Compressor(file, {
                quality: 0.8,
                maxWidth: 1200,
                maxHeight: 1200,
                success: resolve,
                error: reject,
            });
        });
    };

    const handleFileSelect = async (file) => {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast.error('Please select a valid image file (JPEG, PNG, GIF, WEBP)');
            return;
        }

        // Validate file size (max 10MB before compression)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size must be less than 10MB');
            return;
        }

        setIsCompressing(true);

        try {
            const compressedFile = await compressImage(file);
            setSelectedFile(compressedFile);

            // Create preview
            const preview = URL.createObjectURL(compressedFile);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(preview);
        } catch (error) {
            console.error('Compression error:', error);
            toast.error('Failed to process image');
        } finally {
            setIsCompressing(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const removeImage = () => {
        setSelectedFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim()) {
            toast.error('Please enter a title for your project');
            return;
        }

        if (!selectedFile) {
            toast.error('Please select an image for your project');
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('image', selectedFile, selectedFile.name || 'project.jpg');
            formData.append('title', title.trim());
            formData.append('description', description.trim());

            // Parse powers into array
            if (powers.trim()) {
                const powersArray = powers.split(',').map((p) => p.trim()).filter(Boolean);
                formData.append('metadata', JSON.stringify({ powers: powersArray }));
            }

            const result = await aiGalaService.uploadProject(gallery.id, formData);

            toast.success('Project uploaded successfully!');
            resetForm();
            onUploadSuccess && onUploadSuccess(result);
            onClose();
        } catch (error) {
            const message = error.response?.data?.error || 'Failed to upload project';
            toast.error(message);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={styles.overlay} onClick={handleClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={styles.header}>
                    <div>
                        <h2 style={styles.title}>Upload Your Creation</h2>
                        <p style={styles.subtitle}>
                            {gallery?.title} - {gallery?.theme}
                        </p>
                    </div>
                    <button
                        style={styles.closeButton}
                        onClick={handleClose}
                        disabled={isUploading}
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={styles.form}>
                    {/* Image Upload Area */}
                    <div style={styles.uploadSection}>
                        <label style={styles.label}>Project Image *</label>

                        {!previewUrl ? (
                            <div
                                style={{
                                    ...styles.dropZone,
                                    borderColor: dragActive
                                        ? COLORS.primary
                                        : COLORS.border.default,
                                    backgroundColor: dragActive
                                        ? 'rgba(139, 126, 200, 0.1)'
                                        : COLORS.background.gray,
                                }}
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {isCompressing ? (
                                    <>
                                        <FontAwesomeIcon
                                            icon={faSpinner}
                                            spin
                                            style={styles.uploadIcon}
                                        />
                                        <p style={styles.dropText}>Processing image...</p>
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon
                                            icon={faCloudUploadAlt}
                                            style={styles.uploadIcon}
                                        />
                                        <p style={styles.dropText}>
                                            Drag & drop your image here or click to browse
                                        </p>
                                        <p style={styles.dropHint}>
                                            JPEG, PNG, GIF, WEBP (max 10MB)
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div style={styles.previewContainer}>
                                <img src={previewUrl} alt="Preview" style={styles.preview} />
                                <button
                                    type="button"
                                    style={styles.removeButton}
                                    onClick={removeImage}
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleInputChange}
                            style={styles.hiddenInput}
                        />
                    </div>

                    {/* Title Input */}
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Give your creation a name (e.g., Thunder Girl)"
                            style={styles.input}
                            maxLength={200}
                            required
                        />
                    </div>

                    {/* Description Input */}
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Origin Story</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tell us the story behind your creation..."
                            style={styles.textarea}
                            rows={4}
                            maxLength={1000}
                        />
                    </div>

                    {/* Powers Input (for Superhero theme) */}
                    {gallery?.theme?.toLowerCase().includes('superhero') && (
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Superpowers</label>
                            <input
                                type="text"
                                value={powers}
                                onChange={(e) => setPowers(e.target.value)}
                                placeholder="Lightning speed, super strength (separate with commas)"
                                style={styles.input}
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        style={{
                            ...styles.submitButton,
                            opacity: isUploading ? 0.7 : 1,
                        }}
                        disabled={isUploading || !title.trim() || !selectedFile}
                    >
                        {isUploading ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} spin />
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faCheck} />
                                <span>Submit Project</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: Z_INDEX.modal,
        padding: SPACING.lg,
    },
    modal: {
        backgroundColor: COLORS.background.white,
        borderRadius: BORDER_RADIUS.xl,
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: SHADOWS.xl,
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: SPACING.xl,
        borderBottom: `1px solid ${COLORS.border.light}`,
    },
    title: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.text.primary,
        margin: 0,
    },
    subtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.tertiary,
        marginTop: SPACING.xs,
    },
    closeButton: {
        width: '36px',
        height: '36px',
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.background.gray,
        color: COLORS.text.secondary,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: FONT_SIZES.base,
        transition: `all ${TRANSITIONS.fast} ease`,
    },
    form: {
        padding: SPACING.xl,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.lg,
    },
    uploadSection: {
        marginBottom: SPACING.sm,
    },
    label: {
        display: 'block',
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
    },
    dropZone: {
        border: `2px dashed ${COLORS.border.default}`,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING['2xl'],
        textAlign: 'center',
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.fast} ease`,
    },
    uploadIcon: {
        fontSize: '48px',
        color: COLORS.primary,
        marginBottom: SPACING.md,
    },
    dropText: {
        fontSize: FONT_SIZES.base,
        color: COLORS.text.secondary,
        marginBottom: SPACING.xs,
    },
    dropHint: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.tertiary,
    },
    previewContainer: {
        position: 'relative',
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    preview: {
        width: '100%',
        maxHeight: '300px',
        objectFit: 'cover',
        borderRadius: BORDER_RADIUS.lg,
    },
    removeButton: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
        width: '36px',
        height: '36px',
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.status.error,
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hiddenInput: {
        display: 'none',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    input: {
        padding: '12px 16px',
        borderRadius: BORDER_RADIUS.lg,
        border: `1px solid ${COLORS.border.default}`,
        fontSize: FONT_SIZES.base,
        outline: 'none',
        transition: `border-color ${TRANSITIONS.fast} ease`,
    },
    textarea: {
        padding: '12px 16px',
        borderRadius: BORDER_RADIUS.lg,
        border: `1px solid ${COLORS.border.default}`,
        fontSize: FONT_SIZES.base,
        outline: 'none',
        resize: 'vertical',
        fontFamily: 'inherit',
        transition: `border-color ${TRANSITIONS.fast} ease`,
    },
    submitButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        padding: '14px 24px',
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.primary,
        color: '#fff',
        border: 'none',
        fontSize: FONT_SIZES.base,
        fontWeight: FONT_WEIGHTS.semibold,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.fast} ease`,
    },
};

export default ProjectUploadModal;
