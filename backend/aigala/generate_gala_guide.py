"""
AI Gala — Complete Guide PDF Generator
Standalone script to generate a beautifully formatted PDF guide
for the AI Gala module of Koder Kids.

Usage:
    python generate_gala_guide.py
"""

import os
from weasyprint import HTML
from datetime import datetime


def build_css():
    return """
    @page {
        size: A4 portrait;
        margin: 0;
    }

    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        color: #1a1a2e;
        line-height: 1.6;
        font-size: 13px;
    }

    .page {
        width: 210mm;
        min-height: 297mm;
        padding: 30mm 25mm;
        page-break-after: always;
        position: relative;
        overflow: hidden;
    }

    .page:last-child {
        page-break-after: avoid;
    }

    /* ===== COVER PAGE ===== */
    .cover {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 40mm 30mm;
        position: relative;
    }

    .cover::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background:
            radial-gradient(circle at 20% 30%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(236, 72, 153, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 70%);
    }

    .cover * {
        position: relative;
        z-index: 1;
    }

    .cover-badge {
        background: linear-gradient(135deg, #8B5CF6, #7C3AED);
        color: white;
        padding: 8px 28px;
        border-radius: 30px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 3px;
        text-transform: uppercase;
        margin-bottom: 25px;
    }

    .cover-icon {
        font-size: 72px;
        margin-bottom: 20px;
    }

    .cover h1 {
        font-size: 48px;
        font-weight: 800;
        color: white;
        margin-bottom: 10px;
        letter-spacing: -1px;
    }

    .cover h1 span {
        background: linear-gradient(135deg, #8B5CF6, #EC4899);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .cover .subtitle {
        font-size: 20px;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 40px;
        font-weight: 300;
    }

    .cover-features {
        display: flex;
        gap: 20px;
        margin-top: 10px;
    }

    .cover-feature {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        padding: 18px 22px;
        text-align: center;
        width: 140px;
    }

    .cover-feature .cf-icon {
        font-size: 28px;
        margin-bottom: 6px;
    }

    .cover-feature .cf-label {
        color: rgba(255, 255, 255, 0.8);
        font-size: 11px;
        font-weight: 500;
    }

    .cover-footer {
        position: absolute;
        bottom: 25mm;
        left: 0;
        right: 0;
        text-align: center;
        color: rgba(255, 255, 255, 0.4);
        font-size: 11px;
    }

    .cover-footer .brand {
        font-weight: 700;
        color: rgba(255, 255, 255, 0.6);
        font-size: 13px;
    }

    /* ===== CONTENT PAGES ===== */
    .section-header {
        margin-bottom: 25px;
        padding-bottom: 15px;
        border-bottom: 3px solid #8B5CF6;
    }

    .section-number {
        display: inline-block;
        background: linear-gradient(135deg, #8B5CF6, #7C3AED);
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        text-align: center;
        line-height: 32px;
        font-size: 14px;
        font-weight: 700;
        margin-right: 10px;
        vertical-align: middle;
    }

    .section-title {
        font-size: 28px;
        font-weight: 800;
        color: #1a1a2e;
        display: inline;
        vertical-align: middle;
    }

    .section-subtitle {
        font-size: 14px;
        color: #6b7280;
        margin-top: 6px;
        margin-left: 42px;
    }

    /* Intro text */
    .intro-text {
        font-size: 14px;
        color: #374151;
        line-height: 1.8;
        margin-bottom: 20px;
        padding: 15px 20px;
        background: #f8f7ff;
        border-left: 4px solid #8B5CF6;
        border-radius: 0 12px 12px 0;
    }

    /* Steps */
    .steps {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .step {
        display: flex;
        gap: 15px;
        align-items: flex-start;
        padding: 14px 18px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        transition: all 0.2s;
    }

    .step:hover {
        border-color: #8B5CF6;
    }

    .step-num {
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, #8B5CF6, #7C3AED);
        color: white;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 15px;
    }

    .step-content h4 {
        font-size: 14px;
        font-weight: 700;
        color: #1a1a2e;
        margin-bottom: 3px;
    }

    .step-content p {
        font-size: 12px;
        color: #6b7280;
        line-height: 1.5;
    }

    /* Info box */
    .info-box {
        background: linear-gradient(135deg, #ede9fe, #f3e8ff);
        border: 1px solid #c4b5fd;
        border-radius: 14px;
        padding: 16px 20px;
        margin: 18px 0;
    }

    .info-box .ib-title {
        font-weight: 700;
        color: #6d28d9;
        font-size: 13px;
        margin-bottom: 6px;
    }

    .info-box p {
        font-size: 12px;
        color: #4c1d95;
        line-height: 1.6;
    }

    /* Tip box */
    .tip-box {
        background: linear-gradient(135deg, #ecfdf5, #d1fae5);
        border: 1px solid #6ee7b7;
        border-radius: 14px;
        padding: 16px 20px;
        margin: 18px 0;
    }

    .tip-box .tb-title {
        font-weight: 700;
        color: #065f46;
        font-size: 13px;
        margin-bottom: 6px;
    }

    .tip-box p, .tip-box li {
        font-size: 12px;
        color: #064e3b;
        line-height: 1.6;
    }

    .tip-box ul {
        margin-left: 18px;
        margin-top: 6px;
    }

    /* Warning box */
    .warning-box {
        background: linear-gradient(135deg, #fffbeb, #fef3c7);
        border: 1px solid #fbbf24;
        border-radius: 14px;
        padding: 16px 20px;
        margin: 18px 0;
    }

    .warning-box .wb-title {
        font-weight: 700;
        color: #92400e;
        font-size: 13px;
        margin-bottom: 6px;
    }

    .warning-box p {
        font-size: 12px;
        color: #78350f;
        line-height: 1.6;
    }

    /* Award cards */
    .awards-grid {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin: 15px 0;
    }

    .award-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 18px 22px;
        border-radius: 14px;
        border: 2px solid;
    }

    .award-gold {
        background: linear-gradient(135deg, #fffbeb, #fef3c7);
        border-color: #f59e0b;
    }

    .award-silver {
        background: linear-gradient(135deg, #f9fafb, #f3f4f6);
        border-color: #9ca3af;
    }

    .award-bronze {
        background: linear-gradient(135deg, #fef7ed, #fed7aa);
        border-color: #d97706;
    }

    .award-participate {
        background: linear-gradient(135deg, #f5f3ff, #ede9fe);
        border-color: #8B5CF6;
    }

    .award-icon {
        font-size: 40px;
        flex-shrink: 0;
    }

    .award-info h4 {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 2px;
    }

    .award-info .award-rank {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 4px;
    }

    .award-gold .award-rank { color: #b45309; }
    .award-silver .award-rank { color: #6b7280; }
    .award-bronze .award-rank { color: #b45309; }
    .award-participate .award-rank { color: #7c3aed; }

    .award-info p {
        font-size: 12px;
        color: #6b7280;
        line-height: 1.4;
    }

    /* Timeline */
    .timeline {
        position: relative;
        margin: 20px 0 20px 20px;
        padding-left: 30px;
        border-left: 3px solid #e5e7eb;
    }

    .timeline-item {
        position: relative;
        margin-bottom: 22px;
        padding: 14px 18px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
    }

    .timeline-item::before {
        content: '';
        position: absolute;
        left: -39px;
        top: 18px;
        width: 14px;
        height: 14px;
        background: #8B5CF6;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 0 2px #8B5CF6;
    }

    .timeline-item h4 {
        font-size: 14px;
        font-weight: 700;
        color: #1a1a2e;
        margin-bottom: 4px;
    }

    .timeline-item .tl-phase {
        display: inline-block;
        font-size: 10px;
        font-weight: 600;
        color: white;
        background: #8B5CF6;
        padding: 2px 10px;
        border-radius: 20px;
        margin-bottom: 6px;
    }

    .timeline-item p {
        font-size: 12px;
        color: #6b7280;
        line-height: 1.5;
    }

    /* Feature grid */
    .feature-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin: 15px 0;
    }

    .feature-card {
        flex: 1 1 45%;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        text-align: center;
    }

    .feature-card .fc-icon {
        font-size: 30px;
        margin-bottom: 8px;
    }

    .feature-card h4 {
        font-size: 13px;
        font-weight: 700;
        color: #1a1a2e;
        margin-bottom: 4px;
    }

    .feature-card p {
        font-size: 11px;
        color: #6b7280;
        line-height: 1.4;
    }

    /* Page footer */
    .page-footer {
        position: absolute;
        bottom: 15mm;
        left: 25mm;
        right: 25mm;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 10px;
        border-top: 1px solid #e5e7eb;
        font-size: 10px;
        color: #9ca3af;
    }

    .page-footer .pf-brand {
        font-weight: 700;
        color: #8B5CF6;
    }

    /* Checklist */
    .checklist {
        list-style: none;
        margin: 12px 0;
        padding: 0;
    }

    .checklist li {
        padding: 8px 14px;
        margin-bottom: 6px;
        background: #f9fafb;
        border-radius: 8px;
        font-size: 12.5px;
        color: #374151;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .checklist li .cl-check {
        color: #8B5CF6;
        font-weight: 700;
    }

    /* Two column */
    .two-col {
        display: flex;
        gap: 20px;
        margin: 15px 0;
    }

    .two-col .col {
        flex: 1;
    }

    .col-box {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
    }

    .col-box h4 {
        font-size: 14px;
        font-weight: 700;
        color: #1a1a2e;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 2px solid #8B5CF6;
    }

    .col-box ul {
        margin-left: 16px;
    }

    .col-box li {
        font-size: 12px;
        color: #6b7280;
        line-height: 1.7;
    }
    """


