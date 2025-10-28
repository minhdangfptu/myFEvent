import EventMember from '../models/eventMember.js';

/**
 * Ensure user has required role in the event
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {string[]} allowedRoles - Array of allowed roles (default: ['HoOC', 'HoD', 'member'])
 * @returns {Promise<Object|null>} - EventMember document if found, null otherwise
 */
const ensureEventRole = async (userId, eventId, allowedRoles = ['HoOC', 'HoD', 'member']) => {
	try {
		const membership = await EventMember.findOne({ 
			userId, 
			eventId, 
			role: { $in: allowedRoles } 
		}).lean();
		
		return membership;
	} catch (error) {
		console.error('ensureEventRole error:', error);
		return null;
	}
};

export default ensureEventRole;
