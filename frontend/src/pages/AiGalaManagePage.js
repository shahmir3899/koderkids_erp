/**
 * AiGalaManagePage - Admin Contest Management
 * Allows admins to create, edit, and manage AI Gala contests.
 */
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faStar,
    faPlus,
    faEdit,
    faChartBar,
    faFileDownload,
    faCertificate,
    faSpinner,
    faCheckCircle,
    faHourglassHalf,
    faVoteYea,
    faLock,
    faCalendarAlt,
    faUsers,
    faImage,
    faTrophy,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import {
    COLORS,
    BORDER_RADIUS,
    SHADOWS,
    SPACING,
    FONT_SIZES,
    FONT_WEIGHTS,
    TRANSITIONS,
} from '../utils/designConstants';
import { aiGalaService } from '../services/aiGalaService';
import { useSchools } from '../hooks/useSchools';
import { useClasses } from '../hooks/useClasses';

const STATUS_CONFIG = {
    draft: { label: 'Draft', color: COLORS.text.tertiary, icon: faEdit, bgColor: COLORS.background.gray },
    active: { label: 'Active', color: COLORS.status.success, icon: faCheckCircle, bgColor: COLORS.status.successLight },
    voting: { label: 'Voting', color: COLORS.primary, icon: faVoteYea, bgColor: '#F3E8FF' },
    closed: { label: 'Closed', color: COLORS.status.error, icon: faLock, bgColor: COLORS.status.errorLight },
};

