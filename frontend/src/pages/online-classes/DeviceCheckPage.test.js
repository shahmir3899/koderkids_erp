// frontend/src/pages/online-classes/DeviceCheckPage.test.js

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeviceCheckPage from './DeviceCheckPage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useParams: () => ({ sessionId: '5' }),
  useNavigate: () => mockNavigate,
  MemoryRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: ({ element }) => element,
}));

jest.mock('../../utils/designConstants', () => ({
  COLORS: {
    primary: '#000', text: { primary: '#000', secondary: '#555', tertiary: '#888' },
    status: { success: 'green', error: 'red', warning: 'orange', info: 'blue', infoLight: '#e0f0ff' },
    border: { light: '#eee', default: '#ccc' }, background: { gray: '#f5f5f5' },
    primaryLight: '#aaa',
  },
  SPACING: new Proxy({}, { get: () => '8px' }),
  FONT_SIZES: new Proxy({}, { get: () => '14px' }),
  FONT_WEIGHTS: { normal: 400, medium: 500, semibold: 600, bold: 700 },
  BORDER_RADIUS: new Proxy({}, { get: () => '8px' }),
  MIXINS: {},
}));

const mockStream = {
  getTracks: () => [{ stop: jest.fn(), kind: 'video' }],
  getVideoTracks: () => [{ stop: jest.fn(), enabled: true }],
  getAudioTracks: () => [{ stop: jest.fn(), enabled: true }],
};

describe('DeviceCheckPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MediaDevices
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockResolvedValue(mockStream),
        enumerateDevices: jest.fn().mockResolvedValue([
          { kind: 'videoinput', deviceId: 'cam1', label: 'Camera 1' },
          { kind: 'audioinput', deviceId: 'mic1', label: 'Mic 1' },
        ]),
      },
      writable: true,
      configurable: true,
    });

    // Mock AudioContext
    global.AudioContext = jest.fn().mockImplementation(() => ({
      createMediaStreamSource: jest.fn().mockReturnValue({
        connect: jest.fn(),
      }),
      createAnalyser: jest.fn().mockReturnValue({
        fftSize: 0,
        frequencyBinCount: 256,
        getByteFrequencyData: jest.fn(),
        connect: jest.fn(),
      }),
      close: jest.fn(),
    }));
  });

  const renderPage = () =>
    render(<DeviceCheckPage />);

  it('renders device check heading', () => {
    renderPage();
    expect(screen.getByText(/device setup|device check|ready to join/i)).toBeInTheDocument();
  });

  it('calls getUserMedia on mount', async () => {
    renderPage();
    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: true,
        audio: true,
      });
    });
  });

  it('shows "Join Class" button after devices load', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/join class/i)).toBeInTheDocument();
    });
  });
});
