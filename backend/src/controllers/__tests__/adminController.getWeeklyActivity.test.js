import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as adminController from '../adminController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../models/event.js', () => ({
  __esModule: true,
  default: {
    countDocuments: vi.fn(),
  },
}));

vi.mock('../../models/user.js', () => ({
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

beforeEach(() => {
  vi.clearAllMocks();
});

/* -------------------- Tests: getWeeklyActivity -------------------- */

describe('adminController.getWeeklyActivity', () => {
  it('[Normal] TC01 - should return weekly activity counts', async () => {
    const Event = (await import('../../models/event.js')).default;
    const User = (await import('../../models/user.js')).default;

    const req = {};
    const res = mockRes();

    Event.countDocuments
      .mockResolvedValueOnce(5) // newEventsThisWeek
      .mockResolvedValueOnce(2); // bannedEventsThisWeek

    User.countDocuments
      .mockResolvedValueOnce(10) // newUsersThisWeek
      .mockResolvedValueOnce(1); // bannedUsersThisWeek

    await adminController.getWeeklyActivity(req, res);

    expect(Event.countDocuments).toHaveBeenCalled();
    expect(User.countDocuments).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      { activity: 'Sự kiện tạo mới', count: 5 },
      { activity: 'Sự kiện bị cấm', count: 2 },
      { activity: 'Người dùng mới', count: 10 },
      { activity: 'Người dùng bị cấm', count: 1 },
    ]);
  });

  it('[Abnormal] TC02 - should return 500 when query fails', async () => {
    const Event = (await import('../../models/event.js')).default;

    const req = {};
    const res = mockRes();

    Event.countDocuments.mockRejectedValue(new Error('DB error'));

    await adminController.getWeeklyActivity(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Fail to get weekly activity',
      }),
    );
  });
});