def build_cover_page():
    return """
    <div class="page cover">
        <div class="cover-badge">KODER KIDS</div>
        <div class="cover-icon">&#x1F3A8;</div>
        <h1>AI <span>Gala</span></h1>
        <p class="subtitle">The Complete Guide to Creating &amp; Participating</p>

        <div class="cover-features">
            <div class="cover-feature">
                <div class="cf-icon">&#x1F5BC;</div>
                <div class="cf-label">Create Projects</div>
            </div>
            <div class="cover-feature">
                <div class="cf-icon">&#x1F5F3;</div>
                <div class="cf-label">Vote &amp; Rate</div>
            </div>
            <div class="cover-feature">
                <div class="cf-icon">&#x1F3C6;</div>
                <div class="cf-label">Win Awards</div>
            </div>
        </div>

        <div class="cover-footer">
            <div class="brand">Koder Kids</div>
            <div>AI Gala Guide &bull; {year}</div>
        </div>
    </div>
    """.format(year=datetime.now().year)


def build_what_is_page():
    return """
    <div class="page">
        <div class="section-header">
            <span class="section-number">1</span>
            <h2 class="section-title">What is the AI Gala?</h2>
            <p class="section-subtitle">Understanding the monthly AI creative showcase</p>
        </div>

        <div class="intro-text">
            The <strong>AI Gala</strong> is a monthly creative showcase where students use AI tools
            to create stunning artwork, projects, and innovations based on a unique theme. Each month,
            a new gallery opens with a fresh theme, and students bring their imagination to life using
            artificial intelligence.
        </div>

        <div class="feature-grid">
            <div class="feature-card">
                <div class="fc-icon">&#x1F3A8;</div>
                <h4>Monthly Themes</h4>
                <p>Every month features a unique, exciting AI theme that sparks creativity and exploration.</p>
            </div>
            <div class="feature-card">
                <div class="fc-icon">&#x1F4E4;</div>
                <h4>Project Submissions</h4>
                <p>Students submit their AI-powered creations with images, descriptions, and metadata.</p>
            </div>
            <div class="feature-card">
                <div class="fc-icon">&#x1F5F3;</div>
                <h4>Peer Voting</h4>
                <p>Students vote for their favorite projects. Each student gets a limited number of votes.</p>
            </div>
            <div class="feature-card">
                <div class="fc-icon">&#x1F3C6;</div>
                <h4>Awards &amp; Certificates</h4>
                <p>Top projects earn Champion, Innovator, and Creator awards with downloadable certificates.</p>
            </div>
        </div>

        <div class="info-box">
            <div class="ib-title">&#x1F4A1; How It Works</div>
            <p>
                <strong>1.</strong> A new gallery is created with a theme (e.g., "Underwater Worlds", "Space Odyssey")
                &rarr; <strong>2.</strong> Students create AI-powered projects following the theme
                &rarr; <strong>3.</strong> Projects are submitted and reviewed
                &rarr; <strong>4.</strong> Voting opens and peers cast their votes
                &rarr; <strong>5.</strong> Winners are announced and certificates are generated!
            </p>
        </div>

        <div class="two-col">
            <div class="col">
                <div class="col-box">
                    <h4>&#x1F393; For Students</h4>
                    <ul>
                        <li>Explore AI creativity</li>
                        <li>Build a project portfolio</li>
                        <li>Learn from peers</li>
                        <li>Win recognition &amp; awards</li>
                        <li>Develop presentation skills</li>
                    </ul>
                </div>
            </div>
            <div class="col">
                <div class="col-box">
                    <h4>&#x1F3EB; For Schools</h4>
                    <ul>
                        <li>Promote AI literacy</li>
                        <li>Foster healthy competition</li>
                        <li>Showcase student talent</li>
                        <li>Track engagement &amp; growth</li>
                        <li>Generate participation reports</li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="page-footer">
            <span class="pf-brand">Koder Kids</span>
            <span>AI Gala Guide &mdash; Page 2</span>
        </div>
    </div>
    """


