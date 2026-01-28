/**
 * ProjectCard Component
 * Displays a single AI Gala project in the gallery grid.
 */
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faComment, faEye, faTrophy, faMedal, faAward } from '@fortawesome/free-solid-svg-icons';
import { faHeart as faHeartOutline } from '@fortawesome/free-regular-svg-icons';
import {
    COLORS,
    BORDER_RADIUS,
    SHADOWS,
    SPACING,
    FONT_SIZES,
    FONT_WEIGHTS,
    TRANSITIONS,
} from '../../utils/designConstants';

const ProjectCard = ({
    project,
    onVote,
    onViewDetails,
    canVote = true,
    isVotingOpen = false,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const {
        id,
        title,
        image_url,
        student_name,
        student_class,
        student_photo,
        vote_count = 0,
        comment_count = 0,
        is_winner,
        winner_rank,
        has_voted,
    } = project;

    // Winner badge configuration
    const getWinnerBadge = () => {
        if (!is_winner) return null;
        const badges = {
            1: { icon: faTrophy, color: COLORS.studentDashboard.badgeGold, label: 'Champion' },
            2: { icon: faMedal, color: '#C0C0C0', label: 'Innovator' },
            3: { icon: faAward, color: '#CD7F32', label: 'Creator' },
        };
        return badges[winner_rank] || null;
    };

    const winnerBadge = getWinnerBadge();

    const handleVoteClick = (e) => {
        e.stopPropagation();
        if (canVote && isVotingOpen && onVote) {
            onVote(id, has_voted);
        }
    };

    return (
        <div
            style={{
                ...styles.card,
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: isHovered ? SHADOWS.lg : SHADOWS.md,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onViewDetails && onViewDetails(project)}
        >
            {/* Winner Badge */}
            {winnerBadge && (
                <div style={{ ...styles.winnerBadge, backgroundColor: winnerBadge.color }}>
                    <FontAwesomeIcon icon={winnerBadge.icon} style={{ marginRight: '4px' }} />
                    {winnerBadge.label}
                </div>
            )}

            {/* Image Container */}
            <div style={styles.imageContainer}>
                {!imageLoaded && <div style={styles.imagePlaceholder} />}
                <img
                    src={image_url}
                    alt={title}
                    style={{
                        ...styles.image,
                        opacity: imageLoaded ? 1 : 0,
                    }}
                    onLoad={() => setImageLoaded(true)}
                />

                {/* Hover Overlay */}
                <div
                    style={{
                        ...styles.imageOverlay,
                        opacity: isHovered ? 1 : 0,
                    }}
                >
                    <span style={styles.viewText}>View Details</span>
                </div>
            </div>

            {/* Content */}
            <div style={styles.content}>
                <h3 style={styles.title}>{title}</h3>

                {/* Student Info */}
                <div style={styles.studentInfo}>
                    <div style={styles.studentAvatar}>
                        {student_photo ? (
                            <img src={student_photo} alt={student_name} style={styles.avatarImage} />
                        ) : (
                            <div style={styles.avatarPlaceholder}>
                                {student_name?.charAt(0) || '?'}
                            </div>
                        )}
                    </div>
                    <div>
                        <div style={styles.studentName}>{student_name}</div>
                        <div style={styles.studentClass}>{student_class}</div>
                    </div>
                </div>

                {/* Stats Row */}
                <div style={styles.statsRow}>
                    {/* Vote Button/Count */}
                    <button
                        style={{
                            ...styles.voteButton,
                            backgroundColor: has_voted
                                ? COLORS.status.error
                                : isVotingOpen && canVote
                                ? COLORS.primary
                                : 'transparent',
                            color: has_voted || (isVotingOpen && canVote) ? '#fff' : COLORS.text.secondary,
                            cursor: isVotingOpen && canVote ? 'pointer' : 'default',
                        }}
                        onClick={handleVoteClick}
                        disabled={!isVotingOpen || !canVote}
                    >
                        <FontAwesomeIcon
                            icon={has_voted ? faHeart : faHeartOutline}
                            style={{ marginRight: '6px' }}
                        />
                        {vote_count}
                    </button>

                    {/* Comments Count */}
                    <div style={styles.statItem}>
                        <FontAwesomeIcon icon={faComment} style={{ color: COLORS.text.tertiary }} />
                        <span>{comment_count}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    card: {
        backgroundColor: COLORS.background.white,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal} ease`,
        position: 'relative',
    },
    winnerBadge: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
        padding: '4px 10px',
        borderRadius: BORDER_RADIUS.full,
        color: '#fff',
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.bold,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    },
    imageContainer: {
        position: 'relative',
        width: '100%',
        paddingTop: '100%', // 1:1 aspect ratio
        backgroundColor: COLORS.background.gray,
        overflow: 'hidden',
    },
    image: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transition: `opacity ${TRANSITIONS.normal} ease`,
    },
    imagePlaceholder: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.background.gray,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: `opacity ${TRANSITIONS.normal} ease`,
    },
    viewText: {
        color: '#fff',
        fontSize: FONT_SIZES.base,
        fontWeight: FONT_WEIGHTS.semibold,
        padding: '8px 16px',
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(4px)',
    },
    content: {
        padding: SPACING.lg,
    },
    title: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    studentInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    studentAvatar: {
        width: '36px',
        height: '36px',
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
        flexShrink: 0,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.primary,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.bold,
    },
    studentName: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        color: COLORS.text.primary,
    },
    studentClass: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.text.tertiary,
    },
    statsRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: SPACING.sm,
        borderTop: `1px solid ${COLORS.border.light}`,
    },
    voteButton: {
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        borderRadius: BORDER_RADIUS.full,
        border: `1px solid ${COLORS.border.light}`,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        transition: `all ${TRANSITIONS.fast} ease`,
    },
    statItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.secondary,
    },
};

export default ProjectCard;
