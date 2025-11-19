import EventMember from '../models/eventMember.js';

// GET /api/users/me/events/:eventId/role hoặc /api/me/events/:eventId/role
export const getUserRoleByEvent = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy từ middleware xác thực
    const { eventId } = req.params;
    const membership = await EventMember.findOne({ userId, eventId, status: { $ne: 'deactive' } })
      .populate('userId', 'fullName')
      .populate('eventId', 'name')
      .populate('departmentId', 'name')
      .lean();

    if (!membership) {
      return res.status(404).json({ message: 'Không phải thành viên trong event này!' });
    }
    return res.json({
      user: membership.userId,
      event: membership.eventId,
      role: membership.role,
      departmentId: membership.departmentId?._id || membership.departmentId || null
    });
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
};