def build_how_to_create_page():
    return """
    <div class="page">
        <div class="section-header">
            <span class="section-number">2</span>
            <h2 class="section-title">How to Create an AI Gala</h2>
            <p class="section-subtitle">Step-by-step guide for administrators and teachers</p>
        </div>

        <div class="intro-text">
            Creating a new AI Gala is straightforward. Admins and teachers can set up a gallery,
            define the theme and rules, target specific schools and classes, and launch it for students.
        </div>

        <div class="steps">
            <div class="step">
                <div class="step-num">1</div>
                <div class="step-content">
                    <h4>&#x1F4DD; Set Up a New Gallery</h4>
                    <p>Navigate to the AI Gala section and create a new gallery. Provide a <strong>title</strong>
                    (e.g., "March AI Gala"), a <strong>month label</strong> (e.g., "March 2026"),
                    a creative <strong>theme</strong> (e.g., "Futuristic Cities"), and a compelling
                    <strong>description</strong> that excites students.</p>
                </div>
            </div>

            <div class="step">
                <div class="step-num">2</div>
                <div class="step-content">
                    <h4>&#x1F3AF; Configure Target Audience</h4>
                    <p>Select the <strong>target schools</strong> and <strong>target classes</strong> that should
                    participate. You can target specific grade levels or open it to all students.
                    Set the <strong>maximum votes per user</strong> (default is 3).</p>
                </div>
            </div>

            <div class="step">
                <div class="step-num">3</div>
                <div class="step-content">
                    <h4>&#x1F4CB; Write Clear Instructions</h4>
                    <p>Add detailed <strong>instructions</strong> for students: what AI tools to use,
                    what format to submit in, any rules or guidelines, and tips for creating great projects.
                    Upload an eye-catching <strong>cover image</strong> for the gallery.</p>
                </div>
            </div>

            <div class="step">
                <div class="step-num">4</div>
                <div class="step-content">
                    <h4>&#x1F4C5; Set Important Dates</h4>
                    <p>Configure the key dates: <strong>Class Date</strong> (when the theme is taught),
                    <strong>Gallery Open Date</strong> (submissions begin),
                    <strong>Voting Start Date</strong>, and <strong>Voting End Date</strong>.
                    These control the gallery's lifecycle automatically.</p>
                </div>
            </div>

            <div class="step">
                <div class="step-num">5</div>
                <div class="step-content">
                    <h4>&#x1F680; Activate the Gallery</h4>
                    <p>Change the gallery status from <strong>Draft</strong> to <strong>Active</strong>.
                    This opens submissions for students. The status will transition to <strong>Voting</strong>
                    when the voting period begins, and finally to <strong>Closed</strong> when voting ends.</p>
                </div>
            </div>

            <div class="step">
                <div class="step-num">6</div>
                <div class="step-content">
                    <h4>&#x2705; Moderate &amp; Manage</h4>
                    <p>Review submitted projects and <strong>approve</strong> them for the gallery.
                    Monitor comments, manage any flagged content, and ensure the gallery runs smoothly.
                    Teachers can also submit projects on behalf of students if needed.</p>
                </div>
            </div>
        </div>

        <div class="tip-box">
            <div class="tb-title">&#x1F4A1; Pro Tips for a Great Gala</div>
            <ul>
                <li>Choose themes that are fun and accessible to all skill levels</li>
                <li>Give students at least 1-2 weeks for the submission period</li>
                <li>Share example projects to inspire creativity</li>
                <li>Encourage students to write detailed descriptions of their process</li>
            </ul>
        </div>

        <div class="page-footer">
            <span class="pf-brand">Koder Kids</span>
            <span>AI Gala Guide &mdash; Page 3</span>
        </div>
    </div>
    """


