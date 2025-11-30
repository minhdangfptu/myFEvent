// src/controllers/__tests__/EventController/eventController.getAllEventDetail.test.js
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

describe('eventController.getAllEventDetail', () => {
  it('[Normal] TC01 - should return full event detail for user', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    const mockResult = { id: 'e1', name: 'My event', details: {} };
    eventService.getAllEventDetail.mockResolvedValue(mockResult);

    const req = {
      user: { id: 'user1' },
      params: { id: 'e1' },
    };
    const res = mockRes();

    await eventController.getAllEventDetail(req, res);

    expect(eventService.getAllEventDetail).toHaveBeenCalledWith({
      userId: 'user1',
      id: 'e1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });

  it('[Abnormal] TC02 - should return 403 when user not allowed', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    const err = new Error('Forbidden');
    err.status = 403;
    eventService.getAllEventDetail.mockRejectedValue(err);

    const req = {
      user: { id: 'user1' },
      params: { id: 'e1' },
    };
    const res = mockRes();

    await eventController.getAllEventDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Forbidden' }),
    );
  });
});
