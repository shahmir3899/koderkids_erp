# AI Gala - User Guide

## Overview

AI Gala is a monthly creative AI competition system where students showcase their AI-generated artwork. Each month features a unique theme, and students can upload their projects, receive votes from peers, and win recognition through certificates and badges.

---

## System Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AI GALA MONTHLY CYCLE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. DRAFT          2. ACTIVE           3. VOTING         4. CLOSED     │
│  ──────────       ───────────         ─────────         ─────────      │
│  Admin creates    Students upload     Students vote     Winners        │
│  gallery with     their AI projects   for favorites     announced      │
│  theme & dates    (1 per student)     (3 votes each)    Certificates   │
│                                                         available      │
│                                                                         │
│  [Admin Only]     [All Users]         [All Users]       [All Users]    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Gallery Status Lifecycle

| Status | Description | Who Can Do What |
|--------|-------------|-----------------|
| **Draft** | Gallery created but not visible | Admin: Edit gallery settings |
| **Active** | Submissions open | Students: Upload projects |
| **Voting** | Voting period open | All users: Vote (3 votes max) |
| **Closed** | Competition ended | All users: View results, download certificates |

---

## Admin Guide

### Accessing AI Gala Management

1. Navigate to **AI Gala** > **Manage Galleries** from the sidebar menu
2. Or go directly to `/ai-gala/manage`

### Creating a New Gallery

1. In Django Admin (`/admin/aigala/gallery/`), click **Add Gallery**
2. Fill in the required fields:
   - **Title**: e.g., "January 2026 AI Gala"
   - **Theme**: e.g., "Underwater Worlds"
   - **Month/Year**: Select the competition month
   - **Submission Deadline**: Last date for project uploads
   - **Voting End Date**: When voting closes
   - **Max Votes Per User**: Default is 3
   - **Status**: Start with "Draft"

### Managing Gallery Status

Change status through Django Admin or API:

```
Draft → Active    : Opens submissions (notifies all students)
Active → Voting   : Closes submissions, opens voting (notifies all students)
Voting → Closed   : Ends voting, calculates winners (notifies winners + participants)
```

### Uploading Projects for Students

If a student cannot upload themselves:

1. Go to **AI Gala** page (`/ai-gala`)
2. Click **"Upload for Student"** button (blue button)
3. Search and select the student
4. Fill in project details:
   - Title
   - Description
   - AI Tool used
   - Upload the image
5. Click **Submit**

### Downloading Reports

1. Go to **AI Gala** page
2. Click **"Download Report"** (green button)
3. PDF includes:
   - Gallery statistics
   - Participation breakdown by school/class
   - Full participant list with vote counts
   - Winners highlighted

### Downloading Certificates

After gallery is **Closed**:

1. Click **"All Certificates"** button
2. Downloads a ZIP file containing:
   - Winner certificates (Rank 1, 2, 3)
   - Participation certificates for all other participants

### Sending Notifications

Notifications are sent automatically when:
- Gallery status changes to "Active" (submissions open)
- Gallery status changes to "Voting" (voting starts)
- Gallery is "Closed" (winners announced)

Manual notifications can be sent via:
- **Employees** > **Notifications** > **Send to Students**

---

## Teacher Guide

### Accessing AI Gala

1. Navigate to **AI Gala** from the sidebar menu
2. View all galleries and projects

### Uploading Projects for Students

Teachers can upload projects for students in their assigned schools:

1. Go to **AI Gala** page
2. When a gallery is **Active**, click **"Upload for Student"**
3. Select a student from your assigned schools
4. Fill in project details and upload image
5. Submit

### Viewing Projects

- Browse all submitted projects
- Use search to find specific projects
- Sort by: Most Votes, Most Recent, Name

### Voting

During **Voting** phase:
- Click the heart icon on any project to vote
- You have **3 votes** per gallery
- Can remove votes by clicking heart again

---

## Student Guide

### Accessing AI Gala

1. From Student Dashboard, click on **AI Gala** in the menu
2. Or use the AI Gala widget on your dashboard

### Uploading Your Project

When a gallery is **Active** (accepting submissions):

1. Click **"Upload Project"** button
2. Fill in the form:
   - **Title**: Give your artwork a creative name
   - **Description**: Explain your creation
   - **AI Tool**: Which AI tool did you use? (e.g., DALL-E, Midjourney)
   - **Image**: Upload your AI artwork (max 5MB)
