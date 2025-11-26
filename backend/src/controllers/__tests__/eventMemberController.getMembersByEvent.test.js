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
  groupMembersByDepartment: vi.fn(),
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

describe('eventMemberController.getMembersByEvent', () => {
  it('[Normal] TC01 - should get members by event successfully', async () => {
    const { findEventById } = await import('../../services/eventService.js');
    const { getMembersByEventRaw, groupMembersByDepartment } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123' }
    };
    const res = mockRes();

    const mockEvent = {
      _id: 'evt123',
      name: 'Tech Conference',
      description: 'Annual tech event'
    };

    const mockMembers = [
      { _id: 'member1', userId: { fullName: 'John Doe' }, departmentId: 'dept1' },
      { _id: 'member2', userId: { fullName: 'Jane Smith' }, departmentId: 'dept1' }
    ];

    const mockGrouped = {
      dept1: [
        { _id: 'member1', userId: { fullName: 'John Doe' } },
        { _id: 'member2', userId: { fullName: 'Jane Smith' } }
      ]
    };

    findEventById.mockResolvedValue(mockEvent);
    getMembersByEventRaw.mockResolvedValue(mockMembers);
    groupMembersByDepartment.mockReturnValue(mockGrouped);

    await eventMemberController.getMembersByEvent(req, res);

    expect(findEventById).toHaveBeenCalledWith('evt123');
    expect(getMembersByEventRaw).toHaveBeenCalledWith('evt123');
    expect(groupMembersByDepartment).toHaveBeenCalledWith(mockMembers);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockGrouped,
        event: expect.objectContaining({
          id: 'evt123',
          name: 'Tech Conference'
        })
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

    await eventMemberController.getMembersByEvent(req, res);

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

    await eventMemberController.getMembersByEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to load members' })
    );
  });
});
