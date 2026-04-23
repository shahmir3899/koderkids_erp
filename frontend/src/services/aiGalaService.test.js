import { aiGalaService } from './aiGalaService';

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}));

const axios = require('axios');

describe('aiGalaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('access', 'fake-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('retries adminDeleteGallery on fallback endpoint after primary 404', async () => {
    axios.delete
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: { message: 'deleted' } });

    const result = await aiGalaService.adminDeleteGallery(42);

    expect(result).toEqual({ message: 'deleted' });
    expect(axios.delete).toHaveBeenCalledTimes(2);
    expect(axios.delete.mock.calls[0][0]).toContain('/api/aigala/galleries/42/delete/');
    expect(axios.delete.mock.calls[1][0]).toContain('/api/aigala/admin/galleries/42/delete/');
    expect(axios.delete.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer fake-token' }),
      })
    );
  });

  it('adds an HTTP-aware userMessage for report download blob errors', async () => {
    const error = {
      response: {
        status: 400,
        data: new Blob([JSON.stringify({ error: 'No projects found for this gala' })], {
          type: 'application/json',
        }),
      },
    };
    axios.get.mockRejectedValueOnce(error);

    await expect(aiGalaService.downloadParticipationReport(7)).rejects.toBe(error);
    expect(error.userMessage).toBe('Failed to download participation report (HTTP 400)');
  });
});
