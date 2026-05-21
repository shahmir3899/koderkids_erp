// frontend/src/services/onlineClassService.test.js

import {
  listSessions,
  getSession,
  createSession,
  getRoomToken,
  startSession,
  endSession,
} from './onlineClassService';

// Mock the api module
jest.mock('../api', () => ({
  API_URL: 'http://test.api',
  getAuthHeaders: () => ({ Authorization: 'Bearer test-token' }),
}));

global.fetch = jest.fn();

const mockOk = (data) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

const mockFail = (status, data) =>
  Promise.resolve({ ok: false, status, json: () => Promise.resolve(data) });

describe('onlineClassService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('access', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('listSessions', () => {
    it('fetches sessions without params', async () => {
      const sessions = [{ id: 1, title: 'Test Class' }];
      fetch.mockResolvedValueOnce(mockOk(sessions));

      const result = await listSessions();

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url] = fetch.mock.calls[0];
      expect(url).toContain('/api/onlineclasses/sessions/');
      expect(result).toEqual(sessions);
    });

    it('appends query params when provided', async () => {
      fetch.mockResolvedValueOnce(mockOk([]));

      await listSessions({ status: 'live', page: 2 });

      const [url] = fetch.mock.calls[0];
      expect(url).toContain('status=live');
      expect(url).toContain('page=2');
    });

    it('throws on error response', async () => {
      fetch.mockResolvedValueOnce(mockFail(403, { detail: 'Forbidden' }));
      await expect(listSessions()).rejects.toThrow('Forbidden');
    });
  });

  describe('getSession', () => {
    it('fetches a single session by id', async () => {
      const session = { id: 5, title: 'Python Basics' };
      fetch.mockResolvedValueOnce(mockOk(session));

      const result = await getSession(5);

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url] = fetch.mock.calls[0];
      expect(url).toContain('/api/onlineclasses/sessions/5/');
      expect(result).toEqual(session);
    });
  });

  describe('createSession', () => {
    it('posts session data with JSON body', async () => {
      const payload = { title: 'New Class', school: 1 };
      const created = { id: 10, ...payload };
      fetch.mockResolvedValueOnce(mockOk(created));

      const result = await createSession(payload);

      const [, options] = fetch.mock.calls[0];
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual(payload);
      expect(result).toEqual(created);
    });
  });

  describe('getRoomToken', () => {
    it('posts to the token endpoint and returns token data', async () => {
      const tokenData = { token: 'eyJhbGc...', livekit_url: 'wss://test.livekit.cloud', room_name: 'session-abc123' };
      fetch.mockResolvedValueOnce(mockOk(tokenData));

      const result = await getRoomToken(42);

      const [url, options] = fetch.mock.calls[0];
      expect(url).toContain('/api/onlineclasses/sessions/42/token/');
      expect(options.method).toBe('POST');
      expect(result).toEqual(tokenData);
    });

    it('throws on 503 when LiveKit is not configured', async () => {
      fetch.mockResolvedValueOnce(mockFail(503, { error: 'LiveKit not configured' }));
      await expect(getRoomToken(1)).rejects.toThrow('LiveKit not configured');
    });
  });

  describe('startSession', () => {
    it('posts to the start endpoint', async () => {
      fetch.mockResolvedValueOnce(mockOk({ status: 'live' }));

      await startSession(7);

      const [url, options] = fetch.mock.calls[0];
      expect(url).toContain('/api/onlineclasses/sessions/7/start/');
      expect(options.method).toBe('POST');
    });
  });

  describe('endSession', () => {
    it('posts to the end endpoint', async () => {
      fetch.mockResolvedValueOnce(mockOk({ status: 'ended' }));

      await endSession(7);

      const [url, options] = fetch.mock.calls[0];
      expect(url).toContain('/api/onlineclasses/sessions/7/end/');
      expect(options.method).toBe('POST');
    });
  });
});
