// services/eventService.js
import crypto from 'crypto';
import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';
import ensureEventRole from '../utils/ensureEventRole.js';
import {
  calculateEventStatus,
  ensureAutoStatusForDoc,
  ensureAutoStatusForDocs
} from '../utils/autoUpdateStatus.js';

// Helper: dữ liệu tối thiểu để public
const validateEventDataForPublic = (event) => {
  const missingFields = [];
  if (!event.name || !event.name.trim()) missingFields.push('Tên sự kiện');
  if (!event.description || !event.description.trim()) missingFields.push('Mô tả');
  if (!event.organizerName || !event.organizerName.trim()) missingFields.push('Người tổ chức');
  if (!event.eventStartDate) missingFields.push('Ngày bắt đầu');
  if (!event.eventEndDate) missingFields.push('Ngày kết thúc');
  if (!event.location || !event.location.trim()) missingFields.push('Địa điểm');
  if (!event.image || !Array.isArray(event.image) || event.image.length === 0) missingFields.push('Hình ảnh sự kiện');
  return { isValid: missingFields.length === 0, missingFields };
};

const genJoinCode = async () => {
  for (let i = 0; i < 5; i++) {
    const candidate = crypto.randomBytes(3).toString('hex'); // 6 hex
    const exists = await Event.findOne({ joinCode: candidate }).lean();
    if (!exists) return candidate;
  }
  const err = new Error('Failed to generate join code');
  err.status = 500;
  throw err;
};

