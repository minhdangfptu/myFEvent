import mongoose from 'mongoose';
import ensureEventRole from '../utils/ensureEventRole.js';
import {
  ensureEventExists,
  getMembersByEventRaw,
  groupMembersByDepartment,
  getUnassignedMembersRaw,
  getMembersByDepartmentRaw,
  getEventMemberProfileById,
  getMemberInformationForExport
} from '../services/eventMemberService.js';
import { findEventById } from '../services/eventService.js';

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