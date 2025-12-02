import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as adminController from '../adminController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/userService.js', () => ({
  __esModule: true,
  getUserById: vi.fn(),
  updateUser: vi.fn(),
}));

/* -------------------- Helpers -------------------- */

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
});

/* -------------------- Tests: banUser -------------------- */

describe('adminController.banUser', () => {
  it('[Normal] TC01 - should ban user successfully', async () => {
    const { getUserById, updateUser } = await import('../../services/userService.js');

    const req = {
      params: { userId: 'u1' },
      body: { banReason: 'violation' },
    };
    const res = mockRes();

    const mockUser = { _id: 'u1', status: 'active' };
    getUserById.mockResolvedValue(mockUser);
    updateUser.mockResolvedValue({ ...mockUser, status: 'banned', banReason: 'violation' });

    await adminController.banUser(req, res);

    expect(getUserById).toHaveBeenCalledWith('u1');
    expect(updateUser).toHaveBeenCalledWith(
      'u1',
      { status: 'banned', banReason: 'violation' },
      { new: true },
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockUser);
  });

  it('[Abnormal] TC02 - should return 404 when user not found', async () => {
    const { getUserById } = await import('../../services/userService.js');

    const req = {
      params: { userId: 'u404' },
      body: { banReason: 'violation' },
    };
    const res = mockRes();

    getUserById.mockResolvedValue(null);

    await adminController.banUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
  });

  it('[Abnormal] TC03 - should return 400 when user already banned', async () => {
    const { getUserById } = await import('../../services/userService.js');

    const req = {
      params: { userId: 'u1' },
      body: { banReason: 'violation' },
    };
    const res = mockRes();

    getUserById.mockResolvedValue({ _id: 'u1', status: 'banned' });

    await adminController.banUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'User is already banned' });
  });

  it('[Abnormal] TC04 - should return 400 when banReason is missing', async () => {
    const { getUserById } = await import('../../services/userService.js');

    const req = {
      params: { userId: 'u1' },
      body: {},
    };
    const res = mockRes();

    getUserById.mockResolvedValue({ _id: 'u1', status: 'active' });

    await adminController.banUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Ban reason is required' });
  });

  it('[Abnormal] TC05 - should return 500 when service throws error', async () => {
    const { getUserById } = await import('../../services/userService.js');

    const req = {
      params: { userId: 'u1' },
      body: { banReason: 'violation' },
    };
    const res = mockRes();

    getUserById.mockRejectedValue(new Error('DB error'));

    await adminController.banUser(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Fail to ban user',
      }),
    );
  });
});


