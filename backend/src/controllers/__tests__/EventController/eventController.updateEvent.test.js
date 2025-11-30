// src/controllers/__tests__/EventController/eventController.updateEvent.test.js
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

describe('eventController.updateEvent', () => {
  it('[Normal] TC01 - should update event with userId and id', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    const mockResult = { id: 'e1', name: 'Updated' };
    eventService.updateEvent.mockResolvedValue(mockResult);

    const req = {
      user: { id: 'user1' },
      params: { id: 'e1' },
      body: { name: 'Updated' },
    };
    const res = mockRes();

    await eventController.updateEvent(req, res);

    expect(eventService.updateEvent).toHaveBeenCalledWith({
      userId: 'user1',
      id: 'e1',
      body: { name: 'Updated' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });

  it('[Abnormal] TC02 - should return 403 when service throws forbidden', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    const err = new Error('Forbidden');
    err.status = 403;
    eventService.updateEvent.mockRejectedValue(err);

    const req = {
      user: { id: 'user1' },
      params: { id: 'e1' },
      body: {},
    };
    const res = mockRes();

    await eventController.updateEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Forbidden' }),
    );
  });
});