3. Click **Submit**

**Note**: You can only upload ONE project per gallery.

### Viewing Your Project

Your project appears in the "Your Project" section at the top of the page showing:
- Your artwork thumbnail
- Vote count
- Winner status (if applicable)

### Voting for Others

During **Voting** phase:

1. Browse projects from other students
2. Click the **heart icon** to vote for your favorites
3. You have **3 votes** - use them wisely!
4. You can change your votes anytime during voting period

### Viewing Results

After gallery is **Closed**:
- Winners section shows top 3 projects
- Your project shows final vote count
- If you won, your rank is displayed

### Downloading Your Certificate

After gallery is **Closed**:

1. Click on your project to open details
2. Click **"Download Certificate"** button
3. Certificate includes:
   - Your name and school
   - Gallery theme
   - Award type (Winner or Participant)
   - Project title

### Notifications

You'll receive notifications for:
- New gallery opened for submissions
- Voting period started
- Results announced
- When someone votes for your project

---

## Features Summary

| Feature | Admin | Teacher | Student |
|---------|-------|---------|---------|
| View galleries & projects | ✅ | ✅ | ✅ |
| Upload own project | ❌ | ❌ | ✅ |
| Upload for students | ✅ | ✅ (own schools) | ❌ |
| Vote for projects | ✅ | ✅ | ✅ |
| Comment on projects | ✅ | ✅ | ✅ |
| Download own certificate | ❌ | ❌ | ✅ |
| Download all certificates | ✅ | ❌ | ❌ |
| Download participation report | ✅ | ❌ | ❌ |
| Create/manage galleries | ✅ | ❌ | ❌ |
| Change gallery status | ✅ | ❌ | ❌ |

---

## Best Practices

### For Admins

1. **Plan ahead**: Create galleries at least 1 week before the month starts
2. **Clear themes**: Choose engaging themes that inspire creativity
3. **Promote**: Announce new themes via notifications
4. **Monitor**: Check participation levels during active period
5. **Celebrate**: Download and share winner certificates promptly

### For Teachers

1. **Encourage participation**: Remind students about deadlines
2. **Assist younger students**: Use "Upload for Student" for those who need help
3. **Vote fairly**: Base votes on creativity and effort
4. **Celebrate**: Recognize participants in class

### For Students

1. **Be creative**: Take time to create something unique
2. **Follow the theme**: Make sure your artwork matches the monthly theme
3. **Write good descriptions**: Explain your creative process
4. **Vote thoughtfully**: Support your peers' creativity
5. **Check notifications**: Don't miss submission deadlines

---

## Troubleshooting

### "Upload Project" button not showing
- Gallery might not be in "Active" status
- You may have already uploaded a project for this gallery

### Can't vote
- Gallery might not be in "Voting" status
- You may have used all 3 votes
- You cannot vote for your own project

### Certificate not available
- Gallery must be in "Closed" status
- Wait for admin to close the gallery

### Not receiving notifications
- Check if notifications are enabled in your settings
- Verify your notification bell shows new items

---

## API Endpoints Reference

For developers integrating with AI Gala:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/aigala/galleries/` | GET | List all galleries |
| `/api/aigala/active/` | GET | Get current active/voting gallery |
| `/api/aigala/galleries/{id}/` | GET | Gallery detail with projects |
| `/api/aigala/galleries/{id}/upload/` | POST | Upload project (student) |
| `/api/aigala/teacher/galleries/{id}/upload/` | POST | Upload for student (teacher) |
| `/api/aigala/admin/galleries/{id}/upload/` | POST | Upload for student (admin) |
| `/api/aigala/projects/{id}/vote/` | POST | Vote for project |
| `/api/aigala/projects/{id}/unvote/` | DELETE | Remove vote |
| `/api/aigala/projects/{id}/certificate/` | GET | Download certificate |
| `/api/aigala/admin/galleries/{id}/participation-report/` | GET | Download PDF report |
| `/api/aigala/admin/galleries/{id}/certificates/` | GET | Download all certificates ZIP |

---

## Contact & Support

For issues or questions about AI Gala:
- Contact your school administrator
- Technical issues: Report via the help system

---

*Last Updated: January 2026*
