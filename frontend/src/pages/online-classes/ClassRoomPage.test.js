// frontend/src/pages/online-classes/ClassRoomPage.test.js
// Tests for: blur BG, teacher remote-control, DataReceived routing, toast, screen-request modal.

import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { TextEncoder, TextDecoder } from 'util';
// react-router-dom is fully mocked below — no real import needed
// (MemoryRouter / Routes / Route are no longer used directly)
import ClassRoomPage from './ClassRoomPage';
import { getRoomToken, getSession, startSession, endSession } from '../../services/onlineClassService';
import { Room } from 'livekit-client';

// JSDOM in this setup doesn't always expose these globals.
global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;

// ─── react-router-dom mock (v7 uses exports field; Jest 27 can't resolve it) ──
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useParams: () => ({ sessionId: '42' }),
  useNavigate: () => mockNavigate,
  // Minimal passthrough wrappers so JSX still renders children
  MemoryRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: ({ element }) => element,
}));

// ─── Service mocks ────────────────────────────────────────────────────────────
jest.mock('../../services/onlineClassService', () => ({
  getRoomToken: jest.fn().mockResolvedValue({
    livekit_url: 'wss://test.livekit.cloud',
    token: 'test-token',
  }),
  getSession: jest.fn().mockResolvedValue({ subject: 'Physics', class_name: 'Grade 11' }),
  startSession: jest.fn().mockResolvedValue({}),
  endSession: jest.fn().mockResolvedValue({}),
}));

// ─── @livekit/track-processors mock ─────────────────────────────────────────
// NOTE: Variables starting with 'mock' are hoisting-safe in jest.mock() factories.
const mockBlurProcessor = { type: 'blur-processor' };
const mockSetProcessor = jest.fn().mockResolvedValue(undefined);
const mockStopProcessor = jest.fn().mockResolvedValue(undefined);

jest.mock('@livekit/track-processors', () => ({
  BackgroundBlur: jest.fn(() => mockBlurProcessor),
}));

// ─── react-icons/md mock ─────────────────────────────────────────────────────
jest.mock('react-icons/md', () => {
  const Icon = (props) => <span {...props} />;
  return {
    MdMic: Icon, MdMicOff: Icon, MdVideocam: Icon, MdVideocamOff: Icon,
    MdScreenShare: Icon, MdStopScreenShare: Icon, MdChat: Icon, MdPeople: Icon,
    MdBlurOn: Icon, MdBlurOff: Icon, MdExitToApp: Icon, MdStop: Icon, MdSend: Icon,
  };
});

// ─── LiveKit Room mock ────────────────────────────────────────────────────────
const roomEventHandlers = {};

const mockLocalParticipant = {
  setCameraEnabled: jest.fn().mockResolvedValue(undefined),
  setMicrophoneEnabled: jest.fn().mockResolvedValue(undefined),
  setScreenShareEnabled: jest.fn().mockResolvedValue(undefined),
  getTrackPublication: jest.fn().mockReturnValue({
    track: {
      attach: jest.fn(),
      detach: jest.fn(),
      setProcessor: mockSetProcessor,
      stopProcessor: mockStopProcessor,
    },
  }),
  publishData: jest.fn(),
};

const mockRoom = {
  on: jest.fn().mockImplementation((event, handler) => {
    roomEventHandlers[event] = handler;
    return mockRoom; // enable chaining
  }),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn(),
  localParticipant: mockLocalParticipant,
  remoteParticipants: new Map(),
};

