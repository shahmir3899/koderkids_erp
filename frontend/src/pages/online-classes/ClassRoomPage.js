// frontend/src/pages/online-classes/ClassRoomPage.js
// Live classroom — connected to LiveKit via livekit-client SDK.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Room, RoomEvent, Track } from 'livekit-client';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../utils/designConstants';
import { endSession, getParticipants, getRoomToken, startSession } from '../../services/onlineClassService';

// ── Remote participant tile ───────────────────────────────────────────────────
const RemoteTile = ({ participant }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const attachAll = () => {
      const cameraPub = participant.getTrackPublication(Track.Source.Camera);
      if (cameraPub?.track && videoRef.current) cameraPub.track.attach(videoRef.current);

      const micPub = participant.getTrackPublication(Track.Source.Microphone);
      if (micPub?.track) micPub.track.attach(); // audio plays without an element
    };

    attachAll();
    participant.on('trackSubscribed', attachAll);
    participant.on('trackUnsubscribed', (track) => track.detach());

    return () => {
      participant.off('trackSubscribed', attachAll);
      Array.from(participant.videoTrackPublications.values()).forEach((p) => p.track?.detach());
      Array.from(participant.audioTrackPublications.values()).forEach((p) => p.track?.detach());
    };
  }, [participant]);

  return (
    <div style={{
      position: 'relative', background: '#111', borderRadius: 12,
      overflow: 'hidden', aspectRatio: '16/9', flex: '1 1 300px', minHeight: 180,
    }}>
      <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <span style={{
        position: 'absolute', bottom: 8, left: 10, color: '#fff', fontSize: 12,
        background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4,
      }}>
        {participant.identity}
      </span>
    </div>
  );
};

