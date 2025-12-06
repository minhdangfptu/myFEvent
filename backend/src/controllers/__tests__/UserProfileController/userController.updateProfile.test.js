import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as userController from '../../userController.js';

vi.mock('../../../services/userService.js', () => ({
  __esModule: true,
  updateProfileService: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('userController.updateProfile', () => {
  it('[Normal] TC01 - should update profile and return updated data', async () => {
    const { updateProfileService } = await import('../../../services/userService.js');

    const body = { fullName: 'A', phone: '0123', bio: 'b', highlight: 'h', tags: ['t'], avatarUrl: 'u' };
    const req = { user: { id: 'u1' }, body };
    const res = mockRes();

    const updated = { ...body, id: 'u1' };
    updateProfileService.mockResolvedValue(updated);

    await userController.updateProfile(req, res);

    expect(updateProfileService).toHaveBeenCalledWith('u1', body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Updated',
      data: updated,
    });
  });

  it('[Abnormal] TC02 - should return custom error when service throws with status', async () => {
    const { updateProfileService } = await import('../../../services/userService.js');

    const req = { user: { id: 'u1' }, body: { fullName: 'A' } };
    const res = mockRes();

    const err = { status: 400, message: 'Invalid body' };
    updateProfileService.mockRejectedValue(err);

    await userController.updateProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid body',
      error: undefined,
    });
  });

  it('[Abnormal] TC03 - should return 500 and include error when generic error', async () => {
    const { updateProfileService } = await import('../../../services/userService.js');

    const req = { user: { id: 'u1' }, body: { fullName: 'A' } };
    const res = mockRes();

    updateProfileService.mockRejectedValue(new Error('DB fail'));

    await userController.updateProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Failed to update profile',
      error: 'DB fail',
    });
  });
});