def build_what_happens_next_page():
    return """
    <div class="page">
        <div class="section-header">
            <span class="section-number">3</span>
            <h2 class="section-title">What Happens Next?</h2>
            <p class="section-subtitle">The journey from submission to celebration</p>
        </div>

        <div class="intro-text">
            Once the gallery is live, an exciting sequence of events unfolds. Here's what happens
            at each stage of the AI Gala — from the moment students start creating to the final celebration.
        </div>

        <div class="timeline">
            <div class="timeline-item">
                <span class="tl-phase">PHASE 1</span>
                <h4>&#x1F3A8; Submission Period</h4>
                <p>The gallery is <strong>Active</strong> and open for submissions. Students create their
                AI-powered projects based on the theme, upload their artwork with a title and description,
                and submit them to the gallery. Each student can submit <strong>one project</strong> per gallery.
                Teachers can also help students upload their work.</p>
            </div>

            <div class="timeline-item">
                <span class="tl-phase">PHASE 2</span>
                <h4>&#x1F50D; Review &amp; Approval</h4>
                <p>Admins and teachers review submitted projects for quality and appropriateness.
                Projects are <strong>approved</strong> and become visible in the gallery for everyone to see.
                This ensures all displayed work meets the gallery standards.</p>
            </div>

            <div class="timeline-item">
                <span class="tl-phase">PHASE 3</span>
                <h4>&#x1F5F3; Voting Opens</h4>
                <p>The gallery transitions to <strong>Voting</strong> status. Students can now browse
                all approved projects, leave <strong>comments</strong>, and cast their <strong>votes</strong>
                for their favorite creations. Each voter gets a limited number of votes
                (configurable, default is 3 per gallery).</p>
            </div>

            <div class="timeline-item">
                <span class="tl-phase">PHASE 4</span>
                <h4>&#x1F3C6; Winners Announced</h4>
                <p>When voting ends, the gallery moves to <strong>Closed</strong> status. Admins calculate
                the results and designate winners:</p>
                <ul style="margin-left: 16px; margin-top: 6px; font-size: 12px; color: #6b7280;">
                    <li><strong>Champion</strong> (1st Place) — Highest votes</li>
                    <li><strong>Innovator</strong> (2nd Place) — Runner up</li>
                    <li><strong>Creator</strong> (3rd Place) — Third place</li>
                </ul>
            </div>

            <div class="timeline-item">
                <span class="tl-phase">PHASE 5</span>
                <h4>&#x1F4DC; Certificates &amp; Reports</h4>
                <p>Beautiful <strong>certificates</strong> are auto-generated for all participants — with
                special designs for winners (gold, silver, bronze borders). Admins can download
                a full <strong>participation report</strong> and bulk download all certificates as a ZIP file.</p>
            </div>
        </div>

        <div class="warning-box">
            <div class="wb-title">&#x26A0; Important Notes</div>
            <p>Students can only submit <strong>one project per gallery</strong>. Votes cannot be changed
            once the voting period ends. Make sure all dates are set correctly before activating the gallery!</p>
        </div>

        <div class="page-footer">
            <span class="pf-brand">Koder Kids</span>
            <span>AI Gala Guide &mdash; Page 4</span>
        </div>
    </div>
    """


