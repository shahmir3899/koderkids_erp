// frontend/src/pages/online-classes/OnlineClassesStudentPage.test.js

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import OnlineClassesStudentPage from './OnlineClassesStudentPage';
import * as svc from '../../services/onlineClassService';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../../services/onlineClassService', () => ({
  listSessions: jest.fn(),
}));
jest.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({ isMobile: false, isTablet: false }),
}));
jest.mock('../../components/common/ui/ErrorDisplay', () => ({
  ErrorDisplay: ({ error }) => <div>{error}</div>,
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

const renderPage = () => render(<OnlineClassesStudentPage />);

describe('OnlineClassesStudentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('role', 'Student');
  });
  afterEach(() => localStorage.clear());

  it('renders heading and tabs', async () => {
    svc.listSessions
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    renderPage();

    expect(screen.getByText(/online classes/i)).toBeInTheDocument();
    expect(screen.getByText(/upcoming/i)).toBeInTheDocument();
  });

  it('shows a session card when upcoming session exists', async () => {
    const session = {
      id: 1,
      title: 'Python Basics',
      status: 'scheduled',
      scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      duration_mins: 60,
      teacher_name: 'Mr. Test',
      participants_count: 5,
    };
    svc.listSessions
      .mockResolvedValueOnce([session])
      .mockResolvedValueOnce([]);

    renderPage();

    await waitFor(() => expect(screen.getByText('Python Basics')).toBeInTheDocument());
  });

  it('shows empty state when no sessions', async () => {
    svc.listSessions
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    renderPage();

    await waitFor(() => expect(screen.getByText(/no upcoming classes/i)).toBeInTheDocument());
  });

  it('shows error message on API failure', async () => {
    svc.listSessions
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([]);

    renderPage();

    await waitFor(() => expect(screen.getByText(/network error/i)).toBeInTheDocument());
  });
});
