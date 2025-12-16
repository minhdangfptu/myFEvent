import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as userController from '../../userController.js';

vi.mock('../../../services/userService.js', () => ({
  __esModule: true,
  getProfileService: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('userController.getProfile', () => {
  it('[Normal] TC01 - should return profile data', async () => {
    const { getProfileService } = await import('../../../services/userService.js');

    const req = { user: { id: 'u1' } };
    const res = mockRes();

    const mockProfile = { id: 'u1', fullName: 'Test' };
    getProfileService.mockResolvedValue(mockProfile);

    await userController.getProfile(req, res);

    expect(getProfileService).toHaveBeenCalledWith('u1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: mockProfile });
  });

  it('[Abnormal] TC02 - should return custom error when service throws with status', async () => {
    const { getProfileService } = await import('../../../services/userService.js');

    const req = { user: { id: 'u1' } };
    const res = mockRes();

    const err = { status: 404, message: 'User not found' };
    getProfileService.mockRejectedValue(err);

    await userController.getProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'User not found',
      error: undefined,
    });
  });

  it('[Abnormal] TC03 - should return 500 and include error when generic error', async () => {
    const { getProfileService } = await import('../../../services/userService.js');

    const req = { user: { id: 'u1' } };
    const res = mockRes();

    getProfileService.mockRejectedValue(new Error('DB fail'));

    await userController.getProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Failed to get profile',
      error: 'DB fail',
    });
  });
});
