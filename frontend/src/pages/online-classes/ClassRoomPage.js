// frontend/src/pages/online-classes/ClassRoomPage.js
// Live classroom — connected to LiveKit via livekit-client SDK.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Room, RoomEvent, Track } from 'livekit-client';
import { BackgroundBlur } from '@livekit/track-processors';
import { MdMic, MdMicOff, MdVideocam, MdVideocamOff, MdScreenShare, MdStopScreenShare, MdChat, MdPeople, MdBlurOn, MdBlurOff, MdExitToApp, MdStop, MdSend } from 'react-icons/md';
import { ConfirmationModal } from '../../components/common/modals/ConfirmationModal';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../utils/designConstants';
import { endSession, getSession, getRoomToken, startSession } from '../../services/onlineClassService';

// ── Remote participant tile (camera + audio) ──────────────────────────────────
const RemoteTile = ({ participant, useContain = false }) => {
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
      position: 'relative',
      background: 'rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: 16,
      overflow: 'hidden',
      aspectRatio: '16/9',
      minHeight: 220,
      width: '100%',
      boxShadow: '0 12px 28px rgba(63, 46, 132, 0.14)',
      backdropFilter: 'blur(14px)',
    }}>
      <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: useContain ? 'contain' : 'cover' }} />
      <span style={{
        position: 'absolute', bottom: 8, left: 10, color: '#fff', fontSize: 12,
        background: 'rgba(255,255,255,0.16)', padding: '2px 8px', borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)',
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
      position: 'relative',
      background: 'rgba(255,255,255,0.08)',
      borderRadius: 16,
      overflow: 'hidden',
      width: '100%',
      marginBottom: 10,
      border: '1px solid rgba(255,255,255,0.18)',
      boxShadow: '0 14px 32px rgba(63, 46, 132, 0.16)',
      backdropFilter: 'blur(14px)',
    }}>
      <video
        ref={screenRef}
        autoPlay
        playsInline
        style={{ width: '100%', maxHeight: '64vh', objectFit: 'contain', display: 'block' }}
      />
      <span style={{
        position: 'absolute', top: 8, left: 10, color: '#fff', fontSize: 12, fontWeight: 600,
        background: 'rgba(255,255,255,0.16)', padding: '3px 10px', borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)',
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
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [endingClass, setEndingClass] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));
  const [isCompactMobile, setIsCompactMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 390 : false));
  const [hoveredAction, setHoveredAction] = useState('');

  const roomRef = useRef(null);
  const localVideoRef = useRef(null);
  const toastTimerRef = useRef(null);

  const getFriendlyErrorMessage = useCallback((rawError, fallback = 'Something went wrong. Please try again.') => {
    const raw = String(rawError?.message || rawError || '').trim();
    const normalized = raw.toLowerCase();

    if (!raw) return fallback;
    if (normalized.includes('request failed: 500')) {
      return 'Server error while connecting to class. Please retry in a few seconds.';
    }
    if (normalized.includes('request failed: 401') || normalized.includes('request failed: 403')) {
      return 'You do not have permission to join this class.';
    }
    if (normalized.includes('failed to fetch') || normalized.includes('network')) {
      return 'Network issue while connecting. Check your internet and try again.';
    }

    return raw;
  }, []);

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
    const onResize = () => {
      setIsMobileLayout(window.innerWidth <= 768);
      setIsCompactMobile(window.innerWidth <= 390);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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
        setError(getFriendlyErrorMessage(err, 'Failed to connect to class. Please try again.'));
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

  // End class permanently — handled through reusable confirmation modal.
  const handleEndClass = useCallback(() => {
    setEndConfirmOpen(true);
  }, []);

  const confirmEndClass = useCallback(async () => {
    setEndingClass(true);
    try {
      await endSession(sessionId);
      setEndConfirmOpen(false);
      if (roomRef.current) roomRef.current.disconnect();
      navigate('/online-classes/teacher');
    } catch (err) {
      showToast(getFriendlyErrorMessage(err, 'Could not end class right now. Please try again.'));
    } finally {
      setEndingClass(false);
    }
  }, [sessionId, navigate, showToast, getFriendlyErrorMessage]);

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

  const getInitials = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');
  };

  const styles = getStyles(isCompactMobile);
  const sessionTitle = sessionInfo
    ? [sessionInfo.subject, sessionInfo.class_name].filter(Boolean).join(' · ') || 'Live Class'
    : 'Live Class';
  const controlsActionSlotWidth = isTeacher
    ? (isCompactMobile ? 'clamp(192px, 52vw, 238px)' : 'clamp(264px, 32vw, 340px)')
    : 'clamp(112px, 14vw, 132px)';

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
        <div style={{ ...styles.headerMain, minWidth: 0 }}>
          <span style={styles.headerTitle}>{sessionTitle}</span>
          <span style={styles.headerMeta}>Session #{sessionId}</span>
        </div>
        <span style={styles.liveBadge}>
          <span style={styles.liveDot} />
          Live
        </span>
        <div style={styles.participantBadge}>
          <MdPeople size={14} style={{ flexShrink: 0 }} />
          <span>{remoteParticipants.length + 1} Participants</span>
        </div>
      </div>

      {/* ── Main video area ── */}
      <div style={styles.main}>
        <div style={styles.videoStage}>
          {/* Screen share — shown full-width when any participant is sharing */}
          {remoteParticipants
            .filter((p) => p.getTrackPublication(Track.Source.ScreenShare)?.track)
            .map((p) => <ScreenShareTile key={`screen-${p.sid}`} participant={p} />)}

          {remoteParticipants.length === 0 ? (
            <div style={styles.remotePlaceholder}>
              <span style={styles.remotePlaceholderIcon}>📡</span>
              <p style={styles.remoteHint}>Waiting for others to join…</p>
              <p style={styles.remoteHintSmall}>You are connected · share the class link to invite students</p>
            </div>
          ) : (
            <div style={styles.participantGrid}>
              {remoteParticipants.map((p) => <RemoteTile key={p.sid} participant={p} useContain={isMobileLayout} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Local camera picture-in-picture ── */}
      <div
        style={{
          ...styles.localVideoWrapper,
          left: (chatOpen || participantsOpen) ? styles.localVideoLeftCompact : styles.localVideoLeft,
        }}
      >
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{ ...styles.localVideo, objectFit: isMobileLayout ? 'contain' : styles.localVideo.objectFit, opacity: camOn ? 1 : 0.2 }}
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
                {messages.map((m) => {
                  const isMine = m.author === 'You' || m.author === displayName;
                  return (
                    <div key={m.id} style={{ ...styles.messageRow, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      {!isMine && <span style={styles.msgAvatar}>{getInitials(m.author)}</span>}
                      <div style={{ ...styles.msgBubble, ...(isMine ? styles.msgBubbleMine : styles.msgBubbleOther) }}>
                        <div style={styles.msgMeta}>
                          <span style={styles.msgAuthor}>{isMine ? 'You' : m.author}</span>
                          <span style={styles.msgTime}>{m.time}</span>
                        </div>
                        <p style={styles.msgText}>{m.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={sendChat} style={styles.chatForm}>
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message…" style={styles.chatInput} />
                <button type="submit" aria-label="Send message" style={styles.sendIconBtn}><MdSend size={18} /></button>
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
        <div style={{ ...styles.controlsSideSlot, width: controlsActionSlotWidth }} />
        {/* Centred pill grouping the main control buttons */}
        <div style={styles.controlsCenter}>
          <div style={styles.controlsPill}>
            <ControlBtn compact={isCompactMobile} onClick={toggleMic} active={micOn} icon={micOn ? <MdMic size={18} /> : <MdMicOff size={18} />} label={micOn ? 'Mute' : 'Unmute'} />
            <ControlBtn compact={isCompactMobile} onClick={toggleCam} active={camOn} icon={camOn ? <MdVideocam size={18} /> : <MdVideocamOff size={18} />} label={camOn ? 'Cam Off' : 'Cam On'} />
            <ControlBtn compact={isCompactMobile} onClick={toggleScreenShare} active={sharing} icon={sharing ? <MdStopScreenShare size={18} /> : <MdScreenShare size={18} />} label={sharing ? 'Stop Share' : 'Share Screen'} />
            <ControlBtn compact={isCompactMobile} onClick={toggleBlur} active={blurEnabled} icon={blurEnabled ? <MdBlurOff size={18} /> : <MdBlurOn size={18} />} label={blurEnabled ? 'Blur Off' : 'Blur BG'} />
            <ControlBtn compact={isCompactMobile} onClick={() => { setChatOpen(!chatOpen); setParticipantsOpen(false); }} active={chatOpen} icon={<MdChat size={18} />} label="Chat" />
            {isTeacher && (
              <ControlBtn compact={isCompactMobile} onClick={toggleParticipants} active={participantsOpen} icon={<MdPeople size={18} />} label="Students" />
            )}
          </div>
        </div>
        {/* Leave / End buttons — right-aligned */}
        <div
          style={{
            ...styles.controlsActions,
            width: controlsActionSlotWidth,
            marginRight: isCompactMobile ? 12 : 20,
          }}
        >
          {isTeacher ? (
            <>
              <button
                onClick={handleLeave}
                onMouseEnter={() => setHoveredAction('leave')}
                onMouseLeave={() => setHoveredAction('')}
                style={{
                  ...styles.leaveBtn,
                  ...(hoveredAction === 'leave' ? styles.actionBtnHover : {}),
                }}
              >
                <MdExitToApp size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />Leave
              </button>
              <button
                onClick={handleEndClass}
                onMouseEnter={() => setHoveredAction('end')}
                onMouseLeave={() => setHoveredAction('')}
                style={{
                  ...styles.endBtn,
                  ...(hoveredAction === 'end' ? styles.actionBtnHover : {}),
                }}
              >
                <MdStop size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />End Class
              </button>
            </>
          ) : (
            <button
              onClick={handleLeave}
              onMouseEnter={() => setHoveredAction('leave')}
              onMouseLeave={() => setHoveredAction('')}
              style={{
                ...styles.leaveBtn,
                ...(hoveredAction === 'leave' ? styles.actionBtnHover : {}),
              }}
            >
              <MdExitToApp size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />Leave
            </button>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={endConfirmOpen}
        title="End Class"
        message="This will immediately disconnect all students, stop new joins, and move this session to Completed history."
        itemName={sessionTitle}
        confirmText="End Class"
        cancelText="Cancel"
        variant="danger"
        isLoading={endingClass}
        onConfirm={confirmEndClass}
        onCancel={() => setEndConfirmOpen(false)}
      />
    </div>
  );
};

const ControlBtn = ({ onClick, active, icon, label, compact = false }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 6 : 8,
        padding: compact ? `0 ${SPACING[2]}` : `0 ${SPACING[3]}`,
        background: active ? 'rgba(58,78,130,0.6)' : 'rgba(25,31,55,0.82)',
        border: `1px solid ${active ? 'rgba(160,188,255,0.6)' : 'rgba(255,255,255,0.18)'}`,
        borderRadius: 14,
        color: active ? '#ffffff' : 'rgba(245,248,255,0.95)',
        cursor: 'pointer',
        fontSize: FONT_SIZES.xs,
        minWidth: compact ? 82 : 98,
        height: compact ? 38 : 42,
        fontWeight: active ? FONT_WEIGHTS.semibold : FONT_WEIGHTS.medium,
        whiteSpace: 'nowrap',
        transition: 'all 140ms ease',
        boxShadow: active ? '0 6px 14px rgba(18,24,46,0.3)' : '0 4px 10px rgba(7,10,24,0.2)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        filter: hovered ? 'brightness(1.06)' : 'none',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 18, width: 18 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
};

const getStyles = (compact = false) => ({
  room: {
    display: 'flex',
    flexDirection: 'row',
    height: '100vh',
    background: COLORS.background.gradient,
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
    height: 62,
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(14px)',
    borderBottom: '1px solid rgba(255,255,255,0.18)',
    boxShadow: '0 10px 24px rgba(63, 46, 132, 0.14)',
    display: 'flex',
    alignItems: 'center',
    gap: SPACING[2],
    padding: `0 ${SPACING[5]}`,
    zIndex: 25,
  },
  headerMain: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 2,
    flex: 1,
  },
  headerTitle: {
    fontSize: 'clamp(14px, 1.2vw, 17px)',
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  headerMeta: {
    fontSize: 'clamp(10px, 0.8vw, 12px)',
    color: 'rgba(255,255,255,0.72)',
    whiteSpace: 'nowrap',
  },
  liveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(34,197,94,0.18)',
    border: '1px solid rgba(34,197,94,0.45)',
    borderRadius: 999,
    color: '#4ade80',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    padding: '3px 10px',
    flexShrink: 0,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#4ade80',
    boxShadow: '0 0 0 5px rgba(74,222,128,0.12)',
  },
  participantBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: 999,
    padding: '3px 10px',
    fontSize: 'clamp(10px, 0.8vw, 12px)',
    color: 'rgba(255,255,255,0.9)',
    flexShrink: 0,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: compact ? SPACING[2] : SPACING[4],
    gap: SPACING[3],
    paddingTop: 74, // header + gap
    paddingBottom: compact ? 84 : 90, // controls bar height
    overflow: 'hidden',
  },
  videoStage: {
    width: '100%',
    maxWidth: 'min(1220px, 100%)',
    margin: '0 auto',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING[3],
    padding: compact ? '8px' : 'clamp(8px, 1.3vw, 16px)',
    borderRadius: BORDER_RADIUS['2xl'],
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.18)',
    boxShadow: '0 18px 42px rgba(63, 46, 132, 0.16)',
    backdropFilter: 'blur(18px)',
    overflow: 'hidden',
  },
  participantGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
    gap: SPACING[3],
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    paddingRight: SPACING[2],
    alignContent: 'start',
  },
  // ── PIP — moved to bottom-LEFT above controls ──
  localVideoWrapper: {
    position: 'fixed',
    bottom: compact ? 86 : 92,
    left: SPACING[4],
    width: compact ? 'clamp(108px, 30vw, 142px)' : 'clamp(132px, 18vw, 208px)',
    aspectRatio: '16/9',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.22)',
    boxShadow: '0 0 0 2px rgba(255,255,255,0.16), 0 10px 28px rgba(63, 46, 132, 0.18)',
    backdropFilter: 'blur(16px)',
    zIndex: 15,
  },
  localVideoLeft: compact ? SPACING[2] : SPACING[4],
  localVideoLeftCompact: compact ? SPACING[1] : SPACING[3],
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
    background: 'radial-gradient(circle at 50% 35%, rgba(176,97,206,0.16), rgba(176,97,206,0.04) 55%, rgba(255,255,255,0.01) 100%)',
    borderRadius: BORDER_RADIUS['2xl'],
    border: '1px dashed rgba(176,97,206,0.42)',
    gap: SPACING[3],
    padding: SPACING[8],
    textAlign: 'center',
  },
  remotePlaceholderIcon: {
    fontSize: 'clamp(42px, 5vw, 62px)',
    lineHeight: 1,
    filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.35))',
  },
  remoteHint: { color: 'rgba(255,255,255,0.9)', fontSize: 'clamp(16px, 2vw, 22px)', margin: 0, fontWeight: FONT_WEIGHTS.semibold },
  remoteHintSmall: { color: 'rgba(255,255,255,0.78)', fontSize: 'clamp(12px, 1.2vw, 14px)', margin: 0, maxWidth: 460 },
  sidebar: {
    width: 300,
    background: 'rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid rgba(255,255,255,0.18)',
    boxShadow: '-14px 0 30px rgba(63, 46, 132, 0.12)',
    backdropFilter: 'blur(18px)',
    paddingBottom: 90,
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING[4],
    borderBottom: '1px solid rgba(255,255,255,0.12)',
  },
  sidebarTitle: { fontWeight: FONT_WEIGHTS.semibold, fontSize: 'clamp(14px, 1vw, 16px)' },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: 18,
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: SPACING[3],
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING[3],
    background: 'linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.005))',
  },
  messageRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    width: '100%',
  },
  noMessages: { color: 'rgba(255,255,255,0.62)', fontSize: FONT_SIZES.sm, textAlign: 'center', marginTop: SPACING[4] },
  // ── Chat bubble styles ──
  msgAvatar: {
    width: 30, height: 30, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: FONT_WEIGHTS.bold, color: '#fff', flexShrink: 0,
  },
  msgAuthor: { fontWeight: FONT_WEIGHTS.semibold, fontSize: 11 },
  msgTime: { fontSize: 10, color: 'rgba(255,255,255,0.62)' },
  msgMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  msgBubble: { borderRadius: 16, padding: '8px 12px', fontSize: FONT_SIZES.sm, wordBreak: 'break-word', lineHeight: 1.45, maxWidth: '80%' },
  msgBubbleMine: {
    background: 'rgba(176,97,206,0.4)', border: '1px solid rgba(176,97,206,0.5)',
    borderRadius: '16px 16px 4px 16px',
  },
  msgBubbleOther: {
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px 16px 16px 4px',
  },
  msgText: { margin: 0, color: 'rgba(255,255,255,0.95)', fontSize: FONT_SIZES.sm, lineHeight: 1.45, wordBreak: 'break-word' },
  chatForm: {
    display: 'flex',
    alignItems: 'center',
    padding: SPACING[3],
    gap: SPACING[2],
    borderTop: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.08)',
  },
  emojiBtn: {
    background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '0 4px', flexShrink: 0,
  },
  chatInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: BORDER_RADIUS.lg, padding: `${SPACING[2]} ${SPACING[3]}`,
    color: '#fff',
    fontSize: FONT_SIZES.sm,
    outline: 'none',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  sendIconBtn: {
    background: 'linear-gradient(135deg, #bb74ea, #9a58cb)', border: '1px solid rgba(176,97,206,0.5)', borderRadius: '50%',
    color: '#fff', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0, boxShadow: '0 8px 16px rgba(156,97,214,0.28)',
  },
  // kept for modal
  sendBtn: {
    background: COLORS.primary, border: 'none', borderRadius: BORDER_RADIUS.lg,
    color: '#fff', padding: `${SPACING[2]} ${SPACING[3]}`, cursor: 'pointer', fontSize: FONT_SIZES.sm,
  },
  participantList: { flex: 1, overflowY: 'auto', padding: SPACING[3], display: 'flex', flexDirection: 'column', gap: SPACING[2] },
  participantRow: {
    display: 'flex', justifyContent: 'space-between', padding: SPACING[3],
    background: 'rgba(255,255,255,0.1)', borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(255,255,255,0.14)',
    boxShadow: '0 8px 18px rgba(63, 46, 132, 0.08)',
  },
  participantName: { fontSize: FONT_SIZES.sm },
  participantDur: { fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.72)' },
  controls: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: compact ? 74 : 80,
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(16px)',
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    padding: compact ? `0 ${SPACING[2]}` : `0 ${SPACING[4]}`,
    zIndex: 20,
    borderTop: '1px solid rgba(255,255,255,0.18)',
    boxShadow: '0 -10px 28px rgba(63, 46, 132, 0.14)',
  },
  controlsSideSlot: {
    justifySelf: 'start',
    height: 1,
  },
  controlsCenter: {
    justifySelf: 'center',
  },
  // Glassmorphism pill wrapping the main control buttons
  controlsPill: {
    display: 'flex',
    gap: compact ? 8 : 12,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 999,
    padding: compact ? '6px 8px' : '8px 14px',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.24)',
  },
  controlsActions: {
    justifySelf: 'end',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: compact ? 8 : 10,
  },
  actionBtnHover: {
    transform: 'translateY(-1px)',
    filter: 'brightness(1.06)',
  },
  endBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #ff4f7c, #ff2f5f)',
    border: '1px solid rgba(255,120,150,0.55)',
    borderRadius: 14,
    color: '#fff',
    padding: `0 ${SPACING[4]}`,
    height: 42,
    minWidth: compact ? 104 : 118,
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: FONT_SIZES.sm,
    cursor: 'pointer',
    transition: 'all 140ms ease',
    boxShadow: '0 8px 20px rgba(255,47,95,0.26)',
  },
  leaveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 14,
    color: 'rgba(245,248,255,0.94)',
    padding: `0 ${SPACING[4]}`,
    height: 42,
    minWidth: compact ? 92 : 104,
    fontSize: FONT_SIZES.sm,
    cursor: 'pointer',
    transition: 'all 140ms ease',
    boxShadow: '0 5px 14px rgba(7,10,24,0.22)',
  },
  fullscreen: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: COLORS.background.gradient,
    color: '#fff',
    padding: SPACING[4],
  },
  loadingBox: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING[4],
    padding: 0,
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    backdropFilter: 'none',
    minWidth: 0,
  },
  spinner: {
    width: 40, height: 40,
    border: '3px solid rgba(255,255,255,0.2)',
    borderTop: `3px solid ${COLORS.primary}`,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: { color: 'rgba(255,255,255,0.86)', fontSize: FONT_SIZES.base },
  errorBox: {
    ...MIXINS.glassmorphicCard,
    textAlign: 'center',
    maxWidth: 420,
    width: '100%',
    padding: SPACING[8],
    borderRadius: BORDER_RADIUS['2xl'],
    boxShadow: '0 20px 48px rgba(63, 46, 132, 0.16)',
  },
  errorTitle: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.status.error },
  errorMsg: { color: 'rgba(255,255,255,0.86)', fontSize: FONT_SIZES.sm },
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
    background: 'rgba(255,255,255,0.14)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: BORDER_RADIUS.lg,
    color: '#fff',
    padding: `${SPACING[3]} ${SPACING[5]}`,
    fontSize: FONT_SIZES.sm,
    zIndex: 100,
    backdropFilter: 'blur(12px)',
    boxShadow: '0 8px 24px rgba(63, 46, 132, 0.14)',
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
    background: 'rgba(255,255,255,0.14)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[6],
    maxWidth: 360,
    width: '90%',
    color: '#fff',
    boxShadow: '0 20px 42px rgba(63, 46, 132, 0.18)',
    backdropFilter: 'blur(16px)',
  },
  studentCtrlBtn: {
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: BORDER_RADIUS.md,
    color: 'rgba(255,255,255,0.85)',
    padding: `${SPACING[1]} ${SPACING[2]}`,
    cursor: 'pointer',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
});

export default ClassRoomPage;

