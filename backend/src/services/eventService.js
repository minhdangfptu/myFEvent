// services/eventService.js
import crypto from 'crypto';
import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';
import ensureEventRole from '../utils/ensureEventRole.js';
import { invalidateDashboardCache } from '../utils/dashboardCache.js';
import { uploadImageIfNeeded } from './cloudinaryService.js';
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
  if (!event.eventStartDate) missingFields.push('Ngày bắt đầu DDAY');
  if (!event.eventEndDate) missingFields.push('Ngày kết thúc DDAY');
  if (!event.location || !event.location.trim()) missingFields.push('Địa điểm');
  if (!event.image || typeof event.image !== 'string' || !event.image.trim()) missingFields.push('Hình ảnh sự kiện');
  return { isValid: missingFields.length === 0, missingFields };
};

const isDataUri = (value = '') => typeof value === 'string' && value.startsWith('data:');

const ensureCloudinaryImage = async (event) => {
  if (!event) return event;

  if (Array.isArray(event.image)) {
    event.image = event.image.find((img) => typeof img === 'string' && img.trim()) || null;
  }

  if (!event.image || typeof event.image !== 'string') return event;
  if (!isDataUri(event.image)) return event;

  const uploaded = await uploadImageIfNeeded(event.image, 'events');
  if (uploaded && event._id) {
    await Event.updateOne({ _id: event._id }, { $set: { image: uploaded } }).catch((err) =>
      console.error('Failed to persist Cloudinary image', err?.message)
    );
    event.image = uploaded;
  }

  return event;
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
  async listPublicEvents({ page = 1, limit = 8, search = '', status = '' }) {
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
        .select('name type description eventStartDate eventEndDate location status createdAt updatedAt organizerName image')
        .lean(),
      Event.countDocuments(filter)
    ]);

    await Promise.all(items.map((event) => ensureCloudinaryImage(event)));
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

    await ensureCloudinaryImage(event);
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
    await ensureCloudinaryImage(event);
    return { data };
  },

  // POST /api/events
  async createEvent({ userId, body }) {
    const { name, description, eventStartDate, eventEndDate, location, type = 'private', image, coverImage, images, organizerName } = body;

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
    const endDate = new Date(eventEndDate);
    if (endDate < startdate) {
      const err = new Error('Ngày kết thúc DDAY phải ở sau ngày bắt đầu DDAY');
      err.status = 400;
      throw err;
    }

    // So sánh chỉ ngày (không tính giờ/phút) để tránh lỗi timezone
    const nowDate = new Date();
    const nowDateOnly = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
    const startDateOnly = new Date(startdate.getFullYear(), startdate.getMonth(), startdate.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    // Cho phép ngày hôm nay hoặc ngày trong tương lai
    if (startDateOnly < nowDateOnly || endDateOnly < nowDateOnly) {
      const err = new Error('Ngày bắt đầu và ngày kết thúc phải là ngày hôm nay hoặc trong tương lai');
      err.status = 400;
      throw err;
    }

    const joinCode = await genJoinCode();

    const rawImage =
      coverImage ??
      image ??
      (Array.isArray(images) ? images.find((img) => typeof img === 'string' && img.trim()) : images);

    const processedImage = rawImage ? await uploadImageIfNeeded(rawImage, 'events') : null;
    if (!processedImage) {
      const err = new Error('Ảnh sự kiện là bắt buộc');
      err.status = 400;
      throw err;
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
      image: processedImage,
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

    const existingMembership = await EventMember.findOne({ eventId: event._id, userId }).lean();
    if (!existingMembership) {
      await EventMember.create({ eventId: event._id, userId, role: 'Member' });
    } else if (existingMembership.status === 'deactive') {
      await EventMember.updateOne(
        { _id: existingMembership._id },
        { $set: { status: 'active', departmentId: null, role: 'Member' } }
      );
    }
    if (existingMembership && existingMembership.status === 'active') {
      const err = new Error('Bạn đã tham gia sự kiện này');
      err.status = 400;
      throw err;
    }

    invalidateDashboardCache(event._id?.toString?.() || event._id);

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
      (async () => {
        await ensureCloudinaryImage(eventRaw);
        return ensureAutoStatusForDoc(eventRaw);
      })(),
      EventMember.find({ eventId: eventRaw._id, status: { $ne: 'deactive' } })
        .populate('userId', 'fullName email avatarUrl')
        .lean()
    ]);

    return { data: { event, members } };
  },

  // GET /api/events/me/list
  async listMyEvents({ userId, page = 1, limit = 8, search = '' }) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const lim = Math.min(Math.max(parseInt(limit, 10) || 8, 1), 100);
    const skip = (p - 1) * lim;

    // Nếu có search, cần tìm events trước rồi filter memberships
    let eventIdsFilter = null;
    if (search && search.trim()) {
      const matchingEvents = await Event.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      }).select('_id').lean();
      eventIdsFilter = matchingEvents.map(e => e._id);
    }

    // Build membership filter
    const memberFilter = { userId, status: { $ne: 'deactive' } };
    if (eventIdsFilter !== null) {
      memberFilter.eventId = { $in: eventIdsFilter };
    }

    // Đếm tổng số memberships (có filter theo search nếu có)
    const total = await EventMember.countDocuments(memberFilter);

    if (total === 0) {
      return {
        data: [],
        pagination: { page: p, limit: lim, total: 0, totalPages: 0 }
      };
    }

    // Lấy memberships với phân trang
    const memberships = await EventMember.find(memberFilter)
      .select('eventId role _id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .lean();

    const eventIds = memberships.map((m) => m.eventId);

    // Tối ưu: Sử dụng aggregation hoặc query tối ưu hơn
    const events = await Event.find({ _id: { $in: eventIds } })
      .select('name status eventStartDate eventEndDate description location image')
      .lean();

    await Promise.all(events.map((evt) => ensureCloudinaryImage(evt)));

    // Tối ưu: Tính status trực tiếp thay vì gọi ensureAutoStatusForDocs cho từng event
    const now = new Date();

    // Tạo Map để lookup nhanh events theo id
    const eventMap = new Map(events.map(evt => [evt._id.toString(), evt]));

    // GIỮ ĐÚNG THỨ TỰ MEMBERSHIPS (sorted by createdAt desc)
    const eventsWithMembership = memberships.map((membership) => {
      const event = eventMap.get(membership.eventId.toString());
      if (!event) return null;

      // Auto-update status
      if (event.status !== 'cancelled') {
        const start = new Date(event.eventStartDate);
        const end = new Date(event.eventEndDate);
        let computedStatus = event.status;
        if (now > end) computedStatus = 'completed';
        else if (now >= start && now <= end) computedStatus = 'ongoing';
        else computedStatus = 'scheduled';

        if (event.status !== computedStatus) {
          // Update async, không chờ
          Event.updateOne({ _id: event._id, status: { $ne: 'cancelled' } }, { $set: { status: computedStatus } })
            .catch(err => console.error('autoStatus persist error:', err));
          event.status = computedStatus;
        }
      }

      return {
        ...event,
        eventMember: { role: membership.role, userId: userId.toString(), _id: membership._id }
      };
    }).filter(Boolean);

    return {
      data: eventsWithMembership,
      pagination: {
        page: p,
        limit: lim,
        total,
        totalPages: Math.ceil(total / lim)
      }
    };
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

    if (body.coverImage !== undefined || body.image !== undefined) {
      const nextImage = body.coverImage ?? body.image;
      updateData.image = nextImage ? await uploadImageIfNeeded(nextImage, 'events') : null;
    }

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

    await ensureCloudinaryImage(event);
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

  // PATCH /api/events/:id/image
  async updateEventImage({ userId, id, image }) {
    const membership = await ensureEventRole(userId, id, ['HoOC', 'HoD']);
    if (!membership) {
      const err = new Error('Insufficient permissions');
      err.status = 403;
      throw err;
    }

    let nextImage = null;
    if (typeof image === 'string' && image.trim()) {
      nextImage = await uploadImageIfNeeded(image, 'events');
    }

    const event = await Event.findByIdAndUpdate(
      id,
      { $set: { image: nextImage } },
      { new: true }
    ).select('image');

    if (!event) {
      const err = new Error('Event not found');
      err.status = 404;
      throw err;
    }

    await ensureCloudinaryImage(event);
    return {
      message: 'Image updated',
      data: { image: event.image }
    };
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

    await ensureCloudinaryImage(eventRaw);
    const event = await ensureAutoStatusForDoc(eventRaw);
    if (event.type === 'public') {
      return { data: { event } };
    }

    const membership = await EventMember.findOne({ eventId: id, userId, status: { $ne: 'deactive' } }).lean();
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
export const getPaginatedEvents = async (page, limit, search, status, eventDate) => {
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { organizerName: { $regex: search, $options: 'i' } }
    ];
  }

  if (status && status !== "all") {
    if (status === "banned") {
      filter["banInfo.isBanned"] = true;
    } else {
      filter.status = status;
    }
  }

  if (eventDate && eventDate.trim() !== '') {
    const selectedDate = new Date(eventDate);
    const startOfSelectedDay = new Date(selectedDate);
    startOfSelectedDay.setHours(0, 0, 0, 0);
    const endOfSelectedDay = new Date(selectedDate);
    endOfSelectedDay.setHours(23, 59, 59, 999);
    
   
    filter.eventStartDate = { $lte: endOfSelectedDay };
    filter.eventEndDate = { $gte: startOfSelectedDay };
  }

  const skip = (page - 1) * limit;

  // Tối ưu: Query events và members riêng thay vì dùng virtual populate
  const [events, total] = await Promise.all([
    Event.find(filter)
      .select("name organizerName type eventStartDate eventEndDate status banInfo")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    Event.countDocuments(filter)
  ]);

  // Lấy HoOC members cho các events này
  const eventIds = events.map(e => e._id);
  const hoocMembers = await EventMember.find({
    eventId: { $in: eventIds },
    role: 'HoOC',
    status: { $ne: 'deactive' }
  })
    .populate('userId', 'fullName email avatarUrl phone')
    .select('eventId userId')
    .lean();

  // Map members vào events
  const membersByEvent = {};
  hoocMembers.forEach(m => {
    const eventIdStr = m.eventId.toString();
    if (!membersByEvent[eventIdStr]) {
      membersByEvent[eventIdStr] = [];
    }
    membersByEvent[eventIdStr].push(m);
  });

  const data = events.map(event => ({
    ...event,
    members: membersByEvent[event._id.toString()] || []
  }));

  return {
    page,
    total,
    totalPages: Math.ceil(total / limit),
    data
  };
};
export const updateEventByAdmin = async (eventId, data, action) => {
  let updateFields = {};

  if (action === "ban") {
    updateFields = {
      type: "private",
      "banInfo.isBanned": true,
      "banInfo.banReason": data.banReason,
      "banInfo.bannedAt": new Date()
    };
  }

  if (action === "unban") {
    updateFields = {
      type: "public",
      "banInfo.isBanned": false,
      "banInfo.banReason": null,
      "banInfo.bannedAt": null
    };
  }

  return await Event.findByIdAndUpdate(
    eventId,
    { $set: updateFields },
    { new: true }
  );
};

export const getEventById = async (eventId) => {
  const event = (await Event.findById(eventId));
  return event;
}

export const getEventByIdForAdmin = async (eventId) => {
  const event = await Event.findById(eventId).lean();

  if (!event) {
    const err = new Error('Event not found');
    err.status = 404;
    throw err;
  }

  const leaders = await EventMember.find({
    eventId: eventId,
    role: { $in: ['HoD', 'HoOC'] },
    status: { $ne: 'deactive' }
  })
    .populate('userId', 'fullName email avatarUrl phone')
    .populate('departmentId', 'name')
    .select('userId role departmentId')
    .lean();

  const leadersData = leaders.map(leader => ({
    userId: leader.userId?._id || null,
    fullName: leader.userId?.fullName || '',
    email: leader.userId?.email || '',
    avatarUrl: leader.userId?.avatarUrl || '',
    phone: leader.userId?.phone || '',
    role: leader.role,
    departmentId: leader.departmentId?._id || null,
    departmentName: leader.departmentId?.name || null
  }));

  const hooc = leadersData.filter(l => l.role === 'HoOC');
  const hod = leadersData.filter(l => l.role === 'HoD');

  return {
    ...event,
    leaders: {
      hooc: hooc,
      hod: hod
    }
  };
}








