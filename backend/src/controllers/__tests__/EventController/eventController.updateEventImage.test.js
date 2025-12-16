// src/controllers/__tests__/EventController/eventController.updateEventImage.test.js
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

describe('eventController.updateEventImage', () => {
  it('[Normal] TC01 - should update event image', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    const mockResult = { id: 'e1', image: 'url.png' };
    eventService.updateEventImage.mockResolvedValue(mockResult);

    const req = {
      user: { id: 'user1' },
      params: { id: 'e1' },
      body: { image: 'url.png' },
    };
    const res = mockRes();

    await eventController.updateEventImage(req, res);

    expect(eventService.updateEventImage).toHaveBeenCalledWith({
      userId: 'user1',
      id: 'e1',
      image: 'url.png',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });

  it('[Abnormal] TC02 - should return 400 when service throws validation error', async () => {
    const { eventService } = await import('../../../services/eventService.js');

    const err = new Error('Invalid image');
    err.status = 400;
    eventService.updateEventImage.mockRejectedValue(err);

    const req = {
      user: { id: 'user1' },
      params: { id: 'e1' },
      body: { image: 'bad' },
    };
    const res = mockRes();

    await eventController.updateEventImage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
