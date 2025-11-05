import ensureEventRole from '../utils/ensureEventRole.js';
import {
  ensureEventExists,
  getEventByIdLean,
  getMembersByEventRaw,
  groupMembersByDepartment,
  getUnassignedMembersRaw,
  getMembersByDepartmentRaw
} from '../services/eventMemberService.js';

// Get members by event
export const getMembersByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getEventByIdLean(eventId);
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
		const event = await Event.findById(eventId).lean();
		if (!event) {
			return res.status(404).json({ message: 'Event not found' });
		}
		const member = await EventMember.findOne({ _id: memberId, eventId })
			.populate([
				{ path: 'userId', select: 'fullName email avatarUrl phone status' },
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