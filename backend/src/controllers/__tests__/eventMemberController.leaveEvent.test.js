import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as eventMemberController from '../eventMemberController.js';

/* -------------------- Mocks -------------------- */

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
  createNotificationsForUsers: vi.fn(),
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

describe('eventMemberController.leaveEvent', () => {
  it('[Normal] TC01 - should allow member to leave event successfully', async () => {
    const EventMember = (await import('../../models/eventMember.js')).default;
    const Event = (await import('../../models/event.js')).default;
    const Task = (await import('../../models/task.js')).default;
    const { createNotificationsForUsers } = await import('../../services/notificationService.js');

    const req = {
      params: { eventId: 'evt123' },
      user: { id: 'user1' }
    };
    const res = mockRes();

    const mockMembership = {
      _id: 'member1',
      userId: { _id: 'user1', fullName: 'John Doe', email: 'john@example.com' },
      eventId: 'evt123',
      role: 'Member',
      departmentId: { _id: 'dept1', name: 'Marketing' },
      status: 'active'
    };

    const mockEvent = { _id: 'evt123', name: 'Tech Conference' };

    EventMember.findOne
      .mockReturnValueOnce({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockMembership)
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
    createNotificationsForUsers.mockResolvedValue();

    await eventMemberController.leaveEvent(req, res);

    expect(EventMember.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user1',
        eventId: 'evt123',
        status: { $ne: 'deactive' }
      })
    );
    expect(Task.updateMany).toHaveBeenCalledWith(
      {
        eventId: 'evt123',
        assigneeId: 'member1',
        status: { $in: ['chua_bat_dau', 'da_bat_dau'] }
      },
      {
        $set: { assigneeId: null }
      }
    );
    expect(EventMember.updateOne).toHaveBeenCalledWith(
      { _id: 'member1' },
      { $set: { status: 'deactive' } }
    );
    expect(createNotificationsForUsers).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Rời sự kiện thành công' })
    );
  });

  it('[Normal] TC02 - should send notification to HoD and HoOC when member leaves', async () => {
    const EventMember = (await import('../../models/eventMember.js')).default;
    const Event = (await import('../../models/event.js')).default;
    const Task = (await import('../../models/task.js')).default;
    const { createNotificationsForUsers } = await import('../../services/notificationService.js');

    const req = {
      params: { eventId: 'evt123' },
      user: { id: 'user1' }
    };
    const res = mockRes();

    const mockMembership = {
      _id: 'member1',
      userId: { _id: 'user1', fullName: 'John Doe' },
      role: 'Member',
      departmentId: { _id: 'dept1', name: 'Marketing' }
    };

    EventMember.findOne
      .mockReturnValueOnce({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockMembership)
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
          { userId: { _id: 'hooc1' } },
          { userId: { _id: 'hooc2' } }
        ])
      })
    });

    EventMember.updateOne.mockResolvedValue({ modifiedCount: 1 });
    Event.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ name: 'Tech Conference' })
      })
    });
    Task.updateMany.mockResolvedValue({ modifiedCount: 0 });
    createNotificationsForUsers.mockResolvedValue();

    await eventMemberController.leaveEvent(req, res);

    expect(createNotificationsForUsers).toHaveBeenCalledWith(
      expect.arrayContaining(['hod1', 'hooc1', 'hooc2']),
      expect.objectContaining({
        eventId: 'evt123',
        category: 'THÀNH VIÊN',
        icon: 'bi bi-box-arrow-right',
        color: '#ef4444'
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC03 - should return 401 if user not authenticated', async () => {
    const req = {
      params: { eventId: 'evt123' },
      user: {}
    };
    const res = mockRes();

    await eventMemberController.leaveEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User not authenticated' })
    );
  });

  it('[Abnormal] TC04 - should return 400 if eventId is missing', async () => {
    const req = {
      params: {},
      user: { id: 'user1' }
    };
    const res = mockRes();

    await eventMemberController.leaveEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Event ID is required' })
    );
  });

  it('[Abnormal] TC05 - should return 404 if user is not a member of event', async () => {
    const EventMember = (await import('../../models/eventMember.js')).default;

    const req = {
      params: { eventId: 'evt123' },
      user: { id: 'user1' }
    };
    const res = mockRes();

    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null)
        })
      })
    });

    await eventMemberController.leaveEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Bạn không phải thành viên của sự kiện này' })
    );
  });

  it('[Abnormal] TC06 - should return 400 if HoOC tries to leave event', async () => {
    const EventMember = (await import('../../models/eventMember.js')).default;

    const req = {
      params: { eventId: 'evt123' },
      user: { id: 'user1' }
    };
    const res = mockRes();

    const mockMembership = {
      _id: 'member1',
      userId: { _id: 'user1', fullName: 'HoOC User' },
      role: 'HoOC'
    };

    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockMembership)
        })
      })
    });

    await eventMemberController.leaveEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'HoOC hoặc HoD không thể rời sự kiện bằng chức năng này' })
    );
  });

  it('[Abnormal] TC07 - should return 400 if HoD tries to leave event', async () => {
    const EventMember = (await import('../../models/eventMember.js')).default;

    const req = {
      params: { eventId: 'evt123' },
      user: { id: 'user1' }
    };
    const res = mockRes();

    const mockMembership = {
      _id: 'member1',
      userId: { _id: 'user1', fullName: 'HoD User' },
      role: 'HoD',
      departmentId: { _id: 'dept1', name: 'Marketing' }
    };

    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockMembership)
        })
      })
    });

    await eventMemberController.leaveEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'HoOC hoặc HoD không thể rời sự kiện bằng chức năng này' })
    );
  });

  it('[Abnormal] TC08 - should return 500 on database error', async () => {
    const EventMember = (await import('../../models/eventMember.js')).default;

    const req = {
      params: { eventId: 'evt123' },
      user: { id: 'user1' }
    };
    const res = mockRes();

    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockRejectedValue(new Error('DB error'))
        })
      })
    });

    await eventMemberController.leaveEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Không thể rời sự kiện' })
    );
  });
});
