import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as eventMemberController from '../eventMemberController.js';
import mongoose from 'mongoose';

/* -------------------- Mocks -------------------- */

vi.mock('../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../models/eventMember.js', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../../services/departmentService.js', () => ({
  __esModule: true,
  ensureDepartmentInEvent: vi.fn(),
}));

vi.mock('../../services/notificationService.js', () => ({
  __esModule: true,
  createNotification: vi.fn(),
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

describe('eventMemberController.changeMemberDepartment', () => {
  it('[Normal] TC01 - should change member department successfully by HoOC', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;
    const { ensureDepartmentInEvent } = await import('../../services/departmentService.js');
    const { createNotification } = await import('../../services/notificationService.js');

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const newDeptId = new mongoose.Types.ObjectId().toString();

    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      body: { departmentId: newDeptId },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    const mockMember = {
      _id: validMemberId,
      eventId: 'evt123',
      role: 'Member',
      userId: { _id: 'user1', fullName: 'John Doe', email: 'john@example.com' },
      departmentId: { _id: 'dept1', name: 'Marketing' },
      status: 'active'
    };

    const mockNewDept = {
      _id: newDeptId,
      name: 'IT Department'
    };

    const mockUpdatedMember = {
      ...mockMember,
      departmentId: { _id: newDeptId, name: 'IT Department' }
    };

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockMember)
        })
      })
    });
    ensureDepartmentInEvent.mockResolvedValue(mockNewDept);
    EventMember.findOneAndUpdate.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockUpdatedMember)
        })
      })
    });
    createNotification.mockResolvedValue();

    await eventMemberController.changeMemberDepartment(req, res);

    expect(ensureEventRole).toHaveBeenCalledWith('hooc1', 'evt123', ['HoOC', 'HoD']);
    expect(ensureDepartmentInEvent).toHaveBeenCalledWith('evt123', newDeptId);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user1',
        eventId: 'evt123',
        category: 'THÀNH VIÊN'
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Cập nhật chuyên môn thành công'
      })
    );
  });

  it('[Normal] TC02 - should change member department by HoD of same department', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;
    const { ensureDepartmentInEvent } = await import('../../services/departmentService.js');
    const { createNotification } = await import('../../services/notificationService.js');

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const dept1Id = 'dept1';
    const newDeptId = new mongoose.Types.ObjectId().toString();

    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      body: { departmentId: newDeptId },
      user: { id: 'hod1' }
    };
    const res = mockRes();

    const mockMember = {
      _id: validMemberId,
      role: 'Member',
      userId: { _id: 'user1', fullName: 'John Doe' },
      departmentId: { _id: dept1Id, toString: () => dept1Id }
    };

    const mockNewDept = { _id: newDeptId, name: 'New Dept' };
    const mockUpdatedMember = { ...mockMember, departmentId: mockNewDept };

    ensureEventRole.mockResolvedValue({
      role: 'HoD',
      departmentId: { toString: () => dept1Id }
    });
    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockMember)
        })
      })
    });
    ensureDepartmentInEvent.mockResolvedValue(mockNewDept);
    EventMember.findOneAndUpdate.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockUpdatedMember)
        })
      })
    });
    createNotification.mockResolvedValue();

    await eventMemberController.changeMemberDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Normal] TC03 - should remove member from department (set to null)', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;
    const { createNotification } = await import('../../services/notificationService.js');

    const validMemberId = new mongoose.Types.ObjectId().toString();

    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      body: { departmentId: null },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    const mockMember = {
      _id: validMemberId,
      role: 'Member',
      userId: { _id: 'user1', fullName: 'John Doe' },
      departmentId: { _id: 'dept1', name: 'Marketing' }
    };

    const mockUpdatedMember = { ...mockMember, departmentId: null };

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockMember)
        })
      })
    });
    EventMember.findOneAndUpdate.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockUpdatedMember)
        })
      })
    });
    createNotification.mockResolvedValue();

    await eventMemberController.changeMemberDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Normal] TC04 - should return success if department does not change', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;
    const { ensureDepartmentInEvent } = await import('../../services/departmentService.js');

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const deptId = 'dept1';

    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      body: { departmentId: deptId },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    const mockMember = {
      _id: validMemberId,
      role: 'Member',
      departmentId: { _id: deptId, toString: () => deptId }
    };

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockMember)
        })
      })
    });
    ensureDepartmentInEvent.mockResolvedValue({ _id: deptId, name: 'Marketing' });

    await eventMemberController.changeMemberDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Ban không thay đổi'
      })
    );
  });

  it('[Abnormal] TC05 - should return 400 if memberId is invalid', async () => {
    const req = {
      params: { eventId: 'evt123', memberId: 'invalid-id' },
      body: { departmentId: 'dept2' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    await eventMemberController.changeMemberDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Member ID không hợp lệ' })
    );
  });

  it('[Abnormal] TC06 - should return 403 if requester lacks permission', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      body: { departmentId: 'dept2' },
      user: { id: 'member1' }
    };
    const res = mockRes();

    ensureEventRole.mockResolvedValue(null);

    await eventMemberController.changeMemberDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Bạn không có quyền thay đổi ban' })
    );
  });

  it('[Abnormal] TC07 - should return 404 if member not found', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      body: { departmentId: 'dept2' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null)
        })
      })
    });

    await eventMemberController.changeMemberDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Không tìm thấy thành viên' })
    );
  });

  it('[Abnormal] TC08 - should return 400 if trying to change HoOC department', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      body: { departmentId: 'dept2' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    const mockMember = {
      _id: validMemberId,
      role: 'HoOC',
      userId: { _id: 'user1', fullName: 'John Doe' }
    };

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockMember)
        })
      })
    });

    await eventMemberController.changeMemberDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Không thể chuyển ban cho HoOC' })
    );
  });

  it('[Abnormal] TC09 - should return 403 if HoD tries to change member from different department', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      body: { departmentId: 'dept2' },
      user: { id: 'hod1' }
    };
    const res = mockRes();

    const mockMember = {
      _id: validMemberId,
      role: 'Member',
      departmentId: { _id: 'dept2', toString: () => 'dept2' }
    };

    ensureEventRole.mockResolvedValue({
      role: 'HoD',
      departmentId: { toString: () => 'dept1' }
    });
    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockMember)
        })
      })
    });

    await eventMemberController.changeMemberDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'HoD chỉ được chuyển thành viên trong ban của mình' })
    );
  });

  it('[Abnormal] TC10 - should return 400 if departmentId is invalid ObjectId', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      body: { departmentId: 'invalid-dept-id' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    const mockMember = {
      _id: validMemberId,
      role: 'Member'
    };

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockMember)
        })
      })
    });

    await eventMemberController.changeMemberDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Department ID không hợp lệ' })
    );
  });

  it('[Abnormal] TC11 - should return 404 if department not found in event', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;
    const { ensureDepartmentInEvent } = await import('../../services/departmentService.js');

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const validDeptId = new mongoose.Types.ObjectId().toString();

    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      body: { departmentId: validDeptId },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    const mockMember = {
      _id: validMemberId,
      role: 'Member'
    };

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockMember)
        })
      })
    });
    ensureDepartmentInEvent.mockResolvedValue(null);

    await eventMemberController.changeMemberDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Ban không tồn tại trong sự kiện' })
    );
  });

  it('[Abnormal] TC12 - should return 500 on database error', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      body: { departmentId: 'dept2' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventRole.mockRejectedValue(new Error('DB error'));

    await eventMemberController.changeMemberDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Không thể chuyển ban' })
    );
  });
});
