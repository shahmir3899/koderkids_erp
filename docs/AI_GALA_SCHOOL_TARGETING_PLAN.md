# AI Gala Enhancement Plan: School & Class Targeting

## Current Problem
- Galleries are visible to ALL students across ALL schools
- Notifications go to ALL students
- Teachers have no role in gallery management
- Not practical for multi-school systems

---

## Proposed Solution

### New Concept: Gallery Scope

Each gallery can be scoped to:
1. **Global** - All schools (current behavior, for special events)
2. **School-specific** - One or more selected schools
3. **Class-specific** - Specific classes within schools

---

## Database Changes

### 1. Gallery Model Enhancement

```python
# backend/aigala/models.py

class Gallery(models.Model):
    # ... existing fields ...

    # NEW: Targeting fields
    SCOPE_CHOICES = [
        ('global', 'All Schools'),
        ('schools', 'Selected Schools'),
        ('classes', 'Selected Classes'),
    ]

    scope = models.CharField(
        max_length=20,
        choices=SCOPE_CHOICES,
        default='global'
    )

    # Schools this gallery is visible to (if scope='schools' or 'classes')
    target_schools = models.ManyToManyField(
        'students.School',
        blank=True,
        related_name='gala_galleries',
        help_text="Schools that can participate in this gallery"
    )

    # Specific classes (if scope='classes')
    # Format: ["Level 1", "Level 2"] or specific class names
    target_classes = models.JSONField(
        default=list,
        blank=True,
        help_text="Class names that can participate (e.g., ['Level 1', 'Level 2'])"
    )

    # Teacher who created/manages this gallery (optional)
    created_by = models.ForeignKey(
        'students.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_galleries'
    )
```

### 2. Migration Required
```bash
python manage.py makemigrations aigala --name add_gallery_targeting
python manage.py migrate
```

---

## Backend Changes

### 1. Gallery Visibility Logic

```python
# backend/aigala/views.py

def get_visible_galleries_for_user(user):
    """Get galleries visible to a specific user based on their school/class."""

    if user.role == 'Admin':
        # Admins see all galleries
        return Gallery.objects.all()

    if user.role == 'Teacher':
        # Teachers see galleries for their assigned schools
        teacher_schools = user.assigned_schools.all()
        return Gallery.objects.filter(
            Q(scope='global') |
            Q(scope='schools', target_schools__in=teacher_schools) |
            Q(scope='classes', target_schools__in=teacher_schools)
        ).distinct()

    if user.role == 'Student':
        try:
            student = user.student_profile
            student_school = student.school  # School object or name
            student_class = student.student_class

            return Gallery.objects.filter(
                Q(scope='global') |
                Q(scope='schools', target_schools=student_school) |
                Q(scope='classes', target_schools=student_school, target_classes__contains=student_class)
            ).exclude(status='draft').distinct()
        except:
            return Gallery.objects.none()

    return Gallery.objects.none()
```

### 2. Update list_galleries View

```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_galleries(request):
    """List galleries visible to the current user."""
    user = request.user

    # Admin with include_drafts
    include_drafts = request.query_params.get('include_drafts', '').lower() == 'true'

    if include_drafts and user.role == 'Admin':
        galleries = Gallery.objects.all()
    else:
        galleries = get_visible_galleries_for_user(user)
        if user.role != 'Admin':
            galleries = galleries.exclude(status='draft')

    # Status filter
    status_filter = request.query_params.get('status')
    if status_filter:
        galleries = galleries.filter(status=status_filter)

    galleries = galleries.order_by('-created_at')

    serializer = GalleryListSerializer(galleries, many=True, context={'request': request})
    return Response(serializer.data)
```

### 3. Update Notification Functions

```python
def notify_gallery_active(gallery):
    """Notify students in targeted schools/classes."""

    if gallery.scope == 'global':
        # All students
        students = Student.objects.filter(status='Active')
    elif gallery.scope == 'schools':
        # Students in target schools
        students = Student.objects.filter(
            school__in=gallery.target_schools.all(),
            status='Active'
        )
    else:  # classes
        # Students in target schools AND classes
        students = Student.objects.filter(
            school__in=gallery.target_schools.all(),
            student_class__in=gallery.target_classes,
            status='Active'
        )

    recipients = [s.user for s in students if s.user]

    send_gala_notification(
        recipients=recipients,
        title="AI Gala Now Open!",
        message=f"'{gallery.theme}' theme is now accepting submissions!",
        notification_type='info',
        related_url='/ai-gala'
    )
```

---

## Frontend Changes

### 1. Create Gallery Modal - Add Targeting

