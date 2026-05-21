// frontend/src/pages/online-classes/CreateClassPage.test.js

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateClassPage from './CreateClassPage';
import * as svc from '../../services/onlineClassService';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
}), { virtual: true });

jest.mock('../../services/onlineClassService');
jest.mock('../../api', () => ({
  API_URL: 'http://test.api',
  getAuthHeaders: () => ({ Authorization: 'Bearer test-token' }),
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

global.fetch = jest.fn();

const renderCreate = () =>
  render(<CreateClassPage />);

describe('CreateClassPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    localStorage.setItem('role', 'Teacher');
    svc.getEligibleStudents.mockResolvedValue([]);
    svc.createBulkSessions.mockResolvedValue({ count: 0, sessions: [] });
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: 1, name: 'Test School' }]),
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the schedule form', async () => {
    renderCreate();
    expect(screen.getByText(/schedule new class/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/introduction to python/i)).toBeInTheDocument();
  });

  it('shows validation error when title is empty on submit', async () => {
    renderCreate();

    await waitFor(() => screen.getByText(/next/i, { selector: 'button[type="button"]' }));
    fireEvent.click(screen.getByText(/next/i, { selector: 'button[type="button"]' }));

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when no school selected', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    renderCreate();

    await waitFor(() => screen.getByPlaceholderText(/introduction to python/i));
    fireEvent.change(screen.getByPlaceholderText(/introduction to python/i), {
      target: { value: 'My Class' },
    });

    fireEvent.click(screen.getByText(/next/i, { selector: 'button[type="button"]' }));

    await waitFor(() => {
      expect(screen.getByText(/please select a school/i)).toBeInTheDocument();
    });
  });

  it('calls createSession and redirects on valid submit', async () => {
    svc.createSession.mockResolvedValue({ id: 99, title: 'My Class' });

    renderCreate();

    // Wait for school dropdown to load
    await waitFor(() => screen.getByText('Test School'));

    fireEvent.change(screen.getByPlaceholderText(/introduction to python/i), {
      target: { value: 'My Class' },
    });

    // Select school
    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: '1' },
    });

    // Step 1 -> Step 2
    fireEvent.click(screen.getByText(/next/i, { selector: 'button[type="button"]' }));

    // Set date
    const dateInput = document.querySelector('input[type="datetime-local"]');
    fireEvent.change(dateInput, { target: { value: '2026-03-01T10:00' } });

    // Step 2 -> Step 3
    fireEvent.click(screen.getByText(/next/i, { selector: 'button[type="button"]' }));

    fireEvent.click(screen.getByText(/schedule class/i, { selector: 'button[type="submit"]' }));

    await waitFor(() => {
      expect(svc.createSession).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/online-classes/teacher');
    });
  });

  it('loads all schools for admin when assigned list is empty', async () => {
    localStorage.setItem('role', 'Admin');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: 2, name: 'Fallback School', is_active: true }]),
    });

    renderCreate();

    await waitFor(() => {
      expect(screen.getByText('Fallback School')).toBeInTheDocument();
    });
  });

  it('runs bulk preview step and submits bulk creation', async () => {
    svc.createBulkSessions.mockImplementation((data) => {
      if (data.dry_run) {
        return Promise.resolve({
          dry_run: true,
          count: 2,
          generated_dates: ['2026-03-02T10:00:00+05:00', '2026-03-04T10:00:00+05:00'],
        });
      }
      return Promise.resolve({
        dry_run: false,
        count: 2,
        sessions: [{ id: 1001 }, { id: 1002 }],
      });
    });

    renderCreate();

    await waitFor(() => screen.getByText('Test School'));

    fireEvent.change(screen.getByPlaceholderText(/introduction to python/i), {
      target: { value: 'Bulk Class Plan' },
    });

    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: '1' },
    });

    fireEvent.click(screen.getByRole('button', { name: /bulk monthly plan/i }));

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

    fireEvent.change(document.querySelector('input[type="date"]'), {
      target: { value: '2026-03-01' },
    });
    fireEvent.change(document.querySelector('input[type="time"]'), {
      target: { value: '10:00' },
    });
    fireEvent.change(document.querySelector('input[type="number"]'), {
      target: { value: '2' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

    await waitFor(() => {
      expect(svc.createBulkSessions).toHaveBeenCalledWith(expect.objectContaining({ dry_run: true }));
    });

    await waitFor(() => {
      expect(screen.getByText(/generated sessions preview/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    fireEvent.click(screen.getByRole('button', { name: /create bulk classes/i }));

    await waitFor(() => {
      expect(svc.createBulkSessions).toHaveBeenCalledWith(expect.not.objectContaining({ dry_run: true }));
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/online-classes/teacher');
    });
  });
});
