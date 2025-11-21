import mongoose from 'mongoose';
import ensureEventRole from '../utils/ensureEventRole.js';
import {
  ensureEventExists,
  getMembersByEventRaw,
  groupMembersByDepartment,
  getUnassignedMembersRaw,
  getMembersByDepartmentRaw,
  getEventMemberProfileById,
  getMemberInformationForExport,
  findEventMemberById,
  inactiveEventMember
} from '../services/eventMemberService.js';
import { findEventById } from '../services/eventService.js';
import EventMember from '../models/eventMember.js';
import Event from '../models/event.js';
import Task from '../models/task.js';
import { ensureDepartmentInEvent } from '../services/departmentService.js';
import { createNotification, createNotificationsForUsers } from '../services/notificationService.js';

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

// PATCH /api/events/:eventId/members/:memberId/role
export const updateMemberRole = async (req, res) => {
  try {
    const { eventId, memberId } = req.params;
    const { role } = req.body || {};
    const normalizedRole = typeof role === 'string' ? role.trim() : '';
    const allowedRoles = ['HoD', 'Member'];

    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ' });
    }

    const requesterMembership = await ensureEventRole(req.user?.id, eventId, ['HoOC']);
    if (!requesterMembership) {
      return res.status(403).json({ message: 'Chỉ HoOC mới được thay đổi vai trò' });
    }

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ message: 'Member ID không hợp lệ' });
    }

    const currentMember = await EventMember.findOne({
      _id: memberId,
      eventId,
      status: { $ne: 'deactive' }
    })
      .populate('userId', 'fullName email avatarUrl')
      .populate('departmentId', 'name')
      .lean();

    if (!currentMember) {
      return res.status(404).json({ message: 'Không tìm thấy thành viên' });
    }

    if (currentMember.role === normalizedRole) {
      return res.status(200).json({ message: 'Vai trò không thay đổi', data: currentMember });
    }

    const set = { role: normalizedRole };
    if (normalizedRole === 'HoOC') {
      set.departmentId = null;
    }

    const updatedMember = await EventMember.findOneAndUpdate(
      { _id: memberId },
      { $set: set },
      { new: true }
    )
      .populate('userId', 'fullName email avatarUrl')
      .populate('departmentId', 'name')
      .lean();

    return res.status(200).json({
      message: 'Cập nhật vai trò thành công',
      data: updatedMember
    });
  } catch (error) {
    console.error('updateMemberRole error:', error);
    return res.status(500).json({ message: 'Không thể cập nhật vai trò' });
  }
};

// PATCH /api/events/:eventId/members/:memberId/department
export const changeMemberDepartment = async (req, res) => {
  try {
    const { eventId, memberId } = req.params;
    const { departmentId } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ message: 'Member ID không hợp lệ' });
    }

    const requesterMembership = await ensureEventRole(req.user?.id, eventId, ['HoOC', 'HoD']);
    if (!requesterMembership) {
      return res.status(403).json({ message: 'Bạn không có quyền thay đổi ban' });
    }

    const member = await EventMember.findOne({
      _id: memberId,
      eventId,
      status: { $ne: 'deactive' }
    })
      .populate('userId', 'fullName email avatarUrl')
      .populate('departmentId', 'name')
      .lean();

    if (!member) {
      return res.status(404).json({ message: 'Không tìm thấy thành viên' });
    }

    if (member.role === 'HoOC') {
      return res.status(400).json({ message: 'Không thể chuyển ban cho HoOC' });
    }

    if (requesterMembership.role === 'HoD') {
      const requesterDeptId = requesterMembership.departmentId?.toString();
      const memberDeptId = member.departmentId?._id?.toString() || member.departmentId?.toString();
      if (!requesterDeptId || requesterDeptId !== memberDeptId) {
        return res.status(403).json({ message: 'HoD chỉ được chuyển thành viên trong ban của mình' });
      }
    }

    let nextDepartmentDoc = null;
    let normalizedDepartmentId = null;
    if (departmentId) {
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return res.status(400).json({ message: 'Department ID không hợp lệ' });
      }
      nextDepartmentDoc = await ensureDepartmentInEvent(eventId, departmentId);
      if (!nextDepartmentDoc) {
        return res.status(404).json({ message: 'Ban không tồn tại trong sự kiện' });
      }
      normalizedDepartmentId = new mongoose.Types.ObjectId(departmentId);
    }

    const currentDeptId = member.departmentId?._id?.toString() || member.departmentId?.toString() || null;
    const nextDeptId = normalizedDepartmentId ? normalizedDepartmentId.toString() : null;
    if (currentDeptId === nextDeptId) {
      return res.status(200).json({ message: 'Ban không thay đổi', data: member });
    }

    const updatedMember = await EventMember.findOneAndUpdate(
      { _id: memberId },
      { $set: { departmentId: normalizedDepartmentId } },
      { new: true }
    )
      .populate('userId', 'fullName email avatarUrl')
      .populate('departmentId', 'name')
      .lean();

    if (member.userId?._id) {
      await createNotification({
        userId: member.userId._id,
        eventId,
        category: 'THÀNH VIÊN',
        title: normalizedDepartmentId
          ? `Bạn đã được chuyển sang ${nextDepartmentDoc?.name || 'ban mới'}`
          : `Bạn đã được chuyển ra khỏi ${member.departmentId?.name || 'ban'}`,
        icon: 'bi bi-arrow-left-right',
        color: '#0ea5e9',
      });
    }

    return res.status(200).json({
      message: 'Cập nhật chuyên môn thành công',
      data: updatedMember
    });
  } catch (error) {
    console.error('changeMemberDepartment error:', error);
    return res.status(500).json({ message: 'Không thể chuyển ban' });
  }
};

