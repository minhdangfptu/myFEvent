import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNotifications } from '../notificationController.js';

/* -------------------- Mocks -------------------- */
vi.mock('../../models/notification.js', () => {
  const lean = vi.fn();
  const limit = vi.fn(() => ({ lean }));
  const sort = vi.fn(() => ({ limit }));

  return {
    __esModule: true,
    default: {
      find: vi.fn(() => ({ sort })),
      _mock: { lean, limit, sort },
    },
  };
});

/* -------------------- Helpers -------------------- */
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

/* -------------------- Tests -------------------- */

describe('notificationController.getNotifications', () => {
  it('[Normal] TC01 - should return notifications list', async () => {
  const Notification = (await import('../../models/notification.js')).default;

  Notification._mock.lean.mockResolvedValue([{ id: 1 }]);

  const req = { user: { id: 'u1' }, query: {} };
  const res = mockRes();

  await getNotifications(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1 }] });
});

  it('[Normal] TC02 - should filter unread=true', async () => {
  const Notification = (await import('../../models/notification.js')).default;

  Notification._mock.lean.mockResolvedValue([]);

  const req = {
    user: { id: 'u1' },
    query: { unread: 'true' },
  };
  const res = mockRes();

  await getNotifications(req, res);

  expect(Notification.find).toHaveBeenCalledWith({ userId: 'u1', unread: true });
});

  it('[Abnormal] TC03 - should return 500 on DB error', async () => {
    const Notification = (await import('../../models/notification.js')).default;

    Notification.find.mockImplementation(() => {
      throw new Error('DB error');
    });

    const req = { user: { id: 'u1' }, query: {} };
    const res = mockRes();

    await getNotifications(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi lấy thông báo' });
  });
});
