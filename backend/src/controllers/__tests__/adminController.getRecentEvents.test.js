import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as adminController from '../adminController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../models/event.js', () => {
  const mockFind = vi.fn();
  const mockSelect = vi.fn();
  const mockSort = vi.fn();
  const mockLimit = vi.fn();
  const mockLean = vi.fn();

  mockFind.mockImplementation(() => ({
    select: mockSelect.mockReturnValue({
      sort: mockSort.mockReturnValue({
        limit: mockLimit.mockReturnValue({
          lean: mockLean,
        }),
      }),
    }),
  }));

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

/* -------------------- Tests: getRecentEvents -------------------- */

describe('adminController.getRecentEvents', () => {
  it('[Normal] TC01 - should return recent new events with default params', async () => {
    const { _mockFind, _mockSort, _mockLimit, _mockLean } = await import('../../models/event.js');

    const req = { query: {} };
    const res = mockRes();

    const mockEvents = [
      {
        name: 'Event 1',
        organizerName: 'Org 1',
        createdAt: new Date('2025-01-01'),
      },
      {
        name: 'Event 2',
        organizerName: 'Org 2',
        createdAt: null,
      },
    ];

    _mockLean.mockResolvedValue(mockEvents);

    await adminController.getRecentEvents(req, res);

    expect(_mockFind).toHaveBeenCalledWith({ type: 'public' });
    expect(_mockSort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(_mockLimit).toHaveBeenCalledWith(10);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Event 1', organizer: 'Org 1' }),
        expect.objectContaining({ title: 'Event 2', organizer: 'Org 2' }),
      ]),
    );
  });

  it('[Normal] TC02 - should return upcoming events when type=upcoming', async () => {
    const { _mockFind, _mockSort, _mockLimit, _mockLean } = await import('../../models/event.js');

    const req = { query: { type: 'upcoming', limit: '5' } };
    const res = mockRes();

    const mockEvents = [
      {
        name: 'Upcoming 1',
        organizerName: 'Org U1',
        eventStartDate: new Date('2025-02-01'),
      },
    ];

    _mockLean.mockResolvedValue(mockEvents);

    await adminController.getRecentEvents(req, res);

    expect(_mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'public',
        eventStartDate: expect.any(Object),
      }),
    );
    expect(_mockSort).toHaveBeenCalledWith({ eventStartDate: 1 });
    expect(_mockLimit).toHaveBeenCalledWith(5);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Upcoming 1', organizer: 'Org U1' }),
      ]),
    );
  });

  it('[Abnormal] TC03 - should return 500 when query fails', async () => {
    const { _mockLean } = await import('../../models/event.js');

    const req = { query: {} };
    const res = mockRes();

    _mockLean.mockRejectedValue(new Error('DB error'));

    await adminController.getRecentEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Fail to get recent events',
      }),
    );
  });
});


