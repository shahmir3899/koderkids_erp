/**
 * ProjectDetailModal Component
 * Full-screen modal for viewing project details, voting, and commenting.
 */
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faHeart,
    faComment,
    faEye,
    faTrophy,
    faMedal,
    faAward,
    faPaperPlane,
    faDownload,
    faSpinner,
    faCertificate,
} from '@fortawesome/free-solid-svg-icons';
import { faHeart as faHeartOutline } from '@fortawesome/free-regular-svg-icons';
import { toast } from 'react-toastify';
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

const ProjectDetailModal = ({
    isOpen,
    onClose,
    project,
    onVoteChange,
    isVotingOpen = false,
    canVote = true,
    allowComments = true,
    allowDownload = true,
    isGalleryClosed = false,
}) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isVoting, setIsVoting] = useState(false);
    const [localVoteCount, setLocalVoteCount] = useState(project?.vote_count || 0);
    const [localHasVoted, setLocalHasVoted] = useState(project?.has_voted || false);

    useEffect(() => {
        if (isOpen && project) {
            setLocalVoteCount(project.vote_count || 0);
            setLocalHasVoted(project.has_voted || false);
            loadComments();
        }
    }, [isOpen, project]);

    useEffect(() => {
        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);

    const loadComments = async () => {
        if (!project?.id) return;
        setIsLoadingComments(true);
        try {
            const data = await aiGalaService.getComments(project.id);
            setComments(data || []);
        } catch (error) {
            console.error('Error loading comments:', error);
        } finally {
            setIsLoadingComments(false);
        }
    };

    const handleVote = async () => {
        if (!canVote || !isVotingOpen || isVoting) return;

        setIsVoting(true);
        try {
            if (localHasVoted) {
                await aiGalaService.removeVote(project.id);
                setLocalVoteCount((prev) => prev - 1);
                setLocalHasVoted(false);
                toast.success('Vote removed');
            } else {
                const response = await aiGalaService.voteForProject(project.id);
                setLocalVoteCount((prev) => prev + 1);
                setLocalHasVoted(true);
                toast.success(`Vote cast! ${response.votes_remaining} votes remaining`);
            }
            onVoteChange && onVoteChange();
        } catch (error) {
            const message = error.response?.data?.error || 'Failed to vote';
            toast.error(message);
        } finally {
            setIsVoting(false);
        }
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmittingComment) return;

        setIsSubmittingComment(true);
        try {
            const comment = await aiGalaService.addComment(project.id, newComment.trim());
            setComments((prev) => [comment, ...prev]);
            setNewComment('');
            toast.success('Comment added!');
        } catch (error) {
            const message = error.response?.data?.error || 'Failed to add comment';
            toast.error(message);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleDownload = () => {
        if (project?.image_url) {
            const link = document.createElement('a');
            link.href = project.image_url;
            link.download = `${project.title || 'project'}.jpg`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDownloadCertificate = async () => {
        if (!project?.id) return;
        try {
            toast.info('Generating certificate...');
            const blob = await aiGalaService.downloadCertificate(project.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Certificate_${project.student?.name?.replace(' ', '_') || 'student'}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Certificate downloaded!');
        } catch (error) {
            const message = error.response?.data?.error || 'Failed to download certificate';
            toast.error(message);
        }
    };

    const getWinnerBadge = () => {
        if (!project?.is_winner) return null;
        const badges = {
            1: { icon: faTrophy, color: '#FFD700', label: 'AI Gala Champion' },
            2: { icon: faMedal, color: '#C0C0C0', label: 'AI Innovator' },
            3: { icon: faAward, color: '#CD7F32', label: 'AI Creator' },
        };
        return badges[project.winner_rank] || null;
    };

    if (!isOpen || !project) return null;

    const winnerBadge = getWinnerBadge();

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Close Button */}
                <button style={styles.closeButton} onClick={onClose}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>

                <div style={styles.content}>
                    {/* Left: Image */}
                    <div style={styles.imageSection}>
                        <img src={project.image_url} alt={project.title} style={styles.image} />

                        {/* Winner Badge Overlay */}
                        {winnerBadge && (
                            <div style={{ ...styles.winnerBadge, backgroundColor: winnerBadge.color }}>
                                <FontAwesomeIcon icon={winnerBadge.icon} style={{ marginRight: '8px' }} />
                                {winnerBadge.label}
                            </div>
                        )}
                    </div>

                    {/* Right: Details */}
                    <div style={styles.detailsSection}>
                        {/* Title & Student */}
                        <div style={styles.header}>
                            <h2 style={styles.title}>{project.title}</h2>
                            <div style={styles.studentInfo}>
                                <div style={styles.avatar}>
                                    {project.student?.profile_photo_url ? (
                                        <img
                                            src={project.student.profile_photo_url}
                                            alt={project.student?.name}
                                            style={styles.avatarImg}
                                        />
                                    ) : (
                                        <div style={styles.avatarPlaceholder}>
                                            {project.student?.name?.charAt(0) || '?'}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div style={styles.studentName}>{project.student?.name}</div>
                                    <div style={styles.studentClass}>{project.student?.student_class}</div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {project.description && (
                            <div style={styles.description}>
                                <h4 style={styles.sectionTitle}>Story</h4>
                                <p style={styles.descriptionText}>{project.description}</p>
                            </div>
                        )}

                        {/* Metadata (Powers, etc.) */}
                        {project.metadata && Object.keys(project.metadata).length > 0 && (
                            <div style={styles.metadata}>
                                {project.metadata.powers && (
                                    <div style={styles.metaItem}>
                                        <span style={styles.metaLabel}>Powers:</span>
                                        <div style={styles.tags}>
                                            {project.metadata.powers.map((power, i) => (
                                                <span key={i} style={styles.tag}>
                                                    {power}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Stats & Actions */}
                        <div style={styles.statsActions}>
                            <div style={styles.stats}>
                                <div style={styles.statItem}>
                                    <FontAwesomeIcon icon={faHeart} style={{ color: COLORS.status.error }} />
                                    <span>{localVoteCount} votes</span>
                                </div>
                                <div style={styles.statItem}>
                                    <FontAwesomeIcon icon={faComment} />
                                    <span>{comments.length} comments</span>
                                </div>
                                <div style={styles.statItem}>
                                    <FontAwesomeIcon icon={faEye} />
                                    <span>{project.view_count || 0} views</span>
                                </div>
                            </div>

                            <div style={styles.actions}>
                                {isVotingOpen && canVote && !project.is_own_project && (
                                    <button
                                        style={{
                                            ...styles.voteButton,
                                            backgroundColor: localHasVoted
                                                ? COLORS.status.error
                                                : COLORS.studentDashboard.cardPurple,
                                        }}
                                        onClick={handleVote}
                                        disabled={isVoting}
                                    >
                                        {isVoting ? (
                                            <FontAwesomeIcon icon={faSpinner} spin />
                                        ) : (
                                            <>
                                                <FontAwesomeIcon
                                                    icon={localHasVoted ? faHeart : faHeartOutline}
                                                />
                                                <span>{localHasVoted ? 'Voted' : 'Vote'}</span>
                                            </>
                                        )}
                                    </button>
                                )}

                                {allowDownload && (
                                    <button style={styles.downloadButton} onClick={handleDownload}>
                                        <FontAwesomeIcon icon={faDownload} />
                                        <span>Download</span>
                                    </button>
                                )}

                                {isGalleryClosed && (
                                    <button style={styles.certificateButton} onClick={handleDownloadCertificate}>
                                        <FontAwesomeIcon icon={faCertificate} />
                                        <span>Certificate</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Comments Section */}
                        {allowComments && (
                            <div style={styles.commentsSection}>
                                <h4 style={styles.sectionTitle}>Comments</h4>

                                {/* Add Comment */}
                                <form onSubmit={handleSubmitComment} style={styles.commentForm}>
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Add a comment..."
                                        style={styles.commentInput}
                                        maxLength={500}
                                    />
                                    <button
                                        type="submit"
                                        style={styles.commentSubmit}
                                        disabled={!newComment.trim() || isSubmittingComment}
                                    >
                                        {isSubmittingComment ? (
                                            <FontAwesomeIcon icon={faSpinner} spin />
                                        ) : (
                                            <FontAwesomeIcon icon={faPaperPlane} />
                                        )}
                                    </button>
                                </form>

                                {/* Comments List */}
                                <div style={styles.commentsList}>
                                    {isLoadingComments ? (
                                        <div style={styles.loadingComments}>
                                            <FontAwesomeIcon icon={faSpinner} spin /> Loading...
                                        </div>
                                    ) : comments.length === 0 ? (
                                        <div style={styles.noComments}>No comments yet. Be the first!</div>
                                    ) : (
                                        comments.map((comment) => (
                                            <div key={comment.id} style={styles.comment}>
                                                <div style={styles.commentHeader}>
                                                    <span style={styles.commenterName}>
                                                        {comment.commenter_name}
                                                    </span>
                                                    <span style={styles.commentTime}>
                                                        {new Date(comment.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p style={styles.commentContent}>{comment.content}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
        maxWidth: '1000px',
        maxHeight: '90vh',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: SHADOWS.xl,
    },
    closeButton: {
        position: 'absolute',
        top: SPACING.lg,
        right: SPACING.lg,
        width: '40px',
        height: '40px',
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: FONT_SIZES.lg,
        zIndex: 10,
        transition: `background-color ${TRANSITIONS.fast} ease`,
    },
    content: {
        display: 'flex',
        height: '100%',
        maxHeight: '90vh',
    },
    imageSection: {
        flex: '1 1 50%',
        position: 'relative',
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        maxHeight: '90vh',
    },
    winnerBadge: {
        position: 'absolute',
        top: SPACING.lg,
        left: SPACING.lg,
        padding: '8px 16px',
        borderRadius: BORDER_RADIUS.full,
        color: '#fff',
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.bold,
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    },
    detailsSection: {
        flex: '1 1 50%',
        padding: SPACING.xl,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.lg,
    },
    header: {
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: FONT_SIZES['2xl'],
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.md,
    },
    studentInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
    },
    avatar: {
        width: '48px',
        height: '48px',
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.studentDashboard.cardPurple,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
    },
    studentName: {
        fontSize: FONT_SIZES.base,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.primary,
    },
    studentClass: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.tertiary,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: SPACING.sm,
    },
    description: {
        marginBottom: SPACING.md,
    },
    descriptionText: {
        fontSize: FONT_SIZES.base,
        color: COLORS.text.secondary,
        lineHeight: 1.6,
    },
    metadata: {
        marginBottom: SPACING.md,
    },
    metaItem: {
        marginBottom: SPACING.sm,
    },
    metaLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.tertiary,
        marginRight: SPACING.sm,
    },
    tags: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: SPACING.xs,
        marginTop: SPACING.xs,
    },
    tag: {
        backgroundColor: COLORS.studentDashboard.cardPurple,
        color: '#fff',
        padding: '4px 12px',
        borderRadius: BORDER_RADIUS.full,
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.medium,
    },
    statsActions: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.background.gray,
        borderRadius: BORDER_RADIUS.lg,
    },
    stats: {
        display: 'flex',
        gap: SPACING.lg,
    },
    statItem: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.xs,
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.secondary,
    },
    actions: {
        display: 'flex',
        gap: SPACING.sm,
    },
    voteButton: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.xs,
        padding: '10px 20px',
        borderRadius: BORDER_RADIUS.full,
        border: 'none',
        color: '#fff',
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.fast} ease`,
    },
    downloadButton: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.xs,
        padding: '10px 20px',
        borderRadius: BORDER_RADIUS.full,
        border: `1px solid ${COLORS.border.default}`,
        backgroundColor: 'transparent',
        color: COLORS.text.secondary,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.fast} ease`,
    },
    certificateButton: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.xs,
        padding: '10px 20px',
        borderRadius: BORDER_RADIUS.full,
        border: 'none',
        backgroundColor: COLORS.status.success,
        color: '#fff',
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.fast} ease`,
    },
    commentsSection: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
    },
    commentForm: {
        display: 'flex',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    commentInput: {
        flex: 1,
        padding: '10px 16px',
        borderRadius: BORDER_RADIUS.full,
        border: `1px solid ${COLORS.border.default}`,
        fontSize: FONT_SIZES.sm,
        outline: 'none',
    },
    commentSubmit: {
        width: '40px',
        height: '40px',
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.studentDashboard.cardPurple,
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    commentsList: {
        flex: 1,
        overflowY: 'auto',
    },
    loadingComments: {
        textAlign: 'center',
        color: COLORS.text.tertiary,
        padding: SPACING.lg,
    },
    noComments: {
        textAlign: 'center',
        color: COLORS.text.tertiary,
        padding: SPACING.lg,
        fontStyle: 'italic',
    },
    comment: {
        padding: SPACING.md,
        backgroundColor: COLORS.background.gray,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.sm,
    },
    commentHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    commenterName: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.primary,
    },
    commentTime: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.text.tertiary,
    },
    commentContent: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.secondary,
        margin: 0,
    },
};

export default ProjectDetailModal;
