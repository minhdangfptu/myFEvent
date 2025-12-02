import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as adminController from '../adminController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../models/user.js', () => ({
  __esModule: true,
  default: {
    countDocuments: vi.fn(),
  },
}));

vi.mock('../../models/event.js', () => ({
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

/* -------------------- Tests: getDashboardStats -------------------- */

describe('adminController.getDashboardStats', () => {
  it('[Normal] TC01 - should return dashboard stats successfully', async () => {
    const Event = (await import('../../models/event.js')).default;
    const User = (await import('../../models/user.js')).default;

    const req = {};
    const res = mockRes();

    Event.countDocuments
      .mockResolvedValueOnce(100) // totalEvents
      .mockResolvedValueOnce(10) // eventsThisWeek
      .mockResolvedValueOnce(5) // bannedEvents
      .mockResolvedValueOnce(2); // bannedEventsThisWeek

    User.countDocuments
      .mockResolvedValueOnce(200) // totalUsers
      .mockResolvedValueOnce(20) // usersThisWeek
      .mockResolvedValueOnce(3) // bannedUsers
      .mockResolvedValueOnce(1); // bannedUsersThisWeek

    await adminController.getDashboardStats(req, res);

    expect(Event.countDocuments).toHaveBeenCalled();
    expect(User.countDocuments).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      totalEvents: {
        value: 100,
        changeThisWeek: 10,
      },
      bannedEvents: {
        value: 5,
        changeThisWeek: 2,
      },
      totalUsers: {
        value: 200,
        changeThisWeek: 20,
      },
      bannedUsers: {
        value: 3,
        changeThisWeek: 1,
      },
    });
  });

  it('[Abnormal] TC02 - should return 500 when query fails', async () => {
    const Event = (await import('../../models/event.js')).default;

    const req = {};
    const res = mockRes();

    Event.countDocuments.mockRejectedValue(new Error('DB error'));

    await adminController.getDashboardStats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Fail to get dashboard stats',
      }),
    );
  });
});


