/**
 * AiGalaWidget Component
 * Dashboard widget showing current AI Gala status for Student Dashboard.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faStar,
    faHeart,
    faTrophy,
    faArrowRight,
    faSpinner,
    faClock,
} from '@fortawesome/free-solid-svg-icons';
import {
    COLORS,
    BORDER_RADIUS,
    SHADOWS,
    SPACING,
    FONT_SIZES,
    FONT_WEIGHTS,
    TRANSITIONS,
} from '../../utils/designConstants';
import { aiGalaService } from '../../services/aiGalaService';

const AiGalaWidget = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadGalaData();
    }, []);

    const loadGalaData = async () => {
        try {
            const response = await aiGalaService.getMyGalaData();
            setData(response);
        } catch (error) {
            console.error('Error loading gala data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div style={styles.widget}>
                <div style={styles.loadingState}>
                    <FontAwesomeIcon icon={faSpinner} spin />
                </div>
            </div>
        );
    }

    // No active gallery
    if (!data?.current_gallery) {
        return (
            <div style={styles.widget} onClick={() => navigate('/ai-gala')}>
                <div style={styles.header}>
                    <FontAwesomeIcon icon={faStar} style={styles.starIcon} />
                    <span style={styles.title}>AI Gala</span>
                </div>
                <div style={styles.emptyState}>
                    <p>No active gallery right now</p>
                    <span style={styles.viewAll}>View past galleries</span>
                </div>
            </div>
        );
    }

    const { current_gallery, my_current_project, votes_remaining, stats } = data;
    const isVotingOpen = current_gallery.is_voting_open;

    return (
        <div style={styles.widget}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <FontAwesomeIcon icon={faStar} style={styles.starIcon} />
                    <span style={styles.title}>AI Gala</span>
                </div>
                {isVotingOpen && (
                    <div style={styles.votingBadge}>
                        <FontAwesomeIcon icon={faClock} style={{ marginRight: '4px' }} />
                        {current_gallery.days_until_voting_ends}d left
                    </div>
                )}
            </div>

            {/* Gallery Info */}
            <div style={styles.galleryInfo}>
                <h4 style={styles.galleryTitle}>{current_gallery.title}</h4>
                <p style={styles.galleryTheme}>{current_gallery.theme}</p>
            </div>

            {/* My Project or Upload CTA */}
            {my_current_project ? (
                <div style={styles.myProject}>
                    <img
                        src={my_current_project.image_url}
                        alt={my_current_project.title}
                        style={styles.projectThumb}
                    />
                    <div style={styles.projectInfo}>
                        <span style={styles.projectTitle}>{my_current_project.title}</span>
                        <div style={styles.projectStats}>
                            <FontAwesomeIcon icon={faHeart} style={{ color: COLORS.status.error }} />
                            <span>{my_current_project.vote_count} votes</span>
                            {my_current_project.is_winner && (
                                <span style={styles.winnerTag}>
                                    <FontAwesomeIcon icon={faTrophy} /> #{my_current_project.winner_rank}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ) : current_gallery.status === 'active' ? (
                <div style={styles.uploadCta} onClick={() => navigate('/ai-gala')}>
                    <span>Upload your creation!</span>
                    <FontAwesomeIcon icon={faArrowRight} />
                </div>
            ) : null}

            {/* Voting Status */}
            {isVotingOpen && (
                <div style={styles.votingStatus}>
                    <div style={styles.votesLeft}>
                        <FontAwesomeIcon icon={faHeart} style={{ color: COLORS.status.error }} />
                        <span>{votes_remaining} votes left</span>
                    </div>
                    <button style={styles.voteButton} onClick={() => navigate('/ai-gala')}>
                        Vote Now
                    </button>
                </div>
            )}

            {/* Stats */}
            {stats && stats.total_projects > 0 && (
                <div style={styles.stats}>
                    <div style={styles.statItem}>
                        <span style={styles.statValue}>{stats.total_projects}</span>
                        <span style={styles.statLabel}>Projects</span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statValue}>{stats.total_votes_received}</span>
                        <span style={styles.statLabel}>Votes</span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statValue}>{stats.total_wins}</span>
                        <span style={styles.statLabel}>Wins</span>
                    </div>
                </div>
            )}

            {/* View All Link */}
            <div style={styles.viewAllLink} onClick={() => navigate('/ai-gala')}>
                <span>View Gallery</span>
                <FontAwesomeIcon icon={faArrowRight} />
            </div>
        </div>
    );
};

