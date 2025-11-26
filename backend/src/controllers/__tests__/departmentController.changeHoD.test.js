import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as departmentController from '../departmentController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/departmentService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
  ensureDepartmentInEvent: vi.fn(),
  ensureUserExists: vi.fn(),
  isUserMemberOfDepartment: vi.fn(),
  assignHoDToDepartment: vi.fn(),
}));

vi.mock('../../services/eventMemberService.js', () => ({
  __esModule: true,
  getRequesterMembership: vi.fn(),
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

describe('departmentController.changeHoD', () => {
  it('[Normal] TC01 - should change HoD successfully', async () => {
    const { ensureEventExists, ensureDepartmentInEvent, ensureUserExists, isUserMemberOfDepartment, assignHoDToDepartment } = await import('../../services/departmentService.js');
    const { getRequesterMembership, countDepartmentMembersExcludingHoOC } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { newHoDId: 'user2' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    const mockDepartment = { _id: 'dept1', name: 'Marketing' };
    const mockUpdated = {
      _id: 'dept1',
      name: 'Marketing',
      description: 'Marketing team',
      leaderId: { _id: 'user2', fullName: 'Jane Doe' },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue(mockDepartment);
    getRequesterMembership.mockResolvedValue({ role: 'HoOC' });
    ensureUserExists.mockResolvedValue({ _id: 'user2' });
    isUserMemberOfDepartment.mockResolvedValue(true);
    assignHoDToDepartment.mockResolvedValue(mockUpdated);
    countDepartmentMembersExcludingHoOC.mockResolvedValue(5);

    await departmentController.changeHoD(req, res);

    expect(isUserMemberOfDepartment).toHaveBeenCalledWith('evt123', 'dept1', 'user2');
    expect(assignHoDToDepartment).toHaveBeenCalledWith('evt123', mockDepartment, 'user2');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Department head changed successfully'
      })
    );
  });

  it('[Abnormal] TC02 - should return 400 if newHoDId is missing', async () => {
    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: {},
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    await departmentController.changeHoD(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'newHoDId is required' })
    );
  });

  it('[Abnormal] TC03 - should return 404 if event not found', async () => {
    const { ensureEventExists } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'notfound', departmentId: 'dept1' },
      body: { newHoDId: 'user2' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(false);

    await departmentController.changeHoD(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Event not found' })
    );
  });

  it('[Abnormal] TC04 - should return 404 if department not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'notfound' },
      body: { newHoDId: 'user2' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue(null);

    await departmentController.changeHoD(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Department not found' })
    );
  });

  it('[Abnormal] TC05 - should return 403 if requester is not HoOC', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');
    const { getRequesterMembership } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { newHoDId: 'user2' },
      user: { id: 'member1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'Member' });

    await departmentController.changeHoD(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Only HoOC can change department head' })
    );
  });

  it('[Abnormal] TC06 - should return 404 if new HoD user not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent, ensureUserExists } = await import('../../services/departmentService.js');
    const { getRequesterMembership } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { newHoDId: 'notfound' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'HoOC' });
    ensureUserExists.mockResolvedValue(null);

    await departmentController.changeHoD(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'New HoD user not found' })
    );
  });

  it('[Abnormal] TC07 - should return 400 if new HoD is not a member of department', async () => {
    const { ensureEventExists, ensureDepartmentInEvent, ensureUserExists, isUserMemberOfDepartment } = await import('../../services/departmentService.js');
    const { getRequesterMembership } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { newHoDId: 'user2' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'HoOC' });
    ensureUserExists.mockResolvedValue({ _id: 'user2' });
    isUserMemberOfDepartment.mockResolvedValue(false);

    await departmentController.changeHoD(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'New HoD must be a member of this department' })
    );
  });

  it('[Abnormal] TC08 - should return 500 on database error', async () => {
    const { ensureEventExists } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { newHoDId: 'user2' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockRejectedValue(new Error('DB error'));

    await departmentController.changeHoD(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Failed to change department head') })
    );
  });
});
