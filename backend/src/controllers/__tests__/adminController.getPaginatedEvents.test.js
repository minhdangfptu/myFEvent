import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as adminController from '../adminController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/eventService.js', () => ({
  __esModule: true,
  getPaginatedEvents: vi.fn(),
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

/* -------------------- Tests: getPaginatedEvents -------------------- */

describe('adminController.getPaginatedEvents', () => {
  it('[Normal] TC01 - should return paginated events with default query params', async () => {
    const { getPaginatedEvents } = await import('../../services/eventService.js');

    const req = { query: {} };
    const res = mockRes();

    const mockResult = { docs: [], totalDocs: 0 };
    getPaginatedEvents.mockResolvedValue(mockResult);

    await adminController.getPaginatedEvents(req, res);

    expect(getPaginatedEvents).toHaveBeenCalledWith(1, 10, '', 'all', null);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });

  it('[Normal] TC02 - should pass query params correctly to service', async () => {
    const { getPaginatedEvents } = await import('../../services/eventService.js');

    const req = {
      query: {
        page: '3',
        limit: '5',
        search: 'music',
        status: 'active',
        eventDate: '2025-12-01',
      },
    };
    const res = mockRes();

    const mockResult = { docs: [{ _id: 'e1' }], totalDocs: 1 };
    getPaginatedEvents.mockResolvedValue(mockResult);

    await adminController.getPaginatedEvents(req, res);

    expect(getPaginatedEvents).toHaveBeenCalledWith(3, 5, 'music', 'active', '2025-12-01');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });

  it('[Abnormal] TC03 - should return 500 when service throws error', async () => {
    const { getPaginatedEvents } = await import('../../services/eventService.js');

    const req = { query: {} };
    const res = mockRes();

    getPaginatedEvents.mockRejectedValue(new Error('DB error'));

    await adminController.getPaginatedEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Fail to fetch events',
      }),
    );
  });
});


