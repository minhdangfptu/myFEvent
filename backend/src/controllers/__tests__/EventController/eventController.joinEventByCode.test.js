// src/controllers/__tests__/EventController/eventController.joinEventByCode.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as eventController from '../../eventController.js';

vi.mock('../../../services/eventService.js', () => ({
  __esModule: true,
  eventService: {
    listPublicEvents: vi.fn(),
    getPublicEventDetail: vi.fn(),
    getPrivateEventDetail: vi.fn(),
    createEvent: vi.fn(),
    joinEventByCode: vi.fn(),
    getEventSummary: vi.fn(),
    listMyEvents: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    updateEventImage: vi.fn(),
    getAllEventDetail: vi.fn(),
  },
  findEventById: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('eventController.joinEventByCode', () => {
  it('[Normal] TC01 - should join event with userId and code', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    const mockResult = { joined: true };
    eventService.joinEventByCode.mockResolvedValue(mockResult);

    const req = {
      user: { id: 'user1' },
      body: { code: 'ABC123' },
    };
    const res = mockRes();

    await eventController.joinEventByCode(req, res);

    expect(eventService.joinEventByCode).toHaveBeenCalledWith({
      userId: 'user1',
      code: 'ABC123',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });

  it('[Abnormal] TC02 - should return 400 when code invalid', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    const err = new Error('Invalid join code');
    err.status = 400;
    eventService.joinEventByCode.mockRejectedValue(err);

    const req = {
      user: { id: 'user1' },
      body: { code: 'WRONG' },
    };
    const res = mockRes();

    await eventController.joinEventByCode(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid join code' }),
    );
  });
});
