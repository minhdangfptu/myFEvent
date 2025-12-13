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
    updateOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('../../models/event.js', () => ({
  __esModule: true,
  default: {
    findById: vi.fn(),
  },
}));

vi.mock('../../models/task.js', () => ({
  __esModule: true,
  default: {
    updateMany: vi.fn(),
  },
}));

vi.mock('../../services/notificationService.js', () => ({
  __esModule: true,
  createNotification: vi.fn(),
  createNotificationsForUsers: vi.fn(),
}));

vi.mock('../../utils/dashboardCache.js', () => ({
  __esModule: true,
  invalidateDashboardCache: vi.fn(),
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

describe('eventMemberController.removeMemberFromEvent', () => {
  it('[Normal] TC01 - should remove member from event successfully by HoOC', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;
    const Event = (await import('../../models/event.js')).default;
    const Task = (await import('../../models/task.js')).default;
    const { createNotification, createNotificationsForUsers } = await import('../../services/notificationService.js');
    const { invalidateDashboardCache } = await import('../../utils/dashboardCache.js');

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
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

    const mockEvent = { _id: 'evt123', name: 'Tech Conference' };

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    EventMember.findOne
      .mockReturnValueOnce({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockMember)
          })
        })
      })
      .mockReturnValueOnce({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ userId: { _id: 'hod1' } })
        })
      });

    EventMember.find.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { userId: { _id: 'hooc1' } }
        ])
      })
    });

    EventMember.updateOne.mockResolvedValue({ modifiedCount: 1 });
    Event.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockEvent)
      })
    });
    Task.updateMany.mockResolvedValue({ modifiedCount: 0 });
    createNotification.mockResolvedValue();
    createNotificationsForUsers.mockResolvedValue();

    await eventMemberController.removeMemberFromEvent(req, res);

    expect(ensureEventRole).toHaveBeenCalledWith('hooc1', 'evt123', ['HoOC', 'HoD']);
    expect(Task.updateMany).toHaveBeenCalled();
    expect(EventMember.updateOne).toHaveBeenCalledWith(
      { _id: validMemberId },
      { $set: { status: 'deactive', departmentId: null } }
    );
    expect(invalidateDashboardCache).toHaveBeenCalledWith('evt123');
    expect(createNotification).toHaveBeenCalled();
    expect(createNotificationsForUsers).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Đã xóa thành viên khỏi sự kiện' })
    );
  });

  it('[Normal] TC02 - should remove member by HoD from their department', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;
    const Event = (await import('../../models/event.js')).default;
    const Task = (await import('../../models/task.js')).default;
    const { createNotification, createNotificationsForUsers } = await import('../../services/notificationService.js');

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const deptId = 'dept1';

    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      user: { id: 'hod1' }
    };
    const res = mockRes();

    const mockMember = {
      _id: validMemberId,
      role: 'Member',
      userId: { _id: 'user1', fullName: 'John Doe' },
      departmentId: { _id: deptId, toString: () => deptId }
    };

    ensureEventRole.mockResolvedValue({
      role: 'HoD',
      departmentId: { toString: () => deptId }
    });
    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockMember)
        })
      })
    });
    EventMember.find.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      })
    });
    EventMember.updateOne.mockResolvedValue({ modifiedCount: 1 });
    Event.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ name: 'Tech Conference' })
      })
    });
    Task.updateMany.mockResolvedValue({ modifiedCount: 0 });
    createNotification.mockResolvedValue();
    createNotificationsForUsers.mockResolvedValue();

    await eventMemberController.removeMemberFromEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC03 - should return 400 if memberId is invalid', async () => {
    const req = {
      params: { eventId: 'evt123', memberId: 'invalid-id' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    await eventMemberController.removeMemberFromEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Member ID không hợp lệ' })
    );
  });

  it('[Abnormal] TC04 - should return 403 if requester lacks permission', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      user: { id: 'member1' }
    };
    const res = mockRes();

    ensureEventRole.mockResolvedValue(null);

    await eventMemberController.removeMemberFromEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Bạn không có quyền xoá thành viên' })
    );
  });

  it('[Abnormal] TC05 - should return 404 if member not found', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
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

    await eventMemberController.removeMemberFromEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Không tìm thấy thành viên' })
    );
  });

  it('[Abnormal] TC06 - should return 400 if trying to remove HoOC', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
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

    await eventMemberController.removeMemberFromEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Không thể xóa HoOC khỏi sự kiện' })
    );
  });

  it('[Abnormal] TC07 - should return 403 if HoD tries to remove member from different department', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
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

    await eventMemberController.removeMemberFromEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'HoD chỉ được quản lý thành viên trong ban của mình' })
    );
  });

  it('[Abnormal] TC08 - should return 403 if HoD tries to remove another HoD', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const deptId = 'dept1';

    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      user: { id: 'hod1' }
    };
    const res = mockRes();

    const mockMember = {
      _id: validMemberId,
      role: 'HoD',
      departmentId: { _id: deptId, toString: () => deptId }
    };

    ensureEventRole.mockResolvedValue({
      role: 'HoD',
      departmentId: { toString: () => deptId }
    });
    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockMember)
        })
      })
    });

    await eventMemberController.removeMemberFromEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'HoD không thể xóa HoD khác' })
    );
  });

  it('[Abnormal] TC09 - should return 500 on database error', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventRole.mockRejectedValue(new Error('DB error'));

    await eventMemberController.removeMemberFromEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Không thể xóa thành viên' })
    );
  });
});
