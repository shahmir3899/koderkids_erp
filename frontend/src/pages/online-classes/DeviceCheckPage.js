// frontend/src/pages/online-classes/DeviceCheckPage.js
// Pre-join device setup: camera, mic, speaker check

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdVideocam, MdMic, MdCheckCircle, MdCancel } from 'react-icons/md';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../utils/designConstants';

const DeviceCheckPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  const [cameraOk, setCameraOk] = useState(null);   // null | true | false
  const [micLevel, setMicLevel] = useState(0);       // 0-100
  const [cameraError, setCameraError] = useState('');
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [cameras, setCameras] = useState([]);
  const [mics, setMics] = useState([]);
  const [ready, setReady] = useState(false);

  // Enumerate devices after permission is granted
  const enumerateDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    setCameras(devices.filter((d) => d.kind === 'videoinput'));
    setMics(devices.filter((d) => d.kind === 'audioinput'));
  };

  const startStream = async (cameraId, micId) => {
    // Stop previous stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    try {
      const constraints = {
        video: cameraId ? { deviceId: { exact: cameraId } } : true,
        audio: micId ? { deviceId: { exact: micId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Mic level meter
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const tick = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(100, Math.round((avg / 255) * 100 * 3)));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();

      setCameraOk(true);
      setCameraError('');
      setReady(true);
      await enumerateDevices();
    } catch (err) {
      setCameraOk(false);
      setReady(false);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera/microphone access denied. Please allow access in your browser settings.'
          : `Device error: ${err.message}`
      );
    }
  };

  useEffect(() => {
    startStream('', '');
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCameraChange = (e) => {
    setSelectedCamera(e.target.value);
    startStream(e.target.value, selectedMic);
  };

  const handleMicChange = (e) => {
    setSelectedMic(e.target.value);
    startStream(selectedCamera, e.target.value);
  };

  const handleJoin = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    navigate(`/online-classes/room/${sessionId}`);
  };

  const styles = getStyles();

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.contextRow}>
          <span style={styles.contextChip}>Pre-Join Check</span>
          <span style={styles.contextSession}>Session #{sessionId}</span>
        </div>
        <h2 style={styles.title}>Device Setup</h2>
        <p style={styles.subtitle}>Make sure your camera and microphone are working before joining.</p>

        {/* Camera preview */}
        <div style={styles.videoWrapper}>
          <div style={styles.previewChip}>Preview</div>
          <video
            ref={videoRef}
            muted
            playsInline
            style={styles.video}
          />
          {cameraOk === false && (
            <div style={styles.videoError}>
              <span style={{ fontSize: 32 }}>📷</span>
              <p style={{ margin: 0, fontSize: FONT_SIZES.sm }}>{cameraError}</p>
            </div>
          )}
        </div>

        {/* Mic level */}
        <div style={styles.section}>
          <label style={styles.label}>Microphone Level</label>
          <div style={styles.meterTrack}>
            <div style={{ ...styles.meterFill, width: `${micLevel}%`, background: micLevel > 60 ? COLORS.status.success : COLORS.primary }} />
          </div>
          <span style={styles.hint}>{micLevel > 5 ? 'Mic is working' : 'Speak to test your mic'}</span>
        </div>

        {/* Device selectors */}
        {cameras.length > 0 && (
          <div style={styles.section}>
            <label style={styles.label}>Video Source</label>
            <div style={styles.filterControlRow}>
              <div style={styles.sourceStatus}>
                <MdVideocam size={16} />
                {cameraOk === false ? <MdCancel size={16} color="#ff8aa1" /> : <MdCheckCircle size={16} color="#8ef0b0" />}
              </div>
              <select style={styles.select} value={selectedCamera} onChange={handleCameraChange}>
                {cameras.map((d) => (
                  <option style={styles.selectOption} key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 6)}`}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {mics.length > 1 && (
          <div style={styles.section}>
            <label style={styles.label}>Audio Source</label>
            <div style={styles.filterControlRow}>
              <div style={styles.sourceStatus}>
                <MdMic size={16} />
                {micLevel > 5 ? <MdCheckCircle size={16} color="#8ef0b0" /> : <MdCancel size={16} color="#ff8aa1" />}
              </div>
              <select style={styles.select} value={selectedMic} onChange={handleMicChange}>
                {mics.map((d) => (
                  <option style={styles.selectOption} key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {cameraError && <p style={styles.errorText}>{cameraError}</p>}

        <div style={styles.actions}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <span style={styles.btnIcon}>←</span>
            <span>Back</span>
          </button>
          <button onClick={handleJoin} disabled={!ready} style={ready ? styles.joinBtn : styles.joinBtnDisabled}>
            <span style={styles.btnIcon}>✓</span>
            <span>Join Class</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const getStyles = () => {
  const s1 = SPACING[1] || SPACING.sm || '0.5rem';
  const s2 = SPACING[2] || SPACING.md || '0.75rem';
  const s3 = SPACING[3] || SPACING.lg || '1rem';
  const s4 = SPACING[4] || SPACING.xl || '1.5rem';
  const s8 = SPACING[8] || SPACING['2xl'] || '2rem';

  return {
    page: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: s4,
      background: COLORS.background.gradient,
    },
    card: {
      ...MIXINS.glassmorphicCard,
      borderRadius: 20,
      padding: s8,
      width: '100%',
      maxWidth: 520,
      boxShadow: '0 20px 48px rgba(32, 22, 70, 0.22)',
      display: 'flex',
      flexDirection: 'column',
      gap: s4,
    },
    contextRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: s2,
      marginBottom: '-2px',
    },
    contextChip: {
      fontSize: FONT_SIZES.xs,
      color: 'rgba(220,230,255,0.9)',
      background: 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: 999,
      padding: '4px 10px',
      fontWeight: FONT_WEIGHTS.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    contextSession: {
      fontSize: FONT_SIZES.xs,
      color: 'rgba(214,222,248,0.66)',
      fontWeight: FONT_WEIGHTS.medium,
    },
    title: {
      fontSize: FONT_SIZES['2xl'],
      fontWeight: FONT_WEIGHTS.bold,
      color: '#f6f8ff',
      margin: 0,
    },
    subtitle: {
      fontSize: FONT_SIZES.sm,
      color: 'rgba(214,222,248,0.75)',
      margin: 0,
    },
    videoWrapper: {
      position: 'relative',
      background: '#090d20',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.16)',
      boxShadow: '0 10px 28px rgba(0,0,0,0.34)',
      overflow: 'hidden',
      aspectRatio: '16/9',
    },
    previewChip: {
      position: 'absolute',
      top: 10,
      left: 10,
      zIndex: 2,
      fontSize: FONT_SIZES.xs,
      fontWeight: FONT_WEIGHTS.semibold,
      color: '#d7e6ff',
      background: 'rgba(10,15,35,0.72)',
      border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: 999,
      padding: '3px 10px',
      backdropFilter: 'blur(6px)',
    },
    video: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transform: 'scaleX(-1)',
    },
    videoError: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s2,
      color: '#fff',
      padding: s4,
      textAlign: 'center',
    },
    section: {
      display: 'flex',
      flexDirection: 'column',
      gap: s1,
    },
    filterControlRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    label: {
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.semibold,
      color: 'rgba(228,234,255,0.92)',
      letterSpacing: 0.2,
    },
    sourceStatus: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      color: 'rgba(180,232,255,0.95)',
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 10,
      padding: '8px 10px',
      flexShrink: 0,
    },
    meterTrack: {
      height: 8,
      background: 'rgba(255,255,255,0.14)',
      borderRadius: BORDER_RADIUS.full,
      overflow: 'hidden',
    },
    meterFill: {
      height: '100%',
      borderRadius: BORDER_RADIUS.full,
      transition: 'width 0.1s ease',
    },
    hint: {
      fontSize: FONT_SIZES.xs,
      color: 'rgba(176,248,198,0.9)',
      fontWeight: FONT_WEIGHTS.medium,
    },
    select: {
      flex: 1,
      padding: `${s2} ${s3}`,
      border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: BORDER_RADIUS.md,
      fontSize: FONT_SIZES.sm,
      color: '#eef2ff',
      background: 'rgba(255,255,255,0.08)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      appearance: 'none',
      WebkitAppearance: 'none',
      MozAppearance: 'none',
      backgroundImage: 'linear-gradient(45deg, transparent 50%, rgba(230,236,255,0.85) 50%), linear-gradient(135deg, rgba(230,236,255,0.85) 50%, transparent 50%)',
      backgroundPosition: 'calc(100% - 16px) calc(50% - 2px), calc(100% - 10px) calc(50% - 2px)',
      backgroundSize: '6px 6px, 6px 6px',
      backgroundRepeat: 'no-repeat',
      paddingRight: 36,
    },
    selectOption: {
      background: '#121937',
      color: '#eef2ff',
    },
    actions: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: s3,
      marginTop: s2,
      padding: 6,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 14,
      boxShadow: '0 8px 20px rgba(12,16,30,0.22)',
    },
    btnIcon: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 18,
      height: 18,
      fontSize: 14,
    },
    backBtn: {
      width: '100%',
      height: 46,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: `0 ${s4}`,
      background: 'rgba(25,31,55,0.82)',
      border: '1px solid rgba(255,255,255,0.16)',
      borderRadius: 12,
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.medium,
      cursor: 'pointer',
      color: 'rgba(245,248,255,0.94)',
      transition: 'all 140ms ease',
      boxShadow: '0 5px 14px rgba(7,10,24,0.2)',
    },
    joinBtn: {
      width: '100%',
      height: 46,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: `0 ${s4}`,
      background: 'linear-gradient(135deg, #bb74ea, #9a58cb)',
      border: '1px solid rgba(156,97,214,0.5)',
      borderRadius: 12,
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.semibold,
      color: '#fff',
      cursor: 'pointer',
      transition: 'all 140ms ease',
      boxShadow: '0 8px 20px rgba(156,97,214,0.3)',
    },
    joinBtnDisabled: {
      width: '100%',
      height: 46,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: `0 ${s4}`,
      background: 'rgba(210,214,224,0.85)',
      border: '1px solid rgba(190,196,210,0.95)',
      borderRadius: 12,
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.medium,
      color: 'rgba(104,112,128,0.95)',
      cursor: 'not-allowed',
    },
    errorText: { color: COLORS.status.error, fontSize: FONT_SIZES.sm, margin: 0 },
  };
};

export default DeviceCheckPage;