jest.mock('livekit-client', () => ({
  Room: jest.fn(() => mockRoom),
  RoomEvent: {
    ParticipantConnected: 'participantConnected',
    ParticipantDisconnected: 'participantDisconnected',
    TrackSubscribed: 'trackSubscribed',
    TrackUnsubscribed: 'trackUnsubscribed',
    TrackMuted: 'trackMuted',
    TrackUnmuted: 'trackUnmuted',
    DataReceived: 'dataReceived',
    Disconnected: 'disconnected',
  },
  Track: {
    Source: { Camera: 'camera', Microphone: 'microphone', ScreenShare: 'screenShare' },
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Fire a DataReceived event with a JSON payload. */
const fireDataReceived = (payload) => {
  act(() => {
    const handler = roomEventHandlers['dataReceived'];
    if (handler) handler(new TextEncoder().encode(JSON.stringify(payload)));
  });
};

/** Render ClassRoomPage with the given role (router is mocked above). */
const renderClassRoom = ({ role = 'Teacher' } = {}) => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
    if (key === 'role') return role;
    if (key === 'full_name') return role === 'Teacher' ? 'Test Teacher' : 'Test Student';
    return null;
  });
  return render(<ClassRoomPage />);
};

/** Wait until the room connects and control bar is visible. */
const waitForConnected = () =>
  waitFor(() => expect(screen.getByText('Mute')).toBeInTheDocument(), { timeout: 3000 });

// ─── Reset between tests ──────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();

  // ── Service mocks ──────────────────────────────────────────────────────────
  getRoomToken.mockResolvedValue({ livekit_url: 'wss://test.livekit.cloud', token: 'test-token' });
  getSession.mockResolvedValue({ subject: 'Physics', class_name: 'Grade 11' });
  startSession.mockResolvedValue({});
  endSession.mockResolvedValue({});
  const { BackgroundBlur } = require('@livekit/track-processors');
  BackgroundBlur.mockImplementation(() => mockBlurProcessor);

  // ── livekit-client Room mock (clearAllMocks resets mockReturnValue/mockResolvedValue) ──
  Room.mockImplementation(() => mockRoom);  // restore constructor → mockRoom
  mockRoom.on.mockImplementation((event, handler) => {
    roomEventHandlers[event] = handler;
    return mockRoom;
  });
  mockRoom.connect.mockResolvedValue(undefined);
  mockRoom.disconnect.mockImplementation(() => {});   // ensure it's callable

  // ── localParticipant ──────────────────────────────────────────────────────
  // Re-attach localParticipant reference (clearAllMocks may unset mockReturnValue on Room)
  mockRoom.localParticipant = mockLocalParticipant;
  mockLocalParticipant.setCameraEnabled.mockResolvedValue(undefined);
  mockLocalParticipant.setMicrophoneEnabled.mockResolvedValue(undefined);
  mockLocalParticipant.setScreenShareEnabled.mockResolvedValue(undefined);
  mockLocalParticipant.publishData.mockImplementation(() => {});
  mockLocalParticipant.getTrackPublication.mockReturnValue({
    track: {
      attach: jest.fn(),
      detach: jest.fn(),
      setProcessor: mockSetProcessor,
      stopProcessor: mockStopProcessor,
    },
  });

  // ── track processors ──────────────────────────────────────────────────────
  mockSetProcessor.mockResolvedValue(undefined);
  mockStopProcessor.mockResolvedValue(undefined);

  // ── Clear event handlers and participants ─────────────────────────────────
  Object.keys(roomEventHandlers).forEach((k) => delete roomEventHandlers[k]);
  mockRoom.remoteParticipants = new Map();
});

