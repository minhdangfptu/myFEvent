import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';

export const listPublicEventsQuery = async ({ search, status, skip, limit }) => {
  const filter = { type: 'public' };
  if (search) filter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } }
  ];
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    Event.find(filter)
      .sort({ eventDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name type description eventDate location image status createdAt updatedAt')
      .lean(),
    Event.countDocuments(filter)
  ]);
  return { items, total };
};

export const findPublicEventDetail = async (id) => {
  return await Event.findOne({ _id: id, type: 'public' })
    .select('name type description eventDate location image status organizerName createdAt updatedAt')
    .populate({ path: 'organizerName', select: 'fullName email avatarUrl' })
    .lean();
};

export const findEventById = async (id, select = null) => {
  const q = Event.findById(id);
  if (select) q.select(select);
  return await q.lean();
};

export const createEventDoc = async (payload) => {
  return await Event.create(payload);
};

export const ensureMembership = async (eventId, userId, roles) => {
  if (!userId) return null;
  const membership = await EventMember.findOne({ eventId, userId }).lean();
  if (!membership) return null;
  if (!roles || roles.length === 0) return membership;
  return roles.includes(membership.role) ? membership : null;
};

export const findEventByJoinCode = async (code) => {
  return await Event.findOne({ joinCode: code }).lean();
};

export const ensureUserJoined = async (eventId, userId) => {
  const exists = await EventMember.findOne({ eventId, userId }).lean();
  if (!exists) await EventMember.create({ eventId, userId, role: 'Member' });
};

export const getEventSummaryData = async (id) => {
  const event = await Event.findById(id).lean();
  if (!event) return null;
  const members = await EventMember.find({ eventId: event._id }).populate('userId', 'fullName email').lean();
  return { event, members };
};

export const listEventsByMembership = async (userId) => {
  const memberships = await EventMember.find({ userId })
    .populate('userId', 'fullName')
    .sort({ createdAt: -1 })
    .lean();
  const eventIds = memberships.map(m => m.eventId);
  const events = await Event.find({ _id: { $in: eventIds } })
    .select('name status eventDate joinCode image type description location organizerName')
    .lean();
  return { memberships, events };
};

export const updateEventById = async (id, updateData) => {
  return await Event.findByIdAndUpdate(id, updateData, { new: true });
};

export const deleteEventAndMembers = async (id) => {
  await EventMember.deleteMany({ eventId: id });
  await Event.findByIdAndDelete(id);
};

export const setEventImages = async (id, images) => {
  return await Event.findByIdAndUpdate(id, { $set: { image: images } }, { new: true }).select('image');
};

export const pushEventImages = async (id, images) => {
  return await Event.findByIdAndUpdate(id, { $push: { image: { $each: images } } }, { new: true }).select('image');
};

export const getEventImages = async (id) => {
  return await Event.findById(id).select('image');
};


