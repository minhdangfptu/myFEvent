import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as eventMemberController from '../eventMemberController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../services/eventMemberService.js', () => ({
  __esModule: true,
  getUnassignedMembersRaw: vi.fn(),
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

describe('eventMemberController.getUnassignedMembersByEvent', () => {
  it('[Normal] TC01 - should get unassigned members by HoOC', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const { getUnassignedMembersRaw } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    const mockMembers = [
      { _id: 'member1', userId: { fullName: 'John Doe' }, departmentId: null },
      { _id: 'member2', userId: { fullName: 'Jane Smith' }, departmentId: null }
    ];

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    getUnassignedMembersRaw.mockResolvedValue(mockMembers);

    await eventMemberController.getUnassignedMembersByEvent(req, res);

    expect(ensureEventRole).toHaveBeenCalledWith('hooc1', 'evt123', ['HoOC', 'HoD']);
    expect(getUnassignedMembersRaw).toHaveBeenCalledWith('evt123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockMembers
      })
    );
  });

  it('[Normal] TC02 - should get unassigned members by HoD', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const { getUnassignedMembersRaw } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123' },
      user: { id: 'hod1' }
    };
    const res = mockRes();

    const mockMembers = [];

    ensureEventRole.mockResolvedValue({ role: 'HoD' });
    getUnassignedMembersRaw.mockResolvedValue(mockMembers);

    await eventMemberController.getUnassignedMembersByEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC03 - should return 403 if user is not HoOC or HoD', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;

    const req = {
      params: { eventId: 'evt123' },
      user: { id: 'member1' }
    };
    const res = mockRes();

    ensureEventRole.mockResolvedValue(null);

    await eventMemberController.getUnassignedMembersByEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Only HoOC or HoD can view unassigned members' })
    );
  });

  it('[Abnormal] TC04 - should return 500 on database error', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;

    const req = {
      params: { eventId: 'evt123' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventRole.mockRejectedValue(new Error('DB error'));

    await eventMemberController.getUnassignedMembersByEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to load unassigned members' })
    );
  });
});
