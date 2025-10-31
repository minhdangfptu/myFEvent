import EventMember from '../models/eventMember.js';
import Event from '../models/event.js';
import ensureEventRole from '../utils/ensureEventRole.js';

// Get members by event
export const getMembersByEvent = async (req, res) => {
	try {
		const { eventId } = req.params;

		// Check if event exists
		const event = await Event.findById(eventId).lean();
		if (!event) {
			return res.status(404).json({ message: 'Event not found' });
		}

		// Get ALL members from the event (no pagination, no search)
		const members = await EventMember.find({ eventId })
			.populate([
				{ path: 'userId', select: 'fullName email avatarUrl' },
				{ path: 'departmentId', select: 'name' }
			])
			.sort({ createdAt: -1 })
			.lean();

		// Group members by department
		const membersByDepartment = {};
		members.forEach(member => {
			const deptName = member.departmentId?.name || 'Chưa phân ban';
			if (!membersByDepartment[deptName]) {
				membersByDepartment[deptName] = [];
			}
			membersByDepartment[deptName].push({
				id: member._id,
				userId: member.userId?._id,
				name: member.userId?.fullName || 'Unknown',
				email: member.userId?.email || '',
				avatar: member.userId?.avatarUrl || `https://i.pravatar.cc/100?img=${Math.floor(Math.random() * 70) + 1}`,
				role: member.role,
				department: member.departmentId?.name || 'Chưa phân ban',
				departmentId: member.departmentId?._id,
				joinedAt: member.createdAt
			});
		});

		return res.status(200).json({
			data: membersByDepartment,
			event: {
				id: event._id,
				name: event.name,
				description: event.description
			}
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
		const members = await EventMember.find({ eventId, departmentId: null, role: 'Member' }).populate('userId', 'fullName email').lean();
		return res.status(200).json({ data: members });
	} catch (error) {
		console.error('getUnassignedMembersByEvent error:', error);
		return res.status(500).json({ message: 'Failed to load unassigned members' });
	}
};
export const getMembersByDepartment = async (req, res) => {
  try {
	const {departmentId } = req.params;
	const members = await EventMember.find({ departmentId }).populate('userId', 'fullName email avatarUrl').lean();
	
	// Format data for frontend
	const formattedMembers = members.map(member => ({
		_id: member._id,
		id: member._id,
		userId: member.userId?._id,
		name: member.userId?.fullName || 'Unknown',
		email: member.userId?.email || '',
		avatar: member.userId?.avatarUrl || `https://i.pravatar.cc/100?img=${Math.floor(Math.random() * 70) + 1}`,
		role: member.role,
		departmentId: member.departmentId,
		joinedAt: member.createdAt
	}));
	
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
		const event = await Event.findById(eventId).lean();
		if (!event) {
			return res.status(404).json({ message: 'Event not found' });
		}
		const member = await EventMember.findOne({ _id: memberId, eventId })
			.populate([
				{ path: 'userId', select: 'fullName email avatarUrl' },
				{ path: 'departmentId', select: 'name' }
			])
			.lean();
		if (!member) {
			return res.status(404).json({ message: 'Member not found' });
		}
		return res.status(200).json({ data: member });
	}catch(error){
		console.error('getMemberDetail error:', error);
		return res.status(500).json({ message: 'Failed to load member detail' });
	}
}