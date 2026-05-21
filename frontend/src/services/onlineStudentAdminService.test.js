import {
  getOnlineStudentProfile,
  updateOnlineStudentProfile,
} from './onlineStudentAdminService';

jest.mock('../api', () => ({
  API_URL: 'http://localhost:8000',
  getAuthHeaders: () => ({ Authorization: 'Bearer fake-token' }),
}));

describe('onlineStudentAdminService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calls profile GET endpoint with auth headers', async () => {
    const mockProfile = { id: 10, name: 'Online Student' };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile,
    });

    const result = await getOnlineStudentProfile(10);

    expect(result).toEqual(mockProfile);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/courses/admin/online-students/10/profile/',
      { headers: { Authorization: 'Bearer fake-token' } }
    );
  });

  it('calls profile PATCH endpoint with payload', async () => {
    const payload = { name: 'Updated Name', email: 'updated@example.com' };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 10, ...payload }),
    });

    const result = await updateOnlineStudentProfile(10, payload, true);

    expect(result.name).toBe('Updated Name');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/courses/admin/online-students/10/profile/',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(payload),
      })
    );
  });

  it('surfaces validation message from API payload', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ email: ['A user with this email already exists.'] }),
    });

    await expect(updateOnlineStudentProfile(10, { email: 'duplicate@example.com' })).rejects.toThrow(
      'A user with this email already exists.'
    );
  });
});
