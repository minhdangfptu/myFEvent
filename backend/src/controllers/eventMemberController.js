import EventMember from '../models/eventMember.js';
import Event from '../models/event.js';

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