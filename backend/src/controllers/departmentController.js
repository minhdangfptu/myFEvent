import ensureEventRole from '../utils/ensureEventRole.js';
import {
  ensureEventExists,
  ensureDepartmentInEvent,
  findDepartmentsByEvent,
  findDepartmentById,
  createDepartmentDoc,
  updateDepartmentDoc,
  deleteDepartmentDoc,
  assignHoDToDepartment,
  ensureUserExists,
  isUserMemberOfDepartment,
  addMemberToDepartmentDoc,
  removeMemberFromDepartmentDoc,
} from '../services/departmentService.js';

import {
  findEventMemberById,
  getRequesterMembership,
  countDepartmentMembersExcludingHoOC,
} from '../services/eventMemberService.js';

// GET /api/events/:eventId/departments
export const listDepartmentsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const { items, total } = await findDepartmentsByEvent(eventId, { search, skip, limit });

    // Format data for frontend
    const formattedItems = await Promise.all(items.map(async (dept) => {
      const memberCount = await countDepartmentMembersExcludingHoOC(dept._id);

      return {
        _id: dept._id,
        id: dept._id,
        name: dept.name,
        description: dept.description,
        leaderId: dept.leaderId,
        leader: dept.leaderId,
        leaderName: dept.leaderId?.fullName || 'Chưa có',
        memberCount: memberCount,
        createdAt: dept.createdAt,
        updatedAt: dept.updatedAt
      };
    }));

    return res.status(200).json({
      data: formattedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('listDepartmentsByEvent error:', error);
    return res.status(500).json({ message: 'Failed to load departments' });
  }
};

// GET /api/events/:eventId/departments/:departmentId
export const getDepartmentDetail = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const department = await findDepartmentById(departmentId);
    if (!department) return res.status(404).json({ message: 'Department not found' });

    const memberCount = await countDepartmentMembersExcludingHoOC(department._id);

    const formattedDepartment = {
      _id: department._id,
      id: department._id,
      name: department.name,
      description: department.description,
      leaderId: department.leaderId,
      leader: department.leaderId,
      leaderName: department.leaderId?.fullName || 'Chưa có',
      memberCount: memberCount,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt
    };

    return res.status(200).json({ data: formattedDepartment });
  } catch (error) {
    console.error('getDepartmentDetailByEvent error:', error);
    return res.status(500).json({ message: 'Failed to get department detail' });
  }
};

// ================= CREATE department =================
// POST /api/events/:eventId/departments
export const createDepartment = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, description, leaderId } = req.body || {};
    if (!(await ensureEventExists(eventId))) {
      return res.status(404).json({ message: 'Event không tồn tại' });
    }
    const requesterMembership = await getRequesterMembership(eventId, req.user?.id);
    if (!requesterMembership || requesterMembership.role !== 'HoOC') {
      return res.status(403).json({ message: 'Chỉ HooC mới được tạo Department' });
    }

    const populatedDepart = await createDepartmentDoc({ eventId, name, description, leaderId });

    const formattedDepartment = {
      _id: populatedDepart._id,
      id: populatedDepart._id,
      name: populatedDepart.name,
      description: populatedDepart.description,
      leaderId: populatedDepart.leaderId,
      leader: populatedDepart.leaderId,
      leaderName: populatedDepart.leaderId?.fullName || 'Chưa có',
      memberCount: 0,
      createdAt: populatedDepart.createdAt,
      updatedAt: populatedDepart.updatedAt
    };

    return res.status(201).json({ data: formattedDepartment });
  } catch (error) {
    console.error('createDepartment error:', error);
    return res.status(500).json({ message: 'Tạo department thất bại' });
  }
};

// ================= EDIT department =================
// PATCH /api/events/:eventId/departments/:departmentId
export const editDepartment = async (req, res) => {
  try {
    const { eventId, departmentId } = req.params;
    const { name, description, leaderId } = req.body || {};
    // Kiểm tra event/department
    if (!(await ensureEventExists(eventId))) {
      return res.status(404).json({ message: 'Event không tồn tại' });
    }
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) return res.status(404).json({ message: 'Department không tồn tại' });
    // Kiểm tra quyền HooC
    const requesterMembership = await getRequesterMembership(eventId, req.user?.id);
    
    if (!requesterMembership || requesterMembership.role !== 'HoOC') {
      return res.status(403).json({ message: 'Chỉ HooC mới được sửa Department' });
    }
    // Cập nhật qua service
    const set = {};
    if (typeof name === 'string') set.name = name;
    if (typeof description === 'string') set.description = description;
    if (leaderId) set.leaderId = leaderId;
    const updated = await updateDepartmentDoc(departmentId, set);
    return res.status(200).json({ data: updated });
  } catch (error) {
    console.error('editDepartment error:', error);
    return res.status(500).json({ message: 'Sửa department thất bại' });
  }
};

