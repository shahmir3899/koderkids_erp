// frontend/src/pages/online-classes/DeviceCheckPage.js
// Pre-join device setup: camera, mic, speaker check

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../utils/designConstants';

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
        <h2 style={styles.title}>Device Setup</h2>
        <p style={styles.subtitle}>Make sure your camera and microphone are working before joining.</p>

        {/* Camera preview */}
        <div style={styles.videoWrapper}>
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
        {cameras.length > 1 && (
          <div style={styles.section}>
            <label style={styles.label}>Camera</label>
            <select style={styles.select} value={selectedCamera} onChange={handleCameraChange}>
              {cameras.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 6)}`}</option>
              ))}
            </select>
          </div>
        )}

        {mics.length > 1 && (
          <div style={styles.section}>
            <label style={styles.label}>Microphone</label>
            <select style={styles.select} value={selectedMic} onChange={handleMicChange}>
              {mics.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</option>
              ))}
            </select>
          </div>
        )}

        {/* Checklist */}
        <div style={styles.checklist}>
          <CheckItem label="Camera" ok={cameraOk} />
          <CheckItem label="Microphone" ok={micLevel > 5 ? true : null} />
        </div>

        {cameraError && <p style={styles.errorText}>{cameraError}</p>}

        <div style={styles.actions}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>
          <button onClick={handleJoin} disabled={!ready} style={ready ? styles.joinBtn : styles.joinBtnDisabled}>
            ✓ Join Class
          </button>
        </div>
      </div>
    </div>
  );
};

const CheckItem = ({ label, ok }) => {
  const icon = ok === true ? '✅' : ok === false ? '❌' : '⏳';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: FONT_SIZES.sm }}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
};

const getStyles = () => ({
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[4],
    background: COLORS.background.gray,
  },
  card: {
    background: '#fff',
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[8],
    width: '100%',
    maxWidth: 520,
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING[4],
  },
  title: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.primary,
    margin: 0,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    margin: 0,
  },
  videoWrapper: {
    position: 'relative',
    background: '#111',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    aspectRatio: '16/9',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)', // Mirror
  },
  videoError: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    color: '#fff',
    padding: SPACING[4],
    textAlign: 'center',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING[1],
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.secondary,
  },
  meterTrack: {
    height: 8,
    background: COLORS.border.light,
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
    color: COLORS.text.tertiary,
  },
  select: {
    padding: `${SPACING[2]} ${SPACING[3]}`,
    border: `1px solid ${COLORS.border.default}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.primary,
    background: '#fff',
  },
  checklist: {
    display: 'flex',
    gap: SPACING[4],
    background: COLORS.background.gray,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
  },
  actions: {
    display: 'flex',
    gap: SPACING[3],
    marginTop: SPACING[2],
  },
  backBtn: {
    flex: 1,
    padding: `${SPACING[3]} ${SPACING[4]}`,
    background: 'none',
    border: `1px solid ${COLORS.border.default}`,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.sm,
    cursor: 'pointer',
    color: COLORS.text.secondary,
  },
  joinBtn: {
    flex: 2,
    padding: `${SPACING[3]} ${SPACING[4]}`,
    background: COLORS.primary,
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#fff',
    cursor: 'pointer',
  },
  joinBtnDisabled: {
    flex: 2,
    padding: `${SPACING[3]} ${SPACING[4]}`,
    background: COLORS.border.light,
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.tertiary,
    cursor: 'not-allowed',
  },
  errorText: { color: COLORS.status.error, fontSize: FONT_SIZES.sm, margin: 0 },
});

export default DeviceCheckPage;