const styles = {
    widget: {
        backgroundColor: COLORS.studentDashboard.cardWhite,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        boxShadow: SHADOWS.md,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal} ease`,
    },
    loadingState: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
        color: COLORS.text.tertiary,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    starIcon: {
        fontSize: FONT_SIZES.xl,
        color: COLORS.studentDashboard.badgeGold,
    },
    title: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.studentDashboard.textPrimary,
    },
    votingBadge: {
        display: 'flex',
        alignItems: 'center',
        padding: '4px 10px',
        backgroundColor: COLORS.status.warningLight,
        color: COLORS.status.warningDark,
        borderRadius: BORDER_RADIUS.full,
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    galleryInfo: {
        marginBottom: SPACING.md,
    },
    galleryTitle: {
        fontSize: FONT_SIZES.base,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.studentDashboard.textPrimary,
        margin: 0,
    },
    galleryTheme: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.studentDashboard.textMuted,
        margin: 0,
        marginTop: '2px',
    },
    myProject: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
        padding: SPACING.sm,
        backgroundColor: COLORS.background.gray,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.md,
    },
    projectThumb: {
        width: '50px',
        height: '50px',
        borderRadius: BORDER_RADIUS.md,
        objectFit: 'cover',
    },
    projectInfo: {
        flex: 1,
    },
    projectTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        color: COLORS.studentDashboard.textPrimary,
        display: 'block',
    },
    projectStats: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.xs,
        fontSize: FONT_SIZES.xs,
        color: COLORS.studentDashboard.textMuted,
        marginTop: '2px',
    },
    winnerTag: {
        color: COLORS.studentDashboard.badgeGold,
        fontWeight: FONT_WEIGHTS.bold,
        marginLeft: SPACING.sm,
    },
    uploadCta: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        backgroundColor: COLORS.primary,
        color: '#fff',
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.md,
        fontWeight: FONT_WEIGHTS.medium,
    },
    votingStatus: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.sm,
        backgroundColor: COLORS.status.errorLight,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.md,
    },
    votesLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.xs,
        fontSize: FONT_SIZES.sm,
        color: COLORS.status.errorDark,
        fontWeight: FONT_WEIGHTS.medium,
    },
    voteButton: {
        padding: '6px 12px',
        backgroundColor: COLORS.status.error,
        color: '#fff',
        border: 'none',
        borderRadius: BORDER_RADIUS.full,
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.semibold,
        cursor: 'pointer',
    },
    stats: {
        display: 'flex',
        justifyContent: 'space-around',
        padding: SPACING.sm,
        backgroundColor: COLORS.background.gray,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.md,
    },
    statItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    statValue: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.primary,
    },
    statLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.studentDashboard.textMuted,
    },
    emptyState: {
        textAlign: 'center',
        color: COLORS.studentDashboard.textMuted,
        fontSize: FONT_SIZES.sm,
        padding: SPACING.md,
    },
    viewAll: {
        color: COLORS.primary,
        fontWeight: FONT_WEIGHTS.medium,
        display: 'block',
        marginTop: SPACING.sm,
    },
    viewAllLink: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        color: COLORS.primary,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        paddingTop: SPACING.sm,
        borderTop: `1px solid ${COLORS.border.light}`,
    },
};

export default AiGalaWidget;
