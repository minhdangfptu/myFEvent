import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as eventMemberController from '../eventMemberController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/eventMemberService.js', () => ({
  __esModule: true,
  getMembersByDepartmentRaw: vi.fn(),
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

describe('eventMemberController.getMembersByDepartment', () => {
  it('[Normal] TC01 - should get members by department successfully', async () => {
    const { getMembersByDepartmentRaw } = await import('../../services/eventMemberService.js');

    const req = {
      params: { departmentId: 'dept1' }
    };
    const res = mockRes();

    const mockMembers = [
      {
        _id: 'member1',
        userId: { _id: 'user1', fullName: 'John Doe', email: 'john@example.com' },
        role: 'Member',
        departmentId: 'dept1'
      },
      {
        _id: 'member2',
        userId: { _id: 'user2', fullName: 'Jane Smith', email: 'jane@example.com' },
        role: 'HoD',
        departmentId: 'dept1'
      }
    ];

    getMembersByDepartmentRaw.mockResolvedValue(mockMembers);

    await eventMemberController.getMembersByDepartment(req, res);

    expect(getMembersByDepartmentRaw).toHaveBeenCalledWith('dept1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockMembers
      })
    );
  });

  it('[Abnormal] TC02 - should return 500 on database error', async () => {
    const { getMembersByDepartmentRaw } = await import('../../services/eventMemberService.js');

    const req = {
      params: { departmentId: 'dept1' }
    };
    const res = mockRes();

    getMembersByDepartmentRaw.mockRejectedValue(new Error('DB error'));

    await eventMemberController.getMembersByDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to load members' })
    );
  });
});
