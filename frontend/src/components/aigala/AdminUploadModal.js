/**
 * AdminUploadModal Component
 * Modal for Admin/Teacher to upload AI Gala project on behalf of a student.
 */
import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faCloudUploadAlt,
    faSpinner,
    faCheck,
    faTrash,
    faUserGraduate,
    faSearch,
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
import { fetchStudents } from '../../services/studentService';

const AdminUploadModal = ({
    isOpen,
    onClose,
    gallery,
    onUploadSuccess,
    userRole, // 'Admin' or 'Teacher'
}) => {
    // Student selection
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);

    // Form fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [powers, setPowers] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    // Load students when modal opens
    useEffect(() => {
        if (isOpen) {
            loadStudents();
        }
    }, [isOpen]);

    // Filter students based on search query
    useEffect(() => {
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const filtered = students.filter(
                (s) =>
                    s.name?.toLowerCase().includes(query) ||
                    s.student_class?.toLowerCase().includes(query) ||
                    s.school_name?.toLowerCase().includes(query)
            );
            setFilteredStudents(filtered);
        } else {
            setFilteredStudents(students);
        }
    }, [searchQuery, students]);

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

    const loadStudents = async () => {
        setIsLoadingStudents(true);
        try {
            // Fetch active students only
            const data = await fetchStudents({ status: 'Active' });
            setStudents(data || []);
            setFilteredStudents(data || []);
        } catch (error) {
            console.error('Error loading students:', error);
            toast.error('Failed to load students');
        } finally {
            setIsLoadingStudents(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setPowers('');
        setSelectedFile(null);
        setSelectedStudent(null);
        setSearchQuery('');
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
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast.error('Please select a valid image file (JPEG, PNG, GIF, WEBP)');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size must be less than 10MB');
            return;
        }

        setIsCompressing(true);

        try {
            const compressedFile = await compressImage(file);
            setSelectedFile(compressedFile);

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

        if (!selectedStudent) {
            toast.error('Please select a student');
            return;
        }

        if (!title.trim()) {
            toast.error('Please enter a title for the project');
            return;
        }

        if (!selectedFile) {
            toast.error('Please select an image for the project');
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('student_id', selectedStudent.id);
            formData.append('image', selectedFile, selectedFile.name || 'project.jpg');
            formData.append('title', title.trim());
            formData.append('description', description.trim());

            if (powers.trim()) {
                const powersArray = powers.split(',').map((p) => p.trim()).filter(Boolean);
                formData.append('metadata', JSON.stringify({ powers: powersArray }));
            }

            // Use teacher endpoint for both Teacher and Admin (works for both)
            const result = await aiGalaService.teacherUploadProject(gallery.id, formData);

            toast.success(`Project uploaded for ${selectedStudent.name}!`);
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
                        <h2 style={styles.title}>Upload for Student</h2>
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
                    {/* Student Selector */}
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Select Student *</label>

                        {/* Search Input */}
                        <div style={styles.searchContainer}>
                            <FontAwesomeIcon icon={faSearch} style={styles.searchIcon} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, class, or school..."
                                style={styles.searchInput}
                            />
                        </div>

                        {/* Student List */}
                        <div style={styles.studentList}>
                            {isLoadingStudents ? (
                                <div style={styles.loadingState}>
                                    <FontAwesomeIcon icon={faSpinner} spin />
                                    <span>Loading students...</span>
                                </div>
                            ) : filteredStudents.length === 0 ? (
                                <div style={styles.emptyState}>
                                    No students found
                                </div>
                            ) : (
                                filteredStudents.slice(0, 50).map((student) => (
                                    <div
                                        key={student.id}
                                        style={{
                                            ...styles.studentItem,
                                            backgroundColor:
                                                selectedStudent?.id === student.id
                                                    ? 'rgba(139, 126, 200, 0.15)'
                                                    : 'transparent',
                                            borderColor:
                                                selectedStudent?.id === student.id
                                                    ? COLORS.primary
                                                    : COLORS.border.light,
                                        }}
                                        onClick={() => setSelectedStudent(student)}
                                    >
                                        <div style={styles.studentAvatar}>
                                            {student.profile_photo_url ? (
                                                <img
                                                    src={student.profile_photo_url}
                                                    alt={student.name}
                                                    style={styles.avatarImage}
                                                />
                                            ) : (
                                                <FontAwesomeIcon
                                                    icon={faUserGraduate}
                                                    style={styles.avatarIcon}
                                                />
                                            )}
                                        </div>
                                        <div style={styles.studentInfo}>
                                            <span style={styles.studentName}>{student.name}</span>
                                            <span style={styles.studentMeta}>
                                                {student.student_class} • {student.school_name}
                                            </span>
                                        </div>
                                        {selectedStudent?.id === student.id && (
                                            <FontAwesomeIcon
                                                icon={faCheck}
                                                style={styles.checkIcon}
                                            />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

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
                                            Drag & drop image here or click to browse
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
                            placeholder="Give the creation a name"
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
                            placeholder="Tell us the story behind this creation..."
                            style={styles.textarea}
                            rows={3}
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
                        disabled={isUploading || !title.trim() || !selectedFile || !selectedStudent}
                    >
                        {isUploading ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} spin />
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faCheck} />
                                <span>Upload Project</span>
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
        maxWidth: '550px',
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
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    label: {
        display: 'block',
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
    },
    searchContainer: {
        position: 'relative',
        marginBottom: SPACING.sm,
    },
    searchIcon: {
        position: 'absolute',
        left: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: COLORS.text.tertiary,
        fontSize: FONT_SIZES.sm,
    },
    searchInput: {
        width: '100%',
        padding: '12px 16px 12px 40px',
        borderRadius: BORDER_RADIUS.lg,
        border: `1px solid ${COLORS.border.default}`,
        fontSize: FONT_SIZES.base,
        outline: 'none',
        boxSizing: 'border-box',
    },
    studentList: {
        maxHeight: '200px',
        overflowY: 'auto',
        border: `1px solid ${COLORS.border.light}`,
        borderRadius: BORDER_RADIUS.lg,
    },
    studentItem: {
        display: 'flex',
        alignItems: 'center',
        padding: SPACING.sm,
        cursor: 'pointer',
        borderBottom: `1px solid ${COLORS.border.light}`,
        transition: `all ${TRANSITIONS.fast} ease`,
    },
    studentAvatar: {
        width: '40px',
        height: '40px',
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.background.gray,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.sm,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    avatarIcon: {
        color: COLORS.text.tertiary,
        fontSize: FONT_SIZES.base,
    },
    studentInfo: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    studentName: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        color: COLORS.text.primary,
    },
    studentMeta: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.text.tertiary,
    },
    checkIcon: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.base,
    },
    loadingState: {
        padding: SPACING.xl,
        textAlign: 'center',
        color: COLORS.text.tertiary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
    },
    emptyState: {
        padding: SPACING.xl,
        textAlign: 'center',
        color: COLORS.text.tertiary,
    },
    uploadSection: {
        marginBottom: SPACING.sm,
    },
    dropZone: {
        border: `2px dashed ${COLORS.border.default}`,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.xl,
        textAlign: 'center',
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.fast} ease`,
    },
    uploadIcon: {
        fontSize: '36px',
        color: COLORS.primary,
        marginBottom: SPACING.sm,
    },
    dropText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.secondary,
        marginBottom: SPACING.xs,
    },
    dropHint: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.text.tertiary,
    },
    previewContainer: {
        position: 'relative',
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    preview: {
        width: '100%',
        maxHeight: '200px',
        objectFit: 'cover',
        borderRadius: BORDER_RADIUS.lg,
    },
    removeButton: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
        width: '32px',
        height: '32px',
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

export default AdminUploadModal;
