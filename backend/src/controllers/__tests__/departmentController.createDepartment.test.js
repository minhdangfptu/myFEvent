import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as departmentController from '../departmentController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/departmentService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
  createDepartmentDoc: vi.fn(),
}));

vi.mock('../../services/eventMemberService.js', () => ({
  __esModule: true,
  getRequesterMembership: vi.fn(),
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

describe('departmentController.createDepartment', () => {
  it('[Normal] TC01 - should create department successfully by HoOC', async () => {
    const { ensureEventExists, createDepartmentDoc } = await import('../../services/departmentService.js');
    const { getRequesterMembership } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123' },
      body: {
        name: 'Marketing',
        description: 'Marketing team',
        leaderId: 'user1'
      },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    const mockCreatedDept = {
      _id: 'dept1',
      name: 'Marketing',
      description: 'Marketing team',
      leaderId: { _id: 'user1', fullName: 'John Doe' },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    ensureEventExists.mockResolvedValue(true);
    getRequesterMembership.mockResolvedValue({ role: 'HoOC' });
    createDepartmentDoc.mockResolvedValue(mockCreatedDept);

    await departmentController.createDepartment(req, res);

    expect(ensureEventExists).toHaveBeenCalledWith('evt123');
    expect(getRequesterMembership).toHaveBeenCalledWith('evt123', 'hooc1');
    expect(createDepartmentDoc).toHaveBeenCalledWith({
      eventId: 'evt123',
      name: 'Marketing',
      description: 'Marketing team',
      leaderId: 'user1'
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Marketing' })
      })
    );
  });

  it('[Abnormal] TC02 - should return 404 if event not found', async () => {
    const { ensureEventExists } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'notfound' },
      body: { name: 'Marketing' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(false);

    await departmentController.createDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Event không tồn tại' })
    );
  });

  it('[Abnormal] TC03 - should return 403 if requester is not HoOC', async () => {
    const { ensureEventExists } = await import('../../services/departmentService.js');
    const { getRequesterMembership } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123' },
      body: { name: 'Marketing' },
      user: { id: 'member1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    getRequesterMembership.mockResolvedValue({ role: 'Member' });

    await departmentController.createDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Chỉ HooC mới được tạo Department' })
    );
  });

  it('[Abnormal] TC04 - should return 500 on database error', async () => {
    const { ensureEventExists } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'evt123' },
      body: { name: 'Marketing' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockRejectedValue(new Error('DB error'));

    await departmentController.createDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Tạo department thất bại' })
    );
  });
});
