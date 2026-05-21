// frontend/src/pages/admin/OnlineStudentManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { PageHeader } from '../../components/common/PageHeader';
import OnlineStudentCourseAssignmentModal from '../../components/admin/OnlineStudentCourseAssignmentModal';
import OnlineStudentProfileEditModal from '../../components/admin/OnlineStudentProfileEditModal';
import * as onlineStudentAdminService from '../../services/onlineStudentAdminService';
import TimeSlotTab from '../../components/admin/TimeSlotTab';
import { useSchools } from '../../hooks/useSchools';
import { API_URL, getAuthHeaders } from '../../api';
import {
  COLORS as RAW_COLORS,
  SPACING as RAW_SPACING,
  FONT_SIZES as RAW_FONT_SIZES,
  FONT_WEIGHTS as RAW_FONT_WEIGHTS,
  BORDER_RADIUS as RAW_BORDER_RADIUS,
  MIXINS,
} from '../../utils/designConstants';

const COLORS = {
  ...RAW_COLORS,
  PRIMARY: RAW_COLORS.PRIMARY ?? RAW_COLORS.primary,
  WHITE: RAW_COLORS.WHITE ?? RAW_COLORS.background?.white,
  GRAY: RAW_COLORS.GRAY ?? RAW_COLORS.text?.secondary,
  LIGHT_GRAY: RAW_COLORS.LIGHT_GRAY ?? RAW_COLORS.background?.gray,
  BORDER: RAW_COLORS.BORDER ?? RAW_COLORS.border?.default,
  TEXT: RAW_COLORS.TEXT ?? RAW_COLORS.text?.primary,
  LIGHT_GREEN: RAW_COLORS.LIGHT_GREEN ?? RAW_COLORS.status?.successLight,
};

const SPACING = {
  ...RAW_SPACING,
  XS: RAW_SPACING.XS ?? RAW_SPACING.xs,
  SM: RAW_SPACING.SM ?? RAW_SPACING.sm,
  MD: RAW_SPACING.MD ?? RAW_SPACING.md,
  LG: RAW_SPACING.LG ?? RAW_SPACING.lg,
  XL: RAW_SPACING.XL ?? RAW_SPACING.xl,
};

const FONT_SIZES = {
  ...RAW_FONT_SIZES,
  XS: RAW_FONT_SIZES.XS ?? RAW_FONT_SIZES.xs,
  SM: RAW_FONT_SIZES.SM ?? RAW_FONT_SIZES.sm,
  MD: RAW_FONT_SIZES.MD ?? RAW_FONT_SIZES.md,
  LG: RAW_FONT_SIZES.LG ?? RAW_FONT_SIZES.lg,
  XL: RAW_FONT_SIZES.XL ?? RAW_FONT_SIZES.xl,
  XXL: RAW_FONT_SIZES.XXL ?? RAW_FONT_SIZES['2xl'],
};

const FONT_WEIGHTS = {
  ...RAW_FONT_WEIGHTS,
  MEDIUM: RAW_FONT_WEIGHTS.MEDIUM ?? RAW_FONT_WEIGHTS.medium,
  SEMIBOLD: RAW_FONT_WEIGHTS.SEMIBOLD ?? RAW_FONT_WEIGHTS.semibold,
  BOLD: RAW_FONT_WEIGHTS.BOLD ?? RAW_FONT_WEIGHTS.bold,
};

const BORDER_RADIUS = {
  ...RAW_BORDER_RADIUS,
  MD: RAW_BORDER_RADIUS.MD ?? RAW_BORDER_RADIUS.md,
  FULL: RAW_BORDER_RADIUS.FULL ?? RAW_BORDER_RADIUS.full,
};

// ---------------------------------------------------------------------------
// New Online Student Modal
// ---------------------------------------------------------------------------
const EMPTY_STUDENT = {
  name: '', reg_num: '', school: '', time_slot: '',
  monthly_fee: '', gender: 'Male', phone: '', date_of_birth: '',
};