// ── Main ClassRoom component ──────────────────────────────────────────────────
const ClassRoomPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const role = localStorage.getItem('role') || 'Student';
  const isTeacher = role === 'Teacher' || role === 'Admin';

  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState([]);

  // Sidebar state
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const roomRef = useRef(null);
  const localVideoRef = useRef(null);

  const syncRemote = useCallback(() => {
    if (!roomRef.current) return;
    setRemoteParticipants([...roomRef.current.remoteParticipants.values()]);
  }, []);

  useEffect(() => {
    let room;

    const init = async () => {
      try {
        const tokenData = await getRoomToken(sessionId);

        if (isTeacher) await startSession(sessionId).catch(() => {});

        room = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;

        room
          .on(RoomEvent.ParticipantConnected, syncRemote)
          .on(RoomEvent.ParticipantDisconnected, syncRemote)
          .on(RoomEvent.TrackSubscribed, syncRemote)
          .on(RoomEvent.TrackUnsubscribed, syncRemote)
          .on(RoomEvent.LocalTrackPublished, (pub) => {
            if (pub.source === Track.Source.Camera && localVideoRef.current) {
              pub.track?.attach(localVideoRef.current);
            }
          })
          .on(RoomEvent.Disconnected, () => {
            navigate(isTeacher ? '/online-classes/teacher' : '/online-classes');
          });

        await room.connect(tokenData.livekit_url, tokenData.token);
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);

        // Attach local camera in case LocalTrackPublished fired before listener was registered
        const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
        if (camPub?.track && localVideoRef.current) camPub.track.attach(localVideoRef.current);

        setConnecting(false);
        syncRemote();
      } catch (err) {
        setError(err.message || 'Failed to connect to class');
        setConnecting(false);
      }
    };

    init();
    return () => { if (room) room.disconnect(); };
  }, [sessionId, isTeacher, syncRemote, navigate]);

  const toggleMic = async () => {
    if (!roomRef.current) return;
    const next = !micOn;
    await roomRef.current.localParticipant.setMicrophoneEnabled(next).catch(() => {});
    setMicOn(next);
  };

  const toggleCam = async () => {
    if (!roomRef.current) return;
    const next = !camOn;
    await roomRef.current.localParticipant.setCameraEnabled(next).catch(() => {});
    setCamOn(next);
    if (next) {
      const pub = roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera);
      if (pub?.track && localVideoRef.current) pub.track.attach(localVideoRef.current);
    }
  };

  const toggleScreenShare = async () => {
    if (!roomRef.current) return;
    if (sharing) {
      await roomRef.current.localParticipant.setScreenShareEnabled(false).catch(() => {});
      setSharing(false);
    } else {
      try {
        await roomRef.current.localParticipant.setScreenShareEnabled(true);
        setSharing(true);
      } catch { setSharing(false); }
    }
  };

  const handleEndOrLeave = useCallback(async () => {
    if (roomRef.current) roomRef.current.disconnect();
    if (isTeacher) await endSession(sessionId).catch(() => {});
    navigate(isTeacher ? '/online-classes/teacher' : '/online-classes');
  }, [isTeacher, sessionId, navigate]);

  const fetchParticipants = async () => {
    if (!isTeacher) return;
    try { const data = await getParticipants(sessionId); setParticipants(data); } catch { /* silent */ }
  };

  const toggleParticipants = () => {
    if (!participantsOpen) fetchParticipants();
    setParticipantsOpen(!participantsOpen);
    setChatOpen(false);
  };

  const sendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), author: 'You', text: chatInput.trim(), time: new Date().toLocaleTimeString() },
    ]);
    setChatInput('');
  };

  const styles = getStyles();

  if (connecting) {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Connecting to class…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.errorBox}>
          <p style={styles.errorTitle}>Connection failed</p>
          <p style={styles.errorMsg}>{error}</p>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.room}>
      {/* ── Main video area ── */}
      <div style={styles.main}>
        {remoteParticipants.length === 0 ? (
          <div style={styles.remotePlaceholder}>
            <span style={{ fontSize: 56 }}>📡</span>
            <p style={styles.remoteHint}>Waiting for others to join…</p>
            <p style={styles.remoteHintSmall}>You are connected · share the class link to invite students</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING[3], flex: 1, alignContent: 'flex-start', overflowY: 'auto' }}>
            {remoteParticipants.map((p) => <RemoteTile key={p.sid} participant={p} />)}
          </div>
        )}
      </div>

      {/* ── Local camera picture-in-picture ── */}
      <div style={styles.localVideoWrapper}>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{ ...styles.localVideo, opacity: camOn ? 1 : 0.2 }}
        />
        <div style={styles.localLabel}>You {camOn ? '' : '(cam off)'}</div>
      </div>

      {/* ── Sidebar ── */}
      {(chatOpen || participantsOpen) && (
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <span style={styles.sidebarTitle}>{chatOpen ? 'Chat' : 'Participants'}</span>
            <button onClick={() => { setChatOpen(false); setParticipantsOpen(false); }} style={styles.closeBtn}>✕</button>
          </div>
          {chatOpen && (
            <>
              <div style={styles.messages}>
                {messages.length === 0 && <p style={styles.noMessages}>No messages yet</p>}
                {messages.map((m) => (
                  <div key={m.id} style={styles.message}>
                    <span style={styles.msgAuthor}>{m.author}</span>
                    <span style={styles.msgTime}>{m.time}</span>
                    <p style={styles.msgText}>{m.text}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={sendChat} style={styles.chatForm}>
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message…" style={styles.chatInput} />
                <button type="submit" style={styles.sendBtn}>Send</button>
              </form>
            </>
          )}
          {participantsOpen && (
            <div style={styles.participantList}>
              {participants.length === 0 && <p style={styles.noMessages}>No participants yet</p>}
              {participants.map((p) => (
                <div key={p.id} style={styles.participantRow}>
                  <span style={styles.participantName}>{p.student_name}</span>
                  <span style={styles.participantDur}>{p.duration_mins}m</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Controls bar ── */}
      <div style={styles.controls}>
        <ControlBtn onClick={toggleMic} active={micOn} icon={micOn ? '🎤' : '🔇'} label={micOn ? 'Mute' : 'Unmute'} />
        <ControlBtn onClick={toggleCam} active={camOn} icon="📷" label={camOn ? 'Cam Off' : 'Cam On'} />
        <ControlBtn onClick={toggleScreenShare} active={sharing} icon="🖥" label={sharing ? 'Stop Share' : 'Share Screen'} />
        <ControlBtn onClick={() => { setChatOpen(!chatOpen); setParticipantsOpen(false); }} active={chatOpen} icon="💬" label="Chat" />
        {isTeacher && (
          <ControlBtn onClick={toggleParticipants} active={participantsOpen} icon="👥" label="Students" />
        )}
        {isTeacher ? (
          <button onClick={handleEndOrLeave} style={styles.endBtn}>⏹ End Class</button>
        ) : (
          <button onClick={handleEndOrLeave} style={styles.leaveBtn}>Leave</button>
        )}
      </div>
    </div>
  );
};

const ControlBtn = ({ onClick, active, icon, label }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
      padding: `${SPACING[2]} ${SPACING[3]}`,
      background: active ? 'rgba(176,97,206,0.35)' : 'rgba(255,255,255,0.08)',
      border: `1px solid ${active ? 'rgba(176,97,206,0.6)' : 'rgba(255,255,255,0.12)'}`,
      borderRadius: BORDER_RADIUS.lg,
      color: active ? '#D8AAEE' : 'rgba(255,255,255,0.88)',
      cursor: 'pointer',
      fontSize: FONT_SIZES.xs,
      minWidth: 60,
      fontWeight: active ? FONT_WEIGHTS.semibold : FONT_WEIGHTS.medium,
    }}
  >
    <span style={{ fontSize: 20 }}>{icon}</span>
    <span>{label}</span>
  </button>
);

const getStyles = () => ({
  room: {
    display: 'flex',
    flexDirection: 'row',
    height: '100vh',
    background: '#1a1a2e',
    color: '#fff',
    position: 'relative',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: SPACING[4],
    gap: SPACING[4],
    paddingBottom: 90, // controls bar height
    overflow: 'hidden',
  },
  localVideoWrapper: {
    position: 'fixed',
    bottom: 90,
    right: SPACING[4],
    width: 180,
    aspectRatio: '16/9',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    background: '#111',
    boxShadow: '0 0 0 2px rgba(176,97,206,0.7), 0 4px 20px rgba(0,0,0,0.6)',
    zIndex: 10,
  },
  localVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
  },
  localLabel: {
    position: 'absolute',
    bottom: 4,
    left: 6,
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    background: 'rgba(0,0,0,0.4)',
    padding: '1px 4px',
    borderRadius: 4,
  },
  remotePlaceholder: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(176,97,206,0.06)',
    borderRadius: BORDER_RADIUS['2xl'],
    border: '1px dashed rgba(176,97,206,0.35)',
    gap: SPACING[3],
    padding: SPACING[8],
    textAlign: 'center',
  },
  remoteHint: { color: 'rgba(255,255,255,0.8)', fontSize: FONT_SIZES.base, margin: 0, fontWeight: FONT_WEIGHTS.medium },
  remoteHintSmall: { color: 'rgba(255,255,255,0.45)', fontSize: FONT_SIZES.xs, margin: 0 },
  sidebar: {
    width: 300,
    background: '#16213e',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: 90,
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING[4],
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  sidebarTitle: { fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.base },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: 18,
  },
  messages: { flex: 1, overflowY: 'auto', padding: SPACING[3], display: 'flex', flexDirection: 'column', gap: SPACING[2] },
  noMessages: { color: 'rgba(255,255,255,0.4)', fontSize: FONT_SIZES.sm, textAlign: 'center', marginTop: SPACING[4] },
  message: { background: 'rgba(255,255,255,0.06)', borderRadius: BORDER_RADIUS.lg, padding: SPACING[3] },
  msgAuthor: { fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.xs, color: COLORS.primaryLight },
  msgTime: { fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.4)', marginLeft: SPACING[2] },
  msgText: { margin: 0, fontSize: FONT_SIZES.sm, marginTop: 2 },
  chatForm: { display: 'flex', padding: SPACING[3], gap: SPACING[2], borderTop: '1px solid rgba(255,255,255,0.1)' },
  chatInput: {
    flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: BORDER_RADIUS.lg, padding: `${SPACING[2]} ${SPACING[3]}`,
    color: '#fff', fontSize: FONT_SIZES.sm, outline: 'none',
  },
  sendBtn: {
    background: COLORS.primary, border: 'none', borderRadius: BORDER_RADIUS.lg,
    color: '#fff', padding: `${SPACING[2]} ${SPACING[3]}`, cursor: 'pointer', fontSize: FONT_SIZES.sm,
  },
  participantList: { flex: 1, overflowY: 'auto', padding: SPACING[3], display: 'flex', flexDirection: 'column', gap: SPACING[2] },
  participantRow: {
    display: 'flex', justifyContent: 'space-between', padding: SPACING[3],
    background: 'rgba(255,255,255,0.06)', borderRadius: BORDER_RADIUS.lg,
  },
  participantName: { fontSize: FONT_SIZES.sm },
  participantDur: { fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.5)' },
  controls: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    background: 'rgba(8,8,20,0.96)',
    backdropFilter: 'blur(16px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    padding: `0 ${SPACING[4]}`,
    zIndex: 20,
    borderTop: '1px solid rgba(176,97,206,0.2)',
  },
  endBtn: {
    background: COLORS.status.error,
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    color: '#fff',
    padding: `${SPACING[2]} ${SPACING[5]}`,
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: FONT_SIZES.sm,
    cursor: 'pointer',
    marginLeft: SPACING[4],
  },
  leaveBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: BORDER_RADIUS.lg,
    color: '#fff',
    padding: `${SPACING[2]} ${SPACING[5]}`,
    fontSize: FONT_SIZES.sm,
    cursor: 'pointer',
    marginLeft: SPACING[4],
  },
  fullscreen: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1a2e',
    color: '#fff',
  },
  loadingBox: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACING[4] },
  spinner: {
    width: 40, height: 40,
    border: '3px solid rgba(255,255,255,0.2)',
    borderTop: `3px solid ${COLORS.primary}`,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: { color: 'rgba(255,255,255,0.7)', fontSize: FONT_SIZES.base },
  errorBox: { textAlign: 'center', maxWidth: 400, padding: SPACING[8] },
  errorTitle: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.status.error },
  errorMsg: { color: 'rgba(255,255,255,0.7)', fontSize: FONT_SIZES.sm },
  backBtn: {
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: BORDER_RADIUS.lg, color: '#fff', padding: `${SPACING[3]} ${SPACING[6]}`,
    cursor: 'pointer', fontSize: FONT_SIZES.sm,
  },
});

export default ClassRoomPage;

