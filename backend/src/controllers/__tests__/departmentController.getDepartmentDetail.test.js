import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as departmentController from '../departmentController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/departmentService.js', () => ({
  __esModule: true,
  findDepartmentById: vi.fn(),
}));

vi.mock('../../services/eventMemberService.js', () => ({
  __esModule: true,
  countDepartmentMembersExcludingHoOC: vi.fn(),
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

describe('departmentController.getDepartmentDetail', () => {
  it('[Normal] TC01 - should get department detail successfully', async () => {
    const { findDepartmentById } = await import('../../services/departmentService.js');
    const { countDepartmentMembersExcludingHoOC } = await import('../../services/eventMemberService.js');

    const req = {
      params: { departmentId: 'dept1' }
    };
    const res = mockRes();

    const mockDepartment = {
      _id: 'dept1',
      name: 'Marketing',
      description: 'Marketing team',
      leaderId: { _id: 'user1', fullName: 'John Doe' },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    findDepartmentById.mockResolvedValue(mockDepartment);
    countDepartmentMembersExcludingHoOC.mockResolvedValue(5);

    await departmentController.getDepartmentDetail(req, res);

    expect(findDepartmentById).toHaveBeenCalledWith('dept1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Marketing',
          memberCount: 5
        })
      })
    );
  });

  it('[Abnormal] TC02 - should return 404 if department not found', async () => {
    const { findDepartmentById } = await import('../../services/departmentService.js');

    const req = {
      params: { departmentId: 'notfound' }
    };
    const res = mockRes();

    findDepartmentById.mockResolvedValue(null);

    await departmentController.getDepartmentDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Department not found' })
    );
  });

  it('[Abnormal] TC03 - should return 500 on database error', async () => {
    const { findDepartmentById } = await import('../../services/departmentService.js');

    const req = {
      params: { departmentId: 'dept1' }
    };
    const res = mockRes();

    findDepartmentById.mockRejectedValue(new Error('DB error'));

    await departmentController.getDepartmentDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to get department detail' })
    );
  });
});