const AiGalaManagePage = () => {
    const [galleries, setGalleries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedGallery, setSelectedGallery] = useState(null);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [stats, setStats] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    useEffect(() => {
        loadGalleries();
    }, []);

    const loadGalleries = async () => {
        setIsLoading(true);
        try {
            // Get all galleries including drafts (admin only)
            const data = await aiGalaService.getGalleries({ includeDrafts: true });
            setGalleries(data || []);
        } catch (error) {
            console.error('Error loading galleries:', error);
            toast.error('Failed to load contests');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (galleryId, newStatus) => {
        try {
            await aiGalaService.adminUpdateGalleryStatus(galleryId, newStatus);
            toast.success(`Contest status updated to ${newStatus}`);
            loadGalleries();
        } catch (error) {
            const message = error.response?.data?.error || 'Failed to update status';
            toast.error(message);
        }
    };

    const handleViewStats = async (gallery) => {
        setSelectedGallery(gallery);
        setShowStatsModal(true);
        setIsLoadingStats(true);
        try {
            const data = await aiGalaService.adminGetGalleryStats(gallery.id);
            setStats(data);
        } catch (error) {
            toast.error('Failed to load statistics');
        } finally {
            setIsLoadingStats(false);
        }
    };

    const handleDownloadReport = async (gallery) => {
        try {
            toast.info('Generating report...');
            const blob = await aiGalaService.downloadParticipationReport(gallery.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AI_Gala_Report_${gallery.month_label?.replace(' ', '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Report downloaded!');
        } catch (error) {
            toast.error('Failed to download report');
        }
    };

    const handleDownloadCertificates = async (gallery) => {
        try {
            toast.info('Generating certificates...');
            const blob = await aiGalaService.downloadAllCertificates(gallery.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AI_Gala_Certificates_${gallery.month_label?.replace(' ', '_')}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Certificates downloaded!');
        } catch (error) {
            toast.error('Failed to download certificates');
        }
    };

    const getNextStatus = (currentStatus) => {
        const flow = { draft: 'active', active: 'voting', voting: 'closed' };
        return flow[currentStatus] || null;
    };

    if (isLoading) {
        return (
            <div style={styles.loadingContainer}>
                <FontAwesomeIcon icon={faSpinner} spin style={styles.loadingIcon} />
                <p>Loading galleries...</p>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.titleSection}>
                        <FontAwesomeIcon icon={faStar} style={styles.titleIcon} />
                        <div>
                            <h1 style={styles.pageTitle}>Manage Contests</h1>
                            <p style={styles.pageSubtitle}>Create and manage monthly contests</p>
                        </div>
                    </div>
                    <button
                        style={styles.createButton}
                        onClick={() => setShowCreateModal(true)}
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        <span>Create Contest</span>
                    </button>
                </div>
            </div>

            {/* Gallery Status Flow Guide */}
            <div style={styles.flowGuide}>
                <h3 style={styles.flowTitle}>Contest Lifecycle</h3>
                <div style={styles.flowSteps}>
                    {Object.entries(STATUS_CONFIG).map(([key, config], index) => (
                        <React.Fragment key={key}>
                            <div style={styles.flowStep}>
                                <div style={{ ...styles.flowIcon, backgroundColor: config.bgColor, color: config.color }}>
                                    <FontAwesomeIcon icon={config.icon} />
                                </div>
                                <span style={styles.flowLabel}>{config.label}</span>
                            </div>
                            {index < 3 && <div style={styles.flowArrow}>→</div>}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Galleries List */}
            <div style={styles.galleriesSection}>
                <h2 style={styles.sectionTitle}>All Contests ({galleries.length})</h2>

                {galleries.length === 0 ? (
                    <div style={styles.emptyState}>
                        <FontAwesomeIcon icon={faStar} style={styles.emptyIcon} />
                        <p>No contests created yet.</p>
                        <button
                            style={styles.createButtonSmall}
                            onClick={() => setShowCreateModal(true)}
                        >
                            Create Your First Contest
                        </button>
                    </div>
                ) : (
                    <div style={styles.galleriesGrid}>
                        {galleries.map((gallery) => {
                            const statusConfig = STATUS_CONFIG[gallery.status] || STATUS_CONFIG.draft;
                            const nextStatus = getNextStatus(gallery.status);

                            return (
                                <div key={gallery.id} style={styles.galleryCard}>
                                    {/* Card Header */}
                                    <div style={styles.cardHeader}>
                                        <div style={styles.cardTitleRow}>
                                            <h3 style={styles.cardTitle}>{gallery.title}</h3>
                                            <span style={{
                                                ...styles.statusBadge,
                                                backgroundColor: statusConfig.bgColor,
                                                color: statusConfig.color,
                                            }}>
                                                <FontAwesomeIcon icon={statusConfig.icon} style={{ marginRight: '6px' }} />
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                        <p style={styles.cardTheme}>{gallery.theme}</p>
                                    </div>

                                    {/* Target Info */}
                                    {gallery.target_display && gallery.target_display !== 'All Schools' && (
                                        <div style={styles.targetBadge}>
                                            <FontAwesomeIcon icon={faUsers} style={{ marginRight: '6px' }} />
                                            {gallery.target_display}
                                        </div>
                                    )}

                                    {/* Card Stats */}
                                    <div style={styles.cardStats}>
                                        <div style={styles.statItem}>
                                            <FontAwesomeIcon icon={faCalendarAlt} style={styles.statIcon} />
                                            <span>{gallery.month_label}</span>
                                        </div>
                                        <div style={styles.statItem}>
                                            <FontAwesomeIcon icon={faImage} style={styles.statIcon} />
                                            <span>{gallery.total_creations || 0} creations</span>
                                        </div>
                                        <div style={styles.statItem}>
                                            <FontAwesomeIcon icon={faUsers} style={styles.statIcon} />
                                            <span>{gallery.total_votes || 0} votes</span>
                                        </div>
                                    </div>

                                    {/* Winners (if closed) */}
                                    {gallery.status === 'closed' && gallery.winners?.length > 0 && (
                                        <div style={styles.winnersSection}>
                                            <FontAwesomeIcon icon={faTrophy} style={{ color: COLORS.studentDashboard.badgeGold, marginRight: '8px' }} />
                                            <span style={styles.winnersText}>
                                                Winners: {gallery.winners.slice(0, 3).map(w => w.student_name).join(', ')}
                                            </span>
                                        </div>
                                    )}

                                    {/* Card Actions */}
                                    <div style={styles.cardActions}>
                                        {/* Status Change Button */}
                                        {nextStatus && (
                                            <button
                                                style={styles.actionButton}
                                                onClick={() => handleStatusChange(gallery.id, nextStatus)}
                                                title={`Move to ${nextStatus}`}
                                            >
                                                <FontAwesomeIcon icon={STATUS_CONFIG[nextStatus].icon} />
                                                <span>Move to {STATUS_CONFIG[nextStatus].label}</span>
                                            </button>
                                        )}

                                        {/* View Stats */}
                                        <button
                                            style={styles.iconButton}
                                            onClick={() => handleViewStats(gallery)}
                                            title="View Statistics"
                                        >
                                            <FontAwesomeIcon icon={faChartBar} />
                                        </button>

                                        {/* Download Report */}
                                        <button
                                            style={styles.iconButton}
                                            onClick={() => handleDownloadReport(gallery)}
                                            title="Download Report"
                                        >
                                            <FontAwesomeIcon icon={faFileDownload} />
                                        </button>

                                        {/* Download Certificates (only for closed) */}
                                        {gallery.status === 'closed' && (
                                            <button
                                                style={styles.iconButton}
                                                onClick={() => handleDownloadCertificates(gallery)}
                                                title="Download All Certificates"
                                            >
                                                <FontAwesomeIcon icon={faCertificate} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Contest Modal */}
            {showCreateModal && (
                <CreateGalleryModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        loadGalleries();
                    }}
                />
            )}

            {/* Stats Modal */}
            {showStatsModal && (
                <StatsModal
                    gallery={selectedGallery}
                    stats={stats}
                    isLoading={isLoadingStats}
                    onClose={() => {
                        setShowStatsModal(false);
                        setSelectedGallery(null);
                        setStats(null);
                    }}
                />
            )}
        </div>
    );
};

// Create Contest Modal Component
const CreateGalleryModal = ({ onClose, onSuccess }) => {
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

    // Get user role
    const userRole = localStorage.getItem('role');
    const isTeacher = userRole === 'Teacher';

    // Use global hooks for schools and classes
    const { schools: allSchools, loading: schoolsLoading } = useSchools();
    const { fetchClassesBySchool } = useClasses();

    const [formData, setFormData] = useState({
        title: '',
        theme: '',
        description: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        voting_start_date: '',
        voting_end_date: '',
        max_votes_per_user: 3,
        allow_comments: true,
        allow_downloads: true,
        // Targeting fields
        target_school_ids: [],
        target_classes: [],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [coverImage, setCoverImage] = useState(null);
    const [availableClasses, setAvailableClasses] = useState([]);
    const [isLoadingClasses, setIsLoadingClasses] = useState(false);
    const [customClass, setCustomClass] = useState('');

    // Fetch classes when selected schools change
    useEffect(() => {
        const loadClassesForSelectedSchools = async () => {
            if (formData.target_school_ids.length === 0) {
                setAvailableClasses([]);
                return;
            }

            setIsLoadingClasses(true);
            try {
                // Fetch classes for all selected schools
                const classPromises = formData.target_school_ids.map(schoolId =>
                    fetchClassesBySchool(schoolId)
                );
                const classResults = await Promise.all(classPromises);

                // Combine and deduplicate classes from all selected schools
                const allClasses = classResults.flat();
                const uniqueClasses = [...new Set(allClasses)].sort((a, b) =>
                    a.localeCompare(b, undefined, { numeric: true })
                );

                setAvailableClasses(uniqueClasses);
            } catch (error) {
                console.error('Error loading classes:', error);
                setAvailableClasses([]);
            } finally {
                setIsLoadingClasses(false);
            }
        };

        loadClassesForSelectedSchools();
    }, [formData.target_school_ids, fetchClassesBySchool]);

    const toggleSchool = (schoolId) => {
        setFormData(prev => {
            const newSchoolIds = prev.target_school_ids.includes(schoolId)
                ? prev.target_school_ids.filter(id => id !== schoolId)
                : [...prev.target_school_ids, schoolId];

            // Clear selected classes if no schools are selected
            const newClasses = newSchoolIds.length === 0 ? [] : prev.target_classes;

            return {
                ...prev,
                target_school_ids: newSchoolIds,
                target_classes: newClasses
            };
        });
    };

    const toggleClass = (className) => {
        setFormData(prev => ({
            ...prev,
            target_classes: prev.target_classes.includes(className)
                ? prev.target_classes.filter(c => c !== className)
                : [...prev.target_classes, className]
        }));
    };

    const addCustomClass = () => {
        if (customClass.trim() && !formData.target_classes.includes(customClass.trim())) {
            setFormData(prev => ({
                ...prev,
                target_classes: [...prev.target_classes, customClass.trim()]
            }));
            setCustomClass('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Teachers must select at least one school
        if (isTeacher && formData.target_school_ids.length === 0) {
            toast.error('Please select at least one school for the contest');
            return;
        }

        setIsSubmitting(true);

        try {
            // Build month_label from month and year (e.g., "February 2026")
            const monthLabel = `${MONTHS[formData.month - 1]} ${formData.year}`;

            const submitData = new FormData();
            submitData.append('title', formData.title);
            submitData.append('theme', formData.theme);
            submitData.append('month_label', monthLabel);
            submitData.append('description', formData.description || '');
            submitData.append('max_votes_per_user', formData.max_votes_per_user);
            submitData.append('allow_comments', formData.allow_comments);
            submitData.append('allow_downloads', formData.allow_downloads);

            // Only append dates if they have values
            if (formData.voting_start_date) {
                submitData.append('voting_start_date', formData.voting_start_date);
            }
            if (formData.voting_end_date) {
                submitData.append('voting_end_date', formData.voting_end_date);
            }

            // Add targeting data
            if (formData.target_school_ids.length > 0) {
                // Send as JSON string for FormData
                submitData.append('target_school_ids', JSON.stringify(formData.target_school_ids));
            }
            if (formData.target_classes.length > 0) {
                submitData.append('target_classes', JSON.stringify(formData.target_classes));
            }

            if (coverImage) {
                submitData.append('cover_image', coverImage);
            }

            await aiGalaService.adminCreateGallery(submitData);
            toast.success('Contest created successfully!');
            onSuccess();
        } catch (error) {
            // Extract detailed error message
            let message = 'Failed to create contest';
            if (error.response?.data) {
                const errorData = error.response.data;
                if (typeof errorData === 'string') {
                    message = errorData;
                } else if (errorData.error) {
                    message = errorData.error;
                } else if (errorData.detail) {
                    message = errorData.detail;
                } else {
                    // Handle validation errors (object with field names)
                    const firstError = Object.values(errorData)[0];
                    message = Array.isArray(firstError) ? firstError[0] : String(firstError);
                }
            }
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <h2 style={styles.modalTitle}>Create New Contest</h2>
                <form onSubmit={handleSubmit}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., January 2026 AI Gala"
                            style={styles.input}
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Theme *</label>
                        <input
                            type="text"
                            value={formData.theme}
                            onChange={e => setFormData({ ...formData, theme: e.target.value })}
                            placeholder="e.g., Underwater Worlds"
                            style={styles.input}
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Brief description of this month's gallery..."
                            style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
                            rows={2}
                        />
                    </div>

                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Month</label>
                            <select
                                value={formData.month}
                                onChange={e => setFormData({ ...formData, month: parseInt(e.target.value) })}
                                style={styles.input}
                            >
                                {MONTHS.map((m, i) => (
                                    <option key={i} value={i + 1}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Year</label>
                            <input
                                type="number"
                                value={formData.year}
                                onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                style={styles.input}
                                min="2024"
                                max="2030"
                            />
                        </div>
                    </div>

                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Voting Start Date</label>
                            <input
                                type="date"
                                value={formData.voting_start_date}
                                onChange={e => setFormData({ ...formData, voting_start_date: e.target.value })}
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Voting End Date</label>
                            <input
                                type="date"
                                value={formData.voting_end_date}
                                onChange={e => setFormData({ ...formData, voting_end_date: e.target.value })}
                                style={styles.input}
                            />
                        </div>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Max Votes Per User</label>
                        <input
                            type="number"
                            value={formData.max_votes_per_user}
                            onChange={e => setFormData({ ...formData, max_votes_per_user: parseInt(e.target.value) })}
                            style={styles.input}
                            min="1"
                            max="10"
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Cover Image (Optional)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={e => setCoverImage(e.target.files[0])}
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.checkboxGroup}>
                        <label style={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={formData.allow_comments}
                                onChange={e => setFormData({ ...formData, allow_comments: e.target.checked })}
                            />
                            Allow Comments
                        </label>
                        <label style={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={formData.allow_downloads}
                                onChange={e => setFormData({ ...formData, allow_downloads: e.target.checked })}
                            />
                            Allow Downloads
                        </label>
                    </div>

                    {/* Target Audience Section */}
                    <div style={styles.targetSection}>
                        <h4 style={styles.targetTitle}>
                            <FontAwesomeIcon icon={faUsers} style={{ marginRight: '8px' }} />
                            Target Audience
                        </h4>
                        <p style={styles.targetHint}>
                            {isTeacher
                                ? 'Select schools from your assigned schools (required)'
                                : 'Leave empty for all schools/classes (global contest)'
                            }
                        </p>

                        {/* School Selection */}
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Target Schools</label>
                            {schoolsLoading ? (
                                <div style={styles.loadingSmall}>Loading schools...</div>
                            ) : allSchools.length === 0 ? (
                                <div style={styles.noSchools}>No schools available</div>
                            ) : (
                                <div style={styles.schoolsGrid}>
                                    {allSchools.map(school => (
                                        <label
                                            key={school.id}
                                            style={{
                                                ...styles.schoolChip,
                                                ...(formData.target_school_ids.includes(school.id) ? styles.schoolChipActive : {})
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.target_school_ids.includes(school.id)}
                                                onChange={() => toggleSchool(school.id)}
                                                style={{ display: 'none' }}
                                            />
                                            {school.name}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Class Selection - Only show if schools are selected */}
                        {formData.target_school_ids.length > 0 && (
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Target Classes (optional)</label>
                                <p style={styles.targetHint}>
                                    Select classes within the chosen schools, or leave empty for all classes
                                </p>
                                {isLoadingClasses ? (
                                    <div style={styles.loadingSmall}>Loading classes...</div>
                                ) : availableClasses.length === 0 ? (
                                    <div style={styles.noSchools}>No classes found. Use custom class below.</div>
                                ) : (
                                    <div style={styles.classesGrid}>
                                        {availableClasses.map(className => (
                                            <label
                                                key={className}
                                                style={{
                                                    ...styles.classChip,
                                                    ...(formData.target_classes.includes(className) ? styles.classChipActive : {})
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={formData.target_classes.includes(className)}
                                                    onChange={() => toggleClass(className)}
                                                    style={{ display: 'none' }}
                                                />
                                                {className}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* Custom class input */}
                                <div style={styles.customClassRow}>
                                    <input
                                        type="text"
                                        value={customClass}
                                        onChange={e => setCustomClass(e.target.value)}
                                        placeholder="Add custom class name..."
                                        style={{ ...styles.input, flex: 1 }}
                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCustomClass())}
                                    />
                                    <button
                                        type="button"
                                        onClick={addCustomClass}
                                        style={styles.addClassButton}
                                    >
                                        Add
                                    </button>
                                </div>

                                {/* Selected classes display */}
                                {formData.target_classes.length > 0 && (
                                    <div style={styles.selectedClasses}>
                                        <span style={styles.selectedLabel}>Selected:</span>
                                        {formData.target_classes.map(cls => (
                                            <span key={cls} style={styles.selectedChip}>
                                                {cls}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleClass(cls)}
                                                    style={styles.removeChip}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Target Summary */}
                        <div style={styles.targetSummary}>
                            {formData.target_school_ids.length === 0 ? (
                                isTeacher ? (
                                    <span style={styles.summaryWarning}>
                                        <FontAwesomeIcon icon={faUsers} style={{ color: '#EF4444', marginRight: '6px' }} />
                                        Please select at least one school
                                    </span>
                                ) : (
                                    <span style={styles.summaryGlobal}>
                                        <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#10B981', marginRight: '6px' }} />
                                        Global Contest - All students can participate
                                    </span>
                                )
                            ) : (
                                <span style={styles.summaryTargeted}>
                                    <FontAwesomeIcon icon={faUsers} style={{ color: COLORS.primary, marginRight: '6px' }} />
                                    Targeting {formData.target_school_ids.length} school(s)
                                    {formData.target_classes.length > 0 && `, ${formData.target_classes.length} class(es)`}
                                </span>
                            )}
                        </div>
                    </div>

                    <div style={styles.modalActions}>
                        <button type="button" style={styles.cancelButton} onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" style={styles.submitButton} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} spin />
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faPlus} />
                                    <span>Create Contest</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Stats Modal Component
const StatsModal = ({ gallery, stats, isLoading, onClose }) => {
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <h2 style={styles.modalTitle}>
                    <FontAwesomeIcon icon={faChartBar} style={{ marginRight: '10px' }} />
                    {gallery?.title} - Statistics
                </h2>

                {isLoading ? (
                    <div style={styles.modalLoading}>
                        <FontAwesomeIcon icon={faSpinner} spin />
                        <span>Loading statistics...</span>
                    </div>
                ) : stats ? (
                    <div style={styles.statsGrid}>
                        <div style={styles.statCard}>
                            <div style={styles.statNumber}>{stats.total_creations || 0}</div>
                            <div style={styles.statLabel}>Total Projects</div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={styles.statNumber}>{stats.total_votes || 0}</div>
                            <div style={styles.statLabel}>Total Votes</div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={styles.statNumber}>{stats.unique_voters || 0}</div>
                            <div style={styles.statLabel}>Unique Voters</div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={styles.statNumber}>{stats.total_comments || 0}</div>
                            <div style={styles.statLabel}>Comments</div>
                        </div>

                        {stats.creations_by_class && stats.creations_by_class.length > 0 && (
                            <div style={styles.breakdownSection}>
                                <h4 style={styles.breakdownTitle}>Projects by Class</h4>
                                {stats.creations_by_class.map((item, index) => (
                                    <div key={index} style={styles.breakdownRow}>
                                        <span>{item.student__student_class || 'Unknown'}</span>
                                        <span style={styles.breakdownCount}>{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <p>No statistics available</p>
                )}

                <div style={styles.modalActions}>
                    <button style={styles.cancelButton} onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles = {
    page: {
        minHeight: '100vh',
        backgroundColor: COLORS.background.gray,
        padding: SPACING.xl,
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: SPACING.md,
        color: COLORS.text.secondary,
    },
    loadingIcon: {
        fontSize: '32px',
        color: COLORS.primary,
    },
    header: {
        backgroundColor: COLORS.background.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        marginBottom: SPACING.lg,
        boxShadow: SHADOWS.md,
    },
    headerContent: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: SPACING.lg,
    },
    titleSection: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
    },
    titleIcon: {
        fontSize: '40px',
        color: COLORS.studentDashboard.badgeGold,
    },
    pageTitle: {
        fontSize: FONT_SIZES['2xl'],
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.text.primary,
        margin: 0,
    },
    pageSubtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.tertiary,
        marginTop: SPACING.xs,
    },
    createButton: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        padding: '12px 24px',
        backgroundColor: COLORS.primary,
        color: '#fff',
        border: 'none',
        borderRadius: BORDER_RADIUS.lg,
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.fast}`,
    },
    flowGuide: {
        backgroundColor: COLORS.background.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        boxShadow: SHADOWS.sm,
    },
    flowTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.md,
    },
    flowSteps: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.md,
        flexWrap: 'wrap',
    },
    flowStep: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    flowIcon: {
        width: '48px',
        height: '48px',
        borderRadius: BORDER_RADIUS.full,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
    },
    flowLabel: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        color: COLORS.text.secondary,
    },
    flowArrow: {
        fontSize: '24px',
        color: COLORS.text.tertiary,
    },
    galleriesSection: {
        marginTop: SPACING.lg,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.lg,
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING['3xl'],
        backgroundColor: COLORS.background.white,
        borderRadius: BORDER_RADIUS.xl,
        color: COLORS.text.tertiary,
    },
    emptyIcon: {
        fontSize: '48px',
        marginBottom: SPACING.md,
        opacity: 0.5,
    },
    createButtonSmall: {
        marginTop: SPACING.md,
        padding: '10px 20px',
        backgroundColor: COLORS.primary,
        color: '#fff',
        border: 'none',
        borderRadius: BORDER_RADIUS.lg,
        cursor: 'pointer',
    },
    galleriesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
        gap: SPACING.lg,
    },
    galleryCard: {
        backgroundColor: COLORS.background.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        boxShadow: SHADOWS.md,
    },
    cardHeader: {
        marginBottom: SPACING.md,
    },
    cardTitleRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.xs,
    },
    cardTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.primary,
        margin: 0,
    },
    cardTheme: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.tertiary,
        margin: 0,
    },
    targetBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        backgroundColor: COLORS.primaryLight + '20',
        color: COLORS.primary,
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.medium,
        marginTop: SPACING.sm,
        marginBottom: SPACING.xs,
    },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderRadius: BORDER_RADIUS.full,
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    cardStats: {
        display: 'flex',
        gap: SPACING.lg,
        marginBottom: SPACING.md,
        padding: SPACING.md,
        backgroundColor: COLORS.background.gray,
        borderRadius: BORDER_RADIUS.md,
    },
    statItem: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.xs,
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.secondary,
    },
    statIcon: {
        color: COLORS.text.tertiary,
    },
    winnersSection: {
        display: 'flex',
        alignItems: 'center',
        padding: SPACING.sm,
        backgroundColor: COLORS.status.warningLight,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.md,
        fontSize: FONT_SIZES.sm,
    },
    winnersText: {
        color: COLORS.text.primary,
    },
    cardActions: {
        display: 'flex',
        gap: SPACING.sm,
        borderTop: `1px solid ${COLORS.border.default}`,
        paddingTop: SPACING.md,
    },
    actionButton: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        padding: '10px 16px',
        backgroundColor: COLORS.primary,
        color: '#fff',
        border: 'none',
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        cursor: 'pointer',
    },
    iconButton: {
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background.gray,
        color: COLORS.text.secondary,
        border: 'none',
        borderRadius: BORDER_RADIUS.md,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.fast}`,
    },
    // Modal Styles
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: COLORS.background.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
    },
    modalTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.lg,
    },
    modalLoading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.md,
        padding: SPACING.xl,
        color: COLORS.text.tertiary,
    },
    formGroup: {
        marginBottom: SPACING.md,
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: SPACING.md,
    },
    label: {
        display: 'block',
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        color: COLORS.text.secondary,
        marginBottom: SPACING.xs,
    },
    input: {
        width: '100%',
        padding: '10px 12px',
        border: `1px solid ${COLORS.border.default}`,
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.sm,
        outline: 'none',
        boxSizing: 'border-box',
    },
    checkboxGroup: {
        display: 'flex',
        gap: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.xs,
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.secondary,
        cursor: 'pointer',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: SPACING.md,
        marginTop: SPACING.lg,
    },
    cancelButton: {
        padding: '10px 20px',
        backgroundColor: COLORS.background.gray,
        color: COLORS.text.secondary,
        border: 'none',
        borderRadius: BORDER_RADIUS.md,
        cursor: 'pointer',
    },
    submitButton: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        padding: '10px 20px',
        backgroundColor: COLORS.primary,
        color: '#fff',
        border: 'none',
        borderRadius: BORDER_RADIUS.md,
        cursor: 'pointer',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: SPACING.md,
    },
    statCard: {
        backgroundColor: COLORS.background.gray,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        textAlign: 'center',
    },
    statNumber: {
        fontSize: FONT_SIZES['2xl'],
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.primary,
    },
    statLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.tertiary,
    },
    breakdownSection: {
        gridColumn: '1 / -1',
        marginTop: SPACING.md,
    },
    breakdownTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        marginBottom: SPACING.sm,
    },
    breakdownRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: SPACING.sm,
        borderBottom: `1px solid ${COLORS.border.default}`,
        fontSize: FONT_SIZES.sm,
    },
    breakdownCount: {
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.primary,
    },
    // Target Audience Styles
    targetSection: {
        marginTop: SPACING.lg,
        padding: SPACING.md,
        backgroundColor: COLORS.background.lightGray,
        borderRadius: BORDER_RADIUS.lg,
        border: `1px solid ${COLORS.border.default}`,
    },
    targetTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.primary,
        margin: 0,
        marginBottom: SPACING.xs,
    },
    targetHint: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.text.tertiary,
        margin: 0,
        marginBottom: SPACING.md,
    },
    loadingSmall: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.tertiary,
        padding: SPACING.sm,
    },
    noSchools: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.tertiary,
        padding: SPACING.sm,
        fontStyle: 'italic',
    },
    schoolsGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: SPACING.xs,
    },
    schoolChip: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 12px',
        backgroundColor: COLORS.background.white,
        border: `1px solid ${COLORS.border.default}`,
        borderRadius: BORDER_RADIUS.full,
        fontSize: FONT_SIZES.sm,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.fast}`,
    },
    schoolChipActive: {
        backgroundColor: COLORS.primary,
        color: '#fff',
        borderColor: COLORS.primary,
    },
    classesGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: SPACING.xs,
        marginBottom: SPACING.sm,
    },
    classChip: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        backgroundColor: COLORS.background.white,
        border: `1px solid ${COLORS.border.default}`,
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.xs,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.fast}`,
    },
    classChipActive: {
        backgroundColor: COLORS.primary,
        color: '#fff',
        borderColor: COLORS.primary,
    },
    customClassRow: {
        display: 'flex',
        gap: SPACING.sm,
        marginTop: SPACING.sm,
    },
    addClassButton: {
        padding: '8px 16px',
        backgroundColor: COLORS.background.gray,
        color: COLORS.text.secondary,
        border: 'none',
        borderRadius: BORDER_RADIUS.md,
        cursor: 'pointer',
        fontSize: FONT_SIZES.sm,
    },
    selectedClasses: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: SPACING.sm,
        padding: SPACING.sm,
        backgroundColor: COLORS.background.white,
        borderRadius: BORDER_RADIUS.md,
    },
    selectedLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.text.tertiary,
        marginRight: SPACING.xs,
    },
    selectedChip: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        backgroundColor: COLORS.primaryLight + '30',
        color: COLORS.primary,
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.medium,
    },
    removeChip: {
        marginLeft: '4px',
        background: 'none',
        border: 'none',
        color: COLORS.primary,
        cursor: 'pointer',
        fontSize: '14px',
        padding: 0,
        lineHeight: 1,
    },
    targetSummary: {
        marginTop: SPACING.md,
        padding: SPACING.sm,
        backgroundColor: COLORS.background.white,
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.sm,
    },
    summaryGlobal: {
        color: COLORS.status.success,
    },
    summaryTargeted: {
        color: COLORS.text.primary,
    },
    summaryWarning: {
        color: COLORS.status.error,
    },
};

export default AiGalaManagePage;
