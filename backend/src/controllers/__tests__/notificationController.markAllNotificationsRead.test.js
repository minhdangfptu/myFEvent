import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markAllNotificationsRead } from '../notificationController.js';

/* -------------------- Mocks -------------------- */
vi.mock('../../models/notification.js', () => ({
  __esModule: true,
  default: {
    updateMany: vi.fn(),
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

describe('notificationController.markAllNotificationsRead', () => {
  it('[Normal] TC01 - should mark all notifications as read', async () => {
    const Notification = (await import('../../models/notification.js')).default;

    Notification.updateMany.mockResolvedValue({ modifiedCount: 5 });

    const req = { user: { id: 'u1' } };
    const res = mockRes();

    await markAllNotificationsRead(req, res);

    expect(Notification.updateMany).toHaveBeenCalledWith(
      { userId: 'u1', unread: true },
      { unread: false }
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Đã đánh dấu tất cả thông báo đã đọc',
    });
  });

  it('[Abnormal] TC02 - should return 500 on error', async () => {
    const Notification = (await import('../../models/notification.js')).default;

    Notification.updateMany.mockRejectedValue(new Error('err'));

    const req = { user: { id: 'u1' } };
    const res = mockRes();

    await markAllNotificationsRead(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi cập nhật thông báo',
    });
  });
});