def build_student_guide_page():
    return """
    <div class="page">
        <div class="section-header">
            <span class="section-number">4</span>
            <h2 class="section-title">Student Guide</h2>
            <p class="section-subtitle">Everything students need to know to participate and shine</p>
        </div>

        <div class="intro-text">
            Ready to showcase your AI creativity? Follow these steps to create an amazing project,
            submit it to the gallery, and compete for top awards. Every submission counts!
        </div>

        <div class="steps">
            <div class="step">
                <div class="step-num">1</div>
                <div class="step-content">
                    <h4>&#x1F50E; Check the Active Gallery</h4>
                    <p>Open the AI Gala section to see the current gallery. Read the <strong>theme</strong>
                    carefully, check the <strong>instructions</strong>, and note the <strong>deadlines</strong>.
                    Understanding the theme is key to creating a great project!</p>
                </div>
            </div>

            <div class="step">
                <div class="step-num">2</div>
                <div class="step-content">
                    <h4>&#x1F9E0; Plan &amp; Create Your AI Project</h4>
                    <p>Use AI tools to bring your vision to life! Brainstorm ideas that fit the theme,
                    experiment with different approaches, and create something unique.
                    Focus on <strong>creativity</strong>, <strong>relevance to the theme</strong>, and
                    <strong>quality</strong> of your final output.</p>
                </div>
            </div>

            <div class="step">
                <div class="step-num">3</div>
                <div class="step-content">
                    <h4>&#x1F4E4; Submit Your Project</h4>
                    <p>Upload your project with a catchy <strong>title</strong>, a high-quality
                    <strong>image</strong> of your creation, and a detailed <strong>description</strong>
                    explaining what you made and how you used AI. First impressions matter!</p>
                </div>
            </div>

            <div class="step">
                <div class="step-num">4</div>
                <div class="step-content">
                    <h4>&#x1F5F3; Vote for Your Favorites</h4>
                    <p>Once voting opens, explore all the amazing projects your peers have created.
                    Use your votes wisely — you have a <strong>limited number of votes</strong>
                    (usually 3). Vote for the projects that truly impress you!</p>
                </div>
            </div>

            <div class="step">
                <div class="step-num">5</div>
                <div class="step-content">
                    <h4>&#x1F4AC; Engage &amp; Comment</h4>
                    <p>Leave encouraging <strong>comments</strong> on other students' projects.
                    Appreciate their creativity, ask questions about their process, and build
                    a supportive community. Good engagement makes the Gala more fun for everyone!</p>
                </div>
            </div>
        </div>

        <div class="tip-box">
            <div class="tb-title">&#x1F31F; Tips for Winning</div>
            <ul>
                <li><strong>Stay on theme</strong> — Projects that closely match the theme score higher</li>
                <li><strong>Write a great description</strong> — Explain your creative process and AI tools used</li>
                <li><strong>Quality over quantity</strong> — Take time to polish your final submission</li>
                <li><strong>Be original</strong> — Unique ideas stand out from the crowd</li>
                <li><strong>Submit early</strong> — Don't wait until the last minute; early submissions get more views</li>
            </ul>
        </div>

        <div class="info-box">
            <div class="ib-title">&#x1F4F1; Your Dashboard</div>
            <p>Check your AI Gala dashboard to track your project's performance — see your
            <strong>vote count</strong>, <strong>view count</strong>, <strong>comments</strong>,
            and how you rank compared to others. You'll also find your certificates here after results are announced.</p>
        </div>

        <div class="page-footer">
            <span class="pf-brand">Koder Kids</span>
            <span>AI Gala Guide &mdash; Page 5</span>
        </div>
    </div>
    """