function NewStudentModal({ onSave, onClose }) {
  const { schools } = useSchools();
  const [form, setForm] = useState({ ...EMPTY_STUDENT });
  const [slots, setSlots] = useState([]);
  const [saving, setSaving] = useState(false);

  // Load time slots when school changes
  useEffect(() => {
    if (!form.school) { setSlots([]); return; }
    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/time-slots/?school_id=${form.school}`,
          { headers: getAuthHeaders() }
        );
        if (res.ok) {
          const data = await res.json();
          setSlots(Array.isArray(data) ? data : data.results || []);
        }
      } catch { setSlots([]); }
    })();
  }, [form.school]);

  const set = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value, ...(name === 'school' ? { time_slot: '' } : {}) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.reg_num.trim() || !form.school) {
      toast.error('Name, Registration Number, and School are required.');
      return;
    }
    setSaving(true);
    try {
      await onlineStudentAdminService.createOnlineStudent({
        name: form.name.trim(),
        reg_num: form.reg_num.trim(),
        school: Number(form.school),
        time_slot: form.time_slot ? Number(form.time_slot) : undefined,
        monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : 0,
        gender: form.gender,
        phone: form.phone.trim(),
        date_of_birth: form.date_of_birth || null,
      });
      toast.success('Online student created!');
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed to create student.');
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    width: '100%', padding: '8px 12px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.25)', background: '#23234a',
    color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  };
  const lbl = { display: 'block', color: 'rgba(255,255,255,0.65)', fontSize: '11px', marginBottom: '4px' };
  const btnPrimary = {
    padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
    background: RAW_COLORS.primary ?? '#B061CE', color: '#fff', fontWeight: 600, fontSize: '13px',
  };
  const btnOutline = {
    ...btnPrimary, background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'linear-gradient(135deg,#6366F1 0%,#8B5CF6 50%,#2362ab 100%)',
        borderRadius: '16px', border: '1px solid rgba(255,255,255,0.2)',
        padding: '28px', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 20px' }}>
          + New Online Student
        </h2>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>Name *</label>
                <input name="name" value={form.name} onChange={set} placeholder="Full name" style={inp} />
              </div>
              <div>
                <label style={lbl}>Reg Number *</label>
                <input name="reg_num" value={form.reg_num} onChange={set} placeholder="e.g. ONL-001" style={inp} />
              </div>
            </div>

            <div>
              <label style={lbl}>School *</label>
              <select name="school" value={form.school} onChange={set} style={inp}>
                <option value="">— Select School —</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label style={lbl}>Time Slot {!form.school && <span style={{ opacity: 0.5 }}>(select school first)</span>}</label>
              <select name="time_slot" value={form.time_slot} onChange={set} style={inp} disabled={!form.school}>
                <option value="">— Unassigned —</option>
                {slots.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.label} — {s.days} {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}
                    {s.teacher_name ? ` (${s.teacher_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>Monthly Fee</label>
                <input type="number" name="monthly_fee" value={form.monthly_fee} onChange={set}
                  placeholder="0" min="0" style={inp} />
              </div>
              <div>
                <label style={lbl}>Gender</label>
                <select name="gender" value={form.gender} onChange={set} style={inp}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>Phone</label>
                <input name="phone" value={form.phone} onChange={set} placeholder="+92..." style={inp} />
              </div>
              <div>
                <label style={lbl}>Date of Birth</label>
                <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={set} style={inp} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={btnOutline}>Cancel</button>
            <button type="submit" disabled={saving}
              style={{ ...btnPrimary, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Creating…' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline stat card using the project's glassmorphic pattern
// ---------------------------------------------------------------------------
const StatCard = ({ title, value, color = 'purple' }) => {
  const [hovered, setHovered] = useState(false);
  const schemes = {
    purple: '139, 92, 246',
    green: '16, 185, 129',
    blue: '59, 130, 246',
  };
  const rgb = schemes[color] || schemes.purple;
  return (
    <div
      style={{
        flex: 1,
        minWidth: '120px',
        padding: SPACING.LG,
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.MD,
        borderLeft: `4px solid rgb(${rgb})`,
        textAlign: 'center',
        cursor: 'default',
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.25)' : '0 4px 24px rgba(0,0,0,0.12)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p style={{
        fontSize: FONT_SIZES.XS,
        fontWeight: FONT_WEIGHTS.SEMIBOLD,
        color: 'rgba(255,255,255,0.65)',
        margin: `0 0 ${SPACING.SM}`,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>{title}</p>
      <p style={{
        fontSize: FONT_SIZES.XXL,
        fontWeight: FONT_WEIGHTS.BOLD,
        color: 'rgba(255,255,255,0.95)',
        margin: 0,
      }}>{value}</p>
    </div>
  );
};

const OnlineStudentManager = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [newStudentModalOpen, setNewStudentModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('students');

  // Load online students on mount
  useEffect(() => {
    loadOnlineStudents();
  }, []);

  const loadOnlineStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await onlineStudentAdminService.getOnlineStudents();
      setStudents(data);
    } catch (err) {
      const errorMsg = `Failed to load online students: ${err.message}`;
      setError(errorMsg);
      toast.error('Failed to load online students');
    } finally {
      setLoading(false);
    }
  };

  // Filter students based on search
  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleManageBooks = (student) => {
    setSelectedStudent(student);
    setAssignmentModalOpen(true);
  };

  const handleEditProfile = (student) => {
    setSelectedStudent(student);
    setProfileModalOpen(true);
  };

  const refreshStudents = () => {
    loadOnlineStudents();
  };

  // Styles
  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: SPACING.LG,
  };

  const toolbarStyle = {
    display: 'flex',
    gap: SPACING.MD,
    alignItems: 'center',
    marginBottom: SPACING.LG,
    flexWrap: 'wrap',
  };

  const searchInputStyle = {
    flex: 1,
    minWidth: '200px',
    padding: `${SPACING.SM} ${SPACING.MD}`,
    borderRadius: BORDER_RADIUS.MD,
    border: '1px solid rgba(255,255,255,0.2)',
    fontSize: FONT_SIZES.SM,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.9)',
  };

  const buttonStyle = {
    padding: `${SPACING.SM} ${SPACING.LG}`,
    borderRadius: BORDER_RADIUS.MD,
    border: 'none',
    cursor: 'pointer',
    fontWeight: FONT_WEIGHTS.MEDIUM,
    fontSize: FONT_SIZES.SM,
    transition: 'all 0.3s ease',
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: COLORS.PRIMARY,
    color: COLORS.WHITE,
  };

  const outlineButtonStyle = {
    ...buttonStyle,
    backgroundColor: 'transparent',
    color: 'rgba(196, 181, 253, 1)',
    border: '1px solid rgba(139, 92, 246, 0.7)',
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.9)',
    border: '1px solid rgba(255,255,255,0.2)',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
  };

  const tableHeaderStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
  };

  const thStyle = {
    padding: SPACING.MD,
    textAlign: 'left',
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: 'rgba(255, 255, 255, 0.8)',
  };

  const tdStyle = {
    padding: SPACING.MD,
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    fontSize: FONT_SIZES.SM,
    color: 'rgba(255, 255, 255, 0.9)',
  };

  const tableRowHoverStyle = {
    cursor: 'pointer',
  };

  const chipStyle = {
    display: 'inline-block',
    padding: `${SPACING.XS} ${SPACING.MD}`,
    borderRadius: BORDER_RADIUS.FULL,
    fontSize: FONT_SIZES.XS,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    color: 'rgba(196, 181, 253, 1)',
    border: '1px solid rgba(139, 92, 246, 0.4)',
  };

  const emptyStateStyle = {
    textAlign: 'center',
    padding: SPACING.XL,
    color: 'rgba(255, 255, 255, 0.5)',
  };

  const loadingStyle = {
    textAlign: 'center',
    padding: SPACING.LG,
    color: 'rgba(255, 255, 255, 0.7)',
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={loadingStyle}>
          <p>Loading online students...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <PageHeader
        icon="🎓"
        title="Online Student Manager"
        subtitle="Manage course assignments and time slots for online students"
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: SPACING.LG,
        background: 'rgba(255,255,255,0.08)', borderRadius: BORDER_RADIUS.MD,
        border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
        {[{ key: 'students', label: '👨‍🎓 Students' }, { key: 'timeslots', label: '🗓 Time Slots' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ flex: 1, padding: `${SPACING.SM} ${SPACING.MD}`,
              border: 'none', cursor: 'pointer', fontSize: FONT_SIZES.SM,
              fontWeight: activeTab === tab.key ? FONT_WEIGHTS.BOLD : FONT_WEIGHTS.MEDIUM,
              background: activeTab === tab.key ? 'rgba(255,255,255,0.15)' : 'transparent',
              color: activeTab === tab.key ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)',
              borderBottom: activeTab === tab.key ? '2px solid rgba(196,181,253,1)' : '2px solid transparent',
              transition: 'all 0.2s', }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'students' && (
        <>
          {/* Stats Row */}
          <div style={{ display: 'flex', gap: SPACING.MD, marginBottom: SPACING.LG, flexWrap: 'wrap' }}>
            <StatCard title="Online Students" value={students.length} color="purple" />
            <StatCard
              title="With Books"
              value={students.filter((s) => s.enrollment_count > 0).length}
              color="green"
            />
            <StatCard title="Showing" value={filteredStudents.length} color="blue" />
          </div>

          {/* Error Alert */}
          {error && (
            <div style={{
              padding: SPACING.MD,
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              borderRadius: BORDER_RADIUS.MD,
              marginBottom: SPACING.MD,
              fontSize: FONT_SIZES.SM,
            }}>
              {error}
            </div>
          )}

          {/* Search & Actions Toolbar */}
          <div style={toolbarStyle}>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={searchInputStyle}
            />
            <button onClick={loadOnlineStudents} style={secondaryButtonStyle}>↻ Refresh</button>
            <button onClick={() => setNewStudentModalOpen(true)} style={primaryButtonStyle}>+ New Online Student</button>
          </div>

          {/* Students Table */}
          {filteredStudents.length > 0 ? (
            <table style={tableStyle}>
              <thead style={tableHeaderStyle}>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>School</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Courses</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} style={tableRowHoverStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = COLORS.LIGHT_GRAY;
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                  }}>
                    <td style={tdStyle}><strong>{student.name}</strong></td>
                    <td style={tdStyle}>{student.email || '-'}</td>
                    <td style={tdStyle}>{student.school_name}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={chipStyle}>{student.enrollment_count} Course(s)</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: SPACING.SM, justifyContent: 'flex-end' }}>
                        <button onClick={() => handleEditProfile(student)} style={outlineButtonStyle}>Edit Profile</button>
                        <button onClick={() => handleManageBooks(student)} style={primaryButtonStyle}>Manage Books</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{
              ...emptyStateStyle,
              backgroundColor: COLORS.LIGHT_GRAY,
              borderRadius: BORDER_RADIUS.MD,
              minHeight: '300px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {searchTerm ? 'No students found matching your search' : 'No online students found'}
            </div>
          )}

          <p style={{ marginTop: SPACING.MD, fontSize: FONT_SIZES.SM, color: 'rgba(255,255,255,0.5)' }}>
            Showing {filteredStudents.length} of {students.length} online student(s)
          </p>
        </>
      )}

      {activeTab === 'timeslots' && <TimeSlotTab />}

      {/* Assignment Modal */}
      <OnlineStudentCourseAssignmentModal
        open={assignmentModalOpen}
        onClose={() => {
          setAssignmentModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        onAssignmentComplete={refreshStudents}
      />

      <OnlineStudentProfileEditModal
        open={profileModalOpen}
        onClose={() => {
          setProfileModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        onProfileUpdated={refreshStudents}
      />

      {newStudentModalOpen && (
        <NewStudentModal
          onSave={() => { setNewStudentModalOpen(false); loadOnlineStudents(); }}
          onClose={() => setNewStudentModalOpen(false)}
        />
      )}
    </div>
  );
};

export default OnlineStudentManager;
