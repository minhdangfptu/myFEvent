import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as departmentController from '../departmentController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/departmentService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
  ensureDepartmentInEvent: vi.fn(),
  removeMemberFromDepartmentDoc: vi.fn(),
}));

vi.mock('../../services/eventMemberService.js', () => ({
  __esModule: true,
  getRequesterMembership: vi.fn(),
  findEventMemberById: vi.fn(),
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

describe('departmentController.removeMemberFromDepartment', () => {
  it('[Normal] TC01 - should remove member from department successfully by HoOC', async () => {
    const { ensureEventExists, ensureDepartmentInEvent, removeMemberFromDepartmentDoc } = await import('../../services/departmentService.js');
    const { getRequesterMembership, findEventMemberById } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1', memberId: 'member1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'HooC' });
    findEventMemberById.mockResolvedValue({
      role: 'Member',
      departmentId: { toString: () => 'dept1' }
    });
    removeMemberFromDepartmentDoc.mockResolvedValue();

    await departmentController.removeMemberFromDepartment(req, res);

    expect(removeMemberFromDepartmentDoc).toHaveBeenCalledWith('evt123', 'dept1', 'member1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Member removed from department' })
    );
  });

  it('[Normal] TC02 - should remove member by HoD of the department', async () => {
    const { ensureEventExists, ensureDepartmentInEvent, removeMemberFromDepartmentDoc } = await import('../../services/departmentService.js');
    const { getRequesterMembership, findEventMemberById } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1', memberId: 'member1' },
      user: { id: 'hod1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({
      role: 'HoD',
      departmentId: { toString: () => 'dept1' }
    });
    findEventMemberById.mockResolvedValue({
      role: 'Member',
      departmentId: { toString: () => 'dept1' }
    });
    removeMemberFromDepartmentDoc.mockResolvedValue();

    await departmentController.removeMemberFromDepartment(req, res);

    expect(removeMemberFromDepartmentDoc).toHaveBeenCalledWith('evt123', 'dept1', 'member1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC03 - should return 404 if event not found', async () => {
    const { ensureEventExists } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'notfound', departmentId: 'dept1', memberId: 'member1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(false);

    await departmentController.removeMemberFromDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Event not found' })
    );
  });

  it('[Abnormal] TC04 - should return 404 if department not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'notfound', memberId: 'member1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue(null);

    await departmentController.removeMemberFromDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Department not found' })
    );
  });

  it('[Abnormal] TC05 - should return 403 if requester has insufficient permissions', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');
    const { getRequesterMembership } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1', memberId: 'member1' },
      user: { id: 'member2' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'Member' });

    await departmentController.removeMemberFromDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Insufficient permissions' })
    );
  });

  it('[Abnormal] TC06 - should return 403 if HoD tries to remove member from different department', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');
    const { getRequesterMembership } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1', memberId: 'member1' },
      user: { id: 'hod1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({
      role: 'HoD',
      departmentId: { toString: () => 'dept2' }
    });

    await departmentController.removeMemberFromDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Insufficient permissions' })
    );
  });

  it('[Abnormal] TC07 - should return 404 if member not in department', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');
    const { getRequesterMembership, findEventMemberById } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1', memberId: 'member1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'HooC' });
    findEventMemberById.mockResolvedValue({
      role: 'Member',
      departmentId: { toString: () => 'dept2' }
    });

    await departmentController.removeMemberFromDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Member is not in this department' })
    );
  });

  it('[Abnormal] TC08 - should return 404 if member does not exist', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');
    const { getRequesterMembership, findEventMemberById } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1', memberId: 'notfound' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'HooC' });
    findEventMemberById.mockResolvedValue(null);

    await departmentController.removeMemberFromDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Member is not in this department' })
    );
  });

  it('[Abnormal] TC09 - should return 409 if trying to remove HoOC', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');
    const { getRequesterMembership, findEventMemberById } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1', memberId: 'member1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'HooC' });
    findEventMemberById.mockResolvedValue({
      role: 'HooC',
      departmentId: { toString: () => 'dept1' }
    });

    await departmentController.removeMemberFromDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Cannot remove HooC from department' })
    );
  });

  it('[Abnormal] TC10 - should return 409 if trying to remove HoD', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');
    const { getRequesterMembership, findEventMemberById } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1', memberId: 'member1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'HooC' });
    findEventMemberById.mockResolvedValue({
      role: 'HoD',
      departmentId: { toString: () => 'dept1' }
    });

    await departmentController.removeMemberFromDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Unassign HoD before removing from department' })
    );
  });

  it('[Abnormal] TC11 - should return 500 on database error', async () => {
    const { ensureEventExists } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1', memberId: 'member1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockRejectedValue(new Error('DB error'));

    await departmentController.removeMemberFromDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to remove member from department' })
    );
  });
});
