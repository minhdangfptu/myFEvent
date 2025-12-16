import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as adminController from '../adminController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/eventService.js', () => ({
  __esModule: true,
  getEventById: vi.fn(),
  updateEventByAdmin: vi.fn(),
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

/* -------------------- Tests: unbanEvent -------------------- */

describe('adminController.unbanEvent', () => {
  it('[Normal] TC01 - should unban event successfully', async () => {
    const { getEventById, updateEventByAdmin } = await import('../../services/eventService.js');

    const req = {
      params: { eventId: 'e1' },
    };
    const res = mockRes();

    const mockEvent = { _id: 'e1', banInfo: { isBanned: true } };
    const updatedEvent = { ...mockEvent, banInfo: { isBanned: false } };

    getEventById.mockResolvedValue(mockEvent);
    updateEventByAdmin.mockResolvedValue(updatedEvent);

    await adminController.unbanEvent(req, res);

    expect(getEventById).toHaveBeenCalledWith('e1');
    expect(updateEventByAdmin).toHaveBeenCalledWith('e1', {}, 'unban');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updatedEvent);
  });

  it('[Abnormal] TC02 - should return 404 when event not found', async () => {
    const { getEventById } = await import('../../services/eventService.js');

    const req = {
      params: { eventId: 'e404' },
    };
    const res = mockRes();

    getEventById.mockResolvedValue(null);

    await adminController.unbanEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Event not found' });
  });

  it('[Abnormal] TC03 - should return 400 when event is not banned', async () => {
    const { getEventById } = await import('../../services/eventService.js');

    const req = {
      params: { eventId: 'e1' },
    };
    const res = mockRes();

    getEventById.mockResolvedValue({ _id: 'e1', banInfo: { isBanned: false } });

    await adminController.unbanEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Event is not banned' });
  });

  it('[Abnormal] TC04 - should return 500 when service throws error', async () => {
    const { getEventById } = await import('../../services/eventService.js');

    const req = {
      params: { eventId: 'e1' },
    };
    const res = mockRes();

    getEventById.mockRejectedValue(new Error('DB error'));

    await adminController.unbanEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Fail to unban event',
      }),
    );
  });
});


