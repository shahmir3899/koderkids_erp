// frontend/src/pages/online-classes/ClassRoomPage.js
// Live classroom — connected to LiveKit via livekit-client SDK.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Room, RoomEvent, Track } from 'livekit-client';
import { BackgroundBlur } from '@livekit/track-processors';
import { MdMic, MdMicOff, MdVideocam, MdVideocamOff, MdScreenShare, MdStopScreenShare, MdChat, MdPeople, MdBlurOn, MdBlurOff, MdExitToApp, MdStop, MdSend } from 'react-icons/md';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../utils/designConstants';
import { endSession, getSession, getRoomToken, startSession } from '../../services/onlineClassService';

// ── Remote participant tile (camera + audio) ──────────────────────────────────
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
    // Only detach camera/audio here; screen share is handled by ScreenShareTile
    participant.on('trackUnsubscribed', (track) => {
      if (track.source !== Track.Source.ScreenShare) track.detach();
    });

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
        {participant.name || participant.identity}
      </span>
    </div>
  );
};

// ── Screen share tile — full-width, shown above camera tiles ──────────────────
const ScreenShareTile = ({ participant }) => {
  const screenRef = useRef(null);

  useEffect(() => {
    const onSubscribed = (track, pub) => {
      if (pub.source === Track.Source.ScreenShare && screenRef.current) track.attach(screenRef.current);
    };
    const onUnsubscribed = (track) => {
      if (track.source === Track.Source.ScreenShare) track.detach();
    };

    // Attach if track already subscribed when component mounts
    const existing = participant.getTrackPublication(Track.Source.ScreenShare);
    if (existing?.track && screenRef.current) existing.track.attach(screenRef.current);

    participant.on('trackSubscribed', onSubscribed);
    participant.on('trackUnsubscribed', onUnsubscribed);

    return () => {
      participant.off('trackSubscribed', onSubscribed);
      participant.off('trackUnsubscribed', onUnsubscribed);
      const pub = participant.getTrackPublication(Track.Source.ScreenShare);
      pub?.track?.detach();
    };
  }, [participant]);

  return (
    <div style={{
      position: 'relative', background: '#000', borderRadius: 12,
      overflow: 'hidden', width: '100%', marginBottom: 8,
    }}>
      <video
        ref={screenRef}
        autoPlay
        playsInline
        style={{ width: '100%', maxHeight: '62vh', objectFit: 'contain', display: 'block' }}
      />
      <span style={{
        position: 'absolute', top: 8, left: 10, color: '#fff', fontSize: 12, fontWeight: 600,
        background: 'rgba(176,97,206,0.85)', padding: '3px 10px', borderRadius: 6,
      }}>
        🖥 {participant.name || participant.identity} · Screen
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
  const displayName = localStorage.getItem('full_name') || localStorage.getItem('name') || (isTeacher ? 'Teacher' : 'Student');

  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState([]);

  // Sidebar state
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const [blurEnabled, setBlurEnabled] = useState(false);
  const [toast, setToast] = useState('');
  const [screenReqFrom, setScreenReqFrom] = useState('');
  const [sessionInfo, setSessionInfo] = useState(null);

  const roomRef = useRef(null);
  const localVideoRef = useRef(null);
  const toastTimerRef = useRef(null);

  const syncRemote = useCallback(() => {
    if (!roomRef.current) return;
    setRemoteParticipants([...roomRef.current.remoteParticipants.values()]);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 4000);
  }, []);

  // Fetch session metadata (non-blocking — failure just means no header title)
  useEffect(() => {
    getSession(sessionId).then(setSessionInfo).catch(() => {});
  }, [sessionId]);

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
          .on(RoomEvent.TrackMuted, syncRemote)
          .on(RoomEvent.TrackUnmuted, syncRemote)
          .on(RoomEvent.DataReceived, (data) => {
            try {
              const msg = JSON.parse(new TextDecoder().decode(data));
              if (msg.type === 'teacher_control') {
                const byName = msg.by || 'Teacher';
                if (msg.action === 'mute_mic') {
                  room.localParticipant.setMicrophoneEnabled(false).catch(() => {});
                  setMicOn(false);
                  showToast(`${byName} muted your microphone`);
                } else if (msg.action === 'unmute_mic') {
                  room.localParticipant.setMicrophoneEnabled(true).catch(() => {});
                  setMicOn(true);
                  showToast(`${byName} unmuted your microphone`);
                } else if (msg.action === 'disable_cam') {
                  room.localParticipant.setCameraEnabled(false).catch(() => {});
                  setCamOn(false);
                  showToast(`${byName} turned off your camera`);
                } else if (msg.action === 'enable_cam') {
                  room.localParticipant.setCameraEnabled(true).catch(() => {});
                  setCamOn(true);
                  showToast(`${byName} turned on your camera`);
                } else if (msg.action === 'request_screen') {
                  setScreenReqFrom(byName);
                }
              } else {
                setMessages((prev) => [...prev, { id: Date.now() + Math.random(), ...msg }]);
              }
            } catch { /* ignore malformed packets */ }
          })
          .on(RoomEvent.Disconnected, () => {
            navigate(isTeacher ? '/online-classes/teacher' : '/online-classes');
          });

        await room.connect(tokenData.livekit_url, tokenData.token);
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);

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

  // Attach local camera once the video element is in the DOM (fixes race condition
  // where LocalTrackPublished fires while the loading spinner is still shown).
  useEffect(() => {
    if (connecting || !roomRef.current) return;
    const camPub = roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera);
    if (camPub?.track && localVideoRef.current) camPub.track.attach(localVideoRef.current);
  }, [connecting]);

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

  const toggleBlur = useCallback(async () => {
    if (!roomRef.current) return;
    const camPub = roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera);
    if (!camPub?.track) return;
    try {
      if (blurEnabled) {
        await camPub.track.stopProcessor();
        setBlurEnabled(false);
      } else {
        await camPub.track.setProcessor(BackgroundBlur(10));
        setBlurEnabled(true);
      }
    } catch (e) { console.warn('Background blur not supported:', e); }
  }, [blurEnabled]);

  const sendTeacherControl = useCallback((participant, action) => {
    if (!roomRef.current) return;
    const msg = { type: 'teacher_control', action, by: displayName };
    try {
      roomRef.current.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(msg)),
        { reliable: true, destinationIdentities: [participant.identity] },
      );
    } catch {}
  }, [displayName]);

  // Leave without ending — teacher can rejoin, session stays live.
  const handleLeave = useCallback(() => {
    if (roomRef.current) roomRef.current.disconnect();
    navigate(isTeacher ? '/online-classes/teacher' : '/online-classes');
  }, [isTeacher, navigate]);

  // End class permanently — requires confirmation; only teachers should call this.
  const handleEndClass = useCallback(async () => {
    if (!window.confirm('End class for all students? This cannot be undone.')) return;
    if (roomRef.current) roomRef.current.disconnect();
    await endSession(sessionId).catch(() => {});
    navigate('/online-classes/teacher');
  }, [sessionId, navigate]);

  const toggleParticipants = () => {
    setParticipantsOpen(!participantsOpen);
    setChatOpen(false);
  };

  const sendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !roomRef.current) return;
    const msg = { author: displayName, text: chatInput.trim(), time: new Date().toLocaleTimeString() };
    // Add to local state immediately (author shown as 'You')
    setMessages((prev) => [...prev, { id: Date.now(), ...msg, author: 'You' }]);
    // Broadcast to all remote participants via LiveKit data channel
    try {
      roomRef.current.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(msg)),
        { reliable: true },
      );
    } catch { /* room may be disconnecting */ }
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
      {/* ── Top header bar ── */}
      <div style={styles.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={styles.headerTitle}>
            {sessionInfo
              ? [sessionInfo.subject, sessionInfo.class_name].filter(Boolean).join(' · ') || 'Live Class'
              : 'Live Class'}
          </span>
        </div>
        <span style={styles.liveBadge}>●&nbsp;Live</span>
        <div style={styles.participantBadge}>
          <MdPeople size={14} style={{ flexShrink: 0 }} />
          <span>{remoteParticipants.length + 1}</span>
        </div>
      </div>

      {/* ── Main video area ── */}
      <div style={styles.main}>
        {/* Screen share — shown full-width when any participant is sharing */}
        {remoteParticipants
          .filter((p) => p.getTrackPublication(Track.Source.ScreenShare)?.track)
          .map((p) => <ScreenShareTile key={`screen-${p.sid}`} participant={p} />)}

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
              {remoteParticipants.length === 0 && <p style={styles.noMessages}>No participants yet</p>}
              {remoteParticipants.map((p) => (
                <div key={p.sid} style={{ ...styles.participantRow, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                    <span style={styles.participantName}>{p.name || p.identity}</span>
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 4, fontSize: 14 }}>
                      {!p.isMicrophoneEnabled && <span title="Mic off">🔇</span>}
                      {!p.isCameraEnabled && <span title="Cam off">📷</span>}
                    </span>
                  </div>
                  {isTeacher && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => sendTeacherControl(p, p.isMicrophoneEnabled ? 'mute_mic' : 'unmute_mic')}
                        style={styles.studentCtrlBtn}
                      >
                        {p.isMicrophoneEnabled ? '🎤 Mute' : '🔇 Unmute'}
                      </button>
                      <button
                        onClick={() => sendTeacherControl(p, p.isCameraEnabled ? 'disable_cam' : 'enable_cam')}
                        style={styles.studentCtrlBtn}
                      >
                        {p.isCameraEnabled ? '📷 Cam Off' : '📷 Cam On'}
                      </button>
                      <button
                        onClick={() => sendTeacherControl(p, 'request_screen')}
                        style={{ ...styles.studentCtrlBtn, borderColor: 'rgba(176,97,206,0.5)', color: '#D8AAEE' }}
                      >
                        🖥 Request Screen
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Toast notification ── */}
      {toast && <div style={styles.toast}>{toast}</div>}

      {/* ── Screen share request modal (shown on student's screen when teacher requests) ── */}
      {screenReqFrom && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <p style={{ fontWeight: 600, marginBottom: 8, fontSize: FONT_SIZES.base }}>📡 Screen Share Request</p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: FONT_SIZES.sm, marginBottom: 16 }}>
              <strong>{screenReqFrom}</strong> is requesting to view your screen.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ ...styles.sendBtn, flex: 1, padding: `${SPACING[2]} 0` }}
                onClick={async () => {
                  setScreenReqFrom('');
                  try {
                    await roomRef.current?.localParticipant.setScreenShareEnabled(true);
                    setSharing(true);
                  } catch {}
                }}
              >
                Share Screen
              </button>
              <button
                style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: BORDER_RADIUS.lg, color: '#fff', padding: `${SPACING[2]} 0`, cursor: 'pointer', fontSize: FONT_SIZES.sm }}
                onClick={() => setScreenReqFrom('')}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Controls bar ── */}
      <div style={styles.controls}>
        {/* Centred pill grouping the main control buttons */}
        <div style={styles.controlsPill}>
          <ControlBtn onClick={toggleMic} active={micOn} icon={micOn ? <MdMic size={22} /> : <MdMicOff size={22} />} label={micOn ? 'Mute' : 'Unmute'} />
          <ControlBtn onClick={toggleCam} active={camOn} icon={camOn ? <MdVideocam size={22} /> : <MdVideocamOff size={22} />} label={camOn ? 'Cam Off' : 'Cam On'} />
          <ControlBtn onClick={toggleScreenShare} active={sharing} icon={sharing ? <MdStopScreenShare size={22} /> : <MdScreenShare size={22} />} label={sharing ? 'Stop Share' : 'Share Screen'} />
          <ControlBtn onClick={toggleBlur} active={blurEnabled} icon={blurEnabled ? <MdBlurOff size={22} /> : <MdBlurOn size={22} />} label={blurEnabled ? 'Blur Off' : 'Blur BG'} />
          <ControlBtn onClick={() => { setChatOpen(!chatOpen); setParticipantsOpen(false); }} active={chatOpen} icon={<MdChat size={22} />} label="Chat" />
          {isTeacher && (
            <ControlBtn onClick={toggleParticipants} active={participantsOpen} icon={<MdPeople size={22} />} label="Students" />
          )}
        </div>
        {/* Leave / End buttons — right-aligned */}
        <div style={{ position: 'absolute', right: SPACING[4], display: 'flex', gap: SPACING[2] }}>
          {isTeacher ? (
            <>
              <button onClick={handleLeave} style={styles.leaveBtn}><MdExitToApp size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />Leave</button>
              <button onClick={handleEndClass} style={styles.endBtn}><MdStop size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />End Class</button>
            </>
          ) : (
            <button onClick={handleLeave} style={styles.leaveBtn}><MdExitToApp size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />Leave</button>
          )}
        </div>
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
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 24 }}>{icon}</span>
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
  // ── Top header ──
  header: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    background: 'rgba(8,8,20,0.92)',
    backdropFilter: 'blur(14px)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: SPACING[3],
    padding: `0 ${SPACING[5]}`,
    zIndex: 25,
  },
  headerTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  liveBadge: {
    background: 'rgba(34,197,94,0.18)',
    border: '1px solid rgba(34,197,94,0.45)',
    borderRadius: 999,
    color: '#4ade80',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    padding: '3px 10px',
    flexShrink: 0,
  },
  participantBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    padding: '3px 10px',
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.8)',
    flexShrink: 0,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: SPACING[4],
    gap: SPACING[4],
    paddingTop: 68, // header (56) + gap (12)
    paddingBottom: 90, // controls bar height
    overflow: 'hidden',
  },
  // ── PIP — moved to bottom-LEFT above controls ──
  localVideoWrapper: {
    position: 'fixed',
    bottom: 96,
    left: SPACING[4],
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
  messages: { flex: 1, overflowY: 'auto', padding: SPACING[3], display: 'flex', flexDirection: 'column', gap: SPACING[3] },
  noMessages: { color: 'rgba(255,255,255,0.4)', fontSize: FONT_SIZES.sm, textAlign: 'center', marginTop: SPACING[4] },
  // ── Chat bubble styles ──
  msgAvatar: {
    width: 30, height: 30, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: FONT_WEIGHTS.bold, color: '#fff', flexShrink: 0,
  },
  msgAuthor: { fontWeight: FONT_WEIGHTS.semibold, fontSize: 11 },
  msgTime: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  msgBubble: { borderRadius: 16, padding: '8px 12px', fontSize: FONT_SIZES.sm, wordBreak: 'break-word', lineHeight: 1.45 },
  msgBubbleMine: {
    background: 'rgba(176,97,206,0.4)', border: '1px solid rgba(176,97,206,0.5)',
    borderRadius: '16px 16px 4px 16px',
  },
  msgBubbleOther: {
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px 16px 16px 4px',
  },
  chatForm: { display: 'flex', alignItems: 'center', padding: SPACING[3], gap: SPACING[2], borderTop: '1px solid rgba(255,255,255,0.1)' },
  emojiBtn: {
    background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '0 4px', flexShrink: 0,
  },
  chatInput: {
    flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: BORDER_RADIUS.lg, padding: `${SPACING[2]} ${SPACING[3]}`,
    color: '#fff', fontSize: FONT_SIZES.sm, outline: 'none',
  },
  sendIconBtn: {
    background: COLORS.primary, border: 'none', borderRadius: '50%',
    color: '#fff', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
  },
  // kept for modal
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
    padding: `0 ${SPACING[4]}`,
    zIndex: 20,
    borderTop: '1px solid rgba(176,97,206,0.2)',
  },
  // Glassmorphism pill wrapping the main control buttons
  controlsPill: {
    display: 'flex',
    gap: SPACING[1],
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 999,
    padding: `${SPACING[1]} ${SPACING[2]}`,
    backdropFilter: 'blur(8px)',
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
  toast: {
    position: 'fixed',
    top: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(22,33,62,0.96)',
    border: '1px solid rgba(176,97,206,0.5)',
    borderRadius: BORDER_RADIUS.lg,
    color: '#fff',
    padding: `${SPACING[3]} ${SPACING[5]}`,
    fontSize: FONT_SIZES.sm,
    zIndex: 100,
    backdropFilter: 'blur(8px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: '#16213e',
    border: '1px solid rgba(176,97,206,0.4)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[6],
    maxWidth: 360,
    width: '90%',
    color: '#fff',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  studentCtrlBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: BORDER_RADIUS.md,
    color: 'rgba(255,255,255,0.85)',
    padding: `${SPACING[1]} ${SPACING[2]}`,
    cursor: 'pointer',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
});

export default ClassRoomPage;