// ─────────────────────────────────────────────────────────────────────────────
//  Control bar rendering
// ─────────────────────────────────────────────────────────────────────────────
describe('Control bar rendering', () => {
  it('shows all standard buttons once connected', async () => {
    renderClassRoom();
    await waitForConnected();
    expect(screen.getByText('Mute')).toBeInTheDocument();
    expect(screen.getByText('Cam Off')).toBeInTheDocument();
    expect(screen.getByText('Share Screen')).toBeInTheDocument();
    expect(screen.getByText('Blur BG')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('shows Students button for teachers', async () => {
    renderClassRoom({ role: 'Teacher' });
    await waitForConnected();
    expect(screen.getByText('Students')).toBeInTheDocument();
  });

  it('hides Students button for students', async () => {
    renderClassRoom({ role: 'Student' });
    await waitForConnected();
    expect(screen.queryByText('Students')).not.toBeInTheDocument();
  });

  it('shows Leave Class and End Class for teacher', async () => {
    renderClassRoom({ role: 'Teacher' });
    await waitForConnected();
    expect(screen.getByText(/Leave/)).toBeInTheDocument();
    expect(screen.getByText(/End Class/)).toBeInTheDocument();
  });

  it('shows only Leave button for student', async () => {
    renderClassRoom({ role: 'Student' });
    await waitForConnected();
    expect(screen.getByText(/Leave/)).toBeInTheDocument();
    expect(screen.queryByText(/End Class/)).not.toBeInTheDocument();
  });

  it('shows loading spinner while connecting', () => {
    // Don't await — just check spinner is there before connection resolves
    renderClassRoom();
    expect(screen.getByText('Connecting to class…')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Background blur
// ─────────────────────────────────────────────────────────────────────────────
describe('Background blur', () => {
  it('applies BackgroundBlur processor when Blur BG is clicked', async () => {
    renderClassRoom();
    await waitForConnected();
    fireEvent.click(screen.getByText('Blur BG'));
    await waitFor(() => expect(mockSetProcessor).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Blur Off')).toBeInTheDocument());
  });

  it('stops blur processor when Blur Off is clicked', async () => {
    renderClassRoom();
    await waitForConnected();
    // Enable blur first
    fireEvent.click(screen.getByText('Blur BG'));
    await waitFor(() => screen.getByText('Blur Off'));
    // Now disable
    fireEvent.click(screen.getByText('Blur Off'));
    await waitFor(() => expect(mockStopProcessor).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Blur BG')).toBeInTheDocument());
  });

  it('calls BackgroundBlur with intensity 10', async () => {
    const { BackgroundBlur } = require('@livekit/track-processors');
    renderClassRoom();
    await waitForConnected();
    fireEvent.click(screen.getByText('Blur BG'));
    await waitFor(() => expect(BackgroundBlur).toHaveBeenCalledWith(10));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Teacher → student remote control (outgoing messages)
// ─────────────────────────────────────────────────────────────────────────────
describe('Teacher remote control — outgoing', () => {
  const mockStudent = {
    sid: 'sid-alice',
    name: 'Alice',
    identity: 'student-alice',
    isMicrophoneEnabled: true,
    isCameraEnabled: true,
    getTrackPublication: jest.fn().mockReturnValue(null),
    on: jest.fn(),
    off: jest.fn(),
    videoTrackPublications: new Map(),
    audioTrackPublications: new Map(),
  };

  beforeEach(() => {
    mockRoom.remoteParticipants = new Map([['sid-alice', mockStudent]]);
  });

  it('shows per-student controls when Students panel opens', async () => {
    renderClassRoom({ role: 'Teacher' });
    await waitForConnected();
    fireEvent.click(screen.getByText('Students'));
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getByText('🎤 Mute')).toBeInTheDocument();
    expect(screen.getByText('📷 Cam Off')).toBeInTheDocument();
    expect(screen.getByText('🖥 Request Screen')).toBeInTheDocument();
  });

  it('sends mute_mic targeted to the student when Mute is clicked', async () => {
    renderClassRoom({ role: 'Teacher' });
    await waitForConnected();
    fireEvent.click(screen.getByText('Students'));
    fireEvent.click(screen.getByText('🎤 Mute'));

    expect(mockLocalParticipant.publishData).toHaveBeenCalledWith(
      expect.anything(),
      { reliable: true, destinationIdentities: ['student-alice'] },
    );
    const sentMsg = JSON.parse(
      new TextDecoder().decode(mockLocalParticipant.publishData.mock.calls[0][0]),
    );
    expect(sentMsg).toMatchObject({ type: 'teacher_control', action: 'mute_mic', by: 'Test Teacher' });
  });

  it('sends disable_cam targeted to the student when Cam Off is clicked', async () => {
    renderClassRoom({ role: 'Teacher' });
    await waitForConnected();
    fireEvent.click(screen.getByText('Students'));
    fireEvent.click(screen.getByText('📷 Cam Off'));

    const sentMsg = JSON.parse(
      new TextDecoder().decode(mockLocalParticipant.publishData.mock.calls[0][0]),
    );
    expect(sentMsg).toMatchObject({ type: 'teacher_control', action: 'disable_cam' });
  });

  it('sends request_screen when Request Screen is clicked', async () => {
    renderClassRoom({ role: 'Teacher' });
    await waitForConnected();
    fireEvent.click(screen.getByText('Students'));
    fireEvent.click(screen.getByText('🖥 Request Screen'));

    const sentMsg = JSON.parse(
      new TextDecoder().decode(mockLocalParticipant.publishData.mock.calls[0][0]),
    );
    expect(sentMsg).toMatchObject({ type: 'teacher_control', action: 'request_screen' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  DataReceived — student side (incoming control messages)
// ─────────────────────────────────────────────────────────────────────────────
describe('DataReceived — student receives teacher control', () => {
  it('mutes mic and shows toast when mute_mic received', async () => {
    renderClassRoom({ role: 'Student' });
    await waitForConnected();
    fireDataReceived({ type: 'teacher_control', action: 'mute_mic', by: 'Ms. Smith' });
    await waitFor(() =>
      expect(mockLocalParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(false),
    );
    expect(screen.getByText('Ms. Smith muted your microphone')).toBeInTheDocument();
    expect(screen.getByText('Unmute')).toBeInTheDocument(); // label toggles
  });

  it('unmutes mic and shows toast when unmute_mic received', async () => {
    renderClassRoom({ role: 'Student' });
    await waitForConnected();
    fireDataReceived({ type: 'teacher_control', action: 'unmute_mic', by: 'Ms. Smith' });
    await waitFor(() =>
      expect(mockLocalParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true),
    );
    expect(screen.getByText('Ms. Smith unmuted your microphone')).toBeInTheDocument();
  });

  it('disables camera and shows toast when disable_cam received', async () => {
    renderClassRoom({ role: 'Student' });
    await waitForConnected();
    fireDataReceived({ type: 'teacher_control', action: 'disable_cam', by: 'Mr. Jones' });
    await waitFor(() =>
      expect(mockLocalParticipant.setCameraEnabled).toHaveBeenCalledWith(false),
    );
    expect(screen.getByText('Mr. Jones turned off your camera')).toBeInTheDocument();
  });

  it('enables camera and shows toast when enable_cam received', async () => {
    renderClassRoom({ role: 'Student' });
    await waitForConnected();
    fireDataReceived({ type: 'teacher_control', action: 'enable_cam', by: 'Mr. Jones' });
    await waitFor(() =>
      expect(mockLocalParticipant.setCameraEnabled).toHaveBeenCalledWith(true),
    );
    expect(screen.getByText('Mr. Jones turned on your camera')).toBeInTheDocument();
  });

  it('shows screen request modal when request_screen received', async () => {
    renderClassRoom({ role: 'Student' });
    await waitForConnected();
    fireDataReceived({ type: 'teacher_control', action: 'request_screen', by: 'Teacher Jane' });
    await waitFor(() =>
      expect(screen.getByText('📡 Screen Share Request')).toBeInTheDocument(),
    );
    expect(screen.getByText(/is requesting to view your screen/)).toBeInTheDocument();
    const modal = screen.getByText('📡 Screen Share Request').closest('div');
    expect(within(modal).getByRole('button', { name: 'Share Screen' })).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  });

  it('dismisses modal when Decline is clicked', async () => {
    renderClassRoom({ role: 'Student' });
    await waitForConnected();
    fireDataReceived({ type: 'teacher_control', action: 'request_screen', by: 'Teacher Jane' });
    await waitFor(() => screen.getByText('📡 Screen Share Request'));
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    await waitFor(() =>
      expect(screen.queryByText('📡 Screen Share Request')).not.toBeInTheDocument(),
    );
  });

  it('starts screen share and closes modal when Share Screen is clicked', async () => {
    renderClassRoom({ role: 'Student' });
    await waitForConnected();
    fireDataReceived({ type: 'teacher_control', action: 'request_screen', by: 'Teacher Jane' });
    await waitFor(() => expect(screen.getByText('📡 Screen Share Request')).toBeInTheDocument());
    const modal = screen.getByText('📡 Screen Share Request').closest('div');
    fireEvent.click(within(modal).getByRole('button', { name: 'Share Screen' }));
    await waitFor(() =>
      expect(mockLocalParticipant.setScreenShareEnabled).toHaveBeenCalledWith(true),
    );
    await waitFor(() => expect(screen.queryByText('📡 Screen Share Request')).not.toBeInTheDocument());
  });

  it('routes regular chat messages to the messages list (not treated as control)', async () => {
    renderClassRoom({ role: 'Student' });
    await waitForConnected();
    fireEvent.click(screen.getByText('Chat'));
    fireDataReceived({ author: 'Alice', text: 'Hello class!', time: '3:30 PM' });
    await waitFor(() => expect(screen.getByText('Hello class!')).toBeInTheDocument());
  });

  it('does not add teacher_control messages to chat', async () => {
    renderClassRoom({ role: 'Student' });
    await waitForConnected();
    fireEvent.click(screen.getByText('Chat'));
    fireDataReceived({ type: 'teacher_control', action: 'mute_mic', by: 'Teacher' });
    // Chat should not contain the raw payload text
    await waitFor(() => expect(mockLocalParticipant.setMicrophoneEnabled).toHaveBeenCalled());
    expect(screen.queryByText('teacher_control')).not.toBeInTheDocument();
    expect(screen.queryByText('mute_mic')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Toast notification
// ─────────────────────────────────────────────────────────────────────────────
describe('Toast notification', () => {
  it('shows a toast when teacher action is received', async () => {
    renderClassRoom({ role: 'Student' });
    await waitForConnected();
    fireDataReceived({ type: 'teacher_control', action: 'disable_cam', by: 'Sir Ali' });
    await waitFor(() =>
      expect(screen.getByText('Sir Ali turned off your camera')).toBeInTheDocument(),
    );
  });

  it('auto-hides toast after 4 seconds', async () => {
    jest.useFakeTimers();
    renderClassRoom({ role: 'Student' });

    // Flush all pending promises so the component finishes connecting
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Fire control message
    act(() => {
      const handler = roomEventHandlers['dataReceived'];
      if (handler)
        handler(
          new TextEncoder().encode(
            JSON.stringify({ type: 'teacher_control', action: 'mute_mic', by: 'Teacher' }),
          ),
        );
    });

    // Verify toast appears
    expect(screen.queryByText('Teacher muted your microphone')).toBeInTheDocument();

    // Advance past the 4-second auto-hide
    act(() => jest.advanceTimersByTime(4100));

    expect(screen.queryByText('Teacher muted your microphone')).not.toBeInTheDocument();

    jest.useRealTimers();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Chat panel
// ─────────────────────────────────────────────────────────────────────────────
describe('Chat panel', () => {
  it('opens chat when Chat button is clicked', async () => {
    renderClassRoom();
    await waitForConnected();
    fireEvent.click(screen.getByText('Chat'));
    expect(screen.getByPlaceholderText('Type a message…')).toBeInTheDocument();
  });

  it('sends a chat message via publishData', async () => {
    renderClassRoom();
    await waitForConnected();
    fireEvent.click(screen.getByText('Chat'));
    const input = screen.getByPlaceholderText('Type a message…');
    fireEvent.change(input, { target: { value: 'Hello there!' } });
    fireEvent.submit(input.closest('form'));
    expect(mockLocalParticipant.publishData).toHaveBeenCalled();
    const sentMsg = JSON.parse(
      new TextDecoder().decode(mockLocalParticipant.publishData.mock.calls[0][0]),
    );
    expect(sentMsg).toMatchObject({ author: 'Test Teacher', text: 'Hello there!' });
  });

  it('shows sent message locally as "You"', async () => {
    renderClassRoom();
    await waitForConnected();
    fireEvent.click(screen.getByText('Chat'));
    fireEvent.change(screen.getByPlaceholderText('Type a message…'), {
      target: { value: 'Test msg' },
    });
    fireEvent.submit(screen.getByPlaceholderText('Type a message…').closest('form'));
    expect(screen.getByText('Test msg')).toBeInTheDocument();
    expect(screen.getAllByText('You').length).toBeGreaterThan(0);
  });

  it('does not send empty messages', async () => {
    renderClassRoom();
    await waitForConnected();
    fireEvent.click(screen.getByText('Chat'));
    fireEvent.submit(screen.getByPlaceholderText('Type a message…').closest('form'));
    expect(mockLocalParticipant.publishData).not.toHaveBeenCalled();
  });
});
