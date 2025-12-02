// src/controllers/__tests__/EventController/eventController.createEvent.test.js
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

describe('eventController.createEvent', () => {
  it('[Normal] TC01 - should create event with userId and body', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    const mockResult = { id: 'e1', name: 'New event' };
    eventService.createEvent.mockResolvedValue(mockResult);

    const req = {
      user: { id: 'user1' },
      body: { name: 'New event', description: 'Desc' },
    };
    const res = mockRes();

    await eventController.createEvent(req, res);

    expect(eventService.createEvent).toHaveBeenCalledWith({
      userId: 'user1',
      body: { name: 'New event', description: 'Desc' },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });

  it('[Abnormal] TC02 - should return 400 with missingFields from error', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    const err = new Error('Validation failed');
    err.status = 400;
    err.missingFields = ['name'];
    eventService.createEvent.mockRejectedValue(err);

    const req = {
      user: { id: 'user1' },
      body: { description: 'no name' },
    };
    const res = mockRes();

    await eventController.createEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Validation failed',
        missingFields: ['name'],
      }),
    );
  });

  it('[Abnormal] TC03 - should pass undefined userId if user not logged in', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    const mockResult = { id: 'e2' };
    eventService.createEvent.mockResolvedValue(mockResult);

    const req = {
      user: undefined,
      body: { name: 'Anonymous event' },
    };
    const res = mockRes();

    await eventController.createEvent(req, res);

    expect(eventService.createEvent).toHaveBeenCalledWith({
      userId: undefined,
      body: { name: 'Anonymous event' },
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