def build_awards_page():
    return """
    <div class="page">
        <div class="section-header">
            <span class="section-number">5</span>
            <h2 class="section-title">Awards &amp; Recognition</h2>
            <p class="section-subtitle">Celebrating excellence in AI creativity</p>
        </div>

        <div class="intro-text">
            Every participant in the AI Gala is recognized for their effort. Top performers receive
            special awards, and everyone gets a certificate of participation. Here are the award tiers:
        </div>

        <div class="awards-grid">
            <div class="award-card award-gold">
                <div class="award-icon">&#x1F947;</div>
                <div class="award-info">
                    <div class="award-rank">1st Place</div>
                    <h4 style="color: #b45309;">Champion</h4>
                    <p>The top-voted project earns the prestigious Champion title. Receives a gold-bordered
                    certificate with special recognition. The Champion's project is highlighted in the gallery
                    with a golden badge.</p>
                </div>
            </div>

            <div class="award-card award-silver">
                <div class="award-icon">&#x1F948;</div>
                <div class="award-info">
                    <div class="award-rank">2nd Place</div>
                    <h4 style="color: #6b7280;">Innovator</h4>
                    <p>The runner-up receives the Innovator award for pushing creative boundaries.
                    Comes with a silver-bordered certificate and recognition badge on their project.</p>
                </div>
            </div>

            <div class="award-card award-bronze">
                <div class="award-icon">&#x1F949;</div>
                <div class="award-info">
                    <div class="award-rank">3rd Place</div>
                    <h4 style="color: #b45309;">Creator</h4>
                    <p>Third place earns the Creator title for outstanding work. Receives a bronze-bordered
                    certificate and a special badge displayed alongside their project.</p>
                </div>
            </div>

            <div class="award-card award-participate">
                <div class="award-icon">&#x1F31F;</div>
                <div class="award-info">
                    <div class="award-rank">All Participants</div>
                    <h4 style="color: #7c3aed;">Participant Certificate</h4>
                    <p>Every student who submits a project receives a beautiful participation certificate.
                    All certificates are downloadable as PDFs — a keepsake of your AI Gala journey!</p>
                </div>
            </div>
        </div>

        <div class="two-col">
            <div class="col">
                <div class="col-box">
                    <h4>&#x1F4CA; How Winners Are Selected</h4>
                    <ul>
                        <li>Projects ranked by total vote count</li>
                        <li>Only approved projects are eligible</li>
                        <li>Admins can review and finalize rankings</li>
                        <li>Winners can be manually adjusted if needed</li>
                        <li>Results are announced when gallery closes</li>
                    </ul>
                </div>
            </div>
            <div class="col">
                <div class="col-box">
                    <h4>&#x1F4DC; Certificate Features</h4>
                    <ul>
                        <li>Personalized with student name &amp; school</li>
                        <li>Includes project title &amp; gallery theme</li>
                        <li>Color-coded borders by award tier</li>
                        <li>Official Koder Kids branding</li>
                        <li>Downloadable PDF format</li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="info-box">
            <div class="ib-title">&#x1F4E6; Bulk Downloads for Teachers</div>
            <p>Teachers and admins can download <strong>all certificates</strong> for a gallery as a single ZIP file,
            making it easy to distribute to students. A detailed <strong>participation report</strong> PDF is also
            available with statistics, rankings, and class-wise breakdowns.</p>
        </div>

        <div class="page-footer">
            <span class="pf-brand">Koder Kids</span>
            <span>AI Gala Guide &mdash; Page 6</span>
        </div>
    </div>
    """


