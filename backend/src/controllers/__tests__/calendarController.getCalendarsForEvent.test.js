import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCalendarsForEvent } from '../calendarController.js';

/* -------------------- Mocks -------------------- */
vi.mock('../../services/eventService.js', () => ({
  __esModule: true,
  findEventById: vi.fn(),
}));

vi.mock('../../services/calendarService.js', () => ({
  __esModule: true,
  getCalendarByEventId: vi.fn(),
}));

/* -------------------- Helpers -------------------- */
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

/* -------------------- Tests -------------------- */

describe('calendarController.getCalendarsForEvent', () => {
  it('[Normal] TC01 - should return calendars of event', async () => {
    const { findEventById } = await import('../../services/eventService.js');
    const { getCalendarByEventId } = await import('../../services/calendarService.js');

    findEventById.mockResolvedValue({ id: 'e1', name: 'Event 1' });
    getCalendarByEventId.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);

    const req = { params: { eventId: 'e1' } };
    const res = mockRes();

    await getCalendarsForEvent(req, res);

    expect(findEventById).toHaveBeenCalledWith('e1');
    expect(getCalendarByEventId).toHaveBeenCalledWith('e1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [{ id: 'c1' }, { id: 'c2' }],
    });
  });

  it('[Abnormal] TC02 - should return 404 if event not found', async () => {
    const { findEventById } = await import('../../services/eventService.js');

    findEventById.mockResolvedValue(null);

    const req = { params: { eventId: 'e404' } };
    const res = mockRes();

    await getCalendarsForEvent(req, res);

    expect(findEventById).toHaveBeenCalledWith('e404');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Event not found' })
    );
  });

  it('[Abnormal] TC03 - should return 500 on unexpected error', async () => {
    const { findEventById } = await import('../../services/eventService.js');

    findEventById.mockRejectedValue(new Error('DB error'));

    const req = { params: { eventId: 'e1' } };
    const res = mockRes();

    await getCalendarsForEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to load calendar' })
    );
  });
});
