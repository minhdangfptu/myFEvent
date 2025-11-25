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

/* -------------------- Helpers -------------------- */

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

/* -------------------- Tests -------------------- */

describe('eventMemberController.updateMemberRole', () => {
  it('[Normal] TC01 - should update member role successfully by HoOC', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      body: { role: 'HoD' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    const mockCurrentMember = {
      _id: validMemberId,
      eventId: 'evt123',
      role: 'Member',
      userId: { _id: 'user1', fullName: 'John Doe', email: 'john@example.com' },
      departmentId: { _id: 'dept1', name: 'Marketing' },
      status: 'active'
    };

    const mockUpdatedMember = {
      ...mockCurrentMember,
      role: 'HoD'
    };

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockCurrentMember)
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

    await eventMemberController.updateMemberRole(req, res);

    expect(ensureEventRole).toHaveBeenCalledWith('hooc1', 'evt123', ['HoOC']);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Cập nhật vai trò thành công',
        data: expect.objectContaining({ role: 'HoD' })
      })
    );
  });

  it('[Normal] TC02 - should return success if role does not change', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      body: { role: 'Member' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    const mockCurrentMember = {
      _id: validMemberId,
      role: 'Member',
      userId: { _id: 'user1', fullName: 'John Doe' }
    };

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    EventMember.findOne.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockCurrentMember)
        })
      })
    });

    await eventMemberController.updateMemberRole(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Vai trò không thay đổi'
      })
    );
  });

  it('[Abnormal] TC03 - should return 400 if role is invalid', async () => {
    const req = {
      params: { eventId: 'evt123', memberId: 'member1' },
      body: { role: 'InvalidRole' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    await eventMemberController.updateMemberRole(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Vai trò không hợp lệ' })
    );
  });

  it('[Abnormal] TC04 - should return 403 if requester is not HoOC', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;

    const req = {
      params: { eventId: 'evt123', memberId: 'member1' },
      body: { role: 'HoD' },
      user: { id: 'member2' }
    };
    const res = mockRes();

    ensureEventRole.mockResolvedValue(null);

    await eventMemberController.updateMemberRole(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Chỉ HoOC mới được thay đổi vai trò' })
    );
  });

  it('[Abnormal] TC05 - should return 400 if memberId is invalid ObjectId', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;

    const req = {
      params: { eventId: 'evt123', memberId: 'invalid-id' },
      body: { role: 'HoD' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventRole.mockResolvedValue({ role: 'HoOC' });

    await eventMemberController.updateMemberRole(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Member ID không hợp lệ' })
    );
  });

  it('[Abnormal] TC06 - should return 404 if member not found', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;
    const EventMember = (await import('../../models/eventMember.js')).default;

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId },
      body: { role: 'HoD' },
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

    await eventMemberController.updateMemberRole(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Không tìm thấy thành viên' })
    );
  });

  it('[Abnormal] TC07 - should return 500 on database error', async () => {
    const ensureEventRole = (await import('../../utils/ensureEventRole.js')).default;

    const req = {
      params: { eventId: 'evt123', memberId: 'member1' },
      body: { role: 'HoD' },
      user: { id: 'hooc1' }
    };
    const res = mockRes();

    ensureEventRole.mockRejectedValue(new Error('DB error'));

    await eventMemberController.updateMemberRole(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Không thể cập nhật vai trò' })
    );
  });
});
