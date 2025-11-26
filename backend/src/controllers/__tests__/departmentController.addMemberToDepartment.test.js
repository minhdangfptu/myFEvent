import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as departmentController from '../departmentController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../services/departmentService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
  ensureDepartmentInEvent: vi.fn(),
  addMemberToDepartmentDoc: vi.fn(),
}));

vi.mock('../../services/eventMemberService.js', () => ({
  __esModule: true,
  getRequesterMembership: vi.fn(),
  findEventMemberById: vi.fn(),
}));

vi.mock('../../services/notificationService.js', () => ({
  __esModule: true,
  notifyMemberJoined: vi.fn(),
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

describe('departmentController.addMemberToDepartment', () => {
  it('[Normal] TC01 - should add member to department successfully by HoOC', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const { ensureEventExists, ensureDepartmentInEvent, addMemberToDepartmentDoc } = await import('../../services/departmentService.js');
    const { getRequesterMembership, findEventMemberById } = await import('../../services/eventMemberService.js');
    const { notifyMemberJoined } = await import('../../services/notificationService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { memberId: 'member1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    const mockMembership = { role: 'Member', departmentId: null };
    const mockUpdated = { ...mockMembership, departmentId: 'dept1' };

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'HoOC' });
    findEventMemberById.mockResolvedValue(mockMembership);
    addMemberToDepartmentDoc.mockResolvedValue(mockUpdated);
    notifyMemberJoined.mockResolvedValue();

    await departmentController.addMemberToDepartment(req, res);

    expect(addMemberToDepartmentDoc).toHaveBeenCalledWith('evt123', 'dept1', 'member1', 'Member');
    expect(notifyMemberJoined).toHaveBeenCalledWith('evt123', 'dept1', 'member1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Normal] TC02 - should add member by HoD of the department', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const { ensureEventExists, ensureDepartmentInEvent, addMemberToDepartmentDoc } = await import('../../services/departmentService.js');
    const { getRequesterMembership, findEventMemberById } = await import('../../services/eventMemberService.js');
    const { notifyMemberJoined } = await import('../../services/notificationService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { memberId: 'member1' },
      user: { id: 'hod1' }
    };
    const res = mockRes();

    const mockMembership = { role: 'Member', departmentId: null };
    const mockUpdated = { ...mockMembership, departmentId: 'dept1' };

    ensureEventRole.mockResolvedValue({ role: 'HoD' });
    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({
      role: 'HoD',
      departmentId: { toString: () => 'dept1' }
    });
    findEventMemberById.mockResolvedValue(mockMembership);
    addMemberToDepartmentDoc.mockResolvedValue(mockUpdated);
    notifyMemberJoined.mockResolvedValue();

    await departmentController.addMemberToDepartment(req, res);

    expect(addMemberToDepartmentDoc).toHaveBeenCalledWith('evt123', 'dept1', 'member1', 'Member');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC03 - should return 403 if requester lacks permission', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { memberId: 'member1' },
      user: { id: 'member2' }
    };
    const res = mockRes();

    ensureEventRole.mockResolvedValue(null);

    await departmentController.addMemberToDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Only HoOC or HoD can add member to department' })
    );
  });

  it('[Abnormal] TC04 - should return 404 if event not found', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const { ensureEventExists } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'notfound', departmentId: 'dept1' },
      body: { memberId: 'member1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    ensureEventExists.mockResolvedValue(false);

    await departmentController.addMemberToDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Event not found' })
    );
  });

  it('[Abnormal] TC05 - should return 404 if department not found', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'notfound' },
      body: { memberId: 'member1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue(null);

    await departmentController.addMemberToDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Department not found' })
    );
  });

  it('[Abnormal] TC06 - should return 403 if HoD tries to add member to different department', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');
    const { getRequesterMembership } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { memberId: 'member1' },
      user: { id: 'hod1' }
    };
    const res = mockRes();

    ensureEventRole.mockResolvedValue({ role: 'HoD' });
    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({
      role: 'HoD',
      departmentId: { toString: () => 'dept2' }
    });

    await departmentController.addMemberToDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Insufficient permissions' })
    );
  });

  it('[Abnormal] TC07 - should return 400 if memberId is missing', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');
    const { getRequesterMembership } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: {},
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'HoOC' });

    await departmentController.addMemberToDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'memberId is required' })
    );
  });

  it('[Abnormal] TC08 - should return 404 if EventMember not found', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');
    const { getRequesterMembership, findEventMemberById } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { memberId: 'notfound' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'HoOC' });
    findEventMemberById.mockResolvedValue(null);

    await departmentController.addMemberToDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'EventMember not found!' })
    );
  });

  it('[Abnormal] TC09 - should return 409 if trying to add HoOC to department', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');
    const { getRequesterMembership, findEventMemberById } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { memberId: 'member1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'HoOC' });
    findEventMemberById.mockResolvedValue({ role: 'HoOC' });

    await departmentController.addMemberToDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Cannot move HooC into a department' })
    );
  });

  it('[Abnormal] TC10 - should return 409 if HoD of another department', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');
    const { getRequesterMembership, findEventMemberById } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { memberId: 'member1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'HoOC' });
    findEventMemberById.mockResolvedValue({
      role: 'HoD',
      departmentId: { toString: () => 'dept2' }
    });

    await departmentController.addMemberToDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User is HoD of another department' })
    );
  });
});
