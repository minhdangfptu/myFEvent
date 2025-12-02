import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as adminController from '../adminController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../models/event.js', () => {
  const mockFind = vi.fn();
  const mockSelect = vi.fn();
  const mockSort = vi.fn();
  const mockLimit = vi.fn();
  const mockLean = vi.fn();

  mockFind.mockReturnValue({
    select: mockSelect.mockReturnValue({
      sort: mockSort.mockReturnValue({
        limit: mockLimit.mockReturnValue({
          lean: mockLean,
        }),
      }),
    }),
  });

  return {
    __esModule: true,
    default: {
      find: mockFind,
    },
    _mockFind: mockFind,
    _mockSelect: mockSelect,
    _mockSort: mockSort,
    _mockLimit: mockLimit,
    _mockLean: mockLean,
  };
});

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

/* -------------------- Tests: getRecentBannedEvents -------------------- */

describe('adminController.getRecentBannedEvents', () => {
  it('[Normal] TC01 - should return formatted recent banned events', async () => {
    const { _mockFind, _mockLimit, _mockLean } = await import('../../models/event.js');

    const req = { query: { limit: '5' } };
    const res = mockRes();

    const mockEvents = [
      {
        name: 'Event 1',
        organizerName: 'Org 1',
        banInfo: { bannedAt: new Date('2025-01-01') },
      },
      {
        name: 'Event 2',
        organizerName: 'Org 2',
        banInfo: { bannedAt: null },
      },
    ];

    _mockLean.mockResolvedValue(mockEvents);

    await adminController.getRecentBannedEvents(req, res);

    expect(_mockFind).toHaveBeenCalledWith({ 'banInfo.isBanned': true });
    expect(_mockLimit).toHaveBeenCalledWith(5);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Event 1', organizer: 'Org 1' }),
        expect.objectContaining({ name: 'Event 2', organizer: 'Org 2' }),
      ]),
    );
  });

  it('[Abnormal] TC02 - should return 500 when query fails', async () => {
    const { _mockLean } = await import('../../models/event.js');

    const req = { query: {} };
    const res = mockRes();

    _mockLean.mockRejectedValue(new Error('DB error'));

    await adminController.getRecentBannedEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Fail to get recent banned events',
      }),
    );
  });
});


