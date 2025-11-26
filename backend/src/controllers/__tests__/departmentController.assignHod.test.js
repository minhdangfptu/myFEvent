import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as departmentController from '../departmentController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/departmentService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
  ensureDepartmentInEvent: vi.fn(),
  ensureUserExists: vi.fn(),
  assignHoDToDepartment: vi.fn(),
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

describe('departmentController.assignHod', () => {
  it('[Normal] TC01 - should assign HoD successfully by HoOC', async () => {
    const { ensureEventExists, ensureDepartmentInEvent, ensureUserExists, assignHoDToDepartment } = await import('../../services/departmentService.js');
    const { getRequesterMembership } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { userId: 'user1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    const mockDepartment = { _id: 'dept1', name: 'Marketing' };
    const mockUpdated = { ...mockDepartment, leaderId: 'user1' };

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue(mockDepartment);
    getRequesterMembership.mockResolvedValue({ role: 'HooC' });
    ensureUserExists.mockResolvedValue({ _id: 'user1' });
    assignHoDToDepartment.mockResolvedValue(mockUpdated);

    await departmentController.assignHod(req, res);

    expect(assignHoDToDepartment).toHaveBeenCalledWith('evt123', mockDepartment, 'user1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC02 - should return 400 if userId is missing', async () => {
    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: {},
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    await departmentController.assignHod(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'userId is required' })
    );
  });

  it('[Abnormal] TC03 - should return 404 if event not found', async () => {
    const { ensureEventExists } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'notfound', departmentId: 'dept1' },
      body: { userId: 'user1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(false);

    await departmentController.assignHod(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Event not found' })
    );
  });

  it('[Abnormal] TC04 - should return 404 if department not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'notfound' },
      body: { userId: 'user1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue(null);

    await departmentController.assignHod(req, res);

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
      body: { userId: 'user1' },
      user: { id: 'member1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'Member' });

    await departmentController.assignHod(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Only HooC can assign HoD' })
    );
  });

  it('[Abnormal] TC06 - should return 404 if user not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent, ensureUserExists } = await import('../../services/departmentService.js');
    const { getRequesterMembership } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { userId: 'notfound' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'HooC' });
    ensureUserExists.mockResolvedValue(null);

    await departmentController.assignHod(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User not found' })
    );
  });

  it('[Abnormal] TC07 - should return 500 on database error', async () => {
    const { ensureEventExists } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { userId: 'user1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockRejectedValue(new Error('DB error'));

    await departmentController.assignHod(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to assign HoD' })
    );
  });
});
