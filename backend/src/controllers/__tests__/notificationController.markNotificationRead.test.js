import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markNotificationRead } from '../notificationController.js';

/* -------------------- Mocks -------------------- */
vi.mock('../../models/notification.js', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: vi.fn(),
  },
}));

/* -------------------- Helpers -------------------- */
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

/* -------------------- Tests -------------------- */

describe('notificationController.markNotificationRead', () => {
  it('[Normal] TC01 - should mark notification as read', async () => {
    const Notification = (await import('../../models/notification.js')).default;

    Notification.findOneAndUpdate.mockResolvedValue({ id: 'n1', unread: false });

    const req = { user: { id: 'u1' }, params: { notificationId: 'n1' } };
    const res = mockRes();

    await markNotificationRead(req, res);

    expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'n1', userId: 'u1' },
      { unread: false },
      { new: true }
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: { id: 'n1', unread: false } });
  });

  it('[Abnormal] TC02 - should return 404 if not found', async () => {
    const Notification = (await import('../../models/notification.js')).default;

    Notification.findOneAndUpdate.mockResolvedValue(null);

    const req = { user: { id: 'u1' }, params: { notificationId: 'nX' } };
    const res = mockRes();

    await markNotificationRead(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy thông báo' });
  });

  it('[Abnormal] TC03 - should return 500 on error', async () => {
    const Notification = (await import('../../models/notification.js')).default;

    Notification.findOneAndUpdate.mockRejectedValue(new Error('DB error'));

    const req = { user: { id: 'u1' }, params: { notificationId: 'n1' } };
    const res = mockRes();

    await markNotificationRead(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi cập nhật thông báo' });
  });
});