// ================= DELETE department =================
// DELETE /api/events/:eventId/departments/:departmentId
export const deleteDepartment = async (req, res) => {
  try {
    const { eventId, departmentId } = req.params;
    // Kiểm tra event/department
    if (!(await ensureEventExists(eventId))) {
      return res.status(404).json({ message: 'Event không tồn tại' });
    }
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) return res.status(404).json({ message: 'Department không tồn tại' });
    // Kiểm tra quyền HooC
    const requesterMembership = await getRequesterMembership(eventId, req.user?.id);
    if (!requesterMembership || requesterMembership.role !== 'HooC') {
      return res.status(403).json({ message: 'Chỉ HooC mới được xoá Department' });
    }
    await deleteDepartmentDoc(departmentId);
    return res.status(200).json({ message: 'Xoá department thành công' });
  } catch (error) {
    console.error('deleteDepartment error:', error);
    return res.status(500).json({ message: 'Xoá department thất bại' });
  }
};

// PATCH /api/events/:eventId/departments/:departmentId/assign-hod
export const assignHod = async (req, res) => {
	try {
		const { eventId, departmentId } = req.params;
		const { userId } = req.body || {};
		if (!userId) return res.status(400).json({ message: 'userId is required' });

		if (!(await ensureEventExists(eventId))) {
			return res.status(404).json({ message: 'Event not found' });
		}
		const department = await ensureDepartmentInEvent(eventId, departmentId);
		if (!department) return res.status(404).json({ message: 'Department not found' });

		// Only HooC can assign HoD
		const requesterMembership = await getRequesterMembership(eventId, req.user?.id);
		if (!requesterMembership || requesterMembership.role !== 'HooC') {
			return res.status(403).json({ message: 'Only HooC can assign HoD' });
		}

		// Ensure target user exists
		const targetUser = await ensureUserExists(userId);
		if (!targetUser) return res.status(404).json({ message: 'User not found' });

		const updated = await assignHoDToDepartment(eventId, department, userId);
		return res.status(200).json({ data: updated });
	} catch (error) {
		console.error('assignHod error:', error);
		return res.status(500).json({ message: 'Failed to assign HoD' });
	}
};

export const changeHoD = async (req, res) => {
  try {
    const { eventId, departmentId } = req.params;
    const { newHoDId } = req.body || {};
    
    if (!newHoDId) {
      return res.status(400).json({ message: 'newHoDId is required' });
    }

    // Check if event exists
    if (!(await ensureEventExists(eventId))) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if department exists in this event
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if requester is HoOC (only HoOC can change HoD)
    const requesterMembership = await getRequesterMembership(eventId, req.user?.id);
    if (!requesterMembership || requesterMembership.role !== 'HoOC') {
      return res.status(403).json({ message: 'Only HoOC can change department head' });
    }

    // Check if new HoD exists
    const newHoD = await ensureUserExists(newHoDId);
    if (!newHoD) {
      return res.status(404).json({ message: 'New HoD user not found'  });
    }

    // Check if new HoD is a member of this department
    const isMember = await isUserMemberOfDepartment(eventId, department._id, newHoDId);
    if (!isMember) {
      return res.status(400).json({ 
        message: 'New HoD must be a member of this department' 
      });
    }

    // Assign HoD using service helper (handles demotion of previous leader)
    const updatedDepartment = await assignHoDToDepartment(eventId, department, newHoDId);

    // Format response
    const formattedDepartment = {
      _id: updatedDepartment._id,
      id: updatedDepartment._id,
      name: updatedDepartment.name,
      description: updatedDepartment.description,
      leaderId: updatedDepartment.leaderId,
      leader: updatedDepartment.leaderId,
      leaderName: updatedDepartment.leaderId?.fullName || 'Chưa có',
      memberCount: await countDepartmentMembersExcludingHoOC(updatedDepartment._id),
      createdAt: updatedDepartment.createdAt,
      updatedAt: updatedDepartment.updatedAt
    };

    return res.status(200).json({ 
      message: 'Department head changed successfully',
      data: formattedDepartment 
    });
  } catch (error) {
    console.error('changeHoD error:', error.message);
    return res.status(500).json({ message: 'Failed to change department head' + error.message });
  }
};

