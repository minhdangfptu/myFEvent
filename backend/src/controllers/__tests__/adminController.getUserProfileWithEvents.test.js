import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as adminController from '../adminController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/userService.js', () => ({
  __esModule: true,
  getUserProfileWithEvents: vi.fn(),
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

/* -------------------- Tests: getUserProfileWithEvents -------------------- */

describe('adminController.getUserProfileWithEvents', () => {
  it('[Normal] TC01 - should use params.userId when provided', async () => {
    const { getUserProfileWithEvents } = await import('../../services/userService.js');

    const req = {
      params: { userId: 'u1' },
      user: { id: 'uCurrent' },
    };
    const res = mockRes();

    const mockResult = { user: { _id: 'u1' }, events: [] };
    getUserProfileWithEvents.mockResolvedValue(mockResult);

    await adminController.getUserProfileWithEvents(req, res);

    expect(getUserProfileWithEvents).toHaveBeenCalledWith('u1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lấy thông tin thành công',
      data: mockResult,
    });
  });

  it('[Abnormal] TC02 - should return 400 when userId param is missing', async () => {
    const { getUserProfileWithEvents } = await import('../../services/userService.js');

    const req = {
      params: {},
    };
    const res = mockRes();

    await adminController.getUserProfileWithEvents(req, res);

    expect(getUserProfileWithEvents).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'userId is required' });
  });

  it('[Abnormal] TC03 - should return 404 when service throws \"Người dùng không tồn tại\"', async () => {
    const { getUserProfileWithEvents } = await import('../../services/userService.js');

    const req = {
      params: { userId: 'u404' },
      user: { id: 'uCurrent' },
    };
    const res = mockRes();

    getUserProfileWithEvents.mockRejectedValue(new Error('Người dùng không tồn tại'));

    await adminController.getUserProfileWithEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Người dùng không tồn tại' });
  });

  it('[Abnormal] TC04 - should return 500 on other errors', async () => {
    const { getUserProfileWithEvents } = await import('../../services/userService.js');

    const req = {
      params: { userId: 'u1' },
      user: { id: 'uCurrent' },
    };
    const res = mockRes();

    getUserProfileWithEvents.mockRejectedValue(new Error('Unexpected error'));

    await adminController.getUserProfileWithEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Lỗi máy chủ',
      }),
    );
  });
});


