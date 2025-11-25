import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as eventMemberController from '../eventMemberController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/eventService.js', () => ({
  __esModule: true,
  findEventById: vi.fn(),
}));

vi.mock('../../services/eventMemberService.js', () => ({
  __esModule: true,
  getMembersByEventRaw: vi.fn(),
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

describe('eventMemberController.getMemberRawForRisk', () => {
  it('[Normal] TC01 - should get members raw for risk successfully', async () => {
    const { findEventById } = await import('../../services/eventService.js');
    const { getMembersByEventRaw } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123' }
    };
    const res = mockRes();

    const mockEvent = { _id: 'evt123', name: 'Tech Conference' };
    const mockMembers = [
      { _id: 'member1', userId: { fullName: 'John Doe' }, role: 'Member' },
      { _id: 'member2', userId: { fullName: 'Jane Smith' }, role: 'HoD' }
    ];

    findEventById.mockResolvedValue(mockEvent);
    getMembersByEventRaw.mockResolvedValue(mockMembers);

    await eventMemberController.getMemberRawForRisk(req, res);

    expect(findEventById).toHaveBeenCalledWith('evt123');
    expect(getMembersByEventRaw).toHaveBeenCalledWith('evt123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockMembers,
        message: 'Get All member Successfully'
      })
    );
  });

  it('[Abnormal] TC02 - should return 404 if event not found', async () => {
    const { findEventById } = await import('../../services/eventService.js');

    const req = {
      params: { eventId: 'notfound' }
    };
    const res = mockRes();

    findEventById.mockResolvedValue(null);

    await eventMemberController.getMemberRawForRisk(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Event not found' })
    );
  });

  it('[Abnormal] TC03 - should return 500 on database error', async () => {
    const { findEventById } = await import('../../services/eventService.js');

    const req = {
      params: { eventId: 'evt123' }
    };
    const res = mockRes();

    findEventById.mockRejectedValue(new Error('DB error'));

    await eventMemberController.getMemberRawForRisk(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to load members' })
    );
  });
});