// DELETE /api/events/:eventId/members/:memberId
export const removeMemberFromEvent = async (req, res) => {
  try {
    const { eventId, memberId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ message: 'Member ID không hợp lệ' });
    }

    const requesterMembership = await ensureEventRole(req.user?.id, eventId, ['HoOC', 'HoD']);
    if (!requesterMembership) {
      return res.status(403).json({ message: 'Bạn không có quyền xoá thành viên' });
    }

    const member = await EventMember.findOne({
      _id: memberId,
      eventId,
      status: { $ne: 'deactive' }
    })
      .populate('userId', 'fullName email')
      .populate('departmentId', 'name')
      .lean();

    if (!member) {
      return res.status(404).json({ message: 'Không tìm thấy thành viên' });
    }

    if (member.role === 'HoOC') {
      return res.status(400).json({ message: 'Không thể xóa HoOC khỏi sự kiện' });
    }

    if (requesterMembership.role === 'HoD') {
      const requesterDeptId = requesterMembership.departmentId?.toString();
      const memberDeptId = member.departmentId?._id?.toString() || member.departmentId?.toString();
      if (!requesterDeptId || requesterDeptId !== memberDeptId) {
        return res.status(403).json({ message: 'HoD chỉ được quản lý thành viên trong ban của mình' });
      }
      if (member.role !== 'Member') {
        return res.status(403).json({ message: 'HoD không thể xóa HoD khác' });
      }
    }

    await Task.updateMany(
      {
        eventId,
        assigneeId: memberId,
        status: { $in: ['todo', 'in_progress', 'blocked', 'suggested'] }
      },
      {
        $set: { assigneeId: null }
      }
    );

    await EventMember.updateOne(
      { _id: memberId },
      { $set: { status: 'deactive', departmentId: null } }
    );

    const event = await Event.findById(eventId).select('name').lean();
    const notifyUsers = [];
    const departmentId = member.departmentId?._id || member.departmentId;

    if (departmentId) {
      const hod = await EventMember.findOne({
        eventId,
        departmentId,
        role: 'HoD',
        status: { $ne: 'deactive' }
      }).populate('userId', '_id').lean();

      if (hod?.userId?._id) {
        notifyUsers.push(hod.userId._id);
      }
    }

    const hoocMembers = await EventMember.find({
      eventId,
      role: 'HoOC',
      status: { $ne: 'deactive' }
    }).populate('userId', '_id').lean();

    hoocMembers.forEach(m => {
      if (m.userId?._id) {
        notifyUsers.push(m.userId._id);
      }
    });

    const uniqueUserIds = [...new Set(notifyUsers.map(id => id.toString()))];

    if (uniqueUserIds.length > 0) {
      const memberName = member.userId?.fullName || 'Một thành viên';
      const deptName = member.departmentId?.name || 'ban';
      const eventName = event?.name || 'sự kiện';

      await createNotificationsForUsers(uniqueUserIds, {
        eventId,
        category: 'THÀNH VIÊN',
        title: `${memberName} đã bị xoá khỏi ${deptName} của ${eventName}`,
        icon: 'bi bi-person-dash',
        color: '#ef4444',
        unread: true
      });
    }

    if (member.userId?._id) {
      await createNotification({
        userId: member.userId._id,
        eventId,
        category: 'THÀNH VIÊN',
        title: 'Bạn đã bị xoá khỏi sự kiện',
        icon: 'bi bi-exclamation-triangle',
        color: '#ef4444'
      });
    }

    return res.status(200).json({ message: 'Đã xóa thành viên khỏi sự kiện' });
  } catch (error) {
    console.error('removeMemberFromEvent error:', error);
    return res.status(500).json({ message: 'Không thể xóa thành viên' });
  }
};

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

    const membership = await EventMember.findOne({ userId, eventId, status: { $ne: 'deactive' } })
      .populate('userId', 'fullName email')
      .populate('departmentId', 'name')
      .lean();

    if (!membership) {
      return res.status(404).json({ message: 'Bạn không phải thành viên của sự kiện này' });
    }

    if (membership.role === 'HoOC' || membership.role === 'HoD') {
      return res.status(400).json({ message: 'HoOC hoặc HoD không thể rời sự kiện bằng chức năng này' });
    }

    
    const event = await Event.findById(eventId).select('name').lean();

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

    await EventMember.updateOne(
      { _id: membership._id },
      { $set: { status: 'deactive' } }
    );

    // Gửi thông báo cho HoOC và HoD trong ban của member (nếu có department)
    const departmentId = membership.departmentId?._id || membership.departmentId;
    const notifyUsers = [];

    if (departmentId) {
      const hod = await EventMember.findOne({
        eventId,
        departmentId,
        role: 'HoD',
        status: { $ne: 'deactive' }
      }).populate('userId', '_id').lean();

      if (hod?.userId?._id) {
        notifyUsers.push(hod.userId._id);
      }
    }

    const hoocMembers = await EventMember.find({
      eventId,
      role: 'HoOC',
      status: { $ne: 'deactive' }
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

export const getEventMemberForExport = async (req, res) => {
  try {
    const { eventId } = req.params;
    await ensureEventExists(eventId);
    const eventmembers = await getMemberInformationForExport(eventId);
    return res.status(200).json({ data: eventmembers });
  } catch (error) {
    console.error('eventmembers error:', error);
    return res.status(500).json({ message: 'Failed to load core team members' });
  }
};