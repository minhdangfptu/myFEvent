import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as eventMemberController from '../eventMemberController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/eventMemberService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
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

describe('eventMemberController.getCoreTeamList', () => {
  it('[Normal] TC01 - should get core team list (HoD members) successfully', async () => {
    const { ensureEventExists, getMembersByEventRaw } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123' }
    };
    const res = mockRes();

    const mockMembers = [
      { _id: 'member1', userId: { fullName: 'John Doe' }, role: 'HoD', departmentId: 'dept1' },
      { _id: 'member2', userId: { fullName: 'Jane Smith' }, role: 'Member', departmentId: 'dept1' },
      { _id: 'member3', userId: { fullName: 'Bob Wilson' }, role: 'HoD', departmentId: 'dept2' }
    ];

    ensureEventExists.mockResolvedValue(true);
    getMembersByEventRaw.mockResolvedValue(mockMembers);

    await eventMemberController.getCoreTeamList(req, res);

    expect(ensureEventExists).toHaveBeenCalledWith('evt123');
    expect(getMembersByEventRaw).toHaveBeenCalledWith('evt123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ role: 'HoD', _id: 'member1' }),
          expect.objectContaining({ role: 'HoD', _id: 'member3' })
        ])
      })
    );
    // Ensure only HoD members are returned
    const responseData = res.json.mock.calls[0][0].data;
    expect(responseData).toHaveLength(2);
    expect(responseData.every(m => m.role === 'HoD')).toBe(true);
  });

  it('[Normal] TC02 - should return empty array if no HoD members', async () => {
    const { ensureEventExists, getMembersByEventRaw } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123' }
    };
    const res = mockRes();

    const mockMembers = [
      { _id: 'member1', userId: { fullName: 'John Doe' }, role: 'Member' },
      { _id: 'member2', userId: { fullName: 'Jane Smith' }, role: 'HoOC' }
    ];

    ensureEventExists.mockResolvedValue(true);
    getMembersByEventRaw.mockResolvedValue(mockMembers);

    await eventMemberController.getCoreTeamList(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: []
      })
    );
  });

  it('[Abnormal] TC03 - should return 500 on database error', async () => {
    const { ensureEventExists } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123' }
    };
    const res = mockRes();

    ensureEventExists.mockRejectedValue(new Error('DB error'));

    await eventMemberController.getCoreTeamList(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to load core team members' })
    );
  });
});