```jsx
// In CreateGalleryModal

const [formData, setFormData] = useState({
    // ... existing fields ...
    scope: 'global',           // NEW
    target_schools: [],        // NEW
    target_classes: [],        // NEW
});

// Add scope selector
<div style={styles.formGroup}>
    <label style={styles.label}>Gallery Scope</label>
    <select
        value={formData.scope}
        onChange={e => setFormData({ ...formData, scope: e.target.value })}
        style={styles.input}
    >
        <option value="global">All Schools</option>
        <option value="schools">Selected Schools</option>
        <option value="classes">Selected Classes</option>
    </select>
</div>

{/* Show school selector if scope is schools or classes */}
{formData.scope !== 'global' && (
    <div style={styles.formGroup}>
        <label style={styles.label}>Select Schools</label>
        <SchoolMultiSelect
            value={formData.target_schools}
            onChange={schools => setFormData({ ...formData, target_schools: schools })}
        />
    </div>
)}

{/* Show class selector if scope is classes */}
{formData.scope === 'classes' && (
    <div style={styles.formGroup}>
        <label style={styles.label}>Select Classes</label>
        <ClassMultiSelect
            schools={formData.target_schools}
            value={formData.target_classes}
            onChange={classes => setFormData({ ...formData, target_classes: classes })}
        />
    </div>
)}
```

### 2. Gallery Card - Show Scope Badge

```jsx
// In gallery card display
{gallery.scope !== 'global' && (
    <span style={styles.scopeBadge}>
        {gallery.scope === 'schools'
            ? `${gallery.target_schools?.length} schools`
            : `${gallery.target_classes?.length} classes`
        }
    </span>
)}
```

---

## Teacher Role Enhancement

### What Teachers Can Do:

| Action | Current | Proposed |
|--------|---------|----------|
| View galleries | All | Only their assigned schools |
| Create galleries | No | Yes (for their schools only) |
| Upload for students | Their schools | Their schools |
| Change status | No | Yes (for galleries they created) |
| View stats | No | Yes (for their schools) |

### Backend Permission Changes

```python
# New permission class
class IsGalleryOwnerOrAdmin(permissions.BasePermission):
    """Allow access if user is admin or created the gallery."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'Admin':
            return True
        if request.user.role == 'Teacher':
            return obj.created_by == request.user
        return False

# Update status change endpoint
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsGalleryOwnerOrAdmin])
def update_gallery_status(request, gallery_id):
    # ... existing logic ...
```

### Teacher Gallery Creation

```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_gallery(request):
    user = request.user

    # Teachers can only create galleries for their assigned schools
    if user.role == 'Teacher':
        serializer = GalleryCreateSerializer(data=request.data)
        if serializer.is_valid():
            gallery = serializer.save(
                created_by=user,
                scope='schools'  # Teachers create school-scoped galleries
            )
            # Auto-assign teacher's schools
            gallery.target_schools.set(user.assigned_schools.all())
            gallery.save()
            return Response(...)

    # Admin can create any gallery
    elif user.role == 'Admin':
        # ... existing logic ...
```

---

## Updated Menu Config

```javascript
// menuConfig.js - AI_GALA section

AI_GALA: {
    id: 'ai-gala',
    label: 'AI Gala',
    roles: ['Student', 'Admin', 'Teacher'],
    items: [
        {
            id: 'ai-gala-gallery',
            label: 'AI Gala',
            path: '/ai-gala',
            roles: ['Student', 'Admin', 'Teacher'],
        },
        {
            id: 'ai-gala-manage',
            label: 'Manage Galleries',
            path: '/ai-gala/manage',
            roles: ['Admin', 'Teacher'],  // Teachers can now access!
        },
    ],
}
```

---

## Implementation Order

### Phase 1: Database & Backend (Priority)
1. [ ] Add `scope`, `target_schools`, `target_classes`, `created_by` to Gallery model
2. [ ] Create migration
3. [ ] Update `list_galleries` with visibility logic
4. [ ] Update notification functions for targeting
5. [ ] Add teacher permission to create/manage galleries

### Phase 2: Frontend - Create Gallery
1. [ ] Add scope selector to CreateGalleryModal
2. [ ] Add school multi-select component
3. [ ] Add class multi-select component
4. [ ] Update form submission to include targeting

### Phase 3: Frontend - Display & Access
1. [ ] Show scope badge on gallery cards
2. [ ] Update management page for teachers
3. [ ] Filter galleries based on user role/school

### Phase 4: Testing
1. [ ] Test global gallery (all schools see it)
2. [ ] Test school-specific gallery
3. [ ] Test class-specific gallery
4. [ ] Test teacher creating gallery for their schools
5. [ ] Test notifications go to correct students

---

## Summary

| Feature | Before | After |
|---------|--------|-------|
| Gallery visibility | All students | Targeted schools/classes |
| Notifications | All students | Only targeted students |
| Teacher role | Upload only | Create + Manage galleries |
| Admin role | Full access | Full access (unchanged) |
| Scope options | None | Global / Schools / Classes |

---

## Questions to Confirm

1. Should teachers be able to create galleries, or only admins?
2. Can a gallery target multiple schools? (Proposed: Yes)
3. Should class targeting be within selected schools only? (Proposed: Yes)
4. Should teachers see galleries from other schools? (Proposed: No)

---

*Plan created: January 2026*
