import User from '../models/user.js';
import EventMember from '../models/eventMember.js';

export const getPaginatedUsers = async (page, limit, search, status) => {
  const filter = {role: 'user'};
  if (search) {
    const regex = { $regex: search, $options: 'i' };
    filter.$or = [
      { username: regex },
      { email: regex },
      { fullName: regex }
    ];
  }
  if (status && status !== "all") {
    filter.status = status;     
  }
  const skip = (page - 1) * limit;
  const data = await User.find(filter)
    .select('fullName email role status avatarUrl')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  const total = await User.countDocuments(filter);
  return {
    data,
    total,
    page,
    limit
  };
};

export const getUserById = async (userId) => {
  const user = await User.findById(userId).select('fullName email role status avatarUrl');
  return user;
};

export const updateUser = async (userId, updateData) => {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('fullName email role status avatarUrl');
    return updatedUser;
};

export const getUserProfileWithEvents = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new Error('User not found');
  }

  const memberships = await EventMember.find({ userId, status: { $ne: 'deactive' } })
    .populate({
      path: 'eventId',
      select: 'name eventStartDate eventEndDate organizerName status banInfo createdAt '
    })
    .populate('departmentId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const pastEvents = [];
  const currentEvents = [];

  memberships.forEach(membership => {
    if (!membership.eventId) return; 

    const eventData = {
      eventId: membership.eventId._id,
      name: membership.eventId.name,
      eventStartDate: membership.eventId.eventStartDate,
      eventEndDate: membership.eventId.eventEndDate,
      organizerName: membership.eventId.organizerName,
      banInfo: membership.eventId.banInfo,
      role: membership.role,
      departmentName: membership.departmentId?.name || null,
      joinedAt: membership.createdAt
    };
    if (membership.eventId.status === 'completed' || membership.eventId.status === 'cancelled') {
      pastEvents.push(eventData);
    } else if (membership.eventId.status === 'ongoing' || membership.eventId.status === 'scheduled') {
      currentEvents.push(eventData);
    }
  });

  return {
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl || '',
      phone: user.phone || '',
      status: user.status,
      role: user.role,
    },
    events: {
      past: pastEvents,
      current: currentEvents,
      total: memberships.length
    }
  };
};