export const eventService = {
  // GET /api/events/public
  async listPublicEvents({ page = 1, limit = 12, search = '', status = '' }) {
    const p = Math.max(parseInt(page, 10), 1);
    const lim = Math.min(Math.max(parseInt(limit, 10), 1), 100);
    const skip = (p - 1) * lim;

    const filter = { type: 'public' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Event.find(filter)
        .sort({ eventStartDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .select('name type description eventStartDate eventEndDate location image status createdAt updatedAt organizerName')
        .lean(),
      Event.countDocuments(filter)
    ]);

    const data = await ensureAutoStatusForDocs(items);
    return {
      data,
      pagination: { page: p, limit: lim, total, totalPages: Math.ceil(total / lim) }
    };
  },
  // GET /api/events/:id (public)
  async getPublicEventDetail({ id }) {
    const event = await Event.findOne({ _id: id, type: 'public' })
      .select('name type description eventStartDate eventEndDate location image status organizerName createdAt updatedAt')
      .lean();

    if (!event) {
      const err = new Error('Event not found');
      err.status = 404;
      throw err;
    }

    const data = await ensureAutoStatusForDoc(event);
    return { data };
  },

  // GET /api/events/private/:id
  async getPrivateEventDetail({ id }) {
    const event = await Event.findById(id)
      .select('name type description eventStartDate eventEndDate location image status organizerName joinCode createdAt updatedAt')
      .lean();
    if (!event) {
      const err = new Error('Event not found');
      err.status = 404;
      throw err;
    }
    const data = await ensureAutoStatusForDoc(event);
    return { data };
  },

  // POST /api/events
  async createEvent({ userId, body }) {
    const { name, description, eventStartDate, eventEndDate, location, type = 'private', images, organizerName } = body;

    if (!name) {
      const err = new Error('Name is required');
      err.status = 400;
      throw err;
    }
    if (!organizerName) {
      const err = new Error('Organizer name is required');
      err.status = 400;
      throw err;
    }

    const startdate = new Date(eventStartDate);
    const endDate =  new Date(eventEndDate);
    if (endDate < startdate) {
      const err = new Error('Ngày kết thúc phải ở sau ngày bắt đầu');
      err.status = 400;
      throw err;
    }

    const nowDate = new Date();
    if (startdate < nowDate || endDate < nowDate) {
      const err = new Error('Ngày bắt đầu và ngày kết thúc phải là ngày trong tương lai');
      err.status = 400;
      throw err;
    }

    const joinCode = await genJoinCode();

    // Lọc ảnh hợp lệ
    let processedImages = [];
    if (images && Array.isArray(images)) {
      processedImages = images.filter(
        (img) =>
          typeof img === 'string' &&
          (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:image/'))
      );
    }

    const autoStatus = calculateEventStatus(startdate, endDate);
    const event = await Event.create({
      name,
      description: description || '',
      eventStartDate: startdate,
      eventEndDate: endDate,
      location: location || '',
      type,
      organizerName,
      joinCode,
      image: processedImages,
      status: autoStatus
    });

    // Creator -> HoOC
    await EventMember.create({ eventId: event._id, userId, role: 'HoOC' });

    return { message: 'Event created', data: { id: event._id, joinCode } };
  },

  // POST /api/events/join
  async joinEventByCode({ userId, code }) {
    if (!code) {
      const err = new Error('Code is required');
      err.status = 400;
      throw err;
    }

    const event = await Event.findOne({ joinCode: code }).lean();
    if (!event) {
      const err = new Error('Invalid code');
      err.status = 404;
      throw err;
    }

    // Kiểm tra event đã kết thúc chưa
    const eventWithStatus = await ensureAutoStatusForDoc(event, { persist: false });
    if (eventWithStatus.status === 'completed') {
      const err = new Error('Sự kiện đã kết thúc, không thể tham gia');
      err.status = 400;
      throw err;
    }

    // Kiểm tra event đã bị hủy
    if (event.status === 'cancelled') {
      const err = new Error('Sự kiện đã bị hủy');
      err.status = 400;
      throw err;
    }

    const exists = await EventMember.findOne({ eventId: event._id, userId }).lean();
    if (!exists) {
      await EventMember.create({ eventId: event._id, userId, role: 'Member' });
    }
    return { message: 'Joined event', data: { eventId: event._id } };
  },

  // GET /api/events/:id/summary
  async getEventSummary({ id }) {
    const eventRaw = await Event.findById(id).lean();
    if (!eventRaw) {
      const err = new Error('Event not found');
      err.status = 404;
      throw err;
    }

    const [event, members] = await Promise.all([
      ensureAutoStatusForDoc(eventRaw),
      EventMember.find({ eventId: eventRaw._id })
        .populate('userId', 'fullName email')
        .lean()
    ]);

    return { data: { event, members } };
  },

  // GET /api/events/me/list
  async listMyEvents({ userId }) {
    // Tối ưu: Bỏ populate userId vì không cần thiết, chỉ cần role và eventId
    const memberships = await EventMember.find({ userId })
      .select('eventId role _id')
      .sort({ createdAt: -1 })
      .lean();

    if (memberships.length === 0) {
      return { data: [] };
    }

    const eventIds = memberships.map((m) => m.eventId);
    
    // Tối ưu: Sử dụng aggregation hoặc query tối ưu hơn
    const events = await Event.find({ _id: { $in: eventIds } })
      .select('name status eventStartDate eventEndDate joinCode image type description location organizerName')
      .lean();

    // Tối ưu: Tính status trực tiếp thay vì gọi ensureAutoStatusForDocs cho từng event
    const now = new Date();
    const eventsFixed = events.map(event => {
      if (event.status === 'cancelled') return event;
      const start = new Date(event.eventStartDate);
      const end = new Date(event.eventEndDate);
      let computedStatus = event.status;
      if (now > end) computedStatus = 'completed';
      else if (now >= start && now <= end) computedStatus = 'ongoing';
      else computedStatus = 'scheduled';
      
      if (event.status !== computedStatus && event._id) {
        // Update async, không chờ
        Event.updateOne({ _id: event._id, status: { $ne: 'cancelled' } }, { $set: { status: computedStatus } })
          .catch(err => console.error('autoStatus persist error:', err));
        event.status = computedStatus;
      }
      return event;
    });

    // Tạo map để tìm nhanh hơn thay vì find trong loop
    const membershipMap = new Map();
    memberships.forEach(m => {
      membershipMap.set(m.eventId.toString(), m);
    });

    const eventsWithMembership = eventsFixed.map((event) => {
      const membership = membershipMap.get(event._id.toString());
      return {
        ...event,
        eventMember: membership
          ? { role: membership.role, userId: userId.toString(), _id: membership._id }
          : null
      };
    });

    return { data: eventsWithMembership };
  },

  // PATCH /api/events/:id
  async updateEvent({ userId, id, body }) {
    const membership = await ensureEventRole(userId, id, ['HoOC']);
    if (!membership) {
      const err = new Error('Insufficient permissions');
      err.status = 403;
      throw err;
    }

    const currentEvent = await Event.findById(id);
    if (!currentEvent) {
      const err = new Error('Event not found');
      err.status = 404;
      throw err;
    }

    const { name, description, organizerName, eventStartDate, eventEndDate, location, type } = body;
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (organizerName) updateData.organizerName = organizerName;

    // Dates
    const newStartDate = eventStartDate ? new Date(eventStartDate) : currentEvent.eventStartDate;
    const newEndDate = eventEndDate ? new Date(eventEndDate) : currentEvent.eventEndDate;
    if (eventStartDate) updateData.eventStartDate = newStartDate;
    if (eventEndDate) updateData.eventEndDate = newEndDate;

    if (newEndDate < newStartDate) {
      const err = new Error('End date must be after start date');
      err.status = 400;
      throw err;
    }

    // Status rules
    if (body.status === 'cancelled') {
      updateData.status = 'cancelled';
      updateData.type = 'private'; // optional: tự về private khi hủy
    } else if (currentEvent.status !== 'cancelled') {
      updateData.status = calculateEventStatus(newStartDate, newEndDate);
    }

    if (location !== undefined) updateData.location = location;

    // validate khi chuyển sang public
    const nextType = body.status === 'cancelled' ? 'private' : type ?? currentEvent.type;
    if (nextType === 'public' && currentEvent.type !== 'public') {
      const eventToValidate = { ...currentEvent.toObject(), ...updateData, type: 'public' };
      const validation = validateEventDataForPublic(eventToValidate);
      if (!validation.isValid) {
        const err = new Error('Không thể công khai sự kiện. Vui lòng cập nhật đầy đủ thông tin.');
        err.status = 400;
        err.missingFields = validation.missingFields;
        throw err;
      }
    }

    if (type && body.status !== 'cancelled') {
      updateData.type = type;
    }

    const event = await Event.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!event) {
      const err = new Error('Event not found');
      err.status = 404;
      throw err;
    }

    const data = await ensureAutoStatusForDoc(event);
    return { message: 'Event updated', data };
  },

  // DELETE /api/events/:id
  async deleteEvent({ userId, id }) {
    const membership = await ensureEventRole(userId, id, ['HoOC']);
    if (!membership) {
      const err = new Error('Insufficient permissions');
      err.status = 403;
      throw err;
    }
    await EventMember.deleteMany({ eventId: id });
    await Event.findByIdAndDelete(id);
    return { message: 'Event deleted' };
  },

  // PUT /api/events/:id/images (replace)
  async replaceEventImages({ userId, id, images }) {
    if (!Array.isArray(images)) {
      const err = new Error('images must be an array of base64 strings');
      err.status = 400;
      throw err;
    }
    const membership = await ensureEventRole(userId, id, ['HoOC', 'HoD']);
    if (!membership) {
      const err = new Error('Insufficient permissions');
      err.status = 403;
      throw err;
    }
    const sanitized = images.filter((s) => typeof s === 'string' && s.length > 0);
    const event = await Event.findByIdAndUpdate(
      id,
      { $set: { image: sanitized } },
      { new: true }
    ).select('image');
    if (!event) {
      const err = new Error('Event not found');
      err.status = 404;
      throw err;
    }
    return { message: 'Images updated', data: { image: event.image } };
  },

  // POST /api/events/:id/images (add)
  async addEventImages({ userId, id, images }) {
    if (!Array.isArray(images) || images.length === 0) {
      const err = new Error('images is required');
      err.status = 400;
      throw err;
    }
    const membership = await ensureEventRole(userId, id, ['HoOC', 'HoD']);
    if (!membership) {
      const err = new Error('Insufficient permissions');
      err.status = 403;
      throw err;
    }
    const sanitized = images.filter((s) => typeof s === 'string' && s.length > 0);
    const event = await Event.findByIdAndUpdate(
      id,
      { $push: { image: { $each: sanitized } } },
      { new: true }
    ).select('image');
    if (!event) {
      const err = new Error('Event not found');
      err.status = 404;
      throw err;
    }
    return { message: 'Images added', data: { image: event.image } };
  },

  // DELETE /api/events/:id/images
  async removeEventImages({ userId, id, indexes }) {
    if (!Array.isArray(indexes)) {
      const err = new Error('indexes must be an array of numbers');
      err.status = 400;
      throw err;
    }
    const membership = await ensureEventRole(userId, id, ['HoOC', 'HoD']);
    if (!membership) {
      const err = new Error('Insufficient permissions');
      err.status = 403;
      throw err;
    }
    const event = await Event.findById(id).select('image');
    if (!event) {
      const err = new Error('Event not found');
      err.status = 404;
      throw err;
    }
    const keep = event.image.filter((_, idx) => !indexes.includes(idx));
    event.image = keep;
    await event.save();
    return { message: 'Images removed', data: { image: event.image } };
  },

  // GET /api/events/detail/:id
  async getAllEventDetail({ userId, id }) {
    const eventRaw = await Event.findById(id)
      .select('name type description eventStartDate eventEndDate location image status organizerName joinCode createdAt updatedAt')
      .lean();

    if (!eventRaw) {
      const err = new Error('Event not found');
      err.status = 404;
      throw err;
    }

    const event = await ensureAutoStatusForDoc(eventRaw);
    if (event.type === 'public') {
      return { data: { event } };
    }

    const membership = await EventMember.findOne({ eventId: id, userId }).lean();
    if (!membership) {
      const err = new Error('Access denied. You are not a member of this event.');
      err.status = 403;
      throw err;
    }
    return { data: { event } };
  }

};
export const findEventById = async (id, select = null) => {
  const q = Event.findById(id);
  if (select) q.select(select);
  return await q.lean();
};
