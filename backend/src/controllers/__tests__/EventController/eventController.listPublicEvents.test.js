// src/controllers/__tests__/EventController/eventController.listPublicEvents.test.js
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

describe('eventController.listPublicEvents', () => {
  it('[Normal] TC01 - should return public events with query params', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    const mockResult = { data: [{ id: 'e1' }], pagination: { page: 1 } };
    eventService.listPublicEvents.mockResolvedValue(mockResult);

    const req = {
      query: { page: '2', limit: '10', search: 'Halloween', status: 'published' },
    };
    const res = mockRes();

    await eventController.listPublicEvents(req, res);

    expect(eventService.listPublicEvents).toHaveBeenCalledWith({
      page: '2',
      limit: '10',
      search: 'Halloween',
      status: 'published',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });

  it('[Abnormal] TC02 - should return error with custom status from service', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    const err = new Error('Invalid filter');
    err.status = 400;
    eventService.listPublicEvents.mockRejectedValue(err);

    const req = { query: {} };
    const res = mockRes();

    await eventController.listPublicEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid filter' }),
    );
  });

  it('[Abnormal] TC03 - should return 500 on unexpected error', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    eventService.listPublicEvents.mockRejectedValue(new Error('DB crashed'));

    const req = { query: {} };
    const res = mockRes();

    await eventController.listPublicEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'DB crashed' }),
    );
  });
});
