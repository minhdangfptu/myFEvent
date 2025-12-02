import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUnreadCount } from '../notificationController.js';

/* -------------------- Mocks -------------------- */
vi.mock('../../models/notification.js', () => ({
  __esModule: true,
  default: {
    countDocuments: vi.fn(),
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

describe('notificationController.getUnreadCount', () => {
  it('[Normal] TC01 - should return unread count', async () => {
    const Notification = (await import('../../models/notification.js')).default;

    Notification.countDocuments.mockResolvedValue(3);

    const req = { user: { id: 'u1' } };
    const res = mockRes();

    await getUnreadCount(req, res);

    expect(Notification.countDocuments).toHaveBeenCalledWith({
      userId: 'u1',
      unread: true,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ count: 3 });
  });

  it('[Abnormal] TC02 - should return 500 on error', async () => {
    const Notification = (await import('../../models/notification.js')).default;

    Notification.countDocuments.mockRejectedValue(new Error('err'));

    const req = { user: { id: 'u1' } };
    const res = mockRes();

    await getUnreadCount(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi lấy số lượng thông báo' });
  });
});
