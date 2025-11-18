import mongoose from 'mongoose';
import ensureEventRole from '../utils/ensureEventRole.js';
import {
  ensureEventExists,
  getMembersByEventRaw,
  groupMembersByDepartment,
  getUnassignedMembersRaw,
  getMembersByDepartmentRaw,
  getEventMemberProfileById
} from '../services/eventMemberService.js';
import { findEventById } from '../services/eventService.js';
import EventMember from '../models/eventMember.js';
import Event from '../models/event.js';
import Task from '../models/task.js';
import { createNotificationsForUsers } from '../services/notificationService.js';

// Get members by event
export const getMembersByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await findEventById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const members = await getMembersByEventRaw(eventId);
    const byDept = groupMembersByDepartment(members);
    return res.status(200).json({
      data: byDept,
      event: { id: event._id, name: event.name, description: event.description }
    });
  } catch (error) {
    console.error('getMembersByEvent error:', error);
    return res.status(500).json({ message: 'Failed to load members' });
  }
};
export const getUnassignedMembersByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const membership = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
    if (!membership) return res.status(403).json({ message: 'Only HoOC or HoD can view unassigned members' });
    const members = await getUnassignedMembersRaw(eventId);
    return res.status(200).json({ data: members });
  } catch (error) {
    console.error('getUnassignedMembersByEvent error:', error);
    return res.status(500).json({ message: 'Failed to load unassigned members' });
  }
};
export const getMembersByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const formattedMembers = await getMembersByDepartmentRaw(departmentId);
    return res.status(200).json({ data: formattedMembers });
  } catch (error) {
    console.error('getMembersByDepartment error:', error);
    return res.status(500).json({ message: 'Failed to load members' });
  }
};
export const getMemberDetail = async (req, res) => {
	try{
		const { eventId, memberId } = req.params;
		if (!eventId || !memberId) {
			return res.status(400).json({ message: 'Event ID and Member ID are required' });
		}
		
		// Validate memberId is a valid ObjectId
		if (!mongoose.Types.ObjectId.isValid(memberId)) {
			return res.status(400).json({ message: 'Invalid member ID format' });
		}
		
		const event = await findEventById(eventId);
		if (!event) {
			return res.status(404).json({ message: 'Event not found' });
		}
		const member = await getEventMemberProfileById(memberId);
		if (!member) {
			return res.status(404).json({ message: 'Member not found' });
		}
		return res.status(200).json({ data: member });
	}catch(error){
		console.error('getMemberDetail error:', error);
		return res.status(500).json({ message: 'Failed to load member detail' });
	}
}

export const getMemberRawForRisk = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await findEventById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const members = await getMembersByEventRaw(eventId);
    return res.status(200).json({
      data: members,
      message: "Get All member Successfully"
    });
  } catch (error) {
    console.error('getMembersByEvent error:', error);
    return res.status(500).json({ message: 'Failed to load members' });
  }
};
export const getCoreTeamList = async (req, res) => {
  try {
    const { eventId } = req.params;
    await ensureEventExists(eventId);
    const eventmembers = await getMembersByEventRaw(eventId);
    const coreteam = eventmembers.filter(member =>  member.role === 'HoD');
    return res.status(200).json({ data: coreteam });
  } catch (error) {
    console.error('getCoreTeamList error:', error);
    return res.status(500).json({ message: 'Failed to load core team members' });
  }
};

// DELETE /api/events/:eventId/members/me
export const leaveEvent = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { eventId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    const membership = await EventMember.findOne({ userId, eventId })
      .populate('userId', 'fullName email')
      .populate('departmentId', 'name')
      .lean();

    if (!membership) {
      return res.status(404).json({ message: 'Bạn không phải thành viên của sự kiện này' });
    }

    if (membership.role === 'HoOC' || membership.role === 'HoD') {
      return res.status(400).json({ message: 'HoOC hoặc HoD không thể rời sự kiện bằng chức năng này' });
    }

    // Lấy thông tin event để hiển thị tên trong thông báo
    const event = await Event.findById(eventId).select('name').lean();

    // ✅ Xử lý tasks: chỉ unassign các task chưa hoàn thành
    // Giữ nguyên các task đã done, chỉ unassign các task todo/in_progress/blocked
    await Task.updateMany(
      {
        eventId,
        assigneeId: membership._id,
        status: { $in: ['todo', 'in_progress', 'blocked', 'suggested'] }
      },
      {
        $set: { assigneeId: null }
      }
    );

    await EventMember.deleteOne({ _id: membership._id });

    // Gửi thông báo cho HoOC và HoD trong ban của member (nếu có department)
    const departmentId = membership.departmentId?._id || membership.departmentId;
    const notifyUsers = [];

    if (departmentId) {
      const hod = await EventMember.findOne({
        eventId,
        departmentId,
        role: 'HoD'
      }).populate('userId', '_id').lean();

      if (hod?.userId?._id) {
        notifyUsers.push(hod.userId._id);
      }
    }

    const hoocMembers = await EventMember.find({
      eventId,
      role: 'HoOC'
    }).populate('userId', '_id').lean();

    hoocMembers.forEach(m => {
      if (m.userId?._id) {
        notifyUsers.push(m.userId._id);
      }
    });

    const uniqueUserIds = [...new Set(notifyUsers.map(id => id.toString()))];

    if (uniqueUserIds.length > 0) {
      const memberName = membership.userId?.fullName || 'Một thành viên';
      const deptName = membership.departmentId?.name || 'ban';
      const eventName = event?.name || 'sự kiện';

      await createNotificationsForUsers(uniqueUserIds, {
        eventId,
        category: 'THÀNH VIÊN',
        title: `${memberName} đã rời khỏi ${deptName} của ${eventName}`,
        icon: 'bi bi-box-arrow-right',
        color: '#ef4444',
        unread: true
      });
    }

    return res.status(200).json({ message: 'Rời sự kiện thành công' });
  } catch (error) {
    console.error('leaveEvent error:', error);
    return res.status(500).json({ message: 'Không thể rời sự kiện' });
  }
};