import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as departmentController from '../departmentController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/departmentService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
  ensureDepartmentInEvent: vi.fn(),
  updateDepartmentDoc: vi.fn(),
  findDepartmentByName: vi.fn(),  // <-- FIX
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

beforeEach(async () => {
  vi.clearAllMocks();
  const { findDepartmentByName } = await import('../../services/departmentService.js');
  findDepartmentByName.mockResolvedValue(null); // <-- FIX
});

/* -------------------- Tests -------------------- */

describe('departmentController.editDepartment', () => {
  it('[Normal] TC01 - should edit department successfully by HoOC', async () => {
    const { ensureEventExists, ensureDepartmentInEvent, updateDepartmentDoc } = await import('../../services/departmentService.js');
    const { getRequesterMembership } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: {
        name: 'Updated Marketing',
        description: 'Updated description'
      },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    const mockDepartment = { _id: 'dept1', name: 'Marketing' };
    const mockUpdated = { ...mockDepartment, name: 'Updated Marketing' };

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue(mockDepartment);
    getRequesterMembership.mockResolvedValue({ role: 'HoOC' });
    updateDepartmentDoc.mockResolvedValue(mockUpdated);

    await departmentController.editDepartment(req, res);

    expect(updateDepartmentDoc).toHaveBeenCalledWith('dept1', {
      name: 'Updated Marketing',
      description: 'Updated description'
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC02 - should return 404 if event not found', async () => {
    const { ensureEventExists } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'notfound', departmentId: 'dept1' },
      body: { name: 'Updated' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(false);

    await departmentController.editDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Event không tồn tại' })
    );
  });

  it('[Abnormal] TC03 - should return 404 if department not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'notfound' },
      body: { name: 'Updated' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue(null);

    await departmentController.editDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Department không tồn tại' })
    );
  });

  it('[Abnormal] TC04 - should return 403 if requester is not HoOC', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');
    const { getRequesterMembership } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { name: 'Updated' },
      user: { id: 'member1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'Member' });

    await departmentController.editDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Chỉ HooC mới được sửa Department' })
    );
  });

  it('[Abnormal] TC05 - should return 500 on database error', async () => {
    const { ensureEventExists } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      body: { name: 'Updated' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockRejectedValue(new Error('DB error'));

    await departmentController.editDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Sửa department thất bại' })
    );
  });
});
