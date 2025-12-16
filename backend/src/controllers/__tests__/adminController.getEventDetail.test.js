import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as adminController from '../adminController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/eventService.js', () => ({
  __esModule: true,
  getEventByIdForAdmin: vi.fn(),
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

/* -------------------- Tests: getEventDetail -------------------- */

describe('adminController.getEventDetail', () => {
  it('[Normal] TC01 - should return event detail successfully', async () => {
    const { getEventByIdForAdmin } = await import('../../services/eventService.js');

    const req = { params: { eventId: 'e1' } };
    const res = mockRes();

    const mockEvent = { _id: 'e1', name: 'Event 1' };
    getEventByIdForAdmin.mockResolvedValue(mockEvent);

    await adminController.getEventDetail(req, res);

    expect(getEventByIdForAdmin).toHaveBeenCalledWith('e1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lấy thông tin sự kiện thành công',
      data: mockEvent,
    });
  });

  it('[Abnormal] TC02 - should return 404 when service throws 404 error', async () => {
    const { getEventByIdForAdmin } = await import('../../services/eventService.js');

    const req = { params: { eventId: 'e404' } };
    const res = mockRes();

    const err = new Error('Event not found');
    err.status = 404;
    getEventByIdForAdmin.mockRejectedValue(err);

    await adminController.getEventDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Event not found',
    });
  });

  it('[Abnormal] TC03 - should return 500 on other errors', async () => {
    const { getEventByIdForAdmin } = await import('../../services/eventService.js');

    const req = { params: { eventId: 'e1' } };
    const res = mockRes();

    getEventByIdForAdmin.mockRejectedValue(new Error('Unexpected error'));

    await adminController.getEventDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Fail to get event detail',
      }),
    );
  });
});