// POST /api/events/:eventId/departments/:departmentId/members
export const addMemberToDepartment = async (req, res) => {
	try {
		const { eventId, departmentId } = req.params;
		const membership = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
		if (!membership) return res.status(403).json({ message: 'Only HoOC or HoD can add member to department' });

		if (!(await ensureEventExists(eventId))) {
			return res.status(404).json({ message: 'Event not found' });
		}
		const department = await ensureDepartmentInEvent(eventId, departmentId);
		if (!department) return res.status(404).json({ message: 'Department not found' });

		// Permission: HooC or HoD of this department
		const requesterMembership = await getRequesterMembership(eventId, req.user?.id);
		const isHoOC = requesterMembership?.role === 'HoOC';
		const isHoDOfThis = requesterMembership?.role === 'HoD' && requesterMembership?.departmentId?.toString() === departmentId;
		if (!isHoOC && !isHoDOfThis) {
			return res.status(403).json({ message: 'Insufficient permissions' });
		}
    const { memberId } = req.body || {};
		if (!memberId) return res.status(400).json({ message: 'memberId is required' });
    
    const targetMembership = await findEventMemberById(memberId);
		if (!targetMembership) {
			return res.status(404).json({ message: "EventMember not found!" });
		}
		if (targetMembership?.role === 'HoOC') {
			return res.status(409).json({ message: 'Cannot move HooC into a department' });
		}
		if (targetMembership?.role === 'HoD' && targetMembership?.departmentId?.toString() !== departmentId) {
			return res.status(409).json({ message: 'User is HoD of another department' });
		}

    const roleToSet = targetMembership.role === 'HoD' ? 'HoD' : 'Member';
    const updatedMembership = await addMemberToDepartmentDoc(eventId, departmentId, memberId, roleToSet);

    // Thông báo khi thành viên tham gia
    try {
      const { notifyMemberJoined } = await import('../services/notificationService.js');
      await notifyMemberJoined(eventId, departmentId, memberId);
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
      // Không throw error, chỉ log
    }

		return res.status(200).json({ data: updatedMembership });
	} catch (error) {
		console.error('addMemberToDepartment error:', error.message);
		return res.status(500).json({ message:  error.message });
	}
};

// DELETE /api/events/:eventId/departments/:departmentId/members/:memberId
export const removeMemberFromDepartment = async (req, res) => {
	try {
		const { eventId, departmentId, memberId } = req.params;

		if (!(await ensureEventExists(eventId))) {
			return res.status(404).json({ message: 'Event not found' });
		}
		const department = await ensureDepartmentInEvent(eventId, departmentId);
		if (!department) return res.status(404).json({ message: 'Department not found' });

		// Permission: HooC or HoD of this department
		const requesterMembership = await getRequesterMembership(eventId, req.user?.id);
		const isHooC = requesterMembership?.role === 'HoOC';
		const isHoDOfThis = requesterMembership?.role === 'HoD' && requesterMembership?.departmentId?.toString() === departmentId;
		if (!isHooC && !isHoDOfThis) {
			return res.status(403).json({ message: 'Insufficient permissions' });
		}

    const targetMembership = await findEventMemberById(memberId);
		if (!targetMembership || targetMembership.departmentId?.toString() !== departmentId) {
			return res.status(404).json({ message: 'Member is not in this department' });
		}
		if (targetMembership.role === 'HooC') {
			return res.status(409).json({ message: 'Cannot remove HooC from department' });
		}
		if (targetMembership.role === 'HoD') {
			return res.status(409).json({ message: 'Unassign HoD before removing from department' });
		}

    await removeMemberFromDepartmentDoc(eventId, departmentId, memberId);
    return res.status(200).json({ message: 'Member removed from department' });
	} catch (error) {
		console.error('removeMemberFromDepartment error:', error);
		return res.status(500).json({ message: 'Failed to remove member from department' });
	}
};
