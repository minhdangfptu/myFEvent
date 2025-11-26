import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as departmentController from '../departmentController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/departmentService.js', () => ({
  __esModule: true,
  findDepartmentsByEvent: vi.fn(),
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

describe('departmentController.listDepartmentsByEvent', () => {
  it('[Normal] TC01 - should list departments successfully with pagination', async () => {
    const { findDepartmentsByEvent } = await import('../../services/departmentService.js');
    const { countDepartmentMembersExcludingHoOC } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123' },
      query: { page: '1', limit: '20', search: '' }
    };
    const res = mockRes();

    const mockDepartments = [
      {
        _id: 'dept1',
        name: 'Marketing',
        description: 'Marketing team',
        leaderId: { _id: 'user1', fullName: 'John Doe' },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    findDepartmentsByEvent.mockResolvedValue({
      items: mockDepartments,
      total: 1
    });
    countDepartmentMembersExcludingHoOC.mockResolvedValue(5);

    await departmentController.listDepartmentsByEvent(req, res);

    expect(findDepartmentsByEvent).toHaveBeenCalledWith('evt123', {
      search: '',
      skip: 0,
      limit: 20
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            name: 'Marketing',
            memberCount: 5
          })
        ]),
        pagination: expect.objectContaining({
          page: 1,
          limit: 20,
          total: 1
        })
      })
    );
  });

  it('[Abnormal] TC02 - should return 500 on database error', async () => {
    const { findDepartmentsByEvent } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'evt123' },
      query: {}
    };
    const res = mockRes();

    findDepartmentsByEvent.mockRejectedValue(new Error('DB error'));

    await departmentController.listDepartmentsByEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to load departments' })
    );
  });
});
