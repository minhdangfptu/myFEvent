import Department from '../models/department.js';
import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';
import User from '../models/user.js';

// GET /api/events/:eventId/departments
export const listDepartmentsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    const filter = { eventId };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      Department.find(filter)
        .populate({ path: 'leaderId', select: 'fullName email avatarUrl' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Department.countDocuments(filter)
    ]);

    return res.status(200).json({
      data: items,
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
export const getDepartmentDetailByEvent = async (req, res) => {
  try {
    const { eventId, departmentId } = req.params;
    const department = await Department.findOne({ _id: departmentId, eventId })
      .populate({ path: 'leaderId', select: 'fullName email avatarUrl' })
      .lean();
    if (!department) return res.status(404).json({ message: 'Department not found' });
    return res.status(200).json({ data: department });
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
    // Kiểm tra event tồn tại
    if (!(await ensureEventExists(eventId))) {
      return res.status(404).json({ message: 'Event không tồn tại' });
    }
    // Kiểm tra quyền HooC
    const requesterMembership = await getRequesterMembership(eventId, req.user?.id);
    if (!requesterMembership || requesterMembership.role !== 'HooC') {
      return res.status(403).json({ message: 'Chỉ HooC mới được tạo Department' });
    }
    // Tạo department
    const depart = await Department.create({
      eventId,
      name,
      description,
      leaderId
    });
    return res.status(201).json({ data: depart });
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
    if (!requesterMembership || requesterMembership.role !== 'HooC') {
      return res.status(403).json({ message: 'Chỉ HooC mới được sửa Department' });
    }
    // Cập nhật
    if (typeof name === 'string') department.name = name;
    if (typeof description === 'string') department.description = description;
    if (leaderId) department.leaderId = leaderId;
    await department.save();
    return res.status(200).json({ data: department });
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
    await department.deleteOne();
    return res.status(200).json({ message: 'Xoá department thành công' });
  } catch (error) {
    console.error('deleteDepartment error:', error);
    return res.status(500).json({ message: 'Xoá department thất bại' });
  }
};

// Helpers
const ensureEventExists = async (eventId) => {
	const exists = await Event.exists({ _id: eventId });
	return !!exists;
};

const ensureDepartmentInEvent = async (eventId, departmentId) => {
	const department = await Department.findOne({ _id: departmentId, eventId });
	return department;
};

const getRequesterMembership = async (eventId, userId) => {
	if (!userId) return null;
	return await EventMember.findOne({ eventId, userId }).lean();
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
		const targetUser = await User.findById(userId).lean();
		if (!targetUser) return res.status(404).json({ message: 'User not found' });

		// Update department leader
		const previousLeaderId = department.leaderId?.toString();
		department.leaderId = userId;
		await department.save();

		// Upsert target membership to HoD of this department
		await EventMember.findOneAndUpdate(
			{ eventId, userId },
			{ $set: { departmentId, role: 'HoD' } },
			{ upsert: true, new: true }
		);

		// Demote previous leader if different
		if (previousLeaderId && previousLeaderId !== userId) {
			await EventMember.findOneAndUpdate(
				{ eventId, userId: previousLeaderId },
				{ $set: { departmentId, role: 'staff' } }
			);
		}

		const updated = await Department.findById(department._id)
			.populate({ path: 'leaderId', select: 'fullName email avatarUrl' })
			.lean();
		return res.status(200).json({ data: updated });
	} catch (error) {
		console.error('assignHod error:', error);
		return res.status(500).json({ message: 'Failed to assign HoD' });
	}
};

// POST /api/events/:eventId/departments/:departmentId/members
export const addMemberToDepartment = async (req, res) => {
	try {
		const { eventId, departmentId } = req.params;
		const { userId } = req.body || {};
		if (!userId) return res.status(400).json({ message: 'userId is required' });

		if (!(await ensureEventExists(eventId))) {
			return res.status(404).json({ message: 'Event not found' });
		}
		const department = await ensureDepartmentInEvent(eventId, departmentId);
		if (!department) return res.status(404).json({ message: 'Department not found' });

		// Permission: HooC or HoD of this department
		const requesterMembership = await getRequesterMembership(eventId, req.user?.id);
		const isHooC = requesterMembership?.role === 'HooC';
		const isHoDOfThis = requesterMembership?.role === 'HoD' && requesterMembership?.departmentId?.toString() === departmentId;
		if (!isHooC && !isHoDOfThis) {
			return res.status(403).json({ message: 'Insufficient permissions' });
		}

		const targetUser = await User.findById(userId).lean();
		if (!targetUser) return res.status(404).json({ message: 'User not found' });

		const targetMembership = await EventMember.findOne({ eventId, userId }).lean();
		if (targetMembership?.role === 'HooC') {
			return res.status(409).json({ message: 'Cannot move HooC into a department' });
		}
		if (targetMembership?.role === 'HoD' && targetMembership?.departmentId?.toString() !== departmentId) {
			return res.status(409).json({ message: 'User is HoD of another department' });
		}

		const updatedMembership = await EventMember.findOneAndUpdate(
			{ eventId, userId },
			{ $set: { departmentId, role: targetMembership?.role === 'HoD' ? 'HoD' : 'staff' } },
			{ upsert: true, new: true }
		)
			.populate('userId', 'fullName email avatarUrl');

		return res.status(200).json({ data: updatedMembership });
	} catch (error) {
		console.error('addMemberToDepartment error:', error);
		return res.status(500).json({ message: 'Failed to add member to department' });
	}
};

// DELETE /api/events/:eventId/departments/:departmentId/members/:userId
export const removeMemberFromDepartment = async (req, res) => {
	try {
		const { eventId, departmentId, userId } = req.params;

		if (!(await ensureEventExists(eventId))) {
			return res.status(404).json({ message: 'Event not found' });
		}
		const department = await ensureDepartmentInEvent(eventId, departmentId);
		if (!department) return res.status(404).json({ message: 'Department not found' });

		// Permission: HooC or HoD of this department
		const requesterMembership = await getRequesterMembership(eventId, req.user?.id);
		const isHooC = requesterMembership?.role === 'HooC';
		const isHoDOfThis = requesterMembership?.role === 'HoD' && requesterMembership?.departmentId?.toString() === departmentId;
		if (!isHooC && !isHoDOfThis) {
			return res.status(403).json({ message: 'Insufficient permissions' });
		}

		const targetMembership = await EventMember.findOne({ eventId, userId });
		if (!targetMembership || targetMembership.departmentId?.toString() !== departmentId) {
			return res.status(404).json({ message: 'Member is not in this department' });
		}
		if (targetMembership.role === 'HooC') {
			return res.status(409).json({ message: 'Cannot remove HooC from department' });
		}
		if (targetMembership.role === 'HoD') {
			return res.status(409).json({ message: 'Unassign HoD before removing from department' });
		}

		targetMembership.departmentId = undefined;
		await targetMembership.save();

		return res.status(200).json({ message: 'Member removed from department' });
	} catch (error) {
		console.error('removeMemberFromDepartment error:', error);
		return res.status(500).json({ message: 'Failed to remove member from department' });
	}
};

