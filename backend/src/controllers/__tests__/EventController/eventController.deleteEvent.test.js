// src/controllers/__tests__/EventController/eventController.deleteEvent.test.js
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

describe('eventController.deleteEvent', () => {
  it('[Normal] TC01 - should delete event with userId and id', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    const mockResult = { success: true };
    eventService.deleteEvent.mockResolvedValue(mockResult);

    const req = {
      user: { id: 'user1' },
      params: { id: 'e1' },
    };
    const res = mockRes();

    await eventController.deleteEvent(req, res);

    expect(eventService.deleteEvent).toHaveBeenCalledWith({
      userId: 'user1',
      id: 'e1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });

  it('[Abnormal] TC02 - should return 404 when event not found', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    const err = new Error('Event not found');
    err.status = 404;
    eventService.deleteEvent.mockRejectedValue(err);

    const req = {
      user: { id: 'user1' },
      params: { id: 'e1' },
    };
    const res = mockRes();

    await eventController.deleteEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
