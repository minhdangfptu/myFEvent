import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as departmentController from '../departmentController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/departmentService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
  ensureDepartmentInEvent: vi.fn(),
  deleteDepartmentDoc: vi.fn(),
}));

vi.mock('../../services/eventMemberService.js', () => ({
  __esModule: true,
  getRequesterMembership: vi.fn(),
  getMembersByDepartmentRaw: vi.fn(), // ⬅ THÊM DÒNG NÀY
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

describe('departmentController.deleteDepartment', () => {
  it('[Normal] TC01 - should delete department successfully by HoOC', async () => {
  const {
    ensureEventExists,
    ensureDepartmentInEvent,
    deleteDepartmentDoc,
  } = await import('../../services/departmentService.js');
  const { getRequesterMembership, getMembersByDepartmentRaw } = await import('../../services/eventMemberService.js');
  getMembersByDepartmentRaw.mockResolvedValue([]); 
  const req = {
    params: { eventId: 'evt123', departmentId: 'dept1' },
    user: { id: 'hooc1' }
  };
  const res = mockRes();

  ensureEventExists.mockResolvedValue(true);
  ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
  getRequesterMembership.mockResolvedValue({ role: 'HoOC' });

  getMembersByDepartmentRaw.mockResolvedValue([]);   
  deleteDepartmentDoc.mockResolvedValue();

  await departmentController.deleteDepartment(req, res);

  expect(deleteDepartmentDoc).toHaveBeenCalledWith('dept1');
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'Xoá department thành công' })
  );
});


  it('[Abnormal] TC02 - should return 404 if event not found', async () => {
    const { ensureEventExists } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'notfound', departmentId: 'dept1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(false);

    await departmentController.deleteDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Event không tồn tại' })
    );
  });

  it('[Abnormal] TC03 - should return 404 if department not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'notfound' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue(null);

    await departmentController.deleteDepartment(req, res);

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
      user: { id: 'member1' }
    };
    const res = mockRes();

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dept1' });
    getRequesterMembership.mockResolvedValue({ role: 'Member' });

    await departmentController.deleteDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Chỉ HooC mới được xoá Department' })
    );
  });

  it('[Abnormal] TC05 - should return 500 on database error', async () => {
    const { ensureEventExists } = await import('../../services/departmentService.js');

    const req = {
      params: { eventId: 'evt123', departmentId: 'dept1' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventExists.mockRejectedValue(new Error('DB error'));

    await departmentController.deleteDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Xoá department thất bại' })
    );
  });
});
