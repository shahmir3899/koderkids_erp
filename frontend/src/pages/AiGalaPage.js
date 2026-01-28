/**
 * AiGalaPage Component
 * Main page for AI Gala contests - displays creations grid, voting, and upload.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faStar,
    faPlus,
    faHeart,
    faClock,
    faSpinner,
    faChevronDown,
    faTrophy,
    faFilter,
    faSearch,
    faUserPlus,
    faFileDownload,
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
    LAYOUT,
} from '../utils/designConstants';
import { aiGalaService } from '../services/aiGalaService';
import ProjectCard from '../components/aigala/ProjectCard';
import ProjectDetailModal from '../components/aigala/ProjectDetailModal';
import ProjectUploadModal from '../components/aigala/ProjectUploadModal';
import AdminUploadModal from '../components/aigala/AdminUploadModal';

const AiGalaPage = () => {
    // State
    const [galleries, setGalleries] = useState([]);
    const [activeGallery, setActiveGallery] = useState(null);
    const [selectedGalleryId, setSelectedGalleryId] = useState(null);
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);

    // Modal states
    const [selectedProject, setSelectedProject] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showAdminUploadModal, setShowAdminUploadModal] = useState(false);

    // Get user role from localStorage
    const getUserRole = () => {
        // Role is stored directly as 'role' in localStorage during login
        return localStorage.getItem('role');
    };
    const userRole = getUserRole();
    const isAdminOrTeacher = userRole === 'Admin' || userRole === 'Teacher';

    // User state
    const [myProject, setMyProject] = useState(null);
    const [votesRemaining, setVotesRemaining] = useState(3);
    const [votedProjectIds, setVotedProjectIds] = useState([]);

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('votes'); // 'votes', 'recent', 'name'

    // Load galleries on mount
    useEffect(() => {
        loadGalleries();
    }, []);

    // Load active gallery details when selected
    useEffect(() => {
        if (selectedGalleryId) {
            loadGalleryDetails(selectedGalleryId);
        }
    }, [selectedGalleryId]);

    const loadGalleries = async () => {
        setIsLoading(true);
        try {
            const data = await aiGalaService.getGalleries();
            setGalleries(data || []);

            // Auto-select active or most recent gallery
            if (data && data.length > 0) {
                const active = data.find((g) => g.status === 'voting' || g.status === 'active');
                setSelectedGalleryId(active ? active.id : data[0].id);
            }
        } catch (error) {
            console.error('Error loading galleries:', error);
            toast.error('Failed to load contests');
        } finally {
            setIsLoading(false);
        }
    };

    const loadGalleryDetails = async (galleryId) => {
        setIsLoadingProjects(true);
        try {
            const data = await aiGalaService.getGalleryDetail(galleryId);
            setActiveGallery(data);
            setProjects(data.projects || []);
            setMyProject(data.my_project);
            setVotesRemaining(data.my_votes_remaining || 0);
            setVotedProjectIds(data.my_votes_cast || []);
        } catch (error) {
            console.error('Error loading gallery details:', error);
            toast.error('Failed to load contest');
        } finally {
            setIsLoadingProjects(false);
        }
    };

    const handleVote = async (projectId, hasVoted) => {
        try {
            if (hasVoted) {
                const response = await aiGalaService.removeVote(projectId);
                setVotesRemaining(response.votes_remaining);
                setVotedProjectIds((prev) => prev.filter((id) => id !== projectId));
                // Update project vote count in local state
                setProjects((prev) =>
                    prev.map((p) =>
                        p.id === projectId ? { ...p, vote_count: response.project_votes, has_voted: false } : p
                    )
                );
                toast.success('Vote removed');
            } else {
                if (votesRemaining <= 0) {
                    toast.error('No votes remaining');
                    return;
                }
                const response = await aiGalaService.voteForProject(projectId);
                setVotesRemaining(response.votes_remaining);
                setVotedProjectIds((prev) => [...prev, projectId]);
                // Update project vote count in local state
                setProjects((prev) =>
                    prev.map((p) =>
                        p.id === projectId ? { ...p, vote_count: response.project_votes, has_voted: true } : p
                    )
                );
                toast.success(`Vote cast! ${response.votes_remaining} votes remaining`);
            }
        } catch (error) {
            const message = error.response?.data?.error || 'Failed to vote';
            toast.error(message);
        }
    };

    const handleViewDetails = (project) => {
        setSelectedProject(project);
        setShowDetailModal(true);
    };

    const handleUploadSuccess = () => {
        // Reload gallery to show new project
        loadGalleryDetails(selectedGalleryId);
    };

    const handleVoteChange = () => {
        // Reload gallery to update vote counts
        loadGalleryDetails(selectedGalleryId);
    };

    // Download handlers for admin
    const handleDownloadReport = async () => {
        if (!activeGallery) return;
        try {
            toast.info('Generating report...');
            const blob = await aiGalaService.downloadParticipationReport(activeGallery.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AI_Gala_Report_${activeGallery.month_label?.replace(' ', '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Report downloaded!');
        } catch (error) {
            toast.error('Failed to download report');
        }
    };

    const handleDownloadAllCertificates = async () => {
        if (!activeGallery) return;
        try {
            toast.info('Generating certificates...');
            const blob = await aiGalaService.downloadAllCertificates(activeGallery.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AI_Gala_Certificates_${activeGallery.month_label?.replace(' ', '_')}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Certificates downloaded!');
        } catch (error) {
            toast.error('Failed to download certificates');
        }
    };

    // Filter and sort projects
    const filteredProjects = projects
        .filter((p) => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (
                p.title?.toLowerCase().includes(term) ||
                p.student_name?.toLowerCase().includes(term)
            );
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'votes':
                    return (b.vote_count || 0) - (a.vote_count || 0);
                case 'recent':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'name':
                    return (a.title || '').localeCompare(b.title || '');
                default:
                    return 0;
            }
        });

    const isVotingOpen = activeGallery?.is_voting_open;
    const canUpload = activeGallery?.status === 'active' && !myProject;

    if (isLoading) {
        return (
            <div style={styles.loadingContainer}>
                <FontAwesomeIcon icon={faSpinner} spin style={styles.loadingIcon} />
                <p>Loading AI Gala...</p>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            {/* Page Header */}
            <div style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.titleSection}>
                        <FontAwesomeIcon icon={faStar} style={styles.titleIcon} />
                        <div>
                            <h1 style={styles.pageTitle}>AI Gala</h1>
                            <p style={styles.pageSubtitle}>
                                Monthly creative AI contests
                            </p>
                        </div>
                    </div>

                    {/* Gallery Selector */}
                    {galleries.length > 0 && (
                        <div style={styles.gallerySelector}>
                            <select
                                value={selectedGalleryId || ''}
                                onChange={(e) => setSelectedGalleryId(Number(e.target.value))}
                                style={styles.gallerySelect}
                            >
                                {galleries.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {g.month_label}: {g.title}
                                        {g.status === 'voting' && ' (Voting Open)'}
                                        {g.status === 'active' && ' (Accepting Submissions)'}
                                    </option>
                                ))}
                            </select>
                            <FontAwesomeIcon icon={faChevronDown} style={styles.selectIcon} />
                        </div>
                    )}
                </div>
            </div>

            {/* Gallery Info Bar */}
            {activeGallery && (
                <div style={styles.infoBar}>
                    <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Theme:</span>
                        <span style={styles.infoValue}>{activeGallery.theme}</span>
                    </div>

                    <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Creations:</span>
                        <span style={styles.infoValue}>{activeGallery.total_projects}</span>
                    </div>

                    {isVotingOpen && (
                        <>
                            <div style={styles.infoItem}>
                                <FontAwesomeIcon icon={faHeart} style={{ color: COLORS.status.error, marginRight: '6px' }} />
                                <span style={styles.infoValue}>{votesRemaining} votes left</span>
                            </div>
                            <div style={styles.infoItem}>
                                <FontAwesomeIcon icon={faClock} style={{ marginRight: '6px' }} />
                                <span style={styles.infoValue}>
                                    {activeGallery.days_until_voting_ends} days left
                                </span>
                            </div>
                        </>
                    )}

                    {activeGallery.status === 'closed' && (
                        <div style={styles.statusBadge}>
                            <FontAwesomeIcon icon={faTrophy} style={{ marginRight: '6px' }} />
                            Results Announced
                        </div>
                    )}

                    {canUpload && (
                        <button
                            style={styles.uploadButton}
                            onClick={() => setShowUploadModal(true)}
                        >
                            <FontAwesomeIcon icon={faPlus} />
                            <span>Upload Creation</span>
                        </button>
                    )}

                    {/* Admin/Teacher: Upload for Student */}
                    {isAdminOrTeacher && activeGallery?.status === 'active' && (
                        <button
                            style={styles.adminUploadButton}
                            onClick={() => setShowAdminUploadModal(true)}
                        >
                            <FontAwesomeIcon icon={faUserPlus} />
                            <span>Upload for Student</span>
                        </button>
                    )}

                    {/* Admin: Download Report */}
                    {userRole === 'Admin' && (
                        <button
                            style={styles.downloadButton}
                            onClick={handleDownloadReport}
                        >
                            <FontAwesomeIcon icon={faFileDownload} />
                            <span>Download Report</span>
                        </button>
                    )}

                    {/* Admin: Download All Certificates (when closed) */}
                    {userRole === 'Admin' && activeGallery?.status === 'closed' && (
                        <button
                            style={styles.downloadButton}
                            onClick={handleDownloadAllCertificates}
                        >
                            <FontAwesomeIcon icon={faFileDownload} />
                            <span>All Certificates</span>
                        </button>
                    )}
                </div>
            )}

            {/* My Project Card */}
            {myProject && (
                <div style={styles.myProjectSection}>
                    <h3 style={styles.sectionTitle}>Your Creation</h3>
                    <div style={styles.myProjectCard}>
                        <img
                            src={myProject.image_url}
                            alt={myProject.title}
                            style={styles.myProjectImage}
                        />
                        <div style={styles.myProjectInfo}>
                            <h4 style={styles.myProjectTitle}>{myProject.title}</h4>
                            <div style={styles.myProjectStats}>
                                <span>
                                    <FontAwesomeIcon icon={faHeart} style={{ marginRight: '4px' }} />
                                    {myProject.vote_count} votes
                                </span>
                                {myProject.is_winner && (
                                    <span style={styles.winnerTag}>
                                        <FontAwesomeIcon icon={faTrophy} style={{ marginRight: '4px' }} />
                                        #{myProject.winner_rank}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters & Search */}
            <div style={styles.filtersBar}>
                <div style={styles.searchBox}>
                    <FontAwesomeIcon icon={faSearch} style={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search creations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>

                <div style={styles.sortSelect}>
                    <FontAwesomeIcon icon={faFilter} style={styles.filterIcon} />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={styles.sortDropdown}
                    >
                        <option value="votes">Most Votes</option>
                        <option value="recent">Most Recent</option>
                        <option value="name">Name (A-Z)</option>
                    </select>
                </div>
            </div>

            {/* Winners Section (if closed) */}
            {activeGallery?.status === 'closed' && activeGallery.winners?.length > 0 && (
                <div style={styles.winnersSection}>
                    <h3 style={styles.sectionTitle}>
                        <FontAwesomeIcon icon={faTrophy} style={{ marginRight: '8px', color: COLORS.studentDashboard.badgeGold }} />
                        Winners
                    </h3>
                    <div style={styles.winnersGrid}>
                        {activeGallery.winners.map((winner) => (
                            <ProjectCard
                                key={winner.id}
                                project={winner}
                                onViewDetails={handleViewDetails}
                                canVote={false}
                                isVotingOpen={false}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Projects Grid */}
            <div style={styles.projectsSection}>
                <h3 style={styles.sectionTitle}>
                    All Creations ({filteredProjects.length})
                </h3>

                {isLoadingProjects ? (
                    <div style={styles.loadingProjects}>
                        <FontAwesomeIcon icon={faSpinner} spin />
                        <span>Loading creations...</span>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div style={styles.emptyState}>
                        <FontAwesomeIcon icon={faStar} style={styles.emptyIcon} />
                        <p>No creations yet. Be the first to upload!</p>
                    </div>
                ) : (
                    <div style={styles.projectsGrid}>
                        {filteredProjects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={{
                                    ...project,
                                    has_voted: votedProjectIds.includes(project.id),
                                }}
                                onVote={handleVote}
                                onViewDetails={handleViewDetails}
                                canVote={votesRemaining > 0 && !myProject?.id === project.id}
                                isVotingOpen={isVotingOpen}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <ProjectDetailModal
                isOpen={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedProject(null);
                }}
                project={selectedProject}
                onVoteChange={handleVoteChange}
                isVotingOpen={isVotingOpen}
                canVote={votesRemaining > 0}
                allowComments={activeGallery?.allow_comments}
                allowDownload={activeGallery?.allow_downloads}
                isGalleryClosed={activeGallery?.status === 'closed'}
            />

            <ProjectUploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                gallery={activeGallery}
                onUploadSuccess={handleUploadSuccess}
            />

            <AdminUploadModal
                isOpen={showAdminUploadModal}
                onClose={() => setShowAdminUploadModal(false)}
                gallery={activeGallery}
                onUploadSuccess={handleUploadSuccess}
                userRole={userRole}
            />
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
    gallerySelector: {
        position: 'relative',
    },
    gallerySelect: {
        appearance: 'none',
        padding: '10px 40px 10px 16px',
        borderRadius: BORDER_RADIUS.lg,
        border: `1px solid ${COLORS.border.default}`,
        backgroundColor: COLORS.background.white,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        color: COLORS.text.primary,
        cursor: 'pointer',
        minWidth: '250px',
    },
    selectIcon: {
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: COLORS.text.tertiary,
        pointerEvents: 'none',
    },
    infoBar: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: SPACING.lg,
        backgroundColor: COLORS.background.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        boxShadow: SHADOWS.sm,
    },
    infoItem: {
        display: 'flex',
        alignItems: 'center',
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.secondary,
    },
    infoLabel: {
        fontWeight: FONT_WEIGHTS.medium,
        marginRight: SPACING.xs,
    },
    infoValue: {
        color: COLORS.text.primary,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    statusBadge: {
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        backgroundColor: COLORS.status.successLight,
        color: COLORS.status.success,
        borderRadius: BORDER_RADIUS.full,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    uploadButton: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        padding: '10px 20px',
        backgroundColor: COLORS.primary,
        color: '#fff',
        border: 'none',
        borderRadius: BORDER_RADIUS.lg,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        cursor: 'pointer',
        marginLeft: 'auto',
        transition: `all ${TRANSITIONS.fast} ease`,
    },
    adminUploadButton: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        padding: '10px 20px',
        backgroundColor: COLORS.status.info,
        color: '#fff',
        border: 'none',
        borderRadius: BORDER_RADIUS.lg,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.fast} ease`,
    },
    downloadButton: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        padding: '10px 20px',
        backgroundColor: COLORS.status.success,
        color: '#fff',
        border: 'none',
        borderRadius: BORDER_RADIUS.lg,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.fast} ease`,
    },
    myProjectSection: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.md,
        display: 'flex',
        alignItems: 'center',
    },
    myProjectCard: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.lg,
        backgroundColor: COLORS.background.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        boxShadow: SHADOWS.md,
        border: `2px solid ${COLORS.primary}`,
    },
    myProjectImage: {
        width: '80px',
        height: '80px',
        borderRadius: BORDER_RADIUS.lg,
        objectFit: 'cover',
    },
    myProjectInfo: {
        flex: 1,
    },
    myProjectTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    myProjectStats: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.lg,
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.secondary,
    },
    winnerTag: {
        color: COLORS.studentDashboard.badgeGold,
        fontWeight: FONT_WEIGHTS.bold,
    },
    filtersBar: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
        flexWrap: 'wrap',
    },
    searchBox: {
        flex: 1,
        minWidth: '200px',
        position: 'relative',
    },
    searchIcon: {
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: COLORS.text.tertiary,
    },
    searchInput: {
        width: '100%',
        padding: '10px 16px 10px 40px',
        borderRadius: BORDER_RADIUS.lg,
        border: `1px solid ${COLORS.border.default}`,
        fontSize: FONT_SIZES.sm,
        outline: 'none',
    },
    sortSelect: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    filterIcon: {
        color: COLORS.text.tertiary,
    },
    sortDropdown: {
        padding: '10px 16px',
        borderRadius: BORDER_RADIUS.lg,
        border: `1px solid ${COLORS.border.default}`,
        backgroundColor: COLORS.background.white,
        fontSize: FONT_SIZES.sm,
        cursor: 'pointer',
    },
    winnersSection: {
        marginBottom: SPACING.xl,
    },
    winnersGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: SPACING.lg,
    },
    projectsSection: {
        marginTop: SPACING.lg,
    },
    loadingCreations: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.md,
        padding: SPACING['2xl'],
        color: COLORS.text.tertiary,
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
    projectsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: SPACING.lg,
    },
};

export default AiGalaPage;
