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

/* -------------------- Tests: banEvent -------------------- */

describe('adminController.banEvent', () => {
  it('[Normal] TC01 - should ban event successfully', async () => {
    const { getEventById, updateEventByAdmin } = await import('../../services/eventService.js');

    const req = {
      params: { eventId: 'e1' },
      body: { banReason: 'violation' },
    };
    const res = mockRes();

    const mockEvent = { _id: 'e1', type: 'public', banInfo: { isBanned: false } };
    const updatedEvent = { ...mockEvent, banInfo: { isBanned: true, banReason: 'violation' } };

    getEventById.mockResolvedValue(mockEvent);
    updateEventByAdmin.mockResolvedValue(updatedEvent);

    await adminController.banEvent(req, res);

    expect(getEventById).toHaveBeenCalledWith('e1');
    expect(updateEventByAdmin).toHaveBeenCalledWith('e1', { banReason: 'violation' }, 'ban');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updatedEvent);
  });

  it('[Abnormal] TC02 - should return 404 when event not found', async () => {
    const { getEventById } = await import('../../services/eventService.js');

    const req = {
      params: { eventId: 'e404' },
      body: { banReason: 'violation' },
    };
    const res = mockRes();

    getEventById.mockResolvedValue(null);

    await adminController.banEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Event not found' });
  });

  it('[Abnormal] TC03 - should return 400 when event already banned', async () => {
    const { getEventById } = await import('../../services/eventService.js');

    const req = {
      params: { eventId: 'e1' },
      body: { banReason: 'violation' },
    };
    const res = mockRes();

    getEventById.mockResolvedValue({ _id: 'e1', type: 'public', banInfo: { isBanned: true } });

    await adminController.banEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Event is already banned' });
  });

  it('[Abnormal] TC04 - should return 400 when event is private', async () => {
    const { getEventById } = await import('../../services/eventService.js');

    const req = {
      params: { eventId: 'e1' },
      body: { banReason: 'violation' },
    };
    const res = mockRes();

    getEventById.mockResolvedValue({
      _id: 'e1',
      type: 'private',
      banInfo: { isBanned: false },
    });

    await adminController.banEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Cannot ban a private event' });
  });

  it('[Abnormal] TC05 - should return 400 when banReason is missing', async () => {
    const { getEventById } = await import('../../services/eventService.js');

    const req = {
      params: { eventId: 'e1' },
      body: {},
    };
    const res = mockRes();

    getEventById.mockResolvedValue({
      _id: 'e1',
      type: 'public',
      banInfo: { isBanned: false },
    });

    await adminController.banEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Ban reason is required' });
  });

  it('[Abnormal] TC06 - should return 500 when service throws error', async () => {
    const { getEventById } = await import('../../services/eventService.js');

    const req = {
      params: { eventId: 'e1' },
      body: { banReason: 'violation' },
    };
    const res = mockRes();

    getEventById.mockRejectedValue(new Error('DB error'));

    await adminController.banEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Fail to ban event',
      }),
    );
  });
});


