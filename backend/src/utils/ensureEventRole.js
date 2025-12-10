import EventMember from '../models/eventMember.js';

/**
 * Ensure user has required role in the event
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {string[]} allowedRoles - Array of allowed roles (default: ['HoOC', 'HoD', 'Member'])
 * @returns {Promise<Object|null>} - EventMember document if found, null otherwise
 */
const ensureEventRole = async (userId, eventId, allowedRoles = ['HoOC', 'HoD', 'Member']) => {
	try {
    // Normalize roles to match enum values in EventMember model (HoOC, HoD, Member)
    const normalizedRoles = allowedRoles
      .filter(Boolean)
      .map((role) => role.trim())
      .filter(Boolean);

		const membership = await EventMember.findOne({ 
			userId, 
			eventId, 
			role: { $in: normalizedRoles },
      status: { $ne: 'deactive' }
		}).lean();
		
		return membership;
	} catch (error) {
		console.error('ensureEventRole error:', error);
		return null;
	}
};

export default ensureEventRole;
