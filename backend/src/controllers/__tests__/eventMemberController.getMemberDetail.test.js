import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as eventMemberController from '../eventMemberController.js';
import mongoose from 'mongoose';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/eventService.js', () => ({
  __esModule: true,
  findEventById: vi.fn(),
}));

vi.mock('../../services/eventMemberService.js', () => ({
  __esModule: true,
  getEventMemberProfileById: vi.fn(),
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

describe('eventMemberController.getMemberDetail', () => {
  it('[Normal] TC01 - should get member detail successfully', async () => {
    const { findEventById } = await import('../../services/eventService.js');
    const { getEventMemberProfileById } = await import('../../services/eventMemberService.js');

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId }
    };
    const res = mockRes();

    const mockEvent = { _id: 'evt123', name: 'Tech Conference' };
    const mockMember = {
      _id: validMemberId,
      userId: { _id: 'user1', fullName: 'John Doe', email: 'john@example.com' },
      role: 'Member',
      departmentId: { _id: 'dept1', name: 'Marketing' }
    };

    findEventById.mockResolvedValue(mockEvent);
    getEventMemberProfileById.mockResolvedValue(mockMember);

    await eventMemberController.getMemberDetail(req, res);

    expect(findEventById).toHaveBeenCalledWith('evt123');
    expect(getEventMemberProfileById).toHaveBeenCalledWith(validMemberId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockMember
      })
    );
  });

  it('[Abnormal] TC02 - should return 400 if eventId or memberId is missing', async () => {
    const req = {
      params: { eventId: '', memberId: '' }
    };
    const res = mockRes();

    await eventMemberController.getMemberDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Event ID and Member ID are required' })
    );
  });

  it('[Abnormal] TC03 - should return 400 if memberId is invalid ObjectId', async () => {
    const req = {
      params: { eventId: 'evt123', memberId: 'invalid-id' }
    };
    const res = mockRes();

    await eventMemberController.getMemberDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid member ID format' })
    );
  });

  it('[Abnormal] TC04 - should return 404 if event not found', async () => {
    const { findEventById } = await import('../../services/eventService.js');

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'notfound', memberId: validMemberId }
    };
    const res = mockRes();

    findEventById.mockResolvedValue(null);

    await eventMemberController.getMemberDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Event not found' })
    );
  });

  it('[Abnormal] TC05 - should return 404 if member not found', async () => {
    const { findEventById } = await import('../../services/eventService.js');
    const { getEventMemberProfileById } = await import('../../services/eventMemberService.js');

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId }
    };
    const res = mockRes();

    findEventById.mockResolvedValue({ _id: 'evt123', name: 'Tech Conference' });
    getEventMemberProfileById.mockResolvedValue(null);

    await eventMemberController.getMemberDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Member not found' })
    );
  });

  it('[Abnormal] TC06 - should return 500 on database error', async () => {
    const { findEventById } = await import('../../services/eventService.js');

    const validMemberId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { eventId: 'evt123', memberId: validMemberId }
    };
    const res = mockRes();

    findEventById.mockRejectedValue(new Error('DB error'));

    await eventMemberController.getMemberDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to load member detail' })
    );
  });
});
