// src/controllers/__tests__/EventController/eventController.listMyEvents.test.js
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

describe('eventController.listMyEvents', () => {
  it('[Normal] TC01 - should list events of current user', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    const mockResult = { data: [{ id: 'e1' }], pagination: { page: 1 } };
    eventService.listMyEvents.mockResolvedValue(mockResult);

    const req = {
      user: { id: 'user1' },
      query: { page: '1', limit: '5', search: 'Halloween' },
    };
    const res = mockRes();

    await eventController.listMyEvents(req, res);

    expect(eventService.listMyEvents).toHaveBeenCalledWith({
      userId: 'user1',
      page: '1',
      limit: '5',
      search: 'Halloween',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });

  it('[Abnormal] TC02 - should return 500 when service rejects', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    eventService.listMyEvents.mockRejectedValue(new Error('DB error'));

    const req = {
      user: { id: 'user1' },
      query: {},
    };
    const res = mockRes();

    await eventController.listMyEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