def build_timeline_page():
    return """
    <div class="page">
        <div class="section-header">
            <span class="section-number">6</span>
            <h2 class="section-title">Timeline &amp; Quick Reference</h2>
            <p class="section-subtitle">Key dates, statuses, and a handy checklist</p>
        </div>

        <div class="intro-text">
            Every AI Gala follows a structured lifecycle with clear phases. Understanding these phases
            and their associated dates helps everyone — admins, teachers, and students — stay on track.
        </div>

        <div class="two-col">
            <div class="col">
                <div class="col-box">
                    <h4>&#x1F4C5; Key Dates to Set</h4>
                    <ul>
                        <li><strong>Class Date</strong> — When the AI theme is taught in class</li>
                        <li><strong>Gallery Open Date</strong> — When student submissions begin</li>
                        <li><strong>Voting Start Date</strong> — When peer voting opens</li>
                        <li><strong>Voting End Date</strong> — When voting closes and results are tallied</li>
                    </ul>
                </div>
            </div>
            <div class="col">
                <div class="col-box">
                    <h4>&#x1F6A6; Gallery Statuses</h4>
                    <ul>
                        <li><strong>Draft</strong> — Gallery is being set up, not visible to students</li>
                        <li><strong>Active</strong> — Open for project submissions</li>
                        <li><strong>Voting</strong> — Submissions closed, voting is open</li>
                        <li><strong>Closed</strong> — Voting ended, results available</li>
                    </ul>
                </div>
            </div>
        </div>

        <h3 style="font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 25px 0 12px;">
            &#x2705; Admin Checklist
        </h3>
        <ul class="checklist">
            <li><span class="cl-check">&#x2610;</span> Create a new gallery with title, theme, and description</li>
            <li><span class="cl-check">&#x2610;</span> Upload an attractive cover image</li>
            <li><span class="cl-check">&#x2610;</span> Write clear instructions for students</li>
            <li><span class="cl-check">&#x2610;</span> Set target schools and classes</li>
            <li><span class="cl-check">&#x2610;</span> Configure all four key dates</li>
            <li><span class="cl-check">&#x2610;</span> Set maximum votes per user</li>
            <li><span class="cl-check">&#x2610;</span> Activate the gallery (change status to Active)</li>
            <li><span class="cl-check">&#x2610;</span> Review and approve student submissions</li>
            <li><span class="cl-check">&#x2610;</span> Transition to Voting status when ready</li>
            <li><span class="cl-check">&#x2610;</span> Close gallery and calculate winners</li>
            <li><span class="cl-check">&#x2610;</span> Download participation report and certificates</li>
        </ul>

        <h3 style="font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 25px 0 12px;">
            &#x2705; Student Checklist
        </h3>
        <ul class="checklist">
            <li><span class="cl-check">&#x2610;</span> Check the current gallery theme and instructions</li>
            <li><span class="cl-check">&#x2610;</span> Create your AI project following the theme</li>
            <li><span class="cl-check">&#x2610;</span> Write a compelling title and description</li>
            <li><span class="cl-check">&#x2610;</span> Submit your project before the deadline</li>
            <li><span class="cl-check">&#x2610;</span> Vote for your favorite projects when voting opens</li>
            <li><span class="cl-check">&#x2610;</span> Leave positive comments on other projects</li>
            <li><span class="cl-check">&#x2610;</span> Check results and download your certificate</li>
        </ul>

        <div class="tip-box" style="margin-top: 20px;">
            <div class="tb-title">&#x1F389; Make Every Gala Count!</div>
            <p>The AI Gala is more than a competition — it's a learning experience.
            Whether you win an award or simply participate, you're building valuable skills in
            AI creativity, project presentation, and peer collaboration. Every project tells a story!</p>
        </div>

        <div class="page-footer">
            <span class="pf-brand">Koder Kids</span>
            <span>AI Gala Guide &mdash; Page 7</span>
        </div>
    </div>
    """


def generate_guide_html():
    css = build_css()
    cover = build_cover_page()
    what_is = build_what_is_page()
    how_to_create = build_how_to_create_page()
    what_happens = build_what_happens_next_page()
    student_guide = build_student_guide_page()
    awards = build_awards_page()
    timeline = build_timeline_page()

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>{css}</style>
</head>
<body>
    {cover}
    {what_is}
    {how_to_create}
    {what_happens}
    {student_guide}
    {awards}
    {timeline}
</body>
</html>"""
    return html


def generate_pdf(output_path=None):
    if output_path is None:
        output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ai_gala_guide.pdf")

    html_content = generate_guide_html()
    HTML(string=html_content).write_pdf(output_path)
    print(f"PDF generated successfully: {output_path}")
    return output_path


if __name__ == "__main__":
    generate_pdf()
